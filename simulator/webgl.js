import * as Basic from './modules/basic.js';

/* global THREE, dat */

/**
 * TODO: 处理外部导入问题；
 * TODO: 解决gap问题；
 */

/* 全局变量定义 */
const canvas = document.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color('black');

/* 摄像机相关定义 */
const fov = 75;
const aspect = canvas.clientWidth / canvas.clientHeight;
const near = 0.1;
const far = 500;
const cameraX = 0;
const cameraY = 80;
const cameraZ = 0;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
// const camera = new THREE.OrthographicCamera(-50, 50, 50, -50, near, far);
camera.position.set(cameraX, cameraY, cameraZ);

const controls = new THREE.OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.2;
controls.update();

/* 静态动画循环 */
let needRender = false;
function staticRender() {
  needRender = false;
  // 每帧更新相机宽高比
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  controls.update();
  renderer.render(scene, camera);
}
function requestRender() {
  if (!needRender) {
    needRender = true;
    requestAnimationFrame(staticRender);
  }
}

/* dat.GUI辅助控件 */
const gui = new dat.GUI();
const lightFolder = gui.addFolder('灯光');
lightFolder.open();
const meshFolder = gui.addFolder('网格');

/* 定义地图 */
const blockGap = 0.2; // 砖块间隙固定值
const blockUnit = 10; // 砖块边长像素
const mapWidth = 9;
const mapHeight = 4;
const zeroOne = new Basic.MapInfo(mapWidth, mapHeight, new Basic.HighBlock());
zeroOne.setBlock(2, 1, new Basic.BasicBlock());
zeroOne.setBlock(2, 2, new Basic.BasicBlock());
zeroOne.setBlock(3, 2, new Basic.BasicBlock());
zeroOne.setBlock(3, 3, new Basic.BasicBlock());
zeroOne.setBlock(3, 4, new Basic.BasicBlock());
zeroOne.setBlock(2, 4, new Basic.BasicBlock());
zeroOne.setBlock(2, 5, new Basic.BasicBlock());
zeroOne.setBlock(2, 6, new Basic.BasicBlock());
zeroOne.setBlock(2, 7, new Basic.BasicBlock());
zeroOne.setBlock(2, 8, new Basic.BasicBlock());
zeroOne.setBlock(3, 6, new Basic.BasicBlock());
zeroOne.setBlock(3, 7, new Basic.BasicBlock());
zeroOne.setBlock(3, 8, new Basic.BasicBlock());
zeroOne.setBlock(3, 9, new Basic.BasicBlock());

// 生成场景
for (let height = 0; height < mapHeight; height += 1) {
  for (let width = 0; width < mapWidth; width += 1) {
    // 生成地面
    const block = zeroOne.getBlock(height + 1, width + 1);
    const geometry = new THREE.BoxBufferGeometry(...block.size);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF,
      metalness: 0.1,
      roughness: 0.6,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const x = width * block.width + block.width / 2 + width / 5;
    const z = height * block.depth + block.depth / 2 + height / 5;
    mesh.position.set(x, 0, z);
    scene.add(mesh);
  }
}

/* 测试添加装饰 */
const gltfLoader = new THREE.GLTFLoader();
const url = 'texture/test1.glb';
gltfLoader.load(url, (gltf) => {
  const root = gltf.scene;

  /* 处理导入的网格几何体 */
  root.children.forEach((obj) => {
    const test = new Basic.Construction(1, 1, obj);
    test.normalize();
    zeroOne.addCon(1, 1, test);
  });
  /* 添加入口和出口 */
  const dest = new Basic.Destination();
  zeroOne.addCon(2, 1, dest);
  const entry = new Basic.Entry();
  zeroOne.addCon(3, 9, entry);

  zeroOne.getCons().forEach((con) => {
    if (con) {
      con.mesh.position.set(...con.position);
      scene.add(con.mesh);
    }
  });
});

/* 灯光定义 */
// 定义环境光
{
  const color = 0xFFFFFF;
  const intensity = 0.1;
  const light = new THREE.AmbientLight(color, intensity);
  lightFolder.add(light, 'intensity', 0, 1, 0.05).name('环境光强度').onChange(staticRender);
  scene.add(light);
}
{
  // 定义平行阳光
  const color = 0xE6CDB4;
  let intensity = 1.2;
  const sunLight = new THREE.DirectionalLight(color, intensity);

  // 阳光终点位置
  const lightTargetZ = (mapHeight * blockUnit + blockGap * (mapHeight - 1)) / 2;
  const lightTargetX = (mapWidth * blockUnit + blockGap * (mapWidth - 1)) / 2;
  sunLight.target.position.set(lightTargetX, 0, lightTargetZ);
  sunLight.target.updateMatrixWorld();
  scene.add(sunLight);
  scene.add(sunLight.target);

  const lightRad = Math.max(mapHeight * 10, mapWidth * 10); // 阳光半径
  const phi = Math.floor(Math.random() * 360) + 1; // 随机初始角度
  const hour = new Date().getHours();
  let theta = 0;
  if (hour <= 12) { // 光强度及角度随当前时间变化
    intensity = hour <= 6 ? 1.8 : 2.6 - hour * 0.13;
    theta = hour <= 6 ? 70 : 140 - hour * 12;
  } else {
    intensity = hour >= 18 ? 1.8 : hour * 0.13 - 0.6;
    theta = hour >= 18 ? 70 : 140 - hour * 12;
  }

  const cosTheta = Math.cos(THREE.Math.degToRad(theta));
  const sinTheta = Math.sin(THREE.Math.degToRad(theta));
  const cosPhi = Math.cos(THREE.Math.degToRad(phi));
  const sinPhi = Math.sin(THREE.Math.degToRad(phi));
  const lightPosX = lightRad * sinTheta * cosPhi + lightTargetX;
  const lightPosY = lightRad * cosTheta;
  const lightPosZ = lightRad * sinTheta * sinPhi + lightTargetZ;
  sunLight.intensity = intensity;
  sunLight.position.set(lightPosX, lightPosY, lightPosZ);

  // 定义平行光阴影
  sunLight.castShadow = true;
  sunLight.shadow.camera.left = -100;
  sunLight.shadow.camera.right = 100;
  sunLight.shadow.camera.top = 100;
  sunLight.shadow.camera.bottom = -100;
  sunLight.shadow.bias = 0.0001;
  sunLight.shadow.mapSize.set(8192, 8192);
  sunLight.shadow.camera.updateProjectionMatrix();

  const helper = new THREE.DirectionalLightHelper(sunLight);
  lightFolder.add(sunLight, 'intensity', 0, 2, 0.05).name('阳光强度').onChange(staticRender);
  helper.update();
  scene.add(helper);
}


/* 辅助对象定义 */
class AxisGridHelper {
  constructor(element, gridSize) {
    const axes = new THREE.AxesHelper();
    axes.material.depthTest = false;
    axes.renderOrder = 2;
    element.add(axes);

    const grid = new THREE.GridHelper(gridSize, gridSize);
    grid.material.depthTest = false;
    grid.renderOrder = 1;
    element.add(grid);

    this.grid = grid;
    this.axes = axes;
    this.visible = false;
  }

  get visible() { return this._visible; }

  set visible(v) {
    this._visible = v;
    this.grid.visible = v;
    this.axes.visible = v;
  }
}
const sceneHelper = new AxisGridHelper(scene, 500);
meshFolder.add(sceneHelper, 'visible').name('场景网格').onChange(staticRender);

renderer.render(scene, camera);
staticRender();
controls.addEventListener('change', requestRender);
window.addEventListener('resize', requestRender);
