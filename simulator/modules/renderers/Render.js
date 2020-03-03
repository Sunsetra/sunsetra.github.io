class Render {
    constructor(frame, callback) {
        this.frame = frame;
        this.callback = callback;
        this.devicePixelRatio = this.frame.renderer.getPixelRatio();
    }
    requestRender() {
        requestAnimationFrame((time) => this.render(time));
    }

    checkResize() {
        const width = this.frame.canvas.clientWidth;
        const height = this.frame.canvas.clientHeight;
        const needResize = this.frame.canvas.width !== width * this.devicePixelRatio
          || this.frame.canvas.height !== height * this.devicePixelRatio;
        if (needResize) {
            this.frame.renderer.setSize(width, height, false);
            this.frame.camera.aspect = width / height;
            this.frame.camera.updateProjectionMatrix();
            this.frame.renderer.render(this.frame.scene, this.frame.camera);
        }
    }

    render(rAFTime) {
        if (this.callback) {
            this.callback(rAFTime);
        }
        this.frame.renderer.render(this.frame.scene, this.frame.camera);
    }
}
export default Render;
