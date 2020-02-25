class Render {
    constructor(frame, callback) {
        this.frame = frame;
        this.callback = callback;
    }
    requestRender() {
        requestAnimationFrame((time) => this.render(time));
    }
    render(rAFTime) {
        if (this.callback) {
            this.callback(rAFTime);
        }
        this.checkResize();
        this.frame.renderer.render(this.frame.scene, this.frame.camera);
    }
    checkResize() {
        const width = this.frame.canvas.clientWidth;
        const height = this.frame.canvas.clientHeight;
        const needResize = this.frame.canvas.width !== width * 2 || this.frame.canvas.height !== height * 2;
        if (needResize) {
            this.frame.renderer.setSize(width, height, false);
            this.frame.camera.aspect = width / height;
            this.frame.camera.updateProjectionMatrix();
        }
    }
}
export default Render;
