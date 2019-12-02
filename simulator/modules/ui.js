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

export default UIController;
