#include "regional.h"
#include <time.h>
#include "settings.h"

namespace regional {

// MeshCore's regional presets, from api.meshcore.nz/api/v1/config (2026-09-25).
// Keep them as MeshCore lists them: people pick the name their mesh uses.
const Region REGIONS[] = {
  {"Australia",                  915.800f, 250.0f, 10, 5, -1, -25.3f, 133.8f, 4},
  {"Australia (Narrow)",         916.575f,  62.5f,  7, 7, -1, -25.3f, 133.8f, 4},
  {"Australia (Mid)",            915.075f, 125.0f,  9, 5, -1, -25.3f, 133.8f, 4},
  {"Australia: SA, WA",          923.125f,  62.5f,  8, 8, -1, -30.0f, 125.0f, 4},
  {"Australia: QLD",             923.125f,  62.5f,  8, 5, -1, -20.9f, 142.7f, 5},
  {"Brazil",                     923.125f,  62.5f,  8, 8, -1, -14.2f, -51.9f, 4},
  {"Canada",                     910.525f,  62.5f,  7, 5,  2,  56.1f, -106.3f, 3},
  {"Costa Rica",                 910.525f, 125.0f, 11, 5, -1,   9.75f, -83.75f, 7},
  {"EU/UK (Narrow)",             869.618f,  62.5f,  8, 8, -1,  50.1f,   9.0f, 4},
  {"EU/UK (Deprecated)",         869.525f, 250.0f, 11, 5, -1,  50.1f,   9.0f, 4},
  {"Czech Republic (Narrow)",    869.432f,  62.5f,  7, 5,  1,  49.8f,  15.5f, 7},
  {"EU 433MHz (Long Range)",     433.650f, 250.0f, 11, 5, -1,  50.1f,   9.0f, 4},
  {"EU 433MHz (Narrow)",         433.650f,  62.5f,  8, 8, -1,  50.1f,   9.0f, 4},
  {"Hungary",                    869.618f,  62.5f,  7, 5,  1,  47.2f,  19.5f, 7},
  {"Netherlands",                869.618f,  62.5f,  7, 5, -1,  52.1f,   5.3f, 7},
  {"Netherlands (Limburg)",      869.618f,  62.5f,  8, 8,  1,  51.2f,   5.9f, 9},
  {"New Zealand (Narrow)",       917.375f,  62.5f,  7, 5,  1, -41.3f, 174.8f, 5},
  {"New Zealand (Gisborne)",     917.375f, 250.0f, 11, 5,  0, -38.66f, 178.02f, 9},
  {"Portugal 433",               433.375f,  62.5f,  9, 6, -1,  39.4f,  -8.2f, 6},
  {"Portugal 868",               869.618f,  62.5f,  7, 6, -1,  39.4f,  -8.2f, 6},
  {"Slovakia",                   869.618f,  62.5f,  7, 5,  1,  48.7f,  19.7f, 7},
  {"Switzerland",                869.618f,  62.5f,  8, 8, -1,  46.8f,   8.2f, 7},
  {"USA",                        910.525f,  62.5f,  7, 5, -1,  39.8f, -98.6f, 4},
  {"USA - Southern California",  927.875f,  62.5f,  7, 5,  2,  34.05f, -118.24f, 7},
  {"Vietnam (Narrow)",           920.250f,  62.5f,  8, 5, -1,  14.06f, 108.28f, 5},
  {"Vietnam (Deprecated)",       920.250f, 250.0f, 11, 5, -1,  14.06f, 108.28f, 5},
};
const uint8_t REGION_COUNT = sizeof(REGIONS) / sizeof(REGIONS[0]);

// ---- daylight saving -----------------------------------------------------------------------
// Each rule: the switch into daylight time and back out, as "the nth (5 = last) Sunday of
// a month, at a time of day", and which clock that time is read on.
enum : uint8_t { NONE = 0, US, EU, AU, NZ };
enum : uint8_t { ON_STD, ON_DST, ON_UTC };
struct Switch { uint8_t month, week; int16_t minute; uint8_t clock; };
struct Rule { Switch on, off; };
static const Rule RULES[] = {
  {},
  {{3, 2, 120, ON_STD}, {11, 1, 120, ON_DST}},    // US & Canada: 2nd Sun Mar - 1st Sun Nov, 2am
  {{3, 5, 60, ON_UTC}, {10, 5, 60, ON_UTC}},      // Europe: last Sun Mar - last Sun Oct, 1am UTC
  {{10, 1, 120, ON_STD}, {4, 1, 180, ON_DST}},    // SE Australia: 1st Sun Oct - 1st Sun Apr
  {{9, 5, 120, ON_STD}, {4, 1, 180, ON_DST}},     // New Zealand: last Sun Sep - 1st Sun Apr
};

// West to east.
const Zone ZONES[] = {
  {"Hawaii",                                -600, -600, NONE},
  {"Alaska",                                -540, -480, US},
  {"Pacific (Seattle, LA, Vancouver)",      -480, -420, US},
  {"Arizona",                               -420, -420, NONE},
  {"Mountain (Denver, Calgary)",            -420, -360, US},
  {"Central (Chicago, Winnipeg)",           -360, -300, US},
  {"Mexico City, Central America",          -360, -360, NONE},
  {"Eastern (New York, Toronto)",           -300, -240, US},
  {"Atlantic (Halifax)",                    -240, -180, US},
  {"Newfoundland",                          -210, -150, US},
  {"Brazil (Sao Paulo), Argentina",         -180, -180, NONE},
  {"UTC",                                      0,    0, NONE},
  {"UK, Ireland, Portugal",                    0,   60, EU},
  {"Central Europe (Berlin, Paris, Rome)",    60,  120, EU},
  {"Eastern Europe (Athens, Kyiv)",          120,  180, EU},
  {"South Africa",                           120,  120, NONE},
  {"Moscow, Turkey",                         180,  180, NONE},
  {"Gulf (Dubai)",                           240,  240, NONE},
  {"India",                                  330,  330, NONE},
  {"Vietnam, Thailand",                      420,  420, NONE},
  {"China, Singapore, Perth",                480,  480, NONE},
  {"Japan, Korea",                           540,  540, NONE},
  {"Darwin",                                 570,  570, NONE},
  {"Adelaide",                               570,  630, AU},
  {"Brisbane",                               600,  600, NONE},
  {"Sydney, Melbourne, Hobart",              600,  660, AU},
  {"New Zealand",                            720,  780, NZ},
};
const uint8_t ZONE_COUNT = sizeof(ZONES) / sizeof(ZONES[0]);

// Days since 1970-01-01 of a calendar date (Howard Hinnant's days_from_civil).
static int32_t days(int y, int m, int d) {
  y -= m <= 2;
  const int era = (y >= 0 ? y : y - 399) / 400;
  const int yoe = y - era * 400;
  const int doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
  const int doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  return era * 146097 + doe - 719468;
}

// The day (since 1970) of the nth Sunday of a month, 5 meaning the last.
static int32_t sunday(int y, int m, int week) {
  if (week >= 5) {
    const int32_t last = m == 12 ? days(y + 1, 1, 1) - 1 : days(y, m + 1, 1) - 1;
    return last - (last + 4) % 7;                 // 1970-01-01 was a Thursday (4)
  }
  const int32_t first = days(y, m, 1);
  return first + (7 - (first + 4) % 7) % 7 + (week - 1) * 7;
}

static int64_t when(int y, const Switch& s, const Zone& z) {
  const int off = s.clock == ON_STD ? z.stdMin : s.clock == ON_DST ? z.dstMin : 0;
  return (int64_t)sunday(y, s.month, s.week) * 86400 + (s.minute - off) * 60;
}

int offsetMin(uint32_t utc) {
  const uint8_t i = ui_settings.tzZone;
  if (!i || i > ZONE_COUNT) return ui_settings.tzMinutes;
  const Zone& z = ZONES[i - 1];
  if (z.rule == NONE || z.stdMin == z.dstMin) return z.stdMin;
  const time_t t = utc;
  struct tm tm;
  gmtime_r(&t, &tm);
  const int y = tm.tm_year + 1900;
  const Rule& r = RULES[z.rule];
  const int64_t on = when(y, r.on, z), off = when(y, r.off, z);
  // North: daylight time sits inside the year; south: it spans New Year.
  const bool dst = on < off ? (utc >= on && utc < off) : (utc >= on || utc < off);
  return dst ? z.dstMin : z.stdMin;
}

String fixedOffsetName() {
  const int t = ui_settings.tzMinutes;
  char b[16];
  snprintf(b, sizeof(b), "UTC%c%d:%02d", t < 0 ? '-' : '+', abs(t) / 60, abs(t) % 60);
  return String(b);
}

String zoneName() {
  const uint8_t i = ui_settings.tzZone;
  return i && i <= ZONE_COUNT ? String(ZONES[i - 1].name) : fixedOffsetName();
}

}  // namespace regional
