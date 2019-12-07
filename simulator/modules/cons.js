import * as THREE from '../lib/three/build/three.module.js';

import { blockUnit } from './basic.js';


class Construction {
  /**
   * 定义地图建筑对象
   * @param {number} colSpan - 建筑跨越的列数
   * @param {number} rowSpan - 建筑跨越的行数
   * @param {Object3D} mesh - 建筑使用的网格实体
   *
   * @property {number} colSpan - 建筑跨越的列数
   * @property {number} rowSpan - 建筑跨越的行数
   * @property {Object3D} mesh - 建筑网格实体
   * @property {Vector3} position - 建筑所在的绝对坐标
   */
  constructor(rowSpan, colSpan, mesh) {
    this.rowSpan = rowSpan;
    this.colSpan = colSpan;
    this.mesh = mesh;

    const box = new THREE.Box3().setFromObject(this.mesh);
    this.size = new THREE.Vector3();
    box.getSize(this.size);
  }

  /**
   * 标准化添加的自定义模型为绑定砖块区域尺寸
   * 对于自身有大小需求的模型不应调用该函数
   */
  normalize() {
    this.mesh.geometry.center(); // 重置原点为几何中心
    this.mesh.geometry.computeBoundingBox();
    this.mesh.geometry.boundingBox.getCenter(this.mesh.position);
    const wrapper = new THREE.Object3D(); // 使用外部对象包裹
    wrapper.add(this.mesh);
    const originBox = new THREE.Box3().setFromObject(wrapper);
    const originSize = originBox.getSize(new THREE.Vector3());
    const mag = (blockUnit * this.colSpan) / originSize.x;
    wrapper.scale.set(mag, mag, mag); // 按X方向的比例缩放
    this.mesh = wrapper;

    const box = new THREE.Box3().setFromObject(this.mesh);
    this.size = new THREE.Vector3(); // 更新为缩放后的尺寸
    box.getSize(this.size);
  }

  /**
   * 设置建筑在地图中的位置
   * @param {number} row - 建筑在地图中的行数
   * @param {number} column - 建筑在地图中的列数
   */
  setPosition(row, column) {
    this.row = row;
    this.column = column;
  }
}


class IOPoint extends Construction {
  /**
   * 预设进入/目标点建筑，内部构建
   * @param {Object3D} mesh - 当前建筑的网格模型
   */
  constructor(mesh) {
    super(1, 1, mesh);
  }
}


class BuiltinCons extends Construction {
  /**
   * 外部导入的建筑/装饰建筑，含内置建筑及自定义建筑
   * @param {number} rowSpan - 建筑跨越的列数
   * @param {number} colSpan - 建筑跨越的行数
   * @param {Object3D} mesh - 导入的建筑模型mesh
   */
  constructor(rowSpan, colSpan, mesh) {
    super(rowSpan, colSpan, mesh);
    this.mesh.material.side = THREE.FrontSide;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.normalize();
  }
}

export { Construction, IOPoint, BuiltinCons };
