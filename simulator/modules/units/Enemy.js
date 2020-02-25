import Unit from '../core/Unit.js';

class Enemy extends Unit {
    constructor(mesh, sizeAlpha, data) {
        super(mesh, sizeAlpha, data);
        this.moveSpd = data.moveSpd;
        this.rangeRad = data.rangeRad;
        this.massLv = data.massLv;
    }
}

export default Enemy;
