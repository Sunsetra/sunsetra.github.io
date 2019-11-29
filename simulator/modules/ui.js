class UIController {
  static initUI() {
    /** 初始化左侧边栏事件监听 */
    function leftSidebar() {
      const chapterHeaderNodes = document.querySelectorAll('.chapter > header');
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
    leftSidebar();
  }
}

export default UIController;
