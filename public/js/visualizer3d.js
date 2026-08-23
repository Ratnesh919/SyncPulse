/**
 * Visualizer3D: High-Definition Three.js Audio Visualizer Suite
 * Features 3 Switchable Modes:
 * 1. Quantum Hologram Sphere (Icosahedron + Core Glow + Orbital Halos)
 * 2. Neon Wave Tunnel (Undulating 3D wireframe landscape)
 * 3. Equalizer Tower Ring (Circular 3D frequency pillar array)
 */
class Visualizer3D {
  constructor(canvasElement, audioEngine) {
    this.canvas = canvasElement;
    this.audioEngine = audioEngine;
    this.currentMode = 'sphere'; // 'sphere', 'tunnel', 'bars'

    this.isWebGL = false;
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Three.js groups & meshes
    this.groupSphere = null;
    this.groupTunnel = null;
    this.groupBars = null;
    this.sphereMesh = null;
    this.originalSpherePositions = null;
    this.coreMesh = null;
    this.haloRings = [];
    this.particles = null;
    this.tunnelGrid = null;
    this.tunnelOrigPositions = null;
    this.equalizerBars = [];

    // Fallback 2D Canvas Context
    this.ctx2d = null;

    this.animId = null;
    this.isRunning = false;

    // Mouse & Touch Interaction
    this.targetRotationX = 0;
    this.targetRotationY = 0;
    this.isDragging = false;
    this.prevMouseX = 0;
    this.prevMouseY = 0;

    // Internal clock
    this.idleTime = 0;

    this.init();
  }

  init() {
    if (!this.canvas) return;

    // Check WebGL and Three.js availability
    if (window.THREE && this.hasWebGL()) {
      try {
        this.initThreeJS();
        this.isWebGL = true;
      } catch (e) {
        console.warn('[Visualizer3D] Three.js WebGL init failed, switching to Canvas2D engine:', e);
        this.initCanvas2D();
        this.isWebGL = false;
      }
    } else {
      this.initCanvas2D();
      this.isWebGL = false;
    }

    this.setupInteractions();
  }

  hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  initThreeJS() {
    const parent = this.canvas.parentElement;
    const width = this.canvas.clientWidth || (parent ? parent.clientWidth : 360) || 360;
    const height = this.canvas.clientHeight || (parent ? parent.clientHeight : 220) || 220;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030509, 0.025);

    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    this.camera.position.set(0, 3, 26);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'default',
      preserveDrawingBuffer: false
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x00f2fe, 3, 60);
    cyanLight.position.set(15, 12, 18);
    this.scene.add(cyanLight);

    const magentaLight = new THREE.PointLight(0xff007f, 3, 60);
    magentaLight.position.set(-15, -10, 15);
    this.scene.add(magentaLight);

    this.groupSphere = new THREE.Group();
    this.groupTunnel = new THREE.Group();
    this.groupBars = new THREE.Group();

    this.buildSphereMode();
    this.buildTunnelMode();
    this.buildBarsMode();

    this.scene.add(this.groupSphere);
    this.scene.add(this.groupTunnel);
    this.scene.add(this.groupBars);

    this.setMode('sphere');
  }

  buildSphereMode() {
    const sphereGeo = new THREE.IcosahedronGeometry(7.5, 4);
    this.originalSpherePositions = sphereGeo.attributes.position.clone();

    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      wireframe: true,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x071526,
      emissiveIntensity: 0.6
    });
    this.sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    this.groupSphere.add(this.sphereMesh);

    const coreGeo = new THREE.SphereGeometry(3.5, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xff007f,
      wireframe: false,
      transparent: true,
      opacity: 0.35
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.groupSphere.add(this.coreMesh);

    this.haloRings = [];
    for (let r = 0; r < 2; r++) {
      const ringGeo = new THREE.TorusGeometry(11 + r * 2.5, 0.12, 12, 80);
      const ringMat = new THREE.MeshBasicMaterial({
        color: r === 0 ? 0xff007f : 0x7928ca,
        wireframe: true,
        transparent: true,
        opacity: 0.7
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / (2.2 + r * 0.4);
      ring.rotation.y = (Math.PI / 4) * r;
      this.haloRings.push(ring);
      this.groupSphere.add(ring);
    }

    const pCount = 350;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i += 3) {
      pPos[i] = (Math.random() - 0.5) * 55;
      pPos[i + 1] = (Math.random() - 0.5) * 55;
      pPos[i + 2] = (Math.random() - 0.5) * 55;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x00f2fe,
      size: 0.65,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    this.particles = new THREE.Points(pGeo, pMat);
    this.groupSphere.add(this.particles);
  }

  buildTunnelMode() {
    const gridGeo = new THREE.PlaneGeometry(50, 70, 32, 40);
    this.tunnelOrigPositions = gridGeo.attributes.position.clone();

    const gridMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      wireframe: true,
      emissive: 0x1a0933,
      emissiveIntensity: 0.5
    });

    this.tunnelGrid = new THREE.Mesh(gridGeo, gridMat);
    this.tunnelGrid.rotation.x = -Math.PI / 2.3;
    this.tunnelGrid.position.y = -6;
    this.groupTunnel.add(this.tunnelGrid);
  }

  buildBarsMode() {
    const barCount = 36;
    const radius = 9;
    this.equalizerBars = [];

    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const barGeo = new THREE.BoxGeometry(0.8, 1, 0.8);
      const colorHue = (i / barCount);
      const color = new THREE.Color().setHSL(colorHue * 0.7, 1.0, 0.5);

      const barMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        roughness: 0.2
      });

      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.x = Math.cos(angle) * radius;
      bar.position.z = Math.sin(angle) * radius;
      bar.position.y = 0;
      bar.lookAt(0, 0, 0);

      this.equalizerBars.push(bar);
      this.groupBars.add(bar);
    }
  }

  initCanvas2D() {
    this.ctx2d = this.canvas.getContext('2d');
    this.handleResize();
  }

  setMode(mode) {
    this.currentMode = mode;
    if (this.isWebGL && this.scene) {
      if (this.groupSphere) this.groupSphere.visible = (mode === 'sphere');
      if (this.groupTunnel) this.groupTunnel.visible = (mode === 'tunnel');
      if (this.groupBars) this.groupBars.visible = (mode === 'bars');

      if (mode === 'tunnel') {
        this.camera.position.set(0, 2, 22);
        this.camera.lookAt(0, 0, -10);
      } else if (mode === 'bars') {
        this.camera.position.set(0, 14, 24);
        this.camera.lookAt(0, 0, 0);
      } else {
        this.camera.position.set(0, 3, 26);
        this.camera.lookAt(0, 0, 0);
      }
    }
  }

  setupInteractions() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.prevMouseX;
      const deltaY = e.clientY - this.prevMouseY;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;

      this.targetRotationY += deltaX * 0.005;
      this.targetRotationX += deltaY * 0.005;
    });

    // Touch support for mobile phones
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.prevMouseX = e.touches[0].clientX;
        this.prevMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - this.prevMouseX;
      const deltaY = e.touches[0].clientY - this.prevMouseY;
      this.prevMouseX = e.touches[0].clientX;
      this.prevMouseY = e.touches[0].clientY;

      this.targetRotationY += deltaX * 0.008;
      this.targetRotationX += deltaY * 0.008;
    }, { passive: true });

    // Responsive auto-resize observer
    const parent = this.canvas.parentElement;
    if (window.ResizeObserver && parent) {
      const ro = new ResizeObserver(() => this.handleResize());
      ro.observe(parent);
    }
    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.handleResize(), 200));
  }

  handleResize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const width = this.canvas.clientWidth || (parent ? parent.clientWidth : 360) || 360;
    const height = this.canvas.clientHeight || (parent ? parent.clientHeight : 220) || 220;

    if (this.isWebGL && this.renderer && this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    } else if (this.canvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.handleResize();
    this.animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  animate() {
    if (!this.isRunning) return;
    this.animId = requestAnimationFrame(() => this.animate());

    this.idleTime += 0.03;

    // Get live frequency data from AudioEngine
    let freqData = this.audioEngine ? this.audioEngine.getFrequencyData() : new Uint8Array(0);
    const hasLiveAudio = freqData && freqData.length > 0 && freqData.some(v => v > 0);

    let bassEnergy = 0;
    let midEnergy = 0;

    if (hasLiveAudio) {
      const bLen = Math.min(8, freqData.length);
      for (let i = 0; i < bLen; i++) bassEnergy += freqData[i];
      bassEnergy = bassEnergy / bLen / 255;

      const mLen = Math.min(32, freqData.length);
      for (let i = 8; i < mLen; i++) midEnergy += freqData[i];
      midEnergy = midEnergy / Math.max(1, (mLen - 8)) / 255;
    } else {
      // Idle harmonic breathing animation
      bassEnergy = (Math.sin(this.idleTime * 1.5) * 0.5 + 0.5) * 0.25;
      midEnergy = (Math.cos(this.idleTime * 2.1) * 0.5 + 0.5) * 0.2;
    }

    if (this.isWebGL && this.renderer && this.scene && this.camera) {
      this.renderWebGL(freqData, bassEnergy, midEnergy, hasLiveAudio);
    } else if (this.ctx2d) {
      this.renderCanvas2D(freqData, bassEnergy, midEnergy, hasLiveAudio);
    }
  }

  renderWebGL(freqData, bassEnergy, midEnergy, hasLiveAudio) {
    const time = performance.now() * 0.002;
    const fLen = freqData.length || 64;

    // Mode 1: Quantum Hologram Sphere
    if (this.currentMode === 'sphere') {
      if (this.sphereMesh && this.originalSpherePositions) {
        const posAttr = this.sphereMesh.geometry.attributes.position;
        const orig = this.originalSpherePositions;

        for (let i = 0; i < posAttr.count; i++) {
          const ox = orig.getX(i);
          const oy = orig.getY(i);
          const oz = orig.getZ(i);

          const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
          const nx = ox / len;
          const ny = oy / len;
          const nz = oz / len;

          const freqIdx = Math.floor(Math.abs(nx * 10 + ny * 12 + nz * 8)) % fLen;
          const rawVal = hasLiveAudio ? ((freqData[freqIdx] || 0) / 255) : (Math.sin(i * 0.2 + this.idleTime) * 0.5 + 0.5) * 0.2;
          const displacement = rawVal * 4.2;

          const ripple = Math.sin(len * 2.5 - time * 4) * (0.3 + bassEnergy * 1.8);
          const finalDist = len + displacement + ripple;

          posAttr.setXYZ(i, nx * finalDist, ny * finalDist, nz * finalDist);
        }
        posAttr.needsUpdate = true;

        this.sphereMesh.rotation.y += 0.006 + bassEnergy * 0.02 + this.targetRotationY;
        this.sphereMesh.rotation.x += 0.003 + this.targetRotationX;
        this.targetRotationX *= 0.92;
        this.targetRotationY *= 0.92;

        if (bassEnergy > 0.55) {
          this.sphereMesh.material.color.setHex(0xff007f);
        } else {
          this.sphereMesh.material.color.setHex(0x00f2fe);
        }
      }

      if (this.coreMesh) {
        this.coreMesh.scale.setScalar(1 + bassEnergy * 0.6);
      }

      this.haloRings.forEach((ring, idx) => {
        ring.rotation.z += (idx === 0 ? -0.012 : 0.008);
        ring.scale.setScalar(1 + bassEnergy * 0.2);
      });

      if (this.particles) {
        this.particles.rotation.y += 0.001;
      }
    }

    // Mode 2: Wave Tunnel
    else if (this.currentMode === 'tunnel') {
      if (this.tunnelGrid && this.tunnelOrigPositions) {
        const posAttr = this.tunnelGrid.geometry.attributes.position;
        const orig = this.tunnelOrigPositions;

        for (let i = 0; i < posAttr.count; i++) {
          const ox = orig.getX(i);
          const oy = orig.getY(i);
          const distFromCenter = Math.abs(ox);

          const freqIdx = Math.floor((distFromCenter / 25) * fLen) % fLen;
          const freqVal = hasLiveAudio ? ((freqData[freqIdx] || 0) / 255) : (Math.sin(ox * 0.3 + this.idleTime) * 0.3);

          const wave = Math.sin(oy * 0.2 - time * 5) * (1.5 + freqVal * 5.0 * (distFromCenter / 15));
          posAttr.setZ(i, wave);
        }
        posAttr.needsUpdate = true;
      }
    }

    // Mode 3: Equalizer Bar Ring
    else if (this.currentMode === 'bars') {
      const step = Math.max(1, Math.floor(fLen / this.equalizerBars.length));
      this.equalizerBars.forEach((bar, idx) => {
        const rawVal = hasLiveAudio ? ((freqData[idx * step] || 0) / 255) : (Math.sin(idx * 0.4 + this.idleTime) * 0.3 + 0.3);
        const targetScaleY = Math.max(0.5, rawVal * 12 + bassEnergy * 3);
        bar.scale.y += (targetScaleY - bar.scale.y) * 0.25;
        bar.position.y = bar.scale.y / 2;
      });
      this.groupBars.rotation.y += 0.004;
    }

    this.renderer.render(this.scene, this.camera);
  }

  renderCanvas2D(freqData, bassEnergy, midEnergy, hasLiveAudio) {
    const ctx = this.ctx2d;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!w || !h) return;

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    // Mode 1: Hologram Sphere 2D
    if (this.currentMode === 'sphere') {
      const baseRadius = Math.min(w, h) * 0.28;
      const numPoints = 64;

      ctx.save();
      ctx.translate(cx, cy);

      // Core glow
      const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, baseRadius * (1 + bassEnergy * 0.5));
      grad.addColorStop(0, 'rgba(255, 0, 127, 0.45)');
      grad.addColorStop(0.5, 'rgba(0, 242, 254, 0.25)');
      grad.addColorStop(1, 'rgba(3, 5, 9, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Audio reactive polygon ring
      ctx.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const fIdx = Math.floor((i / numPoints) * (freqData.length || 64)) % (freqData.length || 64);
        const val = hasLiveAudio ? (freqData[fIdx] / 255) : (Math.sin(i * 0.5 + this.idleTime * 2) * 0.3 + 0.3);
        const r = baseRadius + val * 28 + Math.sin(this.idleTime + i * 0.2) * 4;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = bassEnergy > 0.5 ? '#ff007f' : '#00f2fe';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Orbiting particles
      for (let p = 0; p < 8; p++) {
        const pAngle = this.idleTime * 0.8 + (p * Math.PI / 4);
        const pRadius = baseRadius * (1.25 + Math.sin(this.idleTime + p) * 0.15);
        const px = Math.cos(pAngle) * pRadius;
        const py = Math.sin(pAngle) * pRadius;
        ctx.fillStyle = p % 2 === 0 ? '#00f2fe' : '#ff007f';
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Mode 2: Wave Tunnel 2D
    else if (this.currentMode === 'tunnel') {
      ctx.save();
      const lines = 16;
      ctx.lineWidth = 1.5;

      for (let i = 0; i < lines; i++) {
        const progress = (i / lines + (this.idleTime * 0.2) % 1) % 1;
        const rw = w * progress * 0.9;
        const rh = h * progress * 0.85;
        const alpha = Math.sin(progress * Math.PI);

        ctx.strokeStyle = `rgba(0, 242, 254, ${alpha * 0.7})`;
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 8;
        ctx.strokeRect(cx - rw / 2, cy - rh / 2, rw, rh);
      }

      // Audio waveform through center
      ctx.beginPath();
      const sliceWidth = w / (freqData.length || 64);
      for (let i = 0; i < (freqData.length || 64); i++) {
        const val = hasLiveAudio ? (freqData[i] / 255) : (Math.sin(i * 0.2 + this.idleTime * 3) * 0.4);
        const px = i * sliceWidth;
        const py = cy + (val - 0.5) * (h * 0.4);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.restore();
    }

    // Mode 3: Equalizer Bar Spectrum 2D
    else if (this.currentMode === 'bars') {
      ctx.save();
      const numBars = 32;
      const barWidth = (w * 0.85) / numBars;
      const startX = w * 0.075;

      for (let i = 0; i < numBars; i++) {
        const fIdx = Math.floor((i / numBars) * (freqData.length || 64));
        const val = hasLiveAudio ? (freqData[fIdx] / 255) : (Math.sin(i * 0.3 + this.idleTime * 2) * 0.3 + 0.3);
        const barHeight = Math.max(4, val * (h * 0.65));
        const bx = startX + i * barWidth;
        const by = h * 0.85 - barHeight;

        const hue = (i / numBars) * 180 + 170; // Cyan to Magenta gradient
        ctx.fillStyle = `hsl(${hue}, 100%, 55%)`;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 6;
        ctx.fillRect(bx + 1, by, barWidth - 3, barHeight);
      }

      ctx.restore();
    }
  }
}

window.Visualizer3D = Visualizer3D;
