import * as Basic from './modules/basic.js';
import * as Block from './modules/block.js';
import * as Cons from './modules/cons.js';

/* global THREE, dat */
// TODO: 优化结构（全局作用域已完成）

/* 全局变量 */
const loadManager = new THREE.LoadingManager();
const texList = { // 总贴图列表
  blockTop: {
    blackConcrete: { url: 'res/texture/black_concrete.png' },
    whiteTile: { url: 'res/texture/white_tile.png' },
    default: { url: 'res/texture/default_top.png' },
  },
  blockSide: {
    default: { url: 'res/texture/default_side.png' },
  },
  blockBottom: {
    default: { url: 'res/texture/default_bottom.png' },
  },
  destTop: { url: 'res/texture/destinationTop.png' },
  destSide: { url: 'res/texture/destinationSide.png' },
  entryTop: { url: 'res/texture/entryTop.png' },
  entrySide: { url: 'res/texture/entrySide.png' },
};
const modelList = { // 总模型列表
  ring: { url: 'res/model/decoration/ring.glb' },
  tomb: { url: 'res/model/construction/tomb.glb' },
};


/**
 * 从贴图列表中加载贴图。
 * @param list: 贴图列表。
 */
function loadTexture(list) {
  const texLoader = new THREE.TextureLoader(loadManager);
  for (const item of Object.values(list)) {
    if (item.url) {
      item.tex = texLoader.load(item.url);
      item.tex.encoding = THREE.sRGBEncoding;
      item.anisotropy = 16;
    } else {
      loadTexture(item);
    }
  }
}

/**
 * 从模型列表中加载模型。
 * @param list: 模型列表。
 */
function loadModel(list) {
  const gltfLoader = new THREE.GLTFLoader(loadManager);
  for (const model of Object.values(list)) {
    gltfLoader.load(model.url, (gltf) => {
      model.gltf = {};
      gltf.scene.children.forEach((obj) => {
        const type = obj.name.split('_').pop();
        model.gltf[type] = obj;
      });
    });
  }
}

/* 设置加载管理器的回调函数 */
function setLoading() {
  const loadingBar = document.querySelector('#loading');
  const bar = document.querySelector('#bar');
  const left = document.querySelector('#left');
  const right = document.querySelector('#right');
  let errorCounter = 0; // 错误计数

  /* 加载进度监控函数 */
  function loadingProgress(url, itemsLoaded, itemsTotal) {
    if (itemsLoaded) { // 开始加载后的百分比样式
      left.style.margin = '0';
      left.style.transform = 'translateX(-50%)';
      right.style.margin = '0';
      right.style.transform = 'translateX(50%)';
    }
    if (!errorCounter) {
      const percent = (itemsLoaded / itemsTotal) * 100;
      bar.style.width = `${100 - percent}%`; // 设置中部挡块宽度
      left.textContent = `${Math.round(percent)}%`; // 更新加载百分比
      right.textContent = `${Math.round(percent)}%`;
      if (percent >= 100) {
        right.style.display = 'none';
      }
    }
  }

  /* 加载错误处理函数 */
  function loadingError(url) {
    const tip = document.querySelector('#progress_tip');
    errorCounter += 1;
    tip.textContent = `加载${url}时发生错误`;
  }

  /* 加载完成回调函数 */
  function LoadingFinished() {
    if (!errorCounter) {
      const canvas = document.querySelector('canvas');

      loadingBar.style.opacity = '0'; // 渐隐加载进度条
      setTimeout(() => {
        loadingBar.style.display = 'none';
      }, 1000);

      canvas.style.display = 'block'; // 渐显画布
      setTimeout(() => {
        canvas.style.opacity = '1';
      }, 1000);

      main(); // 启动主函数
    }
  }

  loadManager.onProgress = loadingProgress;
  loadManager.onError = loadingError;
  loadManager.onLoad = LoadingFinished;
}

setLoading();
loadTexture(texList);
loadModel(modelList);


/**
 * 模型前处理函数，包括复制mesh，旋转模型以及新建实例。
 * @param consInfo: 模型信息对象。
 * @returns {Construction}: 返回建筑实例。
 */
function getModel(consInfo) {
  const { desc, type, rotation } = consInfo;
  const consShop = {
    destination: () => new Cons.IOPoint(texList.destTop.tex, texList.destSide.tex),
    entry: () => new Cons.IOPoint(texList.entryTop.tex, texList.entrySide.tex),
    ring: (t) => { // 环状装饰：
      const mesh = modelList.ring.gltf[t].clone();
      mesh.rotation.y = THREE.Math.degToRad(rotation);
      return new Cons.BuiltinCons(mesh);
    },
    tomb: (t) => {
      const mesh = modelList.tomb.gltf[t].clone();
      return new Cons.BuiltinCons(mesh);
    },
  };
  return consShop[desc](type);
}


/**
 * 主动画函数。
 * 函数全局变量包括：画布canvas，渲染器renderer，场景scene，摄影机camera，
 * 控制器controls
 * 全局函数包括：动画循环staticRender()，启动动画循环requestRender()，创建地图createMap()
 */
function main() {
  /* 全局变量定义 */
  const blockUnit = 10; // 砖块边长
  const canvas = document.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.gammaFactor = 2.2;
  renderer.gammaOutput = true; // 伽玛输出
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.physicallyCorrectLights = true;
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
    const container = renderer.domElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const needResize = container.width !== width || container.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height; // 每帧更新相机宽高比
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
  lightFolder.add(envLight, 'intensity', 0, 5, 0.05).name('环境光强度').onChange(requestRender).listen();
  scene.add(envLight);


  function createMap(data) {
    const { blockInfo, light } = data;
    const blockShop = {
      basicBlock: new Block.BasicBlock(),
      highBlock: new Block.HighBlock(),
    };
    const mapWidth = data.width;
    const mapHeight = data.height;
    const map = new Basic.MapInfo(mapWidth, mapHeight, blockShop.basicBlock);

    /* 构建地图实体 */
    blockInfo.forEach((item) => {
      const {
        row, column, height, texture, consInfo,
      } = item;
      /* 生成地面 */
      const block = map.setBlock(row, column, blockShop[item.block]);
      if (height) { // 自定义砖块高度
        block.height = height;
      }
      const geometry = new THREE.BoxBufferGeometry(...block.size);

      const { top, side, bottom } = texture;
      const topTex = top ? texList.blockTop[top].tex : texList.blockTop.default.tex;
      const topMat = new THREE.MeshPhysicalMaterial({ // 定义地砖顶部贴图材质
        metalness: 0.1,
        roughness: 0.6,
        map: topTex,
      });
      const sideTex = side ? texList.blockSide[side].tex : texList.blockSide.default.tex;
      const sideMat = new THREE.MeshPhysicalMaterial({ // 定义地砖侧面贴图材质
        metalness: 0.1,
        roughness: 0.6,
        map: sideTex,
      });
      const bottomTex = bottom ? texList.blockBottom[bottom].tex : texList.blockBottom.default.tex;
      const bottomMat = new THREE.MeshPhysicalMaterial({ // 定义地砖底部贴图材质
        metalness: 0.1,
        roughness: 0.6,
        map: bottomTex,
      });
      const material = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const x = (column + 0.5) * block.width;
      const y = block.height / 2;
      const z = (row + 0.5) * block.depth;
      mesh.position.set(x, y, z);
      scene.add(mesh);

      /* 添加建筑 */
      if (consInfo) {
        const obj = map.addCon(row, column, getModel(consInfo));
        obj.mesh.position.set(...obj.position);
        scene.add(obj.mesh);
      }
    });


    /* 灯光定义 */
    const { envIntensity, envColor } = light;
    envLight.intensity = envIntensity; // 调整环境光
    envLight.color.set(envColor);
    const sunLight = new THREE.DirectionalLight(); // 定义平行光源
    sunLight.color.set(light.color);
    sunLight.intensity = light.intensity;

    const lightTargetZ = (mapHeight * blockUnit) / 2;
    const lightTargetX = (mapWidth * blockUnit) / 2;
    sunLight.target.position.set(lightTargetX, 0, lightTargetZ); // 设置光源终点
    sunLight.target.updateMatrixWorld();
    scene.add(sunLight);
    scene.add(sunLight.target);

    const hasHour = Object.prototype.hasOwnProperty.call(light, 'hour');
    let hour = hasHour ? light.hour : new Date().getHours(); // 如果未指定地图时间，则获取本地时间
    const lightRad = Math.max(mapHeight * blockUnit, mapWidth * blockUnit); // 定义阳光半径
    const hasPhi = Object.prototype.hasOwnProperty.call(light, 'phi');
    const randomDeg = Math.floor(Math.random() * 360) + 1;
    const phi = hasPhi ? light.phi : randomDeg; // 如果未指定方位角，则使用随机方位角

    if (hour < 6 || hour > 18) { // 定义夜间光源
      hour = hour < 6 ? hour + 12 : hour % 12;
      sunLight.intensity = 0.6;
      sunLight.color.set(0xffffff);
      envLight.color.set(0x5C6C85);
    }
    const theta = 140 - hour * 12; // 天顶角
    const cosTheta = Math.cos(THREE.Math.degToRad(theta)); // 计算光源位置
    const sinTheta = Math.sin(THREE.Math.degToRad(theta));
    const cosPhi = Math.cos(THREE.Math.degToRad(phi));
    const sinPhi = Math.sin(THREE.Math.degToRad(phi));
    const lightPosX = lightRad * sinTheta * cosPhi + lightTargetX;
    const lightPosY = lightRad * cosTheta;
    const lightPosZ = lightRad * sinTheta * sinPhi + lightTargetZ;
    sunLight.position.set(lightPosX, lightPosY, lightPosZ);

    sunLight.castShadow = true; // 定义光源阴影
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.bias = 0.0001;
    sunLight.shadow.mapSize.set(8192, 8192);
    sunLight.shadow.camera.updateProjectionMatrix();

    const helper = new THREE.DirectionalLightHelper(sunLight);
    lightFolder.add(sunLight, 'intensity', 0, 5, 0.05).name('阳光强度').onChange(requestRender);
    lightFolder.add(sunLight.shadow, 'bias', -0.01, 0.01, 0.0001).name('阴影偏差').onChange(requestRender);
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
