import { Random } from '../../../index.js';

/**
 * 羽毛资源路径
 * @type {string[]} FeatherUrls
 */
const FeatherUrls = [
  'pics/bg/white_1.png',
  'pics/bg/white_2.png',
  'pics/bg/white_3.png',
  'pics/bg/white_4.png',
];

/**
 * 羽毛信息对象
 * @typedef {object} Feather
 * @property {HTMLImageElement} img - 羽毛图片元素
 * @property {number} scale - 羽毛缩放比例
 * @property {number} cTime - 羽毛创建时刻
 * @property {number} x - 羽毛的X向位移变换(translateX)
 * @property {number} vx - 羽毛的X向速度/秒
 * @property {number} y - 羽毛的Y向位移变换(translateY)
 * @property {number} vy - 羽毛的Y向速度/秒
 * @property {number} rot - 羽毛的初始旋转量(rotate)
 * @property {number} vr - 羽毛的旋转速度/秒
 */
/** 最大羽毛数量 */
const MaxFtrCnt = 25;
/**
 * 在场羽毛列表
 * @type {Feather[]}
 */
const ActiveFtr = [];
/** @type {Random} 随机羽毛资源发生器 */
const Feather = new Random(loadImgRes(FeatherUrls), false);
/** 羽毛转换色彩标志位 */
let InvertFlag = false;

/** 设置滚动时背景监听器 */
function addScrollEventListener() {
  /** @type {HTMLElement} 第二章元素 */
  const chapTwo = document.querySelector('article[data-route=chapter-2-p1]');
  /** @type {HTMLElement} 第三章元素 */
  const chapThree = document.querySelector('article[data-route=chapter-3-p1]');

  window.addEventListener('scroll', () => {
    /* 背景羽毛变色控制 */

    /** @type {boolean} 判定是否滚动至第二章位置 */
    const toChapTwo = chapTwo.offsetTop && window.scrollY > (chapTwo.offsetTop - 300);
    /** @type {boolean} 判定是否滚动至第三章位置 */
    const toChapThree = chapThree.offsetTop && window.scrollY > (chapThree.offsetTop - 300);
    /* 滚动至第二章且未至第三章时，开启反色开关并将所有在场的羽毛反色 */
    if (toChapTwo && !toChapThree) {
      InvertFlag = true;
      ActiveFtr.forEach((ftr) => { ftr.img.style.filter = `invert(100%)`; });
    } else {
      InvertFlag = false;
      ActiveFtr.forEach((ftr) => { ftr.img.style.filter = ''; });
    }
  });
}

/**
 * 加载图片资源对象并返回
 * @param res {string[]} - 数组型资源对象路径
 * @return {HTMLImageElement[]}
 */
function loadImgRes(res) {
  /** @type {HTMLImageElement[]} 图片资源元素列表 */
  const images = [];
  res.forEach((path) => {
    const img = new Image();
    img.src = path;
    img.addEventListener('load', () => {
      img.style.position = 'absolute';
      img.style.top = '0';
      img.style.left = '0';
      img.style.transition = `filter 1s`;
      images.push(img);
    });
  });
  return images;
}

/** 飞羽背景动画入口 */
function drawBackground() {
  window.addEventListener('resize', () => {
    ActiveFtr.forEach((ftr) => {
      /* 图片初始高度为视口高度的十分之一 */
      ftr.img.style.height = `${window.innerHeight / 10}px`;
    });
  });

  window.requestAnimationFrame(drawFrame);
}

/**
 * 每帧中的回调函数
 * @param time {number} - 帧时刻
 */
function drawFrame(time) {
  /** @type {HTMLDivElement} 背景容器 */
  const bg = document.querySelector('.bg');
  /**
   * 随机生成两片羽毛之间的时间间隔
   * @function
   * @return {number} 返回随机生成的时间间隔
   */
  const getInterval = Random.prototype.rand.bind(null, 200, 2000);

  /* 若活跃羽毛数量小于最大羽毛数量则以指定的时间间隔随机增加羽毛 */
  if ((ActiveFtr.length === 0 || time - ActiveFtr[ActiveFtr.length - 1].cTime > getInterval()) && ActiveFtr.length < MaxFtrCnt) {
    /** @type {HTMLImageElement|null} */
    const item = Feather.getItem();
    if (item) {
      const img = item.cloneNode();
      const scale = Random.prototype.rand(5, 25) / 10;
      /** @type {Feather} */
      const ftr = {
        /** @type {HTMLImageElement} */
        img: img,
        cTime: time,
        scale: scale,
        x: 0,
        vx: Random.prototype.rand(-10, 10) / 10,
        y: (scale + 1.5) * -50,
        vy: scale,
        rot: Random.prototype.rand(0, 359),
        vr: Random.prototype.rand(-5, 5) / 10,
      };
      if (InvertFlag) { img.style.filter = `invert(100%)`; }
      img.style.height = `${window.innerHeight / 10}px`;
      img.style.left = `${Random.prototype.rand(-10, 980) / 10}%`;
      img.style.transform = `translateY(${ftr.y}%) rotate(${ftr.rot}deg) scale(${ftr.scale})`;

      bg.appendChild(img);
      ActiveFtr.push(ftr);
    }
  }

  ActiveFtr.forEach((ftr) => {
    ftr.x += ftr.vx;
    ftr.y += ftr.vy;
    ftr.rot += ftr.vr;
    if (ftr.y > 1100) {
      bg.removeChild(ftr.img);
      ActiveFtr.splice(ActiveFtr.indexOf(ftr), 1);
    } else {
      ftr.img.style.transform = `translateX(${ftr.x}%) translateY(${ftr.y}%) rotate(${ftr.rot}deg) scale(${ftr.scale})`;
    }
  });

  window.requestAnimationFrame(drawFrame);
}

function main() {
  /** @type {HTMLDivElement} 双侧图片区域 */
  const picArea = document.querySelector('.side-pic');
  if (picArea) { addScrollEventListener(); }
  drawBackground();
}

window.onload = main;
