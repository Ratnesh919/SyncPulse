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
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.currentMode = 'sphere'; // 'sphere', 'tunnel', 'bars'
    this.groupSphere = new THREE.Group();
    this.groupTunnel = new THREE.Group();
    this.groupBars = new THREE.Group();

    this.sphereMesh = null;
    this.originalSpherePositions = null;
    this.haloRings = [];
    this.particles = null;

    this.tunnelGrid = null;
    this.tunnelOrigPositions = null;

    this.equalizerBars = [];

    this.animId = null;
    this.isRunning = false;

    // Mouse Interaction
    this.targetRotationX = 0;
    this.targetRotationY = 0;
    this.isDragging = false;
    this.prevMouseX = 0;
    this.prevMouseY = 0;

    this.init();
  }

  init() {
    if (!window.THREE) return;

    const width = this.canvas.clientWidth || 700;
    const height = this.canvas.clientHeight || 440;

    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030509, 0.025);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    this.camera.position.set(0, 4, 28);
    this.camera.lookAt(0, 0, 0);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x00f2fe, 3, 60);
    cyanLight.position.set(15, 12, 18);
    this.scene.add(cyanLight);

    const magentaLight = new THREE.PointLight(0xff007f, 3, 60);
    magentaLight.position.set(-15, -10, 15);
    this.scene.add(magentaLight);

    // Build Modes
    this.buildSphereMode();
    this.buildTunnelMode();
    this.buildBarsMode();

    this.scene.add(this.groupSphere);
    this.scene.add(this.groupTunnel);
    this.scene.add(this.groupBars);

    this.setMode('sphere');

    // Setup Event Listeners
    this.setupInteractions();
  }

  buildSphereMode() {
    // Geodesic Sphere
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

    // Internal Solid Glowing Core
    const coreGeo = new THREE.SphereGeometry(3.5, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xff007f,
      wireframe: false,
      transparent: true,
      opacity: 0.35
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.groupSphere.add(this.coreMesh);

    // Dual Halo Orbital Rings
    for (let r = 0; r < 2; r++) {
      const ringGeo = new THREE.TorusGeometry(12 + r * 2.5, 0.12, 16, 120);
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

    // Particle Swarm
    const pCount = 500;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i += 3) {
      pPos[i] = (Math.random() - 0.5) * 60;
      pPos[i + 1] = (Math.random() - 0.5) * 60;
      pPos[i + 2] = (Math.random() - 0.5) * 60;
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
    const gridGeo = new THREE.PlaneGeometry(60, 80, 40, 50);
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
    const barCount = 48;
    const radius = 10;

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

  setMode(mode) {
    this.currentMode = mode;
    this.groupSphere.visible = (mode === 'sphere');
    this.groupTunnel.visible = (mode === 'tunnel');
    this.groupBars.visible = (mode === 'bars');

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

    // Touch support for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.prevMouseX = e.touches[0].clientX;
        this.prevMouseY = e.touches[0].clientY;
      }
    });

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
    });

    window.addEventListener('resize', () => {
      if (!this.renderer || !this.camera) return;
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
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

    const freqData = this.audioEngine.getFrequencyData();
    let bassEnergy = 0;
    let midEnergy = 0;

    if (freqData.length > 0) {
      for (let i = 0; i < 8; i++) bassEnergy += freqData[i];
      bassEnergy = bassEnergy / 8 / 255; // 0 to 1

      for (let i = 8; i < 32; i++) midEnergy += freqData[i];
      midEnergy = midEnergy / 24 / 255;
    }

    const time = performance.now() * 0.002;

    // Render Mode 1: Sphere
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

          const freqIdx = Math.floor(Math.abs(nx * 10 + ny * 12 + nz * 8)) % freqData.length;
          const displacement = ((freqData[freqIdx] || 0) / 255) * 4.2;

          const ripple = Math.sin(len * 2.5 - time * 4) * (0.3 + bassEnergy * 1.8);
          const finalDist = len + displacement + ripple;

          posAttr.setXYZ(i, nx * finalDist, ny * finalDist, nz * finalDist);
        }
        posAttr.needsUpdate = true;

        this.sphereMesh.rotation.y += 0.006 + bassEnergy * 0.02 + this.targetRotationY;
        this.sphereMesh.rotation.x += 0.003 + this.targetRotationX;
        this.targetRotationX *= 0.92;
        this.targetRotationY *= 0.92;

        if (bassEnergy > 0.65) {
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

    // Render Mode 2: Wave Tunnel
    else if (this.currentMode === 'tunnel') {
      if (this.tunnelGrid && this.tunnelOrigPositions) {
        const posAttr = this.tunnelGrid.geometry.attributes.position;
        const orig = this.tunnelOrigPositions;

        for (let i = 0; i < posAttr.count; i++) {
          const ox = orig.getX(i);
          const oy = orig.getY(i);
          const distFromCenter = Math.abs(ox);

          const freqIdx = Math.floor((distFromCenter / 30) * freqData.length) % freqData.length;
          const freqVal = (freqData[freqIdx] || 0) / 255;

          const wave = Math.sin(oy * 0.2 - time * 5) * (1.5 + freqVal * 5.0 * (distFromCenter / 15));
          posAttr.setZ(i, wave);
        }
        posAttr.needsUpdate = true;
      }
    }

    // Render Mode 3: Equalizer Bar Ring
    else if (this.currentMode === 'bars') {
      const step = Math.floor(freqData.length / this.equalizerBars.length) || 1;
      this.equalizerBars.forEach((bar, idx) => {
        const rawVal = (freqData[idx * step] || 0) / 255;
        const targetScaleY = Math.max(0.5, rawVal * 12 + bassEnergy * 3);
        bar.scale.y += (targetScaleY - bar.scale.y) * 0.25;
        bar.position.y = bar.scale.y / 2;
      });
      this.groupBars.rotation.y += 0.004;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.Visualizer3D = Visualizer3D;
