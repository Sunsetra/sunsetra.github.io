/* global THREE */

import { blockUnit } from './basic.js';

/**
 * 所有单位的抽象基类。
 * 属性:
 *   mesh: 实体网格模型。
 *   size: 最终模型尺寸（仅X向及Y向）。
 *   position: 模型的绝对坐标（三向）。
 */
class Unit {
  /**
   * 定义单位模型及相对大小。
   * @param mesh: 单位网格模型。
   * @param sizeAlpha: 模型大小相对于单位砖块长度的尺寸系数。
   */
  constructor(mesh, sizeAlpha) {
    mesh.geometry.center(); // 重置原点为几何中心
    mesh.geometry.computeBoundingBox();
    mesh.geometry.boundingBox.getCenter(mesh.position);
    const wrapper = new THREE.Object3D().add(mesh); // 使用外部对象包裹
    const originBox = new THREE.Box3().setFromObject(wrapper);
    const originSize = originBox.getSize(new THREE.Vector3());
    const mag = (blockUnit * sizeAlpha) / originSize.x;
    wrapper.scale.set(mag, mag, mag); // 按X方向的比例缩放
    this.mesh = wrapper;

    const box = new THREE.Box3().setFromObject(wrapper);
    const boxSize = box.getSize(new THREE.Vector3());
    this.size = { // 缩放后的模型尺寸
      width: boxSize.x,
      height: boxSize.y,
    };
  }

  set position(pos) { // 设置模型的当前位置
    this._posX = (pos.x + 0.5) * blockUnit;
    this._posY = pos.y;
    this._posZ = (pos.z + 0.5) * blockUnit;
    this.mesh.position.set(this._posX, this._posY, this._posZ);
  }

  get position() { // 读取模型的当前位置
    return {
      x: this._posX,
      y: this._posY,
      z: this._posZ,
      * [Symbol.iterator]() {
        yield this.x;
        yield this.y;
        yield this.z;
      },
    };
  }
}


class Enemy extends Unit {
  /**
   * 敌方单位的抽象基类，增加了移动速度属性。
   * @param mesh: 单位网格模型。
   * @param size: 模型大小相对于单位砖块长度的尺寸系数。
   * @param speed: 单位的移动速度。
   */
  constructor(mesh, size, speed) {
    super(mesh, size);
    this.speed = speed;
  }
}


class Slime extends Enemy {
  /**
   * 基础源石虫类，速度5，尺寸系数0.7。
   * @param mesh: 源石虫网格模型。
   */
  constructor(mesh) {
    super(mesh, 0.7, 5);
  }
}

export { Slime };
