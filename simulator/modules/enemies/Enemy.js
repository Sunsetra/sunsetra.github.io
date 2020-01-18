import Unit from '../core/Unit.js';

class Enemy extends Unit {
    constructor(mesh, sizeAlpha, hp, speed) {
        super(mesh, sizeAlpha, hp);
        this.speed = speed;
    }
}

export default Enemy;
