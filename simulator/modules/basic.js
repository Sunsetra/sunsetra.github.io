/* global THREE */

const blockUnit = 10; // 砖块单位长度常量
const statusEnum = Object.freeze({ // 状态常量
  RESET: 'reset',
  PAUSE: 'pause',
  CONTINUE: 'continue',
});

/**
 * 地图信息类。
 * 属性:
 *   width/height: 地图的长/宽（格数）。
 *   enemyNum: 当前地图的敌人总数。
 *   waves: 当前地图的敌人波次数据。
 * 方法:
 *   getBlock(row, column): 返回指定行/列的砖块。
 *   getBlocks(): 返回所有砖块列表。
 *   setBlock(row, column, block): 设置/替换指定位置的砖块。
 *   getCon(row, column): 返回指定位置的建筑。
 *   getCons(): 返回所有建筑列表。
 *   addCon(row, column, con): 向指定位置添加/替换建筑。
 *   removeCon(row, column): 移除指定位置的建筑。
 */
class MapInfo {
  /**
   * 定义地图的长度/宽度、敌人等基本信息。
   * @param width: 定义地图在X方向的宽度。
   * @param height: 定义地图在Z方向的宽度。
   * @param enemyNum: 敌人总数，用以界定何时游戏结束。
   * @param waves: 敌人波次数据。
   */
  constructor(width, height, enemyNum, waves) {
    this.width = width > 0 ? width : 2;
    this.height = height > 0 ? height : 2;
    this.enemyNum = enemyNum;
    this.waves = waves;
    this._blocks = new Array(width * height).fill(null);
    this._cons = new Array(width * height).fill(undefined);
  }

  /**
   * 返回指定行/列的砖块。
   * @param row: 砖块所在行，从0开始。
   * @param column: 砖块所在列，从0开始。
   * @returns {Block}: 返回指定位置的砖块对象。
   */
  getBlock(row, column) {
    const index = row * this.width + column;
    return this._blocks[index];
  }

  getBlocks() { return this._blocks; }

  /**
   * 替换地图中指定行/列的砖块。
   * @param row: 要替换的砖块所在的行，从0开始。
   * @param column: 要替换的砖块所在的列，从0开始。
   * @param block: 要替换为的砖块对象。
   * @returns {Block}: 返回新设置的砖块对象。
   */
  setBlock(row, column, block) {
    const index = row * this.width + column;
    block.calBlockPosition(row, column);
    this._blocks[index] = block;
    return this._blocks[index];
  }

  /**
   * 获取指定位置的绑定建筑。
   * @param row: 目标建筑所在的行。
   * @param column: 目标建筑所在的列。
   * @returns {Construction}: 返回指定位置的建筑。
   */
  getCon(row, column) {
    const index = row * this.width + column;
    return this._cons[index];
  }

  /* 返回所有建筑的列表，没有建筑的位置为undefined。 */
  getCons() { return this._cons; }

  /**
   * 向地图中添加绑定建筑。若添加位置存在建筑则替换它。
   * @param row: 建筑（首格）所在的行，从0开始。
   * @param column: 建筑（首格）所在的列，从0开始。
   * @param con: 自定义或预定义建筑实例。
   * @returns {boolean|Construction}: 成功添加时返回新添加的建筑，失败时返回false。
   */
  addCon(row, column, con) {
    if (this.getCon(row, column)) { this.removeCon(row, column); }
    const block = this.getBlock(row, column); // 获取建筑所在砖块

    const verifyLocation = (r, c, w, h) => { // 检查建筑跨度中的地形是否等高
      const firstHeight = block.size.height;
      for (let x = 0; x < h; x += 1) {
        for (let y = 0; y < w; y += 1) {
          const thisHeight = this.getBlock(r + x, c + y).height;
          if (thisHeight !== firstHeight) { return false; } // 不等高返回false
        }
      }
      return true;
    };

    let index;
    if (con.colSpan > 1 || con.rowSpan > 1) { // 添加的建筑跨度大于1格
      if (verifyLocation(row, column, con.colSpan, con.rowSpan)) {
        for (let x = 0; x < con.rowSpan; x += 1) {
          for (let y = 0; y < con.colSpan; y += 1) {
            index = (row + x - 1) * this.width + (column + y - 1);
            this._cons[index] = con;
          }
        }
        con.setLocation(row, column, block);
        return this._cons[index];
      }
      return false;
    }
    con.setLocation(row, column, block); // 添加的建筑只占1格
    index = (row - 1) * this.width + (column - 1);
    this._cons[index] = con;
    return this._cons[index];
  }

  /**
   * 从地图中移除指定位置的建筑。
   * @param row: 需移除建筑所在的行，从0开始。
   * @param column: 需移除建筑所在的列，从0开始。
   * @returns {Construction|boolean}: 移除成功返回移除的建筑，移除失败返回false
   */
  removeCon(row, column) {
    const con = this.getCon(row, column);
    if (con) {
      this.getCons().forEach((c) => {
        if (c === con) {
          const index = c.row * this.width + column;
          delete this._cons[index];
        }
      });
      return con;
    }
    return false;
  }
}

/**
 * 派生自THREE内置Clock类的时间轴类。
 * 方法:
 *   getElapsedTimeO(): 以对象的形式返回分、秒、毫秒。
 *   getElapsedTimeN(): 原生方法，以浮点的形式返回秒。
 *   continue(): 继续已停止的计时器（对正在计时的无效）。
 */
class TimeAxis extends THREE.Clock {
  /**
   * 扩展时间轴。
   * 支持格式化输出经过时间及继续计时函数。
   */
  constructor() {
    super(false);
  }

  /**
   * 格式化输出当前时间（对象）。
   * @returns {{min: *, secs: *, msecs: *}}: 格式化为字符串对象的当前时间。
   */
  getElapsedTimeO() {
    const elapsed = super.getElapsedTime().toFixed(3);
    const msecs = (Math.floor(elapsed * 1000) % 1000).toString().padStart(3, '0');
    const secs = Math.floor(elapsed).toString().padStart(2, '0');
    const min = Math.floor(elapsed / 60).toString().padStart(2, '0');
    return { min, secs, msecs };
  }

  /* 返回当前时间（浮点秒） */
  getElapsedTimeN() {
    return super.getElapsedTime();
  }

  /* 继续已暂停的计时器（对正在计时的无效） */
  continue() {
    if (!this.running) {
      const { elapsedTime } = this; // 计时器stop时已更新过elapsedTime
      this.start();
      this.elapsedTime = elapsedTime;
    }
  }
}

/**
 * 砖块对象的基类。
 * 属性:
 *   mesh: 砖块的网格实体。
 *   type: 砖块类型。
 *   size: 砖块在X/Y/Z方向上的绝对长度。
 *   position: 砖块在地图中的绝对坐标。
 * 方法:
 *   calBlockPosition(row, column): 更新砖块的绝对坐标。
 */
class Block {
  /**
   * 定义基础砖块对象。
   * @param type: 定义砖块的种类。
   * @param heightAlpha: 定义砖块在Y方向上的高度系数。
   * @param texture: 定义砖块的贴图。
   */
  constructor(type, heightAlpha, texture) {
    this._width = blockUnit;
    this._height = heightAlpha * blockUnit;
    this._depth = blockUnit;
    this.type = type;

    const { topTex, sideTex, bottomTex } = texture;
    const geometry = new THREE.BoxBufferGeometry(...this.size); // 定义砖块几何体
    const topMat = new THREE.MeshPhysicalMaterial({ // 定义砖块顶部贴图材质
      metalness: 0.1,
      roughness: 0.6,
      map: topTex,
    });
    const sideMat = new THREE.MeshPhysicalMaterial({ // 定义砖块侧面贴图材质
      metalness: 0.1,
      roughness: 0.6,
      map: sideTex,
    });
    const bottomMat = new THREE.MeshPhysicalMaterial({ // 定义砖块底部贴图材质
      metalness: 0.1,
      roughness: 0.6,
      map: bottomTex,
    });
    const material = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  get size() {
    return {
      width: this._width,
      height: this._height,
      depth: this._depth,
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
      x: (column + 0.5) * this._width,
      y: this._height / 2,
      z: (row + 0.5) * this._depth,
      * [Symbol.iterator]() {
        yield this.x;
        yield this.y;
        yield this.z;
      },
    };
  }
}

export {
  blockUnit,
  statusEnum,
  MapInfo,
  TimeAxis,
  Block,
};
