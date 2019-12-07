import * as THREE from '../lib/three/build/three.module.js';

import { blockUnit } from './basic.js';


class Unit {
  /**
   * 定义单位模型及相对大小
   * @param {Mesh} mesh - 单位网格模型
   * @param {number} sizeAlpha - 模型大小相对于单位砖块长度的尺寸系数
   * @param {number} hp - 单位血量
   *
   * @property {Mesh} mesh - 单位网格模型
   * @property {number} width - 单位模型宽度
   * @property {number} height - 单位模型高度
   * @property {Vector3} position - 单位模型所在位置
   */
  constructor(mesh, sizeAlpha, hp) {
    const { width } = mesh.material.map.image;
    const mag = (blockUnit * sizeAlpha) / width;
    mesh.scale.set(mag, mag, mag); // 按X方向的比例缩放
    this.mesh = mesh;

    const box = new THREE.Box3().setFromObject(mesh);
    const boxSize = box.getSize(new THREE.Vector3());
    this.width = boxSize.x;
    this.height = boxSize.y;
    this.hp = hp;
  }

  /**
   * 设置模型的当前位置（可不设置Y向坐标）
   * 注：其中X向及Z向为抽象坐标，Y向为绝对坐标
   * @param pos - 包括三向坐标的对象（可不包含Y向）
   */
  set position(pos) {
    this._posX = pos.x;
    if (pos.y) { this._posY = pos.y; }
    this._posZ = pos.z;

    const absPosX = (this._posX + 0.5) * blockUnit;
    const absPosZ = (this._posZ + 0.5) * blockUnit;
    this.mesh.position.set(absPosX, this._posY, absPosZ);
  }

  get position() { // 读取模型的当前位置
    return new THREE.Vector3(this._posX, this._posY, this._posZ);
  }
}


class Enemy extends Unit {
  /**
   * 敌方单位的抽象基类，增加了移动速度属性
   * @param {Mesh} mesh - 敌人网格模型
   * @param {number} size - 模型大小相对于单位砖块长度的尺寸系数
   * @param {number} speed - 敌人的移动速度
   * @param {number} hp - 敌人血量
   */
  constructor(mesh, size, speed, hp) {
    super(mesh, size, hp);
    this.speed = speed;
  }
}


class Slime extends Enemy {
  /**
   * 基础源石虫类，速度0.5，尺寸系数0.7，血量550
   * @param {Mesh} mesh - 源石虫网格模型
   */
  constructor(mesh) {
    super(mesh, 0.7, 0.5, 550);
  }
}


class Saber extends Enemy {
  /**
   * 基础士兵类，速度0.55，尺寸系数0.7，血量1650
   * @param {Mesh} mesh - 源石虫网格模型
   */
  constructor(mesh) {
    super(mesh, 0.7, 0.55, 1650);
  }
}


// class Operator extends Unit {
//   /**
//    * 干员的抽象基类
//    * @param mesh - 干员网格模型
//    * @param size - 模型大小相对于单位砖块长度的尺寸系数
//    * @param hp - 干员血量
//    */
//   constructor(mesh, size, hp) {
//     super(mesh, size, hp);
//   }
// }


export {
  Slime,
  Saber,
};
