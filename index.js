/**
 * 用于计时器状态的枚举常量定义
 * @readonly
 * @enum {number} 计时器状态枚举
 */
const TimerState = {
  STATIC: 0,
  NORMAL: 1,
  CHAOS: 2,
};


/**
 * 随机数类，提供多种随机化方式
 */
export class Random {
  /**
   * 以数组解析初始化随机源
   * @constructor
   * @param {Iterable} iterator - 随机源对象，仅支持实现了迭代协议的对象
   * @param {boolean} [copy] - 是否复制传入迭代器，默认为复制（共用内存时仅允许传入数组）
   */
  constructor(iterator, copy=true) {
    if (!copy && !(iterator instanceof Array)) {
      throw new TypeError('共用内存模式仅支持初始化传入数组');
    }
    try {
      /**
       * 随机源对象，仅类内访问
       * @private
       * @type {Array}
       */
      this.source = copy ? [...iterator] : iterator;
    } catch (e) {
      if (e instanceof TypeError) {
        throw new TypeError(`源对象 ${iterator} 不可迭代`);
      }
    }
  }

  /**
   * 从类实例中生成随机元素的生成器(一次性)，不破坏源数组
   * @generator
   * @yields {*} 返回随机数组中的随机元素
   */
  * [Symbol.iterator]() {
    /** @type {number[]} 生成元素序号数组 */
    const arr = new Array(this.source.length)
      .fill('')
      .map((_, index) => index);

    while (arr.length) {
      const idx = this.rand(0, arr.length - 1);
      yield this.source[arr[idx]];
      arr.splice(idx, 1);
    }
  }

  /**
   * forEach方法接受的回调函数
   * @callback Random~forEachCallback
   * @template U
   * @param {U} value - 每个随机元素的值
   * @param {number} index - 每个随机元素在随机源数组中的索引
   * @param {Iterable.<U>} source - 随机源数组本体
   */
  /**
   * 对每个随机元素执行参数回调函数
   * @param {Random~forEachCallback} callbackFn
   */
  forEach(callbackFn) {
    for (let value of this) {
      callbackFn(value, this.source.indexOf(value), this.source);
    }
  }

  /**
   * 返回[min, max]间的随机整数
   * @static
   * @param min {number} - 随机数下限
   * @param max {number} - 随机数上限
   * @return {number} 返回随机数
   */
  rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + (min);
  }

  /**
   * 随机返回源数组中的一个元素
   * @param {boolean} [remove=false] - 是否移除取出的随机元素
   * @return {*|null} 返回随机元素，当源数组为空时返回null
   */
  getItem(remove) {
    if (this.source.length) {
      const idx = this.rand(0, this.source.length - 1);
      return remove ? this.source.splice(idx, 1)[0] : this.source[idx];
    } else {
      return null;
    }
  }
}


/** 计时器类，包含计时器元素及计时器控制 */
class Timer {
  /**
   * 初始化计时器
   * @constructor
   */
  constructor() {
    /** @type {HTMLDivElement} 计时器元素 */
    this.timer = document.querySelector('main .timer');
    /** @type {number} 计时器标识符 */
    this.timerFlag = 0;

    /**
     * 按时钟更新计时器，每1000ms更新一次
     * @private
     */
    this.updateLocaleTime = () => {
      const date = new Date();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hour = date.getHours().toString().padStart(2, '0');
      const min = date.getMinutes().toString().padStart(2, '0');
      const sec = date.getSeconds().toString().padStart(2, '0');
      this.timer.textContent = `${ date.getFullYear() }-${ month }-${ day } ${ hour }:${ min }:${ sec }`;
    };
  }

  /**
   * 取一个与原数字不同的随机数
   * @private
   * @param {number|string} origin - 原数字字符串或数字
   * @return {string} 返回新随机数
   */
  pickDiffNumber(origin) {
    /** @type {string[]} 拆分源数字为字符数组 */
    const source = origin.toString().split('');
    /** @type {number[]} 生成的随机数字数组 */
    const newArr = [];

    source.forEach((char) => {
      const oldNum = parseInt(char);
      let newNum = Random.prototype.rand(0, 9);
      while (newNum === oldNum) { newNum = Random.prototype.rand(0, 9); }
      newArr.push(newNum);
    });

    return newArr.join('');
  };

  /**
   * 通过日期掩码格式化及更新日期时间
   * 掩码格式：Y-M-D h:m:s (除年份四位其余两位)
   * 任何一位出现XX表示该位置混乱更新；
   * 任何一位出现OO表示该位置以系统时间正常更新；
   * 否则仅设置静态时间，不更新。
   * @param {string} mask - 日期时间掩码
   */
  setTimer(mask) {
    /** @type {Function[]} 获取各部分日期时间的函数数组 */
    const dateFn = [
      new Date().getFullYear,
      new Date().getMonth,
      new Date().getDate,
      new Date().getHours,
      new Date().getMinutes,
      new Date().getSeconds,
    ];
    /** 掩码切分出的六部分子掩码 */
    const maskParts = mask.split(/[\s:-]/);
    /** @type {Function[]} 在当前掩码下，计算各部分值的函数数组 */
    const fnBank = [];
    maskParts.forEach((value, index) => {
      if (value === 'XXXX' || value === 'XX') {
        fnBank.push(this.pickDiffNumber);
      } else if (value === 'OOOO' || value === 'OO') {
        fnBank.push(dateFn[index]);
      } else {
        fnBank.push(null);
      }
    });

    /** 更新时间的回调函数 */
    const callback = () => {
      const oldParts = this.timer.textContent.split(/[\s:-]/);
      /** @type {(number|string)[]} 新生成的各部分值数组 */
      const arr = [];
      oldParts.forEach((value, index) => {
        const func = fnBank[index];
        if (func) {
          arr.push(func(value));
        } else {
          arr.push(value);
        }
      });
      this.timer.textContent = `${arr[0]}-${arr[1]}-${arr[2]} ${arr[3]}:${arr[4]}:${arr[5]}`;
    };

    /** @type {number} 更新时的时间间隔 */
    let interval;
    if (mask.indexOf('XX') < 0) {
      interval = mask.indexOf('OO') < 0 ? 0 : 1000;
    } else {
      interval = 100;
    }

    clearInterval(this.timerFlag);
    this.timer.textContent = mask.replace(/[XO]/g, '0');
    this.timerFlag = setInterval(callback, interval);
  }

  /** 混乱更新计时器，每50ms更新一次 */
  updateChaosTime() {
    /**
     * 取一个与原数字不同的随机数
     * @private
     * @param {number} origin - 原数字字符串或数字
     * @return {number} 返回新随机数
     */
    const pickNumber = (origin) => {
      const newNumber = rand(0, 9);
      return newNumber === origin ? pickNumber(newNumber) : newNumber;
    };

    const newText = [];
    const text = this.timer.textContent;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (char === '-' || char === ' ' || char === ':') {
        newText.push(char);
      } else {
        newText.push(pickNumber(Number(char)));
      }
    }
    this.timer.textContent = newText.join('');
  }

  /**
   * 在按时钟更新、混乱更新以及停止状态间切换
   * @param {TimerState} state - 状态标识符
   */
  switchStatus(state) {
    clearInterval(this.timerFlag);
    switch (state) {
      case TimerState.STATIC: // 停止计时
        break;
      case TimerState.NORMAL: // 开始按时钟更新
        this.updateLocaleTime();
        this.timerFlag = setInterval(this.updateLocaleTime, 1000);
        break;
      case TimerState.CHAOS: // 开始混乱更新
        this.updateChaosTime();
        this.timerFlag = setInterval(this.updateChaosTime, 50);
    }
  }
}


/** 主动画入口 */
function main() {
  const timer = new Timer();
  timer.switchStatus(TimerState.NORMAL);

  /** @type {NodeListOf<HTMLAnchorElement>} 卡片元素集合 */
  const cards = document.querySelectorAll('.card');

  /* 构造子页面气泡 */
  cards.forEach(
    (card, index) => {
      card.style.transform = index % 2 === 0 ? 'translateY(10%)' : 'translateY(-10%)';

      card.addEventListener('mouseover', () => timer.setTimer(card.dataset.time));
      card.addEventListener('touchstart', () => {
        timer.setTimer(card.dataset.time);
        if (window.screen.width > window.screen.height) {
          card.style.transform = 'translateY(-10%)';
        } else {
          card.style.transform = 'translateX(-10%)';
        }
        card.style.boxShadow = '5px 5px 5px black, inset 0 0 20px white';
        card.style.filter = 'grayscale(0)';
      }, { passive: true });

      card.addEventListener('mouseout', () => timer.switchStatus(TimerState.NORMAL));
      card.addEventListener('touchend', () => {
        timer.switchStatus(TimerState.NORMAL);
        card.style.transform = '';
        card.style.boxShadow = '';
        card.style.filter = '';
      }, { passive: true });

      card.addEventListener('contextmenu',
        /** @type {MouseEvent}*/
        (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
    });

  /* 关联电源按钮点击事件 */
  /** @type {SVGSVGElement} 电源按钮元素 */
  const powerBtn = document.querySelector('#power-btn svg');
  /** @type {HTMLDivElement} 卡片包裹元素 */
  const cardList = document.querySelector('main .list');

  powerBtn.addEventListener('click', () => {
    powerBtn.style.filter = `blur(10px)`;
    powerBtn.style.opacity = `0`;
    powerBtn.style.pointerEvents = 'none';
  }, { once: true });

  powerBtn.addEventListener('transitionend', () => {
    cardList.style.maxHeight = '60%';
    cardList.addEventListener('transitionend', () => {
      cardList.style.overflow = 'unset';
      cards.forEach((card) => {
        card.style.transform = '';
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';
      });
    }, { once: true });
  }, { once: true });

  /* resize事件中重新计算元素变换尺寸 */
  window.addEventListener('resize', () => {
    const maxSide = Math.max(document.documentElement.clientWidth, document.documentElement.clientHeight);
    let alpha = maxSide * 0.1 / powerBtn.width.baseVal.value;
    alpha = alpha > 2 ? 2 : alpha;
    powerBtn.style.transform = `translateX(-50%) scale(${ alpha })`
  });
  window.dispatchEvent(new Event('resize'));
}

window.onload = main;
