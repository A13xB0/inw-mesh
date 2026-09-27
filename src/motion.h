// The pager's motion sensor, a Bosch BHI260AP: an accelerometer and gyroscope with
// no magnetometer, so no compass. It runs nothing until its firmware has been loaded
// over I2C (about a second), so it is only started while something uses it:
//   raise to wake        lifting the pager into view lights the screen (the lock face)
//   quiet when face down lying screen-down and still, messages make no sound
//   man-down alarm       no movement for a set time: chirps, then the SOS countdown
// The settings live in their own NVS namespace, as the SOS channel does, so the
// settings blob keeps the layout the T-Deck build shares.

#pragma once
#include <Arduino.h>

namespace motion {
  void begin();                // setup(): loads the sensor's firmware if anything is on
  void tick();                 // loop()
  bool running();              // samples are coming in
  const char* state();         // "on", "off" or "not responding", for the menus and the log

  bool raiseToWake();          void setRaiseToWake(bool on);
  bool quietFaceDown();        void setQuietFaceDown(bool on);
  uint8_t manDownMin();        void setManDownMin(uint8_t minutes);   // 0 = off

  bool takeRaise();            // lifted into view since the last call (raise to wake on)
  bool faceDown();             // quiet when face down is on and it lies screen-down, still
  void noteActivity();         // a key, the wheel or the side button: someone is there
  uint32_t stillFor();         // ms without movement or input; 0 while it isn't running

  void debugPrint();           // USB "motion" (dev builds): what it sees right now
}
