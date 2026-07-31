/**
 * Fond mesh — shaders et setup identiques à gradients.juangarcia.ch
 * (PlaneGeometry 1.5×1.5 · 200 segments · caméra fixe · pas de post-process blur)
 */
import * as THREE from 'https://unpkg.com/three@0.170.0/build/three.module.js';
import { normalizeAppTheme } from './config.js';

const GRADIENT_THEMES = {
  navy: {
    floor: '#0A3268',
    clearColor: 0x0a3268,
    colors: [
      '#2F6694',
      '#255580',
      '#0674B5',
      '#0C4088',
      '#0A3268',
    ],
  },
  orange: {
    floor: '#4a1808',
    clearColor: 0x4a1808,
    colors: [
      '#8a4020',
      '#6a3018',
      '#a83818',
      '#5c200a',
      '#4a1808',
    ],
  },
  sunset: {
    floor: '#b85014',
    clearColor: 0xb85014,
    colors: [
      '#e87830',
      '#c86020',
      '#f08838',
      '#b05018',
      '#a84812',
    ],
  },
  forest: {
    floor: '#325040',
    clearColor: 0x325040,
    colors: [
      '#508060',
      '#406850',
      '#5a9070',
      '#385848',
      '#325040',
    ],
  },
  violet: {
    floor: '#382850',
    clearColor: 0x382850,
    colors: [
      '#685098',
      '#584080',
      '#7860a8',
      '#483070',
      '#382850',
    ],
  },
  pink: {
    floor: '#582840',
    clearColor: 0x582840,
    colors: [
      '#984868',
      '#803858',
      '#a85878',
      '#703048',
      '#582840',
    ],
  },
  midnight: {
    floor: '#181c28',
    clearColor: 0x181c28,
    colors: [
      '#303848',
      '#283038',
      '#384050',
      '#202830',
      '#181c28',
    ],
  },
};

const SHARED_CONFIG = {
  amount: 0.22,
  speed: 0.035,
  fx: 3.8,
  fy: 7.4,
  meshSegments: 200,
};

/** Vertex shader (c_) — gradients.juangarcia.ch */
const VERTEX_SHADER = `
uniform vec2 uFrequency;
uniform float uTime;
uniform float uAmount;
uniform float uSpeed;
uniform vec3 uColor[5];

varying vec2 vUv;
varying vec3 vColor;

vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){
  const vec2  C = vec2(1.0/6.0, 1.0/3.0);
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 1.0/7.0;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);

  vec2 noiseCoord = uv * vec2(uFrequency.x, uFrequency.y);

  float noise = snoise(vec3(noiseCoord.x + uTime * 0.02, noiseCoord.y, uTime * uSpeed));
  modelPosition.y += noise * uAmount;

  vColor = mix(uColor[4], uColor[3], 0.28);

  for (int i = 0; i < 4; i++) {
    float noiseFlow = 0.0002 + float(i) * 0.05;
    float noiseSpeed = 0.0001 + float(i) * 0.03;
    float noiseSeed = 1.0 + float(i) * 10.0;
    vec2 noiseFreq = vec2(0.48, 0.92);
    float noiseFloor = 0.12;
    float noiseCeiling = 0.56 + float(i) * 0.08;

    float layerNoise = smoothstep(
      noiseFloor,
      noiseCeiling,
      snoise(vec3(
        noiseCoord.x * noiseFreq.x + uTime * noiseFlow,
        noiseCoord.y * noiseFreq.y,
        uTime * noiseSpeed + noiseSeed
      ))
    );

    vColor = mix(vColor, uColor[i], layerNoise);
  }

  vColor = max(vColor, uColor[4]);

  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;

  vUv = uv;
}
`;

/** Fragment — plancher garanti (navy ou orange selon thème) */
const FRAGMENT_SHADER = `
uniform vec3 uThemeFloor;

varying vec3 vColor;

void main() {
  vec3 color = max(vColor, uThemeFloor);
  gl_FragColor = vec4(color, 1.0);
}
`;

function readActiveGradientThemeId() {
  if (typeof document === 'undefined') return 'navy';
  return normalizeAppTheme(document.body?.dataset?.appTheme);
}

function resolveGradientTheme(themeId = readActiveGradientThemeId()) {
  const id = normalizeAppTheme(themeId);
  return GRADIENT_THEMES[id] || GRADIENT_THEMES.navy;
}

export function initPageGradient(canvas, { themeId } = {}) {
  if (!canvas) return null;

  const theme = resolveGradientTheme(themeId);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    debug: { checkShaderErrors: true },
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(theme.clearColor, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.5, 0.4);
  camera.lookAt(0, 0, 0);

  const seg = SHARED_CONFIG.meshSegments;

  const material = new THREE.ShaderMaterial({
    wireframe: false,
    uniforms: {
      uFrequency: { value: new THREE.Vector2(SHARED_CONFIG.fx, SHARED_CONFIG.fy) },
      uTime: { value: 0 },
      uColor: { value: theme.colors.map((hex) => new THREE.Color(hex)) },
      uAmount: { value: SHARED_CONFIG.amount },
      uSpeed: { value: SHARED_CONFIG.speed },
      uThemeFloor: { value: new THREE.Color(theme.floor) },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });

  const geometry = new THREE.PlaneGeometry(1.5, 1.5, seg, seg);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);

  let rafId = null;
  let running = true;
  const clock = new THREE.Clock();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function applyTheme(nextThemeId) {
    const next = resolveGradientTheme(nextThemeId);
    material.uniforms.uColor.value = next.colors.map((hex) => new THREE.Color(hex));
    material.uniforms.uThemeFloor.value.set(next.floor);
    renderer.setClearColor(next.clearColor, 1);
    canvas.style.background = next.floor;
    renderFrame();
  }

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function renderFrame() {
    if (!reducedMotion) {
      material.uniforms.uTime.value = clock.getElapsedTime();
    }
    renderer.render(scene, camera);
  }

  function render() {
    if (!running) return;
    rafId = requestAnimationFrame(render);
    renderFrame();
  }

  resize();
  renderFrame();
  window.addEventListener('resize', resize);
  render();

  return {
    setTheme: applyTheme,
    destroy() {
      running = false;
      if (rafId != null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

const pageBgCanvas = document.getElementById('page-bg-canvas');
const pageBgGradient = initPageGradient(pageBgCanvas);

window.addEventListener('app-theme-change', (event) => {
  pageBgGradient?.setTheme?.(event.detail?.theme);
});
