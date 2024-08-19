import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import GUI from "lil-gui";

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd3d3d3);
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const gui = new GUI();

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5).normalize();
directionalLight.castShadow = true;
scene.add(directionalLight);

// Ground plane to receive shadows
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x808080,
  roughness: 0.8,
  metalness: 0.5,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2.8;
ground.receiveShadow = true;
scene.add(ground);

camera.position.set(0, 0, 10);
camera.lookAt(0, 3, 0);

class Trolley {
  constructor(scene, position, gui) {
    this.scene = scene;
    this.position = position;
    this.drawers = [];
    this.drawerStates = [false, false, false, false, false, false];
    this.drawerSpeed = 0.04;
    this.maxDrawerOpenPosition = 2.5;
    this.gui = gui;
    this.frontFace = null;
    this.backFace = null;
    this.leftFace = null;
    this.rightFace = null;
    this.colors = { blue: "#040449", lightBlue: "#00ace6" };

    this.init();
  }

  init() {
    this.createCover();
    this.createColoredFaces();
    this.createTray();
    this.addWheels();
    this.addGuiControls();
    for (let i = 0; i < 6; i++) {
      this.createDrawer(i);
    }
  }

  createDrawer(index) {
    const drawer = new THREE.Group();
    drawer.userData.trolley = this;

    // Create drawer components
    const drawerHeight = 0.82;
    const drawerDepth = 4.9;
    const drawerWidth = 2.5;

    const sideGeometry = new THREE.BoxGeometry(drawerWidth, drawerHeight, 0);
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: "#66d9ff",
      opacity: 1,
      side: THREE.DoubleSide,
      metalness: 0.8,
      roughness: 0.5,
    });

    const baseGeometry = new THREE.PlaneGeometry(drawerWidth, drawerDepth);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: "#66d9ff",
      opacity: 1,
      side: THREE.DoubleSide,
      metalness: 0.8,
      roughness: 0.5,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.rotation.x = -Math.PI / 2;
    base.position.y = -drawerHeight / 2;
    const frontHeight = 0.82;
    const frontGeometry = new THREE.BoxGeometry(drawerWidth, frontHeight, 0);
    const frontMaterial = new THREE.MeshStandardMaterial({
      color: "#66d9ff",
      metalness: 0.8,
      roughness: 0.5,
    });
    const front = new THREE.Mesh(frontGeometry, frontMaterial);
    front.position.set(0, 0, drawerDepth / 2);

    const internalSideGeometry = new THREE.PlaneGeometry(
      drawerWidth,
      drawerHeight + 0.1
    );
    const internalSide = new THREE.Mesh(internalSideGeometry, sideMaterial);
    internalSide.position.set(0, 0, -0.1);

    const rGeometry = new THREE.BoxGeometry(0.01, frontHeight, drawerDepth);
    const rside = new THREE.Mesh(rGeometry, sideMaterial);
    rside.position.x = drawerWidth / 2 - 0.01;

    const lGeometry = new THREE.BoxGeometry(0.01, frontHeight, drawerDepth);
    const lside = new THREE.Mesh(lGeometry, sideMaterial);
    lside.position.x = -drawerWidth / 2 + 0.01;

    drawer.add(base);
    drawer.add(front);
    drawer.add(internalSide);
    drawer.add(rside);
    drawer.add(lside);
    const gap = 0.1;
    drawer.position.set(0, (index - 2.5) * (drawerHeight + gap), 0.1);
    this.cover.add(drawer);
    this.drawers.push(drawer);
  }

  toggleDrawer(index) {
    if (!this.drawers[index]) return;

    const drawer = this.drawers[index];
    const isOpen = this.drawerStates[index];
    const targetPosition = isOpen ? 0.1 : this.maxDrawerOpenPosition;

    gsap.to(drawer.position, {
      z: targetPosition,
      duration: 1,
      ease: "power2.inOut",
    });

    this.drawerStates[index] = !isOpen;
  }

  createCover() {
    const thickness = 0.2;
    const width = 3;
    const height = 6;
    const depth = 5;

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#6c757d"),
      side: THREE.DoubleSide,
      roughness: 0.8,
    });

    const leftFace = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, height, depth),
      material
    );
    const rightFace = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, height, depth),
      material
    );
    const topFace = new THREE.Mesh(
      new THREE.BoxGeometry(width, thickness, depth),
      material
    );
    const bottomFace = new THREE.Mesh(
      new THREE.BoxGeometry(width, thickness, depth),
      material
    );
    const backFace = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, thickness),
      material
    );

    leftFace.position.set(-(width / 2 - thickness / 2), 0, 0);
    rightFace.position.set(width / 2 - thickness / 2, 0, 0);
    topFace.position.set(0, height / 2 - thickness / 2, 0);
    bottomFace.position.set(0, -(height / 2 - thickness / 2), 0);
    backFace.position.set(0, 0, -(depth / 2 - thickness / 2));

    this.cover = new THREE.Group();
    this.cover.add(leftFace, rightFace, topFace, bottomFace, backFace);
    this.cover.position.set(
      this.position.x,
      this.position.y + 1,
      this.position.z
    );

    this.cover.children.forEach((face) => {
      face.castShadow = true;
      face.receiveShadow = true;
      face.shadowBias = -0.005;
    });

    this.scene.add(this.cover);
  }

  createColoredFaces() {
    const colorWidth = 2.6;
    const colorHeight = 5.6;
    const colorDepth = 4.6;
    const depthInset = 0.01;

    // Front face (Transparent)
    this.frontFace = this.createColoredFace(
      colorWidth,
      colorHeight,
      this.colors.lightBlue,
      {
        x: 0,
        y: 1,
        z: 2.5 + depthInset,
      }
    );
    this.frontFace.material.opacity = 0;
    this.frontFace.material.transparent = true;

    // Back face (Blue)
    this.backFace = this.createColoredFace(
      colorWidth,
      colorHeight,
      this.colors.blue,
      {
        x: 0,
        y: 1,
        z: -2.5 - depthInset,
      }
    );

    // Left face (Blue)
    this.leftFace = this.createColoredFace(
      colorDepth,
      colorHeight,
      this.colors.blue,
      { x: -1.5 - depthInset, y: 1, z: 0 },
      Math.PI / 2
    );

    // Right face (Blue)
    this.rightFace = this.createColoredFace(
      colorDepth,
      colorHeight,
      this.colors.blue,
      { x: 1.5 + depthInset, y: 1, z: 0 },
      Math.PI / 2
    );
  }

  createColoredFace(
    width,
    height,
    color,
    position,
    rotationY = 0,
    rotationX = 0
  ) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.2,
    });
    const face = new THREE.Mesh(geometry, material);

    face.position.set(position.x, position.y, position.z);
    face.rotation.y = rotationY;
    face.rotation.x = rotationX;
    face.castShadow = true;
    face.receiveShadow = true;
    this.scene.add(face);
    return face;
  }

  createTray() {
    // Tray dimensions
    const trayWidth = 3.0;
    const trayHeight = 0.1;
    const trayDepth = 4.9;
    const traySideHeight = 0.5;

    // Tray materials
    const trayMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#adb5bd"),
      roughness: 0.8,
      metalness: 0.5,
    });
    // Back wall of the tray
    const trayBackGeometry = new THREE.BoxGeometry(
      trayWidth,
      traySideHeight,
      trayHeight
    );
    const trayBack = new THREE.Mesh(trayBackGeometry, trayMaterial);
    trayBack.position.set(
      this.position.x,
      this.position.y + 4.25,
      this.position.z - trayDepth / 2
    );
    trayBack.castShadow = true;
    trayBack.receiveShadow = true;

    // Front wall of the tray
    const trayFrontGeometry = new THREE.BoxGeometry(
      trayWidth,
      traySideHeight,
      trayHeight
    );
    const trayFront = new THREE.Mesh(trayFrontGeometry, trayMaterial);
    trayFront.position.set(
      this.position.x,
      this.position.y + 4.25,
      this.position.z + trayDepth / 2
    );
    trayFront.castShadow = true;
    trayFront.receiveShadow = true;

    // Left wall of the tray
    const trayLeftGeometry = new THREE.BoxGeometry(
      trayHeight,
      traySideHeight,
      trayDepth
    );
    const trayLeft = new THREE.Mesh(trayLeftGeometry, trayMaterial);
    trayLeft.position.set(
      this.position.x - trayWidth / 2 + 0.05,
      this.position.y + 4.25,
      this.position.z
    );
    trayLeft.castShadow = true;
    trayLeft.receiveShadow = true;

    // Right wall of the tray
    const trayRightGeometry = new THREE.BoxGeometry(
      trayHeight,
      traySideHeight,
      trayDepth
    );
    const trayRight = new THREE.Mesh(trayRightGeometry, trayMaterial);
    trayRight.position.set(
      this.position.x + trayWidth / 2 - 0.05,
      this.position.y + 4.25,
      this.position.z
    );
    trayRight.castShadow = true;
    trayRight.receiveShadow = true;

    // Add all tray parts to the scene
    this.scene.add(trayBack);
    this.scene.add(trayFront);
    this.scene.add(trayLeft);
    this.scene.add(trayRight);
  }

  addGuiControls() {
    this.gui
      .addColor(this.colors, "blue")
      .name("Blue Color")
      .onChange((value) => {
        if (this.leftFace) this.leftFace.material.color.set(value);
        if (this.rightFace) this.rightFace.material.color.set(value);
      });
    this.gui
      .addColor(this.colors, "lightBlue")
      .name("Light Blue Color")
      .onChange((value) => {
        if (this.frontFace) this.frontFace.material.color.set(value);
        if (this.backFace) this.backFace.material.color.set(value);
      });
  }

  addWheels() {
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 32);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#282424"),
      roughness: 0.8,
      metalness: 0.5,
    });
    const wheelSpacing = 0.24;

    for (let i = 0; i < 4; i++) {
      const wheel1 = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel1.rotation.z = Math.PI / 2;
      wheel1.position.y = -3.3;

      wheel1.position.x = i < 2 ? -1.2 : 1.2;
      wheel1.position.z = i % 2 === 0 ? -2.1 : 2.1;

      const wheel2 = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel2.rotation.z = Math.PI / 2;
      wheel2.position.y = -3.3;

      wheel2.position.x =
        wheel1.position.x + (i < 2 ? wheelSpacing : -wheelSpacing);
      wheel2.position.z = wheel1.position.z;

      wheel1.castShadow = true;
      wheel2.castShadow = true;

      this.cover.add(wheel1);
      this.cover.add(wheel2);
    }
    this.addMiddlePaddles();
  }

  addMiddlePaddles() {
    const paddleWidth = 0.2;
    const paddleHeight = 0.1;
    const paddleDepth = 0.5;
    const paddleMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("red"),
      roughness: 0.8,
      metalness: 0.5,
    });
    // Left paddle
    const leftPaddleGeometry = new THREE.BoxGeometry(
      paddleWidth,
      paddleHeight,
      paddleDepth
    );
    const leftPaddle = new THREE.Mesh(leftPaddleGeometry, paddleMaterial);
    leftPaddle.position.set(
      this.position.x - 0.14,
      this.position.y - 2.1,
      this.position.z + 2.5
    );
    leftPaddle.rotation.x = Math.PI / 4;
    leftPaddle.castShadow = true;
    leftPaddle.receiveShadow = true;

    // Right paddle
    const rightPaddleGeometry = new THREE.BoxGeometry(
      paddleWidth,
      paddleHeight,
      paddleDepth
    );
    const rightPaddle = new THREE.Mesh(rightPaddleGeometry, paddleMaterial);
    rightPaddle.position.set(
      this.position.x + 0.1,
      this.position.y - 2.1,
      this.position.z + 2.5
    );
    rightPaddle.rotation.x = Math.PI / 4;
    rightPaddle.castShadow = true;
    rightPaddle.receiveShadow = true;

    rightPaddle.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color("green"),
      roughness: 0.8,
      metalness: 0.5,
    });

    this.scene.add(leftPaddle);
    this.scene.add(rightPaddle);
  }
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Detect clicks and trigger drawer toggle
function onMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(trolley1.drawers);

  if (intersects.length > 0) {
    const clickedDrawer = intersects[0].object.parent;
    const drawerIndex = trolley1.drawers.indexOf(clickedDrawer);
    if (drawerIndex !== -1) {
      trolley1.toggleDrawer(drawerIndex);
    }
  }
}

window.addEventListener("click", onMouseClick);

const trolley1 = new Trolley(scene, { x: 0, y: 0, z: 0 }, gui);

function animate() {
  requestAnimationFrame(animate);

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
