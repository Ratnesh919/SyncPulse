/**
 * AtmosphereEngine: True 3D Dual-Layer (Above & Below Cards) FX Engine
 * 
 * Features:
 * - Every effect is split into 2 distinct rendering passes:
 *   1. Underlay (Behind cards - z-index: 0): Ambient depth, softer particles, background mist, background spectrum.
 *   2. Overlay (Above cards - z-index: 998): Crisp foreground particles, shooting stars, falling snow/rain, lightning bolts.
 * - Dynamic Stars: 3D drifting cosmic starfield with high-speed shooting stars (comets) leaving glowing light trails!
 */
class AtmosphereEngine {
  constructor(underlayCanvas, overlayCanvas, audioEngine) {
    this.underlayCanvas = underlayCanvas;
    this.overlayCanvas = overlayCanvas;
    this.uCtx = this.underlayCanvas ? this.underlayCanvas.getContext('2d') : null;
    this.oCtx = this.overlayCanvas ? this.overlayCanvas.getContext('2d') : null;
    this.audioEngine = audioEngine;

    this.currentTheme = 'stars';
    
    // Dual particle banks: Background (behind cards) and Foreground (above cards)
    this.bgParticles = [];
    this.fgParticles = [];
    this.splashes = [];
    this.lightningBolts = [];
    this.shootingStars = [];
    this.flashOpacity = 0;
    this.lastLightningTime = 0;
    this.lastShootingStarTime = 0;

    this.animId = null;
    this.isRunning = false;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (this.underlayCanvas) {
      this.underlayCanvas.width = this.width * dpr;
      this.underlayCanvas.height = this.height * dpr;
      this.underlayCanvas.style.width = `${this.width}px`;
      this.underlayCanvas.style.height = `${this.height}px`;
      this.uCtx.scale(dpr, dpr);
    }

    if (this.overlayCanvas) {
      this.overlayCanvas.width = this.width * dpr;
      this.overlayCanvas.height = this.height * dpr;
      this.overlayCanvas.style.width = `${this.width}px`;
      this.overlayCanvas.style.height = `${this.height}px`;
      this.oCtx.scale(dpr, dpr);
    }

    this.initParticles();
  }

  setTheme(themeName) {
    this.currentTheme = themeName;
    this.bgParticles = [];
    this.fgParticles = [];
    this.splashes = [];
    this.lightningBolts = [];
    this.shootingStars = [];
    this.flashOpacity = 0;
    this.initParticles();
    this.applyThemeColors(themeName);
  }

  detectThemeAndMood(title, artist = '') {
    const text = `${title || ''} ${artist || ''}`.toLowerCase();

    // 1. Rain / Monsoon / Baarish
    if (/\b(barsaat|baarish|barish|rain|rainy|monsoon|rimjhim|boond|boondein|water|badal|drizzle|cloud|megha|sawan|saawan|barkha|tip tip)\b/i.test(text) ||
        text.includes('barsaat') || text.includes('baarish') || text.includes('barish') || text.includes('rain')) {
      return { theme: 'rain', moodName: '🌧️ Baarish / Rain', keyword: 'Baarish' };
    }

    // 2. Romantic / Love / Dil / Ishq
    if (/\b(romantic|romance|love|pyar|pyaar|dil|ishq|mohabbat|deewana|sanam|janam|jaan|humsafar|darshan raval|arijit|kesariya|shayari|valentine|crush|kiss|couple|terey bina|tum hi ho|aashiqui|humraaz|pehle|pehla nasha|sweetheart|romantic)\b/i.test(text) ||
        text.includes('romantic') || text.includes('love') || text.includes('ishq') || text.includes('pyaar') || text.includes('dil') || text.includes('darshan raval')) {
      return { theme: 'hearts', moodName: '💖 Romantic / Love', keyword: 'Romantic' };
    }

    // 3. Sad / Melancholy / Heartbreak / Cold / Snow
    if (/\b(sad|alone|lonely|tanha|dard|judaai|tuta dil|broken|heartbreak|cry|crying|tears|goodbye|alvida|channa mereya|bekhayali|bewafa|depressed|pain|dukh|gham|ghamgeen|snow|winter|ice|cold|frost|baraf|barf|frozen|glacier|christmas)\b/i.test(text) ||
        text.includes('sad') || text.includes('lonely') || text.includes('dard') || text.includes('broken')) {
      return { theme: 'snow', moodName: '❄️ Sad / Melancholy', keyword: 'Sad' };
    }

    // 4. Thunder / Storm / Heavy / Intense / Phonk
    if (/\b(thunder|storm|lightning|bijli|toofan|thunderstorm|heavy|dark|rage|phonk|metal|hardcore|epic|battle|war|power|intense|drift|sigma|demon|danger|electric)\b/i.test(text)) {
      return { theme: 'thunder', moodName: '⚡ Thunder / Heavy', keyword: 'Thunder' };
    }

    // 5. Fire / Sparks / Rock / Energy / Gym / Workout
    if (/\b(fire|sparks|spark|flame|aag|jalwa|josh|rock|guitar|energy|hype|workout|gym|motivation|beast|ignite|blaze|heat|burn|sholay|dhamaka)\b/i.test(text)) {
      return { theme: 'sparks', moodName: '🔥 High Energy / Sparks', keyword: 'Energy' };
    }

    // 6. Equalizer / EDM / Club / Bass / Party
    if (/\b(equalizer|eq|bass|drop|edm|club|electro|party|trap|remix|dj|mashup|dance|house|techno|rave|disco|festival|bounce|dubstep|hardstyle|banger)\b/i.test(text)) {
      return { theme: 'equalizer', moodName: '📊 EDM / Bass Booster', keyword: 'EDM / Bass' };
    }

    // 7. Stars / Lofi / Cosmic / Chill / Night
    if (/\b(night|star|stars|sky|moon|chand|raat|cosmic|space|galaxy|lofi|lo-fi|chill|sleep|relax|dream|midnight|slowed|reverb|peace|meditation|ambient|aesthetic|sunset)\b/i.test(text)) {
      return { theme: 'stars', moodName: '✨ Cosmic / Lofi Stars', keyword: 'Cosmic / Lofi' };
    }

    // Default Fallback
    return { theme: 'stars', moodName: '✨ Cosmic Stars', keyword: 'Ambient' };
  }

  detectThemeFromTitle(title) {
    return this.detectThemeAndMood(title).theme;
  }

  applyThemeColors(theme) {
    // Keep core UI tokens rock-solid & clean so song changes never disrupt UI/UX buttons or layout
  }



  initParticles() {
    this.bgParticles = [];
    this.fgParticles = [];

    let bgCount = 50;
    let fgCount = 40;

    if (this.currentTheme === 'stars') {
      bgCount = 90; // Deep cosmic stars
      fgCount = 45; // Moving foreground diamond stars
    } else if (this.currentTheme === 'snow') {
      bgCount = 60;
      fgCount = 40;
    } else if (this.currentTheme === 'rain') {
      bgCount = 70;
      fgCount = 50;
    } else if (this.currentTheme === 'thunder') {
      bgCount = 50;
      fgCount = 40;
    } else if (this.currentTheme === 'hearts') {
      bgCount = 35;
      fgCount = 25;
    } else if (this.currentTheme === 'equalizer') {
      bgCount = 30;
      fgCount = 20;
    } else if (this.currentTheme === 'sparks') {
      bgCount = 40;
      fgCount = 35;
    }

    for (let i = 0; i < bgCount; i++) {
      this.bgParticles.push(this.createParticle(true));
    }
    for (let i = 0; i < fgCount; i++) {
      this.fgParticles.push(this.createParticle(false));
    }
  }

  createParticle(isBg) {
    if (this.currentTheme === 'stars') {
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: isBg ? (0.8 + Math.random() * 1.5) : (1.8 + Math.random() * 2.2),
        speedX: isBg ? (0.15 + Math.random() * 0.25) : (0.4 + Math.random() * 0.7),
        speedY: isBg ? (0.05 + Math.random() * 0.15) : (0.15 + Math.random() * 0.3),
        alpha: isBg ? (0.2 + Math.random() * 0.5) : (0.5 + Math.random() * 0.5),
        twinkleSpeed: 0.02 + Math.random() * 0.04,
        twinklePhase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.4 ? '#ffffff' : (Math.random() > 0.5 ? '#00f2fe' : '#c084fc')
      };
    } else if (this.currentTheme === 'snow') {
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: isBg ? (1.0 + Math.random() * 2.2) : (2.5 + Math.random() * 4.0),
        speedY: isBg ? (0.5 + Math.random() * 0.9) : (1.2 + Math.random() * 1.8),
        speedX: (Math.random() - 0.5) * 0.8,
        wobbleSpeed: 0.02 + Math.random() * 0.03,
        wobblePhase: Math.random() * Math.PI * 2,
        alpha: isBg ? (0.2 + Math.random() * 0.35) : (0.5 + Math.random() * 0.45),
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        isFlake: !isBg && Math.random() > 0.3
      };
    } else if (this.currentTheme === 'rain') {
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        len: isBg ? (8 + Math.random() * 10) : (14 + Math.random() * 18),
        speedY: isBg ? (8 + Math.random() * 6) : (13 + Math.random() * 9),
        speedX: -1.5 + Math.random() * 0.5,
        alpha: isBg ? (0.15 + Math.random() * 0.25) : (0.35 + Math.random() * 0.45),
        width: isBg ? 0.8 : 1.4
      };
    } else if (this.currentTheme === 'thunder') {
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        len: isBg ? 10 + Math.random() * 12 : 18 + Math.random() * 22,
        speedY: isBg ? 10 + Math.random() * 6 : 16 + Math.random() * 10,
        speedX: -2.5 + Math.random() * 0.8,
        alpha: isBg ? 0.15 + Math.random() * 0.25 : 0.35 + Math.random() * 0.45
      };
    } else if (this.currentTheme === 'hearts') {
      return {
        x: Math.random() * this.width,
        y: this.height + Math.random() * 60,
        size: isBg ? (5 + Math.random() * 6) : (9 + Math.random() * 10),
        speedY: -(isBg ? (0.6 + Math.random() * 0.8) : (1.1 + Math.random() * 1.3)),
        speedX: (Math.random() - 0.5) * 0.6,
        wobbleSpeed: 0.025 + Math.random() * 0.025,
        wobblePhase: Math.random() * Math.PI * 2,
        alpha: isBg ? (0.2 + Math.random() * 0.3) : (0.45 + Math.random() * 0.45),
        rot: (Math.random() - 0.5) * 0.3
      };
    } else if (this.currentTheme === 'equalizer') {
      return {
        x: Math.random() * this.width,
        y: this.height - Math.random() * 180,
        size: isBg ? 2 + Math.random() * 3 : 3 + Math.random() * 4,
        speedY: -(0.6 + Math.random() * 1.4),
        alpha: isBg ? 0.2 + Math.random() * 0.3 : 0.4 + Math.random() * 0.5
      };
    } else {
      // Sparks
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: isBg ? 1.2 + Math.random() * 2 : 2 + Math.random() * 3,
        speedY: -(isBg ? (1 + Math.random() * 2) : (2 + Math.random() * 3.5)),
        speedX: (Math.random() - 0.5) * 2.2,
        alpha: isBg ? 0.25 + Math.random() * 0.35 : 0.45 + Math.random() * 0.5,
        life: Math.random() * 80
      };
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this.animId) cancelAnimationFrame(this.animId);
  }

  loop() {
    if (!this.isRunning) return;
    this.animId = requestAnimationFrame(() => this.loop());

    if (this.uCtx) this.uCtx.clearRect(0, 0, this.width, this.height);
    if (this.oCtx) this.oCtx.clearRect(0, 0, this.width, this.height);

    const freqData = this.audioEngine ? this.audioEngine.getFrequencyData() : new Uint8Array(0);
    let bassEnergy = 0;
    if (freqData.length > 0) {
      for (let i = 0; i < 6; i++) bassEnergy += freqData[i];
      bassEnergy = bassEnergy / 6 / 255;
    }

    // 1. Render UNDERLAY (Behind Cards)
    this.renderUnderlay(bassEnergy, freqData);

    // 2. Render OVERLAY (In front of and over Cards)
    this.renderOverlay(bassEnergy, freqData);
  }

  // ==========================================
  // UNDERLAY LAYER (BEHIND CARDS)
  // ==========================================
  renderUnderlay(bassEnergy, freqData) {
    if (!this.uCtx) return;

    if (this.currentTheme === 'stars') {
      this.drawUnderlayStars();
    } else if (this.currentTheme === 'snow') {
      this.drawUnderlaySnow();
    } else if (this.currentTheme === 'rain') {
      this.drawUnderlayRain();
    } else if (this.currentTheme === 'thunder') {
      this.drawUnderlayThunder(bassEnergy);
    } else if (this.currentTheme === 'hearts') {
      this.drawUnderlayHearts();
    } else if (this.currentTheme === 'equalizer') {
      this.drawUnderlayEqualizer(freqData);
    } else if (this.currentTheme === 'sparks') {
      this.drawUnderlaySparks();
    }
  }

  // ==========================================
  // OVERLAY LAYER (ABOVE & OVER CARDS)
  // ==========================================
  renderOverlay(bassEnergy, freqData) {
    if (!this.oCtx) return;

    if (this.currentTheme === 'stars') {
      this.drawOverlayStars();
    } else if (this.currentTheme === 'snow') {
      this.drawOverlaySnow();
    } else if (this.currentTheme === 'rain') {
      this.drawOverlayRain();
    } else if (this.currentTheme === 'thunder') {
      this.drawOverlayThunder(bassEnergy);
    } else if (this.currentTheme === 'hearts') {
      this.drawOverlayHearts();
    } else if (this.currentTheme === 'equalizer') {
      this.drawOverlayEqualizer(freqData);
    } else if (this.currentTheme === 'sparks') {
      this.drawOverlaySparks();
    }
  }

  // ------------------------------------------
  // 1. ✨ DYNAMIC STARS & SHOOTING STAR COMETS
  // ------------------------------------------
  drawUnderlayStars() {
    // Distant cosmic background stars drifting slowly behind cards
    for (let i = 0; i < this.bgParticles.length; i++) {
      const p = this.bgParticles[i];
      p.x += p.speedX;
      p.y += p.speedY;
      p.twinklePhase += p.twinkleSpeed;
      const alpha = p.alpha * (0.6 + Math.sin(p.twinklePhase) * 0.4);

      if (p.x > this.width) p.x = 0;
      if (p.y > this.height) p.y = 0;

      this.uCtx.globalAlpha = alpha;
      this.uCtx.fillStyle = p.color;
      this.uCtx.beginPath();
      this.uCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.uCtx.fill();
    }
    this.uCtx.globalAlpha = 1;
  }

  drawOverlayStars() {
    // Dynamic Shooting Stars / Comets crossing above cards
    const now = performance.now();
    if (now - this.lastShootingStarTime > 2400 && Math.random() < 0.6) {
      this.shootingStars.push({
        x: Math.random() * this.width * 0.8,
        y: Math.random() * (this.height * 0.4),
        len: 120 + Math.random() * 100,
        speed: 16 + Math.random() * 12,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
        alpha: 1.0,
        color: Math.random() > 0.5 ? '#00f2fe' : '#ffffff'
      });
      this.lastShootingStarTime = now;
    }

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const s = this.shootingStars[i];
      const tailX = s.x - Math.cos(s.angle) * s.len;
      const tailY = s.y - Math.sin(s.angle) * s.len;

      const grad = this.oCtx.createLinearGradient(tailX, tailY, s.x, s.y);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.7, s.color);
      grad.addColorStop(1, '#ffffff');

      this.oCtx.globalAlpha = s.alpha;
      this.oCtx.strokeStyle = grad;
      this.oCtx.lineWidth = 2.5;
      this.oCtx.beginPath();
      this.oCtx.moveTo(tailX, tailY);
      this.oCtx.lineTo(s.x, s.y);
      this.oCtx.stroke();

      // Glowing Comet Head
      this.oCtx.fillStyle = '#ffffff';
      this.oCtx.shadowColor = s.color;
      this.oCtx.shadowBlur = 15;
      this.oCtx.beginPath();
      this.oCtx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
      this.oCtx.fill();
      this.oCtx.shadowBlur = 0;

      s.x += Math.cos(s.angle) * s.speed;
      s.y += Math.sin(s.angle) * s.speed;
      s.alpha -= 0.02;

      if (s.alpha <= 0 || s.x > this.width + 100 || s.y > this.height + 100) {
        this.shootingStars.splice(i, 1);
      }
    }

    // Dynamic Foreground Glinting Stars moving over cards
    for (let i = 0; i < this.fgParticles.length; i++) {
      const p = this.fgParticles[i];
      p.x += p.speedX;
      p.y += p.speedY;
      p.twinklePhase += p.twinkleSpeed;
      const alpha = p.alpha * (0.5 + Math.sin(p.twinklePhase) * 0.5);

      if (p.x > this.width) p.x = 0;
      if (p.y > this.height) p.y = 0;

      this.oCtx.globalAlpha = alpha;
      this.oCtx.fillStyle = '#ffffff';
      this.oCtx.shadowColor = p.color;
      this.oCtx.shadowBlur = 8;
      this.oCtx.beginPath();
      this.oCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.oCtx.fill();

      // 4-point Diamond Crosshair Sparkle
      this.oCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      this.oCtx.lineWidth = 0.8;
      this.oCtx.beginPath();
      this.oCtx.moveTo(p.x - 5, p.y);
      this.oCtx.lineTo(p.x + 5, p.y);
      this.oCtx.moveTo(p.x, p.y - 5);
      this.oCtx.lineTo(p.x, p.y + 5);
      this.oCtx.stroke();
    }
    this.oCtx.shadowBlur = 0;
    this.oCtx.globalAlpha = 1;
  }

  // ------------------------------------------
  // 2. ❄️ DUAL LAYER SNOW
  // ------------------------------------------
  drawUnderlaySnow() {
    this.uCtx.fillStyle = 'rgba(180, 220, 255, 0.6)';
    for (let i = 0; i < this.bgParticles.length; i++) {
      const p = this.bgParticles[i];
      p.wobblePhase += p.wobbleSpeed;
      p.y += p.speedY;
      p.x += p.speedX + Math.sin(p.wobblePhase) * 0.5;

      this.uCtx.globalAlpha = p.alpha;
      this.uCtx.beginPath();
      this.uCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.uCtx.fill();

      if (p.y > this.height) {
        this.bgParticles[i] = this.createParticle(true);
        this.bgParticles[i].y = -10;
      }
    }
    this.uCtx.globalAlpha = 1;
  }

  drawOverlaySnow() {
    this.oCtx.fillStyle = '#ffffff';
    for (let i = 0; i < this.fgParticles.length; i++) {
      const p = this.fgParticles[i];
      p.wobblePhase += p.wobbleSpeed;
      p.rotation += p.rotSpeed;
      p.y += p.speedY;
      p.x += p.speedX + Math.sin(p.wobblePhase) * 0.8;

      this.oCtx.globalAlpha = p.alpha;

      if (p.isFlake && p.size > 2.5) {
        // Detailed 6-point crystalline snowflake over cards
        this.oCtx.save();
        this.oCtx.translate(p.x, p.y);
        this.oCtx.rotate(p.rotation);
        this.oCtx.strokeStyle = 'rgba(230, 245, 255, 0.95)';
        this.oCtx.lineWidth = 1.1;

        for (let a = 0; a < 3; a++) {
          this.oCtx.beginPath();
          this.oCtx.moveTo(-p.size, 0);
          this.oCtx.lineTo(p.size, 0);
          this.oCtx.stroke();
          this.oCtx.rotate(Math.PI / 3);
        }
        this.oCtx.restore();
      } else {
        this.oCtx.beginPath();
        this.oCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.oCtx.fill();
      }

      if (p.y > this.height) {
        this.fgParticles[i] = this.createParticle(false);
        this.fgParticles[i].y = -15;
      }
    }
    this.oCtx.globalAlpha = 1;
  }

  // ------------------------------------------
  // 3. 🌧️ DUAL LAYER RAIN
  // ------------------------------------------
  drawUnderlayRain() {
    this.uCtx.strokeStyle = 'rgba(0, 198, 255, 0.4)';
    this.uCtx.lineWidth = 0.9;
    for (let i = 0; i < this.bgParticles.length; i++) {
      const p = this.bgParticles[i];
      this.uCtx.globalAlpha = p.alpha;
      this.uCtx.beginPath();
      this.uCtx.moveTo(p.x, p.y);
      this.uCtx.lineTo(p.x + p.speedX * 2, p.y + p.len);
      this.uCtx.stroke();

      p.y += p.speedY;
      p.x += p.speedX;

      if (p.y > this.height) {
        this.bgParticles[i] = this.createParticle(true);
        this.bgParticles[i].y = -10;
      }
    }
    this.uCtx.globalAlpha = 1;
  }

  drawOverlayRain() {
    this.oCtx.strokeStyle = '#00f2fe';
    this.oCtx.lineCap = 'round';

    for (let i = 0; i < this.fgParticles.length; i++) {
      const p = this.fgParticles[i];
      this.oCtx.globalAlpha = p.alpha;
      this.oCtx.lineWidth = p.width;
      this.oCtx.beginPath();
      this.oCtx.moveTo(p.x, p.y);
      this.oCtx.lineTo(p.x + p.speedX * 2, p.y + p.len);
      this.oCtx.stroke();

      p.y += p.speedY;
      p.x += p.speedX;

      if (p.y > this.height - 15) {
        if (Math.random() > 0.5) {
          this.splashes.push({
            x: p.x,
            y: this.height - Math.random() * 15,
            radius: 1,
            maxRadius: 10 + Math.random() * 8,
            alpha: 0.7
          });
        }
        this.fgParticles[i] = this.createParticle(false);
        this.fgParticles[i].y = -20;
      }
    }

    // Splash rings in foreground
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      this.oCtx.globalAlpha = s.alpha;
      this.oCtx.lineWidth = 1.2;
      this.oCtx.beginPath();
      this.oCtx.ellipse(s.x, s.y, s.radius * 2, s.radius * 0.7, 0, 0, Math.PI * 2);
      this.oCtx.stroke();

      s.radius += 0.5;
      s.alpha -= 0.04;
      if (s.alpha <= 0 || s.radius >= s.maxRadius) {
        this.splashes.splice(i, 1);
      }
    }
    this.oCtx.globalAlpha = 1;
  }

  // ------------------------------------------
  // 4. ⚡ DUAL LAYER THUNDER
  // ------------------------------------------
  triggerLightning() {
    this.flashOpacity = 0.9;
    const startX = Math.random() * this.width;
    const bolt = this.generateLightningBolt(startX, 0, startX + (Math.random() - 0.5) * 350, this.height * 0.88, 5);
    this.lightningBolts.push({ bolt, alpha: 1.0 });
  }

  generateLightningBolt(x1, y1, x2, y2, depth) {
    const segments = [];
    const build = (ax, ay, bx, by, d) => {
      if (d === 0) {
        segments.push({ x1: ax, y1: ay, x2: bx, y2: by });
        return;
      }
      const mx = (ax + bx) / 2 + (Math.random() - 0.5) * 50;
      const my = (ay + by) / 2;
      build(ax, ay, mx, my, d - 1);
      build(mx, my, bx, by, d - 1);

      if (Math.random() > 0.6 && d > 2) {
        const branchX = mx + (Math.random() - 0.5) * 90;
        const branchY = my + Math.random() * 80;
        build(mx, my, branchX, branchY, d - 2);
      }
    };
    build(x1, y1, x2, y2, depth);
    return segments;
  }

  drawUnderlayThunder(bassEnergy) {
    if (this.flashOpacity > 0.01) {
      this.uCtx.fillStyle = `rgba(168, 85, 247, ${this.flashOpacity * 0.3})`;
      this.uCtx.fillRect(0, 0, this.width, this.height);
      this.flashOpacity *= 0.88;
    }

    const now = performance.now();
    if ((bassEnergy > 0.72 || Math.random() < 0.007) && now - this.lastLightningTime > 1200) {
      this.triggerLightning();
      this.lastLightningTime = now;
    }

    // Background storm rain
    this.uCtx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
    this.uCtx.lineWidth = 1;
    for (let i = 0; i < this.bgParticles.length; i++) {
      const p = this.bgParticles[i];
      this.uCtx.globalAlpha = p.alpha;
      this.uCtx.beginPath();
      this.uCtx.moveTo(p.x, p.y);
      this.uCtx.lineTo(p.x + p.speedX * 2, p.y + p.len);
      this.uCtx.stroke();
      p.y += p.speedY;
      p.x += p.speedX;
      if (p.y > this.height) {
        this.bgParticles[i] = this.createParticle(true);
        this.bgParticles[i].y = -10;
      }
    }
    this.uCtx.globalAlpha = 1;
  }

  drawOverlayThunder(bassEnergy) {
    // Foreground storm rain over cards
    this.oCtx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
    this.oCtx.lineWidth = 1.3;
    for (let i = 0; i < this.fgParticles.length; i++) {
      const p = this.fgParticles[i];
      this.oCtx.globalAlpha = p.alpha;
      this.oCtx.beginPath();
      this.oCtx.moveTo(p.x, p.y);
      this.oCtx.lineTo(p.x + p.speedX * 2, p.y + p.len);
      this.oCtx.stroke();
      p.y += p.speedY;
      p.x += p.speedX;
      if (p.y > this.height) {
        this.fgParticles[i] = this.createParticle(false);
        this.fgParticles[i].y = -20;
      }
    }

    // Foreground Lightning strikes over cards
    for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
      const lb = this.lightningBolts[i];
      this.oCtx.strokeStyle = '#ffffff';
      this.oCtx.shadowColor = '#00f2fe';
      this.oCtx.shadowBlur = 24;
      this.oCtx.lineWidth = 2.8;
      this.oCtx.globalAlpha = lb.alpha;

      lb.bolt.forEach(seg => {
        this.oCtx.beginPath();
        this.oCtx.moveTo(seg.x1, seg.y1);
        this.oCtx.lineTo(seg.x2, seg.y2);
        this.oCtx.stroke();
      });

      lb.alpha -= 0.08;
      if (lb.alpha <= 0) {
        this.lightningBolts.splice(i, 1);
      }
    }
    this.oCtx.shadowBlur = 0;
    this.oCtx.globalAlpha = 1;
  }

  // ------------------------------------------
  // 5. 💖 DUAL LAYER HEARTS
  // ------------------------------------------
  drawUnderlayHearts() {
    this.uCtx.fillStyle = '#ff2d75';
    for (let i = 0; i < this.bgParticles.length; i++) {
      const p = this.bgParticles[i];
      p.wobblePhase += p.wobbleSpeed;
      p.y += p.speedY;
      p.x += p.speedX + Math.sin(p.wobblePhase) * 0.6;

      this.uCtx.globalAlpha = p.alpha;
      this.uCtx.save();
      this.uCtx.translate(p.x, p.y);
      this.uCtx.rotate(p.rot);

      const s = p.size / 10;
      this.uCtx.beginPath();
      this.uCtx.moveTo(0, 0);
      this.uCtx.bezierCurveTo(-5 * s, -5 * s, -10 * s, 2 * s, 0, 10 * s);
      this.uCtx.bezierCurveTo(10 * s, 2 * s, 5 * s, -5 * s, 0, 0);
      this.uCtx.fill();
      this.uCtx.restore();

      if (p.y < -30) {
        this.bgParticles[i] = this.createParticle(true);
      }
    }
    this.uCtx.globalAlpha = 1;
  }

  drawOverlayHearts() {
    this.oCtx.fillStyle = '#ff007f';
    for (let i = 0; i < this.fgParticles.length; i++) {
      const p = this.fgParticles[i];
      p.wobblePhase += p.wobbleSpeed;
      p.y += p.speedY;
      p.x += p.speedX + Math.sin(p.wobblePhase) * 0.9;

      this.oCtx.globalAlpha = p.alpha;
      this.oCtx.save();
      this.oCtx.translate(p.x, p.y);
      this.oCtx.rotate(p.rot + Math.sin(p.wobblePhase) * 0.15);

      const s = p.size / 10;
      this.oCtx.beginPath();
      this.oCtx.moveTo(0, 0);
      this.oCtx.bezierCurveTo(-5 * s, -5 * s, -10 * s, 2 * s, 0, 10 * s);
      this.oCtx.bezierCurveTo(10 * s, 2 * s, 5 * s, -5 * s, 0, 0);
      this.oCtx.shadowColor = '#ff007f';
      this.oCtx.shadowBlur = 14;
      this.oCtx.fill();
      this.oCtx.restore();

      if (p.y < -40) {
        this.fgParticles[i] = this.createParticle(false);
      }
    }
    this.oCtx.shadowBlur = 0;
    this.oCtx.globalAlpha = 1;
  }

  // ------------------------------------------
  // 6. 📊 DUAL LAYER EQUALIZER
  // ------------------------------------------
  drawUnderlayEqualizer(freqData) {
    if (!freqData || freqData.length === 0) return;
    const barCount = 56;
    const barWidth = this.width / barCount;
    const step = Math.floor(freqData.length / barCount) || 1;

    for (let i = 0; i < barCount; i++) {
      const val = (freqData[i * step] || 0) / 255;
      const barHeight = val * (this.height * 0.5);
      const x = i * barWidth;
      const y = this.height - barHeight;

      const grad = this.uCtx.createLinearGradient(0, y, 0, this.height);
      grad.addColorStop(0, 'rgba(0, 245, 160, 0.45)');
      grad.addColorStop(0.5, 'rgba(0, 240, 255, 0.2)');
      grad.addColorStop(1, 'rgba(121, 40, 202, 0.02)');

      this.uCtx.fillStyle = grad;
      this.uCtx.fillRect(x + 2, y, barWidth - 4, barHeight);

      // Glowing tip
      this.uCtx.fillStyle = '#00ff88';
      this.uCtx.fillRect(x + 2, y, barWidth - 4, 3);
    }
  }

  drawOverlayEqualizer(freqData) {
    // Floating glowing frequency orbs drifting in foreground above cards
    for (let i = 0; i < this.fgParticles.length; i++) {
      const p = this.fgParticles[i];
      p.y += p.speedY;

      this.oCtx.globalAlpha = p.alpha;
      this.oCtx.fillStyle = '#00f5a0';
      this.oCtx.shadowColor = '#00f5a0';
      this.oCtx.shadowBlur = 10;
      this.oCtx.beginPath();
      this.oCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.oCtx.fill();

      if (p.y < -10) {
        this.fgParticles[i] = this.createParticle(false);
      }
    }
    this.oCtx.shadowBlur = 0;
    this.oCtx.globalAlpha = 1;
  }

  // ------------------------------------------
  // 7. 🔥 DUAL LAYER SPARKS
  // ------------------------------------------
  drawUnderlaySparks() {
    this.uCtx.fillStyle = 'rgba(255, 0, 127, 0.5)';
    for (let i = 0; i < this.bgParticles.length; i++) {
      const p = this.bgParticles[i];
      p.y += p.speedY;
      p.x += p.speedX;

      this.uCtx.globalAlpha = p.alpha;
      this.uCtx.beginPath();
      this.uCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.uCtx.fill();

      if (p.y < -10) {
        this.bgParticles[i] = this.createParticle(true);
      }
    }
    this.uCtx.globalAlpha = 1;
  }

  drawOverlaySparks() {
    this.oCtx.fillStyle = '#00f0ff';
    for (let i = 0; i < this.fgParticles.length; i++) {
      const p = this.fgParticles[i];
      p.y += p.speedY;
      p.x += p.speedX;
      p.life++;

      this.oCtx.globalAlpha = p.alpha;
      this.oCtx.shadowColor = '#00f0ff';
      this.oCtx.shadowBlur = 8;
      this.oCtx.beginPath();
      this.oCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.oCtx.fill();

      if (p.y < -10 || p.life > 100) {
        this.fgParticles[i] = this.createParticle(false);
      }
    }
    this.oCtx.shadowBlur = 0;
    this.oCtx.globalAlpha = 1;
  }
}

window.AtmosphereEngine = AtmosphereEngine;
