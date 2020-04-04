/** 主函数入口 */
function main() {
  /* 单击游戏条目时的显隐动画效果 */
  const gameItem = document.querySelectorAll('tbody tr');
  gameItem.forEach((item) => {
    item.addEventListener('click', () => {
      const detail = item.querySelector('.detail');
      if (detail.style.display === 'none' || detail.style.display === '') { // 渐显详情
        detail.style.transition = 'height 0.5s, opacity 0.5s 0.2s';
        detail.style.display = 'block';
        setTimeout(() => {
          detail.style.opacity = '0.8';
          detail.style.height = '7rem';
        }, 20);
      } else { // 渐隐详情
        detail.style.transition = 'height 0.5s, opacity 0.2s';
        detail.style.opacity = '0';
        detail.style.height = '0';
        setTimeout(() => {
          detail.style.display = 'none';
        }, 500);
      }
    });
  });


  /* 控制文章框架动画显隐 */
  const viewer = document.querySelector('#viewer'); // 渐隐框架
  viewer.addEventListener('click', () => {
    viewer.style.backgroundColor = 'rgba(128, 128, 128, 0)';
    viewer.style.opacity = '0';
    setTimeout(() => {
      viewer.style.display = 'none';
    }, 500);
  });

  const articleEntry = document.querySelectorAll('tbody td:nth-child(5n+4) img, tbody td:nth-child(5n+5) img');
  articleEntry.forEach((entry) => {
    entry.addEventListener('click', (event) => {
      const { url } = entry.dataset;
      const frame = document.querySelector('#viewer iframe');
      frame.src = url;
      event.stopPropagation(); // 阻止冒泡到条目

      viewer.style.display = 'block'; // 渐显框架
      setTimeout(() => {
        viewer.style.backgroundColor = 'rgba(128, 128, 128, 0.5)';
        viewer.style.opacity = '1';
      }, 20);
    });
  });
}

window.onload = main;
