import { Random } from '../../../index.js';

/**
 * 羽毛资源路径
 * @type {object} FeatherUrls
 * @property {string[]} FeatherUrls.white - 白羽路径
 * @property {string[]} FeatherUrls.dark - 黑羽路径
 */
const FeatherUrls = {
  white: [
    'pics/bg/white_1.png',
    'pics/bg/white_2.png',
    'pics/bg/white_3.png',
    'pics/bg/white_4.png',
  ],
  dark: [],
};

/** 最大羽毛数量 */
const MaxFeatherCnt = 25;
/**
 * 随机生成两片羽毛之间的时间间隔
 * @function
 * @return {number} 返回随机生成的时间间隔
 */
const FeatherTimeInterval = Random.prototype.rand.bind(null, 500, 2500);
/**
 * 羽毛信息对象
 * @typedef {object} Feather
 * @property {HTMLCanvasElement} cvs - 羽毛对象画布
 * @property {number} scale - 羽毛缩放比例
 * @property {number} cTime - 羽毛创建时刻
 * @property {number} x - 羽毛的X向位移变换(translateX)
 * @property {number} vx - 羽毛的X向速度/秒
 * @property {number} y - 羽毛的Y向位移变换(translateY)
 * @property {number} vy - 羽毛的Y向速度/秒
 * @property {number} rot - 羽毛的初始旋转量(rotate)
 * @property {number} vr - 羽毛的旋转速度/秒
 */
/**
 * 在场羽毛列表
 * @type {Feather[]}
 */
const ActiveFeather = [];
/** @type {Random} 随机白羽资源发生器 */
const WhiteFeather = new Random(loadPicRes(FeatherUrls.white), false);

function main() {
  setSelectorListener();
  drawBackground();
}

function setSelectorListener() {
  /** @type {NodeListOf<HTMLElement>} 所有小节的集合 */
  const articles = document.querySelectorAll('article');
  /** @type {NodeListOf<HTMLDivElement>} 所有选项的集合 */
  const selectors = document.querySelectorAll('.selector');

  /**
   * 显示一个article元素，并检查该元素中是否含有选择肢
   * 若不含选择肢则检查下个兄弟元素
   * @param element {Element|HTMLElement|null} - 需检查的元素
   */
  const childHasSelector = (element) => {
    if (element) {
      element.style.display = 'block';
      setTimeout(() => {
        element.style.opacity = '1';
        element.style.height = `${element.scrollHeight.toString()}px`;
        element.addEventListener('transitionend', () => {
          element.style.height = 'auto';
        }, {once: true}); // 防止隐藏选项时留下空白
      }, 20);

      /** @type {string} */
      const type = element.dataset.route.split('-')[0];
      /* 若所选非结局，则递归检查后面的article */
      if (type === 'chapter') {
        if (!element.querySelectorAll('.selector').length) {
          childHasSelector(element.nextElementSibling);
        }
      }
    }
  };

  selectors.forEach((item) => {
    /** @type {string} 选项中的选择路径数据 */
    const { select } = item.dataset;
    item.addEventListener('click', () => {
      /* 隐藏未被选中的选择肢 */
      /** @type {NodeListOf<HTMLDivElement>} 所有当前文章中的选项集合 */
      const selectorBundle = item.parentNode.querySelectorAll('.selector');
      selectorBundle.forEach((selector) => {
        if (selector !== item) {
          selector.style.opacity = '0';
          selector.style.border = '0';
          selector.style.margin = '0 auto';
          selector.style.height = '0';
          selector.addEventListener('transitionend', () => {
            selector.style.display = 'none';
            /* 匹配显示相应的选择路径 */
            articles.forEach((para) => {
              if (para.dataset.route === select) { childHasSelector(para); }
            });
          }, {once: true});
        }
      });
    }, { once: true });
  });
}

/**
 * 画布资源包元组，包含画布元素与图片资源
 * @typedef {Array.<HTMLCanvasElement|HTMLImageElement>} CanvasRes
 */
/**
 * 加载图片资源对象并返回
 * @param res {string[]} - 数组型资源对象路径
 * @return {CanvasRes[]}
 */
function loadPicRes(res) {
  /** @type {CanvasRes[]} 画布及资源对象列表 */
  const canvas = [];
  res.forEach((path) => {
    const img = new Image();
    img.src = path;
    img.addEventListener('load', () => {
      const cvs = document.createElement('canvas');
      cvs.width = img.naturalWidth * window.devicePixelRatio;
      cvs.height = img.naturalHeight * window.devicePixelRatio;
      cvs.style.position = 'absolute';
      cvs.style.top = '0';
      cvs.style.left = '0';
      canvas.push([cvs, img]);
    });
  });
  return canvas;
}

function drawBackground() {
  window.addEventListener('resize', () => {
    ActiveFeather.forEach((feather) => {
      feather.cvs.style.height = `${window.innerHeight / 10}px`;
    });
  });

  window.requestAnimationFrame(drawFrame);
}

/**
 * 绘制帧
 * @param time {number} - 帧时刻
 */
function drawFrame(time) {
  /** @type {HTMLDivElement} 背景容器 */
  const bg = document.querySelector('.bg');

  /* 若活跃羽毛数量小于最大羽毛数量则以指定的时间间隔随机增加羽毛 */
  if ((ActiveFeather.length === 0 || time - ActiveFeather[ActiveFeather.length - 1].cTime > FeatherTimeInterval()) && ActiveFeather.length < MaxFeatherCnt) {
    /** @type {CanvasRes|null} */
    const res = WhiteFeather.getItem();
    if (res) {
      const [cvs, img] = [res[0].cloneNode(), res[1]];
      const ctx = cvs.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.drawImage(img, 0, 0);

      const scale = Random.prototype.rand(5, 25) / 10;
      /** @type {Feather} */
      const feather = {
        /** @type {HTMLCanvasElement} */
        cvs: cvs,
        cTime: time,
        scale: scale,
        x: 0,
        vx: Random.prototype.rand(-10, 10) / 10,
        y: -100 * scale,
        vy: scale,
        rot: Random.prototype.rand(0, 359),
        vr: Random.prototype.rand(-5, 5) / 10,
      };
      cvs.style.left = `${Random.prototype.rand(-10, 980) / 10}%`;
      cvs.style.transform = `translateY(${feather.y}%) rotate(${feather.rot}deg) scale(${feather.scale})`;
      bg.appendChild(cvs);
      ActiveFeather.push(feather);

      window.dispatchEvent(new Event('resize'));
    }
  }

  ActiveFeather.forEach((feather) => {
    feather.x += feather.vx;
    feather.y += feather.vy;
    feather.rot += feather.vr;
    feather.cvs.style.transform = `translateX(${feather.x}%) translateY(${feather.y}%) rotate(${feather.rot}deg) scale(${feather.scale})`;
    if (feather.y > 1000) {
      bg.removeChild(feather.cvs);
      ActiveFeather.splice(ActiveFeather.indexOf(feather), 1);
    }
  });

  window.requestAnimationFrame(drawFrame);
}

window.onload = main;
