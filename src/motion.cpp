#include "motion.h"
#include <Wire.h>
#include <Preferences.h>
#include <math.h>
#include <SensorBHI260AP.hpp>
#include <bosch/BoschSensorID.hpp>
// The plain BHI260AP image, with nothing on the sensor's own bus (~114 kB).
#define BOSCH_APP30_SHUTTLE_BHI260_FW
#include <BoschFirmware.h>
#include "board_pins.h"
#include "logstore.h"
#include "power.h"

extern LogStore logs;

namespace motion {
namespace {

SensorBHI260AP imu;
bool loaded = false, failed = false, streaming = false;
uint8_t sensorId = 0;                   // the accelerometer this image offers
uint8_t kicks = 0;                      // restarts after it went quiet
uint32_t kickedAt = 0;

bool raiseOn = true, quietOn = false;
uint8_t manMin = 0;
bool saverOn = false;                   // battery saver: only the man-down alarm keeps the sensor

struct Vec { float x, y, z; };
float dot(const Vec& a, const Vec& b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
Vec unit(const Vec& a) {
  const float l = sqrtf(dot(a, a));
  return l > 0.2f ? Vec{a.x / l, a.y / l, a.z / l} : Vec{0, 0, 1};
}
float degBetween(const Vec& a, const Vec& b) { return acosf(constrain(dot(a, b), -1.0f, 1.0f)) * 57.29578f; }

// Which way the screen faces along z once LilyGo's axis map is applied: +1 means
// the pager lying face up reads +1 g on z.
constexpr float SCREEN_Z = 1.0f;

// 25 samples a second. `lp` trails the accelerometer by ~0.1 s: the way gravity
// pulls, which is how the pager is being held. A sample's distance from it is how
// hard the pager is being moved, in g.
constexpr float RATE_HZ = 25;
Vec lp = {0, 0, 1};
bool primed = false;
uint32_t lastSample = 0;
float shake = 0, tilt = 0;              // the latest, for debugPrint

// The last 3 s of how it was held: "quite differently a moment ago". A slow lift
// plus a hand settling takes longer than 1.6 s, which missed on a pager.
constexpr int RING = 75;
Vec ring[RING];
int ringN = 0, ringAt = 0;
int steadyN = 0;                        // samples in a row that barely moved

bool raised = false;
uint32_t faceSince = 0;
bool face = false;
uint32_t movedAt = 0;                   // the last movement or input
Vec anchor = {0, 0, 1};                 // how it was held when it last moved
Vec base = {0, 0, 1};                   // how it has been held lately (~2 s), for lean()
float leanX = 0, leanY = 0;

void sample(const Vec& a) {
  const uint32_t now = millis();
  if (now - lastSample > 3000) movedAt = now;    // after a gap, count stillness afresh
  lastSample = now;
  kicks = 0;
  if (!primed) { primed = true; lp = a; anchor = base = unit(a); movedAt = now; ringN = ringAt = 0; }
  lp = {lp.x + 0.3f * (a.x - lp.x), lp.y + 0.3f * (a.y - lp.y), lp.z + 0.3f * (a.z - lp.z)};
  const Vec d = {a.x - lp.x, a.y - lp.y, a.z - lp.z};
  shake = sqrtf(dot(d, d));
  const Vec att = unit(lp);

  // Lean: the tip away from the last couple of seconds' average, so a scene moves
  // while the pager moves and settles back when it is held still, at any angle.
  base = {base.x + 0.02f * (att.x - base.x), base.y + 0.02f * (att.y - base.y), base.z + 0.02f * (att.z - base.z)};
  leanX = constrain((att.x - base.x) * 3.0f, -1.0f, 1.0f);
  leanY = constrain((att.y - base.y) * 3.0f, -1.0f, 1.0f);
  tilt = acosf(constrain(att.z * SCREEN_Z, -1.0f, 1.0f)) * 57.29578f;   // 0 face up, 90 on edge, 180 face down
  // Held still in a hand: a hand shakes 0.02-0.07 g here, a table under 0.005.
  steadyN = shake < 0.08f ? steadyN + 1 : 0;

  // Man-down: a real jolt, or turned 12 degrees since it last moved. Breathing and
  // a table's hum stay under both.
  if (shake > 0.10f || degBetween(att, anchor) > 12) { movedAt = now; anchor = att; }

  // Face down: flat, screen to the table, still for 2 s. A pocket holds the pager
  // on its edge, so it never counts there.
  if (tilt > 150 && shake < 0.05f) { if (!faceSince) faceSince = now | 1; }
  else if (tilt < 135 || shake > 0.15f) faceSince = 0;
  const bool wasFace = face;
  face = faceSince && now - faceSince > 2000;
  if (face != wasFace) Serial.println(face ? "[motion] face down" : "[motion] face up");

  // Raise to wake: held steady in view (the screen tipped 15-80 degrees back from
  // flat, the right way up and not on its side) for 0.16 s, after being held quite
  // differently (35+ degrees) within the last 3 s: out of a pocket, up off a table,
  // turned over. Walking holds it the same way throughout, putting it down ends
  // flat, and a pocket mostly holds it upside down or on its side.
  // Held to read, the top edge is up: y reads negative (measured on a pager).
  ring[ringAt] = att;
  ringAt = (ringAt + 1) % RING;
  if (ringN < RING) ringN++;
  const bool upright = att.y < 0 && fabsf(att.x) < 0.6f;
  if (steadyN >= 4 && tilt >= 15 && tilt <= 80 && upright) {
    for (int i = 0; i < ringN; i++) {
      if (degBetween(ring[i], att) >= 35) {
        raised = true;
        ringN = ringAt = 0;
        Serial.printf("[motion] lifted into view (tilt %.0f)\n", tilt);
        break;
      }
    }
  }
}

void onAccel(uint8_t, const uint8_t* data, uint32_t, uint64_t*, void*) {
  bhy2_data_xyz v;
  bhy2_parse_xyz(data, &v);
  const float s = 1.0f / 4096.0f;       // 4096 counts per g at the default +-8 g
  sample({v.x * s, v.y * s, v.z * s});
}

bool load() {
  const uint32_t t0 = millis();
  uint8_t addr = 0;
  for (uint8_t a : {(uint8_t)ADDR_BHI260AP_IMU, (uint8_t)(ADDR_BHI260AP_IMU + 1)}) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) { addr = a; break; }
  }
  if (!addr) { failed = true; logs.add(LOG_WARN, "motion sensor not found"); return false; }
  // The upload is ~114 kB. LilyGo runs the bus at 1 MHz for it, then puts it back.
  const uint32_t clk = Wire.getClock();
  Wire.setClock(1000000UL);
  imu.setPins(-1);
  imu.setFirmware(bosch_firmware_image, bosch_firmware_size, bosch_firmware_type);
  imu.setBootFromFlash(false);
  const bool ok = imu.begin(Wire, addr);
  Wire.setClock(clk);
  if (!ok) {
    failed = true;
    logs.add(LOG_ERROR, "motion sensor: firmware didn't load (%s)", imu.getError());
    return false;
  }
  imu.setRemapAxes(SensorRemap::BOTTOM_LAYER_TOP_LEFT_CORNER);   // how LilyGo mounts it
  loaded = true;
  logs.add(LOG_INFO, "motion sensor up in %lums", (unsigned long)(millis() - t0));
  return true;
}

void stream(bool on) {
  if (on == streaming || !loaded) return;
  if (on) {
    // The corrected accelerometer, or the raw one if this image lacks it.
    for (uint8_t id : {(uint8_t)BoschSensorID::ACCEL_CORRECTED, (uint8_t)BoschSensorID::ACCEL_PASSTHROUGH}) {
      imu.onResultEvent(id, onAccel);
      if (imu.configure(id, RATE_HZ, 0)) { sensorId = id; streaming = true; break; }
      imu.removeResultEvent(id, onAccel);
    }
    if (!streaming) {
      failed = true;
      logs.add(LOG_ERROR, "motion sensor: no accelerometer (%s)", imu.getError());
      return;
    }
    lastSample = millis();
  } else {
    imu.configure(sensorId, 0, 0);
    imu.removeResultEvent(sensorId, onAccel);
    streaming = false;
  }
  primed = raised = face = false;
  faceSince = 0;
}

void apply() {
  // Battery saver stops the sensor, unless the man-down alarm is on: it can't watch
  // without it, and it is the one use here that is about safety.
  const bool want = saverOn ? manMin != 0 : (raiseOn || quietOn || manMin);
  if (want && !loaded && !failed) load();
  stream(want);
}

void save() {
  Preferences p;
  if (!p.begin("inw-motion", false)) return;
  p.putBool("raise", raiseOn);
  p.putBool("quiet", quietOn);
  p.putUChar("mandown", manMin);
  p.end();
}

}  // namespace

void begin() {
  Preferences p;
  if (p.begin("inw-motion", true)) {
    raiseOn = p.getBool("raise", true);
    quietOn = p.getBool("quiet", false);
    manMin = p.getUChar("mandown", 0);
    p.end();
  }
  apply();
}

void tick() {
  if (power::saver() != saverOn) {
    saverOn = power::saver();
    apply();
    logs.add(LOG_INFO, "motion: battery saver %s, sensor %s", saverOn ? "on" : "off", streaming ? "running" : "stopped");
  }
  if (!streaming) return;
  static uint32_t polled = 0;
  if (millis() - polled < 40) return;
  polled = millis();
  imu.update();
  // Nothing for 5 s: set the accelerometer going again, a few times, and say so.
  // The time is read after update(), whose samples move lastSample past any
  // earlier reading (and an unsigned difference would wrap).
  const uint32_t now = millis();
  if (now - lastSample > 5000 && now - kickedAt > 5000 && kicks < 3) {
    kickedAt = now;
    kicks++;
    logs.add(LOG_WARN, "motion sensor went quiet, restarting it (%u)", kicks);
    imu.configure(sensorId, RATE_HZ, 0);
  }
}

bool running() { return streaming && millis() - lastSample < 3000; }

const char* state() {
  if (failed) return "not responding";
  if (running()) return saverOn ? "on for man-down (saver)" : "on";
  if (saverOn && (raiseOn || quietOn)) return "paused: battery saver";
  return streaming ? "starting" : "off";
}

bool paused() { return saverOn; }

bool raiseToWake() { return raiseOn; }
bool quietFaceDown() { return quietOn; }
uint8_t manDownMin() { return manMin; }

// Turning one on after a failure tries the sensor again.
void setRaiseToWake(bool on) { raiseOn = on; if (on) failed = false; save(); apply(); }
void setQuietFaceDown(bool on) { quietOn = on; if (on) failed = false; save(); apply(); }
void setManDownMin(uint8_t m) { manMin = m; movedAt = millis(); if (m) failed = false; save(); apply(); }

// In battery saver these three rest even when the man-down alarm keeps the sensor going.
bool takeRaise() {
  const bool r = raised;
  raised = false;
  return r && raiseOn && !saverOn && running();
}

bool faceDown() { return quietOn && !saverOn && running() && face; }

void noteActivity() {
  movedAt = millis();
  if (primed) anchor = unit(lp);
}

uint32_t stillFor() { return running() && primed ? millis() - movedAt : 0; }

bool lean(float& x, float& y) {
  if (saverOn || !running() || !primed) { x = y = 0; return false; }
  x = leanX;
  y = leanY;
  return true;
}

void debugPrint() {
  Serial.printf("[motion] %s  g %.3f %.3f %.3f  tilt %.0f  shake %.3f  still %lus  face %d  raise %d quiet %d mandown %u\n",
                state(), lp.x, lp.y, lp.z, tilt, shake, (unsigned long)(stillFor() / 1000), face, raiseOn, quietOn, manMin);
}

}  // namespace motion
