/* global THREE */

const blockGap = 0.2; // 砖块间隙固定值
const blockUnit = 10; // 砖块单位长度

class Block {
  /**
   * 砖块对象的抽象基类。
   * @param width: 定义砖块在X方向上的宽度。
   * @param height: 定义砖块在Y方向上的高度。
   * @param depth: 定义砖块在Z方向上的宽度。
   * @param mesh: 定义砖块的网格实体。
   */
  constructor(width, height, depth, mesh = null) {
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.mesh = mesh;
  }

  get size() {
    return {
      width: this.width,
      height: this.height,
      depth: this.depth,
      * [Symbol.iterator]() {
        yield this.width;
        yield this.height;
        yield this.depth;
      },
    };
  }
}


/* 普通砖块类 */
class BasicBlock extends Block {
  /**
   * 定义最基本的普通砖块，XYZ方向的尺寸固定。
   */
  constructor() {
    super(blockUnit, 2 * blockUnit, blockUnit);
  }
}

class HighBlock extends Block {
  /**
   * 定义最基本的高台砖块。
   * @param height：定义高台砖块的高度。
   */
  constructor(height = 25) {
    super(blockUnit, height, blockUnit);
  }
}


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
   * @param row: 建筑所在的行，从1开始。
   * @param column: 建筑所在的列，从1开始。
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
      x: (this.column - 1) * (block.width + blockGap) + ((block.width + blockGap) * this.width - blockGap) / 2,
      y: (conSize.y + block.height) / 2 - 0.01,
      z: (this.row - 1) * (block.depth + blockGap) + ((block.depth + blockGap) * this.height - blockGap) / 2,
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


/* 预设目标点建筑 */
class Destination extends Construction {
  constructor() {
    const loader = new THREE.TextureLoader();
    const topMat = new THREE.MeshBasicMaterial({
      alphaTest: 0.7,
      map: loader.load('texture/destinationTop.png'),
      side: THREE.DoubleSide,
      transparent: true,
    });
    const sideMat = new THREE.MeshBasicMaterial({
      alphaTest: 0.7,
      map: loader.load('texture/destinationSide.png'),
      side: THREE.DoubleSide,
      transparent: true,
    });
    const destMaterials = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
    const cube = new THREE.BoxBufferGeometry(10, 10, 10);
    const mesh = new THREE.Mesh(cube, destMaterials);

    super(1, 1, mesh);
  }
}


/* 预设出怪点建筑 */
class Entry extends Construction {
  constructor() {
    const loader = new THREE.TextureLoader();
    const topMat = new THREE.MeshBasicMaterial({
      alphaTest: 0.7,
      map: loader.load('texture/entryTop.png'),
      side: THREE.DoubleSide,
      transparent: true,
    });
    const sideMat = new THREE.MeshBasicMaterial({
      alphaTest: 0.7,
      map: loader.load('texture/entrySide.png'),
      side: THREE.DoubleSide,
      transparent: true,
    });
    const destMaterials = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
    const cube = new THREE.BoxBufferGeometry(10, 10, 10);
    const mesh = new THREE.Mesh(cube, destMaterials);

    super(1, 1, mesh);
  }
}

/* 地图信息类 */
class MapInfo {
  /**
   * 定义地图的长度和宽度等基本信息。
   * @param width：定义地图在X方向的宽度。
   * @param height：定义地图在Z方向的宽度。
   * @param block：提供一个砖块实例，将地图初始化为该类型砖块。
   */
  constructor(width, height, block = new BasicBlock()) {
    this.width = width > 0 ? width : 2;
    this.height = height > 0 ? height : 2;
    this._blocks = new Array(width * height).fill(block);
    this._cons = new Array(width * height).fill(undefined);
  }

  /**
   * 返回指定行/列的砖块。
   * @param row: 砖块所在行，从1开始。
   * @param column: 砖块所在列，从1开始。
   * @returns {Block}: 返回指定位置的砖块对象。
   */
  getBlock(row, column) {
    const index = (row - 1) * this.width + (column - 1);
    return this._blocks[index];
  }

  getBlocks() { return this._blocks; }

  /**
   * 替换地图中指定行/列的砖块。
   * @param row: 要替换的块所在的行，从1开始。
   * @param column: 要替换的块所在的列，从1开始。
   * @param block: 要替换为的块对象。
   */
  setBlock(row, column, block) {
    const index = (row - 1) * this.width + (column - 1);
    this._blocks[index] = block;
  }

  /**
   * 获取指定位置的绑定建筑。
   * @param row: 目标建筑所在的行。
   * @param column: 目标建筑所在的列。
   * @returns {Construction}: 返回指定位置的建筑。
   */
  getCon(row, column) {
    const index = (row - 1) * this.width + (column - 1);
    return this._cons[index];
  }

  getCons() { return this._cons; }

  /**
   * 向地图中添加绑定建筑。若添加位置存在建筑则删除它。
   * @param row: 建筑（首格）所在的行，从1开始。
   * @param column: 建筑（首格）所在的列，从1开始。
   * @param con: 自定义或预定义建筑实例。
   * @returns {boolean|Array<Construction>}: 成功添加时返回建筑数组，失败时返回false。
   */
  addCon(row, column, con) {
    if (this.getCon(row, column)) { this.removeCon(row, column); }
    const block = this.getBlock(row, column); // 获取建筑所在砖块

    const verifyLocation = (r, c, w, h) => {
      const firstHeight = block.height;
      for (let x = 0; x < h; x += 1) {
        for (let y = 0; y < w; y += 1) {
          const thisHeight = this.getBlock(r + x, c + y).height;
          if (thisHeight !== firstHeight) { return false; } // 不等高返回false
        }
      }
      return true;
    };

    if (con.width > 1 || con.height > 1) { // 添加的建筑跨度大于1格
      if (verifyLocation(row, column, con.width, con.height)) {
        for (let x = 0; x < con.height; x += 1) {
          for (let y = 0; y < con.width; y += 1) {
            const index = (row + x - 1) * this.width + (column + y - 1);
            this._cons[index] = con;
          }
        }
        con.setLocation(row, column);
        con.calcConPosition(block);
        return this._cons;
      }
      return false;
    }
    con.setLocation(row, column);
    con.calcConPosition(block); // 添加的建筑只占1格
    const index = (row - 1) * this.width + (column - 1);
    this._cons[index] = con;
    return this._cons;
  }

  /**
   * 从地图中移除指定位置的建筑。
   * @param row: 需移除建筑所在的行，从1开始。
   * @param column: 需移除建筑所在的列，从1开始。
   * @returns {Construction|boolean}: 移除成功返回移除的建筑，移除失败返回false
   */
  removeCon(row, column) {
    const con = this.getCon(row, column);
    if (con) {
      this.getCons().forEach((c) => {
        if (c === con) {
          const index = (c.row - 1) * this.width + (column - 1);
          delete this._cons[index];
        }
      });
      return con;
    }
    return false;
  }
}

export {
  MapInfo, BasicBlock, HighBlock,
  Construction, Destination, Entry,
};
