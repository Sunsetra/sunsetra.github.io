import * as Basic from './modules/basic.js';
import * as Block from './modules/block.js';
import * as Cons from './modules/cons.js';

/* global THREE, dat */

const blockUnit = 10; // 砖块边长像素

/* 加载资源文件 */
const loadManager = new THREE.LoadingManager();
// const gltfLoader = new THREE.GLTFLoader(loadManager);
const loader = new THREE.TextureLoader(loadManager);

// let externalModel = null;
// gltfLoader.load('res/model/destination.glb', (gltf) => {
//   externalModel = gltf.scene;
// });

const blockTop = loader.load('res/texture/blockTop.png');
const destinationSide = loader.load('res/texture/destinationSide.png');
const destinationTop = loader.load('res/texture/destinationTop.png');
const entrySide = loader.load('res/texture/entrySide.png');
const entryTop = loader.load('res/texture/entryTop.png');


function main() {
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
    const canv = renderer.domElement;
    const width = canv.clientWidth;
    const height = canv.clientHeight;
    const needResize = canv.width !== width || canv.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    controls.update();
    renderer.render(scene, camera);
  }

  function requestRender() { // 只在需要时更新画布渲染
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

  /* 定义环境光 */
  const color = 0xFFFFFF;
  const intensity = 0.1;
  const envLight = new THREE.AmbientLight(color, intensity);
  lightFolder.add(envLight, 'intensity', 0, 1, 0.05).name('环境光强度').onChange(requestRender).listen();
  scene.add(envLight);


  function createMap(data) {
    const blockShop = {
      basicBlock: new Block.BasicBlock(),
      highBlock: new Block.HighBlock(),
    };
    const consShop = {
      destination: new Cons.IOPoint(destinationTop, destinationSide),
      entry: new Cons.IOPoint(entryTop, entrySide),
    };

    const mapWidth = data.width;
    const mapHeight = data.height;
    const map = new Basic.MapInfo(mapWidth, mapHeight, blockShop.basicBlock);

    data.blockInfo.forEach((item) => {
      /* 生成地面 */
      const block = map.setBlock(item.row, item.column, blockShop[item.block]);
      if (item.height) { // 自定义砖块高度
        block.height = item.height;
      }
      const geometry = new THREE.BoxBufferGeometry(...block.size);
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xFFFFFF,
        metalness: 0.1,
        roughness: 0.6,
        map: blockTop,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const x = (item.column + 0.5) * block.width;
      const y = block.height / 2;
      const z = (item.row + 0.5) * block.depth;
      mesh.position.set(x, y, z);
      scene.add(mesh);

      /* 添加建筑 */
      if (item.construction) {
        const con = map.addCon(item.row, item.column, consShop[item.construction]);
        con.mesh.position.set(...con.position);
        scene.add(con.mesh);
      }
    });


    /* 灯光定义 */
    envLight.intensity = data.light.envIntensity; // 调整环境光强度
    envLight.color.set(data.light.envColor);
    const sunLight = new THREE.DirectionalLight(); // 定义平行阳光
    sunLight.color.set(data.light.color);
    sunLight.intensity = data.light.intensity;

    const lightTargetZ = (mapHeight * blockUnit) / 2;
    const lightTargetX = (mapWidth * blockUnit) / 2;
    sunLight.target.position.set(lightTargetX, 0, lightTargetZ); // 阳光终点位置
    sunLight.target.updateMatrixWorld();
    scene.add(sunLight);
    scene.add(sunLight.target);

    const lightRad = Math.max(mapHeight * blockUnit, mapWidth * blockUnit); // 定义阳光半径
    const hasHour = Object.prototype.hasOwnProperty.call(data.light, 'hour');
    const hour = hasHour ? data.light.hour : new Date().getHours(); // 如果未指定地图时间，则获取本地时间

    const hasPhi = Object.prototype.hasOwnProperty.call(data.light, 'phi');
    const randomDeg = Math.floor(Math.random() * 360) + 1;
    const phi = hasPhi ? data.light.phi : randomDeg; // 如果未指定方位角，则使用随机方位角
    let theta = 0; // 天顶角

    if (hour < 6 || hour > 18) {
      sunLight.intensity = 0;
    } else {
      theta = 140 - hour * 12;
      const cosTheta = Math.cos(THREE.Math.degToRad(theta)); // 计算光源位置
      const sinTheta = Math.sin(THREE.Math.degToRad(theta));
      const cosPhi = Math.cos(THREE.Math.degToRad(phi));
      const sinPhi = Math.sin(THREE.Math.degToRad(phi));
      const lightPosX = lightRad * sinTheta * cosPhi + lightTargetX;
      const lightPosY = lightRad * cosTheta;
      const lightPosZ = lightRad * sinTheta * sinPhi + lightTargetZ;
      sunLight.position.set(lightPosX, lightPosY, lightPosZ);
    }

    sunLight.castShadow = true; // 定义光源阴影
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.bias = 0.0001;
    sunLight.shadow.mapSize.set(8192, 8192);
    sunLight.shadow.camera.updateProjectionMatrix();

    const helper = new THREE.DirectionalLightHelper(sunLight);
    lightFolder.add(sunLight, 'intensity', 0, 2, 0.05).name('阳光强度').onChange(requestRender);
    helper.update();
    scene.add(helper);
  }

  /* 通过json数据构建地图 */
  fetch('maps/0-1.json')
    .then((data) => data.json())
    .then((data) => {
      createMap(data);
      requestRender();
    });

  // /* 处理导入的网格几何体 */
  // externalModel.children.forEach((obj) => {
  //   const test = new Cons.Construction(1, 1, obj);
  //   test.normalize();
  //   zeroOne.addCon(2, 2, test);
  // });

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
  const sceneHelper = new AxisGridHelper(scene, 300);
  meshFolder.add(sceneHelper, 'visible').name('场景网格').onChange(requestRender);

  renderer.render(scene, camera);
  requestRender();
  controls.addEventListener('change', requestRender);
  window.addEventListener('resize', requestRender);
}

loadManager.onLoad = main;
