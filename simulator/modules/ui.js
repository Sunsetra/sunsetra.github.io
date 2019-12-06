class UIController {
  /** 折叠地图选择侧边栏 */
  static _collapseMapSelect() {
    const expandMapItem = document.querySelector('.map-item.map-item-clicked');
    if (expandMapItem) {
      expandMapItem.classList.remove('map-item-clicked');
    }
  }

  static initUI() {
    /** 初始化地图选择窗口 */
    function mapSelector() {
      const chapterNodes = document.querySelectorAll('.chapter'); // 章节节点展开当前及关闭其他节点
      chapterNodes.forEach((node) => {
        node.addEventListener('click', () => {
          const otherMapItemNode = document.querySelector('.map-item.map-item-clicked'); // 其他展开的节点
          const thisMapItemNode = node.querySelector('.map-item'); // 当前点击的节点
          if (otherMapItemNode && otherMapItemNode !== thisMapItemNode) {
            otherMapItemNode.classList.remove('map-item-clicked');
            const otherChapterNode = otherMapItemNode.parentNode;
            otherChapterNode.style.cursor = '';
          }
          thisMapItemNode.classList.add('map-item-clicked');
          const { style } = node;
          style.cursor = 'default';
        });
      });

      const chapterHeaderNodes = document.querySelectorAll('.chapter > header'); // 标题节点只关闭当前节点
      chapterHeaderNodes.forEach((node) => {
        node.addEventListener('click', (event) => {
          const thisMapItemNode = node.nextElementSibling; // 当前点击的节点
          const thisChapterNode = node.parentNode;
          if (thisMapItemNode.classList.contains('map-item-clicked')) { // 若当前点击的节点已展开
            thisMapItemNode.classList.remove('map-item-clicked');
            thisChapterNode.style.cursor = '';
            event.stopPropagation(); // 闭合节点并阻止冒泡
          }
        });
      });
    }
    mapSelector();
  }

  /**
   * 从选择地图界面切换到游戏框架
   * @param loadingFunc - 地图加载函数
   */
  static mapSelectToLoading(loadingFunc) {
    const currentMapNode = document.querySelectorAll('.map-item figure');
    const mapSelect = document.querySelector('.map-select');
    const loadingBar = document.querySelector('#loading');

    currentMapNode.forEach((node) => {
      node.addEventListener('click', () => {
        mapSelect.style.opacity = '0';
        mapSelect.addEventListener('transitionend', () => {
          mapSelect.classList.add('side-bar'); // 将地图选择左侧边栏化
          mapSelect.style.display = 'none'; // 彻底隐藏左侧边栏

          loadingBar.style.display = 'flex';
          loadingFunc(node.dataset.url);
        }, { once: true });
      });
    });
  }

  /** 隐藏加载进度条并显示画布 */
  static loadingToGameFrame() {
    const loadingBar = document.querySelector('#loading');
    const gameFrame = document.querySelector('.game-frame');
    const mapSelect = document.querySelector('.map-select');

    loadingBar.style.opacity = '0'; // 渐隐加载进度条
    setTimeout(() => {
      loadingBar.style.display = 'none';
    }, 1000);

    gameFrame.style.display = 'block'; // 渐显画布
    mapSelect.style.display = '';
    setTimeout(() => {
      gameFrame.style.opacity = '1';
      mapSelect.style.opacity = ''; // 显示地图选择左侧边栏
    }, 1000);

    this._collapseMapSelect();
  }
}

class TimeAxisUI {
  constructor() {
    this.timeAxis = document.querySelector('#axis');
  }

  /**
   * 创建显示在时间轴上的单位节点
   * @param type - 单位节点视觉行为，由单位类型与单位行为组成：
   *  类型：（标记）橙色表示敌方单位(enemy)，蓝色表示己方单位(ally)；
   *  行为：（图标）正常色表示创建(create)，红色遮罩表示死亡(dead)，漏怪(drop)以红色标记表示
   * @param name - 单位名称：用于节点类名
   * @param iconUrl - 单位图标资源url
   * @param createTime - 单位创建时间（浮点数）
   * @param nodeTime - 节点时间（字符串）
   * @returns {HTMLDivElement} - 返回时间轴节点
   */
  createAxisNode(type, name, iconUrl, createTime, nodeTime) {
    const node = document.createElement('div'); // 创建容器节点
    node.dataset.createTime = createTime;
    node.setAttribute('class', `mark-icon ${name}`);

    node.addEventListener('mouseover', () => {
      const nodes = this.timeAxis.querySelectorAll(`.${name}`);
      nodes.forEach((item) => {
        const icon = item.querySelector('.icon');
        icon.style.filter = 'brightness(2)'; // 选中图标亮度变化
        icon.style.zIndex = '999';
        const detail = item.querySelector('.detail');
        detail.style.display = 'block';
        const arrow = item.querySelector('.detail-arrow');
        arrow.style.display = 'block';
      });
    });

    node.addEventListener('mouseout', () => {
      const nodes = this.timeAxis.querySelectorAll(`.${name}`);
      nodes.forEach((item) => {
        const icon = item.querySelector('.icon');
        icon.style.filter = 'none';
        icon.style.zIndex = 'auto';
        const detail = item.querySelector('.detail');
        detail.style.display = 'none';
        const arrow = item.querySelector('.detail-arrow');
        arrow.style.display = 'none';
      });
    });

    const markNode = document.createElement('div'); // 创建时间轴标记节点
    markNode.setAttribute('class', `mark ${type}`);

    const iconNode = document.createElement('div'); // 创建图标标记节点
    iconNode.setAttribute('class', 'icon');
    iconNode.style.backgroundImage = `url("${iconUrl}")`;

    const detailNode = document.createElement('div'); // 创建详细时间节点
    detailNode.setAttribute('class', 'detail');
    detailNode.textContent = nodeTime;
    const detailArrow = document.createElement('div'); // 创建小箭头节点
    detailArrow.setAttribute('class', 'detail-arrow');

    node.appendChild(markNode);
    node.appendChild(iconNode);
    node.appendChild(detailNode);
    node.appendChild(detailArrow);
    this.timeAxis.appendChild(node);
    return node;
  }

  clearNodes() {
    while (this.timeAxis.firstChild) { // 清除时间轴的子节点
      this.timeAxis.removeChild(this.timeAxis.firstChild);
    }
  }

  /**
   * 更新子节点在时间轴上的位置
   * @param axisTime - 当前时刻
   */
  updateAxisNodes(axisTime) {
    this.timeAxis.childNodes.forEach((child) => {
      const createTime = Number(child.dataset.createTime);
      const pos = ((createTime / axisTime) * 100).toFixed(2);
      const { style } = child;
      style.left = `${pos}%`;
    });
  }
}

export { UIController, TimeAxisUI };
