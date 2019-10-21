import { WEBGL } from './lib/WebGL.js';
import { statusEnum, MapInfo, TimeAxis } from './modules/basic.js';
import { BasicBlock, HighBlock } from './modules/block.js';
import { IOPoint, BuiltinCons } from './modules/cons.js';
// import * as Unit from './modules/unit.js';

/* global THREE, dat */

/* 全局变量 */
const loadManager = new THREE.LoadingManager();
const texList = { // 总导入贴图列表
  blockTop: {
    // blackConcrete: { url: 'res/texture/black_concrete.png' },
    whiteTile: { url: 'res/texture/block/white_tile.png' },
    greyTile: { url: 'res/texture/block/grey_tile.png' },
    default: { url: 'res/texture/block/default_top.png' },
  },
  blockSide: {
    default: { url: 'res/texture/block/default_side.png' },
  },
  blockBottom: {
    default: { url: 'res/texture/block/default_bottom.png' },
  },
  destTop: { url: 'res/texture/destinationTop.png' },
  destSide: { url: 'res/texture/destinationSide.png' },
  entryTop: { url: 'res/texture/entryTop.png' },
  entrySide: { url: 'res/texture/entrySide.png' },
  enemy: {
    slime: { url: 'res/texture/enemy/slime.png' },
  },
};
const modelList = { // 总导入模型列表
  ring: { url: 'res/model/decoration/ring.glb' },
  tomb: { url: 'res/model/construction/tomb.glb' },
};
const blockShop = { // 砖块实例列表
  basicBlock: () => new BasicBlock(),
  highBlock: (alpha) => new HighBlock(alpha),
};
// const enemyShop = { // 敌人实例列表
//   slime: new Unit.Slime(texList.enemy.slime.tex),
// };
const sysState = { // 状态对象，用于保存当前画布的各种状态信息
  width: undefined, // 画布宽度
  height: undefined, // 画布高度
  context: undefined, // 渲染上下文种类，使用webgl/webgl2
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

/**
 * 模型前处理函数，包括复制mesh，旋转模型以及新建实例。
 * @param consInfo: 模型信息对象。
 * @returns {Construction}: 返回建筑实例。
 */
function getModel(consInfo) {
  const { desc, type, rotation } = consInfo;

  if (desc === 'destination') {
    return new IOPoint(texList.destTop.tex, texList.destSide.tex);
  }
  if (desc === 'entry') {
    return new IOPoint(texList.entryTop.tex, texList.entrySide.tex);
  }
  const mesh = modelList[desc].gltf[type].clone();
  mesh.rotation.y = THREE.Math.degToRad(rotation);
  return new BuiltinCons(mesh);
}


/* 主函数入口 */
function main() {
  const blockUnit = 10; // 砖块边长
  const canvas = document.querySelector('canvas');
  const timer = document.querySelector('#timer'); // 全局计时器显示
  const starter = document.querySelector('#starter');
  const reset = document.querySelector('#reset');

  const timeAxis = new TimeAxis(); // 全局时间轴
  let renderer; // 全局渲染器
  let scene; // 全局场景
  let camera; // 全局摄影机
  let controls; // 全局镜头控制器
  let envLight; // 全局环境光
  let sunLight; // 全局平行光
  let needRender = false; // 全局渲染需求Flag
  let rAF; // 全局动态渲染取消标志
  // let waveData; // 全局波次数据
  // let activeEnemy = []; // 在场的敌人数组，更新敌人位置时遍历

  /**
   * 创建全局渲染器，当webgl2可用时使用webgl2上下文。
   * @param antialias: 是否开启抗锯齿，默认开启。
   * @param shadow: 是否开启阴影贴图，默认开启。
   */
  function createRender(antialias = true, shadow = true) {
    let context;
    if (WEBGL.isWebGL2Available()) { // 可用时使用webgl2上下文
      context = canvas.getContext('webgl2', { antialias: true });
    } else {
      context = canvas.getContext('webgl', { antialias: true });
    }
    renderer = new THREE.WebGLRenderer({ canvas, context, antialias });
    sysState.context = renderer.capabilities.isWebGL2 ? 'webgl2' : 'webgl';
    renderer.shadowMap.enabled = shadow;
    renderer.gammaFactor = 2.2;
    renderer.gammaOutput = true; // 伽玛输出
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.physicallyCorrectLights = true; // 物理修正模式
  }

  /**
   * 创建全局场景。
   * @param color: 指定场景/雾气的背景色，默认黑色。
   * @param fog: 控制是否开启场景雾气，默认开启。
   */
  function createScene(color = 'black', fog = true) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(color);
    if (fog) {
      scene.fog = new THREE.Fog(color, 100, 200);
    }
  }

  /* 创建全局摄影机 */
  function createCamera() {
    const fov = 75;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const near = 0.1;
    const far = 500;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  }

  /* 创建全局镜头控制器 */
  function createControls() {
    controls = new THREE.OrbitControls(camera, canvas);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true; // 开启阻尼惯性
    controls.dampingFactor = 0.2;
    controls.update();
  }

  /**
   * 创建全局光照，包含环境光及平行光。
   * @param color: 指定环境光颜色，默认白色。
   * @param intensity: 指定环境光强度，默认为1。
   */
  function createLight(color = 'white', intensity = 1) {
    envLight = new THREE.AmbientLight(color, intensity);
    sunLight = new THREE.DirectionalLight();
    scene.add(envLight);
  }

  /* 初始化全局变量 */
  function init() {
    createRender(true, true);
    createScene('black', true);
    createCamera();
    createControls();
    createLight(0xFFFFFF, 0.1);
  }

  /**
   * 根据地图数据创建地图及建筑。
   * @param data: json格式的地图数据。
   */
  function createMap(data) {
    const {
      mapWidth, mapHeight, blockInfo, light, enemy, waves,
    } = data;
    const maxSize = Math.max(mapWidth, mapHeight) * blockUnit; // 地图最长尺寸
    const centerX = (mapWidth * blockUnit) / 2; // 地图X向中心
    const centerZ = (mapHeight * blockUnit) / 2; // 地图Z向中心
    const map = new MapInfo(mapWidth, mapHeight, blockShop.basicBlock()); // 初始化地图

    scene.fog.near = maxSize; // 不受雾气影响的范围为1倍最长尺寸
    scene.fog.far = maxSize * 2; // 2倍最长尺寸外隐藏
    camera.far = maxSize * 2; // 2倍最长尺寸外不显示
    camera.position.set(centerX, centerZ * 3, centerZ * 3);
    camera.updateProjectionMatrix();
    controls.target.set(centerX, 0, centerZ); // 设置摄影机朝向为地图中心


    blockInfo.forEach((item) => { // 构造地面砖块及建筑
      const {
        row, column, blockType, heightAlpha, texture, consInfo,
      } = item;
      const block = map.setBlock(row, column, blockShop[blockType](heightAlpha));

      const geometry = new THREE.BoxBufferGeometry(...block.size); // 定义砖块几何体

      const { top, side, bottom } = texture;
      const topTex = top ? texList.blockTop[top].tex : texList.blockTop.default.tex;
      const topMat = new THREE.MeshPhysicalMaterial({ // 定义砖块顶部贴图材质
        metalness: 0.1,
        roughness: 0.6,
        map: topTex,
      });
      const sideTex = side ? texList.blockSide[side].tex : texList.blockSide.default.tex;
      const sideMat = new THREE.MeshPhysicalMaterial({ // 定义砖块侧面贴图材质
        metalness: 0.1,
        roughness: 0.6,
        map: sideTex,
      });
      const bottomTex = bottom ? texList.blockBottom[bottom].tex : texList.blockBottom.default.tex;
      const bottomMat = new THREE.MeshPhysicalMaterial({ // 定义砖块底部贴图材质
        metalness: 0.1,
        roughness: 0.6,
        map: bottomTex,
      });
      const material = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(...block.position); // 放置砖块
      scene.add(mesh);

      if (consInfo) { // 有建筑时添加建筑
        const obj = map.addCon(row, column, getModel(consInfo));
        obj.mesh.position.set(...obj.position);
        scene.add(obj.mesh);
      }
    });

    // waveData = waves;
    // enemy.type.forEach((e) => {
    //   const texture = texList.enemy[e].tex;
    //   const { width, height } = texture.image;
    //   const geometry = new THREE.PlaneBufferGeometry(width, height);
    //   enemyShop[e] = new THREE.Mesh(geometry, texture);
    // });

    const { envIntensity, envColor } = light; // 定义灯光
    envLight.intensity = envIntensity;
    envLight.color.set(envColor);
    sunLight.color.set(light.color);
    sunLight.intensity = light.intensity;

    const hasHour = Object.prototype.hasOwnProperty.call(light, 'hour');
    let hour = hasHour ? light.hour : new Date().getHours(); // 如果未指定地图时间，则获取本地时间
    if (hour < 6 || hour > 18) { // 定义夜间光源
      hour = hour < 6 ? hour + 12 : hour % 12;
      sunLight.intensity = 0.6;
      sunLight.color.set(0xffffff);
      envLight.color.set(0x5C6C7C);
    }

    const hasPhi = Object.prototype.hasOwnProperty.call(light, 'phi');
    const randomDeg = Math.floor(Math.random() * 360) + 1;
    const phi = hasPhi ? light.phi : randomDeg; // 如果未指定方位角，则使用随机方位角
    const lightRad = maxSize; // 光源半径为地图最大尺寸
    const theta = 140 - hour * 12; // 从地图时间计算天顶角
    const cosTheta = Math.cos(THREE.Math.degToRad(theta)); // 计算光源位置
    const sinTheta = Math.sin(THREE.Math.degToRad(theta));
    const cosPhi = Math.cos(THREE.Math.degToRad(phi));
    const sinPhi = Math.sin(THREE.Math.degToRad(phi));
    const lightPosX = lightRad * sinTheta * cosPhi + centerX;
    const lightPosY = lightRad * cosTheta;
    const lightPosZ = lightRad * sinTheta * sinPhi + centerZ;
    sunLight.position.set(lightPosX, lightPosY, lightPosZ);
    sunLight.target.position.set(centerX, 0, centerZ); // 设置光源终点
    sunLight.target.updateMatrixWorld();

    sunLight.castShadow = true; // 设置光源阴影
    sunLight.shadow.camera.left = -maxSize / 2; // 按地图最大尺寸定义光源阴影
    sunLight.shadow.camera.right = maxSize / 2;
    sunLight.shadow.camera.top = maxSize / 2;
    sunLight.shadow.camera.bottom = -maxSize / 2;
    sunLight.shadow.camera.near = maxSize / 2;
    sunLight.shadow.camera.far = maxSize * 1.5; // 阴影覆盖光源半径的球体
    sunLight.shadow.bias = 0.0001;
    sunLight.shadow.mapSize.set(4096, 4096);
    sunLight.shadow.camera.updateProjectionMatrix();
    // const cameraHelper = new THREE.CameraHelper(sunLight.shadow.camera);
    // scene.add(cameraHelper);

    scene.add(sunLight);
    scene.add(sunLight.target);
  }


  // /* 更新所有敌人及其位置 */
  // function updateEnemy(thisTime) {
  //   if (waveData) {
  //     const { fragments } = waveData[0];
  //     if (fragments) {
  //       const { time, enemy } = fragments;
  //       if (thisTime >= time) {
  //         const mesh = enemyShop[enemy].clone();
  //         const inst = new Unit.
  //         activeEnemy.push(fragments);
  //       }
  //       for (const unit of enemyShop) { // 更新场上的敌人
  //         const { path } = unit;
  //       }
  //     } else {
  //       waveData.shift();
  //       updateEnemy(); // 调用自身避免丢帧
  //     }
  //   } else {
  //     // 游戏结束
  //   }
  // }


  /* 检查渲染尺寸是否改变 */
  function checkResize() {
    const container = renderer.domElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const needResize = container.width !== width || container.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height; // 每帧更新相机宽高比
      camera.updateProjectionMatrix();
      sysState.width = width;
      sysState.height = height;
    }
  }

  /* 静态动画循环，只能由requestStaticRender调用 */
  function staticRender() {
    console.log('static');
    needRender = false;
    checkResize();
    controls.update(); // 开启阻尼惯性时需调用
    renderer.render(scene, camera);
  }

  /* 静态渲染入口点函数 */
  function requestStaticRender() {
    if (!needRender) {
      needRender = true;
      requestAnimationFrame(staticRender);
    }
  }

  /* 动态动画循环，只能由requestDynamicRender调用 */
  function dynamicRender() {
    console.log('dynamic');
    // updateEnemy(timeAxis.getElapsedTimeN()); // 更新敌人位置
    checkResize();
    controls.update(); // 开启阻尼惯性时需调用
    renderer.render(scene, camera);

    const { min, secs, msecs } = timeAxis.getElapsedTimeO();
    timer.textContent = `${min}:${secs}.${msecs}`;
    rAF = requestAnimationFrame(dynamicRender);
  }


  /* 动态渲染入口点函数 */
  function requestDynamicRender() {
    setState(statusEnum.PAUSE);
    timeAxis.start();
    rAF = requestAnimationFrame(dynamicRender);
  }

  /* 动画暂停函数 */
  function pauseAnimate() {
    setState(statusEnum.CONTINUE); // 必须放在stop()之前
    cancelAnimationFrame(rAF);
    timeAxis.stop(); // 先取消动画后再停止时间轴
  }

  /* 继续动画函数 */
  function continueAnimate() {
    setState(statusEnum.PAUSE);
    timeAxis.continue();
    rAF = requestAnimationFrame(dynamicRender);
  }

  /* 重置动画函数 */
  function resetAnimate() {
    cancelAnimationFrame(rAF);
    timeAxis.stop(); // 先取消动画后再停止时间轴
    setState(statusEnum.RESET);
  }

  /* 改变时间轴控制按钮状态 */
  function setState(state) {
    if (state === statusEnum.CONTINUE) {
      starter.textContent = '继续';
      starter.removeEventListener('click', pauseAnimate);
      starter.addEventListener('click', continueAnimate);
      controls.addEventListener('change', requestStaticRender);
      window.addEventListener('resize', requestStaticRender);
    } else if (state === statusEnum.PAUSE) {
      starter.textContent = '暂停';
      starter.removeEventListener('click', requestDynamicRender);
      starter.removeEventListener('click', continueAnimate);
      starter.addEventListener('click', pauseAnimate);
      controls.removeEventListener('change', requestStaticRender);
      window.removeEventListener('resize', requestStaticRender);
    } else if (state === statusEnum.RESET) {
      timer.textContent = '00:00.000'; // 重置计时
      starter.textContent = '开始';
      starter.removeEventListener('click', pauseAnimate);
      starter.removeEventListener('click', continueAnimate);
      starter.addEventListener('click', requestDynamicRender);
      controls.addEventListener('change', requestStaticRender);
      window.addEventListener('resize', requestStaticRender);
    }
  }

  /* 创建辅助对象，包括灯光参数控制器等 */
  function createHelpers() {
    const gui = new dat.GUI();
    const lightFolder = gui.addFolder('灯光');
    lightFolder.open();
    lightFolder.add(sunLight, 'intensity', 0, 5, 0.05).name('阳光强度').onChange(requestStaticRender);
    lightFolder.add(envLight, 'intensity', 0, 5, 0.05).name('环境光强度').onChange(requestStaticRender).listen();
    lightFolder.add(sunLight.shadow, 'bias', -0.01, 0.01, 0.0001).name('阴影偏差').onChange(requestStaticRender);

    // const meshFolder = gui.addFolder('网格');
    //
    // class AxisGridHelper {
    //   constructor(element, gridSize) {
    //     const axes = new THREE.AxesHelper();
    //     axes.material.depthTest = false;
    //     axes.renderOrder = 2;
    //     element.add(axes);
    //
    //     const grid = new THREE.GridHelper(gridSize, gridSize);
    //     grid.material.depthTest = false;
    //     grid.renderOrder = 1;
    //     element.add(grid);
    //
    //     this.grid = grid;
    //     this.axes = axes;
    //     this.visible = false;
    //   }
    //
    //   get visible() { return this._visible; }
    //
    //   set visible(v) {
    //     this._visible = v;
    //     this.grid.visible = v;
    //     this.axes.visible = v;
    //   }
    // }
    // const sceneHelper = new AxisGridHelper(scene, 300);
    // meshFolder.add(sceneHelper, 'visible').name('场景网格').onChange(requestStaticRender);

    // const helper = new THREE.DirectionalLightHelper(sunLight);
    // helper.update();
    // scene.add(helper);
  }


  fetch('maps/0-1.json')
    .then((data) => data.json())
    .then((data) => {
      init(); // 初始化全局变量
      createMap(data); // 创建地图
      createHelpers(); // 创建辅助对象
      requestStaticRender(); // 发出渲染请求
      reset.addEventListener('click', resetAnimate);
      setState(statusEnum.RESET);
    });
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
    if (!errorCounter) { // 没有加载错误时更新百分比
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
      const mainFrame = document.querySelector('main');

      loadingBar.style.opacity = '0'; // 渐隐加载进度条
      setTimeout(() => {
        loadingBar.style.display = 'none';
      }, 1000);

      mainFrame.style.display = 'block'; // 渐显画布
      setTimeout(() => {
        mainFrame.style.opacity = '1';
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
