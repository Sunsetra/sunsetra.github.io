import { Box3, Vector2, Vector3 } from '../../lib/three/build/three.module.js';
import { BlockUnit } from '../others/constants.js';
import { absPosToRealPos, realPosToAbsPos } from '../others/utils.js';

class Unit {
    constructor(mesh, sizeAlpha, hp) {
        const material = mesh.material;
        const width = material.map ? material.map.image.width : 1;
        const mag = (BlockUnit * sizeAlpha) / width;
        mesh.scale.set(mag, mag, mag);
        this.mesh = mesh;
        const box = new Box3().setFromObject(mesh);
        const boxSize = box.getSize(new Vector3());
        this.width = boxSize.x;
        this.height = boxSize.y;
        this.hp = hp;
    }

    get position() {
        const pos = this.mesh.getWorldPosition(new Vector3());
        return realPosToAbsPos(new Vector2(pos.x, pos.z));
    }

    set position(pos) {
        const realPos = absPosToRealPos(pos);
        this.mesh.position.setX(realPos.x);
        this.mesh.position.setZ(realPos.y);
    }

    setY(y) {
        this.mesh.position.setY(y);
    }
}

export default Unit;
