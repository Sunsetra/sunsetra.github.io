import { RenderType } from '../../modules/others/constants.js';
import { addEvListener, removeEvListener } from '../../modules/others/utils.js';

class RenderController {
    constructor(frame, renderer, callbacks) {
        this.start = () => {
            this.startBtn.textContent = '⏸';
            removeEvListener(this.startBtn, 'click', this.start);
            addEvListener(this.startBtn, 'click', this.pause);
            removeEvListener(this.frame.controls, 'change', this.staticRender);
            if (this.callbacks !== undefined && this.callbacks.start !== undefined) {
                this.callbacks.start();
            }
            this.frame.status.renderType = RenderType.DynamicRender;
            this.renderer.dynamic.requestRender();
        };
        this.pause = () => {
            this.renderer.dynamic.stopRender();
            if (this.callbacks !== undefined && this.callbacks.pause !== undefined) {
                this.callbacks.pause();
            }
            this.startBtn.textContent = '▶';
            addEvListener(this.startBtn, 'click', this.continue);
            removeEvListener(this.startBtn, 'click', this.pause);
            addEvListener(this.frame.controls, 'change', this.staticRender);
            this.frame.status.renderType = RenderType.StaticRender;
        };
        this.continue = () => {
            this.startBtn.textContent = '⏸';
            removeEvListener(this.startBtn, 'click', this.continue);
            addEvListener(this.startBtn, 'click', this.pause);
            removeEvListener(this.frame.controls, 'change', this.staticRender);
            if (this.callbacks !== undefined && this.callbacks.continue !== undefined) {
                this.callbacks.continue();
            }
            this.frame.status.renderType = RenderType.DynamicRender;
            this.renderer.dynamic.requestRender();
        };
        this.stop = () => {
            this.renderer.dynamic.stopRender();
            if (this.callbacks !== undefined && this.callbacks.stop !== undefined) {
                this.callbacks.stop();
            }
            this.startBtn.textContent = '▶';
            this.startBtn.disabled = true;
            removeEvListener(this.startBtn, 'click', this.pause);
            addEvListener(this.frame.controls, 'change', this.staticRender);
            this.frame.status.renderType = RenderType.StaticRender;
        };
        this.reset = () => {
            this.renderer.dynamic.stopRender();
            if (this.callbacks !== undefined && this.callbacks.reset !== undefined) {
                this.callbacks.reset();
            }
            this.startBtn.textContent = '▶';
            this.startBtn.disabled = false;
            removeEvListener(this.startBtn, 'click', this.pause);
            removeEvListener(this.startBtn, 'click', this.continue);
            addEvListener(this.startBtn, 'click', this.start);
            addEvListener(this.resetBtn, 'click', this.reset);
            addEvListener(this.frame.controls, 'change', this.staticRender);
            this.frame.status.renderType = RenderType.StaticRender;
            this.renderer.static.requestRender();
        };
        this.frame = frame;
        this.callbacks = callbacks;
        this.lastTime = renderer.dynamic.lastTime;
        this.renderer = renderer;
        this.staticRender = renderer.static.requestRender.bind(renderer.static);
        this.startBtn = document.querySelector('#starter');
        this.resetBtn = document.querySelector('#reset');
    }
}
export default RenderController;
