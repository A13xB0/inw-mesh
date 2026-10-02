These notes add to the website pages. Where they disagree, the website wins.

Where people get help
- This helper on https://squatchmesh.com/help.
- GitHub, for public questions and bug reports: https://github.com/BamBam1121/inw-mesh/issues and
  https://github.com/BamBam1121/inw-mesh/discussions (needs a free GitHub account).
- The developer, by the hand-off from this helper. One volunteer; replies can take a few days.
- Email: support@squatchmesh.com reaches the developer directly, for anyone who'd rather write an email.
  The hand-off is still best from here, because it sends the conversation along.

Finding the firmware version
- On the pager: Settings > System > version.

Buttons and power (the guide's "Buttons & power" section has the same)
- Bottom edge, left to right: left = reset (restart, nothing lost); middle = BOOT, the one button the
  firmware can use; right = power on only.
- Turning it off needs firmware 1.2.0 or later: hold the middle button until "Power off?" appears, then
  Enter (or press the wheel). Also Settings > power off. Before 1.2.0 there was no way to turn it off;
  the answer then is to update (Settings > System > check for updates).
- Turning it on: hold the right button about a second, or plug in USB. The right button is wired to the
  charger chip, not the processor, so no firmware can give it another job.
- It can't power off with USB plugged in (the charger keeps it running); unplug first.
- Powered off hears nothing: messages sent meanwhile are missed. To save battery but keep receiving,
  tap the middle button to turn just the screen off.
- Five fast taps on the middle button start the SOS countdown, 20 seconds from 1.2.2 (if SOS is set up
  under Tools > field). Any key cancels it. From 1.2.2 the man-down alarm can start it too (below).

Motion sensor (1.2.2): raise to wake, quiet when face down, man-down alarm
- The pager has a Bosch BHI260AP motion sensor (accelerometer + gyroscope). No magnetometer, so no
  compass; nothing in the firmware claims one.
- Raise to wake: Settings > Display > raise to wake, ON by default. Lifting the pager into view (tilted
  towards you, out of a pocket or up off a table) turns the screen on at the lock face; it goes dark again
  after 10 s if not unlocked. It can now and then light in a pocket (sitting down, say): that costs almost
  nothing and keys still can't unlock it. Turn it off there if it bothers them.
- Quiet when face down: Settings > Notifications, OFF by default. Flat, screen down and still for 2 s:
  messages arrive with no sound, vibration, keyboard light or screen wake. Picking it up ends it. A pocket
  holds the pager on its edge, so it doesn't trigger there; lying flat face-down in a bag would.
- Man-down alarm: Tools > field > SOS beacon > "no movement for" (off, 5, 10, 15, 30 min), OFF by default.
  No movement and no key for that long: a minute of chirps and buzzes, faster at the end, on an amber
  "Are you OK?" screen, then the normal 20 s SOS countdown (red, siren). Moving the pager or any key resets
  it. It waits while charging and while an SOS is already on. The SOS message says "(no movement for N
  min)". It needs an SOS channel like the normal SOS. The chirps sound even with sounds off or in quiet
  hours, on purpose.
- A pager left on a table with the man-down alarm on WILL chirp and then send an SOS unless someone
  cancels: tell them to turn it off when they put the pager down for the day.
- "motion sensor not responding" (at boot or in those menus): restart the pager. If it stays, hand off to
  the developer.
- The lock screen's scene leans a little as the pager is tilted (stars and far hills slide, the character
  stays): that's the motion sensor, on purpose.
- Battery saver (20%, or turned on by hand) switches the motion sensor off: raise to wake, quiet when face
  down and the tilting scene pause until it ends. The man-down alarm is the exception: if it's on, the
  sensor keeps running for it alone. "starts when battery saver ends" on turning one of them on is why.
- Download mode for flashing: hold middle (BOOT), tap left (reset), let go of middle.

Sound, battery and screen (1.2.1)
- No sound at all, though sound is on in Settings: before 1.2.1 one bad moment (a restart in the middle of
  a sound, say) could leave the speaker stuck silent until the pager was fully powered off, and it can't
  power off on USB. Fix: update to 1.2.1 (Settings > System > check for updates). Also check the volume
  isn't at 0. If it's still silent on 1.2.1, hand off to the developer.
- Battery percentage: from 1.2.1 the pager counts the charge going in and out itself. It shows 99% while
  charging and 100% only once the charger reports full. If the figure seems off after updating, charging
  to full once sets it straight.
- Every theme has its own animation when you move between screens, unlock and lock. They're meant to be
  there; there's no setting to turn them off.

First start (1.2.2)
- After a fresh install and storage setup, three questions: radio region (MeshCore presets, or keep the
  current radio), time zone (named zones, follow daylight saving), clock and units (12/24 h, miles/km).
  Each has "keep"; all can be changed later in Settings. Updating from 1.2.1 asks them once too.

Wi-Fi (1.2.2)
- It says why it can't join: "wrong password?", "not found (2.4 GHz only)" (5 GHz networks are invisible
  to it), "no answer, weak signal?", "joined, router gave no address". Before 1.2.2 it could say
  "scanning..." forever; that's fixed. To change a saved password: scan + join the network again.

Message details (1.2.2)
- A message's details (roll onto it and press; the bottom of that menu) show the route, with repeaters
  named when they're in your contacts. "4h 2B" beside
  the hops means 4 hops, 2-byte repeater ids; Settings > Messages > "with repeater id size" hides the 2B.

Top header, sensors and IO9 (1.2.2)
- Pinout (LilyGo's J3): 1 GND, 2 3.3 V, 3 TX (IO43), 4 RX (IO44), 5 SCK, 6 MOSI, 7 MISO (5-7 are the
  radio's bus: leave them alone), 8 IO9, 9 SDA (IO3), 10 NRF_CE, 11 SCL (IO2), 12 5 V (only on USB).
- Sensors: BME280, BMP280, SHT3x, SHT4x, AHT20, BH1750 on 3.3 V, GND, SDA, SCL. Shown under Tools > top
  header and sent as telemetry. Not showing: check it's 3.3 V (not 5 V) and SDA/SCL aren't swapped.
- IO9: an LED (IO9 > 330 ohm > LED > GND) or an active 3.3 V buzzer (IO9 and GND). Modes: off, flash on
  new messages, on while unread.

Region scopes (1.2.2) - same as the MeshCore app's regions / flood scope
- A region keeps messages to the repeaters that carry it, instead of a plain flood. Its key is made from
  the name, so it has to match the repeaters' exactly, capitals included (names are letters, digits and -,
  shown without #). A repeater drops a message for a region it doesn't carry: a wrong name means messages
  that reach almost no one.
- It works as the app does: a list of regions you've added, a per-channel "Set Region Scope" (in the
  channel's chat: roll onto a message, press, "region scope"; or Settings > Channels), and a "default region
  scope" for everything else (Settings > Radio & Mesh; the app's Experimental > Default Region Scope is the
  same setting). A channel's region overrides the default; "clear scope" puts it back on the default.
- A scoped channel's chat title shows "Region: name".
- "discover regions" asks the repeaters in direct range which regions they carry and how many still pass
  messages with no region. Choosing from that list is the safe way.
- Messages sent from the MeshCore app over Bluetooth follow the app's own region settings; messages sent on
  the pager follow the pager's.
- Messages stopped arriving after setting a region: clear it, then use "discover regions" to find one the
  repeaters carry. Private regions (names starting with $) aren't supported yet.

Things to check before handing off a problem
- Which firmware version, and whether it was installed from squatchmesh.com/install or updated over Wi-Fi.
- What is on the screen (a photo helps the developer; the visitor can mention they have one and the
  developer will ask for it by email).
- Whether it happens every time.

Installing and flashing
- The website installer works in Chrome or Edge on a computer (Web Serial). Safari and phones can't
  flash. New Firefox versions can try, but its USB support is new and has failed to open the pager's
  port (seen on a Mac): Chrome or Edge is the reliable choice.
- The installer never needs "erase device" ticked. Erasing wipes contacts, channels and messages.
- If no port shows up: try a different USB cable (many are charge-only), a different USB port, and
  follow the "If something goes wrong" section of https://squatchmesh.com/install.
- If a pager won't start after installing, follow "It will not start afterwards" on the install page
  (BOOT/RESET into download mode, then first install again) before trying anything else.

Two different radios - the most likely cause of "radio not responding"
- LilyGo sells the T-Lora Pager with either an SX1262 or an LR1121 radio; they look the same outside.
  Squatch Mesh drives BOTH since version 1.1.17 (it detects which one is fitted). Versions before 1.1.17
  only drove the SX1262: on an LR1121 pager they boot fine but the radio never comes up ("radio init
  failed" / "radio not responding" / "radio down", nothing in or out, no RF in the status bar).
- So when someone says the radio doesn't work, FIRST ask their version (Settings > System > version).
  If it is older than 1.1.17, the fix is simply to update: Settings > System > check for updates over
  Wi-Fi (works without the radio), or the Update button on squatchmesh.com/install. No erase, nothing lost.
- On 1.1.17 or later with "radio=none" / "radio init failed: radio not responding", there are two causes
  and they look the same, so do NOT say which it is and do NOT call it a hardware fault:
  (1) The radio did not start this time. Seen for real on 2026-10-02: a pager on 1.2.7 reported no radio
  on several starts in a row, then came up and worked. Reinstalling does not help. Ask them to: take the
  SD card out if one is in, switch fully off, wait ten seconds, switch on. If the radio comes up, ask them
  to put the card back and say whether it still does (the developer wants to know if the card matters).
  (2) A pager sold with a radio the mesh can't use. LilyGo sells it with an SX1262 or LR1121 (both work)
  and also with a CC1101 or an SX1280 (2.4 GHz); Squatch Mesh and MeshCore cannot use those two. Such a
  pager boots and Wi-Fi works, but it never has a radio. Ask what their order or the box says.
  Always hand off to the developer with: the version, which radio the order says, whether an SD card was
  in, and whether a full power-off brought the radio up.
- If they are on 1.1.17 or later and the radio still does not come up, hand off to the developer, with
  which radio it is if they know (a Wadamesh firmware file name saying sx1262 or lr1121 is the reliable
  answer). https://squatchmesh.com/install#radio

Errors the browser installer reports (the install page sends these to me automatically)
- "No port picked" / NotFoundError: the port chooser was closed, or the pager is on a charge-only cable.
  A data USB-C cable and a different USB port fix most of these.
- "Failed to open serial port" (the installer now says "Couldn't open the pager's USB port"): nothing
  was written, the pager is unchanged. In order: unplug the pager and plug it back in, press try again
  and pick the pager again when the browser asks (a fresh pick fixes a port that went stale when the
  pager restarted); if it is Firefox, use Chrome or Edge; otherwise close anything else holding the
  port - another tab with the installer, Arduino IDE, a serial monitor. The report includes the browser.
  Not a firmware fault: no hand-off unless it still fails in Chrome/Edge after a replug and a fresh pick.
- Timeouts, "Failed to initialize", "Chip not responding": put the pager into flash mode -
  Settings > System > usb flash mode, or hold BOOT, tap RESET, release BOOT - then press install again.
- A failure part-way through writing is safe to retry: press the same button again. Both buttons write
  the bootloader and partition table, so a half-written pager is recoverable by running first install
  again. Never tell anyone to tick "erase device" to fix a failed flash - that erases their contacts.

Keeping keys and contacts on a first install (from other firmware)
- A first install replaces storage. On first start Squatch Mesh restores identity, contacts and channels from
  the SD card: from a Wadamesh store (/meshcomod on the card) or from a MeshCore .json config export saved
  on the card as /meshcore-backup.json. Walk people through https://squatchmesh.com/install#keep-data
  BEFORE they flash. From Wadamesh: SD card in, turn on "Store data on SD", let it reboot, check the card
  has meshcomod/identity, then flash with the card in.
- Ripple, Meshtastic and factory firmware keys can't be carried over; they start with a new identity.
- If someone already flashed from other firmware without doing this and lost their keys or contacts, hand
  off to the developer (urgent) and tell them not to reformat the SD card or flash again.

SD card says "not mounted" / "not found" (Tools > device info, Settings > Data)
- The pager reads cards formatted FAT32 with an ordinary (MBR) partition table. A card that a Mac or PC
  reads fine can still fail here: macOS Disk Utility often erases cards with the "GUID Partition Map"
  scheme, and exFAT (the default for cards over 32 GB) is not read either. The likely fix on a Mac: Disk
  Utility > View > Show All Devices, select the card itself (not the volume under it), Erase, Format
  "MS-DOS (FAT)", Scheme "Master Boot Record". On Windows: format as FAT32 (cards over 32 GB need a tool
  such as guiformat). This erases the card, so copy anything on it off first.
- There is no format or mount command on the pager. It looks for the card at start-up and when the map,
  a backup or the device info asks for it.
- If a card formatted that way still isn't mounted after a restart, or a second card fails too, hand off
  to the developer with the version, the card's size and make, and how it was formatted.

Data
- Contacts and channels are kept on the pager and, with an SD card, also backed up to it. Loss of
  contacts or messages is always worth handing off to the developer.

Halloween theme (pager 1.2.7 and later, T-Deck 1.2.4-beta4 and later)
- A fifth built-in theme: Settings > Theme > Halloween. Orange and purple, and the sasquatch on the lock
  screen is in costume: zombie, witch, vampire, ghost, pumpkin head, skeleton or mummy.
- The costume changes every time the screen goes off and comes back on (and at every restart), and so does
  where he walks (a street of houses, a graveyard, a pumpkin patch, the woods). It moves on to the next one
  each time; there is no setting to pick one. (In pager 1.2.6 beta and T-Deck 1.2.4-beta4 it changed only
  at a restart.)
- From pager 1.2.7 and T-Deck 1.2.4-beta5 it has its own screen changes: slime running down going forward,
  a swarm of bats going back, the lock screen opening like doors, a jack-o'-lantern when locking, lightning
  on waking, and the picture melting away when the screen turns off. They're meant to be there.
- Its sounds are short tunes with a rhythm instead of plain beeps (start-up, message, direct message,
  mention, plugging in), and its vibration is a heartbeat. Volume and "sound off" work as for any theme.
- It has the Squatch theme's cards and screen changes. It can't be used as the look for a theme of your
  own in the theme maker (that offers Squatch, Blocks, Hero and Aurora).

Your own themes (pager 1.2.7 and later, T-Deck 1.2.4-beta4 and later)
- squatchmesh.com/theme-maker makes a theme of your own: pick one of the four looks to build on (it sets
  the lock scene, card shape, sounds and screen changes), pick the colours, give it any name (up to 20
  letters), and watch a live preview of the real screens. Then plug the device in with a USB data cable and
  press the send button. No reflash: the device restarts once when the page connects, takes the theme,
  switches to it, and lists it in Settings > Theme under the four built-in ones.
- Sending needs Chrome or Edge on a computer, the same as the installer. Phones, Safari and Firefox can't
  send over USB; the page still works there for designing, and gives a link to open on a computer.
- Up to four of your own themes on a device. Sending one with a name it already has replaces that one.
  When it has four, take one off first: the page lists what's on the device with "remove" beside each.
- Nothing leaves their computer: the theme goes over the USB cable to the device and nowhere else. It is
  not sent to the website, not shared on the mesh, and other people never see the name.
- Themes stay through restarts and firmware updates. A full erase (installer "start fresh") removes them.
- "This firmware is from before themes": update first (Settings > System > check for updates), then send.
- If a colour choice makes text hard to read the page warns about it; a theme that came out unreadable
  can be fixed by choosing another theme in Settings > Theme, or by sending it again with the
  same name and better colours.

New in 1.2.7 (released 2026-10-01, the current pager release; 1.2.6 was only on the beta channel for an hour)
- The Halloween theme (see "Halloween theme" above).
- Themes of your own from squatchmesh.com/theme-maker (see "Your own themes" above).

New in 1.2.5 (released 2026-10-01; there was no official 1.2.4, only a beta)
- A redrawn sasquatch on the lock screen: fur, a face, he waves, blinks and moves his mouth when he talks.
- "Stay on while held": the screen stays on while the pager is in your hand. Settings > Display, the last item.
- Problem reports now carry the name the pager uses on the mesh (see Problem reports below).
- Fixed: the map with no SD card in (it crawled and could crash; it now keeps downloaded tiles in memory and
  loses them when the map is closed), a failed map tile holding up the next ones, a chime on plugging in when
  already full (95% or more), "1 hops", and the sasquatch's late-night hellos (10 pm to 5 am).
- Still open: a rare crash on the map while a downloaded tile is saved to an SD card. If someone reports the
  map restarting the pager, hand it to the developer.
- Pagers on 1.2.3 or later install it by themselves when idle on Wi-Fi.

New in 1.2.3 (the release after the 1.2.2 beta; 1.2.2 was only ever a beta, 1.2.3 has all of it)
- Updates install by themselves: on Wi-Fi it checks when Wi-Fi connects and every 6 hours, and puts a new
  official release in once the pager is idle (screen off 2 minutes, charging or above 30%, no SOS or phone
  sync). It says "Updated" afterwards; contacts, channels and settings are kept. Settings > System >
  "install updates by itself" turns it off (then it asks first, as before). Beta builds always ask.
  Pagers on 1.2.1 or older still get asked once for 1.2.3; the self-install starts from 1.2.3 on.
- Problem reports: after a crash, a watchdog restart or a real error, the pager sends the developer a
  short report over Wi-Fi when idle (version, why it restarted, where it crashed, memory, battery, its last
  log lines with Wi-Fi names and channel names removed; from pager 1.2.5 and T-Deck 1.2.4-beta3 also the
  name the device uses on the mesh, so the developer knows whose it is), plus a once-a-day check-in (board,
  version, a random number, no name). Never messages, contacts, keys or position.
  Settings > System > "send problem reports" turns both off. Tools > "send log to the developer" sends the
  log on purpose - useful to suggest when someone describes a bug. The privacy page has the details.
  If someone asks whether the firmware phones home: yes, only this, only on Wi-Fi, and it can be turned off.
- The talking sasquatch: on the lock screen he has a speech bubble. He reacts to a real shake (back and
  forth; picking it up or setting it down doesn't count) and hops, says hello for the time of day when the
  pager is picked up after a while, and speaks up for a new message, the charger plugged in, a low battery,
  and being held tipped right over. Settings > Display > "sasquatch talks" turns him off. The other themes'
  characters talk too. He needs the motion sensor for shakes (off in battery saver).
- The lock screen shows the time once (the big clock) and the date; the top bar has no clock there but
  keeps it on every other screen.
- Wi-Fi left on away from saved networks now tries less and less often (up to every 15 minutes with the
  screen off) instead of every 20 seconds - it used to cost a lot of battery.

T-Deck beta (1.2.2-beta6 and later)
- Screen dark on battery: only the LoRa radio runs. The GPS sleeps until the screen wakes, and Wi-Fi turns
  off a minute into the dark and comes back when the screen wakes. Plugged in, Wi-Fi stays on, so on a
  T-Deck updates install themselves while it charges on Wi-Fi.
- The same problem reports and daily check-in as the pager, and the same switch to turn them off.
- It has a Bluetooth console for the developer's tools (admin password only); phones won't list it in
  Bluetooth settings, which is normal.

T-Deck keyboard: numbers and symbols
- Numbers and symbols are typed with the SYM key (bottom row, beside the space bar), not ALT: press sym,
  then the key with the number or symbol printed on it (or hold sym while pressing it). The keyboard is its
  own small computer inside the T-Deck and works this way under every firmware.
- ALT does not type anything in Squatch Mesh. On the keyboard's own chip, alt+B switches the key
  backlight; Squatch Mesh sets the backlight itself (Settings > Display).
- If sym + a key gives nothing at all, ask which keys they tried and hand off to the developer.

T-Deck 1.2.4-beta5 (released 2026-10-01, the current T-Deck beta)
- Halloween: the costume and place change every time the screen comes on, and the theme has its own
  screen changes (see "Halloween theme" above).

T-Deck 1.2.4-beta4 (released 2026-10-01)
- The Halloween theme and themes of your own from squatchmesh.com/theme-maker, the same as pager 1.2.7
  (see "Halloween theme" and "Your own themes" above). On the T-Deck you can tap the sasquatch in his
  costume just as in the other themes.

T-Deck 1.2.4-beta3 (released 2026-10-01)
- A flat battery no longer makes it restart over and over. Below 3.3 V it shows "Battery empty", sleeps, and
  starts by itself once a charger has lifted it to 3.5 V (it looks every 3 minutes; a trackball click makes it
  look now). If someone says their T-Deck shows "Battery empty" and won't start: charge it for 15 minutes or
  more. If they are sure it is charged, holding the trackball down while the message shows starts it anyway,
  and sliding the power switch off and on clears the wait - then hand it to the developer, since the reading
  may be wrong on that unit.
- A T-Deck that turned itself off for an empty battery comes back on by itself once charged.
- Problem reports carry the T-Deck's mesh name (see Problem reports above).
- A map tile that fails to download no longer holds the next ones up.

T-Deck 1.2.4-beta2 (released 2026-09-30)
- Battery: the T-Deck has no charger chip, so it works out "plugged in" from the battery voltage. Up to
  beta1 its own screen or Wi-Fi switching off raised the voltage enough to look like a charger: it showed
  charging with nothing plugged in, and the percentage could be far off (one report: 19%, then 55% half
  an hour later, unplugged). Fixed in beta2, and the percentage is closer to the truth. Anyone seeing that
  on an older build should update. It still has no fuel gauge, so the percentage is an estimate.
- No chime or buzz for plugging in when the battery is already full (95% or more).
- The lock face is laid out for the T-Deck's own screen: a big clock in the middle, the date and unread
  count on one line under it, and the scene's character in the middle rather than off to the right.
- Circles and rounded corners (avatars, badges, cards, buttons) have smooth edges instead of jagged ones.

T-Deck 1.2.4-beta1 (released 2026-09-29)
- The talking sasquatch on the lock face (as on the pager), with his new look. On the T-Deck you tap him
  instead of shaking: he hops and says something; three taps quickly and he sees stars. Tapping anywhere
  else on the lock face still says "swipe up to unlock". Settings > Display > "sasquatch talks" turns it off.
- Notifications can be tapped: a message banner opens that conversation (a new-contact banner opens
  People); swipe a banner up to dismiss it. On the lock face a tap never unlocks: it says "swipe up to
  open it", and the swipe that unlocks opens the conversation.
- With no SD card, the map now shows the tiles it downloads over Wi-Fi (kept in memory, not saved).
- The T-Deck has no motion sensor, so the pager's raise to wake, stay on while held and shake reactions
  don't apply to it.
