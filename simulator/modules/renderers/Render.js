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
        const container = this.frame.renderer.domElement;
        const width = container.clientWidth;
        const height = container.clientHeight;
        const needResize = container.width !== width || container.height !== height;
        if (needResize) {
            this.frame.renderer.setSize(width, height, false);
            this.frame.camera.aspect = width / height;
            this.frame.camera.updateProjectionMatrix();
        }
    }
}

export default Render;
