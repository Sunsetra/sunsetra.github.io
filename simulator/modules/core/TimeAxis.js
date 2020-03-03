import { Clock } from '../../lib/three/build/three.module.js';

class TimeAxis extends Clock {
    constructor() {
        super(false);
    }
    getCurrentTime() {
        const elapsed = super.getElapsedTime();
        const msecs = (Math.floor((elapsed * 1000) % 1000)).toString().padStart(3, '0');
        const secs = Math.floor(elapsed % 60).toString().padStart(2, '0');
        const min = Math.floor(elapsed / 60).toString().padStart(2, '0');
        return [`${ min }:${ secs }.${ msecs }`, elapsed];
    }
    continue() {
        if (!this.running) {
            const { elapsedTime } = this;
            this.start();
            this.elapsedTime = elapsedTime;
        }
    }
    reset() {
        this.stop();
        this.elapsedTime = 0;
    }
}
export default TimeAxis;
