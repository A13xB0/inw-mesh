// Where the pager is: its radio region (MeshCore's regional presets) and time zone.
// Chosen in the first-start setup and under Settings.

#pragma once
#include <Arduino.h>

namespace regional {

// A MeshCore regional radio preset, as MeshCore's own apps list them
// (api.meshcore.nz, suggested_radio_settings), plus somewhere sensible to open the
// map until the GPS has a fix.
struct Region {
  const char* name;
  float freq, bw;
  uint8_t sf, cr;
  int8_t hashMode;      // path hash size - 1 where the region sets one, else -1 (leave it)
  float lat, lon;
  uint8_t zoom;
};
extern const Region REGIONS[];
extern const uint8_t REGION_COUNT;

// A time zone: standard and daylight offsets from UTC in minutes, and the daylight
// saving rule (none when they're equal).
struct Zone {
  const char* name;
  int16_t stdMin, dstMin;
  uint8_t rule;
};
extern const Zone ZONES[];
extern const uint8_t ZONE_COUNT;

// Minutes to add to UTC for local time at that moment (daylight saving included).
// Setting tzZone 0 means the fixed offset in tzMinutes.
int offsetMin(uint32_t utc);
// The chosen zone's name, or the fixed offset ("UTC-7:00").
String zoneName();
String fixedOffsetName();

}  // namespace regional
