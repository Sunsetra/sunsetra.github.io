function main() {
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
        element.style.height = 'auto';
      }, 20);

      /** @type {string} */
      const type = element.dataset.route.split('-')[0]
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
          setTimeout(() => {
            selector.style.display = 'none';
          }, 500);
        }
      });

      /* 匹配显示相应的选择路径 */
      articles.forEach((para) => {
        if (para.dataset.route === select) {
          childHasSelector(para);
        }
      });
    }, { once: true });
  });

}

window.onload = main;
