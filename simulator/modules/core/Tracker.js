import { Raycaster, Vector2 } from '../../lib/three/build/three.module.js';

class Tracker {
    constructor(frame, map) {
        this.getNormalizedPosition = (event) => {
            const rect = this.frame.canvas.getBoundingClientRect();
            this.pointerPos = new Vector2(event.clientX - rect.left, event.clientY - rect.top);
            const normalizedPos = new Vector2((this.pointerPos.x / this.frame.canvas.clientWidth) * 2 - 1, (this.pointerPos.y / this.frame.canvas.clientHeight) * -2 + 1);
            this.rayCaster.setFromCamera(normalizedPos, this.frame.camera);
            const intersectObj = this.rayCaster.intersectObject(this.mesh);
            if (intersectObj.length === 0) {
                this.pickPos = null;
            } else {
                this.pickPos = new Vector2(intersectObj[0].point.x, intersectObj[0].point.z);
            }
        };
        this.clearPickedPosition = () => {
            this.pointerPos = null;
            this.pickPos = null;
            this.lastPos = null;
        };
        this.frame = frame;
        this.mesh = map;
        this.rayCaster = new Raycaster();
        this.pointerPos = null;
        this.pickPos = null;
        this.lastPos = null;
        this.frame.addEventListener(this.frame.canvas, 'mousemove', this.getNormalizedPosition);
        this.frame.addEventListener(this.frame.canvas, 'mouseout', this.clearPickedPosition);
    }
}
export default Tracker;
