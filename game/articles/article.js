/** 图片旋转角度上下限常量 */
const DegScope = 2;

/**
 * 返回[min, max]间的随机整数
 * @param min {number} - 随机数下限
 * @param max {number} - 随机数上限
 * @return {number} - 返回随机数
 */
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + (min);
}

/**
 * CG样式美化：旋转角度0-2度
 * CG格式要求规范：
 * ------------------------------------------------
 * <figure>
 *   <picture class="cg-middle">
 *     [<source srcset="*.webp" type="image/webp">]
 *     <img alt="*" src="*.png">
 *   </picture>
 *   [<figcaption>*</figcaption>]
 * </figure>
 * ------------------------------------------------
 * 其中webp源、CG图片说明文字可选；
 */
function randPicRotate() {
  const cgs = document.querySelectorAll('.cg-middle');
  cgs.forEach((cg) => {
    const deg = rand(-DegScope, DegScope);
    cg.style.transform = `rotate(${deg}deg)`;
  });
}

/**
 * 文章滚动时样式美化：背景变化、侧边立绘变化
 * 文章格式要求规范：
 * -------------------------------------------------
 * <main [class="outline"]>
 *   <article data-route="(prologue|epilogue|chapter-*|end-*)" [data-chara="left right" data-bgcolor="*" data-bgimage="*"]></article>
 * </main>
 * ------------------------------------------------
 * 1. 文章不需要侧边导航栏时，在main元素中增加class="outline"；
 * 2. 双侧立绘文件名须以chara_(l/r).(webp/png)格式命名；
 * 3. data-chara处填写该章节所需的左右立绘名chara，先左后右，不需要明确立绘文件名的l/r，可选；
 * 4. data-bgcolor、data-bgimage处分别填写该章节所需的背景色和背景图，可选。
 */
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

/**
 * 设置选择肢监听器
 * 选择肢格式要求规范：
 * -------------------------------------------------
 * <div class="selector-wrapper">
 *   <div class="selector" data-select="*">*</div>
 * </div>
 * -------------------------------------------------
 * 单项选择肢的data-select属性须与目标文章块的data-route属性相同。
 */
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

/** 主函数入口 */
function main() {
  randPicRotate();

  /** @type {HTMLDivElement} 双侧图片区域 */
  const picArea = document.querySelector('.side-pic');
  if (picArea) { addScrollEventListener(); }

  /** @type {HTMLDivElement} 选择肢集合 */
  const selectors = document.querySelector('.selector-wrapper');
  if (selectors) { setSelectorListener(); }
}

main();
