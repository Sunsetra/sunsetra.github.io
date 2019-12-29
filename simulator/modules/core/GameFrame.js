/**
 * 游戏基础框架
 * @author: 落日羽音
 */
import * as THREE from '../../lib/three/build/three.module.js';
import { OrbitControls } from '../../lib/three/examples/jsm/controls/OrbitControls.js';
import { WEBGL } from '../../lib/three/examples/jsm/WebGL.js';


/**
 * 游戏基础框架类
 * 包含场景对象、地图光照、相机对象、控制器对象、渲染器对象
 */
class GameFrame {
  constructor(canvas) {
    this.canvas = canvas;
    this.lights = {
      envLight: new THREE.AmbientLight(),
      sunLight: new THREE.DirectionalLight(),
    };
    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera();
    this.camera.aspect = aspect; // 设置相机为画布宽高比
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.2; // 开启阻尼惯性，系数0.2
    this.controls.update();
    this.scene = new THREE.Scene();
    this.setColor('black'); // 默认场景色为黑色
    let context;
    if (WEBGL.isWebGL2Available()) {
      context = this.canvas.getContext('webgl2');
    }
    else {
      context = this.canvas.getContext('webgl');
    }
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      context,
      antialias: true,
    });
    this.enableShadow(true); // 默认开启阴影
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputEncoding = THREE.GammaEncoding; // 伽玛输出
    this.renderer.physicallyCorrectLights = true; // 开启物理修正模式
  }
  setColor(r, g, b) {
    const color = (g === undefined || b === undefined) ? new THREE.Color(r) : new THREE.Color(r, g, b);
    this.scene.background = color;
    if (this.scene.fog) {
      this.scene.fog.color = color;
    }
  }
  /**
   * 设置是否开启场景阴影
   * @param flag: 场景阴影开关，默认开启
   */
  enableShadow(flag) {
    this.renderer.shadowMap.enabled = flag;
  }
}
export default GameFrame;
