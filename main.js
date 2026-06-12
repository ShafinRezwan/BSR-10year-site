import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff);
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);

const isMobile = window.innerWidth <= 500;
camera.position.set(0, 0, isMobile ? 30 : 28); // 45 on mobile, 28 on desktop

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.zoomSpeed = 0.8;
controls.rotateSpeed = 0.6;
controls.panSpeed = 0.8;
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
};

// --- Lighting ---
const ambLight = new THREE.AmbientLight(0xffffff, 18);
scene.add(ambLight);

// ============================================================
// --- GLB Model + Animation ---
// ============================================================
let mixer = null;
let logoModel = null;
const mixerClock = new THREE.Clock(); // separate clock so mixer delta is independent

const gltfLoader = new GLTFLoader();
gltfLoader.load(
  "BETTERSOUNDS.glb",
  (gltf) => {
    logoModel = gltf.scene;

    // Auto-center and scale to fit the scene
    const box = new THREE.Box3().setFromObject(logoModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 4 / maxDim; // adjust this number to make it bigger/smaller
    logoModel.scale.setScalar(scale);
    logoModel.position.sub(center.multiplyScalar(scale));
    logoModel.position.set(0, -2, 13);

    scene.add(logoModel);

    // Play baked animations if any exist in the GLB
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(logoModel);
      gltf.animations.forEach((clip) => {
        mixer.clipAction(clip).play();
      });
      console.log(`Playing ${gltf.animations.length} animation(s) from GLB`);
    } else {
      console.log("No baked animations in GLB — using code rotation");
    }
  },
  undefined,
  (err) => console.error("GLB load error:", err)
);
// ============================================================

// --- Image data ---
const images = [
  {
    url: "images/000096470014.JPG",
    label: "AS IF!",
    size: 10,
  },
  {
    url: "images/bsr01.jpg",
    label: "AS IF & MOGZ",
    size: 8,
  },
  {
    url: "images/bsr02.jpg",
    label: "CARBON COPY",
    size: 10,
  },
  {
    url: "images/bsr03.jpg",
    label: "KAMEL",
    size: 8,
  },
  {
    url: "images/bsr04.jpg",
    label: "KAMEL SHOW",
    size: 13,
  },
  {
    url: "images/bsr05.jpg",
    label: "",
    size: 6,
  },
  {
    url: "images/bsr06.jpg",
    label: "",
    size: 8,
  },
  {
    url: "images/IMG_0576.jpg",
    label: "",
    size: 7,
  },
  {
    url: "images/IMG_1447.jpg",
    label: "",
    size: 6,
  },
  {
    url: "images/IMG_3064.JPG",
    label: "",
    size: 10,
  },
  {
    url: "images/IMG_2715.JPG",
    label: "",
    size: 7,
  },
  {
    url: "images/IMG_1376.JPEG",
    label: "",
    size: 6,
  },
  {
    url: "images/naif876-029.jpg",
    label: "",
    size: 5.5,
  },
  {
    url: "images/aham881-013.jpg",
    label: "",
    size: 6,
  },
  {
    url: "images/IMG_3155.jpg",
    label: "",
    size: 9,
  },
  {
    url: "images/asif465-003.jpg",
    label: "",
    size: 9,
  },
  {
    url: "images/asif465-018.jpg",
    label: "",
    size: 8,
  },
  {
    url: "images/asif465-041.jpg",
    label: "",
    size: 7.5,
  },
  {
    url: "images/asif465-042.jpg",
    label: "",
    size: 9,
  },
  {
    url: "images/asif465-055.jpg",
    label: "",
    size: 6.5,
  },
  {
    url: "images/asif465-056.jpg",
    label: "",
    size: 9,
  },
  {
    url: "images/asif465-060.jpg",
    label: "",
    size: 7,
  },
];

// --- Helpers ---
const loader = new THREE.TextureLoader();
const meshes = [];

function randPos(spread = 18) {
  return new THREE.Vector3(
    (Math.random() - 0.5) * spread,
    (Math.random() - 0.5) * spread * 0.7,
    (Math.random() - 0.5) * spread * 0.8
  );
}

// --- Build image planes ---
images.forEach((img, i) => {
  loader.load(img.url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    const aspect = tex.image.width / tex.image.height;
    const s = img.size;
    const geo = new THREE.PlaneGeometry(s * aspect, s);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);

    const pos = randPos();
    mesh.position.copy(pos);
    mesh.rotation.z = (Math.random() - 0.5) * 0.3;
    mesh.rotation.x = (Math.random() - 0.5) * 0.15;
    mesh.userData = { label: img.label, originPos: pos.clone(), index: i };

    scene.add(mesh);
    meshes.push(mesh);
  });
});

// --- Raycaster & tooltip ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.getElementById("tooltip");
let hoveredMesh = null;

window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  tooltip.style.left = e.clientX + 16 + "px";
  tooltip.style.top = e.clientY - 8 + "px";
});

// --- Resize ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Public controls ---
window.resetCamera = function () {
  const isMobile = window.innerWidth <= 500;
  camera.position.set(0, 0, isMobile ? 30 : 28);
  controls.target.set(0, 0, 0);
};

window.scatter = function () {
  meshes.forEach((m) => {
    m.userData.target = randPos(32);
  });
};

window.gather = function () {
  meshes.forEach((m) => {
    m.userData.target = m.userData.originPos.clone();
  });
};

// --- Animation loop ---
const clock = new THREE.Clock();
const _lerpTarget = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Drive GLB baked animation (if exported from Blender)
  if (mixer) mixer.update(mixerClock.getDelta());

  // Continuous 360 Y-axis rotation — adjust 0.008 for speed
  if (logoModel) {
    logoModel.rotation.y = t * 0.5;
  }

  // Image plane bobbing and scatter/gather
  meshes.forEach((m, i) => {
    const bob = Math.sin(t * 0.4 + i * 0.7) * 0.03;
    if (m.userData.target) {
      m.position.lerp(m.userData.target, 0.03);
    } else {
      m.position.y = m.userData.originPos.y + bob;
    }
    m.rotation.z += Math.sin(t * 0.2 + i) * 0.0003;
  });

  // Hover detection
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(meshes);

  if (hits.length > 0) {
    const hit = hits[0].object;
    if (hoveredMesh !== hit) {
      if (hoveredMesh) hoveredMesh.scale.setScalar(1);
      hoveredMesh = hit;
      tooltip.style.display = "block";
      tooltip.textContent = hit.userData.label;
    }
    _lerpTarget.set(1.08, 1.08, 1.08);
    hit.scale.lerp(_lerpTarget, 0.12);
    renderer.domElement.style.cursor = "pointer";
  } else {
    if (hoveredMesh) {
      _lerpTarget.set(1, 1, 1);
      hoveredMesh.scale.lerp(_lerpTarget, 0.12);
      hoveredMesh = null;
      tooltip.style.display = "none";
    }
    renderer.domElement.style.cursor = "grab";
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();
