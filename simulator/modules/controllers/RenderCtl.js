class RenderController {
    constructor(frame, sRenderer, dRenderer, callbacks) {
        this.start = () => {
            this.startBtn.textContent = '⏸';
            this.frame.removeEventListener(this.startBtn, 'click', this.start);
            this.frame.addEventListener(this.startBtn, 'click', this.pause);
            this.frame.removeEventListener(this.frame.controls, 'change', this.staticRender);
            this.frame.removeEventListener(window, 'resize', this.staticRender);
            if (this.callbacks !== undefined && this.callbacks.start !== undefined) {
                this.callbacks.start();
            }
            this.dRenderer.requestRender();
        };
        this.pause = () => {
            this.dRenderer.stopRender();
            if (this.callbacks !== undefined && this.callbacks.pause !== undefined) {
                this.callbacks.pause();
            }
            this.startBtn.textContent = '▶';
            this.frame.addEventListener(this.startBtn, 'click', this.continue);
            this.frame.removeEventListener(this.startBtn, 'click', this.pause);
            this.frame.addEventListener(this.frame.controls, 'change', this.staticRender);
            this.frame.addEventListener(window, 'resize', this.staticRender);
        };
        this.continue = () => {
            this.startBtn.textContent = '⏸';
            this.frame.removeEventListener(this.startBtn, 'click', this.continue);
            this.frame.addEventListener(this.startBtn, 'click', this.pause);
            this.frame.removeEventListener(this.frame.controls, 'change', this.staticRender);
            this.frame.removeEventListener(window, 'resize', this.staticRender);
            if (this.callbacks !== undefined && this.callbacks.continue !== undefined) {
                this.callbacks.continue();
            }
            this.dRenderer.requestRender();
        };
        this.stop = () => {
            this.dRenderer.stopRender();
            if (this.callbacks !== undefined && this.callbacks.stop !== undefined) {
                this.callbacks.stop();
            }
            this.startBtn.textContent = '▶';
            this.frame.removeEventListener(this.startBtn, 'click', this.pause);
            this.frame.addEventListener(this.frame.controls, 'change', this.staticRender);
            this.frame.addEventListener(window, 'resize', this.staticRender);
        };
        this.reset = () => {
            this.dRenderer.stopRender();
            if (this.callbacks !== undefined && this.callbacks.reset !== undefined) {
                this.callbacks.reset();
            }
            this.startBtn.textContent = '▶';
            this.frame.removeEventListener(this.startBtn, 'click', this.pause);
            this.frame.removeEventListener(this.startBtn, 'click', this.continue);
            this.frame.addEventListener(this.startBtn, 'click', this.start);
            this.frame.addEventListener(this.resetBtn, 'click', this.reset);
            this.frame.addEventListener(this.frame.controls, 'change', this.staticRender);
            this.frame.addEventListener(window, 'resize', this.staticRender);
            this.sRenderer.requestRender();
        };
        this.frame = frame;
        this.callbacks = callbacks;
        this.lastTime = dRenderer.lastTime;
        this.sRenderer = sRenderer;
        this.dRenderer = dRenderer;
        this.staticRender = this.sRenderer.requestRender.bind(this.sRenderer);
        this.startBtn = document.querySelector('#starter');
        this.resetBtn = document.querySelector('#reset');
    }
}

export default RenderController;
