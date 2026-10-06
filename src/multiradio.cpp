#include "multiradio.h"
#include <math.h>
#include <target.h>
#include "homelink.h"
#include "logstore.h"

extern LogStore logs;

MultiRadio g_radio;

RadioLibWrapper& MultiRadio::lora() { return radio_driver; }

// The link has to have been up this long before we switch to it, so a connection
// that comes and goes doesn't bounce the LoRa chip in and out of sleep.
static constexpr uint32_t LINK_SETTLE_MS = 3000;

void MultiRadio::sleepLora() {
  if (_loraAsleep) return;
  lora().powerOff();                // sleep, config retained
  _loraAsleep = true;
}

void MultiRadio::wakeLora() {
  if (!_loraAsleep) return;
  _loraAsleep = false;
  // The wrapper still thinks it's receiving. resetAGC() puts its state back to
  // idle, so the next recvRaw() starts a fresh receive.
  lora().resetAGC();
}

// ---- which radio ----------------------------------------------------------------------------------
void MultiRadio::loop() {
  // Only switch between packets, never in the middle of one.
  if (_tx == TX_NONE) {
    if (homelink::up()) {
      if (!_linkUpSince) _linkUpSince = millis() | 1;
      if (!_viaLink && millis() - _linkUpSince >= LINK_SETTLE_MS) {
        _viaLink = true;
        sleepLora();
        logs.add(LOG_INFO, "radio: using home link");
      }
    } else {
      _linkUpSince = 0;
      if (_viaLink) {
        _viaLink = false;
        wakeLora();
        logs.add(LOG_INFO, "radio: back on lora");
      }
    }
  }
  if (!_loraAsleep) lora().loop();
}

// ---- receive --------------------------------------------------------------------------------------
int MultiRadio::recvRaw(uint8_t* bytes, int sz) {
  if (!_viaLink) return lora().recvRaw(bytes, sz);
  int len = 0;
  if (!homelink::recv(bytes, len, _snr, _rssi)) return 0;
  _n.linkRx++;
  return min(len, sz);
}

// ---- transmit -------------------------------------------------------------------------------------
// LoRa time on air (Semtech AN1200.13) for the companion's settings. Preamble as
// MeshCore sets it per SF.
uint32_t MultiRadio::linkAirtime(int len) const {
  const homelink::Remote& r = homelink::remote();
  if (!r.sf || r.bw <= 0) return 0;
  const float tsym = (float)(1UL << r.sf) / (r.bw * 1000.0f) * 1000.0f;   // ms
  const int de = tsym > 16.0f ? 1 : 0;
  const int cr = r.cr >= 5 && r.cr <= 8 ? r.cr : 5;
  const float num = 8.0f * len - 4.0f * r.sf + 28 + 16;                   // CRC on, explicit header
  const float den = 4.0f * (r.sf - 2 * de);
  const float payloadSym = 8 + fmaxf(ceilf(num / den) * cr, 0);
  const float pre = RadioLibWrapper::preambleLengthForSF(r.sf) + 4.25f;
  return (uint32_t)ceilf((pre + payloadSym) * tsym);
}

uint32_t MultiRadio::getEstAirtimeFor(int len_bytes) {
  if (_viaLink) {
    const uint32_t t = linkAirtime(len_bytes);
    if (t) return t;
  }
  return lora().getEstAirtimeFor(len_bytes);
}

bool MultiRadio::startSendRaw(const uint8_t* bytes, int len) {
  if (_viaLink) {
    if (len <= homelink::MAX_TX_RAW) {
      uint32_t seq;
      if (!homelink::send(bytes, len, seq)) return false;   // dispatcher logs it as a failed send
      _tx = TX_LINK;
      _txSeq = seq;
      _txStart = millis();
      _txEst = getEstAirtimeFor(len);
      _n.linkTx++;
      return true;
    }
    _n.tooBig++;
    wakeLora();                     // too big for the link: this one goes out on our own radio
  }
  if (!lora().startSendRaw(bytes, len)) return false;
  _tx = TX_LORA;
  return true;
}

bool MultiRadio::isSendComplete() {
  if (_tx == TX_LORA) return lora().isSendComplete();
  if (_tx != TX_LINK) return true;

  // The companion answers as soon as it has queued the packet, long before it is
  // on air. Hold the dispatcher for the packet's airtime anyway: that keeps its
  // duty-cycle budget honest and paces us to what the companion can send. The
  // dispatcher gives up at 1.5x the estimate, so finish by 1.25x whether or not
  // the answer is back (it is counted when it comes).
  const int8_t r = homelink::result(_txSeq);
  if (r < 0) { _n.linkRefused++; return true; }
  const uint32_t el = millis() - _txStart;
  if (el < _txEst) return false;
  return r > 0 || el >= _txEst + _txEst / 4;
}

void MultiRadio::onSendFinished() {
  if (_tx == TX_LORA) {
    lora().onSendFinished();
    if (_viaLink) sleepLora();      // that was an oversized one: back to sleep
  }
  _tx = TX_NONE;
}
