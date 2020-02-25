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
        this.listeners = new Map();
        this.enableShadow(true);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputEncoding = GammaEncoding;
        this.renderer.physicallyCorrectLights = true;
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

    addEventListener(obj, type, handler, once = false) {
        const target = this.listeners.get(obj);
        if (target === undefined) {
            const handlerObj = Object.defineProperty({}, type, {
                value: new Set([handler]),
                configurable: true,
                enumerable: true,
            });
            this.listeners.set(obj, handlerObj);
        } else if (Object.prototype.hasOwnProperty.call(target, type)) {
            if (!once && target[type].has(handler)) {
                return;
            }
            target[type].add(handler);
        } else {
            Object.defineProperty(target, type, {
                value: new Set([handler]),
                configurable: true,
                enumerable: true,
            });
        }
        if (once) {
            obj.addEventListener(type, handler, { once: true });
        } else {
            obj.addEventListener(type, handler);
        }
    }

    removeEventListener(obj, type, handler) {
        const target = this.listeners.get(obj);
        if (target === undefined || !Object.prototype.hasOwnProperty.call(target, type) || !target[type].size) {
            return;
        }
        if (handler === undefined) {
            target[type].forEach((h) => { obj.removeEventListener(type, h); });
            delete target[type];
        } else {
            if (!target[type].has(handler)) {
                return;
            }
            obj.removeEventListener(type, handler);
            target[type].delete(handler);
        }
    }

    clearEventListener() {
        this.listeners.forEach((value, target) => {
            Object.keys(value).forEach((type) => {
                value[type].forEach((handler) => { target.removeEventListener(type, handler); });
            });
        });
        this.listeners = new Map();
    }
}
export default GameFrame;
