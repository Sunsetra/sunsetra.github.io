import {
    BufferGeometry,
    Geometry,
    Material,
    Mesh,
    Object3D,
    Texture,
    Vector2,
} from '../../lib/three/build/three.module.js';
import { WEBGL } from '../../lib/three/examples/jsm/WebGL.js';
import { BlockUnit, WebGL2Available, WebGLAvailable, WebGLUnavailable } from './constants.js';

function checkWebGLVersion() {
    if (WEBGL.isWebGLAvailable()) {
        return WEBGL.isWebGL2Available() ? WebGL2Available : WebGLAvailable;
    }
    return WebGLUnavailable;
}

function disposeResources(resource) {
    if (!resource) {
        return resource;
    }
    if (Array.isArray(resource)) {
        resource.forEach((res) => disposeResources(res));
        return resource;
    }
    if (resource instanceof Object3D) {
        if (resource instanceof Mesh) {
            disposeResources(resource.geometry);
            if (Array.isArray(resource.material)) {
                resource.material.forEach((mat) => disposeResources(mat));
            } else {
                disposeResources(resource.material);
            }
        }
        while (resource.children.length) {
            const firstObj = resource.children[0];
            resource.remove(firstObj);
            disposeResources(firstObj);
        }
    } else if (resource instanceof Material) {
        Object.values(resource).forEach((value) => {
            if (value instanceof Texture) {
                value.dispose();
            }
        });
        resource.dispose();
    } else if (resource instanceof BufferGeometry || resource instanceof Geometry) {
        resource.dispose();
    }
    return resource;
}

function absPosToRealPos(absPos) {
    const realPosX = (absPos.x + 0.5) * BlockUnit;
    const realPoxZ = (absPos.y + 0.5) * BlockUnit;
    return new Vector2(realPosX, realPoxZ);
}

function realPosToAbsPos(realPos) {
    const absPosX = realPos.x / BlockUnit - 0.5;
    const absPosZ = realPos.y / BlockUnit - 0.5;
    return new Vector2(absPosX, absPosZ);
}

export { absPosToRealPos, realPosToAbsPos, checkWebGLVersion, disposeResources };
