/* global THREE */

const blockUnit = 10; // 砖块单位长度常量


class Map {
  /**
   * 地图类，用于构建及存储地图的几何信息及游戏信息，包括尺寸、砖块及建筑信息
   * @param {number} width - 地图宽度（总列数）
   * @param {number} height - 地图高度（总行数）
   * @param {Array} blockInfo - 地图数据对象
   * @param {number} enemyNum - 敌人数量
   * @param {Array} waves - 敌人的波次数据
   *
   * @property {number} width - 地图的总列数
   * @property {number} height - 地图的总行数
   * @property {number} enemyNum - 敌人数量
   * @property {Array} waves - 敌人的波次数据
   */
  constructor(width, height, blockInfo, enemyNum, waves) {
    this.width = width;
    this.height = height;
    this.enemyNum = enemyNum;
    this.enemyNumAll = enemyNum; // 总敌人数量
    this.waves = waves;
    this.wavesAll = JSON.parse(JSON.stringify(waves)); // 原始波次信息
    this.blockData = new Array(width * height).fill(null); // 数组砖块数据
    blockInfo.forEach((block) => { // 构造元素数组，无砖块的位置为null
      const { row, column, heightAlpha } = block;
      const blockSize = new THREE.Vector3(blockUnit, heightAlpha * blockUnit, blockUnit);
      Object.defineProperty(block, 'size', { // 为砖块对象添加三维尺寸对象
        value: blockSize,
        writable: true,
        enumerable: true,
      });

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
   * 验证并获取指定位置的砖块对象
   * @param {number} row - 砖块所在行
   * @param {number} column - 砖块所在列
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
   * 构造地图几何数据及贴图映射数据
   * @namespace block.heightAlpha - 砖块的高度系数
   * @return {object} - 返回顶点坐标，法向量，顶点序列，UV信息，侧面顶点组信息的对象
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
   * 向地图中添加绑定建筑若添加位置存在建筑则替换它
   * @param {number} row - 建筑（首格）所在的行，从0开始
   * @param {number} column - 建筑（首格）所在的列，从0开始
   * @param {Construction} con - 自定义或预定义建筑实例
   * @returns {boolean|Construction} - 成功添加时返回新添加的建筑，失败时返回false
   */
  setConstruction(row, column, con) {
    const block = this.getBlock(row, column);
    if (!block) { return false; }
    const { consInfo } = block; // 当前砖块的建筑信息类
    const { rowSpan, colSpan } = con;
    if (Object.prototype.hasOwnProperty.call(consInfo, 'inst')) {
      this.removeConstruction(row, column); // 指定位置已有建筑时删除它
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

    /** @function - 设置建筑所在的实际坐标 */
    const setLocation = () => {
      const x = (column + colSpan / 2) * block.size.x;
      const y = con.size.y / 2 + block.size.y - 0.01;
      const z = (row + rowSpan / 2) * block.size.z;
      con.mesh.position.set(x, y, z);
      con.setPosition(row, column);
    };

    if (colSpan > 1 || rowSpan > 1) { // 添加的建筑跨度大于1格
      if (verifyLocation(row, column, colSpan, rowSpan)) { // 若地形等高
        for (let x = 0; x < rowSpan; x += 1) {
          for (let y = 0; y < colSpan; y += 1) {
            const thisBlock = this.getBlock(row + x, column + y);
            if (!Object.prototype.hasOwnProperty.call(thisBlock, 'consInfo')) {
              Object.defineProperty(thisBlock, 'consInfo', {
                value: consInfo, // 为未定义建筑的砖块新建建筑信息属性
                writable: true,
                enumerable: true,
                configurable: true,
              });
            }
            Object.defineProperty(thisBlock.consInfo, 'inst', {
              value: con, // 所有砖块中包含的建筑实例共享同一个
              writable: true,
              enumerable: true,
              configurable: true,
            });
          }
        }
        setLocation();
        return consInfo.inst;
      }
      return false;
    }
    Object.defineProperty(consInfo, 'inst', { // 添加的建筑只占1格
      value: con,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    setLocation();
    return consInfo.inst;
  }

  /**
   * 从地图中移除指定位置的建筑，调用前需要检查该处是否有建筑
   * 导入的建筑顶层必定是Object3D
   * @param {number} r - 需移除建筑的行，从0开始
   * @param {number} c - 需移除建筑的列，从0开始
   */
  removeConstruction(r, c) {
    const {
      row,
      column,
      rowSpan,
      colSpan,
      mesh,
    } = this.getBlock(r, c).consInfo.inst; // 假定该处一定有建筑

    for (let x = 0; x < rowSpan; x += 1) { // 从主建筑开始，删除所在范围格子中的建筑
      for (let z = 0; z < colSpan; z += 1) {
        const thisBlock = this.getBlock(row + x, column + z);
        if (x === 0 && z === 0) { // 主建筑
          if (mesh.parent) { mesh.parent.remove(mesh); } // 从父级删除mesh
          mesh.children.forEach(({ geometry, material }) => { // 释放网格体中的资源
            geometry.dispose();
            if (Array.isArray(material)) { // 材质数组的情形
              material.forEach((mat) => {
                Object.values(mat).forEach((child) => { // 释放材质中的贴图对象
                  if (child instanceof THREE.Texture) { child.dispose(); }
                });
              });
            } else { material.dispose(); } // 材质非数组的情形
          });
        } else {
          delete thisBlock.consInfo; // 非主建筑则只删除建筑信息属性
        }
      }
    }
  }

  /** 重置地图参数 */
  resetMap() {
    this.enemyNum = this.enemyNumAll;
    this.waves = JSON.parse(JSON.stringify(this.wavesAll));
  }
}

/**
 * 派生自THREE内置Clock类的时间轴类
 * 方法:
 *   getElapsedTimeS() - 以对象的形式返回分、秒、毫秒
 *   getElapsedTimeN() - 原生方法，以浮点的形式返回秒
 *   continue() - 继续已停止的计时器（对正在计时的无效）
 */
class TimeAxis extends THREE.Clock {
  /** 扩展时间轴，支持格式化输出经过时间及继续计时函数 */
  constructor() {
    super(false);
  }

  /**
   * 格式化输出当前时间（字符串）
   * @returns string - 格式化为字符串的当前时间
   */
  getElapsedTimeS() {
    const elapsed = super.getElapsedTime().toFixed(3);
    const msecs = (Math.floor(elapsed * 1000) % 1000).toString().padStart(3, '0');
    const secs = Math.floor(elapsed % 60).toString().padStart(2, '0');
    const min = Math.floor(elapsed / 60).toString().padStart(2, '0');
    return `${min}:${secs}.${msecs}`;
  }

  /** 返回当前时间（浮点秒） */
  getElapsedTimeN() {
    return super.getElapsedTime();
  }

  /** 继续已暂停的计时器（对正在计时的无效） */
  continue() {
    if (!this.running) {
      const { elapsedTime } = this; // 计时器stop时已更新过elapsedTime
      this.start();
      this.elapsedTime = elapsedTime;
    }
  }
}


export {
  blockUnit,
  Map,
  TimeAxis,
};
