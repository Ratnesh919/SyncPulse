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

// Cache static files for fast loading on low-speed internet
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

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

// Default Starting Track (YouTube Cloud Stream)
const DEFAULT_TRACK = {
  id: 'yt-jfKfPfyJRdk',
  title: 'Lofi Hip Hop Radio - Beats to Relax/Study to',
  artist: 'Lofi Girl',
  duration: 240,
  type: 'youtube',
  youtubeVideoId: 'jfKfPfyJRdk'
};

const rooms = new Map();

// In-Memory Search Cache for Low Internet Speed & Instant Results (15 min TTL)
const ytSearchCache = new Map();
const SEARCH_CACHE_TTL = 15 * 60 * 1000;

// API: Server Info
app.get('/api/server-info', (req, res) => {
  res.json({
    ips: getLocalIpAddresses(),
    port: PORT,
    tracks: [DEFAULT_TRACK],
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

// API: YouTube Mini Search with Instant Caching
app.get('/api/youtube/search', (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) return res.json({ results: [] });

  const cacheKey = query.toLowerCase();
  const cached = ytSearchCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < SEARCH_CACHE_TTL)) {
    return res.json({ results: cached.results });
  }

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
        ytSearchCache.set(cacheKey, { results, timestamp: Date.now() });
        res.json({ results });
      } catch (err) {
        console.error('YouTube Search Parse Error:', err);
        res.json({ results: [] });
      }
    });
  }).on('error', (err) => {
    console.error('YouTube Search Request Error:', err);
  });
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
              currentTrack: DEFAULT_TRACK,
              queue: [], // Collaborative Democratic Party Jukebox Queue
              crossfadeSec: 4, // Auto-DJ Crossfade seconds (0 = off)
              spatialMode: 'normal', // 'normal', '8d', 'dolby'
              playbackState: {
                isPlaying: false,
                position: 0,
                targetMasterTime: 0,
                playbackRate: 1.0,
                sourceType: 'youtube', // default to cloud YouTube
                youtubeVideoId: DEFAULT_TRACK.youtubeVideoId,
                autoplay: false
              },
              created: Date.now()
            });
          }

          const room = rooms.get(currentRoomId);
          if (!room.queue) room.queue = [];
          if (role === 'host' && !room.hostWs) {
            room.hostWs = ws;
          }

          // Evict stale connections from same device (by deviceName) to prevent ghost peers
          if (deviceName) {
            for (const [existingWs, existingPeer] of room.peers.entries()) {
              if (existingWs !== ws && existingPeer.deviceName === deviceName) {
                try { existingWs.terminate(); } catch (e) {}
                room.peers.delete(existingWs);
              }
            }
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

          // Compute live playback position for late joiners
          let livePlaybackState = { ...room.playbackState };
          if (room.playbackState.isPlaying) {
            const nowMs = getServerMasterTime();
            const roomMasterStart = room.playbackState.roomMasterStartTime || (room.playbackState.targetMasterTime - (room.playbackState.position * 1000));
            const elapsedSec = Math.max(0, (nowMs - roomMasterStart) / 1000);
            livePlaybackState = {
              ...room.playbackState,
              position: elapsedSec,
              roomMasterStartTime: roomMasterStart,
              targetMasterTime: nowMs + 800
            };
          }

          ws.send(JSON.stringify({
            type: 'room_joined',
            peerId,
            roomId: currentRoomId,
            role: peerInfo.role,
            currentTrack: room.currentTrack,
            queue: room.queue,
            crossfadeSec: room.crossfadeSec || 4,
            spatialMode: room.spatialMode,
            playbackState: livePlaybackState,
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
            const roomMasterStartTime = targetMasterTime - ((msg.position || 0) * 1000);

            room.playbackState = {
              isPlaying: true,
              position: msg.position || 0,
              targetMasterTime,
              roomMasterStartTime,
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
              roomMasterStartTime,
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
            const leadTime = Math.min(msg.leadTime || 250, 300);
            const targetMasterTime = getServerMasterTime() + leadTime;
            const roomMasterStartTime = targetMasterTime - (msg.position * 1000);
            room.playbackState.position = msg.position;
            if (msg.isPlaying !== undefined) {
              room.playbackState.isPlaying = !!msg.isPlaying;
            }
            room.playbackState.targetMasterTime = targetMasterTime;
            room.playbackState.roomMasterStartTime = roomMasterStartTime;

            broadcastToRoom(room, {
              type: 'seek_cue',
              position: msg.position,
              isPlaying: room.playbackState.isPlaying,
              targetMasterTime,
              roomMasterStartTime,
              sourceType: room.playbackState.sourceType,
              serverTime: getServerMasterTime()
            });
          }
          break;
        }

        // Host: Periodic Playback Synchronization Broadcast (Master Clock Anchor)
        case 'host_playback_sync': {
          const room = rooms.get(currentRoomId);
          if (room && (room.hostWs === ws || msg.isHostOverride)) {
            const nowMs = getServerMasterTime();
            const hostPosition = typeof msg.position === 'number' ? msg.position : (room.playbackState.position || 0);
            const hostMasterTime = typeof msg.masterTime === 'number' ? msg.masterTime : nowMs;
            const roomMasterStartTime = hostMasterTime - (hostPosition * 1000);

            room.playbackState = {
              ...room.playbackState,
              isPlaying: !!msg.isPlaying,
              position: hostPosition,
              targetMasterTime: hostMasterTime,
              roomMasterStartTime,
              sourceType: msg.sourceType || room.playbackState.sourceType || 'audio',
              youtubeVideoId: msg.youtubeVideoId || room.playbackState.youtubeVideoId,
              trackId: msg.trackId || (room.currentTrack ? room.currentTrack.id : null),
              lastHostSyncServerTime: nowMs
            };

            // Broadcast host synchronization tick to all other nodes in the room
            broadcastToRoom(room, {
              type: 'host_sync_tick',
              position: hostPosition,
              masterTime: hostMasterTime,
              roomMasterStartTime,
              isPlaying: room.playbackState.isPlaying,
              sourceType: room.playbackState.sourceType,
              youtubeVideoId: room.playbackState.youtubeVideoId,
              trackId: room.playbackState.trackId,
              serverTime: nowMs
            }, ws);
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
            room.playbackState.sourceType = msg.track.type || 'youtube';
            room.playbackState.youtubeVideoId = msg.track.youtubeVideoId || null;

            const leadTime = 400; // fast 400ms lead time
            const targetMasterTime = getServerMasterTime() + leadTime;
            const roomMasterStartTime = targetMasterTime;
            room.playbackState.targetMasterTime = targetMasterTime;
            room.playbackState.roomMasterStartTime = roomMasterStartTime;

            broadcastToRoom(room, {
              type: 'track_changed',
              track: msg.track,
              autoplay: msg.autoplay || false,
              targetMasterTime,
              roomMasterStartTime,
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

        // Host: Kick/Remove a peer device
        case 'kick_peer': {
          const room = rooms.get(currentRoomId);
          if (room && room.hostWs === ws) {
            for (const [peerWs, peer] of room.peers.entries()) {
              if (peer.id === msg.targetPeerId && peerWs !== ws) {
                try {
                  peerWs.send(JSON.stringify({ type: 'kicked', reason: 'Removed by host' }));
                  peerWs.close();
                } catch (e) {}
                room.peers.delete(peerWs);
                break;
              }
            }
            broadcastRoomPeers(room);
          }
          break;
        }

        // Host: Broadcast auto-calibration offset to all peers
        case 'broadcast_calibration': {
          const room = rooms.get(currentRoomId);
          if (room && room.hostWs === ws) {
            broadcastToRoom(room, {
              type: 'apply_calibration',
              offsetMs: msg.offsetMs,
              source: 'host_auto',
              serverTime: getServerMasterTime()
            }, ws);
          }
          break;
        }

        // Host: Live Walkie-Talkie DJ Voice Start (Ducks music across all peers)
        case 'dj_voice_start': {
          const room = rooms.get(currentRoomId);
          if (room && room.hostWs === ws) {
            broadcastToRoom(room, {
              type: 'dj_voice_start',
              hostName: msg.hostName || 'Master Host DJ'
            }, ws);
          }
          break;
        }

        // Host: Live Walkie-Talkie DJ Voice Audio Chunk
        case 'dj_voice_chunk': {
          const room = rooms.get(currentRoomId);
          if (room && room.hostWs === ws) {
            broadcastToRoom(room, {
              type: 'dj_voice_chunk',
              audioData: msg.audioData
            }, ws);
          }
          break;
        }

        // Host: Live Walkie-Talkie DJ Voice Stop (Restores music volume across all peers)
        case 'dj_voice_stop': {
          const room = rooms.get(currentRoomId);
          if (room && room.hostWs === ws) {
            broadcastToRoom(room, {
              type: 'dj_voice_stop'
            }, ws);
          }
          break;
        }

        // Host: Equalizer & Acoustic Preset Broadcast
        case 'set_eq_preset': {
          const room = rooms.get(currentRoomId);
          if (room && room.hostWs === ws) {
            room.eqState = { preset: msg.preset, enabled: msg.enabled };
            broadcastToRoom(room, {
              type: 'eq_preset_changed',
              preset: msg.preset,
              enabled: msg.enabled
            });
          }
          break;
        }

        // Collaborative Democratic Jukebox: Add Song to Queue
        case 'queue_add': {
          const room = rooms.get(currentRoomId);
          if (!room || !msg.track) break;
          const peer = room.peers.get(ws);
          const peerName = peer ? peer.deviceName : 'Guest Node';
          if (!room.queue) room.queue = [];

          const trackId = msg.track.youtubeVideoId || msg.track.id;
          const existing = room.queue.find(item =>
            (item.track.youtubeVideoId && item.track.youtubeVideoId === trackId) ||
            (item.track.id && item.track.id === trackId)
          );

          if (existing) {
            if (!existing.upvoterIds.includes(peerId)) {
              existing.upvoterIds.push(peerId);
              existing.downvoterIds = existing.downvoterIds.filter(id => id !== peerId);
              existing.votes = existing.upvoterIds.length - existing.downvoterIds.length;
            }
          } else {
            const queueItem = {
              queueId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              track: msg.track,
              votes: 1,
              upvoterIds: [peerId],
              downvoterIds: [],
              addedBy: peerName,
              addedByPeerId: peerId,
              timestamp: Date.now()
            };
            room.queue.push(queueItem);
          }

          room.queue.sort((a, b) => b.votes - a.votes || a.timestamp - b.timestamp);
          broadcastToRoom(room, {
            type: 'queue_updated',
            queue: room.queue
          });
          break;
        }

        // Collaborative Democratic Jukebox: Upvote / Downvote
        case 'queue_vote': {
          const room = rooms.get(currentRoomId);
          if (!room || !room.queue) break;
          const item = room.queue.find(q => q.queueId === msg.queueId);
          if (!item) break;

          if (msg.direction === 'up') {
            if (item.upvoterIds.includes(peerId)) {
              item.upvoterIds = item.upvoterIds.filter(id => id !== peerId);
            } else {
              item.upvoterIds.push(peerId);
              item.downvoterIds = item.downvoterIds.filter(id => id !== peerId);
            }
          } else if (msg.direction === 'down') {
            if (item.downvoterIds.includes(peerId)) {
              item.downvoterIds = item.downvoterIds.filter(id => id !== peerId);
            } else {
              item.downvoterIds.push(peerId);
              item.upvoterIds = item.upvoterIds.filter(id => id !== peerId);
            }
          }

          item.votes = item.upvoterIds.length - item.downvoterIds.length;
          room.queue.sort((a, b) => b.votes - a.votes || a.timestamp - b.timestamp);

          broadcastToRoom(room, {
            type: 'queue_updated',
            queue: room.queue
          });
          break;
        }

        // Collaborative Jukebox: Remove Queue Item
        case 'queue_remove': {
          const room = rooms.get(currentRoomId);
          if (!room || !room.queue) break;
          const isHost = room.hostWs === ws;
          room.queue = room.queue.filter(q => {
            if (q.queueId === msg.queueId) {
              return !(isHost || q.addedByPeerId === peerId);
            }
            return true;
          });
          broadcastToRoom(room, {
            type: 'queue_updated',
            queue: room.queue
          });
          break;
        }

        // Collaborative Jukebox: Play Next Queued Song (Host or Auto-DJ)
        case 'queue_pop_next': {
          const room = rooms.get(currentRoomId);
          if (!room || !room.queue || room.queue.length === 0) break;
          if (room.hostWs !== ws && !msg.isAutoTransition) break;

          const nextItem = room.queue.shift();
          room.currentTrack = nextItem.track;
          room.playbackState.position = 0;
          room.playbackState.isPlaying = true;
          room.playbackState.sourceType = nextItem.track.type || 'youtube';
          room.playbackState.youtubeVideoId = nextItem.track.youtubeVideoId || null;

          const leadTime = 400;
          const targetMasterTime = getServerMasterTime() + leadTime;
          room.playbackState.targetMasterTime = targetMasterTime;
          room.playbackState.roomMasterStartTime = targetMasterTime;

          broadcastToRoom(room, {
            type: 'track_changed',
            track: nextItem.track,
            autoplay: true,
            targetMasterTime,
            roomMasterStartTime: targetMasterTime,
            crossfadeSec: msg.crossfadeSec || room.crossfadeSec || 0,
            serverTime: getServerMasterTime()
          });

          broadcastToRoom(room, {
            type: 'queue_updated',
            queue: room.queue
          });
          break;
        }

        // Host: Auto-DJ Crossfade Setting
        case 'set_crossfade': {
          const room = rooms.get(currentRoomId);
          if (room && room.hostWs === ws) {
            room.crossfadeSec = typeof msg.crossfadeSec === 'number' ? msg.crossfadeSec : 4;
            broadcastToRoom(room, {
              type: 'crossfade_updated',
              crossfadeSec: room.crossfadeSec
            });
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

// Periodic Room Master Sync Pulse (every 2 seconds)
setInterval(() => {
  const nowMs = getServerMasterTime();
  for (const [roomId, room] of rooms.entries()) {
    if (room.peers.size > 0 && room.playbackState && room.playbackState.isPlaying) {
      const roomMasterStart = room.playbackState.roomMasterStartTime || (room.playbackState.targetMasterTime - (room.playbackState.position * 1000));
      const elapsedSec = Math.max(0, (nowMs - roomMasterStart) / 1000);
      broadcastToRoom(room, {
        type: 'room_sync_pulse',
        roomMasterStartTime: roomMasterStart,
        isPlaying: room.playbackState.isPlaying,
        position: elapsedSec,
        currentTrack: room.currentTrack,
        serverTime: nowMs
      });
    }
  }
}, 2000);

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

