import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import GUI from "lil-gui";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd3d3d3);
const camera = new THREE.PerspectiveCamera(
  95,
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

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5).normalize();
directionalLight.castShadow = true;
scene.add(directionalLight);

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

camera.position.set(0, 2, 13);
camera.lookAt(0, 3, 0);
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load("./textures/tableTexture.webp");

let activeTrolley = null;
class Trolley {
  constructor(scene, position) {
    this.scene = scene;
    this.position = position;
    this.drawers = [];
    this.drawerStates = [false, false, false, false, false, false];
    this.drawerSpeed = 0.04;
    this.maxDrawerOpenPosition = 2.5;
    this.frontFace = null;
    this.backFace = null;
    this.leftFace = null;
    this.rightFace = null;
    this.colors = { blue: "#040449", lightBlue: "#00ace6" };

    this.isMovedOut = false;
    this.moveDistance = 4.7;
    this.trolleyGroup = new THREE.Group();
    this.scene.add(this.trolleyGroup);
    this.init();
  }

  init() {
    this.createCover();
    this.createColoredFaces();
    this.createTray();
    this.addWheels();
    for (let i = 0; i < 6; i++) {
      this.createDrawer(i);
    }
    this.trolleyGroup.add(
      this.cover,
      this.frontFace,
      this.backFace,
      this.leftFace,
      this.rightFace
    );
    this.trays.forEach((tray) => this.trolleyGroup.add(tray));
    this.wheels.forEach((wheel) => this.trolleyGroup.add(wheel));
    this.paddles.forEach((paddle) => this.trolleyGroup.add(paddle));
  }

  createDrawer(index) {
    const drawer = new THREE.Group();
    drawer.userData.trolley = this;

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
    const side1 = new THREE.Mesh(sideGeometry, sideMaterial);
    side1.position.set(0, 0, -drawerDepth / 2);
    const side2 = new THREE.Mesh(sideGeometry, sideMaterial);
    side2.position.set(0, 0, drawerDepth / 2);

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

    const handleGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.2);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 0, drawerDepth / 2 + 0.15);

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
    console.log(index, "index");
    if (!this.drawers[index]) return;
    if (!this.isMovedOut) {
      console.log("Cannot open drawer. Trolley is not moved out.");
      return;
    }
    if (activeTrolley !== null) {
      console.log("Cannot open drawer, another trolley is active.");
      return;
    }
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

    // Adjust shadow bias to improve quality
    // this.cover.children.forEach((face) => {
    //   face.castShadow = true;
    //   face.receiveShadow = true;
    //   face.shadowBias = -0.005;
    // });

    // this.scene.add(this.cover);
  }

  createColoredFaces() {
    const colorWidth = 2.6;
    const colorHeight = 5.6;
    const colorDepth = 4.6;
    const depthInset = 0.01;

    this.frontFace = this.createColoredFace(
      colorWidth,
      colorHeight,
      this.colors.lightBlue,
      {
        x: this.position.x,
        y: this.position.y + 1,
        z: 2.5 + depthInset + this.position.z,
      }
    );
    this.frontFace.material.opacity = 0;
    this.frontFace.material.transparent = true;

    this.backFace = this.createColoredFace(
      colorWidth,
      colorHeight,
      this.colors.blue,
      {
        x: this.position.x,
        y: this.position.y + 1,
        z: -2.5 - depthInset + this.position.z,
      }
    );

    this.leftFace = this.createColoredFace(
      colorDepth,
      colorHeight,
      this.colors.blue,
      {
        x: -1.5 - depthInset + this.position.x,
        y: this.position.y + 1,
        z: this.position.z,
      },
      Math.PI / 2
    );

    this.rightFace = this.createColoredFace(
      colorDepth,
      colorHeight,
      this.colors.blue,
      {
        x: 1.5 + depthInset + this.position.x,
        y: this.position.y + 1,
        z: this.position.z,
      },
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
    // face.castShadow = true;
    // face.receiveShadow = true;
    this.scene.add(face);
    return face;
  }

  createTray() {
    const trayWidth = 3.0;
    const trayHeight = 0.1;
    const trayDepth = 4.9;
    const traySideHeight = 0.5;

    const trayMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#adb5bd"),
      roughness: 0.8,
      metalness: 0.5,
    });

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
    this.trolleyGroup.add(trayBack);
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
    this.trolleyGroup.add(trayFront);
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
    this.trolleyGroup.add(trayLeft);

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
    this.trolleyGroup.add(trayRight);
    this.trays = [trayBack, trayFront, trayLeft, trayRight];
    // this.scene.add(trayBack, trayFront, trayLeft, trayRight);
  }

  toggleTrolleyMovement() {
    // Condition 2: Allow only one trolley to be moved out at a time
    if (activeTrolley && !this.isMovedOut) {
      console.log("Another trolley is already moved out.");
      return;
    }

    const targetZ = this.isMovedOut
      ? this.position.z
      : this.position.z + this.moveDistance;

    gsap.to(this.trolleyGroup.position, {
      z: targetZ,
      duration: 1,
      ease: "power2.inOut",
      onComplete: () => {
        this.isMovedOut = !this.isMovedOut;
        if (this.isMovedOut) {
          Trolley.activeTrolley = this; // Set this as the active trolley
        } else {
          Trolley.activeTrolley = null; // Clear the active trolley when moved back
        }
      },
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
    this.wheels = [];
    for (let i = 0; i < 4; i++) {
      // First wheel
      const wheel1 = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel1.rotation.z = Math.PI / 2;
      wheel1.position.y = -3.3;

      wheel1.position.x = i < 2 ? -1.2 : 1.2;
      wheel1.position.z = i % 2 === 0 ? -2.1 : 2.1;

      // Second wheel next to the first wheel
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
    this.paddle = [];
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
    this.paddles = [leftPaddle, rightPaddle];
  }
}

const trolleyCount = 4;
const spacing = 3.3;
const startPositionX = -3.3;

const trolleys = [];

for (let i = 0; i < trolleyCount; i++) {
  const xPosition = startPositionX + i * spacing;
  const trolley = new Trolley(scene, { x: xPosition, y: 0, z: 0 });
  trolleys.push(trolley);
}
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const allDrawers = [];
function updateAllDrawers() {
  allDrawers.length = 0;
  trolleys.forEach((trolley) => {
    allDrawers.push(...trolley.drawers);
  });
}

const allTrays = [];

function updateAllTrays() {
  allTrays.length = 0;
  trolleys.forEach((trolley) => {
    allTrays.push(...trolley.trays);
  });
}

updateAllTrays();
function onMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects([...allDrawers, ...allTrays]);
  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;

    // Check if a tray was clicked
    if (allTrays.includes(clickedObject)) {
      const trolley = trolleys.find((t) => t.trays.includes(clickedObject));
      if (trolley) {
        trolley.toggleTrolleyMovement();
      }
    } else {
      // Get the clicked drawer
      const clickedDrawer = clickedObject.parent;
      const trolley = trolleys.find((t) => t.drawers.includes(clickedDrawer));
      if (trolley) {
        const drawerIndex = trolley.drawers.indexOf(clickedDrawer);
        if (drawerIndex !== -1) {
          trolley.toggleDrawer(drawerIndex);
        }
      }
    }
  }
}

class Table {
  constructor(scene, position) {
    this.scene = scene;
    this.position = position;
    this.init();
  }

  init() {
    this.createTable();
    this.createTableLeft();
    this.createTableRight();
    this.createTableBack();
  }

  createTable() {
    const tableTopGeometry = new THREE.BoxGeometry(14, 0.25, 5);
    const tableTopMaterial = new THREE.MeshStandardMaterial({
      // color: "#e9ecef",
      metalness: 0.8,
      roughness: 0.5,
      map: texture,
    });
    this.tableTop = new THREE.Mesh(tableTopGeometry, tableTopMaterial);
    this.tableTop.position.set(
      this.position.x + 1.62,
      this.position.y + 1.7,
      this.position.z
    );
    this.scene.add(this.tableTop);
  }

  createTableLeft() {
    const leftGeometry = new THREE.BoxGeometry(0.25, 7.35, 5);
    const leftMaterial = new THREE.MeshStandardMaterial({
      // color: "#e9ecef",
      metalness: 0.8,
      roughness: 0.5,
      transparent: true,
      opacity: 0.9,
      map: texture,
    });
    this.leftSide = new THREE.Mesh(leftGeometry, leftMaterial);
    this.leftSide.position.set(
      this.position.x - 5.25,
      this.position.y - 2.1,
      this.position.z
    );
    this.scene.add(this.leftSide);
  }

  createTableRight() {
    const rightGeometry = new THREE.BoxGeometry(0.25, 7.35, 5);
    const rightMaterial = new THREE.MeshStandardMaterial({
      // color: "#e9ecef",
      metalness: 0.8,
      roughness: 0.5,
      transparent: true,
      opacity: 0.9,
      map: texture,
    });
    this.rightSide = new THREE.Mesh(rightGeometry, rightMaterial);
    this.rightSide.position.set(
      this.position.x + 8.5,
      this.position.y - 2.1,
      this.position.z
    );
    this.scene.add(this.rightSide);
  }

  createTableBack() {
    const backGeometry = new THREE.BoxGeometry(21, 15, 0.25);
    const backMaterial = new THREE.MeshStandardMaterial({
      // color: "#e9ecef",
      metalness: 0.8,
      roughness: 0.5,
      transparent: true,
      opacity: 0.9,
      map: texture,
    });
    this.backSide = new THREE.Mesh(backGeometry, backMaterial);
    this.backSide.position.set(
      this.position.x + 2,
      this.position.y + 1.7,
      this.position.z - 2.6
    );
    this.scene.add(this.backSide);
    this.backSide.castShadow = true;
    this.backSide.receiveShadow = true;
  }
}

const table = new Table(scene, { x: 0, y: 3, z: 0 });

function CreateTableTop(scene, position) {
  const tableTopGeometry = new THREE.BoxGeometry(14, 0.25, 3.4);
  const tableTopMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.8,
    roughness: 0.5,
    map: texture,
  });
  let tableTop = new THREE.Mesh(tableTopGeometry, tableTopMaterial);
  tableTop.position.set(position.x + 1.62, position.y + 1.7, position.z - 0.9);
  scene.add(tableTop);
  console.log("hello");
}

const tableTop = CreateTableTop(scene, { x: 0, y: 7.25, z: 0 });

class LargeCanister {
  constructor(scene, position) {
    this.scene = scene;
    this.position = position;
    this.isOpen = false;
    this.init();
  }

  init() {
    this.createCanister();
    this.addClickEvent();
  }

  createCanister() {
    const thickness = 0.2;
    const width = 2.5;
    const height = 4;
    const depth = 3;

    const defaultMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#ced4da"),
      side: THREE.DoubleSide,
      metalness: 0.8,
      roughness: 0.5,
    });

    const frontMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#f8f9fa"),
      side: THREE.DoubleSide,
      metalness: 0.8,
      roughness: 0.5,
    });

    const redMaterial = defaultMaterial.clone();
    redMaterial.color = new THREE.Color("red");

    const greenMaterial = defaultMaterial.clone();
    greenMaterial.color = new THREE.Color("green");

    const leftFace = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, height, depth),
      defaultMaterial
    );
    const rightFace = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, height, depth),
      defaultMaterial
    );
    const topFace = new THREE.Mesh(
      new THREE.BoxGeometry(width, thickness, depth),
      defaultMaterial
    );
    const bottomFace = new THREE.Mesh(
      new THREE.BoxGeometry(width, thickness, depth),
      defaultMaterial
    );
    const backFace = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, thickness),
      defaultMaterial
    );

    const frontFace = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.21, height - 1.2, thickness),
      frontMaterial
    );
    const handleGeometry = new THREE.BoxGeometry(0.2, 0.5, 0.1);
    const doorHandle = new THREE.Mesh(handleGeometry, defaultMaterial);
    doorHandle.position.set(-width / 2 - 0.8, 0, thickness / 2 + 0.1);

    const topFrontFace = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.21, 0.79, thickness + 0.01),
      frontMaterial
    );

    const indicatorGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.01);
    const greenIndicator = new THREE.Mesh(indicatorGeometry, greenMaterial);
    greenIndicator.position.set(-0.8, 0.2, thickness / 2 + 0.05);

    const redIndicator = new THREE.Mesh(indicatorGeometry, redMaterial);
    redIndicator.position.set(-0.8, 0, thickness / 2 + 0.05);

    topFrontFace.add(greenIndicator, redIndicator);

    leftFace.position.set(
      this.position.x - width / 2,
      this.position.y,
      this.position.z
    );
    rightFace.position.set(
      this.position.x + width / 2,
      this.position.y,
      this.position.z
    );
    topFace.position.set(
      this.position.x,
      this.position.y + height / 2 - thickness / 2,
      this.position.z
    );
    bottomFace.position.set(
      this.position.x,
      this.position.y - height / 2 + thickness / 2,
      this.position.z
    );
    backFace.position.set(
      this.position.x,
      this.position.y,
      this.position.z - depth / 2 + thickness / 2
    );

    const doorGroup = new THREE.Group();
    doorGroup.add(frontFace, doorHandle);
    doorGroup.position.set(
      this.position.x + width / 2,
      this.position.y - 0.4,
      this.position.z + depth / 2 - thickness / 2
    );
    frontFace.position.set(-width / 2, 0, 0);
    console.log(doorGroup, "doorGroup");
    topFrontFace.position.set(
      this.position.x,
      this.position.y + 1.41,
      this.position.z + depth / 2 - thickness / 2
    );

    this.canister = new THREE.Group();
    this.canister.add(
      leftFace,
      rightFace,
      topFace,
      bottomFace,
      backFace,
      doorGroup,
      topFrontFace
    );

    this.doorGroup = doorGroup;

    this.canister.position.set(
      this.position.x,
      this.position.y + 3.8,
      this.position.z - 0.8
    );

    this.scene.add(this.canister);
  }

  addClickEvent() {
    window.addEventListener("click", (event) => {
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObject(this.doorGroup.children[0]);
      if (intersects.length > 0) {
        this.toggleDoor();
      }
    });
  }

  toggleDoor() {
    const rotationAngle = this.isOpen ? 0 : Math.PI / 2;
    gsap.to(this.doorGroup.rotation, {
      y: rotationAngle,
      duration: 1,
      ease: "power2.inOut",
    });
    this.isOpen = !this.isOpen;
  }
}

const initialX = -1.9;
const y = 1.5;
const z = 0;
const distance = 1.8;

for (let i = 0; i < 4; i++) {
  new LargeCanister(scene, {
    x: initialX + i * distance,
    y: y,
    z: z,
  });
}

class SmallCanister {
  constructor(scene, position) {
    this.scene = scene;
    this.position = position;
    this.isOpen = false;
    this.init();
  }

  init() {
    this.createCanister();
    this.addClickEvent();
  }

  createCanister() {
    const thickness = 0.2;
    const width = 2.5;
    const height = 2;
    const depth = 3;

    const defaultMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#ced4da"),
      side: THREE.DoubleSide,
      metalness: 0.8,
      roughness: 0.5,
    });

    const frontMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#f8f9fa"),
      side: THREE.DoubleSide,
      metalness: 0.8,
      roughness: 0.5,
    });

    const leftFace = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, height, depth),
      defaultMaterial
    );
    const rightFace = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, height, depth),
      defaultMaterial
    );
    const topFace = new THREE.Mesh(
      new THREE.BoxGeometry(width, thickness, depth),
      defaultMaterial
    );
    const bottomFace = new THREE.Mesh(
      new THREE.BoxGeometry(width, thickness, depth),
      defaultMaterial
    );
    const backFace = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, thickness),
      defaultMaterial
    );

    const frontFace = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.2, height - 0.4, thickness),
      frontMaterial
    );

    const handleGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    const doorHandle = new THREE.Mesh(handleGeometry, defaultMaterial);
    doorHandle.position.set(width / 2 + 0.8, 0, thickness / 2 + 0.1);

    leftFace.position.set(
      this.position.x - width / 2,
      this.position.y,
      this.position.z
    );
    rightFace.position.set(
      this.position.x + width / 2,
      this.position.y,
      this.position.z
    );
    topFace.position.set(
      this.position.x,
      this.position.y + height / 2 - thickness / 2,
      this.position.z
    );
    bottomFace.position.set(
      this.position.x,
      this.position.y - height / 2 + thickness / 2,
      this.position.z
    );
    backFace.position.set(
      this.position.x,
      this.position.y,
      this.position.z - depth / 2 + thickness / 2
    );

    const indicatorGeometry = new THREE.BoxGeometry(0.7, 0.2, 0.01);
    const greenIndicator = new THREE.Mesh(indicatorGeometry, defaultMaterial);
    greenIndicator.position.set(width / 2, 0.5, thickness / 2 + 0.05);
    const doorGroup = new THREE.Group();
    doorGroup.add(frontFace, doorHandle, greenIndicator);
    doorGroup.position.set(
      this.position.x - width / 2,
      this.position.y,
      this.position.z + depth / 2 - thickness / 2
    );
    frontFace.position.set(width / 2, 0, 0);

    this.canister = new THREE.Group();
    this.canister.add(
      leftFace,
      rightFace,
      topFace,
      bottomFace,
      backFace,
      doorGroup
    );

    this.doorGroup = doorGroup;

    this.canister.position.set(
      this.position.x,
      this.position.y + height / 2,
      this.position.z
    );

    this.scene.add(this.canister);
  }

  addClickEvent() {
    window.addEventListener("click", (event) => {
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObject(this.doorGroup.children[0]);
      if (intersects.length > 0) {
        this.toggleDoor();
      }
    });
  }

  toggleDoor() {
    const rotationAngle = this.isOpen ? 0 : -Math.PI / 2;
    gsap.to(this.doorGroup.rotation, {
      y: rotationAngle,
      duration: 1,
      ease: "power2.inOut",
    });
    this.isOpen = !this.isOpen;
  }
}

const initial1X = -1.9;
const y1 = 4.5;
const z1 = 0;
const distance1 = 1.36;

for (let i = 0; i < 5; i++) {
  new SmallCanister(scene, {
    x: initial1X + i * distance1,
    y: y1,
    z: z1 - 0.4,
  });
}

updateAllDrawers();
window.addEventListener("click", onMouseClick);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
