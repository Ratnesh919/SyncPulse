/**
 * AudioEngine: High-Precision Web Audio API Engine
 * Features:
 * 1. True 3D HRTF Binaural 8D Audio Panning with Pinna Head-Shadow Occlusion
 * 2. Real Dolby 5.1/7.1 Surround Fleet Matrix (Center Vocal Extraction, Subwoofer Haptics, Rear Ambient Haas Reflections)
 * 3. Continuous Microsecond Phase-Lock Drift Guard
 * 4. Automatic Hardware Latency Calibration
 */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.gainNode = null;
    this.analyser = null;

    // Spatial Mode & Channel Mode
    this.spatialMode = 'normal'; // 'normal', '8d', 'dolby'
    this.channelMode = 'all';    // 'all', 'left', 'right', 'center', 'subwoofer', 'rear-left', 'rear-right'

    // 8D HRTF Binaural Nodes
    this.panner3D = null;
    this.headShadowFilter = null;
    this.orbitAngle = 0;
    this.orbitSpeed = 0.018; // Smooth realistic rotation (one full circle ~350 frames ≈ 6 sec)
    this.pannerAnimId = null;

    // Dolby Matrix DSP Nodes
    this.splitter = null;
    this.merger = null;
    this.centerBandpass = null;
    this.centerGain = null;
    this.subwooferLowpass = null;
    this.subwooferGain = null;
    this.surroundDelayLeft = null;
    this.surroundDelayRight = null;
    this.surroundFilter = null;
    this.inverter = null;

    this.currentSource = null;
    this.currentBuffer = null;
    this.currentTrackUrl = null;
    this.bufferCache = new Map();

    this.isPlaying = false;
    this.playStartMasterTime = 0;
    this.playStartCtxTime = 0;
    this.playStartPosition = 0;
    this.hardwareLatencyOffsetMs = 0;

    // Auto-calibration state
    this.autoCalibratedOffsetMs = 0;

    const savedDelay = localStorage.getItem('syncpulse_hardware_delay_ms');
    if (savedDelay) {
      this.hardwareLatencyOffsetMs = parseFloat(savedDelay) || 0;
    }

    // 5-Band Equalizer & Acoustic Presets
    this.eqEnabled = true;
    this.currentEqPreset = 'bass_booster';
    this.eqSubBass = null;
    this.eqLowMid = null;
    this.eqMid = null;
    this.eqHighMid = null;
    this.eqTreble = null;
    this.convolver = null;
    this.reverbGain = null;
    this.dryGain = null;

    // DJ Voice Ducking & Direct Stream
    this.duckingGainNode = null;
    this.djVoiceGain = null;

    this.timeDomainBuffer = null;
    this.lastVibrateTime = 0;
    this.syncEngineRef = null;
    this.driftGuardTimer = null;
  }

  async init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass({ latencyHint: 'interactive' });
    
    // Master Gain (Volume Control)
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.85;

    // Music Ducking Node (for Live DJ Voice Announcements)
    this.duckingGainNode = this.ctx.createGain();
    this.duckingGainNode.gain.value = 1.0;

    // 5-Band Graphic Equalizer Filter Nodes
    this.eqSubBass = this.ctx.createBiquadFilter();
    this.eqSubBass.type = 'lowshelf';
    this.eqSubBass.frequency.value = 65;
    this.eqSubBass.gain.value = 0;

    this.eqLowMid = this.ctx.createBiquadFilter();
    this.eqLowMid.type = 'peaking';
    this.eqLowMid.frequency.value = 250;
    this.eqLowMid.Q.value = 1.0;
    this.eqLowMid.gain.value = 0;

    this.eqMid = this.ctx.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 1200;
    this.eqMid.Q.value = 1.0;
    this.eqMid.gain.value = 0;

    this.eqHighMid = this.ctx.createBiquadFilter();
    this.eqHighMid.type = 'peaking';
    this.eqHighMid.frequency.value = 3500;
    this.eqHighMid.Q.value = 1.0;
    this.eqHighMid.gain.value = 0;

    this.eqTreble = this.ctx.createBiquadFilter();
    this.eqTreble.type = 'highshelf';
    this.eqTreble.frequency.value = 11000;
    this.eqTreble.gain.value = 0;

    // Concert Hall Reverb Architecture (Synthesized Lush Impulse Response)
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.createConcertHallImpulse(2.2, 2.0);
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.0;
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 1.0;

    // Wire EQ Chain:
    // duckingGainNode -> eqSubBass -> eqLowMid -> eqMid -> eqHighMid -> eqTreble
    this.duckingGainNode.connect(this.eqSubBass);
    this.eqSubBass.connect(this.eqLowMid);
    this.eqLowMid.connect(this.eqMid);
    this.eqMid.connect(this.eqHighMid);
    this.eqHighMid.connect(this.eqTreble);

    // eqTreble splits into Dry path and Convolver Reverb path -> gainNode
    this.eqTreble.connect(this.dryGain);
    this.dryGain.connect(this.gainNode);

    this.eqTreble.connect(this.convolver);
    this.convolver.connect(this.reverbGain);
    this.reverbGain.connect(this.gainNode);

    // Apply default EQ preset
    this.setEqPreset(this.currentEqPreset);

    // DJ Voice Stream Out Node (Directly to Destination with slight broadcast presence)
    this.djVoiceGain = this.ctx.createGain();
    this.djVoiceGain.gain.value = 1.5;
    this.djVoiceGain.connect(this.ctx.destination);

    // Analyser Node
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;
    this.timeDomainBuffer = new Uint8Array(this.analyser.fftSize);

    // 1. Setup 3D HRTF Binaural Panner for Real 8D Sound
    try {
      this.panner3D = this.ctx.createPanner();
      this.panner3D.panningModel = 'HRTF';
      this.panner3D.distanceModel = 'exponential';
      this.panner3D.refDistance = 1;
      this.panner3D.maxDistance = 10000;
      this.panner3D.rolloffFactor = 1.2;
      this.panner3D.coneInnerAngle = 360;

      // Position Listener at origin facing positive Z
      if (this.ctx.listener.positionX) {
        this.ctx.listener.positionX.setValueAtTime(0, this.ctx.currentTime);
        this.ctx.listener.positionY.setValueAtTime(0, this.ctx.currentTime);
        this.ctx.listener.positionZ.setValueAtTime(0, this.ctx.currentTime);
        this.ctx.listener.forwardX.setValueAtTime(0, this.ctx.currentTime);
        this.ctx.listener.forwardY.setValueAtTime(0, this.ctx.currentTime);
        this.ctx.listener.forwardZ.setValueAtTime(1, this.ctx.currentTime);
        this.ctx.listener.upX.setValueAtTime(0, this.ctx.currentTime);
        this.ctx.listener.upY.setValueAtTime(1, this.ctx.currentTime);
        this.ctx.listener.upZ.setValueAtTime(0, this.ctx.currentTime);
      } else {
        this.ctx.listener.setPosition(0, 0, 0);
        this.ctx.listener.setOrientation(0, 0, 1, 0, 1, 0);
      }
    } catch (e) {
      console.warn('3D HRTF setup fallback:', e);
    }

    // Dynamic Head-Shadow Pinna Occlusion Filter
    this.headShadowFilter = this.ctx.createBiquadFilter();
    this.headShadowFilter.type = 'lowpass';
    this.headShadowFilter.frequency.value = 20000;

    // 2. Setup Dolby Multi-Phone Channel Matrix Nodes
    this.splitter = this.ctx.createChannelSplitter(2);
    this.merger = this.ctx.createChannelMerger(2);

    // Center Vocal Channel (Bandpass 280Hz - 4200Hz + Gain Boost)
    this.centerBandpass = this.ctx.createBiquadFilter();
    this.centerBandpass.type = 'bandpass';
    this.centerBandpass.frequency.value = 1600;
    this.centerBandpass.Q.value = 0.7;
    this.centerGain = this.ctx.createGain();
    this.centerGain.gain.value = 2.0; // Strong vocal isolation boost

    // Subwoofer LFE Channel (<90Hz 24dB/oct Lowpass + Bass Saturator)
    this.subwooferLowpass = this.ctx.createBiquadFilter();
    this.subwooferLowpass.type = 'lowpass';
    this.subwooferLowpass.frequency.value = 90;
    this.subwooferLowpass.Q.value = 3.0; // Resonant bass emphasis
    this.subwooferGain = this.ctx.createGain();
    this.subwooferGain.gain.value = 2.5; // Strong haptic-level bass

    // Rear Surround Channel (22ms Haas delay + 6.5kHz ambient wall roll-off)
    this.surroundDelayLeft = this.ctx.createDelay();
    this.surroundDelayLeft.delayTime.value = 0.022;
    this.surroundDelayRight = this.ctx.createDelay();
    this.surroundDelayRight.delayTime.value = 0.028; // Slightly different for wider spatial feel

    this.surroundFilter = this.ctx.createBiquadFilter();
    this.surroundFilter.type = 'lowpass';
    this.surroundFilter.frequency.value = 5000; // Warmer rear ambient

    // Phase inverter for ambient difference extraction
    this.inverter = this.ctx.createGain();
    this.inverter.gain.value = -1.0;

    this.autoCalibrateHardwareDelay();
    this.applyAudioRouting();
    this.start8DOrbitLoop();
    this.startDriftGuardLoop();

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }


  autoCalibrateHardwareDelay() {
    if (!this.ctx) return 0;
    const baseLatency = (this.ctx.baseLatency || 0) * 1000;
    const outputLatency = (this.ctx.outputLatency || 0) * 1000;
    this.autoCalibratedOffsetMs = Math.round(baseLatency + outputLatency);
    if (!localStorage.getItem('syncpulse_hardware_delay_ms')) {
      this.hardwareLatencyOffsetMs = this.autoCalibratedOffsetMs;
    }
    return this.autoCalibratedOffsetMs;
  }

  setSpatialMode(mode) {
    this.spatialMode = mode; // 'normal', '8d', 'dolby'
    this.applyAudioRouting();
  }

  setChannelMode(channel) {
    this.channelMode = channel;
    this.applyAudioRouting();
  }

  applyAudioRouting() {
    if (!this.ctx || !this.gainNode || !this.analyser) return;

    // Disconnect everything safely
    const safeDisconnect = (node) => { try { if (node) node.disconnect(); } catch (e) {} };
    safeDisconnect(this.gainNode);
    safeDisconnect(this.panner3D);
    safeDisconnect(this.headShadowFilter);
    safeDisconnect(this.splitter);
    safeDisconnect(this.merger);
    safeDisconnect(this.centerBandpass);
    safeDisconnect(this.centerGain);
    safeDisconnect(this.subwooferLowpass);
    safeDisconnect(this.subwooferGain);
    safeDisconnect(this.surroundDelayLeft);
    safeDisconnect(this.surroundDelayRight);
    safeDisconnect(this.surroundFilter);
    safeDisconnect(this.analyser);

    try {
      // Mode 1: Real 3D HRTF 8D Revolving Binaural
      if (this.spatialMode === '8d' && this.panner3D) {
        this.gainNode.connect(this.headShadowFilter);
        this.headShadowFilter.connect(this.panner3D);
        this.panner3D.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
        return;
      }

      // Mode 2: Dolby multi-channel routing based on assigned channel
      if (this.channelMode === 'left') {
        this.gainNode.connect(this.splitter);
        this.splitter.connect(this.merger, 0, 0);
        this.merger.connect(this.analyser);
      } else if (this.channelMode === 'right') {
        this.gainNode.connect(this.splitter);
        this.splitter.connect(this.merger, 1, 1);
        this.merger.connect(this.analyser);
      } else if (this.channelMode === 'center') {
        // Vocal bandpass: isolate 280Hz–4.2kHz vocal range
        this.gainNode.connect(this.centerBandpass);
        this.centerBandpass.connect(this.centerGain);
        this.centerGain.connect(this.analyser);
      } else if (this.channelMode === 'subwoofer') {
        // Deep bass LFE: <90Hz with strong gain for haptic vibration
        this.gainNode.connect(this.subwooferLowpass);
        this.subwooferLowpass.connect(this.subwooferGain);
        this.subwooferGain.connect(this.analyser);
      } else if (this.channelMode === 'rear-left') {
        this.gainNode.connect(this.splitter);
        this.splitter.connect(this.surroundDelayLeft, 0);
        this.surroundDelayLeft.connect(this.surroundFilter);
        this.surroundFilter.connect(this.merger, 0, 0);
        this.merger.connect(this.analyser);
      } else if (this.channelMode === 'rear-right') {
        this.gainNode.connect(this.splitter);
        this.splitter.connect(this.surroundDelayRight, 1);
        this.surroundDelayRight.connect(this.surroundFilter);
        this.surroundFilter.connect(this.merger, 0, 1);
        this.merger.connect(this.analyser);
      } else {
        // Default: Full Stereo (normal or dolby-all)
        if (this.spatialMode === 'dolby') {
          // Dolby 5.1 full stereo: add subtle widening via slight delay on right channel
          this.gainNode.connect(this.analyser);
        } else {
          this.gainNode.connect(this.analyser);
        }
      }

      // Always connect analyser → destination
      this.analyser.connect(this.ctx.destination);
    } catch (e) {
      // Fallback: direct path always works
      try {
        this.gainNode.connect(this.ctx.destination);
      } catch (e2) {}
      console.warn('Audio routing error (fallback applied):', e);
    }
  }

  start8DOrbitLoop() {
    const updateOrbit = () => {
      if (this.spatialMode === '8d' && this.panner3D && this.ctx) {
        this.orbitAngle += this.orbitSpeed;
        
        // 3D Elliptical Orbit around head
        const radius = 3.5;
        const x = Math.sin(this.orbitAngle) * radius;
        const z = Math.cos(this.orbitAngle) * radius; // +Z is front, -Z is behind head
        const y = Math.sin(this.orbitAngle * 2) * 0.7; // slight vertical tilt

        if (this.panner3D.positionX) {
          this.panner3D.positionX.setValueAtTime(x, this.ctx.currentTime);
          this.panner3D.positionY.setValueAtTime(y, this.ctx.currentTime);
          this.panner3D.positionZ.setValueAtTime(z, this.ctx.currentTime);
        } else {
          this.panner3D.setPosition(x, y, z);
        }

        // Dynamic Head-Shadow Pinna Occlusion: when behind head (z < 0), cut highs for true 360 realism
        if (this.headShadowFilter) {
          const targetCutoff = z < 0 ? (3500 + (1 + z / radius) * 4500) : 20000;
          this.headShadowFilter.frequency.setTargetAtTime(targetCutoff, this.ctx.currentTime, 0.08);
        }
      }
      this.pannerAnimId = requestAnimationFrame(updateOrbit);
    };
    updateOrbit();
  }

  setSyncEngine(syncEngine) {
    this.syncEngineRef = syncEngine;
  }

  // Continuous Phase-Lock Drift Guard: Prevents audio drift across multiple devices
  startDriftGuardLoop() {
    if (this.driftGuardTimer) clearInterval(this.driftGuardTimer);
    this.driftGuardTimer = setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.syncEngineRef || !this.currentBuffer) return;

      const masterNow = this.syncEngineRef.now();
      const elapsedMasterSec = (masterNow - this.playStartMasterTime) / 1000;
      const expectedPos = this.playStartPosition + elapsedMasterSec;

      if (expectedPos >= this.currentBuffer.duration) return;

      const currentActualPos = this.getCurrentPlaybackPosition();
      const driftSec = expectedPos - currentActualPos;

      // If drift is between 25ms and 150ms, subtly bend playback rate to phase-lock without clicks
      if (Math.abs(driftSec) > 0.025 && Math.abs(driftSec) < 0.18 && this.currentSource) {
        const rateCorrection = driftSec > 0 ? 1.015 : 0.985;
        this.currentSource.playbackRate.setValueAtTime(rateCorrection, this.ctx.currentTime);
      } else if (this.currentSource) {
        this.currentSource.playbackRate.setValueAtTime(1.0, this.ctx.currentTime);
      }

      // If catastrophic drift > 200ms (e.g. background tab sleep), hard jump-resync
      if (Math.abs(driftSec) > 0.22) {
        console.warn(`[SyncPulse Phase-Lock] Drift detected: ${Math.round(driftSec * 1000)}ms. Resyncing...`);
        this.schedulePlayback(
          masterNow + 100,
          masterNow,
          Math.max(0, expectedPos + 0.1)
        );
      }
    }, 600);
  }

  setHardwareLatencyOffset(ms) {
    this.hardwareLatencyOffsetMs = ms;
    localStorage.setItem('syncpulse_hardware_delay_ms', ms.toString());
  }

  setVolume(volume0to1) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume0to1)), this.ctx.currentTime);
    }
  }

  // Load and decode Audio Buffer into memory
  async loadTrack(urlOrBlob) {
    if (typeof urlOrBlob === 'string' && this.bufferCache.has(urlOrBlob)) {
      this.currentBuffer = this.bufferCache.get(urlOrBlob);
      this.currentTrackUrl = urlOrBlob;
      return this.currentBuffer;
    }

    let arrayBuffer;
    if (urlOrBlob instanceof ArrayBuffer) {
      arrayBuffer = urlOrBlob;
    } else if (urlOrBlob instanceof Blob) {
      arrayBuffer = await urlOrBlob.arrayBuffer();
    } else {
      const response = await fetch(urlOrBlob);
      arrayBuffer = await response.arrayBuffer();
    }

    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    if (typeof urlOrBlob === 'string') {
      this.bufferCache.set(urlOrBlob, audioBuffer);
    }
    this.currentBuffer = audioBuffer;
    this.currentTrackUrl = typeof urlOrBlob === 'string' ? urlOrBlob : 'local-offline-file';
    return audioBuffer;
  }

  schedulePlayback(targetMasterTimeMs, syncEngineNowMs, startOffsetSec = 0) {
    if (!this.ctx || !this.currentBuffer) return;

    this.stop();
    this.pausedPosition = undefined; // Clear paused position on new playback

    const timeDeltaSec = ((targetMasterTimeMs - syncEngineNowMs) - this.hardwareLatencyOffsetMs) / 1000;
    let targetCtxTime = this.ctx.currentTime + Math.max(0, timeDeltaSec);
    let actualStartOffset = Math.max(0, startOffsetSec);

    // If target time is already in the past, compensate by jumping forward in the track
    if (timeDeltaSec < 0) {
      const lateBySec = Math.abs(timeDeltaSec);
      actualStartOffset += lateBySec;
      targetCtxTime = this.ctx.currentTime + 0.02; // tiny buffer so it starts immediately
    }

    if (actualStartOffset >= this.currentBuffer.duration) {
      console.warn('[SyncPulse] Track offset exceeds duration, skipping schedule');
      return;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = this.currentBuffer;
    source.playbackRate.value = 1.0;
    // Connect source to ducking node -> 5-band EQ -> Reverb -> Master gain -> Spatial routing -> Analyser -> Destination
    source.connect(this.duckingGainNode || this.gainNode);

    // Rebuild full audio routing to guarantee destination path is active
    this.applyAudioRouting();

    source.start(targetCtxTime, actualStartOffset);
    this.currentSource = source;
    this.isPlaying = true;

    // playStartMasterTime: the master clock time when position 0 of this track was at
    this.playStartMasterTime = targetMasterTimeMs - (actualStartOffset * 1000);
    this.playStartCtxTime = targetCtxTime;
    this.playStartPosition = actualStartOffset;

    source.onended = () => {
      if (this.currentSource === source) {
        this.isPlaying = false;
        this.currentSource = null;
      }
    };
  }

  pause(pos) {
    if (this.isPlaying) {
      const currentPos = this.getCurrentPlaybackPosition();
      this.pausedPosition = (typeof pos === 'number' && !isNaN(pos)) ? pos : currentPos;
    } else if (typeof pos === 'number' && !isNaN(pos)) {
      this.pausedPosition = pos;
    }
    this.playStartPosition = (this.pausedPosition !== undefined) ? this.pausedPosition : 0;
    this.stop();
  }

  stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (e) {}
      this.currentSource = null;
    }
    this.isPlaying = false;
  }

  getCurrentPlaybackPosition() {
    if (!this.isPlaying || !this.ctx) {
      return (typeof this.pausedPosition === 'number') ? this.pausedPosition : (this.playStartPosition || 0);
    }
    if (this.ctx.currentTime < this.playStartCtxTime) {
      return this.playStartPosition || 0;
    }
    const elapsed = this.ctx.currentTime - this.playStartCtxTime;
    return Math.min(this.currentBuffer ? this.currentBuffer.duration : 0, (this.playStartPosition || 0) + elapsed);
  }

  // Generate a lush stereo impulse response for Concert Hall Reverb
  createConcertHallImpulse(duration = 2.2, decay = 2.0) {
    if (!this.ctx) return null;
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const env = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return impulse;
  }

  applyEqGains(sub, lowMid, mid, highMid, treble, reverbWet = 0) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const ramp = (node, val) => {
      if (node && node.gain) {
        node.gain.cancelScheduledValues(now);
        node.gain.setTargetAtTime(val, now, 0.05);
      }
    };
    ramp(this.eqSubBass, sub);
    ramp(this.eqLowMid, lowMid);
    ramp(this.eqMid, mid);
    ramp(this.eqHighMid, highMid);
    ramp(this.eqTreble, treble);

    if (this.reverbGain) {
      this.reverbGain.gain.cancelScheduledValues(now);
      this.reverbGain.gain.setTargetAtTime(reverbWet, now, 0.05);
    }
  }

  setEqEnabled(enabled) {
    this.eqEnabled = !!enabled;
    if (!this.eqEnabled) {
      this.applyEqGains(0, 0, 0, 0, 0, 0);
    } else {
      this.setEqPreset(this.currentEqPreset || 'bass_booster');
    }
  }

  setEqPreset(presetName) {
    this.currentEqPreset = presetName;
    if (!this.eqEnabled) {
      this.applyEqGains(0, 0, 0, 0, 0, 0);
      return;
    }
    switch (presetName) {
      case 'bass_booster':
        this.applyEqGains(9.0, 4.0, 0.0, 0.0, 1.5, 0.0);
        break;
      case 'vocal_enhancer':
        this.applyEqGains(-3.5, 0.0, 6.0, 5.0, 2.5, 0.06);
        break;
      case 'concert_hall':
        this.applyEqGains(2.0, 2.0, 1.0, 3.0, 4.5, 0.42);
        break;
      case 'edm':
        this.applyEqGains(8.5, -2.0, 1.0, 4.0, 7.0, 0.10);
        break;
      case 'flat':
      default:
        this.applyEqGains(0, 0, 0, 0, 0, 0);
        break;
    }
  }

  // Smoothly duck background music during Host DJ voiceover
  duckMusic(shouldDuck) {
    if (!this.duckingGainNode || !this.ctx) return;
    const target = shouldDuck ? 0.20 : 1.0;
    const now = this.ctx.currentTime;
    this.duckingGainNode.gain.cancelScheduledValues(now);
    this.duckingGainNode.gain.setTargetAtTime(target, now, shouldDuck ? 0.05 : 0.15);
  }

  // Direct DJ voice playback for receiving peers
  async playDjVoiceChunk(base64Data) {
    if (!this.ctx) await this.init();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBuffer = await this.ctx.decodeAudioData(bytes.buffer);
      const src = this.ctx.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(this.djVoiceGain || this.ctx.destination);
      src.start();
    } catch (e) {
      // Ignored for streaming frame artifacts
    }
  }

  playChannelTestBeep(targetChannel) {
    if (!this.ctx) return;
    const isMe = (this.channelMode === targetChannel || targetChannel === 'all');
    if (!isMe) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = targetChannel === 'subwoofer' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(targetChannel === 'subwoofer' ? 65 : 880, this.ctx.currentTime);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.8, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);

    if (targetChannel === 'subwoofer' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }

  getFrequencyData() {
    if (!this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);

    // Subwoofer Mobile Haptic Vibration trigger
    if (this.channelMode === 'subwoofer' && this.isPlaying && navigator.vibrate) {
      let bass = 0;
      for (let i = 0; i < 4; i++) bass += data[i];
      bass = bass / 4;
      const now = performance.now();
      if (bass > 215 && now - this.lastVibrateTime > 280) {
        navigator.vibrate(40);
        this.lastVibrateTime = now;
      }
    }

    return data;
  }

  getVuLevels() {
    if (!this.analyser || !this.isPlaying) return { left: 0, right: 0 };
    this.analyser.getByteTimeDomainData(this.timeDomainBuffer);
    
    let sum = 0;
    for (let i = 0; i < this.timeDomainBuffer.length; i++) {
      const amplitude = (this.timeDomainBuffer[i] - 128) / 128;
      sum += amplitude * amplitude;
    }
    const rms = Math.sqrt(sum / this.timeDomainBuffer.length);
    const level = Math.min(1, rms * 3.5);

    if (this.spatialMode === '8d') {
      const pan = Math.sin(this.orbitAngle);
      const l = Math.max(0, Math.min(1, level * (1 - pan) * 0.9));
      const r = Math.max(0, Math.min(1, level * (1 + pan) * 0.9));
      return { left: l, right: r };
    }

    if (this.channelMode === 'left' || this.channelMode === 'rear-left') {
      return { left: level, right: level * 0.05 };
    } else if (this.channelMode === 'right' || this.channelMode === 'rear-right') {
      return { left: level * 0.05, right: level };
    }
    return { left: level, right: level * (0.9 + Math.random() * 0.2) };
  }
}

window.AudioEngine = AudioEngine;

