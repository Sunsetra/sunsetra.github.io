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

function main() {
  randPicRotate();
}

window.onload = main;
