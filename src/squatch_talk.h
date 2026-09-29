// The lock screen's sasquatch talks: a speech bubble over him that reacts to what
// the pager is doing - shaken (he hops), picked up, a message in, plugged in, low,
// held tilted. home.cpp's LockView decides when; this holds what he says and draws
// the bubble. Settings > Display > "sasquatch talks" turns it off.
#pragma once
#include <Arduino.h>
#include "display_config.h"
#include "theme.h"
#include "ui.h"          // L::W

namespace talk {

enum Kind : uint8_t { SHAKE, SHAKE_HARD, SHAKE_AGAIN, MORNING, DAY, EVENING, LATE,
                      MESSAGE, PLUG, LOW_BATT, LEAN, KIND_COUNT };

// ---- what he says ------------------------------------------------------------------------
// Each line fits the bubble: 28 characters at most (checked when they're written).
// No repeats: every kind is a shuffled deck, dealt to the end before it's reshuffled,
// and a new deck never opens with the line he just said.
constexpr uint8_t MAX_LINES = 32;

static const char* const SHAKE_L[] = {
  "Whoa! Easy!", "Earthquake?!", "I'm up, I'm up!", "Not the snow globe!",
  "My fur's all messed up.", "Did we hit a pothole?", "Was that a moose?", "Easy on the antenna!",
  "You'll scramble my packets.", "Hey, I was mid-step!", "Bumpy trail today.", "Is this a dance?",
  "I felt that in my toes.", "Rough road, huh?", "Careful, I bruise easy.", "Who's rocking the boat?",
  "That tickles!", "Okay, I'm awake now.", "Shaken, not stirred.", "Did a truck go by?",
  "Whoa there, partner.", "I almost dropped my snack.", "Pinecones everywhere now.", "Warn a guy first!",
  "Wheee... no, actually no.", "My hair! My beautiful hair!", "Is the mesh okay?", "Steady hands, friend.",
  "That rattled my brain.", "Big foot, small patience."};
static const char* const HARD_L[] = {
  "HEY! Put me down!", "Whoa whoa WHOA!", "I'm getting seasick...", "MAYDAY! MAYDAY!",
  "Too much! Too much!", "My everything hurts.", "Is this a blender?!", "I think I lost a tooth.",
  "I'll lose the signal!", "The pines are spinning!", "AAAAAH!", "Who ordered a tornado?",
  "My lunch is moving.", "Level 10 shake detected.", "I'm calling the ranger!"};
static const char* const AGAIN_L[] = {
  "Okay, OKAY! I'm awake!", "I get it, you're bored.", "One more and I walk home.", "Fine! I'm up! Happy?",
  "You done yet?", "I'm filing a complaint.", "That's enough, thanks.", "Now I'm dizzy.",
  "Seriously? Again?", "Bored? Send a message!", "You win. I'm awake.", "I need a nap after that."};
static const char* const MORN_L[] = {
  "Morning!", "Coffee first?", "Rise and shine.", "Early bird, huh?",
  "Good morning, sunshine.", "Fresh air out today.", "Breakfast? I found berries.", "Up with the birds.",
  "Dew's still on the ferns.", "New day, new messages.", "Morning! Mesh is awake.", "Sun's up. Let's hike.",
  "Mornin'. Sleep okay?", "Rise and grind.", "Morning mist is nice."};
static const char* const DAY_L[] = {
  "Hey there!", "Nice day for a hike.", "Heard anything good?", "Mesh is humming today.",
  "Lunch break?", "Afternoon!", "Good day for a walk.", "Anything new out there?",
  "Just wandering around.", "Found a good trail today.", "How's your day going?", "Nice to see you.",
  "Keep an eye on the sky.", "Hi! Miss me?", "Out here, as always."};
static const char* const EVE_L[] = {
  "Evening!", "Good night for a walk.", "Stars are coming out.", "Sun's going down.",
  "Campfire weather.", "How was your day?", "Evening chill's setting in.", "Owls are waking up.",
  "Golden hour out here.", "Dinner? Berries again.", "Crickets are starting up.", "Nice sunset tonight.",
  "Winding down?", "Moon's on its way.", "Quiet evening on the mesh."};
static const char* const LATE_L[] = {
  "Up late?", "Shh... it's late.", "Can't sleep either?", "Night shift, huh?",
  "The owls say hi.", "Midnight snack?", "Stars are out. Look up.", "Go to bed, friend.",
  "Night walks are my thing.", "Quiet night on the mesh.", "The forest never sleeps.", "Moonlight suits you.",
  "Late-night radio hour.", "I'm nocturnal. You?", "Everyone's asleep but us."};
static const char* const MSG_L[] = {
  "You've got mail!", "Someone's talking!", "Ooh, a message!", "Somebody wrote to you!",
  "New message, check it!", "Incoming!", "Message just landed.", "Someone's thinking of you.",
  "A message came in!", "Read it! Read it!", "The mesh has news.", "Ding! A message."};
static const char* const PLUG_L[] = {
  "Ooh, snacks!", "Mmm, electrons.", "Charging up!", "Ahh, that's the stuff.",
  "Nom nom nom.", "Refueling.", "Power nap time.", "Tastes like lightning.",
  "Filling the tank.", "Thanks, I was hungry.", "Juicing up!", "Battery buffet!"};
static const char* const LOW_L[] = {
  "I'm getting sleepy...", "Running on fumes here.", "Feed me? (charge me)", "Battery's getting low.",
  "So... tired...", "Need a charge soon.", "Low power. Me too.", "Snack break soon?",
  "Legs feel heavy.", "Charger, please?", "I'm fading, friend.", "Almost out of juice."};
static const char* const LEAN_L[] = {
  "Whoa, I'm sliding!", "Level it out!", "Uphill both ways...", "This hill is steep!",
  "Hold it straight!", "I'm going downhill!", "Tilt it back!", "Everything's crooked.",
  "Earth feels sideways.", "Whoa, steep trail.", "Don't drop me!", "Easy on the angle."};

#define TALK_SET(a) {a, (uint8_t)(sizeof(a) / sizeof(a[0]))}
struct Set { const char* const* l; uint8_t n; };
static const Set SETS[KIND_COUNT] = {
  TALK_SET(SHAKE_L), TALK_SET(HARD_L), TALK_SET(AGAIN_L), TALK_SET(MORN_L), TALK_SET(DAY_L),
  TALK_SET(EVE_L), TALK_SET(LATE_L), TALK_SET(MSG_L), TALK_SET(PLUG_L), TALK_SET(LOW_L), TALK_SET(LEAN_L)};
#undef TALK_SET

struct Deck { uint8_t order[MAX_LINES]; uint8_t pos = 0, n = 0; };

// The next line index from a deck of n, reshuffling (Fisher-Yates) when it runs out.
inline uint8_t deal(Deck& d, uint8_t n) {
  if (n > MAX_LINES) n = MAX_LINES;
  if (d.n != n || d.pos >= n) {
    const uint8_t prev = (d.n == n && n) ? d.order[n - 1] : 0xFF;
    d.n = n;
    for (uint8_t i = 0; i < n; i++) d.order[i] = i;
    for (int i = n - 1; i > 0; i--) {
      const uint8_t j = (uint8_t)random(i + 1);
      const uint8_t t = d.order[i]; d.order[i] = d.order[j]; d.order[j] = t;
    }
    if (n > 1 && d.order[0] == prev) {           // the seam: never the same line twice running
      const uint8_t j = 1 + (uint8_t)random(n - 1);
      const uint8_t t = d.order[0]; d.order[0] = d.order[j]; d.order[j] = t;
    }
    d.pos = 0;
  }
  return d.order[d.pos++];
}

// What he says for kind k. For a MESSAGE, n is how many came in.
inline const char* line(Kind k, unsigned n = 0) {
  static Deck decks[KIND_COUNT + 1];               // the last one: the "N messages" lines
  static char b[32];
  if (k == MESSAGE && n > 1) {
    switch (deal(decks[KIND_COUNT], 4)) {
      case 0:  snprintf(b, sizeof(b), "%u new messages!", n); break;
      case 1:  snprintf(b, sizeof(b), "%u messages waiting!", n); break;
      case 2:  snprintf(b, sizeof(b), "%u new. Popular today!", n); break;
      default: snprintf(b, sizeof(b), "%u messages came in!", n); break;
    }
    return b;
  }
  const Set& s = SETS[k];
  return s.l[deal(decks[k], s.n)];
}

// Just above the character's head in each lock scene (scenes.h), lift px off the
// ground mid-hop: where the bubble's tail points.
inline void anchor(uint8_t style, int lift, int& ax, int& ay) {
  switch (style) {
    case STYLE_BLOCKS: ax = 241; ay = 70; break;           // the explorer (his ground varies)
    case STYLE_HERO:   ax = 238; ay = 86; break;           // the adventurer
    case STYLE_AURORA: ax = 266; ay = 90 - lift; break;    // the sasquatch, 80 px tall
    default:           ax = 268; ay = 82 - lift; break;    // INW: the sasquatch, 88 px tall
  }
}

// The bubble, its tail pointing at (ax, ay) - just above his head. It pops in over
// the first ~0.16 s (grow 0..1) and the words appear once it's full size.
inline void bubble(lgfx::LovyanGFX& d, const Theme& t, int ax, int ay, const char* text, float grow) {
  d.setFont(&fonts::Font2);
  const int fullW = d.textWidth(text) + 18, fullH = 22;
  const float g = grow < 0.35f ? 0.35f : (grow > 1 ? 1 : grow);
  const int w = (int)(fullW * g), h = (int)(fullH * g);
  // Up and to the right of him: he faces right, so that's where the words come out.
  int bx = ax + 4;
  if (bx + fullW > L::W - 4) bx = L::W - 4 - fullW;
  int by = ay - 10 - fullH;
  if (by < 21) by = 21;                              // clear of the status bar
  const int x0 = bx, y0 = by + fullH - h;            // grows out of its lower left corner
  const uint16_t fill = t.txt, edge = t.green;
  const int tb = x0 + 8;                             // the tail's base on the bubble's bottom
  d.fillTriangle(tb, y0 + h - 1, tb + 9, y0 + h - 1, ax + 2, ay, fill);
  d.fillRoundRect(x0, y0, w, h, 8, fill);
  d.drawRoundRect(x0, y0, w, h, 8, edge);
  d.drawLine(tb, y0 + h - 1, ax + 2, ay, edge);
  d.drawLine(tb + 9, y0 + h - 1, ax + 2, ay, edge);
  d.drawFastHLine(tb + 1, y0 + h - 1, 8, fill);      // opens the bubble into its tail
  if (g >= 1.0f) {
    d.setTextColor(t.bg, fill);
    d.drawString(text, x0 + 9, y0 + 4);
  }
}

}  // namespace talk
