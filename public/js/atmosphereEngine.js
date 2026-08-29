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

    this.uCtx = this.underlayCanvas ? this.underlayCanvas.getContext('2d', { alpha: true }) : null;
    this.oCtx = this.overlayCanvas ? this.overlayCanvas.getContext('2d', { alpha: true }) : null;
    
    if (this.uCtx) {
      this.uCtx.imageSmoothingEnabled = true;
      this.uCtx.imageSmoothingQuality = 'high';
    }
    if (this.oCtx) {
      this.oCtx.imageSmoothingEnabled = true;
      this.oCtx.imageSmoothingQuality = 'high';
    }

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

    if (this.underlayCanvas && this.uCtx) {
      this.underlayCanvas.width = this.width * dpr;
      this.underlayCanvas.height = this.height * dpr;
      this.underlayCanvas.style.width = `${this.width}px`;
      this.underlayCanvas.style.height = `${this.height}px`;
      this.uCtx.scale(dpr, dpr);
      this.uCtx.imageSmoothingEnabled = true;
      this.uCtx.imageSmoothingQuality = 'high';
    }

    if (this.overlayCanvas && this.oCtx) {
      this.overlayCanvas.width = this.width * dpr;
      this.overlayCanvas.height = this.height * dpr;
      this.overlayCanvas.style.width = `${this.width}px`;
      this.overlayCanvas.style.height = `${this.height}px`;
      this.oCtx.scale(dpr, dpr);
      this.oCtx.imageSmoothingEnabled = true;
      this.oCtx.imageSmoothingQuality = 'high';
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

    // 1. Sunny Cloudy Meadow / Sun / Sunshine / Day / Bright / Summer
    if (/\b(sun|sunny|sunshine|day|morning|subah|dhoop|roshni|bright|summer|golden|cheerful|happy|khushi|suraj|savera|muskurahat)\b/i.test(text) ||
        text.includes('sunny') || text.includes('sunshine') || text.includes('suraj') || text.includes('dhoop')) {
      return { theme: 'sunny', moodName: '☀️ Sunny Meadow', keyword: 'Sunny' };
    }

    // 2. Moonlit Meadow / Moon / Clouds / Breeze / Raat / Sukoon
    if (/\b(moon|chand|chanda|chaand|cloud|clouds|breeze|hawa|meadow|grass|sukoon|peace|peaceful|calm|khoya|healing|night sky|lunar)\b/i.test(text) ||
        text.includes('chand') || text.includes('moon') || text.includes('sukoon')) {
      return { theme: 'moon', moodName: '🌙 Moonlit Meadow', keyword: 'Moonlit' };
    }

    // 3. Cherry Blossom / Sakura / Spring / Flowers
    if (/\b(sakura|cherry|blossom|flower|flowers|phool|spring|anime|garden|gulabi|pink|petals|japanese|blossoms)\b/i.test(text) ||
        text.includes('sakura') || text.includes('blossom') || text.includes('flower')) {
      return { theme: 'sakura', moodName: '🌸 Cherry Blossom', keyword: 'Sakura' };
    }


    // 3. Rain / Monsoon / Baarish
    if (/\b(barsaat|baarish|barish|rain|rainy|monsoon|rimjhim|boond|boondein|water|badal|drizzle|megha|sawan|saawan|barkha|tip tip)\b/i.test(text) ||
        text.includes('barsaat') || text.includes('baarish') || text.includes('barish') || text.includes('rain')) {
      return { theme: 'rain', moodName: '🌧️ Baarish / Rain', keyword: 'Baarish' };
    }

    // 4. Romantic / Love / Dil / Ishq
    if (/\b(romantic|romance|love|pyar|pyaar|dil|ishq|mohabbat|deewana|sanam|janam|jaan|humsafar|darshan raval|arijit|kesariya|shayari|valentine|crush|kiss|couple|terey bina|tum hi ho|aashiqui|humraaz|pehle|pehla nasha|sweetheart)\b/i.test(text) ||
        text.includes('romantic') || text.includes('love') || text.includes('ishq') || text.includes('pyaar') || text.includes('dil') || text.includes('darshan raval')) {
      return { theme: 'hearts', moodName: '💖 Romantic / Love', keyword: 'Romantic' };
    }

    // 5. Sad / Melancholy / Heartbreak / Cold / Snow
    if (/\b(sad|alone|lonely|tanha|dard|judaai|tuta dil|broken|heartbreak|cry|crying|tears|goodbye|alvida|channa mereya|bekhayali|bewafa|depressed|pain|dukh|gham|ghamgeen|snow|winter|ice|cold|frost|baraf|barf|frozen|glacier|christmas)\b/i.test(text) ||
        text.includes('sad') || text.includes('lonely') || text.includes('dard') || text.includes('broken')) {
      return { theme: 'snow', moodName: '❄️ Sad / Melancholy', keyword: 'Sad' };
    }

    // 6. Thunder / Storm / Heavy / Intense / Phonk
    if (/\b(thunder|storm|lightning|bijli|toofan|thunderstorm|heavy|dark|rage|phonk|metal|hardcore|epic|battle|war|power|intense|drift|sigma|demon|danger|electric)\b/i.test(text)) {
      return { theme: 'thunder', moodName: '⚡ Thunder / Heavy', keyword: 'Thunder' };
    }

    // 7. Fire / Sparks / Rock / Energy / Gym / Workout
    if (/\b(fire|sparks|spark|flame|aag|jalwa|josh|rock|guitar|energy|hype|workout|gym|motivation|beast|ignite|blaze|heat|burn|sholay|dhamaka)\b/i.test(text)) {
      return { theme: 'sparks', moodName: '🔥 High Energy / Sparks', keyword: 'Energy' };
    }

    // 8. Equalizer / EDM / Club / Bass / Party
    if (/\b(equalizer|eq|bass|drop|edm|club|electro|party|trap|remix|dj|mashup|dance|house|techno|rave|disco|festival|bounce|dubstep|hardstyle|banger)\b/i.test(text)) {
      return { theme: 'equalizer', moodName: '📊 EDM / Bass Booster', keyword: 'EDM / Bass' };
    }

    // 9. Stars / Lofi / Cosmic / Chill / Night
    if (/\b(night|star|stars|sky|cosmic|space|galaxy|lofi|lo-fi|chill|sleep|relax|dream|midnight|slowed|reverb|ambient|aesthetic|sunset)\b/i.test(text)) {
      return { theme: 'stars', moodName: '✨ Cosmic / Lofi Stars', keyword: 'Cosmic / Lofi' };
    }

    // Default Fallback
    return { theme: 'moon', moodName: '🌙 Moonlit Meadow', keyword: 'Moonlit' };
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
    this.clouds = [];

    let bgCount = 50;
    let fgCount = 40;

    if (this.currentTheme === 'sunny') {
      bgCount = 45; // Sunbeams & light glints
      fgCount = 30; // Floating dandelion fluffs / sun pollen
      this.initRealisticClouds(true);
    } else if (this.currentTheme === 'moon') {
      bgCount = 50; // Night stars
      fgCount = 28; // Glowing fireflies
      this.initRealisticClouds(false);
    } else if (this.currentTheme === 'sakura') {
      bgCount = 60; // Background sakura petals
      fgCount = 45; // Foreground sakura petals
    } else if (this.currentTheme === 'stars') {
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

  initRealisticClouds(isDay) {
    // 1. Deep Background Clouds (Drifting behind cards on underlay canvas)
    this.bgClouds = [
      this.createRealisticCloud(this.width * -0.08, this.height * 0.10, 1.35, 0.14, isDay ? 0.90 : 0.75, isDay, false),
      this.createRealisticCloud(this.width * 0.38, this.height * 0.20, 1.55, 0.10, isDay ? 0.86 : 0.68, isDay, false),
      this.createRealisticCloud(this.width * 0.78, this.height * 0.05, 1.15, 0.18, isDay ? 0.78 : 0.60, isDay, false)
    ];

    // 2. Foreground Wispy Clouds (Drifting ABOVE & ACROSS the cards on overlay canvas)
    this.fgClouds = [
      this.createRealisticCloud(this.width * 0.15, this.height * 0.03, 1.05, 0.22, isDay ? 0.36 : 0.28, isDay, true),
      this.createRealisticCloud(this.width * 0.62, this.height * 0.14, 1.25, 0.16, isDay ? 0.30 : 0.22, isDay, true)
    ];
  }

  createCloudSprite(scale, isDay, isForeground) {
    const puffs = [
      { dx: -70, dy: 16, r: 56 },
      { dx: -24, dy: 20, r: 68 },
      { dx: 28, dy: 18, r: 72 },
      { dx: 82, dy: 14, r: 62 },
      { dx: 130, dy: 16, r: 52 },
      { dx: -48, dy: 0, r: 64 },
      { dx: 0, dy: -6, r: 80 },
      { dx: 48, dy: -2, r: 74 },
      { dx: 96, dy: 2, r: 60 },
      { dx: -28, dy: -28, r: 54 },
      { dx: 18, dy: -38, r: 64 },
      { dx: 60, dy: -26, r: 50 },
      { dx: -66, dy: -14, r: 44 },
      { dx: -105, dy: 10, r: 38 },
      { dx: -128, dy: 14, r: 28 },
      { dx: 154, dy: 12, r: 40 },
      { dx: 178, dy: 16, r: 30 },
      { dx: 198, dy: 18, r: 22 }
    ];

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const spriteWidth = Math.ceil(520 * scale);
    const spriteHeight = Math.ceil(260 * scale);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, spriteWidth * dpr);
    canvas.height = Math.max(1, spriteHeight * dpr);
    const cCtx = canvas.getContext('2d');
    cCtx.scale(dpr, dpr);

    const originX = 180 * scale;
    const originY = 120 * scale;

    for (let i = 0; i < puffs.length; i++) {
      const puff = puffs[i];
      const px = originX + puff.dx * scale;
      const py = originY + puff.dy * scale;
      const pr = puff.r * scale;

      const lx = px - pr * 0.20;
      const ly = py - pr * 0.25;
      const outerRadius = pr * 1.75;

      const grad = cCtx.createRadialGradient(lx, ly, 0, px, py, outerRadius);

      if (isDay) {
        if (!isForeground) {
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
          grad.addColorStop(0.25, 'rgba(255, 253, 244, 0.82)');
          grad.addColorStop(0.55, 'rgba(228, 240, 252, 0.42)');
          grad.addColorStop(0.80, 'rgba(208, 228, 248, 0.15)');
          grad.addColorStop(1, 'rgba(195, 220, 245, 0)');
        } else {
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
          grad.addColorStop(0.30, 'rgba(255, 252, 246, 0.45)');
          grad.addColorStop(0.65, 'rgba(232, 244, 255, 0.18)');
          grad.addColorStop(1, 'rgba(215, 235, 255, 0)');
        }
      } else {
        if (!isForeground) {
          // Night moonlight background clouds
          grad.addColorStop(0, 'rgba(240, 249, 255, 0.85)');
          grad.addColorStop(0.28, 'rgba(195, 225, 255, 0.58)');
          grad.addColorStop(0.60, 'rgba(138, 182, 230, 0.25)');
          grad.addColorStop(0.85, 'rgba(92, 142, 202, 0.08)');
          grad.addColorStop(1, 'rgba(65, 105, 165, 0)');
        } else {
          // Night moonlight wispy foreground clouds
          grad.addColorStop(0, 'rgba(228, 246, 255, 0.55)');
          grad.addColorStop(0.35, 'rgba(175, 218, 252, 0.30)');
          grad.addColorStop(0.72, 'rgba(122, 172, 230, 0.10)');
          grad.addColorStop(1, 'rgba(75, 125, 185, 0)');
        }
      }

      cCtx.fillStyle = grad;
      cCtx.beginPath();
      cCtx.arc(px, py, outerRadius, 0, Math.PI * 2);
      cCtx.fill();
    }

    return { canvas, width: spriteWidth, height: spriteHeight, originX, originY };
  }

  createRealisticCloud(x, y, scale, speed, baseAlpha, isDay, isForeground) {
    const sprite = this.createCloudSprite(scale, isDay, isForeground);
    return {
      x,
      y,
      baseY: y,
      scale,
      speed,
      baseAlpha,
      isForeground,
      sprite,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.0003 + Math.random() * 0.0003
    };
  }

  drawRealisticClouds(ctx, clouds, isDay, isForeground, time) {
    if (!clouds || !ctx) return;

    for (let c = 0; c < clouds.length; c++) {
      const cloud = clouds[c];
      // Steady, continuous breeze drift across screen
      cloud.x += cloud.speed;

      // Gentle, soothing vertical breeze floating wave
      const breezeY = cloud.baseY + Math.sin(time * 0.00035 + cloud.wobblePhase) * 8 + Math.cos(time * 0.00065 + cloud.wobblePhase * 1.5) * 4;

      const totalWidth = cloud.sprite ? cloud.sprite.width : (480 * cloud.scale);
      if (cloud.x > this.width + totalWidth) {
        cloud.x = -totalWidth;
      }

      // Smooth edge fade: clouds softly materialize from left and dissolve at right
      let edgeFade = 1.0;
      const fadeMargin = 220 * cloud.scale;
      if (cloud.x < 0) {
        edgeFade = Math.max(0, (cloud.x + totalWidth) / totalWidth);
      } else if (cloud.x > this.width - fadeMargin) {
        edgeFade = Math.max(0, ((this.width + totalWidth) - cloud.x) / (totalWidth + fadeMargin));
      }

      const effAlpha = cloud.baseAlpha * edgeFade;
      if (effAlpha <= 0.001 || !cloud.sprite) continue;

      ctx.save();
      ctx.globalAlpha = effAlpha;
      ctx.drawImage(
        cloud.sprite.canvas,
        cloud.x - cloud.sprite.originX,
        breezeY - cloud.sprite.originY,
        cloud.sprite.width,
        cloud.sprite.height
      );
      ctx.restore();
    }
  }


  createParticle(isBg) {
    if (this.currentTheme === 'sunny') {

      if (isBg) {
        return {
          type: 'sunbeam',
          angle: Math.random() * Math.PI * 2,
          length: 80 + Math.random() * 140,
          speed: 0.0015 + Math.random() * 0.003,
          alpha: 0.2 + Math.random() * 0.3,
          width: 1.5 + Math.random() * 2.5
        };
      } else {
        return {
          type: 'dandelion',
          x: Math.random() * this.width,
          y: this.height - Math.random() * 120,
          size: 1.8 + Math.random() * 2.5,
          speedX: 0.8 + Math.random() * 1.2,
          speedY: 0.35 + Math.random() * 0.55,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.02 + Math.random() * 0.03,
          alpha: 0.45 + Math.random() * 0.45,
          color: Math.random() > 0.4 ? '#fef08a' : (Math.random() > 0.5 ? '#ffffff' : '#fde047')
        };
      }
    } else if (this.currentTheme === 'moon') {
      if (isBg) {
        return {
          type: 'star',
          x: Math.random() * this.width,
          y: Math.random() * (this.height * 0.65),
          size: 0.8 + Math.random() * 1.6,
          alpha: 0.25 + Math.random() * 0.5,
          twinkleSpeed: 0.02 + Math.random() * 0.03,
          twinklePhase: Math.random() * Math.PI * 2,
          color: Math.random() > 0.4 ? '#ffffff' : '#bae6fd'
        };
      } else {
        return {
          type: 'firefly',
          x: Math.random() * this.width,
          y: this.height - Math.random() * 100,
          size: 2.2 + Math.random() * 2.2,
          speedX: 0.5 + Math.random() * 0.7,
          speedY: 0.3 + Math.random() * 0.5,
          freqX: 0.8 + Math.random() * 0.8,
          time: Math.random() * 100,
          alpha: 0.5 + Math.random() * 0.4,
          glowPhase: Math.random() * Math.PI * 2,
          glowSpeed: 0.03 + Math.random() * 0.04,
          color: Math.random() > 0.5 ? '#6ee7b7' : (Math.random() > 0.5 ? '#a7f3d0' : '#00f2fe')
        };
      }
    } else if (this.currentTheme === 'sakura') {
      const colors = ['#ffb7c5', '#ff94b8', '#ffc0cb', '#f472b6', '#fed7e2'];
      return {
        x: Math.random() * (this.width + 100) - 50,
        y: Math.random() * this.height,
        size: isBg ? (7 + Math.random() * 6) : (12 + Math.random() * 8),
        speedX: isBg ? (0.8 + Math.random() * 1.3) : (1.4 + Math.random() * 1.8),
        speedY: isBg ? (0.9 + Math.random() * 1.2) : (1.4 + Math.random() * 1.6),
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.025 + Math.random() * 0.03,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        rotSpeedX: (Math.random() - 0.5) * 0.04,
        rotSpeedY: (Math.random() - 0.5) * 0.04,
        rotSpeedZ: (Math.random() - 0.5) * 0.05,
        alpha: isBg ? (0.35 + Math.random() * 0.35) : (0.7 + Math.random() * 0.3),
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    } else if (this.currentTheme === 'stars') {
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

    if (this.currentTheme === 'sunny') {
      this.drawUnderlaySunny(bassEnergy);
    } else if (this.currentTheme === 'moon') {
      this.drawUnderlayMoon(bassEnergy);
    } else if (this.currentTheme === 'sakura') {
      this.drawUnderlaySakura(bassEnergy);
    } else if (this.currentTheme === 'stars') {
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

    if (this.currentTheme === 'sunny') {
      this.drawOverlaySunny(bassEnergy);
    } else if (this.currentTheme === 'moon') {
      this.drawOverlayMoon(bassEnergy);
    } else if (this.currentTheme === 'sakura') {
      this.drawOverlaySakura(bassEnergy);
    } else if (this.currentTheme === 'stars') {
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

  // ------------------------------------------
  // 8. 🌙 MOONLIT MEADOW (Photorealistic Moon, Floating Breeze Clouds & Swaying Meadow Grass)
  // ------------------------------------------
  getRealisticMoonCanvas(radius) {
    const intRadius = Math.round(radius);
    if (this.cachedMoonCanvas && this.cachedMoonRadius === intRadius) {
      return this.cachedMoonCanvas;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = (intRadius * 2 + 8) * dpr;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const mCtx = canvas.getContext('2d');
    mCtx.scale(dpr, dpr);

    const cx = intRadius + 4;
    const cy = intRadius + 4;
    const r = intRadius;

    // 1. Pristine spherical clip
    mCtx.save();
    mCtx.beginPath();
    mCtx.arc(cx, cy, r, 0, Math.PI * 2);
    mCtx.clip();

    // 2. Base 3D Spherical Solar Gradient (Top-left sunlit illumination)
    const baseSphere = mCtx.createRadialGradient(cx - r * 0.24, cy - r * 0.26, r * 0.05, cx, cy, r);
    baseSphere.addColorStop(0, '#ffffff');        // Pure sunlit highlands
    baseSphere.addColorStop(0.24, '#f5f9fd');     // Anorthosite plateau
    baseSphere.addColorStop(0.55, '#dbe7f3');     // Lunar regolith soil
    baseSphere.addColorStop(0.82, '#bed2e6');     // Mid-tone basalt dust
    baseSphere.addColorStop(0.96, '#9cb4cc');     // Spherical limb transition
    baseSphere.addColorStop(1.0, '#849fb8');      // Deep spherical limb

    mCtx.fillStyle = baseSphere;
    mCtx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Helper: Render soft organic lunar mare basin with feathered gradient
    const drawMare = (x, y, rx, ry, angle, color) => {
      mCtx.save();
      mCtx.translate(cx + x * r, cy + y * r);
      mCtx.rotate(angle);
      const mareGrad = mCtx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry) * r);
      mareGrad.addColorStop(0, color);
      mareGrad.addColorStop(0.68, color);
      mareGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      mCtx.fillStyle = mareGrad;
      mCtx.beginPath();
      mCtx.ellipse(0, 0, rx * r, ry * r, 0, 0, Math.PI * 2);
      mCtx.fill();
      mCtx.restore();
    };

    // 3. Authentic Lunar Maria Basalt Geography
    // Oceanus Procellarum (Ocean of Storms - Vast Northwest Mare Complex)
    drawMare(-0.35, -0.24, 0.40, 0.50, -0.20, 'rgba(78, 102, 134, 0.52)');
    drawMare(-0.46, 0.12, 0.32, 0.38, 0.15, 'rgba(74, 98, 128, 0.48)');
    drawMare(-0.25, -0.46, 0.25, 0.28, 0.30, 'rgba(82, 106, 136, 0.42)');

    // Mare Imbrium (Sea of Rains - Great Circular Northern Basin)
    drawMare(-0.14, -0.32, 0.32, 0.28, -0.10, 'rgba(68, 92, 124, 0.58)');
    // Sinus Iridum (Bay of Rainbows on Mare Imbrium rim)
    drawMare(-0.28, -0.52, 0.14, 0.10, 0.40, 'rgba(88, 114, 144, 0.50)');

    // Mare Serenitatis & Mare Tranquillitatis (Sea of Serenity & Sea of Tranquility)
    drawMare(0.14, -0.28, 0.24, 0.22, 0.10, 'rgba(64, 88, 120, 0.60)');
    drawMare(0.28, -0.06, 0.26, 0.24, -0.25, 'rgba(60, 84, 116, 0.62)');

    // Mare Crisium (Crisp Isolated Eastern Oval Sea)
    drawMare(0.58, -0.16, 0.16, 0.22, 0.15, 'rgba(56, 80, 112, 0.68)');

    // Mare Fecunditatis & Mare Nectaris (Southeast Basalt Plains)
    drawMare(0.42, 0.18, 0.24, 0.22, 0.20, 'rgba(70, 95, 126, 0.52)');
    drawMare(0.24, 0.30, 0.16, 0.15, -0.10, 'rgba(72, 98, 128, 0.55)');

    // Mare Nubium & Mare Humorum (Southwest Volcanic Basins)
    drawMare(-0.18, 0.32, 0.24, 0.22, 0.10, 'rgba(74, 98, 128, 0.54)');
    drawMare(-0.42, 0.28, 0.15, 0.14, 0.00, 'rgba(78, 102, 132, 0.50)');

    // 4. Crater Relief & Mountain Ranges with 3D Sunward Highlight and Shadow
    const drawCrater = (x, y, radius, depth = 0.5) => {
      const px = cx + x * r;
      const py = cy + y * r;
      const cr = radius * r;

      // Dark shadow crescent (southeast)
      mCtx.fillStyle = `rgba(48, 70, 96, ${0.45 * depth})`;
      mCtx.beginPath();
      mCtx.arc(px + cr * 0.18, py + cr * 0.18, cr, 0, Math.PI * 2);
      mCtx.fill();

      // Bright sunlit crescent rim (northwest)
      mCtx.fillStyle = `rgba(255, 255, 255, ${0.75 * depth})`;
      mCtx.beginPath();
      mCtx.arc(px - cr * 0.14, py - cr * 0.14, cr * 0.92, 0, Math.PI * 2);
      mCtx.fill();

      // Crater floor
      mCtx.fillStyle = `rgba(155, 180, 208, ${0.35 * depth})`;
      mCtx.beginPath();
      mCtx.arc(px, py, cr * 0.75, 0, Math.PI * 2);
      mCtx.fill();
    };

    // Famous Crater Landmarks
    drawCrater(-0.10, -0.56, 0.07, 0.85); // Plato (Dark floor)
    drawCrater(-0.06, -0.26, 0.05, 0.70); // Archimedes
    drawCrater(0.28, 0.22, 0.06, 0.75);   // Theophilus
    drawCrater(0.62, 0.10, 0.06, 0.70);   // Langrenus
    drawCrater(0.08, 0.72, 0.09, 0.80);   // Clavius
    drawCrater(-0.68, -0.05, 0.06, 0.75); // Grimaldi

    // 5. Prominent Ray Impact Craters with Radiating Silver Ejecta Rays
    // TYCHO CRATER (Southern Giant Ray System)
    const tychoX = cx + 0.14 * r;
    const tychoY = cy + 0.58 * r;
    const tychoR = 0.055 * r;

    // 16 Radiating Silver Ejecta Rays
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + 0.12;
      const rayLen = r * (0.45 + (Math.sin(i * 37) * 0.5 + 0.5) * 0.65);
      const rayWidth = 0.025 + (i % 2 === 0 ? 0.015 : 0.005);

      const rayGrad = mCtx.createLinearGradient(tychoX, tychoY, tychoX + Math.cos(angle) * rayLen, tychoY + Math.sin(angle) * rayLen);
      rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
      rayGrad.addColorStop(0.35, 'rgba(240, 248, 255, 0.40)');
      rayGrad.addColorStop(0.75, 'rgba(215, 235, 255, 0.15)');
      rayGrad.addColorStop(1, 'rgba(200, 225, 255, 0)');

      mCtx.save();
      mCtx.strokeStyle = rayGrad;
      mCtx.lineWidth = rayWidth * r;
      mCtx.lineCap = 'round';
      mCtx.beginPath();
      mCtx.moveTo(tychoX, tychoY);
      mCtx.lineTo(tychoX + Math.cos(angle) * rayLen, tychoY + Math.sin(angle) * rayLen);
      mCtx.stroke();
      mCtx.restore();
    }
    drawCrater(0.14, 0.58, 0.055, 1.0);
    mCtx.fillStyle = '#ffffff';
    mCtx.beginPath();
    mCtx.arc(tychoX, tychoY, tychoR * 0.45, 0, Math.PI * 2);
    mCtx.fill();

    // COPERNICUS CRATER (Major Central Ray System)
    const copX = cx - 0.20 * r;
    const copY = cy - 0.05 * r;
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + 0.20;
      const rayLen = r * (0.28 + (i % 3) * 0.12);
      const rayGrad = mCtx.createLinearGradient(copX, copY, copX + Math.cos(angle) * rayLen, copY + Math.sin(angle) * rayLen);
      rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
      rayGrad.addColorStop(0.50, 'rgba(235, 245, 255, 0.25)');
      rayGrad.addColorStop(1, 'rgba(200, 225, 255, 0)');

      mCtx.save();
      mCtx.strokeStyle = rayGrad;
      mCtx.lineWidth = 0.02 * r;
      mCtx.beginPath();
      mCtx.moveTo(copX, copY);
      mCtx.lineTo(copX + Math.cos(angle) * rayLen, copY + Math.sin(angle) * rayLen);
      mCtx.stroke();
      mCtx.restore();
    }
    drawCrater(-0.20, -0.05, 0.065, 0.95);

    // KEPLER CRATER
    drawCrater(-0.40, 0.04, 0.04, 0.90);

    // ARISTARCHUS PLATEAU (Brightest Volcanic Diamond-White Hotspot)
    mCtx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    mCtx.beginPath();
    mCtx.arc(cx - 0.52 * r, cy - 0.22 * r, 0.038 * r, 0, Math.PI * 2);
    mCtx.fill();
    const arisHalo = mCtx.createRadialGradient(cx - 0.52 * r, cy - 0.22 * r, 0, cx - 0.52 * r, cy - 0.22 * r, 0.10 * r);
    arisHalo.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    arisHalo.addColorStop(1, 'rgba(255, 255, 255, 0)');
    mCtx.fillStyle = arisHalo;
    mCtx.beginPath();
    mCtx.arc(cx - 0.52 * r, cy - 0.22 * r, 0.10 * r, 0, Math.PI * 2);
    mCtx.fill();

    // 6. Surface Micro-Regolith Craters
    const microCraters = [
      { x: 0.35, y: -0.50, r: 0.025 }, { x: 0.45, y: -0.40, r: 0.030 },
      { x: -0.55, y: -0.40, r: 0.028 }, { x: -0.05, y: 0.65, r: 0.032 },
      { x: 0.42, y: 0.52, r: 0.035 }, { x: -0.32, y: 0.58, r: 0.028 },
      { x: 0.05, y: -0.15, r: 0.022 }, { x: -0.02, y: 0.18, r: 0.026 },
      { x: 0.62, y: -0.42, r: 0.024 }, { x: -0.62, y: 0.42, r: 0.030 }
    ];
    for (const mc of microCraters) {
      drawCrater(mc.x, mc.y, mc.r, 0.60);
    }

    // 7. Outer Lunar Limb Silver Glint
    const limbGlow = mCtx.createRadialGradient(cx, cy, r * 0.88, cx, cy, r);
    limbGlow.addColorStop(0, 'rgba(255, 255, 255, 0)');
    limbGlow.addColorStop(0.85, 'rgba(255, 255, 255, 0.25)');
    limbGlow.addColorStop(1.0, 'rgba(255, 255, 255, 0.55)');
    mCtx.fillStyle = limbGlow;
    mCtx.beginPath();
    mCtx.arc(cx, cy, r, 0, Math.PI * 2);
    mCtx.fill();

    mCtx.restore();

    this.cachedMoonCanvas = canvas;
    this.cachedMoonRadius = intRadius;
    return canvas;
  }

  drawUnderlayMoon(bassEnergy) {
    const time = performance.now();

    // 1. High-Texture Photorealistic Moon with Multi-Layer Atmospheric Corona
    const moonX = this.width * (this.width < 768 ? 0.82 : 0.78);
    const moonY = this.height * (this.width < 768 ? 0.14 : 0.16);
    const moonRadius = Math.min(this.width, this.height) * 0.065 + 18;

    // Atmospheric Layer 1: Giant Ambient Moonlight Sky Wash
    const skyWash = this.uCtx.createRadialGradient(moonX, moonY, moonRadius * 0.5, moonX, moonY, moonRadius * 5.8);
    skyWash.addColorStop(0, 'rgba(135, 195, 255, 0.12)');
    skyWash.addColorStop(0.50, 'rgba(95, 160, 240, 0.04)');
    skyWash.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.uCtx.fillStyle = skyWash;
    this.uCtx.beginPath();
    this.uCtx.arc(moonX, moonY, moonRadius * 5.8, 0, Math.PI * 2);
    this.uCtx.fill();

    // Atmospheric Layer 2: 22° Ice-Crystal Optical Diffraction Halo
    const diffractionHalo = this.uCtx.createRadialGradient(moonX, moonY, moonRadius * 1.6, moonX, moonY, moonRadius * 3.4);
    diffractionHalo.addColorStop(0, 'rgba(180, 225, 255, 0.18)');
    diffractionHalo.addColorStop(0.45, 'rgba(145, 205, 255, 0.08)');
    diffractionHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.uCtx.fillStyle = diffractionHalo;
    this.uCtx.beginPath();
    this.uCtx.arc(moonX, moonY, moonRadius * 3.4, 0, Math.PI * 2);
    this.uCtx.fill();

    // Atmospheric Layer 3: Inner Radiant Airglow Corona
    const innerCorona = this.uCtx.createRadialGradient(moonX, moonY, moonRadius * 0.95, moonX, moonY, moonRadius * 1.55);
    innerCorona.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    innerCorona.addColorStop(0.35, 'rgba(210, 240, 255, 0.32)');
    innerCorona.addColorStop(0.70, 'rgba(165, 215, 255, 0.12)');
    innerCorona.addColorStop(1, 'rgba(120, 180, 255, 0)');
    this.uCtx.fillStyle = innerCorona;
    this.uCtx.beginPath();
    this.uCtx.arc(moonX, moonY, moonRadius * 1.55, 0, Math.PI * 2);
    this.uCtx.fill();

    // High-Resolution Photorealistic Moon Disc
    const moonCanvas = this.getRealisticMoonCanvas(moonRadius);
    if (moonCanvas) {
      this.uCtx.drawImage(moonCanvas, moonX - moonRadius - 4, moonY - moonRadius - 4, moonRadius * 2 + 8, moonRadius * 2 + 8);
    }

    // 2. Distant Night Stars
    for (let i = 0; i < this.bgParticles.length; i++) {
      const p = this.bgParticles[i];
      if (p.type === 'star') {
        p.twinklePhase += p.twinkleSpeed;
        const alpha = p.alpha * (0.5 + Math.sin(p.twinklePhase) * 0.5);
        this.uCtx.globalAlpha = alpha;
        this.uCtx.fillStyle = p.color || '#ffffff';
        this.uCtx.beginPath();
        this.uCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.uCtx.fill();
      }
    }

    // 3. Smooth Floating Background Clouds Drifting on Night Breeze (Zero Blinking)
    this.drawRealisticClouds(this.uCtx, this.bgClouds, false, false, time);

    // 4. Moving Meadow Grass Blades (Influenced by slow soothing breeze)
    this.drawMeadowGrass(this.uCtx, time, bassEnergy, false);
    this.uCtx.globalAlpha = 1;
  }

  drawOverlayMoon(bassEnergy) {
    const time = performance.now();

    // 1. Smooth Floating Ethereal Wispy Clouds Drifting on Breeze Above Cards
    this.drawRealisticClouds(this.oCtx, this.fgClouds, false, true, time);

    // 2. Foreground Moving Grass Blades with Silvery Moonlight Sheen
    this.drawMeadowGrass(this.oCtx, time, bassEnergy, true);

    // 3. Glowing Fireflies / Meadow Light Motes
    for (let i = 0; i < this.fgParticles.length; i++) {
      const p = this.fgParticles[i];
      if (p.type === 'firefly') {
        p.time += 0.02;
        p.x += Math.sin(p.time * p.freqX) * p.speedX;
        p.y -= p.speedY;
        p.glowPhase += p.glowSpeed;

        const pulse = 0.4 + Math.sin(p.glowPhase) * 0.6;
        const alpha = p.alpha * pulse;

        this.oCtx.globalAlpha = alpha;
        this.oCtx.fillStyle = p.color || '#a7f3d0';
        this.oCtx.shadowColor = p.color || '#34d399';
        this.oCtx.shadowBlur = 12 + bassEnergy * 10;
        this.oCtx.beginPath();
        this.oCtx.arc(p.x, p.y, p.size * (1 + bassEnergy * 0.5), 0, Math.PI * 2);
        this.oCtx.fill();

        if (p.y < this.height * 0.35 || p.x < 0 || p.x > this.width) {
          p.x = Math.random() * this.width;
          p.y = this.height - Math.random() * 80;
        }
      }
    }
    this.oCtx.shadowBlur = 0;
    this.oCtx.globalAlpha = 1;
  }

  drawMeadowGrass(ctx, time, bassEnergy, isForeground) {
    const bladeSpacing = isForeground ? 12 : 7;
    const numBlades = Math.ceil(this.width / bladeSpacing) + 6;
    const baseHeight = this.height;

    for (let i = 0; i < numBlades; i++) {
      const x = i * bladeSpacing + (Math.sin(i * 99) * 3);
      const bladeLen = (isForeground ? (35 + Math.sin(i * 12) * 15 + Math.cos(i * 4) * 10) : (55 + Math.sin(i * 7) * 25 + Math.cos(i * 3) * 15));
      
      const breezeWave = Math.sin(time * 0.0016 + x * 0.004) * 18 + 
                         Math.sin(time * 0.0032 + x * 0.009) * 8 +
                         Math.sin(time * 0.0008) * 6;
      
      const bassSway = (bassEnergy * 20) * Math.sin(time * 0.006 + x * 0.015);
      const totalSway = breezeWave + bassSway;

      const tipX = x + totalSway;
      const tipY = baseHeight - bladeLen;
      const ctrlX = x + totalSway * 0.45;
      const ctrlY = baseHeight - bladeLen * 0.55;

      const grad = ctx.createLinearGradient(x, baseHeight, tipX, tipY);
      if (isForeground) {
        grad.addColorStop(0, 'rgba(3, 30, 20, 0.85)');
        grad.addColorStop(0.5, 'rgba(5, 150, 105, 0.7)');
        grad.addColorStop(1, 'rgba(110, 231, 183, 0.9)');
      } else {
        grad.addColorStop(0, 'rgba(2, 20, 14, 0.95)');
        grad.addColorStop(0.6, 'rgba(4, 120, 87, 0.6)');
        grad.addColorStop(1, 'rgba(52, 211, 153, 0.7)');
      }

      ctx.strokeStyle = grad;
      ctx.lineWidth = isForeground ? (2.2 + (i % 3) * 0.6) : (3.2 + (i % 4) * 0.8);
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(x, baseHeight);
      ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
      ctx.stroke();
    }
  }

  // ------------------------------------------
  // 9. 🌸 CHERRY BLOSSOM SAKURA PETAL STORM
  // ------------------------------------------
  drawUnderlaySakura(bassEnergy) {
    this.renderSakuraPetals(this.uCtx, this.bgParticles, bassEnergy, true);
  }

  drawOverlaySakura(bassEnergy) {
    this.renderSakuraPetals(this.oCtx, this.fgParticles, bassEnergy, false);
  }

  renderSakuraPetals(ctx, particles, bassEnergy, isUnderlay) {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.wobblePhase += p.wobbleSpeed;
      p.rotX += p.rotSpeedX;
      p.rotY += p.rotSpeedY;
      p.rotZ += p.rotSpeedZ;

      const windPush = isUnderlay ? 1.0 : 1.6;
      p.x += (p.speedX + Math.sin(p.wobblePhase) * 0.8 + bassEnergy * 4.0) * windPush;
      p.y += (p.speedY + Math.cos(p.wobblePhase) * 0.5) * windPush;

      const scaleX = Math.cos(p.rotX);
      const scaleY = Math.sin(p.rotY) * 0.9;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotZ);
      ctx.scale(Math.abs(scaleX) < 0.15 ? 0.15 : scaleX, Math.abs(scaleY) < 0.15 ? 0.15 : scaleY);

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      if (!isUnderlay) {
        ctx.shadowColor = 'rgba(255, 182, 193, 0.5)';
        ctx.shadowBlur = 6 + bassEnergy * 8;
      }

      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 0.85, -p.size * 0.8, p.size * 0.95, p.size * 0.35, 0, p.size);
      ctx.bezierCurveTo(-p.size * 0.95, p.size * 0.35, -p.size * 0.85, -p.size * 0.8, 0, -p.size);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 0.8);
      ctx.lineTo(0, p.size * 0.7);
      ctx.stroke();

      ctx.restore();

      if (p.y > this.height + 30 || p.x > this.width + 40) {
        particles[i] = this.createParticle(isUnderlay);
        particles[i].x = Math.random() * (this.width + 200) - 200;
        particles[i].y = -20;
      }
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------
  // 10. ☀️ SUNNY CLOUDY MEADOW (Sun, Clouds & Swaying Breeze Grass)
  // ------------------------------------------
  drawUnderlaySunny(bassEnergy) {
    const time = performance.now();

    // 1. Radiant Golden Daytime Sun
    const sunX = this.width * (this.width < 768 ? 0.82 : 0.78);
    const sunY = this.height * 0.16;
    const sunRadius = Math.min(this.width, this.height) * 0.065 + 16;

    // Giant outer ambient warm solar corona
    const outerCorona = this.uCtx.createRadialGradient(sunX, sunY, sunRadius * 0.6, sunX, sunY, sunRadius * 4.2);
    outerCorona.addColorStop(0, `rgba(255, 220, 100, ${0.4 + bassEnergy * 0.25})`);
    outerCorona.addColorStop(0.35, `rgba(255, 180, 50, ${0.2 + bassEnergy * 0.12})`);
    outerCorona.addColorStop(0.7, `rgba(255, 140, 20, ${0.08 + bassEnergy * 0.05})`);
    outerCorona.addColorStop(1, 'rgba(255, 120, 0, 0)');

    this.uCtx.fillStyle = outerCorona;
    this.uCtx.beginPath();
    this.uCtx.arc(sunX, sunY, sunRadius * 4.2, 0, Math.PI * 2);
    this.uCtx.fill();

    // 8 Pulsing & Rotating Sunbeam Rays
    const numRays = 8;
    const rayAngleOffset = time * 0.0004;
    const maxRayLen = sunRadius * (2.4 + bassEnergy * 1.5);
    
    this.uCtx.save();
    this.uCtx.translate(sunX, sunY);
    for (let r = 0; r < numRays; r++) {
      const angle = (r * (Math.PI * 2 / numRays)) + rayAngleOffset;
      const rayAlpha = 0.12 + Math.sin(time * 0.002 + r) * 0.05 + bassEnergy * 0.12;
      this.uCtx.strokeStyle = `rgba(255, 235, 150, ${rayAlpha})`;
      this.uCtx.lineWidth = 3 + bassEnergy * 4;
      this.uCtx.beginPath();
      this.uCtx.moveTo(Math.cos(angle) * (sunRadius * 0.9), Math.sin(angle) * (sunRadius * 0.9));
      this.uCtx.lineTo(Math.cos(angle) * maxRayLen, Math.sin(angle) * maxRayLen);
      this.uCtx.stroke();
    }
    this.uCtx.restore();

    // Hot Golden Sun Disc Core
    const sunDisc = this.uCtx.createRadialGradient(sunX - sunRadius * 0.2, sunY - sunRadius * 0.2, sunRadius * 0.1, sunX, sunY, sunRadius);
    sunDisc.addColorStop(0, '#ffffff');
    sunDisc.addColorStop(0.5, '#fff7ae');
    sunDisc.addColorStop(0.85, '#fde047');
    sunDisc.addColorStop(1, '#f59e0b');

    this.uCtx.fillStyle = sunDisc;
    this.uCtx.shadowColor = '#facc15';
    this.uCtx.shadowBlur = 24 + bassEnergy * 18;
    this.uCtx.beginPath();
    this.uCtx.arc(sunX, sunY, sunRadius * (1 + bassEnergy * 0.08), 0, Math.PI * 2);
    this.uCtx.fill();
    this.uCtx.shadowBlur = 0;

    // 2. Realistic Drifting Volumetric Background Clouds
    this.drawRealisticClouds(this.uCtx, this.bgClouds, true, false, time);

    // 3. Background Sunlit Emerald Grass Meadow
    this.drawSunnyMeadowGrass(this.uCtx, time, bassEnergy, false);
    this.uCtx.globalAlpha = 1;
  }

  drawOverlaySunny(bassEnergy) {
    const time = performance.now();

    // 1. Realistic Foreground Ethereal Wispy Clouds (Drifting Above/Across Cards)
    this.drawRealisticClouds(this.oCtx, this.fgClouds, true, true, time);

    // 2. Foreground Sunlit Emerald/Lime Grass Blades
    this.drawSunnyMeadowGrass(this.oCtx, time, bassEnergy, true);

    // 3. Floating Golden Dandelion Spores & Sunlit Pollen Motes

    for (let i = 0; i < this.fgParticles.length; i++) {
      const p = this.fgParticles[i];
      if (p.type === 'dandelion') {
        p.wobblePhase += p.wobbleSpeed;
        p.x += p.speedX + Math.sin(p.wobblePhase) * 0.6 + bassEnergy * 2.5;
        p.y -= p.speedY + Math.cos(p.wobblePhase) * 0.3;

        this.oCtx.globalAlpha = p.alpha;
        this.oCtx.fillStyle = p.color || '#fef08a';
        this.oCtx.shadowColor = '#facc15';
        this.oCtx.shadowBlur = 8 + bassEnergy * 8;
        
        this.oCtx.beginPath();
        this.oCtx.arc(p.x, p.y, p.size * (1 + bassEnergy * 0.4), 0, Math.PI * 2);
        this.oCtx.fill();

        // Little dandelion seed whisker
        this.oCtx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        this.oCtx.lineWidth = 0.8;
        this.oCtx.beginPath();
        this.oCtx.moveTo(p.x, p.y);
        this.oCtx.lineTo(p.x - 3, p.y + 4);
        this.oCtx.stroke();

        if (p.y < this.height * 0.25 || p.x > this.width + 20) {
          p.x = Math.random() * (this.width * 0.8);
          p.y = this.height - Math.random() * 60;
        }
      }
    }
    this.oCtx.shadowBlur = 0;
    this.oCtx.globalAlpha = 1;
  }

  drawSunnyMeadowGrass(ctx, time, bassEnergy, isForeground) {
    const bladeSpacing = isForeground ? 11 : 6.5;
    const numBlades = Math.ceil(this.width / bladeSpacing) + 6;
    const baseHeight = this.height;

    for (let i = 0; i < numBlades; i++) {
      const x = i * bladeSpacing + (Math.sin(i * 77) * 3);
      const bladeLen = (isForeground ? (38 + Math.sin(i * 11) * 16 + Math.cos(i * 5) * 10) : (58 + Math.sin(i * 8) * 26 + Math.cos(i * 3) * 16));
      
      const breezeWave = Math.sin(time * 0.0018 + x * 0.004) * 20 + 
                         Math.sin(time * 0.0035 + x * 0.008) * 9 +
                         Math.sin(time * 0.0009) * 7;
      
      const bassSway = (bassEnergy * 24) * Math.sin(time * 0.007 + x * 0.016);
      const totalSway = breezeWave + bassSway;

      const tipX = x + totalSway;
      const tipY = baseHeight - bladeLen;
      const ctrlX = x + totalSway * 0.45;
      const ctrlY = baseHeight - bladeLen * 0.55;

      const grad = ctx.createLinearGradient(x, baseHeight, tipX, tipY);
      if (isForeground) {
        grad.addColorStop(0, 'rgba(6, 78, 59, 0.9)');
        grad.addColorStop(0.45, 'rgba(16, 185, 129, 0.85)');
        grad.addColorStop(0.8, 'rgba(132, 204, 22, 0.95)');
        grad.addColorStop(1, 'rgba(254, 240, 138, 0.95)');
      } else {
        grad.addColorStop(0, 'rgba(4, 47, 46, 0.95)');
        grad.addColorStop(0.5, 'rgba(5, 150, 105, 0.75)');
        grad.addColorStop(0.85, 'rgba(101, 163, 13, 0.8)');
        grad.addColorStop(1, 'rgba(217, 249, 157, 0.85)');
      }

      ctx.strokeStyle = grad;
      ctx.lineWidth = isForeground ? (2.4 + (i % 3) * 0.6) : (3.4 + (i % 4) * 0.8);
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(x, baseHeight);
      ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
      ctx.stroke();
    }
  }
}

window.AtmosphereEngine = AtmosphereEngine;


