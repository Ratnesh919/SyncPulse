# ⚡ SyncPulse — Multi-Device Synchronized Audio Network

**SyncPulse** is a real-time web platform that synchronizes audio playback across multiple smartphones, laptops, and Bluetooth speakers with sub-millisecond precision. Designed with an **ECE & Distributed Systems** foundation, it solves network jitter and hardware codec delays using high-precision NTP clock synchronization, Web Audio API hardware buffer scheduling, and an interactive acoustic-visual latency calibration suite.

---

## 🌟 Key Features

- **High-Precision Clock Synchronization:** Implements **Cristian's Algorithm** over WebSockets with statistical outlier rejection and continuous drift tracking to synchronize device clocks within $\pm 5\text{ ms}$.
- **Interactive Hardware Latency Calibrator:** Compensates for Bluetooth A2DP & DAC buffering delays (50–200ms) through an interactive visual radar metronome with millisecond fine-tuning.
- **3D WebGL Audio Visualizer:** Powered by Three.js, featuring a frequency-reactive geodesic sphere, pulsing halo ring, and dynamic bass-reactive starfield.
- **Multi-Speaker Spatial Surround Matrix:** Assign connected devices to **Left Channel**, **Right Channel**, or **Full Stereo** to build an ad-hoc surround sound system from ordinary phones.
- **Instant Mobile Room Sharing:** Generate 6-digit room PINs and dynamic QR codes. Any phone on the same Wi-Fi network can scan and join instantly without installing apps.
- **Custom Audio & Synthesized Presets:** Built-in procedural 128 BPM Synthwave, 120 BPM Acoustic Click reference, Lo-Fi tracks, and support for MP3/WAV/AAC file uploads.
- **Mobile Background Keepalive:** Keeps audio decoding active even when mobile screens or tabs are backgrounded.

---

## 🛠️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Host Device                            │
│  (Uploads audio / selects tracks, controls playback & cues)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ WebSocket (Commands & Audio Buffers)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Node.js + WebSocket Sync Server                │
│  • Room Coordinator (UUID / 6-digit PIN)                    │
│  • NTP Cristian's Sync Engine (Master Clock $\tau_{server}$) │
│  • Low-latency Audio Stream / Buffer Chunk Broker           │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│    Client 1 (Mobile Phone)   │ │  Client 2 (Bluetooth Speaker│
│  • Web Audio API Scheduler   │ │  • Web Audio API Scheduler  │
│  • Hardware Offset Calibrator│ │  • Hardware Offset Calibrator│
│  • Spatial Channel (Left)    │ │  • Spatial Channel (Right)  │
│  • 3D Motion Visualizer      │ │  • 3D Motion Visualizer     │
└──────────────────────────────┘ └─────────────────────────────┘
```

---

## 📐 The Math: Clock Synchronization & Scheduling

### 1. Cristian's NTP Algorithm
Each client measures round-trip time ($\text{RTT}$) and clock offset ($\theta$):
$$\text{RTT} = (t_3 - t_0) - (t_2 - t_1)$$
$$\theta = \frac{(t_1 - t_0) + (t_2 - t_3)}{2}$$
where:
- $t_0$: Timestamp client sends `ntp_ping`
- $t_1$: Server timestamp upon receiving ping
- $t_2$: Server timestamp upon sending `ntp_pong`
- $t_3$: Timestamp client receives `ntp_pong`

### 2. Audio Scheduling Formula
When the Host initiates playback with a future master trigger time $T_{\text{target}}$:
$$t_{\text{hardware}} = \text{audioCtx.currentTime} + \frac{(T_{\text{target}} - T_{\text{localMasterSynced}}) - \Delta_{\text{hardware}}}{1000}$$

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
The server will start at:
- **Local Access:** `http://localhost:3000`
- **Mobile Wi-Fi Access:** `http://<YOUR_LOCAL_IP>:3000`

### 3. Connect Multiple Devices
1. Open `http://localhost:3000` on your primary computer (Host).
2. Click **Share QR** or open the URL shown on your phone connected to the same Wi-Fi.
3. Tap **Activate & Sync Audio** on each device.
4. If using Bluetooth earbuds, open the **Latency Calibrator** tab to tune the offset.
5. Hit **Play** on the Host — all devices will blast the track in perfect synchrony!

---

## 🧪 Verification & Testing
Run the automated multi-device sync simulation:
```bash
node test_sync.js
```
