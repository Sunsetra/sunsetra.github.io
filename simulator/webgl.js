import { WEBGL } from './lib/WebGL.js';
import {
  blockUnit,
  statusEnum,
  MapInfo,
  MapGeometry,
  TimeAxis,
} from './modules/basic.js';
import { IOPoint, BuiltinCons } from './modules/cons.js';
import * as Unit from './modules/unit.js';

/* global THREE, dat */

/* 全局变量 */
const loadManager = new THREE.LoadingManager();

const resList = { // 总资源列表
  block: {
    top: {
      whiteTile: { url: 'res/texture/block/white_tile.png' },
      greyTile: { url: 'res/texture/block/grey_tile.png' },
      default: { url: 'res/texture/block/default_top.png' },
    },
    side: {
      default: { url: 'res/texture/block/default_side.png' },
    },
    bottom: {
      default: { url: 'res/texture/block/default_bottom.png' },
    },
  },
  IOPoint: {
    destination: {
      topTex: { url: 'res/texture/destinationTop.png' },
      sideTex: { url: 'res/texture/destinationSide.png' },
    },
    entry: {
      topTex: { url: 'res/texture/entryTop.png' },
      sideTex: { url: 'res/texture/entrySide.png' },
    },
  },
  enemy: {
    slime: { url: 'res/texture/enemy/slime.png' },
    saber: { url: 'res/texture/enemy/saber.png' },
  },
  operator: {
    haze: { url: 'res/texture/operator/haze.png' },
  },
  model: {
    ring: { url: 'res/model/decoration/ring.glb' },
    tomb: { url: 'res/model/construction/tomb.glb' },
  },
};

const sysStatus = { // 状态对象，用于保存当前画布的各种状态信息
  width: undefined, // 画布宽度
  height: undefined, // 画布高度
  context: undefined, // 渲染上下文种类，使用webgl/webgl2
  renderType: undefined, // 当前渲染类型是动态/静态
  map: undefined, // 当前加载的地图名
};

const enemyShop = { // 敌人实例列表，可以通过参数扩展为具有非标血量等属性的特殊敌人
  slime: () => {
    const { mat, geo } = resList.enemy.slime;
    const mesh = new THREE.Mesh(geo, mat);
    return new Unit.Slime(mesh);
  },
  saber: () => {
    const { mat, geo } = resList.enemy.saber;
    const mesh = new THREE.Mesh(geo, mat);
    return new Unit.Saber(mesh);
  },
};

/**
 * @function - 模型前处理函数，包括复制mesh，旋转模型以及新建实例
 * @param {object} consInfo - 模型信息对象
 * @param {string} consInfo.desc - 模型类型名称
 * @returns {Construction} - 返回建筑对象实例
 */
const modelShop = (consInfo) => {
  const { desc, type, rotation } = consInfo;

  if (desc === 'destination' || desc === 'entry') {
    const { geo, mat } = resList.IOPoint[desc];
    const mesh = new THREE.Mesh(geo, mat);
    return new IOPoint(mesh);
  }
  const mesh = resList.model[desc].gltf[type].clone();
  mesh.rotation.y = THREE.Math.degToRad(rotation);
  return new BuiltinCons(mesh);
};


/**
 * 游戏主函数，在资源加载完成后执行
 * @param {object} data - 地图数据对象
 */
function main(data) {
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
  let map; // 全局当前地图对象
  const activeEnemy = new Set(); // 场上敌人集合

  let needRender = false; // 静态渲染需求Flag
  let rAF; // 动态渲染取消标志
  let lastTime = 0; // 上次渲染的rAF时刻

  function init() {
    /**
     * 创建全局渲染器，当webgl2可用时使用webgl2上下文
     * @param {boolean} antialias - 是否开启抗锯齿，默认开启
     * @param {boolean} shadow - 是否开启阴影贴图，默认开启
     */
    function createRender(antialias = true, shadow = true) {
      let context;
      if (WEBGL.isWebGL2Available()) { // 可用时使用webgl2上下文
        context = canvas.getContext('webgl2');
      } else {
        context = canvas.getContext('webgl');
      }
      renderer = new THREE.WebGLRenderer({ canvas, context, antialias });
      sysStatus.context = renderer.capabilities.isWebGL2 ? 'webgl2' : 'webgl';
      renderer.shadowMap.enabled = shadow;
      renderer.gammaFactor = 2.2;
      renderer.gammaOutput = true; // 伽玛输出
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.physicallyCorrectLights = true; // 物理修正模式
    }

    /**
     * 创建全局场景
     * @param {*} color - 指定场景/雾气的背景色，默认黑色
     * @param {boolean} fog - 控制是否开启场景雾气，默认开启
     */
    function createScene(color = 'black', fog = true) {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(color);
      if (fog) {
        scene.fog = new THREE.Fog(color, 100, 200);
      }
    }

    /** 创建全局摄影机 */
    function createCamera() {
      const fov = 75;
      const aspect = canvas.clientWidth / canvas.clientHeight;
      const near = 0.1;
      const far = 500;
      camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    }

    /** 创建全局镜头控制器 */
    function createControls() {
      controls = new THREE.OrbitControls(camera, canvas);
      controls.target.set(0, 0, 0);
      controls.enableDamping = true; // 开启阻尼惯性
      controls.dampingFactor = 0.2;
      controls.update();
    }

    /**
     * 创建全局光照，包含环境光及平行光
     * @param {*} color - 指定环境光颜色，默认白色
     * @param {number} intensity - 指定环境光强度，默认为1
     */
    function createLight(color = 'white', intensity = 1) {
      envLight = new THREE.AmbientLight(color, intensity);
      sunLight = new THREE.DirectionalLight();
      scene.add(envLight);
    }

    createRender(true, true);
    createScene('black', true);
    createCamera();
    createControls();
    createLight(0xFFFFFF, 0.1);
  }

  /**
   * 根据地图数据创建地图及建筑
   * @param {object} mapData - json格式的地图数据
   * @param {Array} mapData.blockInfo - 砖块对象数组
   */
  function createMap(mapData) {
    const {
      mapWidth,
      mapHeight,
      resources,
      blockInfo,
      light,
      waves,
      enemyNum,
    } = mapData;
    const maxSize = Math.max(mapWidth, mapHeight) * blockUnit; // 地图最长尺寸
    const centerX = (mapWidth * blockUnit) / 2; // 地图X向中心
    const centerZ = (mapHeight * blockUnit) / 2; // 地图Z向中心
    map = new MapInfo(mapWidth, mapHeight, enemyNum, waves); // 初始化地图

    scene.fog.near = maxSize; // 不受雾气影响的范围为1倍最长尺寸
    scene.fog.far = maxSize * 2; // 2倍最长尺寸外隐藏
    camera.far = maxSize * 2; // 2倍最长尺寸外不显示
    camera.position.set(centerX, centerZ * 3, centerZ * 3);
    camera.updateProjectionMatrix();
    controls.target.set(centerX, 0, centerZ); // 设置摄影机朝向为地图中心

    /* 构建地图几何 */
    {
      const mapGeo = new MapGeometry(mapWidth, mapHeight, blockInfo);
      const {
        positions,
        normals,
        uvs,
        indices,
        sideGroup,
      } = mapGeo.generateGeometry();
      const geometry = new THREE.BufferGeometry();
      geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
      geometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
      geometry.setIndex(indices);

      const materialList = []; // 创建所需的所有砖块表面贴图材质
      const materialMap = { top: {}, side: {}, bottom: {} }; // 材质类型在材质列表中的索引
      const { block } = resources;
      ['top', 'side', 'bottom'].forEach((pos) => {
        block[pos].forEach((type) => {
          materialList.push(resList.block[pos][type].mat);
          materialMap[pos][type] = materialList.length - 1;
        });
      });

      blockInfo.forEach((item, ndx) => {
        const {
          row,
          column,
          texture,
          consInfo,
        } = item;
        const top = texture.top ? texture.top : 'default';
        const side = texture.side ? texture.side : 'default';
        const bottom = texture.bottom ? texture.bottom : 'default';
        const [start, count] = sideGroup[ndx];
        if (count) { // 侧面需要建面时添加侧面组
          geometry.addGroup(start, count, materialMap.side[side]);
        }
        geometry.addGroup(start + count, 6, materialMap.bottom[bottom]); // 底面组
        geometry.addGroup(start + count + 6, 6, materialMap.top[top]); // 顶面组

        if (consInfo) { // 有建筑时添加建筑
          const con = mapGeo.setConstruction(row, column, modelShop(consInfo));
          scene.add(con.mesh);
        }
      });

      const mesh = new THREE.Mesh(geometry, materialList);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }

    // blockInfo.forEach((item) => { // 构造地面砖块及建筑
    //   const {
    //     row, column, blockType, placeable, heightAlpha, texture, consInfo,
    //   } = item;
    //
    //   const { top, side, bottom } = texture;
    //   const blockTex = {
    //     topTex: top ? resList.block.top[top].tex : resList.block.top.default.tex,
    //     sideTex: side ? resList.block.side[side].tex : resList.block.side.default.tex,
    //     bottomTex: bottom ? resList.block.bottom[bottom].tex : resList.block.bottom.default.tex,
    //   };
    //   const blockInst = new Block(blockType, heightAlpha, blockTex, placeable); // 砖块Mesh只能在主函数构建
    //   const block = map.setBlock(row, column, blockInst);
    //   scene.add(block.mesh);
    //
    //   if (consInfo) { // 有建筑时添加建筑
    //     const con = map.addCon(row, column, modelShop(consInfo));
    //     scene.add(con.mesh);
    //   }
    // });

    /* 定义地图灯光 */
    {
      const {
        envIntensity,
        envColor,
        color,
        intensity,
        hour,
        phi,
      } = light;
      envLight.intensity = envIntensity;
      envLight.color.set(envColor);
      sunLight.color.set(color);
      sunLight.intensity = intensity;

      const hasHour = Object.prototype.hasOwnProperty.call(light, 'hour');
      let mapHour = hasHour ? hour : new Date().getHours(); // 如果未指定地图时间，则获取本地时间
      if (mapHour < 6 || mapHour > 18) { // 定义夜间光源
        mapHour = mapHour < 6 ? mapHour + 12 : mapHour % 12;
        sunLight.intensity = 0.6;
        sunLight.color.set(0xffffff);
        envLight.color.set(0x5C6C7C);
      }

      const hasPhi = Object.prototype.hasOwnProperty.call(light, 'phi');
      const randomDeg = Math.floor(Math.random() * 360) + 1;
      const mapPhi = hasPhi ? phi : randomDeg; // 如果未指定方位角，则使用随机方位角
      const lightRad = maxSize; // 光源半径为地图最大尺寸
      const theta = 140 - mapHour * 12; // 从地图时间计算天顶角
      const cosTheta = Math.cos(THREE.Math.degToRad(theta)); // 计算光源位置
      const sinTheta = Math.sin(THREE.Math.degToRad(theta));
      const cosPhi = Math.cos(THREE.Math.degToRad(mapPhi));
      const sinPhi = Math.sin(THREE.Math.degToRad(mapPhi));
      const lightPosX = lightRad * sinTheta * cosPhi + centerX;
      const lightPosY = lightRad * cosTheta;
      const lightPosZ = lightRad * sinTheta * sinPhi + centerZ;
      sunLight.position.set(lightPosX, lightPosY, lightPosZ);
      sunLight.target.position.set(centerX, 0, centerZ); // 设置光源终点
      sunLight.target.updateWorldMatrix();

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

      scene.add(sunLight);
      scene.add(sunLight.target);
    }
  }

  /**
   * 初始化敌人并更新维护敌人状态
   * @param {number} axisTime - 时间轴时刻
   */
  function updateEnemyStatus(axisTime) {
    if (map.waves.length) {
      const { fragments } = map.waves[0]; // 当前波次的分段
      const thisFrag = fragments[0];
      const { time, enemy, path } = thisFrag; // 首只敌人信息

      if (axisTime >= time) { // 检查应出现的新敌人
        thisFrag.inst = enemyShop[enemy](); // 创建敌人实例

        const { x, z } = path[0]; // 读取首个路径点
        const y = map.getBlock(z, x).size.y + thisFrag.inst.height / 2;
        thisFrag.inst.position = { x, y, z }; // 敌人初始定位
        scene.add(thisFrag.inst.mesh);
        path.shift(); // 删除首个路径点

        activeEnemy.add(thisFrag); // 新增活跃敌人
        fragments.shift(); // 从当前波次中删除该敌人
        // eslint-disable-next-line max-len
        // console.log(`创建 ${time}秒 出现的敌人，场上敌人剩余 ${activeEnemy.size} ，当前波次敌人剩余 ${fragments.length} ，总敌人剩余 ${map.enemyNum}`);
        if (!fragments.length) { map.waves.shift(); } // 若当前波次中剩余敌人为0则删除当前波次
      }
    }
  }

  /**
   * 更新敌人当前坐标
   * @param {number} rAFTime - 当前帧时刻
   */
  function updateEnemyPosition(rAFTime) {
    const interval = (rAFTime - lastTime) / 1000; // 帧间隔时间

    activeEnemy.forEach((enemy) => {
      const { path, inst } = enemy;
      if (path.length) { // 判定敌人是否到达终点
        if (Object.prototype.hasOwnProperty.call(inst, 'pause')) { // 判定是否正在停顿中
          inst.pause -= interval;
          if (inst.pause <= 0) { // 取消停顿恢复移动
            path.shift();
            delete inst.pause;
            // console.log(`恢复 ${enemy.time}秒 出现的敌人`);
          }
        } else if (Object.prototype.hasOwnProperty.call(path[0], 'pause')) { // 判定敌人是否停顿
          const { pause } = path[0];
          inst.pause = pause - interval;
          // console.log(`暂停 ${enemy.time}秒 出现的敌人 ${pause}秒`);
        } else { // 没有停顿则正常移动
          const oldX = inst.position.x;
          const oldZ = inst.position.z;
          const newX = path[0].x;
          const newZ = path[0].z;
          const { speed } = inst;

          let velocityX = speed / Math.sqrt(((newZ - oldZ) / (newX - oldX)) ** 2 + 1);
          velocityX = newX >= oldX ? velocityX : -velocityX;
          let velocityZ = Math.abs(((newZ - oldZ) / (newX - oldX)) * velocityX);
          velocityZ = newZ >= oldZ ? velocityZ : -velocityZ;

          const stepX = interval * velocityX + oldX;
          const stepZ = interval * velocityZ + oldZ;
          inst.position = { x: stepX, z: stepZ };

          const rotateDeg = Math.atan((newZ - oldZ) / (newX - oldX));
          inst.mesh.rotation.y = Math.PI - rotateDeg; // 调整运动方向

          const ifDeltaX = Math.abs(newX - stepX) <= Math.abs(interval * velocityX);
          const ifDeltaZ = Math.abs(newZ - stepZ) <= Math.abs(interval * velocityZ);
          if (ifDeltaX && ifDeltaZ) { // 判定是否到达当前路径点，到达则移除当前路径点
            // console.log(`移除 ${enemy.time}秒 出现的敌人路径 (${path[0].x}, ${path[0].z})`);
            path.shift();
          }
        }
      } else { // TODO: 到达则删除它并从scene中移除
        activeEnemy.delete(enemy);
        map.enemyNum -= 1;
        // eslint-disable-next-line max-len
        // console.log(`移除 ${enemy.time}秒 出现的敌人实例，场上敌人剩余 ${activeEnemy.size} ，总敌人剩余 ${map.enemyNum}`);
      }
    });
  }

  /**
   * 游戏状态更新函数
   * @param {number} axisTime - 时间轴时刻
   * @param {number} rAFTime - 当前帧时刻
   */
  function updateMap(axisTime, rAFTime) {
    if (map.enemyNum) { // 检查剩余敌人数量
      updateEnemyStatus(axisTime); // 更新维护敌人状态
      updateEnemyPosition(rAFTime); // 更新敌人位置
    } else { // TODO: 剩余敌人总数为空时游戏结束
      rAF = null; // 置空rAF以取消动画
      timeAxis.stop();
      setState(statusEnum.RESET);
      console.log('游戏结束');
    }
  }


  /** 检查渲染尺寸是否改变 */
  function checkResize() {
    const container = renderer.domElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const needResize = container.width !== width || container.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height; // 每帧更新相机宽高比
      camera.updateProjectionMatrix();
      sysStatus.width = width;
      sysStatus.height = height;
    }
  }

  /** 静态动画循环，只能由requestStaticRender调用 */
  function staticRender() {
    // console.log('静态');
    needRender = false;
    checkResize();
    controls.update(); // 开启阻尼惯性时需调用
    renderer.render(scene, camera);
  }

  /** 静态渲染入口点函数 */
  function requestStaticRender() {
    sysStatus.renderType = 'static';
    if (!needRender) {
      needRender = true;
      requestAnimationFrame(staticRender);
    }
  }

  /**
   * 动态动画循环，只能由requestDynamicRender及动画控制函数调用
   * @param {number} rAFTime - 当前帧时刻
   */
  function dynamicRender(rAFTime) {
    // console.log('动态');
    // eslint-disable-next-line max-len
    // console.log(`时间轴时间 ${timeAxis.getElapsedTimeN()}，rAF时间 ${rAFTime}，上次时间 ${lastTime}，帧时间差值${rAFTime - lastTime}`);
    updateMap(timeAxis.getElapsedTimeN(), rAFTime); // 更新敌人位置
    lastTime = rAFTime;
    const { min, secs, msecs } = timeAxis.getElapsedTimeO();
    timer.textContent = `${min}:${secs}.${msecs}`; // 更新计时器

    checkResize();
    controls.update(); // 开启阻尼惯性时需调用
    renderer.render(scene, camera);
    if (rAF) { // 从动画回调内部取消动画
      rAF = requestAnimationFrame(dynamicRender);
    }
  }

  /** 动态渲染入口点函数 */
  function requestDynamicRender() {
    sysStatus.renderType = 'dynamic';
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { pauseAnimate(); }
    });
    setState(statusEnum.PAUSE);
    timeAxis.start();
    lastTime = window.performance.now(); // 设置首帧时间
    rAF = requestAnimationFrame(dynamicRender);
  }


  /** 动画暂停函数 */
  function pauseAnimate() {
    setState(statusEnum.CONTINUE); // 必须放在stop()之前
    cancelAnimationFrame(rAF);
    timeAxis.stop(); // 先取消动画后再停止时间轴
  }

  /** 继续动画函数 */
  function continueAnimate() {
    setState(statusEnum.PAUSE);
    timeAxis.continue();
    lastTime = window.performance.now(); // 设置首帧时间
    rAF = requestAnimationFrame(dynamicRender);
  }

  /** 重置动画函数 */
  function resetAnimate() { // TODO: 重置游戏应为重玩本图
    cancelAnimationFrame(rAF);
    timeAxis.stop(); // 先取消动画后再停止时间轴
    timer.textContent = '00:00.000'; // 重置计时
    setState(statusEnum.RESET);
  }

  /**
   * 改变时间轴控制按钮状态及渲染模式
   * @param {string} state - 状态枚举值
   */
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
      starter.textContent = '开始';
      starter.removeEventListener('click', pauseAnimate);
      starter.removeEventListener('click', continueAnimate);
      starter.addEventListener('click', requestDynamicRender);
      controls.addEventListener('change', requestStaticRender);
      window.addEventListener('resize', requestStaticRender);
    }
  }


  /** 创建辅助对象，包括灯光参数控制器等 */
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

  init(); // 初始化全局变量
  createMap(data); // 创建地图
  createHelpers(); // 创建辅助对象
  requestStaticRender(); // 发出渲染请求
  reset.addEventListener('click', resetAnimate); // 仅点击重置按钮时重置计时
  setState(statusEnum.RESET);
}


/**
 * 设置加载管理器的回调函数
 * @param {object} data - 地图数据，需要传递给main()函数
 */
function setLoadingManager(data) {
  const loadingBar = document.querySelector('#loading');
  const bar = document.querySelector('#bar');
  const left = document.querySelector('#left');
  const right = document.querySelector('#right');
  let errorCounter = 0; // 错误计数

  /**
   * 创建当前地图所需的几何体及材质信息
   * @param res - 地图需要加载的资源信息（resources属性）
   */
  function createGeometry(res) {
    const { block, enemy } = res;
    Object.values(resList.IOPoint).forEach((item) => { // 构建进出点模型
      const { topTex, sideTex } = item;
      const topMat = new THREE.MeshBasicMaterial({
        alphaTest: 0.6,
        map: topTex.tex,
        side: THREE.DoubleSide,
        transparent: true,
      });
      const sideMat = new THREE.MeshBasicMaterial({
        alphaTest: 0.6,
        map: sideTex.tex,
        side: THREE.DoubleSide,
        transparent: true,
      });
      Object.defineProperty(item, 'mat', { value: [sideMat, sideMat, topMat, sideMat, sideMat, sideMat] });
      const edge = blockUnit - 0.01;
      Object.defineProperty(item, 'geo', { value: new THREE.BoxBufferGeometry(edge, edge, edge) });
    });

    ['top', 'side', 'bottom'].forEach((pos) => { // 构建砖块贴图材质
      block[pos].forEach((type) => {
        const thisTex = resList.block[pos][type].tex;
        resList.block[pos][type].mat = new THREE.MeshPhysicalMaterial({
          metalness: 0.1,
          roughness: 0.6,
          map: thisTex,
        });
      });
    });

    enemy.forEach((item) => { // 构建敌人模型
      const thisEnemy = resList.enemy[item];
      const { width, height } = thisEnemy.tex.image;
      thisEnemy.geo = new THREE.PlaneBufferGeometry(width, height);
      thisEnemy.mat = new THREE.MeshBasicMaterial({
        alphaTest: 0.6,
        depthWrite: false,
        map: thisEnemy.tex,
        side: THREE.DoubleSide,
        transparent: true,
      });
    });
  }

  /* 控制进度条及画布显隐 */
  function showCanvas() {
    const mainFrame = document.querySelector('main');

    loadingBar.style.opacity = '0'; // 渐隐加载进度条
    setTimeout(() => {
      loadingBar.style.display = 'none';
    }, 1000);

    mainFrame.style.display = 'block'; // 渐显画布
    setTimeout(() => {
      mainFrame.style.opacity = '1';
    }, 1000);
  }

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
    tip.innerText += `\n加载${url}时发生错误`;
  }

  /* 加载完成回调函数 */
  function loadingFinished() {
    if (!errorCounter) {
      const { resources } = data;
      createGeometry(resources);
      showCanvas();
      main(data); // 启动主函数
    }
  }

  loadManager.onProgress = loadingProgress;
  loadManager.onError = loadingError;
  loadManager.onLoad = loadingFinished;
}

/**
 * 加载资源，包括贴图，模型等
 * @param {object} res - 需加载的资源对象
 * @param {object} res.block - 砖块贴图资源对象
 */
function loadResources(res) {
  const texLoader = new THREE.TextureLoader(loadManager);
  const gltfLoader = new THREE.GLTFLoader(loadManager);
  const { block, model, enemy } = res;

  ['top', 'side', 'bottom'].forEach((surf) => { // 加载砖块贴图
    const texArray = block[surf];
    texArray.forEach((name) => {
      const item = resList.block[surf][name];
      item.tex = texLoader.load(item.url);
      item.tex.encoding = THREE.sRGBEncoding;
      item.tex.anisotropy = 16;
    });
  });

  ['destination', 'entry'].forEach((con) => { // 加载进出点贴图
    const texArray = resList.IOPoint[con];
    Object.values(texArray).forEach((item) => {
      const texture = texLoader.load(item.url);
      texture.encoding = THREE.sRGBEncoding;
      texture.anisotropy = 16;
      Object.defineProperty(item, 'tex', { value: texture });
    });
  });

  enemy.forEach((name) => { // 加载敌人贴图
    const item = resList.enemy[name];
    item.tex = texLoader.load(item.url);
    item.tex.encoding = THREE.sRGBEncoding;
    item.tex.anisotropy = 16;
  });

  model.forEach((name) => { // 加载建筑模型
    const item = resList.model[name];
    gltfLoader.load(item.url, (gltf) => {
      item.gltf = {};
      gltf.scene.children.forEach((obj) => { // 模型命名尾缀为模型种类
        const type = obj.name.split('_').pop();
        item.gltf[type] = obj;
      });
    });
  });

  // for (const name of operator) { // 加载干员贴图
  //   const item = texList.operator[name];
  //   item.tex = texLoader.load(item.url);
  //   item.tex.encoding = THREE.sRGBEncoding;
  //   item.anisotropy = 16;
  // }
}

function preLoading() { // 通过传入地图信息加载资源
  fetch('maps/0-1.json')
    .then((data) => data.json())
    .then((data) => {
      const { name, resources } = data;
      sysStatus.map = name;
      setLoadingManager(data);
      loadResources(resources);
    });
}

preLoading();
