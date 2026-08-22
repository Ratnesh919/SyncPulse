# 🎧 SyncPulse — High-Definition Synchronized Spatial Audio Network

> 🌐 **Live Web Application:** [https://syncpulse-1igt.onrender.com](https://syncpulse-1igt.onrender.com)  
> 📱 **Connect any phone or laptop via room link/QR code for synchronized 8D & Dolby surround audio!**

---

## 🌟 Key Features

### 1. ⏱️ Cristian's Algorithm NTP Multi-Device Synchronization
- High-precision master clock offset estimation with median jitter filtering ($\pm 5\text{ ms}$ accuracy).
- Scheduled Web Audio API hardware buffer playback eliminating network latency discrepancies across devices.
- Built-in **Hardware & Bluetooth Latency Calibrator** with visual metronome strobe for fine-tuning DAC and Bluetooth buffer delays.

### 2. 🌌 Spatial Acoustic DSP Matrix
- **8D Binaural 360° Soundstage:** Rotating spherical LFO audio panner with distance attenuation.
- **Dolby 5.1 & 7.1 Multi-Phone Fleet Matrix:** Dynamically assign connected phones as:
  - `Front Left` / `Front Right` (Stereo widening & Haas delay)
  - `Center Channel` (High-clarity vocal bandpass $300\text{ Hz} - 4\text{ kHz}$)
  - `Subwoofer Channel` ($<120\text{ Hz}$ Low-pass bass rumble with **mobile haptic vibration**)
  - `Rear Surround Left` / `Rear Surround Right` (Haas precedence effect ambient reflections)

### 3. 📺 Mini YouTube Music Desk & Offline Local Audio Sync
- **Mini YouTube Search & Stream Desk:** Live keyword search and direct URL pasting with synced playback.
- **Zero API Key Architecture:** 100% free, direct extraction with zero third-party API keys or cloud quotas.
- **Offline Direct Storage:** Load local MP3/WAV files for direct multi-phone playback on local Wi-Fi without needing external internet access.

### 4. 🔮 Dynamic Dual-Layer 3D Atmosphere FX Engine
- **Dual-Layer Parallax Rendering:** Visual effects rendered **both below (behind) and above (over) the glass cards**:
  - **❄️ Snow:** 6-point crystalline snowflakes and soft snow puffs drifting with wind physics.
  - **⚡ Thunder:** Purple storm back-glow with branching electric lightning strikes reacting to **heavy bass drops**.
  - **📊 Equalizer Bars:** Ambient real-time Web Audio DSP frequency spectrum rising behind cards.
  - **🌧️ Rain:** Falling raindrops with floor splash water ripples.
  - **💖 Hearts:** Floating glowing neon hearts with sine-wave motion.
  - **✨ Moving Stars & Shooting Comets:** 3D drifting cosmic starfield with high-speed comets cutting across the screen.
  - **🔥 Sparks:** High-energy cyber electrical sparks.
- **Auto-Theme Classifier:** Intelligently detects track moods and keywords from song titles to shift atmospheres automatically!

### 5. 💽 WebGL Three.js Visualizer
- Multi-mode 3D audio visualizer: **Quantum Core**, **Wave Tunnel**, and **Towers Matrix**.

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)

### Installation
```bash
# Clone the repository
git clone https://github.com/Ratnesh919/SyncPulse.git

# Navigate into project directory
cd SyncPulse

# Install dependencies
npm install

# Start the server
npm start
```

### Accessing the App
1. **Host Computer / Laptop:** Open `http://localhost:3000`
2. **Mobile Phones / Secondary Devices:** Scan the **QR Code** or connect to `http://<YOUR_LOCAL_IP>:3000?room=<ROOM_CODE>` on the same Wi-Fi network.

---

## 🏗️ Architecture Overview

```
                          ┌───────────────────────────┐
                          │   Node.js + Express + WS  │
                          │   Master Clock (NTP Server)│
                          └─────────────┬─────────────┘
                                        │ WebSocket JSON Protocol
               ┌────────────────────────┼────────────────────────┐
               ▼                        ▼                        ▼
       ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
       │ Phone 1 (FL)  │        │ Phone 2 (C)   │        │ Phone 3 (SUB) │
       │ Front-Left    │        │ Vocal Center  │        │ Bass + Haptics│
       │ Web Audio DSP │        │ Web Audio DSP │        │ Web Audio DSP │
       └───────────────┘        └───────────────┘        └───────────────┘
```

---

## 📜 License
MIT License — Free to use, modify, and distribute for personal and educational projects.
