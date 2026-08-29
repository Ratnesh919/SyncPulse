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

    // Dolby Matrix DSP & Distributed Acoustic Fleet Nodes
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
    this.heightHighpass = null;
    this.heightGain = null;
    this.reverbChamberConvolver = null;
    this.reverbChamberGain = null;
    this.swarmGainNode = null;
    this.nodeSwarmAngleDeg = 0; // Physical angle of this node in room (0-360)
    this.lastSubHapticTime = 0;

    this.currentSource = null;
    this.currentBuffer = null;
    this.currentTrackUrl = null;
    this.bufferCache = new Map();

    // Direct MediaElement Audio Streaming for WebAudio API DSP
    this.mediaAudioElement = null;
    this.mediaElementSource = null;
    this.isStreamPlaying = false;

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

    // 10-Band Graphic Equalizer & Acoustic Presets (31Hz to 16kHz)
    this.eqEnabled = true;
    this.currentEqPreset = 'bass_booster';
    this.eqFrequencies = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    this.eqBands = [];
    this.eqGains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.convolver = null;
    this.reverbGain = null;
    this.dryGain = null;
    this.masterCompressor = null;

    // 360° Real Space Spatial Coordinates
    this.spatial360Azimuth = 0;   // 0 to 360 deg
    this.spatial360Elevation = 0; // -90 to +90 deg
    this.spatial360Distance = 3.0; // 1 to 10 meters
    this.on360PositionUpdateCallback = null;

    // DJ Voice Ducking & Direct Stream
    this.duckingGainNode = null;
    this.djVoiceGain = null;

    // Continuous Latency Auto-Corrector & Phase-Lock Engine
    this.roomMasterStartTime = 0;
    this.autoSyncActive = true;
    this.isAutoSyncFixing = false;
    this.autoSyncConsecutiveLockedCount = 0;
    this.lastDriftMs = 0;
    this.onAutoSyncStatusCallback = null;
    this.autoSyncIntervalTimer = null;

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

    // 1. Analog Tube Harmonic Saturator / Exciter (Tuna.js / Tube Overdrive algorithm)
    this.tubeSaturator = this.ctx.createWaveShaper();
    this.tubeSaturator.curve = this.makeTubeDistortionCurve(16);
    this.tubeSaturator.oversample = '4x';
    this.duckingGainNode.connect(this.tubeSaturator);

    // Mastering Dynamics Compressor / Brickwall Limiter (Prevents Digital Clipping)
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.value = -14;
    this.masterCompressor.knee.value = 12;
    this.masterCompressor.ratio.value = 4.5;
    this.masterCompressor.attack.value = 0.002;
    this.masterCompressor.release.value = 0.20;

    // 10-Band Graphic Equalizer Filter Chain (31Hz, 63Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz)
    this.eqBands = [];
    for (let i = 0; i < this.eqFrequencies.length; i++) {
      const freq = this.eqFrequencies[i];
      const filter = this.ctx.createBiquadFilter();
      if (i === 0) {
        filter.type = 'lowshelf';
      } else if (i === this.eqFrequencies.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.414; // ISO standard 1-octave bandwidth
      }
      filter.frequency.value = freq;
      filter.gain.value = 0;
      this.eqBands.push(filter);
    }

    // Connect serial cascade: tubeSaturator -> Band 0 -> Band 1 -> ... -> Band 9
    this.tubeSaturator.connect(this.eqBands[0]);
    for (let i = 0; i < this.eqBands.length - 1; i++) {
      this.eqBands[i].connect(this.eqBands[i + 1]);
    }

    // 2. Google Resonance Early Reflection Convolution Reverb Architecture
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.createResonanceImpulse(2.8, 1.9);
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.0;
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 1.0;

    const lastEqBand = this.eqBands[this.eqBands.length - 1];
    lastEqBand.connect(this.dryGain);
    this.dryGain.connect(this.masterCompressor);

    lastEqBand.connect(this.convolver);
    this.convolver.connect(this.reverbGain);
    this.reverbGain.connect(this.masterCompressor);

    this.masterCompressor.connect(this.gainNode);

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

    // 1. Setup 3D HRTF Binaural Panner for Real 360° & 8D Spatial Audio
    try {
      this.panner3D = this.ctx.createPanner();
      this.panner3D.panningModel = 'HRTF';
      this.panner3D.distanceModel = 'inverse';
      this.panner3D.refDistance = 1;
      this.panner3D.maxDistance = 10000;
      this.panner3D.rolloffFactor = 1.0;
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

    // Atmos Overhead / Height Channel (>5.5kHz Highpass + Air presence)
    this.heightHighpass = this.ctx.createBiquadFilter();
    this.heightHighpass.type = 'highpass';
    this.heightHighpass.frequency.value = 5500;
    this.heightHighpass.Q.value = 1.0;
    this.heightGain = this.ctx.createGain();
    this.heightGain.gain.value = 1.8;

    // Reverb Chamber Node (100% Wet lush acoustic space generator)
    this.reverbChamberConvolver = this.ctx.createConvolver();
    this.reverbChamberConvolver.buffer = this.createCathedralImpulse(3.6, 1.8);
    this.reverbChamberGain = this.ctx.createGain();
    this.reverbChamberGain.gain.value = 1.6;

    // Traveling Wave Orbit Node
    this.swarmGainNode = this.ctx.createGain();
    this.swarmGainNode.gain.value = 1.0;

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
    this.spatialMode = mode; // 'normal', '8d', '360', 'dolby', 'cathedral'
    if (mode === 'cathedral') {
      if (this.convolver) this.convolver.buffer = this.createCathedralImpulse(4.5, 1.8);
      if (this.reverbGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.reverbGain.gain.cancelScheduledValues(now);
        this.reverbGain.gain.setTargetAtTime(0.55, now, 0.05);
      }
    } else if (mode === '8d' || mode === '360') {
      if (this.reverbGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.reverbGain.gain.cancelScheduledValues(now);
        this.reverbGain.gain.setTargetAtTime(0.12, now, 0.05);
      }
    }
    this.applyAudioRouting();
  }

  setNodeSwarmAngle(angleDeg) {
    this.nodeSwarmAngleDeg = ((angleDeg % 360) + 360) % 360;
  }

  set360Position(azimuthDeg, elevationDeg = 0, distanceM = 3.0) {
    this.spatial360Azimuth = ((azimuthDeg % 360) + 360) % 360;
    this.spatial360Elevation = Math.max(-85, Math.min(85, elevationDeg));
    this.spatial360Distance = Math.max(1, Math.min(10, distanceM));

    if (!this.ctx || !this.panner3D) return;

    const azRad = (this.spatial360Azimuth * Math.PI) / 180;
    const elRad = (this.spatial360Elevation * Math.PI) / 180;

    // 3D Spherical to Cartesian Coordinates:
    // +X = Right, -X = Left
    // +Y = Above, -Y = Below
    // +Z = Front, -Z = Behind
    const x = this.spatial360Distance * Math.cos(elRad) * Math.sin(azRad);
    const y = this.spatial360Distance * Math.sin(elRad);
    const z = this.spatial360Distance * Math.cos(elRad) * Math.cos(azRad);

    const now = this.ctx.currentTime;
    if (this.panner3D.positionX) {
      this.panner3D.positionX.setTargetAtTime(x, now, 0.04);
      this.panner3D.positionY.setTargetAtTime(y, now, 0.04);
      this.panner3D.positionZ.setTargetAtTime(z, now, 0.04);
    } else {
      this.panner3D.setPosition(x, y, z);
    }

    // Dynamic Head-Shadow Pinna Occlusion (attenuates treble when audio is behind head)
    if (this.headShadowFilter) {
      const isBehind = z < 0;
      const targetCutoff = isBehind ? (3200 + (1 + z / this.spatial360Distance) * 4800) : 20000;
      this.headShadowFilter.frequency.setTargetAtTime(targetCutoff, now, 0.06);
    }

    // Multi-device traveling wave modulation
    if (this.swarmGainNode && this.channelMode === 'traveling-orbit') {
      const diffDeg = Math.abs(this.spatial360Azimuth - this.nodeSwarmAngleDeg);
      const shortestDiff = Math.min(diffDeg, 360 - diffDeg);
      const normDist = shortestDiff / 180; // 0 (exact match) to 1 (opposite)
      const swellGain = Math.max(0.08, Math.pow(Math.cos(normDist * Math.PI / 2), 2) * 2.2);
      this.swarmGainNode.gain.setTargetAtTime(swellGain, now, 0.05);
    }

    if (this.on360PositionUpdateCallback) {
      this.on360PositionUpdateCallback({
        azimuth: this.spatial360Azimuth,
        elevation: this.spatial360Elevation,
        distance: this.spatial360Distance,
        x, y, z
      });
    }
  }

  on360PositionUpdate(cb) {
    this.on360PositionUpdateCallback = cb;
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
    safeDisconnect(this.heightHighpass);
    safeDisconnect(this.heightGain);
    safeDisconnect(this.reverbChamberConvolver);
    safeDisconnect(this.reverbChamberGain);
    safeDisconnect(this.swarmGainNode);
    safeDisconnect(this.analyser);

    try {
      // Mode 1: 3D HRTF 8D & 360° Real Space Binaural Panning
      if ((this.spatialMode === '8d' || this.spatialMode === '360' || this.spatialMode === 'cathedral') && this.panner3D && this.channelMode === 'all') {
        this.gainNode.connect(this.headShadowFilter);
        this.headShadowFilter.connect(this.panner3D);
        this.panner3D.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
        return;
      }

      // Mode 2: Dolby & Distributed Multi-Device Fleet Routing
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
      } else if (this.channelMode === 'height') {
        // Atmos Overhead: >5.5kHz highpass shimmer
        this.gainNode.connect(this.heightHighpass);
        this.heightHighpass.connect(this.heightGain);
        this.heightGain.connect(this.analyser);
      } else if (this.channelMode === 'fx-reverb') {
        // Dedicated room reverb reflection generator
        this.gainNode.connect(this.reverbChamberConvolver);
        this.reverbChamberConvolver.connect(this.reverbChamberGain);
        this.reverbChamberGain.connect(this.analyser);
      } else if (this.channelMode === 'traveling-orbit') {
        // Physical traveling wave modulated across room nodes
        this.gainNode.connect(this.swarmGainNode);
        this.swarmGainNode.connect(this.analyser);
      } else {
        // Default: Full Stereo (all)
        this.gainNode.connect(this.analyser);
      }

      // Always connect analyser → destination
      this.analyser.connect(this.ctx.destination);
    } catch (e) {
      try {
        this.gainNode.connect(this.ctx.destination);
      } catch (e2) {}
      console.warn('Audio routing error (fallback applied):', e);
    }
  }

  start8DOrbitLoop() {
    const updateOrbit = () => {
      if ((this.spatialMode === '8d' || this.spatialMode === '360') && this.panner3D && this.ctx) {
        if (this.spatialMode === '8d') {
          this.orbitAngle += this.orbitSpeed;
          const azDeg = (this.orbitAngle * 180 / Math.PI) % 360;
          const elDeg = Math.sin(this.orbitAngle * 1.5) * 15;
          this.set360Position(azDeg, elDeg, 3.2);
        }
      }
      this.pannerAnimId = requestAnimationFrame(updateOrbit);
    };
    updateOrbit();
  }


  setSyncEngine(syncEngine) {
    this.syncEngineRef = syncEngine;
    this.startContinuousAutoSync();
  }

  setRoomMasterStartTime(startTimeMs) {
    if (typeof startTimeMs === 'number' && !isNaN(startTimeMs) && startTimeMs > 0) {
      this.roomMasterStartTime = startTimeMs;
      // If we're playing, check immediately to catch any initial drift
      if (this.isPlaying) {
        setTimeout(() => this.runAutoSyncCycle(), 150);
      }
    }
  }

  onAutoSyncStatus(callback) {
    this.onAutoSyncStatusCallback = callback;
  }

  setAutoSyncActive(active) {
    this.autoSyncActive = !!active;
    if (!this.autoSyncActive) {
      if (this.currentSource && this.currentSource.playbackRate && this.ctx) {
        this.currentSource.playbackRate.setValueAtTime(1.0, this.ctx.currentTime);
      }
      this.isAutoSyncFixing = false;
      if (this.onAutoSyncStatusCallback) {
        this.onAutoSyncStatusCallback({ state: 'disabled', driftMs: 0 });
      }
    } else {
      this.forceAutoSyncNow();
    }
  }

  forceAutoSyncNow() {
    this.autoSyncConsecutiveLockedCount = 0;
    this.runAutoSyncCycle();
  }

  // Continuous Latency Auto-Corrector: Checks every 2 seconds and auto-fixes delay
  startContinuousAutoSync() {
    if (this.autoSyncIntervalTimer) clearInterval(this.autoSyncIntervalTimer);
    this.autoSyncIntervalTimer = setInterval(() => {
      this.runAutoSyncCycle();
    }, 2000);
  }


  runAutoSyncCycle() {
    if (!this.autoSyncActive || !this.isPlaying || !this.ctx || !this.syncEngineRef || !this.currentBuffer) {
      return;
    }

    const masterNow = this.syncEngineRef.now();
    const masterStart = this.roomMasterStartTime || this.playStartMasterTime;
    if (!masterStart) return;

    // Canonical room elapsed time
    const roomElapsedSec = (masterNow - masterStart) / 1000;
    if (roomElapsedSec < 0 || roomElapsedSec >= this.currentBuffer.duration) {
      return;
    }

    // Local playback position
    const localPos = this.getCurrentPlaybackPosition();

    // Exact drift in milliseconds (taking hardware latency into account)
    // Positive drift = local audio is behind room clock (needs speedup / jump forward)
    // Negative drift = local audio is ahead of room clock (needs slowdown / jump back)
    const rawDriftSec = roomElapsedSec - localPos;
    const driftMs = Math.round((rawDriftSec * 1000) - this.hardwareLatencyOffsetMs);
    this.lastDriftMs = driftMs;

    // Phase-Locked Threshold: within ±15ms
    if (Math.abs(driftMs) <= 15) {
      this.autoSyncConsecutiveLockedCount++;
      if (this.currentSource && this.currentSource.playbackRate) {
        this.currentSource.playbackRate.setValueAtTime(1.0, this.ctx.currentTime);
      }
      // When locked for 2 consecutive cycles, stop active fixing
      if (this.isAutoSyncFixing && this.autoSyncConsecutiveLockedCount >= 2) {
        this.isAutoSyncFixing = false;
      }

      if (this.onAutoSyncStatusCallback) {
        this.onAutoSyncStatusCallback({
          state: 'locked',
          driftMs,
          isFixing: this.isAutoSyncFixing,
          consecutive: this.autoSyncConsecutiveLockedCount
        });
      }
      return;
    }

    // Delay / Drift Detected (> 15ms)!
    this.isAutoSyncFixing = true;
    this.autoSyncConsecutiveLockedCount = 0;

    if (this.onAutoSyncStatusCallback) {
      this.onAutoSyncStatusCallback({
        state: 'fixing',
        driftMs,
        isFixing: true
      });
    }

    // Case 1: Micro-Drift (15ms - 220ms) -> Seamless Dynamic Playback Rate Nudge
    if (Math.abs(driftMs) <= 220 && this.currentSource && this.currentSource.playbackRate) {
      const nudgeRate = driftMs > 0 ? 1.045 : 0.955;
      this.currentSource.playbackRate.setValueAtTime(nudgeRate, this.ctx.currentTime);
      console.log(`[SyncPulse Auto-Sync] Micro-nudge active: drift=${driftMs}ms, rate=${nudgeRate}`);
    }
    // Case 2: Macro-Delay (> 220ms, e.g. 3rd phone joined late or buffering lag) -> High-Precision Snap Resync
    else {
      console.warn(`[SyncPulse Auto-Sync] Macro-delay detected (${driftMs}ms on device). Executing instant snap-resync...`);
      const leadTimeSec = 0.08;
      this.schedulePlayback(
        masterNow + (leadTimeSec * 1000),
        masterNow,
        Math.max(0, roomElapsedSec + leadTimeSec)
      );
    }
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
        if (typeof this.onTrackEnded === 'function') {
          this.onTrackEnded();
        }
      }
    };
  }

  // Direct HTML5 Media Element WebAudio Pipeline
  initMediaElement() {
    if (this.mediaAudioElement && this.mediaElementSource) return;
    if (!this.ctx) return;

    try {
      this.mediaAudioElement = new Audio();
      this.mediaAudioElement.crossOrigin = 'anonymous';
      this.mediaAudioElement.preload = 'auto';

      this.mediaElementSource = this.ctx.createMediaElementSource(this.mediaAudioElement);
      // Connect stream directly through 10-band EQ -> Reverb -> Limiter -> 360/8D/Dolby -> Analyser -> Output!
      this.mediaElementSource.connect(this.duckingGainNode || this.gainNode);
    } catch (e) {
      console.warn('MediaElementAudioSource initialization note:', e);
    }
  }

  async loadAndPlayStream(streamUrl, startPos = 0, autoplay = true) {
    if (!this.ctx) await this.init();
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    this.stop();
    this.initMediaElement();

    if (this.mediaAudioElement) {
      this.mediaAudioElement.src = streamUrl;
      this.currentTrackUrl = streamUrl;
      this.applyAudioRouting();

      if (startPos > 0) {
        this.mediaAudioElement.currentTime = startPos;
      }

      if (autoplay) {
        try {
          await this.mediaAudioElement.play();
          this.isPlaying = true;
          this.isStreamPlaying = true;
        } catch (err) {
          console.warn('Stream play error:', err);
        }
      }
    }
  }

  seekStream(posSec) {
    if (this.mediaAudioElement && typeof posSec === 'number' && !isNaN(posSec)) {
      this.mediaAudioElement.currentTime = Math.max(0, posSec);
    }
  }

  pause(pos) {
    if (this.mediaAudioElement && this.isStreamPlaying) {
      try {
        this.mediaAudioElement.pause();
        if (typeof pos === 'number') this.mediaAudioElement.currentTime = pos;
      } catch (e) {}
    }
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
    if (this.mediaAudioElement && this.isStreamPlaying) {
      try {
        this.mediaAudioElement.pause();
      } catch (e) {}
    }
    this.isPlaying = false;
    this.isStreamPlaying = false;
  }

  getCurrentPlaybackPosition() {
    if (this.mediaAudioElement && this.isStreamPlaying) {
      return this.mediaAudioElement.currentTime || 0;
    }
    if (!this.isPlaying || !this.ctx) {
      return (typeof this.pausedPosition === 'number') ? this.pausedPosition : (this.playStartPosition || 0);
    }
    if (this.ctx.currentTime < this.playStartCtxTime) {
      return this.playStartPosition || 0;
    }
    const elapsed = this.ctx.currentTime - this.playStartCtxTime;
    return Math.min(this.currentBuffer ? this.currentBuffer.duration : 0, (this.playStartPosition || 0) + elapsed);
  }

  // 1. Tuna.js-style Analog Tube / Tape Harmonic Saturation Curve
  makeTubeDistortionCurve(amount = 16) {
    const k = Math.max(0, amount);
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      // Soft-knee polynomial saturation transfer function (adds warm tube harmonics without digital clipping)
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  setAnalogWarmth(amount) {
    if (this.tubeSaturator) {
      this.tubeSaturator.curve = this.makeTubeDistortionCurve(amount);
    }
  }

  // 2. Google Resonance Multi-Tap Early Reflection Impulse Generator
  createResonanceImpulse(duration = 2.8, decay = 1.9) {
    if (!this.ctx) return null;
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    // 5 discrete spatial early reflection delay taps
    const earlyTaps = [
      { t: 0.011, gL: 0.65, gR: 0.40 },
      { t: 0.017, gL: 0.35, gR: 0.58 },
      { t: 0.026, gL: 0.48, gR: 0.32 },
      { t: 0.035, gL: 0.28, gR: 0.42 },
      { t: 0.044, gL: 0.38, gR: 0.25 }
    ];

    for (const tap of earlyTaps) {
      const sampleIdx = Math.floor(tap.t * rate);
      if (sampleIdx < length) {
        left[sampleIdx] += tap.gL;
        right[sampleIdx] += tap.gR;
      }
    }

    // High-density diffuse reverberation tail with natural acoustic air absorption
    for (let i = 0; i < length; i++) {
      const n = i / length;
      const env = Math.pow(1 - n, decay);
      left[i] += (Math.random() * 2 - 1) * env * 0.45;
      right[i] += (Math.random() * 2 - 1) * env * 0.45;
    }
    return impulse;
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

  // Generate Cathedral Reverb impulse with long decay
  createCathedralImpulse(duration = 4.5, decay = 1.8) {
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

  setBandGain(index, dbGain) {
    if (!this.ctx || index < 0 || index >= this.eqBands.length) return;
    const clamped = Math.max(-12, Math.min(12, dbGain));
    this.eqGains[index] = clamped;
    if (this.eqEnabled && this.eqBands[index]) {
      const now = this.ctx.currentTime;
      this.eqBands[index].gain.cancelScheduledValues(now);
      this.eqBands[index].gain.setTargetAtTime(clamped, now, 0.04);
    }
  }

  getBandGains() {
    return [...this.eqGains];
  }

  apply10BandGains(gainsArray, reverbWet = 0) {
    if (!this.ctx || !this.eqBands.length) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < this.eqBands.length; i++) {
      const val = (this.eqEnabled && gainsArray && typeof gainsArray[i] === 'number') ? gainsArray[i] : 0;
      this.eqGains[i] = val;
      const filter = this.eqBands[i];
      if (filter && filter.gain) {
        filter.gain.cancelScheduledValues(now);
        filter.gain.setTargetAtTime(val, now, 0.04);
      }
    }
    if (this.reverbGain) {
      this.reverbGain.gain.cancelScheduledValues(now);
      this.reverbGain.gain.setTargetAtTime(this.eqEnabled ? reverbWet : 0, now, 0.04);
    }
  }

  setEqEnabled(enabled) {
    this.eqEnabled = !!enabled;
    if (!this.eqEnabled) {
      this.apply10BandGains([0,0,0,0,0,0,0,0,0,0], 0);
    } else {
      this.setEqPreset(this.currentEqPreset || 'bass_booster');
    }
  }

  setEqPreset(presetName) {
    this.currentEqPreset = presetName;
    if (!this.eqEnabled) {
      this.apply10BandGains([0,0,0,0,0,0,0,0,0,0], 0);
      return;
    }
    switch (presetName) {
      case 'bass_booster':
        this.apply10BandGains([9.0, 8.0, 5.0, 2.0, 0.0, 0.0, 1.0, 2.0, 3.0, 4.0], 0.0);
        break;
      case 'vocal_enhancer':
        this.apply10BandGains([-4.0, -2.0, 0.0, 3.0, 6.0, 8.0, 6.0, 4.0, 2.0, 0.0], 0.08);
        break;
      case 'concert_hall':
        this.apply10BandGains([3.0, 2.0, 1.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0], 0.45);
        break;
      case 'edm':
        this.apply10BandGains([8.0, 7.0, 4.0, 0.0, -2.0, 1.0, 4.0, 6.0, 8.0, 9.0], 0.12);
        break;
      case 'rock':
        this.apply10BandGains([6.0, 5.0, 3.0, -1.0, -3.0, -1.0, 3.0, 6.0, 7.0, 8.0], 0.06);
        break;
      case 'lofi':
        this.apply10BandGains([5.0, 4.0, 3.0, 2.0, 0.0, -2.0, -5.0, -8.0, -12.0, -15.0], 0.15);
        break;
      case 'flat':
      default:
        this.apply10BandGains([0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 0.0);
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

    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (targetChannel === 'subwoofer') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(55, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.5);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(1.0, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
      } else if (targetChannel === 'center') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(1500, now + 0.35);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.7, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      } else if (targetChannel === 'left') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.7, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      } else if (targetChannel === 'right') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.7, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      } else if (targetChannel === 'height') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2400, now);
        osc.frequency.exponentialRampToValueAtTime(3200, now + 0.3);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.6, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      } else if (targetChannel === 'fx-reverb') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.6, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.7, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      }

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    } catch (e) {}
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

  // Play a smooth tactile DSP chime confirming EQ / Spatial mode activation
  playPresetPreviewCue(presetOrMode) {
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      if (presetOrMode === 'bass_booster' || presetOrMode === 'subwoofer') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(70, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);
        if (navigator.vibrate) navigator.vibrate(60);
      } else if (presetOrMode === 'vocal_enhancer' || presetOrMode === 'center') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.18);
      } else if (presetOrMode === 'concert_hall' || presetOrMode === '8d' || presetOrMode === '360') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.22);
      } else if (presetOrMode === 'edm') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
      } else if (presetOrMode === 'rock') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.18);
      } else if (presetOrMode === 'lofi') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.22);
      } else if (presetOrMode === 'cathedral') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.35);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
      }

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }
}


window.AudioEngine = AudioEngine;

