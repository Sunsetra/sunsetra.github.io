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
import { BlockUnit, WebGLAvailability } from './constants.js';

function checkWebGLVersion() {
    if (WEBGL.isWebGLAvailable()) {
        return WEBGL.isWebGL2Available() ? WebGLAvailability.WebGL2Available : WebGLAvailability.Available;
    }
    return WebGLAvailability.Unavailable;
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
function absPosToRealPos(x, z) {
    if (x instanceof Vector2) {
        return new Vector2(x.x * BlockUnit, x.y * BlockUnit);
    }
    if (typeof z === 'number') {
        return new Vector2(x * BlockUnit, z * BlockUnit);
    }
    return new Vector2(x * BlockUnit, 0);
}
function realPosToAbsPos(a, b, isRound) {
    if (a instanceof Vector2) {
        if (b) {
          return new Vector2(a.x / BlockUnit, a.y / BlockUnit).floor();
        }
      return new Vector2(a.x / BlockUnit, a.y / BlockUnit);
    }
  if (typeof b === 'number') {
    if (isRound) {
      return new Vector2(a / BlockUnit, b / BlockUnit).floor();
    }
    return new Vector2(a / BlockUnit, b / BlockUnit);
  }
  if (isRound) {
    return new Vector2(a, 0).floor();
  }
  return new Vector2(a, 0);
}

const listeners = new Map();

function addEvListener(obj, type, handler, once) {
  const target = listeners.get(obj);
  if (target === undefined) {
    const handlerObj = Object.defineProperty({}, type, {
      value: new Set([handler]),
      configurable: true,
      enumerable: true,
    });
    listeners.set(obj, handlerObj);
  } else if (Object.prototype.hasOwnProperty.call(target, type)) {
    if (!once && target[type].has(handler)) {
      return;
    }
    target[type].add(handler);
  } else {
    Object.defineProperty(target, type, {
      value: new Set([handler]),
      configurable: true,
      enumerable: true,
    });
  }
  if (once) {
    obj.addEventListener(type, handler, { once: true });
  } else {
    obj.addEventListener(type, handler);
  }
}

function removeEvListener(obj, type, handler) {
  const target = listeners.get(obj);
  if (target === undefined || !Object.prototype.hasOwnProperty.call(target, type) || !target[type].size) {
    return;
  }
  if (handler === undefined) {
    target[type].forEach((h) => { obj.removeEventListener(type, h); });
    delete target[type];
  } else {
    if (!target[type].has(handler)) {
      return;
    }
    obj.removeEventListener(type, handler);
    target[type].delete(handler);
  }
}

function clearEvListener() {
  listeners.forEach((value, target) => {
    Object.keys(value).forEach((type) => {
      value[type].forEach((handler) => { target.removeEventListener(type, handler); });
    });
  });
  listeners.clear();
}

export {
  absPosToRealPos,
  realPosToAbsPos,
  checkWebGLVersion,
  disposeResources,
  addEvListener,
  removeEvListener,
  clearEvListener,
};
