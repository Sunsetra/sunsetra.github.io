import Render from './Render.js';

class DynamicRenderer extends Render {
    constructor(frame, callback) {
        super(frame, callback);
        this.lastTime = 0;
        this.rAF = null;
    }

    requestRender() {
        this.lastTime = window.performance.now();
        this.rAF = requestAnimationFrame((time) => this.render(time));
    }

    stopRender() {
        if (this.rAF) {
            cancelAnimationFrame(this.rAF);
        }
        this.rAF = null;
    }

    render(rAFTime) {
        if (this.callback !== undefined) {
            this.callback(rAFTime);
        }
        this.lastTime = rAFTime;
        this.checkResize();
        this.frame.controls.update();
        this.frame.renderer.render(this.frame.scene, this.frame.camera);
        if (this.rAF) {
            this.rAF = requestAnimationFrame((time) => this.render(time));
        }
    }
}

export default DynamicRenderer;
