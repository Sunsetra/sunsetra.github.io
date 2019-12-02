import { WEBGL } from './lib/WebGL.js';
import { blockUnit, Map, TimeAxis } from './modules/basic.js';
import { BuiltinCons, IOPoint } from './modules/cons.js';
import * as Unit from './modules/unit.js';
import UIController from './modules/ui.js';

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
  const {
    desc,
    type,
    rotation,
    rowSpan, // 第三方建筑需要在consInfo中指定所占区域
    colSpan,
  } = consInfo;

  if (desc === 'destination' || desc === 'entry') {
    const { geo, mat } = resList.IOPoint[desc];
    const mesh = new THREE.Mesh(geo, mat);
    return new IOPoint(mesh);
  }
  const mesh = resList.model[desc].gltf[type].clone();
  mesh.rotation.y = THREE.Math.degToRad(rotation);
  if (rowSpan && colSpan) { // 若是第三方建筑则需要指定所占宽高
    return new BuiltinCons(rowSpan, colSpan, mesh);
  }
  return new BuiltinCons(1, 1, mesh); // 默认的内置建筑均为1x1
};


/**
 * 游戏主函数，在资源加载完成后执行
 * @param {object} data - 地图数据对象
 */
function main(data) {
  const canvas = document.querySelector('canvas');
  let renderer; // 全局渲染器
  let camera; // 全局摄影机
  let scene; // 全局场景
  let controls; // 全局镜头控制器
  let envLight; // 全局环境光
  let sunLight; // 全局平行光
  let map; // 全局当前地图对象

  let needRender = false; // 静态渲染需求Flag

  /** 初始化场景相关全局变量 */
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

    createRender(true, true);
    createScene('black', true);
    createCamera();
    createControls();
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
   * 根据地图数据创建地图及建筑
   * @param {object} mapData - json格式的地图数据
   * @param {Array} mapData.blockInfo - 砖块对象数组
   */
  function createMap(mapData) {
    const {
      mapWidth,
      mapHeight,
      enemyNum,
      resources,
      blockInfo,
      light,
      waves,
    } = mapData;
    map = new Map(mapWidth, mapHeight, blockInfo, enemyNum, waves); // 初始化地图
    const maxSize = Math.max(mapWidth, mapHeight) * blockUnit; // 地图最长尺寸
    const centerX = (mapWidth * blockUnit) / 2; // 地图X向中心
    const centerZ = (mapHeight * blockUnit) / 2; // 地图Z向中心

    scene.fog.near = maxSize; // 不受雾气影响的范围为1倍最长尺寸
    scene.fog.far = maxSize * 2; // 2倍最长尺寸外隐藏
    camera.far = maxSize * 2; // 2倍最长尺寸外不显示
    camera.position.set(centerX, centerZ * 3, centerZ * 3);
    camera.updateProjectionMatrix();
    controls.target.set(centerX, 0, centerZ); // 设置摄影机朝向为地图中心

    /* 构建地图几何 */
    {
      const {
        positions,
        normals,
        uvs,
        indices,
        sideGroup,
      } = map.generateGeometry();
      const mapGeometry = new THREE.BufferGeometry();
      mapGeometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      mapGeometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
      mapGeometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
      mapGeometry.setIndex(indices);

      const materialList = []; // 创建所需的所有砖块表面贴图材质
      const materialMap = { top: {}, side: {}, bottom: {} }; // 材质类型在材质列表中的索引
      const { block } = resources;
      ['top', 'side', 'bottom'].forEach((pos) => {
        block[pos].forEach((type) => {
          materialList.push(resList.block[pos][type].mat);
          materialMap[pos][type] = materialList.length - 1;
        });
      });

      blockInfo.forEach((item, ndx) => { // 添加贴图顶点组及放置建筑
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
          mapGeometry.addGroup(start, count, materialMap.side[side]);
        }
        mapGeometry.addGroup(start + count, 6, materialMap.bottom[bottom]); // 底面组
        mapGeometry.addGroup(start + count + 6, 6, materialMap.top[top]); // 顶面组

        if (consInfo && !Object.prototype.hasOwnProperty.call(consInfo, 'inst')) { // 有建筑时添加建筑
          const con = map.setConstruction(row, column, modelShop(consInfo));
          if (con) {
            scene.add(con.mesh);
          }
        }
      });

      const mesh = new THREE.Mesh(mapGeometry, materialList);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }


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
      envLight = new THREE.AmbientLight(envColor, envIntensity);
      sunLight = new THREE.DirectionalLight(color, intensity);

      const hasHour = Object.prototype.hasOwnProperty.call(light, 'hour');
      let mapHour = hasHour ? hour : new Date().getHours(); // 如果未指定地图时间，则获取本地时间
      if (mapHour < 6 || mapHour > 18) { // 时间为夜间时定义夜间光源
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

      scene.add(envLight);
      scene.add(sunLight);
      scene.add(sunLight.target);

      /** 创建辅助对象，包括灯光参数控制器等 */
      const gui = new dat.GUI();
      const lightFolder = gui.addFolder('灯光');
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
  }

  /** 启动游戏流程 */
  function gameStart() {
    const timer = document.querySelector('#timer'); // 全局计时器显示
    const starter = document.querySelector('#starter');
    const reset = document.querySelector('#reset');
    const axis = document.querySelector('#axis');

    const timeAxis = new TimeAxis(); // 全局时间轴
    const activeEnemy = new Set(); // 场上敌人集合
    const axisNodes = {}; // 需要显示在时间轴元素上的子节点，格式为{axisTime: node}

    let rAF = null; // 动态渲染取消标志
    let lastTime = 0; // 上次渲染的rAF时刻

    /**
     * 创建显示在时间轴上的敌人节点
     * @param type - 节点单位类型
     * @param enemyFrag - 敌人信息片断
     * @param action - 节点行为类型
     * @param nodeTime - 节点时间（来自时间轴）
     * @returns {HTMLDivElement} - 返回时间轴节点
     */
    function createAxisNode(type, enemyFrag, action, nodeTime) {
      const { enemy, time } = enemyFrag;
      const createTime = String(time).replace('.', '_');
      const node = document.createElement('div'); // 创建容器节点
      node.setAttribute('class', `mark-icon ${enemy}${createTime}`);

      node.addEventListener('mouseover', () => {
        const nodes = axis.querySelectorAll(`.${enemy}${createTime}`);
        nodes.forEach((item) => {
          const icon = item.querySelector('.icon');
          icon.style.filter = 'brightness(2)';
          icon.style.zIndex = '999';
          const detail = item.querySelector('.detail');
          detail.style.display = 'block';
          const arrow = item.querySelector('.detail-arrow');
          arrow.style.display = 'block';
        });
      });
      node.addEventListener('mouseout', () => {
        const nodes = axis.querySelectorAll(`.${enemy}${createTime}`);
        nodes.forEach((item) => {
          const icon = item.querySelector('.icon');
          icon.style.filter = 'none';
          icon.style.zIndex = '0';
          const detail = item.querySelector('.detail');
          detail.style.display = 'none';
          const arrow = item.querySelector('.detail-arrow');
          arrow.style.display = 'none';
        });
      });

      const markNode = document.createElement('div'); // 创建时间轴标记节点
      markNode.setAttribute('class', `mark ${type} ${action}`);

      const iconNode = document.createElement('div'); // 创建图标标记节点
      iconNode.setAttribute('class', 'icon');
      const icon = resList.enemy[enemy].url;
      iconNode.style.backgroundImage = `url("${icon}")`;

      const detailNode = document.createElement('div'); // 创建详细时间节点
      detailNode.setAttribute('class', 'detail');
      detailNode.textContent = nodeTime;
      const detailArrow = document.createElement('div'); // 创建小箭头节点
      detailArrow.setAttribute('class', 'detail-arrow');

      node.appendChild(markNode);
      node.appendChild(iconNode);
      node.appendChild(detailNode);
      node.appendChild(detailArrow);
      return node;
    }

    /**
     * 游戏状态更新函数
     * @param {number} axisTime - 时间轴时刻
     * @param {number} rAFTime - 当前帧时刻
     */
    function updateMap(axisTime, rAFTime) {
      /** @function - 初始化敌人并更新维护敌人状态 */
      const updateEnemyStatus = () => {
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
            axisNodes[axisTime] = createAxisNode('enemy', thisFrag, 'create', timeAxis.getElapsedTimeS());
            axis.appendChild(axisNodes[axisTime]);
            // eslint-disable-next-line max-len
            // console.log(`创建 ${time}秒 出现的敌人，场上敌人剩余 ${activeEnemy.size} ，当前波次敌人剩余 ${fragments.length} ，总敌人剩余 ${map.enemyNum}`);
            if (!fragments.length) { map.waves.shift(); } // 若当前波次中剩余敌人为0则删除当前波次
          }
        }
      };

      /** @function - 更新敌人当前坐标 */
      const updateEnemyPosition = () => {
        const interval = (rAFTime - lastTime) / 1000; // 帧间隔时间
        /**
         * @namespace {Array} enemy.path - 敌人运动路径数组
         * @namespace {Unit} enemy.inst - 敌人单位对象
         */
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
                path.shift();
                // console.log(`移除 ${enemy.time}秒 出现的敌人路径 (${path[0].x}, ${path[0].z})`);
              }
            }
          } else { // 敌人到达终点时
            scene.remove(enemy.inst.mesh); // 从场景中移除该敌人而不需释放其共用的几何与贴图
            activeEnemy.delete(enemy);
            map.enemyNum -= 1;
            axisNodes[axisTime] = createAxisNode('enemy', enemy, 'lose', timeAxis.getElapsedTimeS());
            axis.appendChild(axisNodes[axisTime]);
            console.log(`移除 ${enemy.time}秒 出现的敌人实例，场上敌人剩余 ${activeEnemy.size} ，总敌人剩余 ${map.enemyNum}`);
          }
        });
      };

      /** @function - 更新时间轴上的子节点位置 */
      const updateTimeAxis = () => {
        Object.keys(axisNodes).forEach((keyTime) => {
          const pos = ((keyTime / axisTime) * 100).toFixed(2);
          axisNodes[keyTime].style.left = `${pos}%`;
        });
      };

      if (map.enemyNum) { // 检查剩余敌人数量
        updateEnemyStatus(); // 更新维护敌人状态
        updateEnemyPosition(); // 更新敌人位置
        updateTimeAxis();
      } else { // 存活敌人为0时游戏结束，需要手动重置战场以重玩
        rAF = null; // 置空rAF以取消动画
        timeAxis.stop();

        starter.textContent = '▶';
        starter.removeEventListener('click', pauseAnimate);
        starter.removeEventListener('click', continueAnimate);
        starter.addEventListener('click', requestDynamicRender);
        controls.addEventListener('change', requestStaticRender);
        window.addEventListener('resize', requestStaticRender);
        console.log('游戏结束');
      }
    }

    /**
     * 递归释放参数对象中包含的资源
     * @param resource - 包含资源的对象
     * @returns - 返回被释放的对象
     */
    function destroyMap(resource) {
      if (!resource) { return resource; } // 传入空对象时直接返回

      if (Array.isArray(resource)) { // 传入数组（材质对象或Object3D的children）
        resource.forEach((res) => destroyMap(res));
        return resource;
      }

      if (resource instanceof THREE.Object3D) { // 解包Object3D中的资源
        destroyMap(resource.geometry);
        destroyMap(resource.material);
        destroyMap(resource.children);
      } else if (resource instanceof THREE.Material) {
        Object.values(resource).forEach((value) => { // 遍历材质对象中的属性值
          if (value instanceof THREE.Texture) { value.dispose(); } // 废弃其中的贴图实例
        });
        resource.dispose(); // 废弃材质对象
      } else if (resource instanceof THREE.BufferGeometry) {
        resource.dispose(); // 废弃几何体对象
      }
      return resource;
    }

    /**
     * 动态动画循环，只能由requestDynamicRender及动画控制函数调用
     * @param {number} rAFTime - 当前帧时刻
     */
    function dynamicRender(rAFTime) {
      // eslint-disable-next-line max-len
      // console.log(`时间轴时间 ${timeAxis.getElapsedTimeN()}，rAF时间 ${rAFTime}，上次时间 ${lastTime}，帧时间差值${rAFTime - lastTime}`);
      updateMap(timeAxis.getElapsedTimeN().toFixed(4), rAFTime); // 更新敌人位置
      lastTime = rAFTime;
      timer.textContent = timeAxis.getElapsedTimeS(); // 更新计时器

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
      starter.textContent = '⏸';
      starter.removeEventListener('click', requestDynamicRender);
      starter.addEventListener('click', pauseAnimate);
      controls.removeEventListener('change', requestStaticRender);
      window.removeEventListener('resize', requestStaticRender);

      timeAxis.start();
      lastTime = window.performance.now(); // 设置首帧时间
      rAF = requestAnimationFrame(dynamicRender);
    }

    /** 动画暂停函数 */
    function pauseAnimate() {
      starter.textContent = '▶'; // UI控制
      starter.removeEventListener('click', pauseAnimate);
      starter.addEventListener('click', continueAnimate);
      controls.addEventListener('change', requestStaticRender);
      window.addEventListener('resize', requestStaticRender);

      cancelAnimationFrame(rAF);
      timeAxis.stop(); // 先取消动画后再停止时间轴
    }

    /** 继续动画函数 */
    function continueAnimate() {
      starter.textContent = '⏸';
      starter.removeEventListener('click', requestDynamicRender);
      starter.removeEventListener('click', continueAnimate);
      starter.addEventListener('click', pauseAnimate);
      controls.removeEventListener('change', requestStaticRender);
      window.removeEventListener('resize', requestStaticRender);

      timeAxis.continue();
      lastTime = window.performance.now(); // 设置首帧时间
      rAF = requestAnimationFrame(dynamicRender); // TODO: 是否应调用requestDynamicRender？
    }

    /** 重置动画函数 */
    function resetAnimate() {
      cancelAnimationFrame(rAF);
      timeAxis.stop(); // 取消动画并停止时间轴

      while (axis.firstChild) { // 清除时间轴的子节点
        axis.removeChild(axis.firstChild);
      }

      activeEnemy.forEach((enemy) => {
        scene.remove(enemy.inst.mesh);
        activeEnemy.delete(enemy);
      });
      map.resetMap(); // 重置游戏变量
      destroyMap(scene); // 释放资源

      starter.textContent = '▶';
      starter.removeEventListener('click', pauseAnimate);
      starter.removeEventListener('click', continueAnimate);
      starter.addEventListener('click', requestDynamicRender);
      controls.addEventListener('change', requestStaticRender);
      window.addEventListener('resize', requestStaticRender);
      timer.textContent = '00:00.000';
      requestStaticRender();
    }

    reset.addEventListener('click', resetAnimate); // 仅点击重置按钮时重置计时及地图状态
    starter.textContent = '▶';
    starter.removeEventListener('click', pauseAnimate);
    starter.removeEventListener('click', continueAnimate);
    starter.addEventListener('click', requestDynamicRender);
    controls.addEventListener('change', requestStaticRender);
    window.addEventListener('resize', requestStaticRender);
  }


  init(); // 初始化全局变量
  createMap(JSON.parse(JSON.stringify(data))); // 创建地图
  requestStaticRender(); // 发出渲染请求
  gameStart();
}


/**
 * 设置加载管理器的回调函数
 * @param {object} data - 地图数据，需要传递给main()函数
 */
function setLoadingManager(data) {
  const bar = document.querySelector('#bar');
  const left = document.querySelector('#left');
  const right = document.querySelector('#right');
  const tip = document.querySelector('#progress_tip');
  let errorCounter = 0; // 错误计数

  /**
   * 创建当前地图所需的几何体及材质信息
   * @param res - 地图需要加载的资源信息（resources属性）
   */
  function createGeometry(res) {
    const { block, enemy } = res;
    ['top', 'side', 'bottom'].forEach((surf) => { // 构建砖块贴图材质
      block[surf].forEach((type) => {
        const thisTex = resList.block[surf][type].tex;
        resList.block[surf][type].mat = new THREE.MeshPhysicalMaterial({
          metalness: 0.1,
          roughness: 0.6,
          map: thisTex,
        });
      });
    });

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
      if (percent >= 100) { right.style.display = 'none'; }
    }
  }

  /* 加载错误处理函数 */
  function loadingError(url) {
    errorCounter += 1;
    tip.innerText += `\n加载${url}时发生错误`;
  }

  /* 加载完成回调函数 */
  function loadingFinished() {
    if (!errorCounter) {
      const { resources } = data;
      createGeometry(resources);
      UIController.loadingToGameFrame();
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

  const loadTex = (url, obj) => {
    const texture = texLoader.load(url);
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = 16;
    Object.defineProperty(obj, 'tex', { value: texture });
  };

  ['top', 'side', 'bottom'].forEach((surf) => { // 加载砖块贴图
    const texArray = block[surf];
    texArray.forEach((name) => {
      const item = resList.block[surf][name];
      loadTex(item.url, item);
    });
  });

  ['destination', 'entry'].forEach((con) => { // 加载进出点贴图
    const texArray = resList.IOPoint[con];
    Object.values(texArray).forEach((item) => {
      loadTex(item.url, item);
    });
  });

  enemy.forEach((name) => { // 加载敌人贴图
    const item = resList.enemy[name];
    loadTex(item.url, item);
  });

  // for (const name of operator) { // 加载干员贴图
  //   const item = texList.operator[name];
  //   item.tex = texLoader.load(item.url);
  //   item.tex.encoding = THREE.sRGBEncoding;
  //   item.anisotropy = 16;
  // }

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
}

function preLoading(mapPath) { // 通过传入地图信息加载资源
  fetch(mapPath)
    .then((data) => data.json())
    .then((data) => {
      const { name, resources } = data;
      sysStatus.map = name;
      setLoadingManager(data);
      loadResources(resources);
    });
}

UIController.initUI(); // 初始化UI为整个程序入口点
UIController.mapSelectToLoading(preLoading);
