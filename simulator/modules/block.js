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

  /**
   * 计算砖块在地图中的实际坐标。
   * 在砖块排布发生变化时，应手动调用以更新砖块的实际位置。
   * @param row: 砖块所在行。
   * @param column: 砖块所在列。
   */
  calBlockPosition(row, column) {
    this.position = {
      x: (column + 0.5) * this.width,
      y: this.height / 2,
      z: (row + 0.5) * this.depth,
      * [Symbol.iterator]() {
        yield this.x;
        yield this.y;
        yield this.z;
      },
    };
  }
}


class BasicBlock extends Block {
  /* 定义基本普通砖块，尺寸固定 */
  constructor() {
    super(blockUnit, 0.5 * blockUnit, blockUnit);
  }
}

class HighBlock extends Block {
  /* 定义基本高台砖块，尺寸固定 */
  constructor(alpha) {
    const a = alpha < 0.8 ? 0.8 : alpha;
    super(blockUnit, a * blockUnit, blockUnit);
  }
}

export { BasicBlock, HighBlock };
