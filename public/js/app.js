/**
 * SyncPulse Application Controller
 * Handles NTP Clock Sync, Web Audio Engine, Mini YouTube Search & Sync,
 * 8D & Dolby 5.1/7.1 Spatial Matrix, Dynamic Atmosphere Particles, Live Room Chat & Rising Floating Reactions.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  const tabs = document.querySelectorAll('.dock-tab');
  const panels = document.querySelectorAll('.tab-panel');
  
  // Status Bar & Atmosphere
  const syncBadge = document.getElementById('sync-badge');
  const syncText = document.getElementById('sync-text');
  const rttDisplay = document.getElementById('rtt-display');
  const roomCodeText = document.getElementById('room-code-text');
  const btnShareQr = document.getElementById('btn-share-qr');
  const btnOpenJoinModal = document.getElementById('btn-open-join-modal');
  const atmoButtons = document.querySelectorAll('.atmo-btn');
  const atmosphereUnderlay = document.getElementById('atmosphere-underlay');
  const atmosphereOverlay = document.getElementById('atmosphere-overlay');
  const floatingReactionsLayer = document.getElementById('screen-floating-reactions-layer');

  // Device Name Controls
  const btnEditDevice = document.getElementById('btn-edit-device');
  const myDeviceLabel = document.getElementById('my-device-label');
  const modalEditName = document.getElementById('modal-edit-name');
  const editNameInput = document.getElementById('edit-name-input');
  const btnSaveDeviceName = document.getElementById('btn-save-device-name');
  const btnCancelDeviceName = document.getElementById('btn-cancel-device-name');
  const deviceNameInput = document.getElementById('device-name-input');
  const joinModalTitle = document.getElementById('join-modal-title');
  const joinModalDesc = document.getElementById('join-modal-desc');

  // Direct Join Room Modal
  const modalJoinPicker = document.getElementById('modal-join-picker');
  const inputRoomPin = document.getElementById('input-room-pin');
  const inputJoinDeviceName = document.getElementById('input-join-device-name');
  const btnSubmitJoinRoom = document.getElementById('btn-submit-join-room');
  const btnCancelJoinRoom = document.getElementById('btn-cancel-join-room');

  // Player Elements & Guest Lock Banner
  const guestLockNotice = document.getElementById('guest-control-lock-notice');
  const trackTitle = document.getElementById('track-title');
  const trackArtist = document.getElementById('track-artist');
  const vinylDisc = document.getElementById('vinyl-disc');
  const progressBar = document.getElementById('progress-bar');
  const progressFill = document.getElementById('progress-fill');
  const timeCurrent = document.getElementById('time-current');
  const timeTotal = document.getElementById('time-total');
  const btnPlay = document.getElementById('btn-play');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  const btnStop = document.getElementById('btn-stop');
  const btnPrevTrack = document.getElementById('btn-prev-track');
  const btnNextTrack = document.getElementById('btn-next-track');
  const btnLoopToggle = document.getElementById('btn-loop-toggle');
  const btnMuteToggle = document.getElementById('btn-mute-toggle');
  const volumeSlider = document.getElementById('volume-slider');
  const volPercent = document.getElementById('vol-percent');
  const vuDbReadout = document.getElementById('vu-db-readout');
  const trackListContainer = document.getElementById('track-list-container');
  const fileUploadInput = document.getElementById('audio-upload-input');
  const btnUploadTrigger = document.getElementById('btn-upload-trigger');

  // VU Meters
  const vuBarLeft = document.getElementById('vu-bar-left');
  const vuBarRight = document.getElementById('vu-bar-right');

  // Spatial Mode Controls
  const modeButtons = document.querySelectorAll('.mode-btn');

  // Mini YouTube Desk
  const ytSearchInput = document.getElementById('yt-search-input');
  const btnYtSearch = document.getElementById('btn-yt-search');
  const ytResultsScroll = document.getElementById('yt-results-scroll');
  const ytAutoplayCheckbox = document.getElementById('yt-autoplay-checkbox');

  // Fleet Matrix
  const fleetGrid = document.getElementById('fleet-grid');
  const deviceCountBadge = document.getElementById('device-count-badge');

  // Audio Calibrator Elements
  const btnAutoCalibrate = document.getElementById('btn-auto-calibrate');
  const calibratorMarker = document.getElementById('calibrator-marker');
  const offsetSlider = document.getElementById('offset-slider');
  const offsetValDisplay = document.getElementById('offset-val-display');
  const btnCalibratorToggle = document.getElementById('btn-calibrator-toggle');
  const btnResetOffset = document.getElementById('btn-reset-offset');
  const btnStepDown = document.getElementById('btn-step-down');
  const btnStepUp = document.getElementById('btn-step-up');

  // Live Chat Elements
  const chatForm = document.getElementById('chat-form');
  const chatTextInput = document.getElementById('chat-text-input');
  const chatMessagesContainer = document.getElementById('chat-messages-container');
  const chatBadge = document.getElementById('chat-badge');
  const chatOnlineCount = document.getElementById('chat-online-count');
  const reactionChips = document.querySelectorAll('.reaction-chip');

  // Visualizer 3D Mode Buttons
  const visButtons = document.querySelectorAll('.vis-btn-mini');
  const visualizerCanvas = document.getElementById('visualizer-canvas');

  // Modals
  const modalArm = document.getElementById('modal-arm');
  const btnArmAudio = document.getElementById('btn-arm-audio');
  const modalQr = document.getElementById('modal-qr');
  const btnCloseQr = document.getElementById('btn-close-qr');
  const qrImage = document.getElementById('qr-image');
  const qrRoomCode = document.getElementById('qr-room-code');
  const btnCopyLink = document.getElementById('btn-copy-link');

  // Core Engines
  let ws = null;
  let syncEngine = null;
  let audioEngine = new AudioEngine();
  let calibrator = new LatencyCalibrator(audioEngine);
  let visualizer3d = null;
  let atmosphereEngine = null;

  let currentRoomId = null;
  let myRole = 'host';
  let myPeerId = null;
  let myDeviceName = localStorage.getItem('syncpulse_device_name') || detectDeviceName();
  let currentTrack = null;
  let tracks = [];
  let currentSpatialMode = 'normal';
  let pendingPlaybackState = null;
  let unreadChatCount = 0;
  let activeTabName = 'studio';

  // YouTube Player State
  let ytPlayer = null;
  let isYtReady = false;

  init();

  async function init() {
    if (myDeviceLabel) myDeviceLabel.textContent = myDeviceName;
    if (deviceNameInput) deviceNameInput.value = myDeviceName;
    if (inputJoinDeviceName) inputJoinDeviceName.value = myDeviceName;

    setupAtmosphere();
    setupTabNavigation();
    setupModals();
    setupControls();
    setupYouTubeDesk();
    setupLiveChat();
    
    // Parse URL room code
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');

    if (roomParam) {
      currentRoomId = roomParam.toUpperCase();
      myRole = 'guest';
      if (joinModalTitle) joinModalTitle.textContent = `Join Audio Room ${currentRoomId}`;
      if (joinModalDesc) joinModalDesc.textContent = 'Enter your device name and tap below to activate synchronized spatial sound on this device.';
      if (btnArmAudio) btnArmAudio.textContent = '⚡ Tap to Join & Sync Audio';
    } else {
      currentRoomId = generateRoomCode();
      myRole = 'host';
      if (joinModalTitle) joinModalTitle.textContent = 'Host Spatial Audio Room';
      if (joinModalDesc) joinModalDesc.textContent = 'Name your master device and tap below to start high-precision spatial synchronization.';
      if (btnArmAudio) btnArmAudio.textContent = '⚡ Start Master Audio Sync';
    }

    roomCodeText.textContent = currentRoomId;
    updateRoleUi();

    connectWebSocket();
    await fetchServerInfo();

    // Setup 3D visualizer
    if (visualizerCanvas && window.THREE) {
      visualizer3d = new Visualizer3D(visualizerCanvas, audioEngine);
      visualizer3d.start();

      visButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          visButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const mode = btn.dataset.visMode;
          visualizer3d.setMode(mode);
          showToast(`🔮 3D Visualizer: ${mode.toUpperCase()}`);
        });
      });
    }

    // Show initial join modal to unlock audio context on mobile & confirm device name
    modalArm.classList.add('active');
  }

  function updateRoleUi() {
    if (myRole === 'guest') {
      if (guestLockNotice) guestLockNotice.style.display = 'flex';
      if (btnPlay) btnPlay.classList.add('guest-disabled-control');
      if (btnStop) btnStop.classList.add('guest-disabled-control');
      if (btnPrevTrack) btnPrevTrack.classList.add('guest-disabled-control');
      if (btnNextTrack) btnNextTrack.classList.add('guest-disabled-control');
      if (progressBar) progressBar.classList.add('guest-disabled-control');
    } else {
      if (guestLockNotice) guestLockNotice.style.display = 'none';
      if (btnPlay) btnPlay.classList.remove('guest-disabled-control');
      if (btnStop) btnStop.classList.remove('guest-disabled-control');
      if (btnPrevTrack) btnPrevTrack.classList.remove('guest-disabled-control');
      if (btnNextTrack) btnNextTrack.classList.remove('guest-disabled-control');
      if (progressBar) progressBar.classList.remove('guest-disabled-control');
    }
  }

  function setupAtmosphere() {
    if (atmosphereUnderlay || atmosphereOverlay) {
      atmosphereEngine = new AtmosphereEngine(atmosphereUnderlay, atmosphereOverlay, audioEngine);
      atmosphereEngine.start();

      atmoButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const theme = btn.dataset.theme;
          setAtmosphereTheme(theme, true);
        });
      });
    }
  }

  function setAtmosphereTheme(theme, showNotice = false) {
    if (!atmosphereEngine) return;
    atmosphereEngine.setTheme(theme);
    atmoButtons.forEach(b => {
      if (b.dataset.theme === theme) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    if (showNotice) {
      showToast(`✨ Atmosphere: ${theme.toUpperCase()} MODE`);
    }
  }

  function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function setupTabNavigation() {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        activeTabName = targetTab;
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const activePanel = document.getElementById(`panel-${targetTab}`);
        if (activePanel) activePanel.classList.add('active');

        if (targetTab === 'chat') {
          unreadChatCount = 0;
          if (chatBadge) chatBadge.style.display = 'none';
          if (chatMessagesContainer) {
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
          }
        }
      });
    });
  }

  function setupLiveChat() {
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatTextInput.value.trim();
        if (!text) return;
        sendChatMessage(text);
        chatTextInput.value = '';
      });
    }

    reactionChips.forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.dataset.emoji;
        sendChatMessage(emoji, emoji);
      });
    });
  }

  function sendChatMessage(text, reaction = null) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      type: 'chat_message',
      text,
      reaction,
      deviceName: myDeviceName
    }));
  }

  function setupModals() {
    // Initial Audio Arm & Device Setup
    btnArmAudio.addEventListener('click', async () => {
      const enteredName = deviceNameInput.value.trim();
      if (enteredName) {
        myDeviceName = enteredName;
        localStorage.setItem('syncpulse_device_name', myDeviceName);
        if (myDeviceLabel) myDeviceLabel.textContent = myDeviceName;
      }

      await audioEngine.init();
      modalArm.classList.remove('active');
      showToast(`⚡ Audio Activated as "${myDeviceName}"!`);

      // Update name over WebSocket
      sendJoinRoomMessage();

      // If there's an ongoing track or pending playback from host, play immediately!
      if (currentTrack) {
        if (currentTrack.type === 'youtube') {
          if (pendingPlaybackState && pendingPlaybackState.isPlaying) {
            handleYouTubePlayCue(currentTrack.youtubeVideoId, pendingPlaybackState.position);
          }
        } else {
          await audioEngine.loadTrack(currentTrack.url);
          if (pendingPlaybackState && pendingPlaybackState.isPlaying) {
            audioEngine.schedulePlayback(
              pendingPlaybackState.targetMasterTime,
              syncEngine ? syncEngine.now() : performance.now(),
              pendingPlaybackState.position
            );
            setPlayButtonState(true);
          }
        }
      }
    });

    // Direct Join Room Modal Trigger
    if (btnOpenJoinModal) {
      btnOpenJoinModal.addEventListener('click', () => {
        inputRoomPin.value = '';
        if (inputJoinDeviceName) inputJoinDeviceName.value = myDeviceName;
        modalJoinPicker.classList.add('active');
        inputRoomPin.focus();
      });
    }

    if (btnSubmitJoinRoom) {
      btnSubmitJoinRoom.addEventListener('click', () => {
        const pin = inputRoomPin.value.trim().toUpperCase();
        if (!pin || pin.length < 3) {
          showToast('⚠️ Please enter a valid room PIN');
          return;
        }
        const devName = inputJoinDeviceName.value.trim() || myDeviceName;
        myDeviceName = devName;
        localStorage.setItem('syncpulse_device_name', myDeviceName);
        window.location.href = `${window.location.pathname}?room=${pin}`;
      });
    }

    if (btnCancelJoinRoom) {
      btnCancelJoinRoom.addEventListener('click', () => {
        modalJoinPicker.classList.remove('active');
      });
    }

    // Rename Device Modal
    if (btnEditDevice) {
      btnEditDevice.addEventListener('click', () => {
        editNameInput.value = myDeviceName;
        modalEditName.classList.add('active');
        editNameInput.focus();
      });
    }

    if (btnSaveDeviceName) {
      btnSaveDeviceName.addEventListener('click', () => {
        const val = editNameInput.value.trim();
        if (val) {
          myDeviceName = val;
          localStorage.setItem('syncpulse_device_name', myDeviceName);
          if (myDeviceLabel) myDeviceLabel.textContent = myDeviceName;
          sendTelemetry();
          showToast(`📱 Device name changed to: ${myDeviceName}`);
        }
        modalEditName.classList.remove('active');
      });
    }

    if (btnCancelDeviceName) {
      btnCancelDeviceName.addEventListener('click', () => {
        modalEditName.classList.remove('active');
      });
    }

    // QR Code Share Modal
    btnShareQr.addEventListener('click', async () => {
      const roomUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
      qrRoomCode.textContent = currentRoomId;
      try {
        const res = await fetch(`/api/qr?url=${encodeURIComponent(roomUrl)}`);
        const data = await res.json();
        qrImage.src = data.dataUrl;
        modalQr.classList.add('active');
      } catch (err) {
        showToast('Error generating QR code');
      }
    });

    if (btnCloseQr) {
      btnCloseQr.addEventListener('click', () => modalQr.classList.remove('active'));
    }

    btnCopyLink.addEventListener('click', () => {
      const roomUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
      navigator.clipboard.writeText(roomUrl);
      showToast('📋 Room link copied to clipboard!');
    });
  }

  async function fetchServerInfo() {
    try {
      const res = await fetch('/api/server-info');
      const data = await res.json();
      tracks = data.tracks || [];
      if (tracks.length > 0 && !currentTrack) {
        currentTrack = tracks[0];
        updateTrackUi(currentTrack);
        // Preload first track into cache
        if (currentTrack.url) {
          audioEngine.loadTrack(currentTrack.url).catch(() => {});
        }
      }
      renderTrackShelf();
    } catch (e) {
      console.warn('Server info fetch:', e);
    }
  }

  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      syncBadge.className = 'status-pill syncing';
      syncText.textContent = 'Syncing...';

      syncEngine = new SyncEngine(ws);
      audioEngine.setSyncEngine(syncEngine);

      syncEngine.onSyncUpdate((stats) => {
        if (stats.isSynchronized) {
          syncBadge.className = 'status-pill';
          syncText.textContent = `Sync ±${Math.round(stats.jitter * 10) / 10}ms`;
          rttDisplay.textContent = `RTT: ${Math.round(stats.rtt)}ms`;
        }
        sendTelemetry();
      });
      syncEngine.start();

      sendJoinRoomMessage();
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        handleServerMessage(msg);
      } catch (err) {
        console.error('WS Parse Error:', err);
      }
    };

    ws.onclose = () => {
      syncBadge.className = 'status-pill disconnected';
      syncText.textContent = 'Offline';
      if (syncEngine) syncEngine.stop();
      setTimeout(connectWebSocket, 3000);
    };
  }

  function sendJoinRoomMessage() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      type: 'join_room',
      roomId: currentRoomId,
      role: myRole,
      deviceName: myDeviceName,
      channel: audioEngine.channelMode,
      userAgent: navigator.userAgent
    }));
  }

  function handleServerMessage(msg) {
    switch (msg.type) {
      case 'ntp_pong':
        if (syncEngine) syncEngine.handlePong(msg);
        break;

      case 'room_joined':
        myPeerId = msg.peerId;
        myRole = msg.role;
        updateRoleUi();

        if (msg.spatialMode) {
          setSpatialModeUi(msg.spatialMode);
        }
        if (msg.currentTrack) {
          currentTrack = msg.currentTrack;
          updateTrackUi(currentTrack);
          if (currentTrack.url) {
            audioEngine.loadTrack(currentTrack.url).catch(() => {});
          }
        }
        if (msg.playbackState) {
          pendingPlaybackState = msg.playbackState;
          if (msg.playbackState.isPlaying) {
            if (audioEngine.ctx) {
              if (msg.playbackState.sourceType === 'youtube') {
                handleYouTubePlayCue(msg.playbackState.youtubeVideoId, msg.playbackState.position);
              } else if (currentTrack && currentTrack.type === 'audio') {
                audioEngine.loadTrack(currentTrack.url).then(() => {
                  audioEngine.schedulePlayback(
                    msg.playbackState.targetMasterTime,
                    syncEngine ? syncEngine.now() : performance.now(),
                    msg.playbackState.position
                  );
                  setPlayButtonState(true);
                });
              }
            }
          }
        }
        break;

      case 'play_cue':
        currentTrack = msg.track;
        updateTrackUi(currentTrack);
        pendingPlaybackState = {
          isPlaying: true,
          position: msg.position,
          targetMasterTime: msg.targetMasterTime,
          sourceType: msg.sourceType
        };

        if (msg.sourceType === 'youtube') {
          handleYouTubePlayCue(msg.youtubeVideoId, msg.position);
        } else if (audioEngine.ctx) {
          audioEngine.loadTrack(currentTrack.url).then(() => {
            audioEngine.schedulePlayback(
              msg.targetMasterTime,
              syncEngine ? syncEngine.now() : performance.now(),
              msg.position
            );
            setPlayButtonState(true);
          });
        }
        break;

      case 'pause_cue':
        pendingPlaybackState = { isPlaying: false, position: msg.position };
        if (msg.sourceType === 'youtube') {
          if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
        } else {
          audioEngine.stop();
        }
        setPlayButtonState(false);
        break;

      case 'seek_cue':
        if (msg.sourceType === 'youtube') {
          if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(msg.position, true);
        } else if (audioEngine.ctx && msg.isPlaying) {
          audioEngine.schedulePlayback(
            msg.targetMasterTime,
            syncEngine ? syncEngine.now() : performance.now(),
            msg.position
          );
        } else {
          audioEngine.playStartPosition = msg.position;
        }
        break;

      case 'track_changed':
        currentTrack = msg.track || currentTrack;
        if (!currentTrack) break;
        updateTrackUi(currentTrack);
        audioEngine.stop();
        setPlayButtonState(false);
        if ((currentTrack.type || '') === 'youtube') {
          handleYouTubeTrackChange(currentTrack.youtubeVideoId, msg.autoplay);
        } else if (currentTrack.url && audioEngine.ctx) {
          audioEngine.loadTrack(currentTrack.url).then(() => {
            if (msg.autoplay) {
              audioEngine.schedulePlayback(msg.targetMasterTime, syncEngine ? syncEngine.now() : performance.now(), 0);
              setPlayButtonState(true);
            }
          }).catch(err => console.warn('Track load error:', err));
        }
        renderTrackShelf();
        break;


      case 'spatial_mode_changed':
        setSpatialModeUi(msg.spatialMode);
        showToast(`🎧 Spatial Mode: ${msg.spatialMode.toUpperCase()}`);
        break;

      case 'test_channel_cue':
        if (audioEngine.ctx) {
          audioEngine.playChannelTestBeep(msg.targetChannel);
        }
        break;

      case 'peer_list_update':
        renderFleetMatrix(msg.peers);
        if (chatOnlineCount) {
          chatOnlineCount.textContent = `${msg.peers.length} ${msg.peers.length === 1 ? 'Device' : 'Devices'}`;
        }
        break;

      case 'channel_assigned':
        audioEngine.setChannelMode(msg.channel);
        showToast(`🎚 Surround Channel Assigned: ${msg.channel.toUpperCase()}`);
        break;

      case 'chat_message':
        renderIncomingChatMessage(msg);
        spawnRisingScreenReaction(msg);
        break;

      case 'kicked':
        showToast('⛔ You have been removed from this room by the host.');
        setTimeout(() => {
          window.location.href = window.location.pathname;
        }, 2000);
        break;

      case 'apply_calibration':
        // Host broadcast calibration offset to all guests
        if (calibrator) {
          calibrator.setOffset(msg.offsetMs);
          showToast(`⚡ Host applied auto-calibration: ${msg.offsetMs > 0 ? '+' : ''}${Math.round(msg.offsetMs)} ms`);
        }
        break;
    }
  }

  function spawnRisingScreenReaction(msg) {
    if (!floatingReactionsLayer) return;

    const item = document.createElement('div');
    const isEmoji = !!msg.reaction;
    item.className = `floating-screen-reaction-item ${isEmoji ? 'is-emoji' : ''}`;

    if (isEmoji) {
      item.innerHTML = `<span>${msg.text}</span> <span class="floating-reaction-sender">${msg.deviceName}</span>`;
    } else {
      const escaped = msg.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      item.innerHTML = `<span class="floating-reaction-sender">${msg.deviceName}:</span> <span>${escaped}</span>`;
    }

    floatingReactionsLayer.appendChild(item);
    setTimeout(() => {
      item.remove();
    }, 4100);
  }

  function renderIncomingChatMessage(msg) {
    if (!chatMessagesContainer) return;

    const isMe = msg.peerId === myPeerId;
    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const row = document.createElement('div');
    row.className = `chat-msg-row ${isMe ? 'my-msg' : 'peer-msg'}`;

    const roleClass = msg.role === 'host' ? 'host' : 'guest';
    const roleText = msg.role === 'host' ? 'Host' : 'Node';

    let contentHtml = '';
    if (msg.reaction) {
      contentHtml = `<span class="chat-reaction-display">${msg.text}</span>`;
    } else {
      const escaped = msg.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      contentHtml = escaped;
    }

    row.innerHTML = `
      <div class="chat-msg-meta">
        <span class="chat-role-badge ${roleClass}">${roleText}</span>
        <strong>${msg.deviceName}</strong>
        <span>• ${timeStr}</span>
      </div>
      <div class="chat-bubble">
        ${contentHtml}
      </div>
    `;

    chatMessagesContainer.appendChild(row);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

    if (activeTabName !== 'chat') {
      unreadChatCount++;
      if (chatBadge) {
        chatBadge.textContent = unreadChatCount;
        chatBadge.style.display = 'inline-block';
      }
    }
  }

  function sendTelemetry() {
    if (!ws || ws.readyState !== WebSocket.OPEN || !syncEngine) return;
    ws.send(JSON.stringify({
      type: 'telemetry_update',
      deviceName: myDeviceName,
      rtt: syncEngine.roundTripTime,
      jitter: syncEngine.jitter,
      offset: syncEngine.clockOffset,
      hardwareDelay: audioEngine.hardwareLatencyOffsetMs,
      channel: audioEngine.channelMode
    }));
  }

  function setupControls() {
    btnPlay.addEventListener('click', async () => {
      if (myRole === 'guest') {
        showToast('🔒 Only Host can trigger playback');
        return;
      }

      await audioEngine.init();
      if (!currentTrack) return;

      if (currentTrack.type === 'youtube') {
        const isYtPlaying = ytPlayer && ytPlayer.getPlayerState && ytPlayer.getPlayerState() === 1;
        if (isYtPlaying) {
          ws.send(JSON.stringify({
            type: 'pause_cue',
            position: ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0,
            sourceType: 'youtube'
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'play_cue',
            sourceType: 'youtube',
            youtubeVideoId: currentTrack.youtubeVideoId,
            position: ytPlayer && ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0,
            leadTime: 800
          }));
        }
        return;
      }

      if (audioEngine.isPlaying) {
        const pos = audioEngine.getCurrentPlaybackPosition();
        ws.send(JSON.stringify({
          type: 'pause_cue',
          position: pos,
          sourceType: 'audio'
        }));
      } else {
        await audioEngine.loadTrack(currentTrack.url);
        const pos = audioEngine.playStartPosition || 0;
        ws.send(JSON.stringify({
          type: 'play_cue',
          trackId: currentTrack.id,
          position: pos,
          sourceType: 'audio',
          leadTime: 800
        }));
      }
    });

    btnStop.addEventListener('click', () => {
      if (myRole === 'guest') {
        showToast('🔒 Only Host can control playback');
        return;
      }

      if (currentTrack && currentTrack.type === 'youtube') {
        if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
      } else {
        audioEngine.stop();
        audioEngine.playStartPosition = 0;
      }
      ws.send(JSON.stringify({
        type: 'pause_cue',
        position: 0,
        sourceType: currentTrack ? currentTrack.type : 'audio'
      }));
      setPlayButtonState(false);
    });

    progressBar.addEventListener('click', (e) => {
      if (myRole === 'guest') {
        showToast('🔒 Playback position is controlled by Host');
        return;
      }
      if (!currentTrack) return;
      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const frac = Math.max(0, Math.min(1, clickX / rect.width));

      if (currentTrack.type === 'youtube') {
        const dur = ytPlayer && ytPlayer.getDuration ? ytPlayer.getDuration() : 100;
        const targetPos = frac * dur;
        ws.send(JSON.stringify({
          type: 'seek_cue',
          position: targetPos,
          sourceType: 'youtube',
          leadTime: 600
        }));
      } else if (audioEngine.currentBuffer) {
        const targetPos = frac * audioEngine.currentBuffer.duration;
        ws.send(JSON.stringify({
          type: 'seek_cue',
          position: targetPos,
          sourceType: 'audio',
          leadTime: 600
        }));
      }
    });

    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        setSpatialModeUi(mode);
        if (myRole === 'host') {
          ws.send(JSON.stringify({
            type: 'set_spatial_mode',
            spatialMode: mode
          }));
        }
      });
    });

    if (btnPrevTrack) {
      btnPrevTrack.addEventListener('click', () => {
        if (myRole === 'guest') {
          showToast('🔒 Only Host can change tracks');
          return;
        }
        if (tracks.length <= 1) return;
        let idx = tracks.findIndex(t => t.id === (currentTrack && currentTrack.id));
        idx = idx <= 0 ? tracks.length - 1 : idx - 1;
        const prevTrack = tracks[idx];
        currentTrack = prevTrack;
        renderTrackShelf();
        updateTrackUi(currentTrack);
        if (currentTrack.type === 'youtube') {
          handleYouTubeTrackChange(currentTrack.youtubeVideoId, true);
        } else {
          audioEngine.loadTrack(currentTrack.url);
        }
        ws.send(JSON.stringify({
          type: 'change_track',
          track: currentTrack,
          autoplay: true
        }));
      });
    }

    if (btnNextTrack) {
      btnNextTrack.addEventListener('click', () => {
        if (myRole === 'guest') {
          showToast('🔒 Only Host can change tracks');
          return;
        }
        if (tracks.length <= 1) return;
        let idx = tracks.findIndex(t => t.id === (currentTrack && currentTrack.id));
        idx = (idx + 1) % tracks.length;
        const nextTrack = tracks[idx];
        currentTrack = nextTrack;
        renderTrackShelf();
        updateTrackUi(currentTrack);
        if (currentTrack.type === 'youtube') {
          handleYouTubeTrackChange(currentTrack.youtubeVideoId, true);
        } else {
          audioEngine.loadTrack(currentTrack.url);
        }
        ws.send(JSON.stringify({
          type: 'change_track',
          track: currentTrack,
          autoplay: true
        }));
      });
    }

    let isLooping = false;
    if (btnLoopToggle) {
      btnLoopToggle.addEventListener('click', () => {
        isLooping = !isLooping;
        btnLoopToggle.classList.toggle('active', isLooping);
        showToast(isLooping ? '🔁 Repeat Track Enabled' : '➡️ Repeat Track Disabled');
      });
    }

    let isMuted = false;
    let preMuteVolume = 0.85;
    if (btnMuteToggle) {
      btnMuteToggle.addEventListener('click', () => {
        if (!isMuted) {
          preMuteVolume = parseFloat(volumeSlider.value) || 0.85;
          volumeSlider.value = 0;
          audioEngine.setVolume(0);
          if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(0);
          if (volPercent) volPercent.textContent = '0%';
          isMuted = true;
          showToast('🔇 Audio Muted');
        } else {
          volumeSlider.value = preMuteVolume;
          audioEngine.setVolume(preMuteVolume);
          if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(preMuteVolume * 100);
          if (volPercent) volPercent.textContent = `${Math.round(preMuteVolume * 100)}%`;
          isMuted = false;
          showToast('🔊 Audio Unmuted');
        }
      });
    }

    volumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      audioEngine.setVolume(val);
      if (ytPlayer && ytPlayer.setVolume) {
        ytPlayer.setVolume(val * 100);
      }
      if (volPercent) {
        volPercent.textContent = `${Math.round(val * 100)}%`;
      }
      isMuted = val === 0;
    });

    btnUploadTrigger.addEventListener('click', () => fileUploadInput.click());

    fileUploadInput.addEventListener('change', async (e) => {
      if (myRole === 'guest') {
        showToast('🔒 Only Host can upload tracks');
        return;
      }

      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('audio', file);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
      formData.append('artist', 'Offline File Sync');

      showToast('⏳ Uploading local file for multi-device sync...');
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          tracks.unshift(data.track);
          currentTrack = data.track;
          renderTrackShelf();
          updateTrackUi(currentTrack);
          await audioEngine.loadTrack(currentTrack.url);
          ws.send(JSON.stringify({
            type: 'change_track',
            track: currentTrack,
            autoplay: true
          }));
          showToast('🎵 Track loaded & synchronized across all phones!');
        }
      } catch (err) {
        showToast('Error loading local audio file');
      }
    });

    setupCalibrator();
    requestAnimationFrame(updatePlaybackProgress);
  }

  function setSpatialModeUi(mode) {
    currentSpatialMode = mode;
    audioEngine.setSpatialMode(mode);
    modeButtons.forEach(b => {
      if (b.dataset.mode === mode) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }

  function setupYouTubeDesk() {
    // Mark API as ready when YouTube iframe API loads
    window.onYouTubeIframeAPIReady = () => {
      isYtReady = false; // will be true only after a player is created
      // If there's already a pending YouTube track from the room, init it
      if (currentTrack && currentTrack.type === 'youtube') {
        initYouTubePlayer(currentTrack.youtubeVideoId);
      }
    };

    btnYtSearch.addEventListener('click', (e) => {
      e.preventDefault();
      runYouTubeSearch();
    });

    ytSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        runYouTubeSearch();
      }
    });

    fetchYouTubeResults('barsaat darshan raval');
  }

  async function runYouTubeSearch() {
    const q = ytSearchInput.value.trim();
    if (!q) return;

    const match = q.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      const videoId = match[1];
      const autoplay = ytAutoplayCheckbox ? ytAutoplayCheckbox.checked : true;
      playCustomYouTubeVideo(videoId, 'YouTube Stream', autoplay);
      return;
    }

    fetchYouTubeResults(q);
  }

  async function fetchYouTubeResults(query) {
    ytResultsScroll.innerHTML = '<div style="font-size:0.75rem; color:var(--text-tertiary); text-align:center; padding:10px;">Searching YouTube...</div>';
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      renderYouTubeResults(data.results || []);
    } catch (e) {
      ytResultsScroll.innerHTML = '<div style="font-size:0.75rem; color:var(--neon-red); text-align:center;">Search failed</div>';
    }
  }

  function renderYouTubeResults(results) {
    ytResultsScroll.innerHTML = '';
    if (results.length === 0) {
      ytResultsScroll.innerHTML = '<div style="font-size:0.75rem; color:var(--text-tertiary); text-align:center; padding:10px;">No results found. Paste direct link above.</div>';
      return;
    }

    results.forEach(item => {
      const card = document.createElement('div');
      card.className = 'yt-result-card';
      card.innerHTML = `
        <img src="${item.thumbnail}" class="yt-thumb" alt="Thumbnail">
        <div class="yt-meta">
          <div class="yt-video-title">${item.title}</div>
          <div class="yt-video-channel">${item.channel} • ${item.duration}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        if (myRole === 'guest') {
          showToast('🔒 Only Host can queue songs');
          return;
        }
        const autoplay = ytAutoplayCheckbox ? ytAutoplayCheckbox.checked : true;
        playCustomYouTubeVideo(item.id, item.title, autoplay);
      });
      ytResultsScroll.appendChild(card);
    });
  }

  function playCustomYouTubeVideo(videoId, title, autoplay) {
    const track = {
      id: `yt-${videoId}`,
      title: title || 'YouTube Video Audio',
      artist: 'YouTube Live Stream',
      type: 'youtube',
      youtubeVideoId: videoId,
      duration: 180
    };

    currentTrack = track;
    updateTrackUi(currentTrack);

    ws.send(JSON.stringify({
      type: 'change_track',
      track: currentTrack,
      autoplay: autoplay
    }));
    showToast(`▶ Queued YouTube: ${title}`);
  }

  function initYouTubePlayer(videoId, onReady) {
    if (!window.YT || !window.YT.Player) {
      // YT not loaded yet, retry
      setTimeout(() => initYouTubePlayer(videoId, onReady), 300);
      return;
    }
    // Destroy existing player
    if (ytPlayer && ytPlayer.destroy) {
      try { ytPlayer.destroy(); } catch (e) {}
      ytPlayer = null;
    }
    isYtReady = false;
    const container = document.getElementById('youtube-player-container');
    if (!container) return;
    container.innerHTML = '';
    ytPlayer = new YT.Player(container, {
      height: '0',
      width: '0',
      videoId: videoId,
      playerVars: {
        playsinline: 1,
        controls: 0,
        disablekb: 1,
        rel: 0,
        fs: 0,
        modestbranding: 1,
        origin: window.location.origin,
        enablejsapi: 1
      },
      events: {
        onReady: (e) => {
          isYtReady = true;
          if (onReady) onReady(e);
        },
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.PLAYING) {
            setPlayButtonState(true);
          } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            setPlayButtonState(false);
          }
        },
        onError: (e) => {
          console.warn('YouTube player error:', e.data);
          showToast('⚠️ YouTube video unavailable or region-blocked');
        }
      }
    });
  }

  function handleYouTubeTrackChange(videoId, autoplay) {
    if (!ytPlayer || !isYtReady) {
      initYouTubePlayer(videoId, () => {
        if (autoplay && ytPlayer && ytPlayer.playVideo) {
          ytPlayer.playVideo();
          setPlayButtonState(true);
        }
      });
    } else {
      if (autoplay) {
        ytPlayer.loadVideoById({ videoId });
        setPlayButtonState(true);
      } else {
        ytPlayer.cueVideoById({ videoId });
      }
    }
  }

  function handleYouTubePlayCue(videoId, startPos) {
    if (!ytPlayer || !isYtReady) {
      initYouTubePlayer(videoId, () => {
        if (ytPlayer && ytPlayer.playVideo) {
          if (startPos > 0) ytPlayer.seekTo(startPos, true);
          ytPlayer.playVideo();
          setPlayButtonState(true);
        }
      });
    } else {
      if (startPos > 0) ytPlayer.seekTo(startPos, true);
      ytPlayer.playVideo();
      setPlayButtonState(true);
    }
  }

  function setupCalibrator() {
    if (btnAutoCalibrate) {
      btnAutoCalibrate.addEventListener('click', async () => {
        await audioEngine.init();
        const delay = calibrator.autoCalibrate();
        showToast(`⚡ Auto-Calibrated Output Delay: +${delay} ms`);
        // If host, broadcast to all peers
        if (myRole === 'host' && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'broadcast_calibration',
            offsetMs: delay
          }));
          showToast(`📡 Calibration sent to all ${deviceCountBadge.textContent}`);
        }
      });
    }

    calibrator.onFlash((isFlash) => {
      if (isFlash) {
        calibratorMarker.classList.add('pulse-hit');
      } else {
        calibratorMarker.classList.remove('pulse-hit');
      }
    });

    calibrator.onOffsetChange((ms) => {
      offsetSlider.value = ms;
      offsetValDisplay.textContent = `${ms > 0 ? '+' : ''}${Math.round(ms)} ms`;
      sendTelemetry();
    });

    offsetSlider.addEventListener('input', (e) => {
      const ms = parseFloat(e.target.value);
      calibrator.setOffset(ms);
    });

    btnCalibratorToggle.addEventListener('click', async () => {
      await audioEngine.init();
      if (calibrator.isActive) {
        calibrator.stop();
        btnCalibratorToggle.textContent = '▶ Start Metronome Test';
        btnCalibratorToggle.classList.remove('btn-solid-primary');
        btnCalibratorToggle.classList.add('btn-glass-secondary');
      } else {
        calibrator.start();
        btnCalibratorToggle.textContent = '⏹ Stop Metronome Test';
        btnCalibratorToggle.classList.add('btn-solid-primary');
        btnCalibratorToggle.classList.remove('btn-glass-secondary');
      }
    });

    btnStepDown.addEventListener('click', () => calibrator.setOffset(calibrator.offsetMs - 5));
    btnStepUp.addEventListener('click', () => calibrator.setOffset(calibrator.offsetMs + 5));
    btnResetOffset.addEventListener('click', () => calibrator.setOffset(0));

    offsetSlider.value = calibrator.offsetMs;
    offsetValDisplay.textContent = `${calibrator.offsetMs > 0 ? '+' : ''}${Math.round(calibrator.offsetMs)} ms`;
  }

  function updatePlaybackProgress() {
    if (currentTrack && currentTrack.type === 'youtube' && ytPlayer && ytPlayer.getCurrentTime) {
      const pos = ytPlayer.getCurrentTime() || 0;
      const dur = ytPlayer.getDuration() || 1;
      const pct = (pos / dur) * 100;
      progressFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
      timeCurrent.textContent = formatTime(pos);
      timeTotal.textContent = formatTime(dur);
    } else if (audioEngine.isPlaying && audioEngine.currentBuffer) {
      const pos = audioEngine.getCurrentPlaybackPosition();
      const dur = audioEngine.currentBuffer.duration || 1;
      const pct = (pos / dur) * 100;
      progressFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
      timeCurrent.textContent = formatTime(pos);
      timeTotal.textContent = formatTime(dur);
    }

    if (vuBarLeft && vuBarRight) {
      const vu = audioEngine.getVuLevels();
      vuBarLeft.style.width = `${vu.left * 100}%`;
      vuBarRight.style.width = `${vu.right * 100}%`;
      if (vuDbReadout) {
        const peak = Math.max(vu.left, vu.right);
        if (peak > 0.01) {
          const db = Math.round(20 * Math.log10(peak));
          vuDbReadout.textContent = `${db >= 0 ? '+' : ''}${db} dB`;
        } else {
          vuDbReadout.textContent = '-∞ dB';
        }
      }
    }

    requestAnimationFrame(updatePlaybackProgress);
  }

  function updateTrackUi(track) {
    if (!track) return;
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    timeCurrent.textContent = '0:00';
    timeTotal.textContent = formatTime(track.duration || 0);

    if (atmosphereEngine) {
      const autoTheme = atmosphereEngine.detectThemeFromTitle(track.title);
      setAtmosphereTheme(autoTheme, false);
    }
  }

  function setPlayButtonState(playing) {
    if (playing) {
      btnPlay.classList.add('playing');
      if (playIcon) playIcon.style.display = 'none';
      if (pauseIcon) pauseIcon.style.display = '';
      if (vinylDisc) vinylDisc.classList.add('spinning');
    } else {
      btnPlay.classList.remove('playing');
      if (playIcon) playIcon.style.display = '';
      if (pauseIcon) pauseIcon.style.display = 'none';
      if (vinylDisc) vinylDisc.classList.remove('spinning');
    }
  }

  function renderTrackShelf() {
    trackListContainer.innerHTML = '';
    tracks.forEach(track => {
      const capsule = document.createElement('div');
      capsule.className = `track-capsule ${currentTrack && currentTrack.id === track.id ? 'active' : ''}`;
      capsule.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:8px; cursor:pointer;';
      capsule.innerHTML = `
        <div>
          <div style="font-weight:600; font-size:0.85rem; color:#fff;">${track.title}</div>
          <div style="font-size:0.72rem; color:var(--text-tertiary);">${track.artist}</div>
        </div>
        <span style="font-size:0.75rem; color:var(--text-tertiary); font-family:var(--font-mono);">${formatTime(track.duration || 0)}</span>
      `;
      capsule.addEventListener('click', async () => {
        if (myRole === 'guest') {
          showToast('🔒 Only Host can switch tracks');
          return;
        }
        currentTrack = track;
        renderTrackShelf();
        updateTrackUi(currentTrack);
        if (currentTrack.type === 'youtube') {
          handleYouTubeTrackChange(currentTrack.youtubeVideoId, true);
        } else {
          await audioEngine.loadTrack(currentTrack.url);
        }
        ws.send(JSON.stringify({
          type: 'change_track',
          track: currentTrack,
          autoplay: true
        }));
      });
      trackListContainer.appendChild(capsule);
    });
  }

  function renderFleetMatrix(peers) {
    fleetGrid.innerHTML = '';
    deviceCountBadge.textContent = `${peers.length} Online`;

    peers.forEach(peer => {
      const isMe = peer.id === myPeerId;
      const card = document.createElement('div');
      card.className = `node-card ${isMe ? 'self-node' : ''}`;
      card.style.cssText = 'background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:12px;';

      const pingStatusClass = peer.rtt < 30 ? 'color:var(--neon-emerald)' : (peer.rtt < 100 ? 'color:var(--neon-amber)' : 'color:var(--neon-red)');

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="node-avatar" style="width:32px; height:32px; border-radius:6px; background:rgba(0,242,254,0.1); border:1px solid var(--neon-cyan); display:flex; align-items:center; justify-content:center; color:var(--neon-cyan);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px;">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
            </div>
            <div>
              <div style="font-weight:700; font-size:0.88rem; color:#fff;">${peer.deviceName} ${isMe ? '<span style="color:var(--neon-cyan); font-size:0.7rem;">(You)</span>' : ''}</div>
              <div style="font-size:0.68rem; color:var(--text-tertiary);">${peer.role.toUpperCase()}</div>
            </div>
          </div>
          <span style="font-size:0.68rem; font-weight:700; padding:2px 8px; border-radius:999px; background:rgba(255,0,127,0.15); color:var(--neon-magenta); border:1px solid rgba(255,0,127,0.4);">${peer.channel.toUpperCase()}</span>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; padding:8px 10px; background:rgba(0,0,0,0.35); border-radius:6px;">
          <div style="display:flex; flex-direction:column;">
            <span style="font-size:0.62rem; color:var(--text-tertiary);">PING</span>
            <span style="font-family:var(--font-mono); font-size:0.82rem; font-weight:700; ${pingStatusClass};">${Math.round(peer.rtt)} ms</span>
          </div>
          <div style="display:flex; flex-direction:column;">
            <span style="font-size:0.62rem; color:var(--text-tertiary);">JITTER</span>
            <span style="font-family:var(--font-mono); font-size:0.82rem; font-weight:700; color:#fff;">${Math.round((peer.jitter || 0) * 10) / 10} ms</span>
          </div>
          <div style="display:flex; flex-direction:column;">
            <span style="font-size:0.62rem; color:var(--text-tertiary);">HW DELAY</span>
            <span style="font-family:var(--font-mono); font-size:0.82rem; font-weight:700; color:var(--neon-cyan);">${Math.round(peer.hardwareDelay || 0)} ms</span>
          </div>
        </div>

        ${myRole === 'host' && !isMe ? `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:2px; gap:6px;">
            <div style="display:flex; align-items:center; gap:6px; flex:1;">
              <span style="font-size:0.7rem; color:var(--text-tertiary); white-space:nowrap;">Dolby Ch:</span>
              <select class="remote-channel-select" data-peer-id="${peer.id}" style="background:#030509; border:1px solid var(--border-medium); color:#fff; border-radius:4px; font-size:0.75rem; padding:3px 6px; flex:1;">
                <option value="all" ${peer.channel === 'all' ? 'selected' : ''}>Full Stereo</option>
                <option value="left" ${peer.channel === 'left' ? 'selected' : ''}>Front Left</option>
                <option value="center" ${peer.channel === 'center' ? 'selected' : ''}>Center (Vocals)</option>
                <option value="right" ${peer.channel === 'right' ? 'selected' : ''}>Front Right</option>
                <option value="subwoofer" ${peer.channel === 'subwoofer' ? 'selected' : ''}>Subwoofer</option>
                <option value="rear-left" ${peer.channel === 'rear-left' ? 'selected' : ''}>Rear Left</option>
                <option value="rear-right" ${peer.channel === 'rear-right' ? 'selected' : ''}>Rear Right</option>
              </select>
            </div>
            <button class="btn-kick-peer" data-peer-id="${peer.id}" style="background:rgba(255,51,102,0.15); border:1px solid rgba(255,51,102,0.4); color:var(--neon-red); border-radius:5px; padding:3px 8px; font-size:0.7rem; cursor:pointer; white-space:nowrap;">⛔ Kick</button>
          </div>
        ` : ''}
      `;


      fleetGrid.appendChild(card);
    });

    document.querySelectorAll('.remote-channel-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const targetPeerId = e.target.dataset.peerId;
        const newChannel = e.target.value;
        ws.send(JSON.stringify({
          type: 'set_peer_channel',
          targetPeerId,
          channel: newChannel
        }));
      });
    });

    document.querySelectorAll('.btn-kick-peer').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetPeerId = btn.dataset.peerId;
        if (confirm('Remove this device from the room?')) {
          ws.send(JSON.stringify({ type: 'kick_peer', targetPeerId }));
          showToast('⛔ Device removed from room');
        }
      });
    });
  }

  function detectDeviceName() {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return 'iPhone Spatial Node';
    if (/iPad/i.test(ua)) return 'iPad Audio Console';
    if (/Android/i.test(ua)) return 'Android Audio Node';
    if (/Macintosh/i.test(ua)) return 'MacBook Master Desk';
    if (/Windows/i.test(ua)) return 'Windows Master Host';
    return 'Spatial Audio Node';
  }

  function formatTime(sec) {
    if (isNaN(sec) || sec <= 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function showToast(msg) {
    const container = document.getElementById('toast-rack') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function createToastContainer() {
    const c = document.createElement('div');
    c.id = 'toast-rack';
    c.className = 'toast-rack';
    document.body.appendChild(c);
    return c;
  }
});
