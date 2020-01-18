import { Box3, Math as _Math, Object3D, Vector3 } from '../../lib/three/build/three.module.js';
import { BlockUnit } from '../others/constants.js';

class Building {
  constructor(mesh, info) {
    this.colSpan = info.colSpan ? info.colSpan : 1;
    this.rowSpan = info.rowSpan ? info.rowSpan : 1;
    const rotation = info.rotation ? info.rotation : 0;
    const sizeAlpha = info.sizeAlpha ? info.sizeAlpha : 1;
    mesh.rotation.y = _Math.degToRad(rotation);
    mesh.geometry.center();
    mesh.geometry.computeBoundingBox();
    mesh.geometry.boundingBox.getCenter(mesh.position);
    const wrapper = new Object3D();
    wrapper.add(mesh);
    const originBox = new Box3().setFromObject(wrapper);
    const originSize = originBox.getSize(new Vector3());
    const magX = (BlockUnit * this.colSpan * sizeAlpha - 0.02) / originSize.x;
    const magZ = (BlockUnit * this.rowSpan * sizeAlpha - 0.02) / originSize.z;
    const magY = Math.min(magX, magZ);
    wrapper.scale.set(magX, magY, magZ);
    this.mesh = wrapper;
    const box = new Box3().setFromObject(this.mesh);
    this.size = new Vector3();
    box.getSize(this.size);
  }
}
export default Building;
