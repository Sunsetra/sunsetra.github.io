import Enemy from './Enemy.js';

class Saber extends Enemy {
    constructor(mesh) {
        super(mesh, 0.7, 1650, 0.55);
    }
}

export default Saber;
