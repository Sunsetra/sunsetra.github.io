/* global THREE */

const blockUnit = 10; // 砖块单位长度

/* 基本建筑类 */
class Construction {
  /**
   * 定义地图建筑的位置及网格实体。
   * @param width: 建筑跨越的列数。
   * @param height: 建筑跨越的行数。
   * @param mesh: 建筑使用的网格实体。
   */
  constructor(width, height, mesh = null) {
    this.width = width;
    this.height = height;
    this.mesh = mesh;
  }

  /**
   * 设置建筑所在的位置，应在绑定时设置。
   * @param row: 建筑所在的行。
   * @param column: 建筑所在的列。
   */
  setLocation(row, column) {
    this.row = row;
    this.column = column;
  }

  /**
   * 返回建筑所在的实际坐标。
   * 在绑定砖块后，应手动调用以更新建筑应放置的实际位置。
   * @param block: 绑定的首个（左上角）砖块。
   */
  calcConPosition(block) {
    const box = new THREE.Box3().setFromObject(this.mesh);
    const conSize = box.getSize(new THREE.Vector3());

    this.position = { // 调整居中放置
      x: (this.column + this.width / 2) * block.width,
      y: conSize.y / 2 + block.height - 0.01,
      z: (this.row + this.height / 2) * block.depth,
      * [Symbol.iterator]() {
        yield this.x;
        yield this.y;
        yield this.z;
      },
    };
  }

  /* 标准化添加的自定义模型。 */
  normalize() {
    this.mesh.geometry.center(); // 重置原点为几何中心
    this.mesh.geometry.computeBoundingBox();
    this.mesh.geometry.boundingBox.getCenter(this.mesh.position);
    const wrapper = new THREE.Object3D().add(this.mesh);
    const box = new THREE.Box3().setFromObject(wrapper);
    const boxSize = box.getSize(new THREE.Vector3());
    const mag = (blockUnit * this.width) / boxSize.x;
    wrapper.scale.set(mag, mag, mag); // 按X方向的比例缩放
    this.mesh = wrapper;
  }
}


class IOPoint extends Construction {
  /**
   * 预设进入/目标点建筑。
   * @param textureTop: 建筑的顶部贴图。
   * @param textureSide：建筑的侧向贴图。
   */
  constructor(textureTop, textureSide) {
    const topMat = new THREE.MeshBasicMaterial({
      alphaTest: 0.7,
      map: textureTop,
      side: THREE.DoubleSide,
      transparent: true,
    });
    const sideMat = new THREE.MeshBasicMaterial({
      alphaTest: 0.7,
      map: textureSide,
      side: THREE.DoubleSide,
      transparent: true,
    });
    const destMaterials = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
    const cube = new THREE.BoxBufferGeometry(9.99, 9.99, 9.99);
    const mesh = new THREE.Mesh(cube, destMaterials);

    super(1, 1, mesh);
  }
}

export { Construction, IOPoint };
