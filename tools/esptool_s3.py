"""PlatformIO's esptool, with the ESP32-S3's watchdogs switched off properly.

esptool 4.5.1 (the one PlatformIO ships) writes the S3's RTC watchdog config at +0x90.
It is at +0x98 (soc/rtc_cntl_reg.h), so over the chip's own USB that watchdog was never
switched off and it reset the chip about 8 seconds into a write: the write died part way
and the pager fell back to its other app. Later esptools fixed the address and also set
the super watchdog to feed itself; this does both, then runs esptool as usual.

    python tools/esptool_s3.py --chip esp32s3 --port COM5 ...   (same arguments as esptool)
"""
import os
import sys

sys.path.insert(0, os.path.expanduser("~/.platformio/packages/tool-esptoolpy"))
import esptool
from esptool.targets import ESP32S3ROM

RTC = 0x60008000


def watchdogs_off(self):
    if not self.uses_usb_jtag_serial():
        return
    self.write_reg(RTC + 0xB0, 0x50D83AA1)                              # RTC watchdog: unlock,
    self.write_reg(RTC + 0x98, 0)                                       # off,
    self.write_reg(RTC + 0xB0, 0)                                       # lock
    self.write_reg(RTC + 0xB8, 0x8F1D312A)                              # super watchdog: unlock,
    self.write_reg(RTC + 0xB4, self.read_reg(RTC + 0xB4) | (1 << 31))   # feeds itself,
    self.write_reg(RTC + 0xB8, 0)                                       # lock


ESP32S3ROM.disable_rtc_watchdog = watchdogs_off      # 4.5.1's name for it

if __name__ == "__main__":
    esptool.main(sys.argv[1:])
