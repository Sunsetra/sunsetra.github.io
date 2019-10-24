/* global THREE */

const statusEnum = Object.freeze({
  RESET: 'reset',
  PAUSE: 'pause',
  CONTINUE: 'continue',
});

/* 地图信息类 */
class MapInfo {
  /**
   * 定义地图的长度和宽度等基本信息。
   * @param width：定义地图在X方向的宽度。
   * @param height：定义地图在Z方向的宽度。
   * @param block：提供一个砖块实例，将地图初始化为该类型砖块。
   */
  constructor(width, height, block) {
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
   * @param row: 要替换的砖块所在的行，从1开始。
   * @param column: 要替换的砖块所在的列，从1开始。
   * @param block: 要替换为的砖块对象。
   * @returns {Block}: 返回新设置的砖块对象。
   */
  setBlock(row, column, block) {
    const index = (row - 1) * this.width + (column - 1);
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
    const index = (row - 1) * this.width + (column - 1);
    return this._cons[index];
  }

  getCons() { return this._cons; }

  /**
   * 向地图中添加绑定建筑。若添加位置存在建筑则删除它。
   * @param row: 建筑（首格）所在的行，从1开始。
   * @param column: 建筑（首格）所在的列，从1开始。
   * @param con: 自定义或预定义建筑实例。
   * @returns {boolean|Construction}: 成功添加时返回新添加的建筑，失败时返回false。
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

    let index;
    if (con.width > 1 || con.height > 1) { // 添加的建筑跨度大于1格
      if (verifyLocation(row, column, con.width, con.height)) {
        for (let x = 0; x < con.height; x += 1) {
          for (let y = 0; y < con.width; y += 1) {
            index = (row + x - 1) * this.width + (column + y - 1);
            this._cons[index] = con;
          }
        }
        con.setLocation(row, column);
        con.calcConPosition(block);
        return this._cons[index];
      }
      return false;
    }
    con.setLocation(row, column);
    con.calcConPosition(block); // 添加的建筑只占1格
    index = (row - 1) * this.width + (column - 1);
    this._cons[index] = con;
    return this._cons[index];
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

  /* 返回当前时间（数字） */
  getElapsedTimeN() {
    return super.getElapsedTime();
  }

  /* 继续已暂停的计时器 */
  continue() {
    if (!this.running) {
      const { elapsedTime } = this; // 计时器stop时已更新过elapsedTime
      this.start();
      this.elapsedTime = elapsedTime;
    }
  }
}

export { statusEnum, MapInfo, TimeAxis };
