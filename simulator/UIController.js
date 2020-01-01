class LoadingUI {
  /** 折叠地图选择侧边栏 */
  static collapseMapSelect() {
    const expandMapItem = document.querySelector('.map-item.map-item-clicked');
    if (expandMapItem) {
      expandMapItem.classList.remove('map-item-clicked');
    }
  }

  /**
   * 更新加载提示
   * @param text - 要拼接在原文本后的加载提示信息
   * @param append - 提示更新模式（可选），为true时表示新增信息，默认或false为替换原信息
   */
  static updateTip(text, append = false) {
    const tip = document.querySelector('#progress-tip');
    if (tip) {
      tip.innerText = append ? tip.innerText + text : text;
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
          if (thisMapItemNode) {
            thisMapItemNode.classList.add('map-item-clicked');
            const { style } = node;
            style.cursor = 'default';
          }
        });
      });
      const chapterHeaderNodes = document.querySelectorAll('.chapter > header'); // 标题节点只关闭当前节点
      chapterHeaderNodes.forEach((node) => {
        node.addEventListener('click', (event) => {
          const thisMapItemNode = node.nextElementSibling; // 当前点击的节点
          const thisChapterNode = node.parentNode;
          if (thisMapItemNode && thisMapItemNode.classList.contains('map-item-clicked')) { // 若当前点击的节点已展开
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
   * @param loader - 地图加载器
   */
  static mapSelectToLoading(loader) {
    const currentMapNode = document.querySelectorAll('.map-item figure');
    const mapSelect = document.querySelector('.map-select');
    const loadingBar = document.querySelector('#loading');
    currentMapNode.forEach((node) => {
      node.addEventListener('click', () => {
        if (mapSelect && loadingBar) {
          mapSelect.style.opacity = '0';
          mapSelect.addEventListener('transitionend', () => {
            mapSelect.classList.add('side-bar'); // 将地图选择左侧边栏化
            mapSelect.style.display = 'none'; // 彻底隐藏左侧边栏
            loadingBar.style.display = 'flex';
            const { dataset } = node;
            if (dataset.url) {
              loader.load(dataset.url);
            }
          }, { once: true });
        }
      });
    });
  }

  /**
   * 更新加载进度条
   * @param itemsLoaded: 已加载资源数
   * @param itemsTotal: 总资源数
   * @param callback: 加载完成回调函数
   */
  static updateLoadingBar(itemsLoaded, itemsTotal, callback) {
    const bar = document.querySelector('#bar');
    const left = document.querySelector('#left');
    const right = document.querySelector('#right');
    if (bar && left && right) {
      left.style.margin = '0';
      left.style.transform = 'translateX(-50%)';
      right.style.margin = '0';
      right.style.transform = 'translateX(50%)';
      const percent = (itemsLoaded / itemsTotal) * 100;
      bar.style.width = `${100 - percent}%`; // 设置中部挡块宽度
      left.textContent = `${Math.round(percent)}%`;
      right.textContent = `${Math.round(percent)}%`; // 更新加载百分比
      if (percent >= 100 && callback !== undefined) { // 运行加载完成回调函数
        bar.addEventListener('transitionend', () => {
          right.style.display = 'none';
          this.updateTip('加载完成');
          setTimeout(() => { this.loadingToGameFrame(callback); }, 200);
        });
      }
    }
  }

  /** 隐藏加载进度条并显示画布 */
  static loadingToGameFrame(func) {
    const loading = document.querySelector('#loading');
    const gameFrame = document.querySelector('.game-frame');
    const mapSelect = document.querySelector('.map-select');
    if (loading && gameFrame && mapSelect) {
      loading.style.opacity = '0'; // 渐隐加载进度条
      loading.addEventListener('transitionend', () => {
        loading.style.display = 'none';
        gameFrame.style.display = 'block'; // 渐显画布
        func(); // 主回调在画布显示后运行
        mapSelect.style.display = '';
        setTimeout(() => {
          gameFrame.style.opacity = '1';
          mapSelect.style.opacity = ''; // 显示地图选择左侧边栏
        }, 200);
      }, { once: true });
    }
    LoadingUI.collapseMapSelect();
  }
}

class TimeAxisUI {
  /** 时间轴UI控制 */
  constructor() {
    this.timeAxis = document.querySelector('#axis');
    this.timer = document.querySelector('#timer'); // 计时器
  }

  /**
   * 创建显示在时间轴上的单位节点
   * @param type - 单位节点视觉行为，由单位类型与单位行为组成：
   *  类型：（标记）橙色表示敌方单位(enemy)，蓝色表示己方单位(ally)
   *  行为：（图标）正常色表示创建(create)，灰度表示死亡(dead)，漏怪(drop)以红色标记表示
   * @param name - 单位名称：用于节点类名
   * @param iconUrl - 单位图标资源url
   * @param createTime - 单位创建时间（浮点数）
   * @param nodeTime - 节点时间（字符串）
   * @returns - 返回时间轴节点
   */
  createAxisNode(type, name, iconUrl, createTime, nodeTime) {
    const node = document.createElement('div'); // 创建容器节点
    node.dataset.createTime = createTime.toFixed(4); // 在节点的数据属性中记录出现时间
    node.setAttribute('class', `mark-icon ${name}`);
    node.addEventListener('mouseover', () => {
      const nodes = this.timeAxis ? this.timeAxis.querySelectorAll(`.${name}`) : [];
      nodes.forEach((item) => {
        const icon = item.querySelector('.icon');
        const detail = item.querySelector('.detail');
        const arrow = item.querySelector('.detail-arrow');
        if (icon && detail && arrow) {
          if (window.getComputedStyle(icon).filter === 'none') { // 在原样式基础上增加光标高亮行为
            icon.style.filter = 'brightness(2)';
          } else {
            icon.style.filter = `${window.getComputedStyle(icon).filter} brightness(2)`;
          }
          icon.style.zIndex = '999';
          detail.style.display = 'block';
          arrow.style.display = 'block';
        }
      });
    });
    node.addEventListener('mouseout', () => {
      const nodes = this.timeAxis ? this.timeAxis.querySelectorAll(`.${name}`) : [];
      nodes.forEach((item) => {
        const icon = item.querySelector('.icon');
        const detail = item.querySelector('.detail');
        const arrow = item.querySelector('.detail-arrow');
        if (icon && detail && arrow) {
          icon.style.filter = '';
          icon.style.zIndex = '';
          detail.style.display = 'none';
          arrow.style.display = 'none';
        }
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
    if (this.timeAxis) {
      this.timeAxis.appendChild(node);
    }
    return node;
  }

  /** 清除时间轴上的所有节点 */
  clearNodes() {
    while (this.timeAxis && this.timeAxis.firstChild) { // 清除时间轴的子节点
      this.timeAxis.removeChild(this.timeAxis.firstChild);
    }
  }

  /**
   * 更新子节点在时间轴上的位置
   * @param axisTime - 当前时刻
   */
  updateAxisNodes(axisTime) {
    if (this.timeAxis) {
      this.timeAxis.childNodes.forEach((child) => {
        const { style, dataset } = child;
        const createTime = Number(dataset.createTime);
        const pos = ((createTime / axisTime) * 100).toFixed(2);
        style.left = `${pos}%`;
      });
    }
  }

  /**
   * 设置计时器时间
   * @param time - 新的计时器时间
   */
  setTimer(time) {
    if (this.timer) {
      this.timer.textContent = time;
    }
  }

  /** 重置计时器 */
  resetTimer() {
    if (this.timer) {
      this.timer.textContent = '00:00.000';
    }
  }
}

export { LoadingUI, TimeAxisUI };
