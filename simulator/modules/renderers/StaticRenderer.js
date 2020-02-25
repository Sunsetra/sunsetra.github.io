import Render from './Render.js';

class StaticRenderer extends Render {
    constructor(frame, callback) {
        super(frame, callback);
        this.needRender = false;
    }
    requestRender() {
        if (!this.needRender) {
            this.needRender = true;
            requestAnimationFrame((time) => this.render(time));
        }
    }
    render(rAFTime) {
        if (this.callback) {
            this.callback(rAFTime);
        }
        this.checkResize();
        this.needRender = false;
        this.frame.controls.update();
        this.frame.renderer.render(this.frame.scene, this.frame.camera);
    }
}
export default StaticRenderer;
