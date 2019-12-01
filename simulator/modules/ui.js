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
      const chapterHeaderNodes = document.querySelectorAll('.chapter > header'); // 点击事件必须在标题上
      chapterHeaderNodes.forEach((node) => {
        node.addEventListener('click', () => {
          const otherMapItemNode = document.querySelector('.map-item.map-item-clicked');
          const thisMapItemNode = node.nextElementSibling; // 当前点击的节点
          if (otherMapItemNode && otherMapItemNode !== thisMapItemNode) {
            otherMapItemNode.classList.remove('map-item-clicked');
          }
          thisMapItemNode.classList.toggle('map-item-clicked');
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
    loadingBar.addEventListener('transitionend', () => {
      loadingBar.style.display = 'none';

      gameFrame.style.display = 'block'; // 渐显画布
      mapSelect.style.display = '';
      setTimeout(() => {
        gameFrame.style.opacity = '1';
        mapSelect.style.opacity = ''; // 显示地图选择左侧边栏
      }, 1000);

      this._collapseMapSelect();
    }, { once: true });
  }
}

export default UIController;
