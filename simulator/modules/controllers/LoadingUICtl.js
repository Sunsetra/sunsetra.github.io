class LoadingUICtl {
    static updateTip(text, append = false) {
        const tip = document.querySelector('#progress-tip');
        tip.innerText = append ? tip.innerText + text : text;
    }

    static resetLoadingBar() {
        const bar = document.querySelector('#bar');
        const left = document.querySelector('#left');
        const right = document.querySelector('#right');
        right.style.display = '';
        bar.style.width = '100%';
        left.textContent = '0%';
        right.textContent = '0%';
        left.style.margin = '';
        left.style.transform = '';
        right.style.margin = '';
        right.style.transform = '';
    }

    static initUI() {
        function mapSelector() {
            const chapterNodes = document.querySelectorAll('.chapter');
            chapterNodes.forEach((node) => {
                node.addEventListener('click', () => {
                    const otherMapItemNode = document.querySelector('.map-item.map-item-clicked');
                    const thisMapItemNode = node.querySelector('.map-item');
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
            const chapterHeaderNodes = document.querySelectorAll('.chapter > header');
            chapterHeaderNodes.forEach((node) => {
                node.addEventListener('click', (event) => {
                    const thisMapItemNode = node.nextElementSibling;
                    const thisChapterNode = node.parentNode;
                    if (thisMapItemNode && thisMapItemNode.classList.contains('map-item-clicked')) {
                        thisMapItemNode.classList.remove('map-item-clicked');
                        thisChapterNode.style.cursor = '';
                        event.stopPropagation();
                    }
                });
            });
        }

        mapSelector();
    }

    static mapSelectToLoading(loader) {
        const currentMapNode = document.querySelectorAll('.map-item figure');
        const gameFrame = document.querySelector('.game-frame');
        const mapSelect = document.querySelector('.map-select');
        const loading = document.querySelector('#loading');
        currentMapNode.forEach((node) => {
            node.addEventListener('click', () => {
                this.resetLoadingBar();
                this.updateTip('正在加载...');
                mapSelect.style.opacity = '0';
                gameFrame.style.opacity = '';
                mapSelect.addEventListener('transitionend', () => {
                    mapSelect.classList.add('side-bar');
                    mapSelect.style.display = 'none';
                    gameFrame.style.display = '';
                    loading.style.display = 'flex';
                    setTimeout(() => {
                        loading.style.opacity = '1';
                    }, 300);
                    loading.addEventListener('transitionend', () => {
                        const { dataset } = node;
                        if (dataset.url) {
                            loader.load(dataset.url);
                        }
                    }, { once: true });
                }, { once: true });
            });
        });
    }

    static updateLoadingBar(itemsLoaded, itemsTotal, callback) {
        const bar = document.querySelector('#bar');
        const left = document.querySelector('#left');
        const right = document.querySelector('#right');
        left.style.margin = '0';
        left.style.transform = 'translateX(-50%)';
        right.style.margin = '0';
        right.style.transform = 'translateX(50%)';
        const percent = (itemsLoaded / itemsTotal) * 100;
        bar.style.width = `${ 100 - percent }%`;
        left.textContent = `${ Math.round(percent) }%`;
        right.textContent = `${ Math.round(percent) }%`;
        if (percent >= 100 && callback !== undefined) {
            bar.addEventListener('transitionend', () => {
                right.style.display = 'none';
                this.updateTip('加载完成');
                setTimeout(() => { this.loadingToGameFrame(callback); }, 200);
            }, { once: true });
        }
    }

    static loadingToGameFrame(func) {
        const loading = document.querySelector('#loading');
        const gameFrame = document.querySelector('.game-frame');
        const mapSelect = document.querySelector('.map-select');
        loading.style.opacity = '0';
        loading.addEventListener('transitionend', () => {
            loading.style.display = 'none';
            gameFrame.style.display = 'block';
            func();
            mapSelect.style.display = '';
            setTimeout(() => {
                gameFrame.style.opacity = '1';
                mapSelect.style.opacity = '';
            }, 200);
        }, { once: true });
        LoadingUICtl.collapseMapSelect();
    }

    static collapseMapSelect() {
        const expandMapItem = document.querySelector('.map-item.map-item-clicked');
        if (expandMapItem) {
            expandMapItem.classList.remove('map-item-clicked');
        }
    }
}

export default LoadingUICtl;
