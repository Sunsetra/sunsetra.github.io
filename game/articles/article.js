/** 图片旋转角度上下限常量 */
const DegScope = 3;

/**
 * 返回[min, max]间的随机整数
 * @param min {number} - 随机数下限
 * @param max {number} - 随机数上限
 * @return {number} - 返回随机数
 */
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + (min);
}

/** 旋转居中CG随机角度 */
function randPicRotate() {
  const cgs = document.querySelectorAll('.cg-middle');
  cgs.forEach((cg) => {
    const deg = rand(-DegScope, DegScope);
    cg.style.transform = `rotate(${deg}deg)`;
  });
}

/** 设置滚动时背景及侧边立绘监听器 */
function addScrollEventListener() {
  const articles = document.querySelectorAll('article');
  /** @type {HTMLDivElement} 双侧图片区域 */
  const picArea = document.querySelector('.side-pic');
  /** @type {HTMLPictureElement} 左边栏图片区域 */
  const leftPic = picArea.children[0];
  /** @type {string} 左边栏图片名 */
  let lNameOld = '';
  /** @type {HTMLPictureElement} 右边栏图片区域 */
  const rightPic = picArea.children[2];
  /** @type {string} 右边栏图片名 */
  let rNameOld = '';
  /** @type {HTMLElement} 终章元素 */
  const chapEpi = document.querySelector('article[data-route=epilogue]');


  window.addEventListener('scroll', () => {
    /* 关联章节滚动时的侧边图片变化 */
    articles.forEach((chap) => {
      /** @type {boolean} 章节位置判定 */
      const toChapter = chap.offsetTop && window.scrollY > (chap.offsetTop - 300) && window.scrollY < (chap.offsetTop + chap.offsetHeight - 300);
      /** @type {boolean} 终章位置判定 */
      const toEpilogue = Math.trunc(window.innerHeight + window.scrollY) === document.documentElement.scrollHeight && !!chapEpi.getBoundingClientRect().height;

      if (toChapter || (toEpilogue && chap === chapEpi)) {
        /** @type {string} 左右侧边角色名 */
        const { bgimage, bgcolor, chara } = chap.dataset;

        if (chara) {
          const [lNameNew, rNameNew] = chara.split(' ');
          /* 更新左图 */
          if (lNameNew !== lNameOld) {
            lNameOld = lNameNew;
            picArea.style.opacity = '0';
            picArea.addEventListener('transitionend', () => {
              while (leftPic.firstChild) { leftPic.removeChild(leftPic.firstChild); }

              const leftSource = document.createElement('source');
              leftSource.srcset = `pics/side/${ lNameNew }_l.webp`;
              leftSource.type = 'image/webp';

              const leftImg = document.createElement('img');
              leftImg.src = `pics/side/${ lNameNew }_l.png`;

              leftPic.appendChild(leftSource);
              leftPic.appendChild(leftImg);
              picArea.style.opacity = '1';
            }, { once: true });
          }
          /* 更新右图 */
          if (rNameNew !== rNameOld) {
            rNameOld = rNameNew;
            picArea.style.opacity = '0';
            picArea.addEventListener('transitionend', () => {
              while (rightPic.firstChild) { rightPic.removeChild(rightPic.firstChild); }

              const rightSource = document.createElement('source');
              rightSource.srcset = `pics/side/${ rNameNew }_r.webp`;
              rightSource.type = 'image/webp';

              const rightImg = document.createElement('img');
              rightImg.src = `pics/side/${ rNameNew }_r.png`;

              rightPic.appendChild(rightSource);
              rightPic.appendChild(rightImg);
              picArea.style.opacity = '1';
            }, { once: true });
          }
        } else if (lNameOld || rNameOld) {
          /* 清除双侧图片 */
          lNameOld = '';
          rNameOld = '';
          picArea.style.opacity = '0';
          picArea.addEventListener('transitionend', () => {
            [leftPic, rightPic].forEach((pic) => {
              while (pic.firstChild) { pic.removeChild(pic.firstChild); }
            });
            picArea.style.opacity = '1';
          }, { once: true });
        }

        /* 滚动时背景色的变化 */
        if (bgcolor) {
          document.body.style.backgroundColor = bgcolor;
        } else {
          document.body.style.backgroundColor = '';
        }

        /* 滚动时背景图片的变化 */
        if (bgimage) {
          document.body.style.backgroundImage = bgimage;
        } else {
          document.body.style.backgroundImage = '';
        }
      }
    });
  });
}

/** 主函数入口 */
function main() {
  randPicRotate();
  /** @type {HTMLDivElement} 双侧图片区域 */
  const picArea = document.querySelector('.side-pic');
  if (picArea) {
    addScrollEventListener();
  }
}

main();
