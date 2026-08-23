const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');
const qrcode = require('qrcode');
const os = require('os');
const https = require('https');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage for uploaded audio (offline local sync)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${cleanName}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'));
    }
  }
});

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

function getPreciseTimeMs() {
  return Number(process.hrtime.bigint()) / 1e6;
}

const serverEpochBase = Date.now() - getPreciseTimeMs();
function getServerMasterTime() {
  return serverEpochBase + getPreciseTimeMs();
}

// Demo Presets
const DEMO_TRACKS = [
  {
    id: 'demo-cyberpunk-pulse',
    title: 'Neon Cyberpunk Bassline',
    artist: 'SyncPulse Studio (Synthesized)',
    duration: 32,
    url: '/demo/cyberpunk_pulse.wav',
    bpm: 128,
    isPreset: true,
    type: 'audio'
  },
  {
    id: 'demo-metronome-calibrator',
    title: 'Precision Acoustic Click 120 BPM',
    artist: 'Hardware Latency Reference',
    duration: 60,
    url: '/demo/click_reference.wav',
    bpm: 120,
    isPreset: true,
    type: 'audio'
  },
  {
    id: 'demo-lofi-drift',
    title: 'Midnight Lo-Fi Chord Groove',
    artist: 'SyncPulse Studio (Synthesized)',
    duration: 45,
    url: '/demo/lofi_groove.wav',
    bpm: 90,
    isPreset: true,
    type: 'audio'
  }
];

const rooms = new Map();

// API: Server Info
app.get('/api/server-info', (req, res) => {
  res.json({
    ips: getLocalIpAddresses(),
    port: PORT,
    tracks: DEMO_TRACKS,
    serverTime: getServerMasterTime()
  });
});

// API: QR Code Generator
app.get('/api/qr', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url parameter');
  try {
    const qrDataUrl = await qrcode.toDataURL(url, {
      margin: 1,
      width: 280,
      color: { dark: '#00f2fe', light: '#030509' }
    });
    res.json({ dataUrl: qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: YouTube Mini Search
app.get('/api/youtube/search', (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ results: [] });

  const searchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query);
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  };

  https.get(searchUrl, options, (ytRes) => {
    let data = '';
    ytRes.on('data', chunk => data += chunk);
    ytRes.on('end', () => {
      try {
        const match = data.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
        if (!match) {
          return res.json({ results: [] });
        }
        const json = JSON.parse(match[1]);
        const contents = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents || [];
        const results = [];

        for (const item of contents) {
          const v = item.videoRenderer;
          if (v && v.videoId) {
            results.push({
              id: v.videoId,
              title: v.title?.runs?.[0]?.text || 'YouTube Audio',
              channel: v.ownerText?.runs?.[0]?.text || 'YouTube Creator',
              duration: v.lengthText?.simpleText || 'Live',
              thumbnail: v.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`
            });
            if (results.length >= 10) break;
          }
        }
        res.json({ results });
      } catch (err) {
        console.error('YouTube Search Parse Error:', err);
        res.json({ results: [] });
      }
    });
  }).on('error', (err) => {
    console.error('YouTube Search Request Error:', err);
    res.json({ results: [] });
  });
});

// API: Upload Custom Audio File (Offline Direct Storage)
app.post('/api/upload', upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });
  const track = {
    id: `upload-${Date.now()}`,
    title: req.body.title || req.file.originalname.replace(/\.[^/.]+$/, ''),
    artist: req.body.artist || 'Offline Device Sync',
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
    isPreset: false,
    type: 'audio',
    size: req.file.size
  };
  res.json({ success: true, track });
});

// WebSocket Protocol Handlers
wss.on('connection', (ws) => {
  let currentRoomId = null;
  let peerId = `node_${Math.random().toString(36).substring(2, 9)}`;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      switch (msg.type) {
        // NTP Clock Synchronization
        case 'ntp_ping': {
          const t1 = getServerMasterTime();
          ws.send(JSON.stringify({
            type: 'ntp_pong',
            clientSendTime: msg.clientSendTime,
            serverReceiveTime: t1,
            serverSendTime: getServerMasterTime(),
            pingId: msg.pingId
          }));
          break;
        }

        // Room Join
        case 'join_room': {
          const { roomId, role, deviceName, channel, userAgent } = msg;
          currentRoomId = roomId.toUpperCase();

          if (!rooms.has(currentRoomId)) {
            rooms.set(currentRoomId, {
              id: currentRoomId,
              hostWs: role === 'host' ? ws : null,
              peers: new Map(),
              currentTrack: DEMO_TRACKS[0],
              spatialMode: 'normal', // 'normal', '8d', 'dolby'
              playbackState: {
                isPlaying: false,
                position: 0,
                targetMasterTime: 0,
                playbackRate: 1.0,
                sourceType: 'audio', // 'audio' or 'youtube'
                youtubeVideoId: null,
                autoplay: false
              },
              created: Date.now()
            });
          }

          const room = rooms.get(currentRoomId);
          if (role === 'host' && !room.hostWs) {
            room.hostWs = ws;
          }

          const peerInfo = {
            id: peerId,
            role: role || 'guest',
            deviceName: deviceName || (role === 'host' ? 'Master Studio Host' : 'Spatial Audio Node'),
            channel: channel || 'all', // 'left', 'right', 'center', 'subwoofer', 'rear-left', 'rear-right', 'all'
            rtt: 0,
            jitter: 0,
            offset: 0,
            hardwareDelay: 0,
            userAgent: userAgent || 'Audio Node',
            joinedAt: Date.now()
          };

          room.peers.set(ws, peerInfo);

          ws.send(JSON.stringify({
            type: 'room_joined',
            peerId,
            roomId: currentRoomId,
            role: peerInfo.role,
            currentTrack: room.currentTrack,
            spatialMode: room.spatialMode,
            playbackState: room.playbackState,
            serverTime: getServerMasterTime()
          }));

          broadcastRoomPeers(room);
          break;
        }

        // Host: Play Cue Trigger (Host Only)
        case 'play_cue': {
          const room = rooms.get(currentRoomId);
          if (room && (room.hostWs === ws || msg.isHostOverride)) {
            const leadTime = msg.leadTime || 800;
            const targetMasterTime = getServerMasterTime() + leadTime;

            room.playbackState = {
              isPlaying: true,
              position: msg.position || 0,
              targetMasterTime,
              playbackRate: msg.playbackRate || 1.0,
              sourceType: msg.sourceType || 'audio',
              youtubeVideoId: msg.youtubeVideoId || null,
              autoplay: msg.autoplay || false
            };

            broadcastToRoom(room, {
              type: 'play_cue',
              track: room.currentTrack,
              position: room.playbackState.position,
              targetMasterTime,
              playbackRate: room.playbackState.playbackRate,
              sourceType: room.playbackState.sourceType,
              youtubeVideoId: room.playbackState.youtubeVideoId,
              autoplay: room.playbackState.autoplay,
              serverTime: getServerMasterTime()
            });
          }
          break;
        }

        // Host: Pause Cue Trigger (Host Only)
        case 'pause_cue': {
          const room = rooms.get(currentRoomId);
          if (room && (room.hostWs === ws || msg.isHostOverride)) {
            room.playbackState.isPlaying = false;
            room.playbackState.position = msg.position || 0;

            broadcastToRoom(room, {
              type: 'pause_cue',
              position: room.playbackState.position,
              sourceType: room.playbackState.sourceType,
              serverTime: getServerMasterTime()
            });
          }
          break;
        }

        // Host: Seek Cue Trigger (Host Only)
        case 'seek_cue': {
          const room = rooms.get(currentRoomId);
          if (room && (room.hostWs === ws || msg.isHostOverride)) {
            const leadTime = msg.leadTime || 600;
            const targetMasterTime = getServerMasterTime() + leadTime;
            room.playbackState.position = msg.position;
            room.playbackState.targetMasterTime = targetMasterTime;

            broadcastToRoom(room, {
              type: 'seek_cue',
              position: msg.position,
              isPlaying: room.playbackState.isPlaying,
              targetMasterTime,
              sourceType: room.playbackState.sourceType,
              serverTime: getServerMasterTime()
            });
          }
          break;
        }

        // Host: Change Track (Host Only)
        case 'change_track': {
          const room = rooms.get(currentRoomId);
          if (room && (room.hostWs === ws || msg.isHostOverride)) {
            room.currentTrack = msg.track;
            room.playbackState.position = 0;
            room.playbackState.isPlaying = msg.autoplay || false;
            room.playbackState.sourceType = msg.track.type || 'audio';
            room.playbackState.youtubeVideoId = msg.track.youtubeVideoId || null;

            const leadTime = 800;
            const targetMasterTime = getServerMasterTime() + leadTime;
            room.playbackState.targetMasterTime = targetMasterTime;

            broadcastToRoom(room, {
              type: 'track_changed',
              track: msg.track,
              autoplay: msg.autoplay || false,
              targetMasterTime,
              serverTime: getServerMasterTime()
            });
          }
          break;
        }

        // Host: Set Spatial Sound Mode (Host Only)
        case 'set_spatial_mode': {
          const room = rooms.get(currentRoomId);
          if (room && (room.hostWs === ws || msg.isHostOverride)) {
            room.spatialMode = msg.spatialMode; // 'normal', '8d', 'dolby'
            broadcastToRoom(room, {
              type: 'spatial_mode_changed',
              spatialMode: msg.spatialMode,
              serverTime: getServerMasterTime()
            });
          }
          break;
        }

        // Host: Run Channel Speaker Placement Test Sound
        case 'test_channel_cue': {
          const room = rooms.get(currentRoomId);
          if (room && (room.hostWs === ws || msg.isHostOverride)) {
            broadcastToRoom(room, {
              type: 'test_channel_cue',
              targetChannel: msg.targetChannel,
              serverTime: getServerMasterTime()
            });
          }
          break;
        }

        // Client Telemetry
        case 'telemetry_update': {
          const room = rooms.get(currentRoomId);
          if (room && room.peers.has(ws)) {
            const peer = room.peers.get(ws);
            peer.rtt = msg.rtt;
            peer.jitter = msg.jitter;
            peer.offset = msg.offset;
            peer.hardwareDelay = msg.hardwareDelay;
            peer.channel = msg.channel;
            peer.deviceName = msg.deviceName || peer.deviceName;
            broadcastRoomPeers(room);
          }
          break;
        }

        // Host: Assign Channel Remotely
        case 'set_peer_channel': {
          const room = rooms.get(currentRoomId);
          if (room && room.hostWs === ws) {
            for (const [peerWs, peer] of room.peers.entries()) {
              if (peer.id === msg.targetPeerId) {
                peer.channel = msg.channel;
                peerWs.send(JSON.stringify({
                  type: 'channel_assigned',
                  channel: msg.channel
                }));
                break;
              }
            }
            broadcastRoomPeers(room);
          }
          break;
        }

        // Live Room Chat Message
        case 'chat_message': {
          const room = rooms.get(currentRoomId);
          if (room && room.peers.has(ws)) {
            const peer = room.peers.get(ws);
            const chatPayload = {
              type: 'chat_message',
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              peerId: peer.id,
              deviceName: msg.deviceName || peer.deviceName,
              role: peer.role,
              text: (msg.text || '').trim().substring(0, 500),
              reaction: msg.reaction || null,
              timestamp: Date.now()
            };
            broadcastToRoom(room, chatPayload);
          }
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket Error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && rooms.has(currentRoomId)) {
      const room = rooms.get(currentRoomId);
      room.peers.delete(ws);
      if (room.hostWs === ws) {
        room.hostWs = null;
      }
      if (room.peers.size === 0) {
        rooms.delete(currentRoomId);
      } else {
        broadcastRoomPeers(room);
      }
    }
  });
});

function broadcastToRoom(room, payload, excludeWs = null) {
  const json = JSON.stringify(payload);
  for (const [clientWs] of room.peers.entries()) {
    if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(json);
    }
  }
}

function broadcastRoomPeers(room) {
  const peerList = Array.from(room.peers.values());
  broadcastToRoom(room, {
    type: 'peer_list_update',
    peers: peerList,
    count: peerList.length
  });
}

function generateDemoWavs() {
  const demoDir = path.join(__dirname, 'public', 'demo');
  if (!fs.existsSync(demoDir)) {
    fs.mkdirSync(demoDir, { recursive: true });
  }

  const synthPath = path.join(demoDir, 'cyberpunk_pulse.wav');
  if (!fs.existsSync(synthPath)) {
    fs.writeFileSync(synthPath, createSynthesizedAudio(128, 30, 'synth'));
  }

  const clickPath = path.join(demoDir, 'click_reference.wav');
  if (!fs.existsSync(clickPath)) {
    fs.writeFileSync(clickPath, createSynthesizedAudio(120, 60, 'click'));
  }

  const lofiPath = path.join(demoDir, 'lofi_groove.wav');
  if (!fs.existsSync(lofiPath)) {
    fs.writeFileSync(lofiPath, createSynthesizedAudio(90, 45, 'lofi'));
  }
}

function createSynthesizedAudio(bpm, durationSec, style) {
  const sampleRate = 44100;
  const numChannels = 2;
  const totalSamples = sampleRate * durationSec;
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = totalSamples * blockAlign;

  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const beatDuration = 60 / bpm;
  let offset = 44;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const beatPos = (t % beatDuration) / beatDuration;
    let left = 0;
    let right = 0;

    if (style === 'click') {
      if (beatPos < 0.05) {
        const env = Math.exp(-beatPos * 120);
        const freq = (Math.floor(t / beatDuration) % 4 === 0) ? 1760 : 880;
        const sig = Math.sin(2 * Math.PI * freq * t) * env;
        left = sig;
        right = sig;
      }
    } else if (style === 'synth') {
      if (beatPos < 0.2) {
        const kickEnv = Math.exp(-beatPos * 25);
        const kickFreq = 140 * Math.exp(-beatPos * 30) + 45;
        const kick = Math.sin(2 * Math.PI * kickFreq * beatPos * beatDuration) * kickEnv;
        left += kick * 0.8;
        right += kick * 0.8;
      }
      const hatPos = (beatPos + 0.5) % 1.0;
      if (hatPos < 0.1) {
        const noise = (Math.random() * 2 - 1) * Math.exp(-hatPos * 60);
        left += noise * 0.25;
        right += noise * 0.25;
      }
      const noteIdx = Math.floor((t / (beatDuration / 4)) % 16);
      const bassNotes = [55, 55, 110, 55, 65.4, 65.4, 130.8, 65.4, 49, 49, 98, 49, 43.6, 43.6, 87.3, 73.4];
      const bassFreq = bassNotes[noteIdx];
      const bassNoteT = (t % (beatDuration / 4));
      const bassEnv = Math.exp(-bassNoteT * 12);
      const bassSaw = ((2 * (bassNoteT * bassFreq % 1)) - 1) * bassEnv * 0.35;
      left += bassSaw * 0.8;
      right += bassSaw * 0.8;
      const pad = (Math.sin(2 * Math.PI * 220 * t) + Math.sin(2 * Math.PI * 329.63 * t) + Math.sin(2 * Math.PI * 440 * t)) * 0.08;
      left += pad * 0.7;
      right += pad * 0.9;
    } else if (style === 'lofi') {
      const chordRoots = [261.63, 220, 174.61, 196];
      const chordIdx = Math.floor(t / (beatDuration * 4)) % 4;
      const root = chordRoots[chordIdx];
      const chord = (Math.sin(2 * Math.PI * root * t) + Math.sin(2 * Math.PI * (root * 1.25) * t) + Math.sin(2 * Math.PI * (root * 1.5) * t)) * 0.15;
      const crackle = (Math.random() > 0.985 ? (Math.random() * 2 - 1) * 0.12 : 0);
      const beatNum = Math.floor(t / beatDuration) % 4;
      if ((beatNum === 0 || beatNum === 2) && beatPos < 0.25) {
        const softKick = Math.sin(2 * Math.PI * 65 * beatPos * beatDuration) * Math.exp(-beatPos * 16) * 0.5;
        left += softKick;
        right += softKick;
      }
      left += chord + crackle;
      right += chord * 0.95 + crackle;
    }

    const lClamped = Math.max(-1, Math.min(1, left));
    const rClamped = Math.max(-1, Math.min(1, right));
    buffer.writeInt16LE(Math.floor(lClamped * 32767), offset);
    buffer.writeInt16LE(Math.floor(rClamped * 32767), offset + 2);
    offset += 4;
  }

  return buffer;
}

generateDemoWavs();

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 SyncPulse Synchronized Spatial Audio Server Running!`);
  console.log(`📡 Local Access: http://localhost:${PORT}`);
  const ips = getLocalIpAddresses();
  if (ips.length > 0) {
    console.log(`📱 Mobile Wi-Fi Access: http://${ips[0]}:${PORT}`);
  }
  console.log(`======================================================\n`);
});
