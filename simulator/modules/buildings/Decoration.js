import * as THREE from '../../lib/three/build/three.module.js';
import Building from './Building.js';

class Decoration extends Building {
    constructor(mesh, info) {
        super(mesh, info);
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => { mat.side = THREE.FrontSide; });
        } else {
            mesh.material.side = THREE.FrontSide;
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    }
}

export default Decoration;
