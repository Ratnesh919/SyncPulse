/**
 * LatencyCalibrator: Audio Latency & Synchronizer Calibration Tool
 * Features:
 * 1. Visual Strobe Metronome for manual delay alignment
 * 2. ⚡ One-Click Automatic Hardware & Codec Latency Calibration
 */
class LatencyCalibrator {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.isActive = false;
    this.bpm = 120;
    this.intervalSec = 60 / this.bpm; // 0.5 sec per beat
    this.offsetMs = this.audioEngine.hardwareLatencyOffsetMs || 0;
    this.nextBeatTime = 0;
    this.animFrameId = null;
    this.onFlashCallback = null;
    this.onOffsetChangeCallback = null;
  }

  autoCalibrate() {
    if (!this.audioEngine.ctx) return 0;
    const hwLatencyMs = this.audioEngine.autoCalibrateHardwareDelay();
    
    // Platform-specific audio driver calibration heuristic
    let estimatedBufferMs = 0;
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) {
      estimatedBufferMs = 15;
    } else if (/Android/i.test(ua)) {
      estimatedBufferMs = 30;
    }

    const totalCalculated = Math.round(hwLatencyMs + estimatedBufferMs);
    this.setOffset(totalCalculated);
    return totalCalculated;
  }

  start() {
    if (!this.audioEngine.ctx) return;
    this.isActive = true;
    this.nextBeatTime = this.audioEngine.ctx.currentTime + 0.1;
    this.loop();
  }

  stop() {
    this.isActive = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  setOffset(ms) {
    this.offsetMs = Math.max(-400, Math.min(400, ms));
    this.audioEngine.setHardwareLatencyOffset(this.offsetMs);
    if (this.onOffsetChangeCallback) {
      this.onOffsetChangeCallback(this.offsetMs);
    }
  }

  loop() {
    if (!this.isActive || !this.audioEngine.ctx) return;

    const ctx = this.audioEngine.ctx;
    const now = ctx.currentTime;

    while (this.nextBeatTime < now + 0.1) {
      const audioClickTime = this.nextBeatTime - (this.offsetMs / 1000);
      if (audioClickTime >= now) {
        this.playBeep(audioClickTime);
      }
      this.nextBeatTime += this.intervalSec;
    }

    const beatFraction = (now % this.intervalSec) / this.intervalSec;
    const isFlash = beatFraction < 0.12;

    if (this.onFlashCallback) {
      this.onFlashCallback(isFlash, beatFraction);
    }

    this.animFrameId = requestAnimationFrame(() => this.loop());
  }

  playBeep(time) {
    const ctx = this.audioEngine.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.7, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.06);
  }

  onFlash(cb) {
    this.onFlashCallback = cb;
  }

  onOffsetChange(cb) {
    this.onOffsetChangeCallback = cb;
  }
}

window.LatencyCalibrator = LatencyCalibrator;
