/* global THREE */

import { blockUnit } from './basic.js';

/**
 * 建筑的抽象基类。
 * 属性:
 *   rowSpan/colSpan - 建筑跨越的行/列。
 *   row/column - 建筑所在的行/列（左上角）。
 *   mesh - 建筑网格实体。
 *   position - 建筑所在的绝对坐标。
 * 方法:
 *   setLocation(row, column, block) - 设置建筑所在的位置并设置建筑所在实际坐标。
 *   normalize() - 建筑大小标准化为绑定砖块尺寸大小。
 */
class Construction {
  /**
   * 定义地图建筑的位置及网格实体。
   * @param colSpan - 建筑跨越的列数。
   * @param rowSpan - 建筑跨越的行数。
   * @param mesh - 建筑使用的网格实体。
   */
  constructor(rowSpan, colSpan, mesh) {
    this.rowSpan = rowSpan;
    this.colSpan = colSpan;
    this.mesh = mesh;
  }

  /**
   * 设置建筑所在的位置并设置建筑所在的实际坐标。
   * @param row - 建筑所在的行。
   * @param column - 建筑所在的列。
   * @param block - 绑定的首个（左上角）砖块。
   */
  setLocation(row, column, block) {
    this.row = row;
    this.column = column;

    const box = new THREE.Box3().setFromObject(this.mesh);
    const conSize = box.getSize(new THREE.Vector3());
    const x = (this.column + this.colSpan / 2) * block.size.x;
    const y = conSize.y / 2 + block.size.y - 0.01;
    const z = (this.row + this.rowSpan / 2) * block.size.z;
    this.mesh.position.set(x, y, z);
  }

  /**
   * 标准化添加的自定义模型为绑定砖块区域尺寸。
   * 对于自身有大小需求的模型不应调用该函数。
   */
  normalize() {
    this.mesh.geometry.center(); // 重置原点为几何中心
    this.mesh.geometry.computeBoundingBox();
    this.mesh.geometry.boundingBox.getCenter(this.mesh.position);
    const wrapper = new THREE.Object3D().add(this.mesh); // 使用外部对象包裹
    const box = new THREE.Box3().setFromObject(wrapper);
    const boxSize = box.getSize(new THREE.Vector3());
    const mag = (blockUnit * this.colSpan) / boxSize.x;
    wrapper.scale.set(mag, mag, mag); // 按X方向的比例缩放
    this.mesh = wrapper;
  }
}


class IOPoint extends Construction {
  /**
   * 预设进入/目标点建筑，内部构建。
   * @param mesh - 当前建筑的网格模型。
   */
  constructor(mesh) {
    super(1, 1, mesh);
  }
}


class BuiltinCons extends Construction {
  /**
   * 预设的建筑/装饰建筑，外部导入。
   * @param mesh - 导入的建筑模型mesh。
   */
  constructor(mesh) {
    super(1, 1, mesh);
    this.mesh.material.side = THREE.FrontSide;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.normalize();
  }
}

export { Construction, IOPoint, BuiltinCons };
