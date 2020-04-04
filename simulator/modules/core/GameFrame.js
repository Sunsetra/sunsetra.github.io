import {
    AmbientLight,
    Color,
    DirectionalLight,
    GammaEncoding,
    PerspectiveCamera,
    Scene,
    WebGLRenderer,
} from '../../lib/three/build/three.module.js';
import { OrbitControls } from '../../lib/three/examples/jsm/controls/OrbitControls.js';
import { WEBGL } from '../../lib/three/examples/jsm/WebGL.js';
import { RenderType } from '../others/constants.js';

class GameFrame {
    constructor(canvas) {
        this.canvas = canvas;
        this.lights = {
            envLight: new AmbientLight(),
            sunLight: new DirectionalLight(),
        };
        const aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera = new PerspectiveCamera();
        this.camera.aspect = aspect;
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.2;
        this.controls.update();
        this.scene = new Scene();
        this.setColor('black');
        let context;
        if (WEBGL.isWebGL2Available()) {
            context = this.canvas.getContext('webgl2');
        } else {
            context = this.canvas.getContext('webgl');
        }
        this.renderer = new WebGLRenderer({
            canvas: this.canvas,
            context,
            antialias: true,
        });
        this.enableShadow(true);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputEncoding = GammaEncoding;
        this.renderer.physicallyCorrectLights = true;
        this.status = {
            renderType: RenderType.StaticRender,
        };
    }
    setColor(r, g, b) {
        const color = (typeof r === 'number' && g !== undefined && b !== undefined) ? new Color(r, g, b) : new Color(r);
        this.scene.background = color;
        if (this.scene.fog !== null) {
            this.scene.fog.color = color;
        }
    }
    enableShadow(flag) {
        this.renderer.shadowMap.enabled = flag;
    }
}
export default GameFrame;
