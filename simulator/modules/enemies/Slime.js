import Enemy from './Enemy.js';

class Slime extends Enemy {
    constructor(mesh) {
        super(mesh, 0.7, 550, 0.5);
    }
}

export default Slime;
