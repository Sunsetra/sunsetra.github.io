import { RenderType } from '../../modules/others/constants.js';

class RenderController {
    constructor(frame, renderer, callbacks) {
        this.start = () => {
            this.startBtn.textContent = '⏸';
            this.frame.removeEventListener(this.startBtn, 'click', this.start);
            this.frame.addEventListener(this.startBtn, 'click', this.pause);
            this.frame.removeEventListener(this.frame.controls, 'change', this.staticRender);
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
            this.frame.addEventListener(this.startBtn, 'click', this.continue);
            this.frame.removeEventListener(this.startBtn, 'click', this.pause);
            this.frame.addEventListener(this.frame.controls, 'change', this.staticRender);
            this.frame.status.renderType = RenderType.StaticRender;
        };
        this.continue = () => {
            this.startBtn.textContent = '⏸';
            this.frame.removeEventListener(this.startBtn, 'click', this.continue);
            this.frame.addEventListener(this.startBtn, 'click', this.pause);
            this.frame.removeEventListener(this.frame.controls, 'change', this.staticRender);
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
            this.frame.removeEventListener(this.startBtn, 'click', this.pause);
            this.frame.addEventListener(this.frame.controls, 'change', this.staticRender);
            this.frame.status.renderType = RenderType.StaticRender;
        };
        this.reset = () => {
            this.renderer.dynamic.stopRender();
            if (this.callbacks !== undefined && this.callbacks.reset !== undefined) {
                this.callbacks.reset();
            }
            this.startBtn.textContent = '▶';
            this.startBtn.disabled = false;
            this.frame.removeEventListener(this.startBtn, 'click', this.pause);
            this.frame.removeEventListener(this.startBtn, 'click', this.continue);
            this.frame.addEventListener(this.startBtn, 'click', this.start);
            this.frame.addEventListener(this.resetBtn, 'click', this.reset);
            this.frame.addEventListener(this.frame.controls, 'change', this.staticRender);
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
