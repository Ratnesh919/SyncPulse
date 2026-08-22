/**
 * AudioEngine: High-Precision Web Audio API Engine with 8D Binaural Panning & Dolby Multi-Phone Surround Matrix
 */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.gainNode = null;
    this.analyser = null;

    // Spatial Channel Splitter & Filters
    this.splitter = null;
    this.merger = null;
    this.channelMode = 'all'; // 'all', 'left', 'right', 'center', 'subwoofer', 'rear-left', 'rear-right'

    // 8D Audio Nodes
    this.spatialMode = 'normal'; // 'normal', '8d', 'dolby'
    this.panner8D = null;
    this.filter8D = null;
    this.orbitAngle = 0;
    this.orbitSpeed = 0.08; // Revolving frequency
    this.pannerAnimId = null;

    // Dolby Matrix DSP Nodes
    this.centerBandpass = null;
    this.subwooferLowpass = null;
    this.surroundDelay = null;

    this.currentSource = null;
    this.currentBuffer = null;
    this.currentTrackUrl = null;
    this.bufferCache = new Map();

    this.isPlaying = false;
    this.playStartCtxTime = 0;
    this.playStartPosition = 0;
    this.hardwareLatencyOffsetMs = 0;

    const savedDelay = localStorage.getItem('syncpulse_hardware_delay_ms');
    if (savedDelay) {
      this.hardwareLatencyOffsetMs = parseFloat(savedDelay) || 0;
    }

    this.timeDomainBuffer = null;
    this.lastVibrateTime = 0;
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
    
    // Master Gain
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.85;

    // Analyser Node
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;
    this.timeDomainBuffer = new Uint8Array(this.analyser.fftSize);

    // 8D Audio Stereo Panner & Filter
    if (this.ctx.createStereoPanner) {
      this.panner8D = this.ctx.createStereoPanner();
    }
    this.filter8D = this.ctx.createBiquadFilter();
    this.filter8D.type = 'lowpass';
    this.filter8D.frequency.value = 18000;

    // Dolby Matrix DSP
    this.splitter = this.ctx.createChannelSplitter(2);
    this.merger = this.ctx.createChannelMerger(2);

    // Center Vocal Filter (300Hz - 3500Hz Bandpass)
    this.centerBandpass = this.ctx.createBiquadFilter();
    this.centerBandpass.type = 'bandpass';
    this.centerBandpass.frequency.value = 1400;
    this.centerBandpass.Q.value = 1.0;

    // Subwoofer LFE Filter (<120Hz Lowpass)
    this.subwooferLowpass = this.ctx.createBiquadFilter();
    this.subwooferLowpass.type = 'lowpass';
    this.subwooferLowpass.frequency.value = 120;
    this.subwooferLowpass.Q.value = 2.0;

    // Rear Surround Delay (15ms Haas ambient delay)
    this.surroundDelay = this.ctx.createDelay();
    this.surroundDelay.delayTime.value = 0.015;

    this.applyAudioRouting();

    this.setupBackgroundKeepalive();
    this.start8DLoop();

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  setupBackgroundKeepalive() {
    try {
      const silenceBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const keepaliveSource = this.ctx.createBufferSource();
      keepaliveSource.buffer = silenceBuffer;
      keepaliveSource.loop = true;
      const keepaliveGain = this.ctx.createGain();
      keepaliveGain.gain.value = 0.00001;
      keepaliveSource.connect(keepaliveGain);
      keepaliveGain.connect(this.ctx.destination);
      keepaliveSource.start();
    } catch (e) {
      console.warn('Keepalive notice:', e);
    }
  }

  setSpatialMode(mode) {
    this.spatialMode = mode; // 'normal', '8d', 'dolby'
    this.applyAudioRouting();
  }

  setChannelMode(channel) {
    this.channelMode = channel; // 'all', 'left', 'right', 'center', 'subwoofer', 'rear-left', 'rear-right'
    this.applyAudioRouting();
  }

  applyAudioRouting() {
    if (!this.ctx || !this.gainNode || !this.analyser) return;

    try {
      // Disconnect all intermediate nodes
      this.gainNode.disconnect();
      if (this.panner8D) this.panner8D.disconnect();
      if (this.filter8D) this.filter8D.disconnect();
      if (this.splitter) this.splitter.disconnect();
      if (this.merger) this.merger.disconnect();
      if (this.centerBandpass) this.centerBandpass.disconnect();
      if (this.subwooferLowpass) this.subwooferLowpass.disconnect();
      if (this.surroundDelay) this.surroundDelay.disconnect();

      // Routing Mode 1: 8D Revolving Audio
      if (this.spatialMode === '8d' && this.panner8D) {
        this.gainNode.connect(this.filter8D);
        this.filter8D.connect(this.panner8D);
        this.panner8D.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
        return;
      }

      // Routing Mode 2: Dolby Multi-Phone Channel Matrix
      if (this.channelMode === 'left') {
        this.gainNode.connect(this.splitter);
        this.splitter.connect(this.merger, 0, 0); // L -> L
        this.splitter.connect(this.merger, 0, 1); // L -> R
        this.merger.connect(this.analyser);
      } else if (this.channelMode === 'right') {
        this.gainNode.connect(this.splitter);
        this.splitter.connect(this.merger, 1, 0); // R -> L
        this.splitter.connect(this.merger, 1, 1); // R -> R
        this.merger.connect(this.analyser);
      } else if (this.channelMode === 'center') {
        // Dialogue Vocals
        this.gainNode.connect(this.centerBandpass);
        this.centerBandpass.connect(this.analyser);
      } else if (this.channelMode === 'subwoofer') {
        // Pure Bass
        this.gainNode.connect(this.subwooferLowpass);
        this.subwooferLowpass.connect(this.analyser);
      } else if (this.channelMode === 'rear-left') {
        this.gainNode.connect(this.splitter);
        this.splitter.connect(this.surroundDelay, 0);
        this.surroundDelay.connect(this.merger, 0, 0);
        this.surroundDelay.connect(this.merger, 0, 1);
        this.merger.connect(this.analyser);
      } else if (this.channelMode === 'rear-right') {
        this.gainNode.connect(this.splitter);
        this.splitter.connect(this.surroundDelay, 1);
        this.surroundDelay.connect(this.merger, 0, 0);
        this.surroundDelay.connect(this.merger, 0, 1);
        this.merger.connect(this.analyser);
      } else {
        // Full Stereo
        this.gainNode.connect(this.analyser);
      }

      this.analyser.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Audio routing notice:', e);
    }
  }

  start8DLoop() {
    const update8D = () => {
      if (this.spatialMode === '8d' && this.panner8D && this.isPlaying) {
        this.orbitAngle += this.orbitSpeed;
        const pan = Math.sin(this.orbitAngle);
        const depth = Math.cos(this.orbitAngle); // Front/Back simulation

        this.panner8D.pan.setValueAtTime(pan, this.ctx.currentTime);

        // Filter modulation for back of head effect
        if (this.filter8D) {
          const targetFreq = depth < 0 ? 4500 : 18000;
          this.filter8D.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
        }
      }
      this.pannerAnimId = requestAnimationFrame(update8D);
    };
    update8D();
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

  // Load Audio Buffer (Local or Offline Direct File)
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

    const timeDeltaSec = ((targetMasterTimeMs - syncEngineNowMs) - this.hardwareLatencyOffsetMs) / 1000;
    let targetCtxTime = this.ctx.currentTime + timeDeltaSec;
    let actualStartOffset = startOffsetSec;

    if (targetCtxTime < this.ctx.currentTime) {
      const lateBySec = this.ctx.currentTime - targetCtxTime;
      actualStartOffset += lateBySec;
      targetCtxTime = this.ctx.currentTime;
    }

    if (actualStartOffset >= this.currentBuffer.duration) {
      return;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = this.currentBuffer;
    source.connect(this.gainNode);

    source.start(targetCtxTime, actualStartOffset);
    this.currentSource = source;
    this.isPlaying = true;
    this.playStartCtxTime = targetCtxTime;
    this.playStartPosition = actualStartOffset;

    source.onended = () => {
      if (this.currentSource === source) {
        this.isPlaying = false;
      }
    };
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

  // Play Acoustic/Spoken Test Ping for Speaker Placement Alignment
  playChannelTestBeep(targetChannel) {
    if (!this.ctx) return;
    const isMe = (this.channelMode === targetChannel || targetChannel === 'all');
    if (!isMe) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = targetChannel === 'subwoofer' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(targetChannel === 'subwoofer' ? 70 : 880, this.ctx.currentTime);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.8, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);

    // Mobile Haptic Feedback on Subwoofer Test
    if (targetChannel === 'subwoofer' && navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }
  }

  getCurrentPlaybackPosition() {
    if (!this.isPlaying || !this.ctx) return this.playStartPosition;
    if (this.ctx.currentTime < this.playStartCtxTime) {
      return this.playStartPosition;
    }
    const elapsed = this.ctx.currentTime - this.playStartCtxTime;
    return Math.min(this.currentBuffer ? this.currentBuffer.duration : 0, this.playStartPosition + elapsed);
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
      if (bass > 220 && now - this.lastVibrateTime > 300) {
        navigator.vibrate(35);
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
