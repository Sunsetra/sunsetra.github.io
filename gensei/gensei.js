// 首先声明所需的jQuery变量
const text = $('.all-text'); // 整个内容版面
const eye = $('#eye'); // 鼠标点击红眼
const navi = $('li'); // 导航栏点击变红

// 鼠标点击时红眼特效
const eyeEffect = () => {
  text.on('click', (e) => {
    const centerOffset = 20;
    eye.css('left', `${e.pageX - centerOffset}px`);
    eye.css('top', `${e.pageY - centerOffset}px`);
    eye.show();
    setTimeout(() => {
      eye.fadeOut(250);
    }, 100);
  });
};

// 左侧导航栏点击进入
const clickFadeIn = () => {
  let naviNum;
  let naviId;
  navi.on('click', function () {
    // 取每个导航元素的ID进行比对并赋值以找到对应文本的ID
    naviNum = $(this).attr('id').substring(1, 3);
    if (Number.isNaN(Number(naviNum))) {
      if (Number.isNaN(Number(naviNum[0]))) {
        naviId = '#shinkai';
      } else {
        naviId = `#gensei${naviNum[0]}`;
      }
    } else {
      naviId = `#gensei${naviNum}`;
    }
    $('.introduction').hide();
    $('.zukan').hide();
    $(naviId).fadeIn(350);
  });
};

// 这里是开启网页时隐藏zukan显示introduction，并设置点击渐入的传入参数
const main = () => {
  $('.zukan').hide();
  $('#introduction').show();
  clickFadeIn();
  eyeEffect();

  // 使所有导航栏元素点击后变成红色，鼠标松/离开该按钮时变成原色
  navi.on({
    mousedown() {
      $(this).css('color', 'red');
    },
    'mouseout mouseup': function () {
      $(this).css('color', '#CCCCCC');
    },
  });
};

$(document).ready(main);
