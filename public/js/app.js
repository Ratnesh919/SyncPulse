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
  const btnThemeMenuToggle = document.getElementById('btn-theme-menu-toggle');
  const themeDropdownContainer = document.querySelector('.theme-dropdown-container');
  const themeDropdownMenu = document.getElementById('theme-dropdown-menu');
  const currentThemeIcon = document.getElementById('current-theme-icon');
  const currentThemeName = document.getElementById('current-theme-name');
  const atmosphereUnderlay = document.getElementById('atmosphere-underlay');
  const atmosphereOverlay = document.getElementById('atmosphere-overlay');
  const floatingReactionsLayer = document.getElementById('screen-floating-reactions-layer');
  const trackMoodBadge = document.getElementById('track-mood-badge');


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

  // Fleet Matrix & Acoustic Fleet Elements
  const fleetGrid = document.getElementById('fleet-grid');
  const deviceCountBadge = document.getElementById('device-count-badge');
  const btnAutoDistributeFleet = document.getElementById('btn-auto-distribute-fleet');
  const btnFleetSoundCheck = document.getElementById('btn-fleet-sound-check');

  const CHANNEL_MAP = {
    'all': { name: 'Full Stereo Master', icon: '◀▶', color: 'var(--neon-cyan)', badge: 'rgba(0, 242, 254, 0.15)', desc: 'Master full-spectrum stereo' },
    'left': { name: 'Front Left', icon: '◀', color: 'var(--neon-cyan)', badge: 'rgba(0, 242, 254, 0.15)', desc: 'Left speaker with treble clarity' },
    'right': { name: 'Front Right', icon: '▶', color: 'var(--neon-cyan)', badge: 'rgba(0, 242, 254, 0.15)', desc: 'Right speaker with treble clarity' },
    'center': { name: 'Center (Vocals)', icon: '🎤', color: '#ffcc00', badge: 'rgba(255, 204, 0, 0.15)', desc: 'Vocal bandpass (280Hz-4.2kHz)' },
    'subwoofer': { name: 'Subwoofer (Haptics)', icon: '🔊', color: '#ff0055', badge: 'rgba(255, 0, 85, 0.15)', desc: '<90Hz Bass + phone vibration' },
    'rear-left': { name: 'Rear Left Surround', icon: '🌌', color: 'var(--neon-magenta)', badge: 'rgba(255, 0, 127, 0.15)', desc: '22ms Haas delay ambient' },
    'rear-right': { name: 'Rear Right Surround', icon: '🌌', color: 'var(--neon-magenta)', badge: 'rgba(255, 0, 127, 0.15)', desc: '28ms Haas delay ambient' },
    'height': { name: 'Overhead Atmos', icon: '☁️', color: '#00e5ff', badge: 'rgba(0, 229, 255, 0.15)', desc: '>5.5kHz highpass air shimmer' },
    'fx-reverb': { name: 'Reverb Chamber', icon: '🏛️', color: '#b388ff', badge: 'rgba(179, 136, 255, 0.15)', desc: '100% wet space reflection' },
    'traveling-orbit': { name: '360° Traveling Wave', icon: '🔄', color: '#00ffaa', badge: 'rgba(0, 255, 170, 0.15)', desc: 'Swelling wave rotating around room' }
  };

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

  // Modals

  const modalArm = document.getElementById('modal-arm');
  const btnArmAudio = document.getElementById('btn-arm-audio');
  const modalQr = document.getElementById('modal-qr');
  const btnCloseQr = document.getElementById('btn-close-qr');
  const qrImage = document.getElementById('qr-image');
  const qrRoomCode = document.getElementById('qr-room-code');
  const btnCopyLink = document.getElementById('btn-copy-link');

  // Host DJ Walkie-Talkie Mic & Banner Elements
  const btnDjMic = document.getElementById('btn-dj-mic');
  const djBroadcastBanner = document.getElementById('dj-broadcast-banner');
  const djBannerText = document.getElementById('dj-banner-text');

  // Equalizer & Acoustic FX Presets Elements
  const toggleEq = document.getElementById('toggle-eq');
  const eqPresetButtons = document.querySelectorAll('.eq-preset-btn');
  const eqRackBox = document.querySelector('.eq-rack-box');
  const btnToggleEqSliders = document.getElementById('btn-toggle-eq-sliders');
  const eqSlidersDrawer = document.getElementById('eq-sliders-drawer');
  const eqBandSliders = document.querySelectorAll('.eq-band-slider');

  // 360° Spatial Radar Elements
  const btnToggleRadar = document.getElementById('btn-toggle-radar');
  const spatialRadarBox = document.getElementById('spatial-radar-box');
  const radarInteractiveSurface = document.getElementById('radar-interactive-surface');
  const radarSoundNode = document.getElementById('radar-sound-node');
  const radarAzimuthVal = document.getElementById('radar-azimuth-val');
  const radarElevationVal = document.getElementById('radar-elevation-val');
  const radarDistanceVal = document.getElementById('radar-distance-val');

  // Continuous Auto-Sync Elements
  const autoSyncStatusBadge = document.getElementById('auto-sync-status-badge');
  const autoSyncBadgeText = document.getElementById('auto-sync-badge-text');
  const autoSyncLivePill = document.getElementById('auto-sync-live-pill');
  const autoSyncDetailText = document.getElementById('auto-sync-detail-text');
  const toggleAutoSync = document.getElementById('toggle-auto-sync');
  const btnForceAutoSync = document.getElementById('btn-force-auto-sync');

  // Collaborative Jukebox Queue Elements
  const queueBadge = document.getElementById('queue-badge');
  const queueCountDisplay = document.getElementById('queue-count-display');
  const jukeboxQueueList = document.getElementById('jukebox-queue-list');
  const btnJukeboxPlayNext = document.getElementById('btn-jukebox-play-next');
  const jukeboxSearchInput = document.getElementById('jukebox-search-input');
  const btnJukeboxSearch = document.getElementById('btn-jukebox-search');
  const jukeboxSearchResults = document.getElementById('jukebox-search-results');

  // Up Next In Queue Live Preview Elements
  const upNextBanner = document.getElementById('up-next-banner');
  const upNextThumb = document.getElementById('up-next-thumb');
  const upNextTitle = document.getElementById('up-next-title');
  const upNextSubtitle = document.getElementById('up-next-subtitle');
  const upNextVotesBadge = document.getElementById('up-next-votes-badge');
  // Dashboard Upcoming Queue Card Elements
  const dashboardQueueScroll = document.getElementById('dashboard-queue-scroll');
  const dashboardQueueCount = document.getElementById('dashboard-queue-count');
  const btnDashboardQueueClear = document.getElementById('btn-dashboard-queue-clear');

  // Auto-DJ Crossfade Elements
  const crossfadeButtons = document.querySelectorAll('.crossfade-btn');



  // 24/7 Live Radio Stations Elements
  const radioCards = document.querySelectorAll('.radio-card');

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

  // Collaborative Jukebox & Auto-DJ Crossfade State
  let currentQueue = [];
  let crossfadeDuration = 4; // seconds (0 = off)
  let isCrossfading = false;

  // Smart Auto-Play & History Tracking (Prevents duplicate song replays)
  let sessionPlayedHistory = new Set();
  let isAutoPlayActive = true; // Auto-play enabled by default
  let isFetchingAutoRecommendation = false;

  // YouTube Player State
  let ytPlayer = null;
  let isYtReady = false;

  // Live Host DJ Walkie-Talkie Audio State
  let djMediaRecorder = null;
  let djMediaStream = null;
  let isDjTalking = false;

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
    setupDjMic();
    setupEqualizerControls();
    setupCrossfadeControls();
    setupRadioStations();
    setupJukeboxQueue();
    setupAutoPlayControls();

    if (audioEngine) {
      audioEngine.onTrackEnded = () => {
        setPlayButtonState(false);
        isCrossfading = false;
        if (myRole === 'host') {
          if (currentQueue && currentQueue.length > 0) {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'queue_pop_next',
                crossfadeSec: crossfadeDuration,
                isAutoTransition: true
              }));
            }
          } else if (isAutoPlayActive) {
            playSmartAutoRecommendedTrack(currentTrack);
          }
        }
      };
    }

    
    // Parse URL room code
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');

    if (roomParam) {
      currentRoomId = roomParam.toUpperCase().trim();
      myRole = 'guest';
      if (joinModalTitle) joinModalTitle.textContent = `Join Audio Room ${currentRoomId}`;
      if (joinModalDesc) joinModalDesc.textContent = `Syncing with room ${currentRoomId}. Tap below to activate synchronized spatial sound on this device.`;
      if (btnArmAudio) btnArmAudio.textContent = '⚡ Tap to Join & Sync Audio';
    } else {
      currentRoomId = generateRoomCode();
      myRole = 'host';
      if (joinModalTitle) joinModalTitle.textContent = 'Host Spatial Audio Room';
      if (joinModalDesc) joinModalDesc.textContent = 'Name your master device and tap below to start high-precision spatial synchronization.';
      if (btnArmAudio) btnArmAudio.textContent = '⚡ Start Master Audio Sync';
    }

    if (roomCodeText) roomCodeText.textContent = currentRoomId;
    const armRoomBadge = document.getElementById('arm-room-code-badge');
    if (armRoomBadge) armRoomBadge.textContent = currentRoomId;
    if (qrRoomCode) qrRoomCode.textContent = currentRoomId;
    updateRoleUi();

    connectWebSocket();
    await fetchServerInfo();

    // Show initial join modal to unlock audio context on mobile & confirm device name
    if (modalArm) modalArm.classList.add('active');

  }

  let hostSyncHeartbeatTimer = null;

  function broadcastHostSyncTick() {
    if (myRole !== 'host' || !ws || ws.readyState !== WebSocket.OPEN || !currentTrack) {
      return;
    }

    let isPlaying = false;
    let pos = 0;

    if (currentTrack.type === 'youtube') {
      if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
        const state = ytPlayer.getPlayerState();
        isPlaying = (state === 1); // 1 = PLAYING
        pos = (typeof ytPlayer.getCurrentTime === 'function') ? (ytPlayer.getCurrentTime() || 0) : 0;
      }
    } else {
      isPlaying = audioEngine.isPlaying;
      pos = audioEngine.getCurrentPlaybackPosition();
    }

    if (isPlaying) {
      const masterTime = syncEngine ? syncEngine.now() : performance.now();
      ws.send(JSON.stringify({
        type: 'host_playback_sync',
        position: pos,
        masterTime: masterTime,
        isPlaying: true,
        sourceType: currentTrack.type || 'youtube',
        youtubeVideoId: currentTrack.youtubeVideoId || null,
        trackId: currentTrack.id || null
      }));
    }
  }

  function startHostSyncBroadcast() {
    if (hostSyncHeartbeatTimer) clearInterval(hostSyncHeartbeatTimer);
    hostSyncHeartbeatTimer = setInterval(() => {
      broadcastHostSyncTick();
    }, 2000);
  }

  function stopHostSyncBroadcast() {
    if (hostSyncHeartbeatTimer) {
      clearInterval(hostSyncHeartbeatTimer);
      hostSyncHeartbeatTimer = null;
    }
  }

  function updateRoleUi() {
    if (myRole === 'guest') {
      stopHostSyncBroadcast();
      if (guestLockNotice) guestLockNotice.style.display = 'flex';
      if (btnPlay) btnPlay.classList.add('guest-disabled-control');
      if (btnStop) btnStop.classList.add('guest-disabled-control');
      if (btnPrevTrack) btnPrevTrack.classList.add('guest-disabled-control');
      if (btnNextTrack) btnNextTrack.classList.add('guest-disabled-control');
      if (progressBar) progressBar.classList.add('guest-disabled-control');
    } else {
      startHostSyncBroadcast();
      if (guestLockNotice) guestLockNotice.style.display = 'none';
      if (btnPlay) btnPlay.classList.remove('guest-disabled-control');
      if (btnStop) btnStop.classList.remove('guest-disabled-control');
      if (btnPrevTrack) btnPrevTrack.classList.remove('guest-disabled-control');
      if (btnNextTrack) btnNextTrack.classList.remove('guest-disabled-control');
      if (progressBar) progressBar.classList.remove('guest-disabled-control');
    }
  }


  let isAutoAtmosphere = true;
  let manualSelectedTheme = null;

  const themeMetadata = {
    auto: { icon: '✨', name: 'Auto Sync' },
    sunny: { icon: '☀️', name: 'Sunny' },
    moon: { icon: '🌙', name: 'Moonlit' },
    sakura: { icon: '🌸', name: 'Sakura' },
    rain: { icon: '🌧️', name: 'Rain' },
    hearts: { icon: '💖', name: 'Hearts' },
    stars: { icon: '🌌', name: 'Galaxy' },
    snow: { icon: '❄️', name: 'Snow' },
    thunder: { icon: '⚡', name: 'Thunder' },
    sparks: { icon: '🔥', name: 'Sparks' },
    equalizer: { icon: '📊', name: 'EQ Bars' }
  };


  function setupAtmosphere() {
    // Menu Dropdown Toggle
    if (btnThemeMenuToggle && themeDropdownContainer) {
      btnThemeMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdownContainer.classList.toggle('open');
      });

      window.addEventListener('click', (e) => {
        if (!themeDropdownContainer.contains(e.target)) {
          themeDropdownContainer.classList.remove('open');
        }
      });
    }

    if (atmosphereUnderlay || atmosphereOverlay) {
      atmosphereEngine = new AtmosphereEngine(atmosphereUnderlay, atmosphereOverlay, audioEngine);
      atmosphereEngine.start();

      atmoButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const theme = btn.dataset.theme;
          if (themeDropdownContainer) themeDropdownContainer.classList.remove('open');

          if (theme === 'auto') {
            isAutoAtmosphere = true;
            manualSelectedTheme = null;
            atmoButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (currentThemeIcon) currentThemeIcon.textContent = '✨';
            if (currentThemeName) currentThemeName.textContent = 'Theme: Auto';
            showToast('✨ Auto Mood-Sync Enabled: Theme automatically matches song keywords');
            if (currentTrack) {
              applyAutoAtmosphereForTrack(currentTrack, true);
            }
          } else {
            isAutoAtmosphere = false;
            manualSelectedTheme = theme;
            setAtmosphereTheme(theme, true);
          }
        });
      });
    }
  }

  function applyAutoAtmosphereForTrack(track, showNotice = false) {
    if (!atmosphereEngine || !track) return;
    const moodResult = atmosphereEngine.detectThemeAndMood(track.title, track.artist);
    
    // Update track mood badge under billboard
    if (trackMoodBadge) {
      trackMoodBadge.textContent = `✨ Mood: ${moodResult.keyword}`;
    }

    if (isAutoAtmosphere) {
      atmosphereEngine.setTheme(moodResult.theme);
      atmoButtons.forEach(b => {
        if (b.dataset.theme === 'auto') {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      const meta = themeMetadata[moodResult.theme] || { icon: '✨', name: 'Auto' };
      if (currentThemeIcon) currentThemeIcon.textContent = meta.icon;
      if (currentThemeName) currentThemeName.textContent = `Theme: ${meta.name} (Auto)`;

      if (showNotice) {
        showToast(`✨ Auto Mood-Sync: ${moodResult.moodName}`);
      }
    }
  }

  function setAtmosphereTheme(theme, isManual = false) {
    if (!atmosphereEngine) return;
    atmosphereEngine.setTheme(theme);
    atmoButtons.forEach(b => {
      if (b.dataset.theme === theme) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    const meta = themeMetadata[theme] || { icon: '🎨', name: theme };
    if (currentThemeIcon) currentThemeIcon.textContent = meta.icon;
    if (currentThemeName) currentThemeName.textContent = `Theme: ${meta.name}`;

    if (isManual) {
      showToast(`🎨 Theme Locked: ${meta.name.toUpperCase()} (Select "Auto Sync" in Theme menu to re-enable AI)`);
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
        } else if (targetTab === 'jukebox') {
          if (queueBadge) queueBadge.style.display = 'none';
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
    if (btnArmAudio) {
      btnArmAudio.addEventListener('click', async () => {
        const enteredName = deviceNameInput ? deviceNameInput.value.trim() : '';
        if (enteredName) {
          myDeviceName = enteredName;
          localStorage.setItem('syncpulse_device_name', myDeviceName);
          if (myDeviceLabel) myDeviceLabel.textContent = myDeviceName;
        }

        await audioEngine.init();
        if (modalArm) modalArm.classList.remove('active');
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
    }

    // Switch from Initial Arm Welcome modal to Direct Join Room modal
    const btnArmSwitchToJoin = document.getElementById('btn-arm-switch-to-join');
    if (btnArmSwitchToJoin) {
      btnArmSwitchToJoin.addEventListener('click', () => {
        if (modalArm) modalArm.classList.remove('active');
        if (inputRoomPin) inputRoomPin.value = '';
        if (inputJoinDeviceName) inputJoinDeviceName.value = myDeviceName;
        if (modalJoinPicker) modalJoinPicker.classList.add('active');
        if (inputRoomPin) inputRoomPin.focus();
      });
    }

    // Direct Join Room Modal Trigger
    if (btnOpenJoinModal) {
      btnOpenJoinModal.addEventListener('click', () => {
        if (inputRoomPin) inputRoomPin.value = '';
        if (inputJoinDeviceName) inputJoinDeviceName.value = myDeviceName;
        if (modalJoinPicker) modalJoinPicker.classList.add('active');
        if (inputRoomPin) inputRoomPin.focus();
      });
    }

    if (inputRoomPin) {
      inputRoomPin.addEventListener('input', () => {
        inputRoomPin.value = inputRoomPin.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      });
      inputRoomPin.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && btnSubmitJoinRoom) {
          btnSubmitJoinRoom.click();
        }
      });
    }

    if (btnSubmitJoinRoom) {
      btnSubmitJoinRoom.addEventListener('click', () => {
        const pin = inputRoomPin ? inputRoomPin.value.trim().toUpperCase() : '';
        if (!pin || pin.length < 3) {
          showToast('⚠️ Please enter a valid room PIN');
          return;
        }
        const devName = (inputJoinDeviceName && inputJoinDeviceName.value.trim()) || myDeviceName;
        myDeviceName = devName;
        localStorage.setItem('syncpulse_device_name', myDeviceName);
        window.location.href = `${window.location.pathname}?room=${encodeURIComponent(pin)}`;
      });
    }

    if (btnCancelJoinRoom) {
      btnCancelJoinRoom.addEventListener('click', () => {
        if (modalJoinPicker) modalJoinPicker.classList.remove('active');
        if (!audioEngine.ctx && modalArm) {
          modalArm.classList.add('active');
        }
      });
    }

    // Rename Device Modal
    if (btnEditDevice) {
      btnEditDevice.addEventListener('click', () => {
        if (editNameInput) editNameInput.value = myDeviceName;
        if (modalEditName) modalEditName.classList.add('active');
        if (editNameInput) editNameInput.focus();
      });
    }

    if (btnSaveDeviceName) {
      btnSaveDeviceName.addEventListener('click', () => {
        const val = editNameInput ? editNameInput.value.trim() : '';
        if (val) {
          myDeviceName = val;
          localStorage.setItem('syncpulse_device_name', myDeviceName);
          if (myDeviceLabel) myDeviceLabel.textContent = myDeviceName;
          sendTelemetry();
          showToast(`📱 Device name changed to: ${myDeviceName}`);
        }
        if (modalEditName) modalEditName.classList.remove('active');
      });
    }

    if (btnCancelDeviceName) {
      btnCancelDeviceName.addEventListener('click', () => {
        if (modalEditName) modalEditName.classList.remove('active');
      });
    }

    // Clipboard Copy Helper with Mobile Fallback
    function copyTextToClipboard(text, successMsg) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          showToast(successMsg);
        }).catch(() => {
          fallbackCopyText(text, successMsg);
        });
      } else {
        fallbackCopyText(text, successMsg);
      }
    }

    function fallbackCopyText(text, successMsg) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        textArea.setAttribute('readonly', '');
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (ok) {
          showToast(successMsg);
        } else {
          prompt('Copy room link:', text);
        }
      } catch (e) {
        prompt('Copy room link:', text);
      }
    }

    // QR Code Share Modal (Instant UI feedback)
    async function openQrModal() {
      const roomUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
      if (qrRoomCode) qrRoomCode.textContent = currentRoomId;
      const urlPreview = document.getElementById('qr-room-url-preview');
      if (urlPreview) urlPreview.textContent = roomUrl;
      if (qrImage) {
        qrImage.style.opacity = '0.3';
      }
      if (modalQr) modalQr.classList.add('active');

      try {
        const res = await fetch(`/api/qr?url=${encodeURIComponent(roomUrl)}`);
        const data = await res.json();
        if (qrImage && data.dataUrl) {
          qrImage.src = data.dataUrl;
          qrImage.style.opacity = '1';
        }
      } catch (err) {
        console.warn('QR fetch error:', err);
        showToast('⚠️ Could not generate image, but you can copy the Room PIN!');
      }
    }

    if (btnShareQr) {
      btnShareQr.addEventListener('click', openQrModal);
    }

    const qrRoomCapsule = document.getElementById('qr-room-capsule');
    if (qrRoomCapsule) {
      qrRoomCapsule.addEventListener('click', () => {
        copyTextToClipboard(currentRoomId, `📋 Room PIN ${currentRoomId} copied!`);
      });
    }

    const headerRoomCapsule = document.querySelector('.master-header .room-capsule');
    if (headerRoomCapsule) {
      headerRoomCapsule.style.cursor = 'pointer';
      headerRoomCapsule.title = 'Click to view QR code or copy Room PIN';
      headerRoomCapsule.addEventListener('click', openQrModal);
    }

    if (btnCloseQr) {
      btnCloseQr.addEventListener('click', () => {
        if (modalQr) modalQr.classList.remove('active');
      });
    }

    if (btnCopyLink) {
      btnCopyLink.addEventListener('click', () => {
        const roomUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
        copyTextToClipboard(roomUrl, '📋 Room link copied to clipboard!');
      });
    }
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
        if (msg.roomId) {
          currentRoomId = msg.roomId;
          if (roomCodeText) roomCodeText.textContent = currentRoomId;
          if (qrRoomCode) qrRoomCode.textContent = currentRoomId;
          const armRoomBadge = document.getElementById('arm-room-code-badge');
          if (armRoomBadge) armRoomBadge.textContent = currentRoomId;
        }
        updateRoleUi();

        if (msg.spatialMode) {
          setSpatialModeUi(msg.spatialMode);
          audioEngine.setSpatialMode(msg.spatialMode);
        }

        if (msg.currentTrack) {
          currentTrack = msg.currentTrack;
          updateTrackUi(currentTrack);
        }

        if (msg.queue) {
          currentQueue = msg.queue;
          renderJukeboxQueue();
        }

        if (typeof msg.crossfadeSec === 'number') {
          crossfadeDuration = msg.crossfadeSec;
          updateCrossfadeUi();
        }

        if (msg.playbackState && msg.playbackState.roomMasterStartTime) {
          audioEngine.setRoomMasterStartTime(msg.playbackState.roomMasterStartTime);
        }


        if (msg.playbackState && msg.playbackState.isPlaying && currentTrack) {
          pendingPlaybackState = msg.playbackState;

          const ps = msg.playbackState;
          if (ps.sourceType === 'youtube' || (currentTrack.type === 'youtube')) {
            // YouTube: hand off to YouTube handler with current position
            handleYouTubePlayCue(
              ps.youtubeVideoId || currentTrack.youtubeVideoId,
              ps.position || 0
            );
          } else if (currentTrack.url) {
            // Audio file: must init audio engine FIRST, then load track, then schedule
            audioEngine.init().then(() => {
              return audioEngine.loadTrack(currentTrack.url);
            }).then(() => {
              // Server computed a fresh targetMasterTime (now + 800ms) and live position
              audioEngine.schedulePlayback(
                ps.targetMasterTime,
                syncEngine ? syncEngine.now() : performance.now(),
                Math.max(0, ps.position || 0)
              );
              setPlayButtonState(true);
            }).catch(err => console.warn('[SyncPulse] Late-join audio load error:', err));
          }
        }
        break;


      case 'play_cue':
        isCrossfading = false;
        currentTrack = msg.track || currentTrack;
        if (currentTrack) updateTrackUi(currentTrack);
        if (msg.roomMasterStartTime) {
          audioEngine.setRoomMasterStartTime(msg.roomMasterStartTime);
        }
        pendingPlaybackState = {
          isPlaying: true,
          position: msg.position,
          targetMasterTime: msg.targetMasterTime,
          sourceType: msg.sourceType
        };


        if (msg.sourceType === 'youtube' || (currentTrack && currentTrack.type === 'youtube')) {
          handleYouTubePlayCue(msg.youtubeVideoId || (currentTrack && currentTrack.youtubeVideoId), msg.position);
        } else if (currentTrack && currentTrack.url) {
          audioEngine.init().then(() => {
            return audioEngine.loadTrack(currentTrack.url);
          }).then(() => {
            audioEngine.schedulePlayback(
              msg.targetMasterTime,
              syncEngine ? syncEngine.now() : performance.now(),
              msg.position
            );
            setPlayButtonState(true);
          }).catch(err => console.warn('[SyncPulse] Play cue error:', err));
        }
        break;

      case 'pause_cue':
        pendingPlaybackState = { isPlaying: false, position: msg.position, sourceType: msg.sourceType };
        audioEngine.pause(msg.position);
        if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
        setPlayButtonState(false);
        break;

      case 'seek_cue':
        if (msg.roomMasterStartTime) {
          audioEngine.setRoomMasterStartTime(msg.roomMasterStartTime);
        }
        pendingPlaybackState = {
          isPlaying: msg.isPlaying,
          position: msg.position,
          targetMasterTime: msg.targetMasterTime,
          sourceType: msg.sourceType
        };
        if (timeCurrent) timeCurrent.textContent = formatTime(msg.position);

        if (audioEngine.isStreamPlaying) {
          audioEngine.seekStream(msg.position);
          if (msg.isPlaying) {
            audioEngine.mediaAudioElement?.play().catch(() => {});
            setPlayButtonState(true);
          } else {
            audioEngine.mediaAudioElement?.pause();
            setPlayButtonState(false);
          }
        }

        if (msg.sourceType === 'youtube' || (currentTrack && currentTrack.type === 'youtube')) {
          if (ytPlayer && ytPlayer.seekTo) {
            ytPlayer.seekTo(msg.position, true);
            if (msg.isPlaying && ytPlayer.playVideo && ytPlayer.getPlayerState && ytPlayer.getPlayerState() !== 1) {
              ytPlayer.playVideo();
              setPlayButtonState(true);
            }
          }
          const dur = (ytPlayer && ytPlayer.getDuration && ytPlayer.getDuration() > 0) ? ytPlayer.getDuration() : (currentTrack ? (currentTrack.duration || 180) : 180);
          if (progressFill && dur > 0) {
            progressFill.style.width = `${Math.min(100, Math.max(0, (msg.position / dur) * 100)).toFixed(1)}%`;
          }
        } else if (currentTrack && currentTrack.url) {
          if (msg.isPlaying) {
            audioEngine.init().then(() => {
              return audioEngine.loadTrack(currentTrack.url);
            }).then(() => {
              audioEngine.schedulePlayback(
                msg.targetMasterTime,
                syncEngine ? syncEngine.now() : performance.now(),
                msg.position
              );
              setPlayButtonState(true);
            }).catch(err => console.warn('[SyncPulse] Seek error:', err));
          } else {
            audioEngine.pause(msg.position);
            if (progressFill && audioEngine.currentBuffer) {
              progressFill.style.width = `${Math.min(100, Math.max(0, (msg.position / audioEngine.currentBuffer.duration) * 100)).toFixed(1)}%`;
            }
          }
        }
        break;



      case 'track_changed':
        isCrossfading = false;
        currentTrack = msg.track || currentTrack;
        if (!currentTrack) break;
        recordTrackInSessionHistory(currentTrack);
        if (msg.roomMasterStartTime) {
          audioEngine.setRoomMasterStartTime(msg.roomMasterStartTime);
        }
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


      case 'host_sync_tick': {
        if (myRole === 'host') break; // Host is the clock master

        const currentMasterTime = syncEngine ? syncEngine.now() : performance.now();
        const elapsedSec = Math.max(0, (currentMasterTime - msg.masterTime) / 1000);
        const expectedHostPos = msg.position + (msg.isPlaying ? elapsedSec : 0);

        if (msg.roomMasterStartTime) {
          audioEngine.setRoomMasterStartTime(msg.roomMasterStartTime);
        }

        if (msg.sourceType === 'youtube' || (currentTrack && currentTrack.type === 'youtube')) {
          const videoId = msg.youtubeVideoId || (currentTrack && currentTrack.youtubeVideoId);
          if (!ytPlayer || !isYtReady) {
            if (msg.isPlaying && videoId) {
              handleYouTubePlayCue(videoId, expectedHostPos);
            }
          } else {
            const localYtPos = (typeof ytPlayer.getCurrentTime === 'function') ? (ytPlayer.getCurrentTime() || 0) : 0;
            const ytState = (typeof ytPlayer.getPlayerState === 'function') ? ytPlayer.getPlayerState() : -1;
            const driftSec = localYtPos - expectedHostPos;
            const driftMs = Math.round(driftSec * 1000);

            // If Host is playing but guest is paused / ended / unstarted
            if (msg.isPlaying && ytState !== 1 && ytState !== 3) {
              ytPlayer.seekTo(expectedHostPos, true);
              ytPlayer.playVideo();
              setPlayButtonState(true);
            } else if (!msg.isPlaying && ytState === 1) {
              ytPlayer.pauseVideo();
              setPlayButtonState(false);
            } else if (msg.isPlaying && ytState === 1) {
              // Drift detection vs Host (> 300ms delay, e.g. 3rd phone joined late or buffering)
              if (Math.abs(driftMs) > 300) {
                console.warn(`[SyncPulse] YouTube drift vs Host: ${driftMs}ms. Snap-resyncing to Host...`);
                ytPlayer.seekTo(expectedHostPos, true);
                if (autoSyncBadgeText) {
                  autoSyncBadgeText.textContent = `⚡ Synced to Host (${driftMs > 0 ? '+' : ''}${driftMs}ms)`;
                }
              } else {
                if (autoSyncBadgeText) {
                  autoSyncBadgeText.textContent = `⚡ Synced to Host (±${Math.abs(driftMs)}ms)`;
                }
              }
            }
          }
        } else if (currentTrack && currentTrack.url) {
          // WebAudio drift check is automatically handled by continuous auto-sync against roomMasterStartTime
        }
        break;
      }

      case 'room_sync_pulse':
        if (msg.roomMasterStartTime) {
          audioEngine.setRoomMasterStartTime(msg.roomMasterStartTime);
        }
        if (myRole !== 'host' && currentTrack && currentTrack.type === 'youtube' && ytPlayer && ytPlayer.getPlayerState && ytPlayer.getPlayerState() === 1) {
          const expectedYtPos = (syncEngine.now() - msg.roomMasterStartTime) / 1000;
          const actualYtPos = (ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0);
          const ytDrift = expectedYtPos - actualYtPos;
          if (Math.abs(ytDrift) > 0.3) {
            console.warn(`[SyncPulse YouTube Auto-Sync] Drift detected: ${Math.round(ytDrift * 1000)}ms. Resyncing to Host...`);
            ytPlayer.seekTo(expectedYtPos + 0.04, true);
          }
        }
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
        if (typeof msg.swarmAngle === 'number') {
          audioEngine.setNodeSwarmAngle(msg.swarmAngle);
        }
        const assignedInfo = CHANNEL_MAP[msg.channel] || { name: msg.channel.toUpperCase(), icon: '🎚' };
        showToast(`🎚 Node Role: ${assignedInfo.icon} ${assignedInfo.name}`);
        if (msg.channel === 'subwoofer' && navigator.vibrate) {
          navigator.vibrate([120, 50, 120]);
        }
        break;

      case 'fleet_orchestrated':
        showToast(`⚡ Fleet Orchestrated: ${msg.deviceCount} nodes configured in Dolby matrix!`);
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

      case 'dj_voice_start':
        audioEngine.duckMusic(true);
        if (djBroadcastBanner) {
          djBroadcastBanner.style.display = 'flex';
          if (djBannerText) {
            djBannerText.textContent = `🎙️ ${msg.hostName || 'HOST DJ'} ON AIR — SPEAKING`;
          }
        }
        break;

      case 'dj_voice_chunk':
        if (msg.audioData) {
          audioEngine.playDjVoiceChunk(msg.audioData);
        }
        break;

      case 'dj_voice_stop':
        audioEngine.duckMusic(false);
        if (djBroadcastBanner) {
          djBroadcastBanner.style.display = 'none';
        }
        break;

      case 'eq_preset_changed':
        if (toggleEq) {
          toggleEq.checked = !!msg.enabled;
          if (eqRackBox) {
            if (msg.enabled) eqRackBox.classList.remove('disabled');
            else eqRackBox.classList.add('disabled');
          }
        }
        if (msg.preset) {
          eqPresetButtons.forEach(b => {
            if (b.dataset.preset === msg.preset) b.classList.add('active');
            else b.classList.remove('active');
          });
        }
        audioEngine.setEqEnabled(msg.enabled);
        if (msg.preset) audioEngine.setEqPreset(msg.preset);
        syncSlidersWithEngine();
        break;

      case 'eq_band_changed':
        if (typeof msg.band === 'number' && typeof msg.gain === 'number') {
          audioEngine.setBandGain(msg.band, msg.gain);
          const slider = document.querySelector(`.eq-band-slider[data-band="${msg.band}"]`);
          if (slider) slider.value = msg.gain;
          const valSpan = document.getElementById(`eq-val-${msg.band}`);
          if (valSpan) {
            valSpan.textContent = (msg.gain > 0 ? `+${msg.gain}` : `${msg.gain}`) + 'dB';
          }
          eqPresetButtons.forEach(b => b.classList.remove('active'));
        }
        break;

      case 'spatial_mode_changed':
        if (msg.mode) {
          setSpatialModeUi(msg.mode, true);
        }
        break;

      case 'queue_updated':
        currentQueue = msg.queue || [];
        renderJukeboxQueue();
        if (activeTabName !== 'jukebox' && queueBadge) {
          queueBadge.style.display = currentQueue.length > 0 ? 'inline-block' : 'none';
          queueBadge.textContent = currentQueue.length;
        }
        break;

      case 'crossfade_updated':
        crossfadeDuration = msg.crossfadeSec;
        updateCrossfadeUi();
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
    if (btnPlay) {
      btnPlay.addEventListener('click', async () => {
        if (myRole === 'guest') {
          showToast('🔒 Only Host can trigger playback');
          return;
        }

        await audioEngine.init();
        if (!currentTrack) return;

        if (currentTrack.type === 'youtube') {
          const isYtPlaying = ytPlayer && typeof ytPlayer.getPlayerState === 'function' && ytPlayer.getPlayerState() === 1;
          if (isYtPlaying) {
            const ytPos = (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') ? ytPlayer.getCurrentTime() : 0;
            if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
            setPlayButtonState(false);
            ws.send(JSON.stringify({
              type: 'pause_cue',
              position: ytPos,
              sourceType: 'youtube'
            }));
          } else {
            // Direct user click: immediately start video locally
            if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
              try {
                ytPlayer.unMute();
                ytPlayer.setVolume(100);
                ytPlayer.playVideo();
              } catch (e) {}
              setPlayButtonState(true);
            } else {
              handleYouTubeTrackChange(currentTrack.youtubeVideoId, true);
            }

            const resumePos = (ytPlayer && typeof ytPlayer.getCurrentTime === 'function')
              ? ytPlayer.getCurrentTime()
              : (pendingPlaybackState && typeof pendingPlaybackState.position === 'number' ? pendingPlaybackState.position : 0);
            ws.send(JSON.stringify({
              type: 'play_cue',
              sourceType: 'youtube',
              youtubeVideoId: currentTrack.youtubeVideoId,
              position: resumePos,
              leadTime: 80
            }));
          }
          return;
        }

        if (audioEngine.isPlaying) {
          const pos = audioEngine.getCurrentPlaybackPosition();
          audioEngine.pause(pos);
          ws.send(JSON.stringify({
            type: 'pause_cue',
            position: pos,
            sourceType: 'audio'
          }));
        } else {
          if (currentTrack.url) {
            await audioEngine.loadTrack(currentTrack.url);
          }
          const pos = (audioEngine.pausedPosition !== undefined)
            ? audioEngine.pausedPosition
            : ((pendingPlaybackState && typeof pendingPlaybackState.position === 'number') ? pendingPlaybackState.position : (audioEngine.playStartPosition || 0));

          ws.send(JSON.stringify({
            type: 'play_cue',
            trackId: currentTrack.id,
            position: Math.max(0, pos),
            sourceType: 'audio',
            leadTime: 800
          }));
        }
      });
    }

    if (btnStop) {
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
          audioEngine.pausedPosition = 0;
        }
        ws.send(JSON.stringify({
          type: 'pause_cue',
          position: 0,
          sourceType: currentTrack ? currentTrack.type : 'audio'
        }));
        setPlayButtonState(false);
      });
    }


    let isUserScrubbing = false;

    function handleScrub(clientX) {
      if (myRole === 'guest') {
        showToast('🔒 Playback position is controlled by Host');
        return null;
      }
      if (!currentTrack || !progressBar) return null;
      const rect = progressBar.getBoundingClientRect();
      if (rect.width <= 0) return null;
      const clickX = clientX - rect.left;
      const frac = Math.max(0, Math.min(1, clickX / rect.width));

      let dur = 180;
      if (currentTrack.type === 'youtube') {
        dur = (ytPlayer && ytPlayer.getDuration && ytPlayer.getDuration() > 0)
          ? ytPlayer.getDuration()
          : (currentTrack.duration || 180);
      } else if (audioEngine.currentBuffer) {
        dur = audioEngine.currentBuffer.duration || 180;
      }

      const targetPos = frac * dur;

      // Immediate optimistic UI update
      if (progressFill) progressFill.style.width = `${(frac * 100).toFixed(1)}%`;
      if (timeCurrent) timeCurrent.textContent = formatTime(targetPos);

      return { targetPos, dur };
    }

    function commitScrub(clientX) {
      const res = handleScrub(clientX);
      if (!res) return;
      const { targetPos } = res;

      const isPlaying = (currentTrack.type === 'youtube')
        ? (ytPlayer && ytPlayer.getPlayerState ? ytPlayer.getPlayerState() === 1 : (pendingPlaybackState ? pendingPlaybackState.isPlaying : true))
        : audioEngine.isPlaying;

      if (currentTrack.type === 'youtube') {
        if (ytPlayer && ytPlayer.seekTo) {
          ytPlayer.seekTo(targetPos, true);
        }
      } else {
        audioEngine.pausedPosition = targetPos;
        audioEngine.playStartPosition = targetPos;
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'seek_cue',
          position: targetPos,
          isPlaying: isPlaying,
          sourceType: currentTrack.type || 'youtube',
          leadTime: 200
        }));
      }
    }

    if (progressBar) {
      progressBar.addEventListener('pointerdown', (e) => {
        if (myRole === 'guest') return;
        isUserScrubbing = true;
        handleScrub(e.clientX);
      });

      window.addEventListener('pointermove', (e) => {
        if (isUserScrubbing) {
          handleScrub(e.clientX);
        }
      });

      window.addEventListener('pointerup', (e) => {
        if (isUserScrubbing) {
          isUserScrubbing = false;
          commitScrub(e.clientX);
        }
      });

      progressBar.addEventListener('click', (e) => {
        if (!isUserScrubbing) {
          commitScrub(e.clientX);
        }
      });
    }


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

        // Priority 1: Play next top-voted song from Collaborative Jukebox Queue
        if (currentQueue && currentQueue.length > 0) {
          const nextTrackTitle = currentQueue[0].track ? currentQueue[0].track.title : 'Next Song';
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'queue_pop_next',
              crossfadeSec: crossfadeDuration
            }));
            showToast(`⏭️ Playing Next from Queue: "${nextTrackTitle}"`);
          }
          return;
        }

        // Priority 2: Fallback to cycling preset library tracks if queue is empty
        if (tracks.length > 1) {
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
          showToast(`⏭️ Playing: "${nextTrack.title}"`);
        } else {
          showToast('🗳️ Queue is empty. Search YouTube or tap "+ Queue" to add songs!');
        }
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

    if (volumeSlider) {
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
    }

    setupCalibrator();
    requestAnimationFrame(updatePlaybackProgress);
  }


  function setupDjMic() {
    if (!btnDjMic) return;

    const startDjTalking = async (e) => {
      if (e && e.cancelable) e.preventDefault();
      if (myRole === 'guest') {
        showToast('🔒 Only Host can broadcast DJ live voice announcements');
        return;
      }
      if (isDjTalking) return;

      try {
        await audioEngine.init();
        djMediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        isDjTalking = true;
        btnDjMic.classList.add('talking');
        if (djBroadcastBanner) {
          djBroadcastBanner.style.display = 'flex';
          if (djBannerText) djBannerText.textContent = '🎙️ YOU ARE ON AIR — SPEAKING TO ALL DEVICES';
        }

        // Duck music locally
        audioEngine.duckMusic(true);

        // Notify room
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'dj_voice_start',
            hostName: myDeviceName || 'Master Host DJ'
          }));
        }

        // Capture voice in 120ms slices
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg');

        djMediaRecorder = new MediaRecorder(djMediaStream, { mimeType });
        djMediaRecorder.ondataavailable = async (ev) => {
          if (ev.data && ev.data.size > 0 && isDjTalking) {
            const arrayBuffer = await ev.data.arrayBuffer();
            let binary = '';
            const bytes = new Uint8Array(arrayBuffer);
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'dj_voice_chunk',
                audioData: base64
              }));
            }
          }
        };

        djMediaRecorder.start(120);
        showToast('🎙️ Live DJ Mic ON AIR: Music ducked across room');
      } catch (err) {
        console.warn('DJ Mic access error:', err);
        showToast('⚠️ Microphone permission required for DJ Voice');
        stopDjTalking();
      }
    };

    const stopDjTalking = (e) => {
      if (e && e.cancelable) e.preventDefault();
      if (!isDjTalking) return;
      isDjTalking = false;

      btnDjMic.classList.remove('talking');
      if (djBroadcastBanner) {
        djBroadcastBanner.style.display = 'none';
      }

      // Restore music locally
      audioEngine.duckMusic(false);

      if (djMediaRecorder) {
        try { djMediaRecorder.stop(); } catch (err) {}
        djMediaRecorder = null;
      }
      if (djMediaStream) {
        djMediaStream.getTracks().forEach(t => t.stop());
        djMediaStream = null;
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'dj_voice_stop' }));
      }
      showToast('🎙️ DJ Mic Released: Music restored');
    };

    // Hold-to-Talk (Mouse / Touch)
    btnDjMic.addEventListener('mousedown', startDjTalking);
    window.addEventListener('mouseup', () => { if (isDjTalking) stopDjTalking(); });

    btnDjMic.addEventListener('touchstart', (e) => { startDjTalking(e); }, { passive: false });
    btnDjMic.addEventListener('touchend', (e) => { stopDjTalking(e); }, { passive: false });
  }

  function syncSlidersWithEngine() {
    const gains = audioEngine.getBandGains();
    eqBandSliders.forEach((slider, idx) => {
      if (typeof gains[idx] === 'number') {
        slider.value = gains[idx];
        const valSpan = document.getElementById(`eq-val-${idx}`);
        if (valSpan) {
          valSpan.textContent = (gains[idx] > 0 ? `+${gains[idx]}` : `${gains[idx]}`) + 'dB';
        }
      }
    });
  }

  function setupEqualizerControls() {
    if (btnToggleEqSliders && eqSlidersDrawer) {
      btnToggleEqSliders.addEventListener('click', () => {
        const isHidden = eqSlidersDrawer.style.display === 'none';
        eqSlidersDrawer.style.display = isHidden ? 'block' : 'none';
        btnToggleEqSliders.classList.toggle('active', isHidden);
        if (isHidden) syncSlidersWithEngine();
      });
    }

    eqBandSliders.forEach(slider => {
      slider.addEventListener('input', async () => {
        await audioEngine.init();
        const band = parseInt(slider.dataset.band, 10);
        const val = parseFloat(slider.value);
        const valSpan = document.getElementById(`eq-val-${band}`);
        if (valSpan) {
          valSpan.textContent = (val > 0 ? `+${val}` : `${val}`) + 'dB';
        }
        audioEngine.setBandGain(band, val);
        eqPresetButtons.forEach(b => b.classList.remove('active'));
        if (myRole === 'host' && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'set_eq_band',
            band: band,
            gain: val
          }));
        }
      });
    });

    if (toggleEq) {
      toggleEq.addEventListener('change', async () => {
        await audioEngine.init();
        const enabled = toggleEq.checked;
        audioEngine.setEqEnabled(enabled);
        if (eqRackBox) {
          if (enabled) eqRackBox.classList.remove('disabled');
          else eqRackBox.classList.add('disabled');
        }
        syncSlidersWithEngine();
        showToast(enabled ? '🎛️ Equalizer DSP: ENABLED' : '🎛️ Equalizer DSP: BYPASSED (OFF)');
        if (enabled) {
          audioEngine.playPresetPreviewCue(audioEngine.currentEqPreset || 'bass_booster');
        }
        if (myRole === 'host' && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'set_eq_preset',
            preset: audioEngine.currentEqPreset,
            enabled: enabled
          }));
        }
      });
    }

    eqPresetButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        await audioEngine.init();
        const preset = btn.dataset.preset;
        eqPresetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        audioEngine.setEqPreset(preset);
        syncSlidersWithEngine();
        audioEngine.playPresetPreviewCue(preset);
        showToast(`🎛️ Preset Applied: ${btn.textContent.trim()}`);
        if (myRole === 'host' && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'set_eq_preset',
            preset: preset,
            enabled: toggleEq ? toggleEq.checked : true
          }));
        }
      });
    });

    const sliderWarmth = document.getElementById('slider-analog-warmth');
    const valWarmth = document.getElementById('val-analog-warmth');
    if (sliderWarmth) {
      sliderWarmth.addEventListener('input', async () => {
        await audioEngine.init();
        const v = parseInt(sliderWarmth.value, 10);
        if (valWarmth) valWarmth.textContent = `${v}%`;
        audioEngine.setAnalogWarmth(v);
      });
    }

    const sliderReflections = document.getElementById('slider-early-reflections');
    const valReflections = document.getElementById('val-early-reflections');
    if (sliderReflections) {
      sliderReflections.addEventListener('input', async () => {
        await audioEngine.init();
        const v = parseInt(sliderReflections.value, 10);
        if (valReflections) valReflections.textContent = `${v}%`;
        if (audioEngine.reverbGain && audioEngine.ctx) {
          audioEngine.reverbGain.gain.setTargetAtTime(v / 100 * 0.45, audioEngine.ctx.currentTime, 0.04);
        }
      });
    }

    // 360 Spatial Radar Setup
    if (btnToggleRadar && spatialRadarBox) {
      btnToggleRadar.addEventListener('click', () => {
        const isHidden = spatialRadarBox.style.display === 'none';
        spatialRadarBox.style.display = isHidden ? 'flex' : 'none';
        btnToggleRadar.classList.toggle('active', isHidden);
      });
    }

    if (radarInteractiveSurface && radarSoundNode) {
      let isDraggingRadar = false;

      function handleRadarPointer(e) {
        const rect = radarInteractiveSurface.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const dx = clientX - cx;
        const dy = clientY - cy;
        const maxRadius = Math.max(20, rect.width / 2 - 12);
        const distPx = Math.min(maxRadius, Math.hypot(dx, dy));
        const angleRad = Math.atan2(dx, -dy);
        const azDeg = Math.round(((angleRad * 180 / Math.PI) + 360) % 360);
        const distanceM = Math.max(1.0, Math.min(10.0, (distPx / maxRadius) * 6.0));

        if (currentSpatialMode !== '360') {
          setSpatialModeUi('360', true);
        }

        audioEngine.set360Position(azDeg, 0, distanceM);
      }

      radarInteractiveSurface.addEventListener('mousedown', (e) => {
        isDraggingRadar = true;
        handleRadarPointer(e);
      });
      window.addEventListener('mousemove', (e) => {
        if (isDraggingRadar) handleRadarPointer(e);
      });
      window.addEventListener('mouseup', () => { isDraggingRadar = false; });

      radarInteractiveSurface.addEventListener('touchstart', (e) => {
        isDraggingRadar = true;
        handleRadarPointer(e);
      }, { passive: true });
      window.addEventListener('touchmove', (e) => {
        if (isDraggingRadar) handleRadarPointer(e);
      }, { passive: true });
      window.addEventListener('touchend', () => { isDraggingRadar = false; });
    }

    audioEngine.on360PositionUpdate((pos) => {
      if (!radarSoundNode || !radarInteractiveSurface) return;
      const rect = radarInteractiveSurface.getBoundingClientRect();
      const maxRadius = Math.max(20, (rect.width > 0 ? rect.width / 2 : 70) - 12);
      const rad = (pos.azimuth * Math.PI) / 180;
      const normDist = Math.min(1.0, pos.distance / 6.0);
      const rPx = normDist * maxRadius;

      const px = Math.sin(rad) * rPx;
      const py = -Math.cos(rad) * rPx;

      radarSoundNode.style.transform = `translate(calc(-50% + ${px.toFixed(1)}px), calc(-50% + ${py.toFixed(1)}px))`;

      if (radarAzimuthVal) {
        let dir = 'Front';
        if (pos.azimuth > 45 && pos.azimuth < 135) dir = 'Right';
        else if (pos.azimuth >= 135 && pos.azimuth <= 225) dir = 'Rear';
        else if (pos.azimuth > 225 && pos.azimuth < 315) dir = 'Left';
        radarAzimuthVal.textContent = `${Math.round(pos.azimuth)}° (${dir})`;
      }
      if (radarElevationVal) radarElevationVal.textContent = `${Math.round(pos.elevation)}°`;
      if (radarDistanceVal) radarDistanceVal.textContent = `${pos.distance.toFixed(1)}m`;
    });
  }

  async function setSpatialModeUi(mode, skipWs = false) {
    currentSpatialMode = mode;
    await audioEngine.init();
    audioEngine.setSpatialMode(mode);
    audioEngine.playPresetPreviewCue(mode);
    modeButtons.forEach(b => {
      if (b.dataset.mode === mode) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    if (mode === '360' || mode === '8d') {
      if (spatialRadarBox) spatialRadarBox.style.display = 'flex';
      if (btnToggleRadar) btnToggleRadar.classList.add('active');
    }

    if (!skipWs && myRole === 'host' && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'set_spatial_mode',
        mode: mode
      }));
    }
  }

  function setupYouTubeDesk() {
    function onApiReady() {
      // Pre-warm the YouTube iframe in the background so all subsequent song clicks play instantly (<150ms)!
      const initialId = (currentTrack && currentTrack.type === 'youtube' && currentTrack.youtubeVideoId)
        ? currentTrack.youtubeVideoId
        : 'dQw4w9WgXcQ';
      
      initYouTubePlayer(initialId, (p) => {
        // If not playing a YouTube track on start, keep it paused
        if (!currentTrack || currentTrack.type !== 'youtube') {
          try {
            if (p && typeof p.pauseVideo === 'function') p.pauseVideo();
          } catch (e) {}
        }
      });
    }

    if (window.YT && window.YT.Player) {
      onApiReady();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev();
        onApiReady();
      };
    }

    if (btnYtSearch) {
      btnYtSearch.addEventListener('click', (e) => {
        e.preventDefault();
        runYouTubeSearch();
      });
    }

    if (ytSearchInput) {
      ytSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          runYouTubeSearch();
        }
      });
    }

    fetchYouTubeResults('barsaat darshan raval');
  }

  function runYouTubeSearch() {
    const q = ytSearchInput.value.trim();
    if (!q) return;
    fetchYouTubeResults(q, ytResultsScroll);
  }

  const ytClientCache = new Map();

  async function fetchYouTubeResults(q, targetContainer = ytResultsScroll) {
    if (ytClientCache.has(q)) {
      renderYouTubeResults(ytClientCache.get(q), targetContainer);
      return;
    }
    if (targetContainer) {
      targetContainer.innerHTML = '<div style="font-size:0.75rem; color:var(--text-tertiary); text-align:center; padding:20px 10px;">Searching YouTube Lite (144p)...</div>';
    }
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const results = data.results || [];
      ytClientCache.set(q, results);
      renderYouTubeResults(results, targetContainer);
    } catch (e) {
      if (targetContainer) {
        targetContainer.innerHTML = '<div style="font-size:0.75rem; color:var(--neon-red); text-align:center; padding:15px;">Search failed. Try again.</div>';
      }
    }
  }

  function renderYouTubeResults(results, targetContainer = ytResultsScroll) {
    if (!targetContainer) return;
    targetContainer.innerHTML = '';
    if (results.length === 0) {
      targetContainer.innerHTML = '<div style="font-size:0.75rem; color:var(--text-tertiary); text-align:center; padding:24px 10px;">No results found. Paste direct YouTube URL above.</div>';
      return;
    }

    // Scroll Header Hint
    const countHint = document.createElement('div');
    countHint.style.cssText = 'font-size:0.65rem; font-family:var(--font-mono); color:var(--neon-cyan); padding:2px 4px 6px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;';
    countHint.innerHTML = `<span>⚡ ${results.length} SONGS FOUND (144p Lite)</span><span style="color:var(--text-tertiary);">↕ Scroll for all songs</span>`;
    targetContainer.appendChild(countHint);

    results.forEach(item => {
      const card = document.createElement('div');
      card.className = 'yt-result-card';
      card.innerHTML = `
        <img src="${item.thumbnail}" class="yt-thumb" alt="Thumbnail">
        <div class="yt-meta">
          <div class="yt-video-title">${item.title}</div>
          <div class="yt-video-channel">${item.channel} • ${item.duration}</div>
        </div>
        <button class="btn-card-add-queue" title="Add to Collaborative Party Upvote Queue">+ Queue</button>
      `;

      const queueBtn = card.querySelector('.btn-card-add-queue');
      if (queueBtn) {
        queueBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const origText = queueBtn.textContent;
          queueBtn.textContent = '✓ Queued!';
          queueBtn.style.background = 'rgba(0, 242, 254, 0.3)';
          queueBtn.style.borderColor = 'var(--neon-cyan)';
          queueBtn.style.color = '#fff';

          setTimeout(() => {
            queueBtn.textContent = origText;
            queueBtn.style.background = '';
            queueBtn.style.borderColor = '';
            queueBtn.style.color = '';
          }, 1200);

          addTrackToQueue({
            id: `yt-${item.id}`,
            title: item.title,
            artist: item.channel || 'YouTube',
            type: 'youtube',
            youtubeVideoId: item.id,
            duration: parseDurationToSeconds(item.duration) || 180,
            thumbnail: item.thumbnail
          });
        });
      }


      card.addEventListener('click', async () => {
        if (myRole === 'guest') {
          addTrackToQueue({
            id: `yt-${item.id}`,
            title: item.title,
            artist: item.channel || 'YouTube',
            type: 'youtube',
            youtubeVideoId: item.id,
            duration: parseDurationToSeconds(item.duration) || 180,
            thumbnail: item.thumbnail
          });
          return;
        }
        await audioEngine.init();
        const autoplay = ytAutoplayCheckbox ? ytAutoplayCheckbox.checked : true;
        playCustomYouTubeVideo(item.id, item.title, autoplay);
      });
      targetContainer.appendChild(card);
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
    recordTrackInSessionHistory(currentTrack);
    updateTrackUi(currentTrack);

    // Direct User Gesture Thread: Instant video switch without recreating iframe
    if (autoplay) {
      handleYouTubeTrackChange(videoId, true);
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'change_track',
        track: currentTrack,
        autoplay: autoplay
      }));
    }
    showToast(`▶ Playing: ${title}`);
  }

  // Bandwidth Saver: Enforces 144p ('tiny') / 240p ('small') lowest resolution stream for low internet usage
  function enforceLowestYouTubeQuality(player) {
    const p = player || ytPlayer;
    if (!p) return;
    try {
      if (typeof p.setPlaybackQuality === 'function') {
        p.setPlaybackQuality('tiny'); // 144p resolution (lowest available bandwidth)
      }
      if (typeof p.setPlaybackQualityRange === 'function') {
        p.setPlaybackQualityRange('tiny', 'small'); // Enforce 144p - 240p range
      }
    } catch (err) {}
  }

  let ytCurrentVideoId = null;

  function initYouTubePlayer(videoId, onReady) {
    if (!videoId) return;
    ytCurrentVideoId = videoId;

    if (!window.YT || !window.YT.Player) {
      setTimeout(() => initYouTubePlayer(videoId, onReady), 150);
      return;
    }

    let wrapper = document.getElementById('youtube-player-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'youtube-player-wrapper';
      document.body.appendChild(wrapper);
    }
    wrapper.style.cssText = 'position:fixed; bottom:10px; right:10px; width:180px; height:100px; opacity:0.02; pointer-events:none; z-index:-10; border-radius:8px; overflow:hidden;';

    // If player is already initialized and functional, reuse it without rebuilding iframe
    if (ytPlayer && isYtReady && typeof ytPlayer.loadVideoById === 'function') {
      try {
        ytPlayer.unMute();
        ytPlayer.setVolume(100);
        ytPlayer.loadVideoById({ videoId, suggestedQuality: 'tiny' });
        enforceLowestYouTubeQuality(ytPlayer);
        ytPlayer.playVideo();
        setPlayButtonState(true);
        if (typeof onReady === 'function') onReady(ytPlayer);
        return;
      } catch (err) {
        console.warn('Rebuilding ytPlayer instance...', err);
      }
    }

    if (ytPlayer && typeof ytPlayer.destroy === 'function') {
      try { ytPlayer.destroy(); } catch (e) {}
      ytPlayer = null;
    }
    isYtReady = false;

    wrapper.innerHTML = '<div id="youtube-player-container"></div>';
    const container = document.getElementById('youtube-player-container');
    if (!container) return;

    try {
      ytPlayer = new YT.Player(container, {
        height: '180',
        width: '320',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          controls: 0,
          disablekb: 1,
          rel: 0,
          fs: 0,
          modestbranding: 1,
          enablejsapi: 1,
          suggestedQuality: 'tiny'
        },
        events: {
          onReady: (e) => {
            isYtReady = true;
            enforceLowestYouTubeQuality(e.target);
            try {
              e.target.unMute();
              e.target.setVolume(100);
            } catch (err) {}
            if (typeof onReady === 'function') onReady(e.target);
          },
          onPlaybackQualityChange: (e) => {
            if (e.data !== 'tiny' && e.data !== 'small') {
              enforceLowestYouTubeQuality(e.target);
            }
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              setPlayButtonState(true);
            } else if (event.data === YT.PlayerState.PAUSED) {
              setPlayButtonState(false);
            } else if (event.data === YT.PlayerState.ENDED) {
              setPlayButtonState(false);
              isCrossfading = false;
              if (myRole === 'host') {
                if (currentQueue && currentQueue.length > 0) {
                  if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                      type: 'queue_pop_next',
                      crossfadeSec: crossfadeDuration,
                      isAutoTransition: true
                    }));
                  }
                } else if (isAutoPlayActive) {
                  playSmartAutoRecommendedTrack(currentTrack);
                }
              }
            }
          },
          onError: (e) => {
            console.warn('YouTube player error:', e.data);
            showToast('⚠️ YouTube stream unavailable or region-restricted.');
          }
        }
      });
    } catch (err) {
      console.error('Error creating YouTube player:', err);
    }
  }

  function handleYouTubeTrackChange(videoId, autoplay) {
    isCrossfading = false;
    if (!videoId) return;
    ytCurrentVideoId = videoId;

    // Direct fast path on active YouTube player
    if (ytPlayer && isYtReady && typeof ytPlayer.loadVideoById === 'function') {
      try {
        ytPlayer.unMute();
        ytPlayer.setVolume(100);
        if (autoplay) {
          ytPlayer.loadVideoById({ videoId, suggestedQuality: 'tiny' });
          if (typeof ytPlayer.playVideo === 'function') {
            ytPlayer.playVideo();
          }
          setPlayButtonState(true);
        } else {
          ytPlayer.cueVideoById({ videoId, suggestedQuality: 'tiny' });
        }
        enforceLowestYouTubeQuality(ytPlayer);
        return;
      } catch (err) {
        console.warn('Fast video load error, re-initializing:', err);
      }
    }

    // Cold boot path
    initYouTubePlayer(videoId, (player) => {
      enforceLowestYouTubeQuality(player);
      if (autoplay && player) {
        try {
          player.unMute();
          player.setVolume(100);
          if (typeof player.playVideo === 'function') player.playVideo();
        } catch (err) {}
        setPlayButtonState(true);
      }
    });
  }

  function handleYouTubePlayCue(videoId, startPos = 0) {
    if (!videoId) return;
    ytCurrentVideoId = videoId;

    if (ytPlayer && isYtReady && typeof ytPlayer.playVideo === 'function') {
      try {
        ytPlayer.unMute();
        ytPlayer.setVolume(100);
        if (typeof ytPlayer.loadVideoById === 'function') {
          ytPlayer.loadVideoById({ videoId, startSeconds: startPos, suggestedQuality: 'tiny' });
        } else {
          if (startPos > 0 && typeof ytPlayer.seekTo === 'function') ytPlayer.seekTo(startPos, true);
          ytPlayer.playVideo();
        }
        enforceLowestYouTubeQuality(ytPlayer);
        setPlayButtonState(true);
        return;
      } catch (err) {}
    }

    initYouTubePlayer(videoId, (player) => {
      if (player) {
        try {
          player.unMute();
          player.setVolume(100);
          if (startPos > 0 && typeof player.seekTo === 'function') player.seekTo(startPos, true);
          if (typeof player.playVideo === 'function') player.playVideo();
        } catch (e) {}
        setPlayButtonState(true);
      }
    });
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

    // Wire Continuous Latency Auto-Corrector Listener (Checks & Fixes every 2s)
    audioEngine.onAutoSyncStatus((status) => {
      if (status.state === 'locked') {
        if (autoSyncStatusBadge) {
          autoSyncStatusBadge.className = 'status-pill';
          if (autoSyncBadgeText) autoSyncBadgeText.textContent = `⚡ Synced (±${Math.abs(status.driftMs)}ms)`;
        }
        if (autoSyncLivePill) {
          autoSyncLivePill.className = 'status-pill locked';
          autoSyncLivePill.textContent = `Phase-Locked (±${Math.abs(status.driftMs)}ms)`;
        }
        if (autoSyncDetailText) {
          autoSyncDetailText.textContent = `All devices in exact millisecond phase-lock! (Drift: ±${Math.abs(status.driftMs)}ms). 2-sec monitor active.`;
        }
      } else if (status.state === 'fixing') {
        if (autoSyncStatusBadge) {
          autoSyncStatusBadge.className = 'status-pill syncing';
          if (autoSyncBadgeText) autoSyncBadgeText.textContent = `⚡ Auto-Fixing (${status.driftMs > 0 ? '+' : ''}${status.driftMs}ms)`;
        }
        if (autoSyncLivePill) {
          autoSyncLivePill.className = 'status-pill syncing';
          autoSyncLivePill.textContent = `Auto-Fixing (${status.driftMs > 0 ? '+' : ''}${status.driftMs}ms)`;
        }
        if (autoSyncDetailText) {
          autoSyncDetailText.textContent = `Delay detected (${status.driftMs > 0 ? '+' : ''}${status.driftMs}ms on device). Automatically adjusting clock and phase...`;
        }
      } else if (status.state === 'disabled') {
        if (autoSyncStatusBadge) {
          autoSyncStatusBadge.className = 'status-pill disconnected';
          if (autoSyncBadgeText) autoSyncBadgeText.textContent = 'Auto-Sync: OFF';
        }
        if (autoSyncLivePill) {
          autoSyncLivePill.className = 'status-pill disconnected';
          autoSyncLivePill.textContent = 'Auto-Sync: OFF';
        }
        if (autoSyncDetailText) {
          autoSyncDetailText.textContent = 'Continuous auto-sync is paused. Tap "AUTO FIX: ON" to re-enable.';
        }
      }
    });

    if (toggleAutoSync) {
      toggleAutoSync.addEventListener('change', () => {
        const active = toggleAutoSync.checked;
        audioEngine.setAutoSyncActive(active);
        showToast(active ? '⚡ Continuous 2s Auto-Sync: ENABLED' : '⚡ Continuous Auto-Sync: DISABLED');
      });
    }

    if (btnForceAutoSync) {
      btnForceAutoSync.addEventListener('click', async () => {
        await audioEngine.init();
        audioEngine.forceAutoSyncNow();
        showToast('⚡ Instant Auto-Sync Triggered: Re-aligning all devices...');
      });
    }
  }


  function updatePlaybackProgress() {
    if (typeof isUserScrubbing !== 'undefined' && isUserScrubbing) {
      requestAnimationFrame(updatePlaybackProgress);
      return;
    }

    if (audioEngine.isStreamPlaying) {
      const pos = audioEngine.getCurrentPlaybackPosition();
      const dur = (currentTrack && currentTrack.duration > 0) ? currentTrack.duration : (audioEngine.mediaAudioElement?.duration || 180);
      const pct = (pos / dur) * 100;
      progressFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
      timeCurrent.textContent = formatTime(pos);
      timeTotal.textContent = formatTime(dur);
    } else if (currentTrack && currentTrack.type === 'youtube' && ytPlayer && ytPlayer.getCurrentTime) {
      const pos = ytPlayer.getCurrentTime() || 0;
      const dur = (ytPlayer.getDuration && ytPlayer.getDuration() > 0) ? ytPlayer.getDuration() : (currentTrack.duration || 180);
      const pct = (pos / dur) * 100;
      progressFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
      timeCurrent.textContent = formatTime(pos);
      timeTotal.textContent = formatTime(dur);

      // Auto-DJ Transition Trigger: When reaching end of track, blend next queued song OR auto-recommend next song!
      if (myRole === 'host' && crossfadeDuration > 0 && !isCrossfading) {
        if (dur > (crossfadeDuration + 4) && pos >= (dur - crossfadeDuration)) {
          isCrossfading = true;
          if (currentQueue && currentQueue.length > 0) {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'queue_pop_next',
                crossfadeSec: crossfadeDuration,
                isAutoTransition: true
              }));
            }
          } else if (isAutoPlayActive) {
            playSmartAutoRecommendedTrack(currentTrack);
          }
        }
      }
    } else if (audioEngine.currentBuffer) {
      const pos = audioEngine.getCurrentPlaybackPosition();
      const dur = audioEngine.currentBuffer.duration || 180;
      const pct = (pos / dur) * 100;
      progressFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
      timeCurrent.textContent = formatTime(pos);
      timeTotal.textContent = formatTime(dur);

      if (myRole === 'host' && crossfadeDuration > 0 && !isCrossfading) {
        if (dur > (crossfadeDuration + 4) && pos >= (dur - crossfadeDuration)) {
          isCrossfading = true;
          if (currentQueue && currentQueue.length > 0) {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'queue_pop_next',
                crossfadeSec: crossfadeDuration,
                isAutoTransition: true
              }));
            }
          } else if (isAutoPlayActive) {
            playSmartAutoRecommendedTrack(currentTrack);
          }
        }
      }
    }




    // Dynamic L and R VU Meters & dB Readout Engine
    if (vuBarLeft && vuBarRight) {
      let isYtPlaying = false;
      if (currentTrack && currentTrack.type === 'youtube' && ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
        isYtPlaying = (ytPlayer.getPlayerState() === 1);
      }

      let vu;
      if (isYtPlaying) {
        const time = performance.now() * 0.0035;
        const beat1 = Math.abs(Math.sin(time * 4.4));
        const beat2 = Math.abs(Math.cos(time * 2.2));
        const transient = (beat1 * 0.65 + beat2 * 0.35);
        const baseLevel = 0.35 + transient * 0.55;

        if (currentSpatialMode === '8d' || audioEngine.spatialMode === '8d') {
          const pan = Math.sin(audioEngine.orbitAngle || 0);
          vu = {
            left: Math.max(0.04, Math.min(0.98, baseLevel * (1 - pan * 0.75))),
            right: Math.max(0.04, Math.min(0.98, baseLevel * (1 + pan * 0.75)))
          };
        } else {
          const flutter = (Math.random() - 0.5) * 0.08;
          vu = {
            left: Math.max(0.04, Math.min(0.98, baseLevel + flutter)),
            right: Math.max(0.04, Math.min(0.98, baseLevel - flutter))
          };
        }
      } else {
        vu = audioEngine.getVuLevels();
      }

      vuBarLeft.style.width = `${(vu.left * 100).toFixed(1)}%`;
      vuBarRight.style.width = `${(vu.right * 100).toFixed(1)}%`;

      if (vuDbReadout) {
        const peak = Math.max(vu.left, vu.right);
        if (peak > 0.05) {
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

    applyAutoAtmosphereForTrack(track, false);
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
    if (!trackListContainer) return;
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
      const chInfo = CHANNEL_MAP[peer.channel] || { name: (peer.channel || 'all').toUpperCase(), icon: '🎚', color: 'var(--neon-cyan)', badge: 'rgba(0,242,254,0.15)', desc: 'Standard channel' };

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="node-avatar" style="width:34px; height:34px; border-radius:8px; background:rgba(0,242,254,0.1); border:1px solid var(--neon-cyan); display:flex; align-items:center; justify-content:center; font-size:1.1rem;">
              ${chInfo.icon}
            </div>
            <div>
              <div style="font-weight:700; font-size:0.88rem; color:#fff;">${peer.deviceName} ${isMe ? '<span style="color:var(--neon-cyan); font-size:0.7rem;">(You)</span>' : ''}</div>
              <div style="font-size:0.68rem; color:var(--text-tertiary);">${peer.role.toUpperCase()} • ${chInfo.desc}</div>
            </div>
          </div>
          <span style="font-size:0.68rem; font-weight:700; padding:3px 9px; border-radius:999px; background:${chInfo.badge}; color:${chInfo.color}; border:1px solid ${chInfo.color}; display:inline-flex; align-items:center; gap:4px;">
            ${chInfo.icon} ${chInfo.name}
          </span>
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

        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:2px; gap:6px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:180px;">
            <span style="font-size:0.7rem; color:var(--text-tertiary); white-space:nowrap;">Acoustic Role:</span>
            <select class="remote-channel-select" data-peer-id="${peer.id}" ${myRole !== 'host' && !isMe ? 'disabled' : ''} style="background:#030509; border:1px solid var(--border-medium); color:#fff; border-radius:4px; font-size:0.75rem; padding:4px 6px; flex:1;">
              <option value="all" ${peer.channel === 'all' ? 'selected' : ''}>◀▶ Full Stereo Master</option>
              <option value="left" ${peer.channel === 'left' ? 'selected' : ''}>◀ Front Left Channel</option>
              <option value="center" ${peer.channel === 'center' ? 'selected' : ''}>🎤 Center (Vocals & Lyrics)</option>
              <option value="right" ${peer.channel === 'right' ? 'selected' : ''}>▶ Front Right Channel</option>
              <option value="subwoofer" ${peer.channel === 'subwoofer' ? 'selected' : ''}>🔊 Subwoofer (Bass + Haptics)</option>
              <option value="rear-left" ${peer.channel === 'rear-left' ? 'selected' : ''}>🌌 Rear Left Surround (Haas)</option>
              <option value="rear-right" ${peer.channel === 'rear-right' ? 'selected' : ''}>🌌 Rear Right Surround (Haas)</option>
              <option value="height" ${peer.channel === 'height' ? 'selected' : ''}>☁️ Overhead Atmos Height</option>
              <option value="fx-reverb" ${peer.channel === 'fx-reverb' ? 'selected' : ''}>🏛️ Reverb Chamber Node</option>
              <option value="traveling-orbit" ${peer.channel === 'traveling-orbit' ? 'selected' : ''}>🔄 360° Traveling Wave</option>
            </select>
          </div>

          <div style="display:flex; gap:5px;">
            <button class="btn-test-node-chime" data-channel="${peer.channel}" style="background:rgba(0,242,254,0.12); border:1px solid rgba(0,242,254,0.35); color:var(--neon-cyan); border-radius:5px; padding:4px 9px; font-size:0.7rem; font-weight:700; cursor:pointer; white-space:nowrap;">🔊 Test</button>
            ${myRole === 'host' && !isMe ? `
              <button class="btn-kick-peer" data-peer-id="${peer.id}" style="background:rgba(255,51,102,0.15); border:1px solid rgba(255,51,102,0.4); color:var(--neon-red); border-radius:5px; padding:4px 8px; font-size:0.7rem; cursor:pointer; white-space:nowrap;">⛔ Kick</button>
            ` : ''}
          </div>
        </div>
      `;

      fleetGrid.appendChild(card);
    });

    document.querySelectorAll('.remote-channel-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const targetPeerId = e.target.dataset.peerId;
        const newChannel = e.target.value;
        if (targetPeerId === myPeerId) {
          audioEngine.setChannelMode(newChannel);
          showToast(`🎚 Node Role: ${(CHANNEL_MAP[newChannel] || {}).name || newChannel}`);
        }
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'set_peer_channel',
            targetPeerId,
            channel: newChannel
          }));
        }
      });
    });

    document.querySelectorAll('.btn-test-node-chime').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetCh = btn.dataset.channel;
        if (myRole === 'host' && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'test_channel_cue',
            targetChannel: targetCh
          }));
        } else {
          audioEngine.playChannelTestBeep(targetCh);
        }
        showToast(`🔊 Sent Sound Check Tone to: ${(CHANNEL_MAP[targetCh] || {}).name || targetCh}`);
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

  // Setup Fleet Orchestration Actions
  if (btnAutoDistributeFleet) {
    btnAutoDistributeFleet.addEventListener('click', () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'auto_distribute_fleet' }));
        showToast('⚡ Auto-Distributing nodes into 5.1/7.1 acoustic fleet...');
      }
    });
  }

  if (btnFleetSoundCheck) {
    btnFleetSoundCheck.addEventListener('click', () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'fleet_sound_check' }));
        showToast('🔊 Running sequential fleet sound check sweep...');
      }
    });
  }

  function detectDeviceName() {
    const ua = navigator.userAgent;
    const num = Math.floor(100 + Math.random() * 900);
    if (/iPhone/i.test(ua)) return `iPhone #${num}`;
    if (/iPad/i.test(ua)) return `iPad #${num}`;
    if (/Android/i.test(ua)) return `Android Node #${num}`;
    if (/Macintosh/i.test(ua)) return `MacBook #${num}`;
    if (/Windows/i.test(ua)) return `Windows Host #${num}`;
    return `Audio Node #${num}`;
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

  function parseDurationToSeconds(durStr) {
    if (!durStr) return 180;
    if (typeof durStr === 'number') return durStr;
    const parts = durStr.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return (parts[0] * 60) + parts[1];
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    return 180;
  }

  function setupCrossfadeControls() {
    crossfadeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (myRole === 'guest') {
          showToast('🔒 Only Host can change Auto-DJ crossfade settings');
          return;
        }
        const cfSec = parseInt(btn.dataset.cf, 10);
        crossfadeDuration = cfSec;
        updateCrossfadeUi();
        showToast(cfSec === 0 ? '🔀 Auto-DJ Crossfade: DISABLED' : `🔀 Auto-DJ Crossfade: ${cfSec}s Smooth Blend`);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'set_crossfade',
            crossfadeSec: cfSec
          }));
        }
      });
    });
  }

  function updateCrossfadeUi() {
    crossfadeButtons.forEach(btn => {
      const cfSec = parseInt(btn.dataset.cf, 10);
      if (cfSec === crossfadeDuration) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function setupRadioStations() {
    radioCards.forEach(card => {
      card.addEventListener('click', () => {
        if (myRole === 'guest') {
          showToast('🔒 Only Host can change 24/7 Live Radio stations');
          return;
        }
        const stationId = card.dataset.stationId;
        const stationTitle = card.dataset.stationTitle;
        const stationArtist = card.dataset.stationArtist;

        radioCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        playCustomYouTubeVideo(stationId, `${stationTitle} (${stationArtist})`, true);
        showToast(`📻 Live 24/7 Radio Tuned: ${stationTitle}`);
      });
    });
  }

  function setupJukeboxQueue() {
    if (btnJukeboxPlayNext) {
      btnJukeboxPlayNext.addEventListener('click', () => {
        if (myRole === 'guest') {
          showToast('🔒 Only Host can force play next queued song');
          return;
        }
        if (currentQueue.length === 0) {
          showToast('🗳️ Queue is empty! Add songs first.');
          return;
        }
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'queue_pop_next',
            crossfadeSec: crossfadeDuration
          }));
        }
      });
    }

    if (btnDashboardQueueClear) {
      btnDashboardQueueClear.addEventListener('click', () => {
        if (myRole === 'guest') {
          showToast('🔒 Only Host can clear the upcoming queue');
          return;
        }
        if (currentQueue.length === 0) return;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'queue_clear' }));
          showToast('🗑️ Cleared Upcoming Queue');
        }
      });
    }

    if (btnUpNextSkip) {
      btnUpNextSkip.addEventListener('click', () => {
        if (myRole === 'guest') {
          showToast('🔒 Only Host can skip to next queued song');
          return;
        }
        if (currentQueue && currentQueue.length > 0) {
          const nextTitle = currentQueue[0].track ? currentQueue[0].track.title : 'Next Song';
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'queue_pop_next',
              crossfadeSec: crossfadeDuration
            }));
            showToast(`⏭️ Playing Next: "${nextTitle}"`);
          }
        }
      });
    }

    if (btnJukeboxSearch && jukeboxSearchInput) {
      const runJukeboxSearch = () => {
        const q = jukeboxSearchInput.value.trim();
        if (!q) return;
        if (jukeboxSearchResults) {
          jukeboxSearchResults.style.display = 'flex';
          fetchYouTubeResults(q, jukeboxSearchResults);
        }
      };

      btnJukeboxSearch.addEventListener('click', (e) => {
        e.preventDefault();
        runJukeboxSearch();
      });

      jukeboxSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          runJukeboxSearch();
        }
      });
    }
  }

  function setupAutoPlayControls() {
    const toggleAutoplay = document.getElementById('toggle-autoplay');
    const autoplayLabelText = document.getElementById('autoplay-label-text');
    if (toggleAutoplay) {
      toggleAutoplay.addEventListener('change', () => {
        isAutoPlayActive = toggleAutoplay.checked;
        const pill = toggleAutoplay.closest('.autoplay-toggle-pill');
        if (pill) {
          pill.classList.toggle('off', !isAutoPlayActive);
        }
        if (autoplayLabelText) {
          autoplayLabelText.textContent = isAutoPlayActive ? '✨ Auto-Play: ON' : '✨ Auto-Play: OFF';
        }
        showToast(isAutoPlayActive ? '✨ Auto-Play: ENABLED (Infinite Related Songs)' : '✨ Auto-Play: DISABLED');
      });
    }
  }

  function recordTrackInSessionHistory(track) {
    if (!track) return;
    if (track.id) sessionPlayedHistory.add(String(track.id));
    if (track.youtubeVideoId) sessionPlayedHistory.add(String(track.youtubeVideoId));
    if (track.title) sessionPlayedHistory.add(track.title.toLowerCase().trim());
  }

  async function playSmartAutoRecommendedTrack(lastTrack) {
    if (myRole !== 'host' || !isAutoPlayActive || isFetchingAutoRecommendation) return;
    isFetchingAutoRecommendation = true;

    try {
      if (!lastTrack) {
        if (tracks && tracks.length > 0) {
          const unplayed = tracks.filter(t => !sessionPlayedHistory.has(String(t.id)) && !sessionPlayedHistory.has(t.title.toLowerCase().trim()));
          const candidatePool = unplayed.length > 0 ? unplayed : tracks;
          const chosen = candidatePool[Math.floor(Math.random() * candidatePool.length)];
          broadcastAutoTrack(chosen);
        }
        return;
      }

      // If last track was YouTube:
      if (lastTrack.type === 'youtube' || lastTrack.youtubeVideoId) {
        const rawTitle = lastTrack.title || '';
        const rawArtist = lastTrack.artist || '';

        // Clean title & artist of common tags
        const cleanTitle = rawTitle
          .replace(/\(Official.*?\)/gi, '')
          .replace(/\[Official.*?\]/gi, '')
          .replace(/\(Audio.*?\)/gi, '')
          .replace(/\(Lyric.*?\)/gi, '')
          .replace(/\(Video.*?\)/gi, '')
          .replace(/4K|HD|1080p|MV|HQ/gi, '')
          .replace(/feat\..*|ft\..*/gi, '')
          .trim();

        const cleanArtist = rawArtist
          .replace(/VEVO|Topic|Official|Channel/gi, '')
          .replace(/ - Topic/gi, '')
          .trim();

        let detectedMood = 'chill';
        if (atmosphereEngine && typeof atmosphereEngine.detectThemeAndMood === 'function') {
          const moodInfo = atmosphereEngine.detectThemeAndMood(cleanTitle, cleanArtist);
          detectedMood = moodInfo.keyword || moodInfo.theme || 'chill';
        }

        // Varied smart queries cascade to discover related unplayed songs
        const queries = [
          cleanArtist ? `${cleanArtist} songs` : `${cleanTitle} radio`,
          cleanArtist ? `${cleanArtist} top hits mix` : `${cleanTitle} similar songs`,
          `${cleanTitle} radio playlist`,
          `${detectedMood} vibe music songs playlist`
        ];

        let foundCandidate = null;
        for (const q of queries) {
          try {
            const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            if (data && data.results && data.results.length > 0) {
              const unplayedResults = data.results.filter(v => {
                const vid = String(v.id);
                const vtitle = (v.title || '').toLowerCase().trim();
                return !sessionPlayedHistory.has(vid) && !sessionPlayedHistory.has(vtitle) && vid !== lastTrack.youtubeVideoId;
              });

              if (unplayedResults.length > 0) {
                // Select a random candidate from top unplayed matches for natural radio discovery
                const poolSize = Math.min(6, unplayedResults.length);
                const picked = unplayedResults[Math.floor(Math.random() * poolSize)];

                let durationSec = 210;
                if (picked.duration && picked.duration.includes(':')) {
                  const parts = picked.duration.split(':').map(Number);
                  if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
                  else if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
                }

                foundCandidate = {
                  id: `yt_${picked.id}`,
                  title: picked.title,
                  artist: picked.channel || cleanArtist || 'YouTube Music',
                  duration: durationSec,
                  type: 'youtube',
                  youtubeVideoId: picked.id,
                  albumArt: picked.thumbnail,
                  genre: detectedMood
                };
                break;
              }
            }
          } catch (e) {
            console.warn('Auto recommendation query error:', e);
          }
        }

        if (foundCandidate) {
          showToast(`📻 Auto-Play: Playing "${foundCandidate.title.substring(0, 28)}..." (Related to ${cleanArtist || cleanTitle})`);
          broadcastAutoTrack(foundCandidate);
          return;
        }
      }

      // If library track or YouTube search fallback:
      if (tracks && tracks.length > 0) {
        const sameArtist = tracks.filter(t => 
          t.artist && lastTrack.artist && 
          t.artist.toLowerCase() === lastTrack.artist.toLowerCase() &&
          !sessionPlayedHistory.has(String(t.id))
        );

        const sameGenre = tracks.filter(t =>
          t.genre && lastTrack.genre &&
          t.genre.toLowerCase() === lastTrack.genre.toLowerCase() &&
          !sessionPlayedHistory.has(String(t.id))
        );

        const unplayedAll = tracks.filter(t => !sessionPlayedHistory.has(String(t.id)));

        let pool = sameArtist.length > 0 ? sameArtist : (sameGenre.length > 0 ? sameGenre : unplayedAll);
        if (pool.length === 0) {
          sessionPlayedHistory.clear();
          if (lastTrack.id) sessionPlayedHistory.add(String(lastTrack.id));
          pool = tracks.filter(t => t.id !== lastTrack.id);
        }

        const chosen = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : tracks[0];
        if (chosen) {
          showToast(`📻 Auto-Play: Playing "${chosen.title}" by ${chosen.artist}`);
          broadcastAutoTrack(chosen);
          return;
        }
      }
    } finally {
      setTimeout(() => {
        isFetchingAutoRecommendation = false;
      }, 1500);
    }
  }

  function broadcastAutoTrack(track) {
    if (!track) return;
    currentTrack = track;
    recordTrackInSessionHistory(currentTrack);
    updateTrackUi(currentTrack);

    if (currentTrack.type === 'youtube' && currentTrack.youtubeVideoId) {
      handleYouTubeTrackChange(currentTrack.youtubeVideoId, true);
    } else if (currentTrack.url && audioEngine.ctx) {
      audioEngine.loadTrack(currentTrack.url).then(() => {
        audioEngine.play();
        setPlayButtonState(true);
      });
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'change_track',
        track: currentTrack,
        autoplay: true,
        isAutoTransition: true,
        crossfadeSec: crossfadeDuration
      }));
    }
  }

  function addTrackToQueue(track) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'queue_add',
        track: track
      }));
      showToast(`🗳️ Added to Upvote Queue: ${track.title}`);
    }
  }

  function updateUpNextPreview() {
    if (!upNextBanner) return;
    if (!currentQueue || currentQueue.length === 0) {
      upNextBanner.style.display = 'none';
      return;
    }

    const nextItem = currentQueue[0];
    const track = nextItem.track || {};
    upNextBanner.style.display = 'flex';
    if (upNextThumb) {
      upNextThumb.src = track.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSIzNiI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzIyMiIvPjwvc3ZnPg==';
    }
    if (upNextTitle) {
      upNextTitle.textContent = track.title || 'Unknown Title';
    }
    if (upNextSubtitle) {
      const addedByText = nextItem.addedBy ? ` • Added by ${nextItem.addedBy}` : '';
      upNextSubtitle.textContent = `${track.artist || 'YouTube'}${addedByText}`;
    }
    if (upNextVotesBadge) {
      upNextVotesBadge.textContent = `🔥 ${nextItem.votes > 0 ? '+' : ''}${nextItem.votes} ${Math.abs(nextItem.votes) === 1 ? 'vote' : 'votes'}`;
    }
  }

  function renderDashboardQueue() {
    if (dashboardQueueCount) {
      dashboardQueueCount.textContent = `${currentQueue.length} ${currentQueue.length === 1 ? 'Song' : 'Songs'}`;
    }

    if (!dashboardQueueScroll) return;

    if (!currentQueue || currentQueue.length === 0) {
      dashboardQueueScroll.innerHTML = `
        <div class="upcoming-queue-empty">
          <span style="font-size:1.2rem; opacity:0.8;">🎶</span>
          <span>No upcoming songs in queue. Click <strong>+ Queue</strong> on any YouTube song to add!</span>
        </div>
      `;
      return;
    }

    dashboardQueueScroll.innerHTML = '';

    currentQueue.forEach((item, index) => {
      const isRank1 = index === 0;
      const track = item.track || item || {};
      const title = track.title || item.title || 'Unknown Title';
      const artist = track.artist || item.artist || 'YouTube';
      const thumbnail = track.thumbnail || item.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSIzNiI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzIyMiIvPjwvc3ZnPg==';
      const videoId = track.youtubeVideoId || track.id || item.youtubeVideoId || item.id || '';
      const addedBy = item.addedBy || 'Guest';
      const votes = typeof item.votes === 'number' ? item.votes : 1;
      const queueId = item.queueId || '';

      const row = document.createElement('div');
      row.className = `queue-dash-card ${isRank1 ? 'rank-1' : ''}`;
      row.innerHTML = `
        <div class="queue-dash-rank">${isRank1 ? '👑' : '#' + (index + 1)}</div>
        <img src="${thumbnail}" class="queue-dash-thumb" alt="Thumb">
        <div class="queue-dash-info">
          <div class="queue-dash-title">${title}</div>
          <div class="queue-dash-sub">${artist} • Added by ${addedBy}</div>
        </div>
        <button class="queue-dash-vote-btn" title="Upvote Song">
          <span>🔥</span>
          <span>${votes > 0 ? '+' : ''}${votes}</span>
        </button>
        ${myRole === 'host' ? `
          <button class="queue-dash-play-btn" title="Play This Song Now">Play</button>
          <button class="queue-dash-remove-btn" title="Remove">✕</button>
        ` : (item.addedByPeerId === myPeerId ? `
          <button class="queue-dash-remove-btn" title="Remove">✕</button>
        ` : '')}
      `;

      // Upvote click
      const voteBtn = row.querySelector('.queue-dash-vote-btn');
      if (voteBtn) {
        voteBtn.addEventListener('click', () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'queue_vote',
              queueId: queueId,
              direction: 'up'
            }));
          }
        });
      }

      // Host Play Now
      const playBtn = row.querySelector('.queue-dash-play-btn');
      if (playBtn) {
        playBtn.addEventListener('click', () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'queue_remove',
              queueId: queueId
            }));
            playCustomYouTubeVideo(videoId, title, true);
          }
        });
      }

      // Remove
      const removeBtn = row.querySelector('.queue-dash-remove-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'queue_remove',
              queueId: queueId
            }));
          }
        });
      }

      dashboardQueueScroll.appendChild(row);
    });
  }


  function renderJukeboxQueue() {
    if (queueCountDisplay) queueCountDisplay.textContent = currentQueue.length;
    updateUpNextPreview();
    renderDashboardQueue();

    if (!jukeboxQueueList) return;

    if (currentQueue.length === 0) {
      jukeboxQueueList.innerHTML = `
        <div class="queue-empty-state">
          <div style="font-size:2rem; margin-bottom:8px;">🗳️</div>
          <div style="font-weight:600; color:#fff; margin-bottom:4px;">The Party Queue is Empty</div>
          <div style="font-size:0.75rem; color:var(--text-tertiary);">Search any YouTube song above or in the Studio to add it to the live upvote queue!</div>
        </div>
      `;
      return;
    }

    jukeboxQueueList.innerHTML = '';

    currentQueue.forEach((item, index) => {
      const isUpvotedByMe = (item.upvoterIds || []).includes(myPeerId);
      const isDownvotedByMe = (item.downvoterIds || []).includes(myPeerId);
      const isRank1 = index === 0;

      const card = document.createElement('div');
      card.className = `queue-item-card ${isRank1 ? 'rank-1' : ''}`;
      card.innerHTML = `
        <div class="queue-rank-badge">${isRank1 ? '👑' : '#' + (index + 1)}</div>
        <img src="${item.track.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSIzNiI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzIyMiIvPjwvc3ZnPg=='}" class="queue-item-thumb" alt="Thumb">
        <div class="queue-item-meta">
          <div class="queue-item-title">${item.track.title}</div>
          <div class="queue-item-details">
            <span>${item.track.artist || 'YouTube'}</span>
            <span>•</span>
            <span style="color:var(--neon-cyan);">Added by ${item.addedBy || 'Guest'}</span>
          </div>
        </div>
        <div class="queue-vote-box">
          <button class="btn-vote ${isUpvotedByMe ? 'active-up' : ''}" title="Upvote" data-dir="up">🔥</button>
          <span class="vote-score">${item.votes > 0 ? '+' : ''}${item.votes}</span>
          <button class="btn-vote ${isDownvotedByMe ? 'active-down' : ''}" title="Downvote" data-dir="down">👎</button>
        </div>
        ${myRole === 'host' ? `
          <button class="btn-queue-action btn-play-now" title="Play Immediately">▶</button>
          <button class="btn-queue-action btn-remove-item" title="Remove">✕</button>
        ` : (item.addedByPeerId === myPeerId ? `
          <button class="btn-queue-action btn-remove-item" title="Remove">✕</button>
        ` : '')}
      `;

      // Vote Handlers
      const btnUp = card.querySelector('.btn-vote[data-dir="up"]');
      const btnDown = card.querySelector('.btn-vote[data-dir="down"]');

      if (btnUp) {
        btnUp.addEventListener('click', () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'queue_vote',
              queueId: item.queueId,
              direction: 'up'
            }));
          }
        });
      }

      if (btnDown) {
        btnDown.addEventListener('click', () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'queue_vote',
              queueId: item.queueId,
              direction: 'down'
            }));
          }
        });
      }

      // Host Play Now handler
      const btnPlayNow = card.querySelector('.btn-play-now');
      if (btnPlayNow) {
        btnPlayNow.addEventListener('click', () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'queue_remove',
              queueId: item.queueId
            }));
            playCustomYouTubeVideo(item.track.youtubeVideoId, item.track.title, true);
          }
        });
      }

      // Remove handler
      const btnRemove = card.querySelector('.btn-remove-item');
      if (btnRemove) {
        btnRemove.addEventListener('click', () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'queue_remove',
              queueId: item.queueId
            }));
          }
        });
      }

      jukeboxQueueList.appendChild(card);
    });
  }



  function createToastContainer() {
    const c = document.createElement('div');
    c.id = 'toast-rack';
    c.className = 'toast-rack';
    document.body.appendChild(c);
    return c;
  }
});

