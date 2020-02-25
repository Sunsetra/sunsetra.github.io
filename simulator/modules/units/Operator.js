import { Vector2 } from '../../lib/three/build/three.module.js';
import Unit from '../core/Unit.js';

class Operator extends Unit {
    constructor(mesh, sizeAlpha, data) {
        super(mesh, sizeAlpha, data);
        this.prof = data.prof;
        this.posType = data.posType;
        this.cost = data.cost;
        this.block = data.block;
        this.rspTime = 0;
        this.spRecoveryPerSec = data.spRecoveryPerSec;
        this.tauntLevel = data.tauntLevel;
        this.trackData = {
            withdrawCnt: 0,
        };
        const atkArea = [];
        data.atkArea.forEach((tuple) => {
            atkArea.push(new Vector2(tuple[0], tuple[1]));
        });
        this.atkArea = atkArea;
    }
}

export default Operator;
