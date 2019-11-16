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
 *   width/height - 地图的长/宽（格数）。
 *   enemyNum - 当前地图的敌人总数。
 *   waves - 当前地图的敌人波次数据。
 * 方法:
 *   getBlock(row, column) - 返回指定行/列的砖块。
 *   getBlocks() - 返回所有砖块列表。
 *   setBlock(row, column, block) - 设置/替换指定位置的砖块。
 *   getCon(row, column) - 返回指定位置的建筑。
 *   getCons() - 返回所有建筑列表。
 *   addCon(row, column, con) - 向指定位置添加/替换建筑。
 *   removeCon(row, column) - 移除指定位置的建筑。
 */
class MapInfo {
  /**
   * 存储地图的基本信息，包括敌人等。
   * @param {number} width - 定义地图在X方向的格数。
   * @param {number} height - 定义地图在Z方向的格数。
   * @param {number} enemyNum - 敌人总数，用以界定何时游戏结束。
   * @param {object} waves - 敌人波次数据。
   */
  constructor(width, height, enemyNum, waves) {
    this.width = width > 0 ? width : 2;
    this.height = height > 0 ? height : 2;
    this.enemyNum = enemyNum;
    this.waves = waves;
    this._blocks = new Array(width * height).fill(null);
    this._cons = new Array(width * height).fill(null);
  }

  // /**
  //  * 返回指定行/列的砖块。
  //  * @param row - 砖块所在行，从0开始。
  //  * @param column - 砖块所在列，从0开始。
  //  * @returns {Block} - 返回指定位置的砖块对象。
  //  */
  // getBlock(row, column) {
  //   const index = row * this.width + column;
  //   return this._blocks[index];
  // }
  //
  // getBlocks() { return this._blocks; }

  // /**
  //  * 替换地图中指定行/列的砖块。
  //  * @param row - 要替换的砖块所在的行，从0开始。
  //  * @param column - 要替换的砖块所在的列，从0开始。
  //  * @param block - 要替换为的砖块对象。
  //  * @returns {Block} - 返回新设置的砖块对象。
  //  */
  // setBlock(row, column, block) {
  //   const index = row * this.width + column;
  //   block.calBlockPosition(row, column);
  //   this._blocks[index] = block;
  //   return this._blocks[index];
  // }

  /**
   * 获取指定位置的绑定建筑。
   * @param row - 目标建筑所在的行。
   * @param column - 目标建筑所在的列。
   * @returns {Construction|null} - 返回指定位置的建筑，无建筑则返回null。
   */
  getCon(row, column) {
    const index = row * this.width + column;
    return this._cons[index];
  }

  /* 返回所有建筑的列表，没有建筑的位置为null。 */
  getCons() { return this._cons; }

  /**
   * 从地图中移除指定位置的建筑。
   * @param row - 需移除建筑所在的行，从0开始。
   * @param column - 需移除建筑所在的列，从0开始。
   * @returns {Construction|boolean} - 移除成功返回移除的建筑，移除失败返回false
   */
  removeCon(row, column) { // TODO: 安全释放资源
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


class MapGeometry {
  /**
   * 地图几何类，用于构建及存储地图的几何信息，包括尺寸、砖块及建筑信息。
   * @param {number} width - 地图宽度（总列数）。
   * @param {number} height - 地图高度（总行数）。
   * @param {Array} blockInfo - 地图数据对象。
   *
   * @property {number} width - 地图的总列数。
   * @property {number} height - 地图的总行数。
   */
  constructor(width, height, blockInfo) {
    this.width = width;
    this.height = height;
    this.blockData = new Array(width * height).fill(null); // 数组砖块数据
    blockInfo.forEach((block) => { // 构造元素数组，无砖块的位置为null
      const { row, column, heightAlpha } = block;
      const blockSize = new THREE.Vector3(blockUnit, heightAlpha * heightAlpha, blockUnit);
      Object.defineProperty(block, 'size', blockSize); // 为砖块对象添加三维尺寸对象

      const ndx = row * this.width + column;
      this.blockData[ndx] = block;
    });
    this.faces = [
      { // 左侧
        normal: [-1, 0, 0],
        corners: [
          { pos: [0, 1, 0], uv: [0, 1] },
          { pos: [0, 0, 0], uv: [0, 0] },
          { pos: [0, 1, 1], uv: [1, 1] },
          { pos: [0, 0, 1], uv: [1, 0] },
        ],
      },
      { // 右侧
        normal: [1, 0, 0],
        corners: [
          { pos: [1, 1, 1], uv: [0, 1] },
          { pos: [1, 0, 1], uv: [0, 0] },
          { pos: [1, 1, 0], uv: [1, 1] },
          { pos: [1, 0, 0], uv: [1, 0] },
        ],
      },
      { // 上侧
        normal: [0, 0, -1],
        corners: [
          { pos: [1, 0, 0], uv: [0, 0] },
          { pos: [0, 0, 0], uv: [1, 0] },
          { pos: [1, 1, 0], uv: [0, 1] },
          { pos: [0, 1, 0], uv: [1, 1] },
        ],
      },
      { // 下侧
        normal: [0, 0, 1],
        corners: [
          { pos: [0, 0, 1], uv: [0, 0] },
          { pos: [1, 0, 1], uv: [1, 0] },
          { pos: [0, 1, 1], uv: [0, 1] },
          { pos: [1, 1, 1], uv: [1, 1] },
        ],
      },
      { // 底侧
        normal: [0, -1, 0],
        corners: [
          { pos: [1, 0, 1], uv: [1, 0] },
          { pos: [0, 0, 1], uv: [0, 0] },
          { pos: [1, 0, 0], uv: [1, 1] },
          { pos: [0, 0, 0], uv: [0, 1] },
        ],
      },
      { // 顶侧
        normal: [0, 1, 0],
        corners: [
          { pos: [0, 1, 1], uv: [1, 1] },
          { pos: [1, 1, 1], uv: [0, 1] },
          { pos: [0, 1, 0], uv: [1, 0] },
          { pos: [1, 1, 0], uv: [0, 0] },
        ],
      },
    ];
  }

  /**
   * 验证并获取指定位置的砖块对象。
   * @param {number} row - 砖块所在行。
   * @param {number} column - 砖块所在列。
   * @returns {null|object} - 指定位置处存在砖块时返回砖块，不存在则返回null
   */
  getBlock(row, column) {
    const verifyRow = Math.floor(row / this.height);
    const verifyColumn = Math.floor(column / this.width);
    if (verifyRow || verifyColumn) {
      return null;
    }
    return this.blockData[row * this.width + column];
  }

  /**
   * 构造地图几何数据及贴图映射数据。
   * @namespace block.heightAlpha - 砖块的高度系数。
   * @return {object} - 返回顶点坐标，法向量，顶点序列，UV信息，侧面顶点组信息的对象。
   */
  generateGeometry() {
    const positions = []; // 存放顶点坐标
    const normals = []; // 存放面法向量
    const indices = []; // 存放顶点序列索引
    const uvs = []; // 存放顶点UV信息
    const sideGroup = []; // 侧面贴图顶点组信息，每个元素是一个组的[start, count]

    let start = 0; // 贴图顶点组开始索引
    let count = 0; // 贴图单顶点组计数

    for (let row = 0; row < this.height; row += 1) { // 遍历整个地图几何
      for (let column = 0; column < this.width; column += 1) {
        const thisBlock = this.getBlock(row, column);
        if (thisBlock) { // 该处有方块（不为null）才构造几何
          const thisHeight = thisBlock.heightAlpha;

          this.faces.forEach(({ corners, normal }) => {
            const sideBlock = this.getBlock(row + normal[2], column + normal[0]);
            const sideHeight = sideBlock ? sideBlock.heightAlpha : 0; // 当前侧块的高度系数
            if (thisHeight - sideHeight > 0 || normal[1]) { // 当前侧面高于侧块或是上下表面
              const ndx = positions.length / 3; // 置于首次改变position数组之前
              corners.forEach(({ pos, uv }) => {
                const x = pos[0] * blockUnit;
                const y = pos[1] * thisHeight * blockUnit;
                const z = pos[2] * blockUnit;
                positions.push(x + column * blockUnit, y, z + row * blockUnit);
                normals.push(...normal);
                uvs.push(...uv);
              });
              indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3);
            }
          });
          count = indices.length - 12 - start; // 侧面组顶点新增数量
          sideGroup.push([start, count]); // 加入侧面顶点数据
          start = indices.length; // 下一组顶点的开始索引
        }
      }
    }
    return {
      positions,
      normals,
      uvs,
      indices,
      sideGroup,
    };
  }

  /**
   * 向地图中添加绑定建筑。若添加位置存在建筑则替换它。
   * @param {number} row - 建筑（首格）所在的行，从0开始。
   * @param {number} column - 建筑（首格）所在的列，从0开始。
   * @param {Construction} con - 自定义或预定义建筑实例。
   * @returns {boolean|Construction} - 成功添加时返回新添加的建筑，失败时返回false。
   */
  setConstruction(row, column, con) {
    const block = this.getBlock(row, column); // 获取建筑所在砖块对象
    const { consInfo } = block;

    if (Object.prototype.hasOwnProperty.call(consInfo, 'inst')) {
      this.removeCon(row, column);
    }

    /**
     * @function - 检查建筑跨度中的地形是否等高
     * @param {number} r - 建筑所在行
     * @param {number} c - 建筑所在列
     * @param {number} w - 建筑列跨度
     * @param {number} h - 建筑行跨度
     * @returns {boolean} - 等高则返回true，不等高返回false
     */
    const verifyLocation = (r, c, w, h) => {
      const firstHeight = block.size.y;
      for (let x = 0; x < h; x += 1) {
        for (let y = 0; y < w; y += 1) {
          const thisHeight = this.getBlock(r + x, c + y).size.y;
          if (thisHeight !== firstHeight) { return false; }
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
}


/**
 * 派生自THREE内置Clock类的时间轴类。
 * 方法:
 *   getElapsedTimeO() - 以对象的形式返回分、秒、毫秒。
 *   getElapsedTimeN() - 原生方法，以浮点的形式返回秒。
 *   continue() - 继续已停止的计时器（对正在计时的无效）。
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
   * @returns {{min: *, secs: *, msecs: *}} - 格式化为字符串对象的当前时间。
   */
  getElapsedTimeO() {
    const elapsed = super.getElapsedTime().toFixed(3);
    const msecs = (Math.floor(elapsed * 1000) % 1000).toString().padStart(3, '0');
    const secs = Math.floor(elapsed % 60).toString().padStart(2, '0');
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

// /**
//  * 砖块对象的基类。
//  * 属性:
//  *   mesh - 砖块的网格实体。
//  *   type - 砖块类型。
//  *   size - 砖块在X/Y/Z方向上的绝对长度。
//  *   position - 砖块在地图中的绝对坐标。
//  * 方法:
//  *   calBlockPosition(row, column) - 更新砖块的绝对坐标。
//  */
// class Block {
//   /**
//    * 定义基础砖块对象，其中每个砖块都必须拥有独立的几何体。
//    * @param type - 定义砖块的种类。
//    * @param heightAlpha - 定义砖块在Y方向上的高度系数。
//    * @param texture - 定义砖块的贴图。
//    * @param placeable - 定义是否可放置单位。
//    */
//   constructor(type, heightAlpha, texture, placeable) {
//     this._width = blockUnit;
//     this._height = heightAlpha * blockUnit;
//     this._depth = blockUnit;
//     this.type = type;
//     this.placeable = placeable;
//
//     const { topTex, sideTex, bottomTex } = texture;
// eslint-disable-next-line max-len
//     const geometry = new THREE.BoxBufferGeometry(this._width, this._height, this._depth); // 定义砖块几何体
//     const topMat = new THREE.MeshPhysicalMaterial({ // 定义砖块顶部贴图材质
//       metalness: 0.1,
//       roughness: 0.6,
//       map: topTex,
//     });
//     const sideMat = new THREE.MeshPhysicalMaterial({ // 定义砖块侧面贴图材质
//       metalness: 0.1,
//       roughness: 0.6,
//       map: sideTex,
//     });
//     const bottomMat = new THREE.MeshPhysicalMaterial({ // 定义砖块底部贴图材质
//       metalness: 0.1,
//       roughness: 0.6,
//       map: bottomTex,
//     });
//     const material = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
//
//     this.mesh = new THREE.Mesh(geometry, material);
//     this.mesh.castShadow = true;
//     this.mesh.receiveShadow = true;
//   }
//
//   get size() {
//     return new THREE.Vector3(this._width, this._height, this._depth);
//   }
//
//   /**
//    * 计算砖块在地图中的实际坐标并放置砖块。
//    * 在砖块排布发生变化时，应手动调用以更新砖块的实际位置。
//    * @param row - 砖块所在行。
//    * @param column - 砖块所在列。
//    */
//   calBlockPosition(row, column) {
//     const x = (column + 0.5) * this._width;
//     const y = this._height / 2;
//     const z = (row + 0.5) * this._depth;
//     this.position = new THREE.Vector3(x, y, z);
//     this.mesh.position.set(x, y, z); // 放置砖块
//   }
// }

export {
  blockUnit,
  statusEnum,
  MapInfo,
  MapGeometry,
  TimeAxis,
};
