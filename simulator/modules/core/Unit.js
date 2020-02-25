import { Box3, Vector3 } from '../../lib/three/build/three.module.js';
import { BlockUnit } from '../others/constants.js';
import { absPosToRealPos, realPosToAbsPos } from '../others/utils.js';

class Unit {
    constructor(mesh, sizeAlpha, data) {
        const material = mesh.material;
        const width = material.map ? material.map.image.width : 1;
        const mag = (BlockUnit * sizeAlpha) / width;
        mesh.scale.set(mag, mag, mag);
        this.mesh = mesh;
        const box = new Box3().setFromObject(mesh);
        const boxSize = box.getSize(new Vector3());
        this.width = boxSize.x;
        this.height = boxSize.y;
        this.name = data.name;
        this.maxHp = data.maxHp;
        this.atk = data.atk;
        this.def = data.def;
        this.resist = data.resist;
        this.atkTime = data.atkTime;
        this.hpRecoveryPerSec = data.hpRecoveryPerSec;
        this.stunImmune = data.stunImmune;
        this.silenceImmune = data.silenceImmune;
    }
    get position() {
        const pos = this.mesh.getWorldPosition(new Vector3());
        return realPosToAbsPos(pos.x, pos.z);
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
