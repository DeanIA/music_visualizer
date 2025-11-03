// Configurable parameters for the scene

// Star field parameters
const STAR_COUNT = 2000; // Number of stars in the star field
const STAR_SPREAD = 10000; // Spatial spread of stars in all directions
const STAR_SIZE = 0.5; // Size of each star point

// Camera parameters
const CAMERA_FOV = 75; // Field of view in degrees (typical range: 50-100)
const CAMERA_FAR = 1e12; // Far clipping plane distance (large to encompass vast space)
const CAMERA_POSITION = { x: 0, y: 0, z: STAR_SPREAD / 2 }; // ≈ (0, 0, 5000) // Initial camera position in 3D space

// Nebula parameters
const NEBULA_SPRITE_COUNT = 300; // Number of smoke sprites composing the nebula
const NEBULA_RADIUS = 250; // Radius of the nebula volume
const NEBULA_OPACITY = 0.4; // Opacity of nebula sprites (0 transparent - 1 opaque)
const NEBULA_SCALE_MIN = 80; // Minimum scale of nebula sprites
const NEBULA_SCALE_MAX = 200; // Maximum scale of nebula sprites

// Nebula color range parameters
const NEBULA_COLOR_RANGE = {
  hueMin: 0.75, // 0–1 (lower = redder, higher = bluer)
  hueMax: 0.9,  // 0–1 (upper bound on hue)
  saturationMin: 0.5, // 0–1 (color saturation lower bound)
  saturationMax: 0.8, // 0–1 (color saturation upper bound)
  lightnessMin: 0.3,  // 0–1 (lightness lower bound)
  lightnessMax: 0.6,  // 0–1 (lightness upper bound)
};

import * as THREE from 'three';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';

// StarField: creates a field of white star points scattered in 3D space
class StarField {
  constructor(scene, starCount = STAR_COUNT, spread = STAR_SPREAD) {
    this.scene = scene;
    this.starCount = starCount;
    this.spread = spread;

    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];

    for (let i = 0; i < this.starCount; i++) {
      const x = THREE.MathUtils.randFloatSpread(this.spread);
      const y = THREE.MathUtils.randFloatSpread(this.spread);
      const z = THREE.MathUtils.randFloatSpread(this.spread);
      starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));

    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: STAR_SIZE });
    this.starField = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.starField);
  }
}

// Nebula: creates a volumetric cloud of translucent sprites with color shifting hues
class Nebula {
  constructor(scene, {
    colorRange = NEBULA_COLOR_RANGE,
    spriteCount = NEBULA_SPRITE_COUNT,
    radius = NEBULA_RADIUS,
    scaleRange = { min: NEBULA_SCALE_MIN, max: NEBULA_SCALE_MAX },
    opacity = NEBULA_OPACITY,
  } = {}) {
    this.scene = scene;
    this.colorRange = colorRange;
    this.spriteCount = spriteCount;
    this.radius = radius;
    this.scaleRange = scaleRange;
    this.opacity = opacity;

    // Create a radial gradient texture for smoke sprite appearance
    const canvasSize = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(
      canvasSize / 2,
      canvasSize / 2,
      0,
      canvasSize / 2,
      canvasSize / 2,
      canvasSize / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    this.smokeTexture = new THREE.CanvasTexture(canvas);

    this.smokeSprites = [];
    this.smokeGroup = new THREE.Group();
    this.scene.add(this.smokeGroup);

    for (let i = 0; i < this.spriteCount; i++) {
      const h = THREE.MathUtils.lerp(this.colorRange.hueMin, this.colorRange.hueMax, Math.random());
      const s = this.colorRange.saturationMin + Math.random() * (this.colorRange.saturationMax - this.colorRange.saturationMin);
      const l = this.colorRange.lightnessMin + Math.random() * (this.colorRange.lightnessMax - this.colorRange.lightnessMin);
      const color = new THREE.Color().setHSL(h, s, l);

      const material = new THREE.SpriteMaterial({
        map: this.smokeTexture,
        color: color,
        transparent: true,
        opacity: this.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const sprite = new THREE.Sprite(material);

      // Distribute sprites within a sphere using spherical coordinates
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      const theta = THREE.MathUtils.randFloat(0, 2 * Math.PI);
      const r = this.radius * Math.cbrt(Math.random()); // Cube root for uniform volume distribution

      sprite.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      const scale = this.scaleRange.min + Math.random() * (this.scaleRange.max - this.scaleRange.min);
      sprite.scale.set(scale, scale, 1);

      this.smokeGroup.add(sprite);
      this.smokeSprites.push(sprite);
    }

    this.hueShiftDirection = 1;
    this.currentHue = this.colorRange.hueMax;
  }

  update() {
    // Slowly rotate the nebula group for dynamic effect
    this.smokeGroup.rotation.y += 0.001;
    this.smokeGroup.rotation.x += 0.0005;

    if (this.smokeSprites.length > 0) {
      // Shift hue back and forth between hueMin and hueMax
      this.currentHue += 0.0005 * this.hueShiftDirection;
      if (this.currentHue > this.colorRange.hueMax) {
        this.currentHue = this.colorRange.hueMax;
        this.hueShiftDirection = -1;
      } else if (this.currentHue < this.colorRange.hueMin) {
        this.currentHue = this.colorRange.hueMin;
        this.hueShiftDirection = 1;
      }
      this.smokeSprites.forEach((sprite) => {
        const offset = (sprite.id % 10) * 0.005;
        const hue = THREE.MathUtils.clamp(this.currentHue + offset, this.colorRange.hueMin, this.colorRange.hueMax);
        const s = 0.65; // fixed saturation for dynamic color shift
        const l = 0.45; // fixed lightness for dynamic color shift
        sprite.material.color.setHSL(hue, s, l);
      });
    }
  }
}

// SpaceScene: sets up the Three.js scene, camera, controls, and manages animation loop
class SpaceScene {
  constructor() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      0.1,
      CAMERA_FAR
    );
    this.camera.position.set(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.domElement.style.touchAction = 'none';
    document.body.appendChild(this.renderer.domElement);

    // Controls:
    //   W/S - move forward/backward
    //   A/D - move left/right
    //   R/F - move up/down
    //   Click + drag to look around
    //   Scroll wheel adjusts movementSpeed
    this.controls = new FlyControls(this.camera, this.renderer.domElement);
    this.controls.movementSpeed = 200; // Adjust to control flight speed
    this.controls.rollSpeed = Math.PI / 12; // Controls how fast you can roll/turn
    this.controls.dragToLook = true; // Click and drag to look around
    this.controls.autoForward = true; // Only move forward when key pressed
    this.controls.movementSpeed = 200; // increase for faster flight

    this.starField = new StarField(this.scene);

    this.nebulae = [
      new Nebula(this.scene, {
        colorRange: {
          hueMin: 0.8,
          hueMax: 0.95,
          saturationMin: 0.5,
          saturationMax: 0.8,
          lightnessMin: 0.3,
          lightnessMax: 0.6,
        },
        spriteCount: NEBULA_SPRITE_COUNT,
        radius: NEBULA_RADIUS,
        scaleRange: { min: NEBULA_SCALE_MIN, max: NEBULA_SCALE_MAX },
        opacity: NEBULA_OPACITY,
      }),
      new Nebula(this.scene, {
        colorRange: {
          hueMin: 0.55,
          hueMax: 0.65,
          saturationMin: 0.5,
          saturationMax: 0.8,
          lightnessMin: 0.3,
          lightnessMax: 0.6,
        },
        spriteCount: NEBULA_SPRITE_COUNT,
        radius: NEBULA_RADIUS,
        scaleRange: { min: NEBULA_SCALE_MIN, max: NEBULA_SCALE_MAX },
        opacity: NEBULA_OPACITY,
      }),
      new Nebula(this.scene, {
        colorRange: {
          hueMin: 0.02,
          hueMax: 0.1,
          saturationMin: 0.5,
          saturationMax: 0.8,
          lightnessMin: 0.3,
          lightnessMax: 0.6,
        },
        spriteCount: NEBULA_SPRITE_COUNT,
        radius: NEBULA_RADIUS,
        scaleRange: { min: NEBULA_SCALE_MIN, max: NEBULA_SCALE_MAX },
        opacity: NEBULA_OPACITY,
      }),
      new Nebula(this.scene, {
        colorRange: {
          hueMin: 0.35,
          hueMax: 0.45,
          saturationMin: 0.5,
          saturationMax: 0.8,
          lightnessMin: 0.3,
          lightnessMax: 0.6,
        },
        spriteCount: NEBULA_SPRITE_COUNT,
        radius: NEBULA_RADIUS,
        scaleRange: { min: NEBULA_SCALE_MIN, max: NEBULA_SCALE_MAX },
        opacity: NEBULA_OPACITY,
      }),
    ];

    this.nebulae[0].smokeGroup.position.set(-500, 200, -300);
    this.nebulae[1].smokeGroup.position.set(600, -300, -400);
    this.nebulae[2].smokeGroup.position.set(-200, -400, 200);
    this.nebulae[3].smokeGroup.position.set(400, 300, 100);

    window.addEventListener('resize', () => this.onWindowResize());

    this.clock = new THREE.Clock();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    this.controls.update(delta);

    this.nebulae.forEach(n => n.update());

    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}

const spaceScene = new SpaceScene();
spaceScene.animate();