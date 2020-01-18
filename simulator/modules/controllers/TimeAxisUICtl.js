class TimeAxisUICtl {
    constructor() {
        this.timeAxis = document.querySelector('#axis');
        this.timer = document.querySelector('#timer');
    }

    createAxisNode(type, id, iconUrl, currentTime) {
        const [nodeTime, createTime] = currentTime;
        const node = document.createElement('div');
        node.dataset.createTime = createTime.toFixed(4);
        node.setAttribute('class', `mark-icon ${ id }`);
        node.addEventListener('mouseover', () => {
            const nodes = this.timeAxis.querySelectorAll(`.${ id }`);
            nodes.forEach((item) => {
                const icon = item.querySelector('.icon');
                const detail = item.querySelector('.detail');
                const arrow = item.querySelector('.detail-arrow');
                if (icon && detail && arrow) {
                    if (window.getComputedStyle(icon).filter === 'none') {
                        icon.style.filter = 'brightness(2)';
                    } else {
                        icon.style.filter = `${ window.getComputedStyle(icon).filter } brightness(2)`;
                    }
                    icon.style.zIndex = '999';
                    detail.style.display = 'block';
                    arrow.style.display = 'block';
                }
            });
        });
        node.addEventListener('mouseout', () => {
            const nodes = this.timeAxis.querySelectorAll(`.${ id }`);
            nodes.forEach((item) => {
                const icon = item.querySelector('.icon');
                const detail = item.querySelector('.detail');
                const arrow = item.querySelector('.detail-arrow');
                if (icon && detail && arrow) {
                    icon.style.filter = '';
                    icon.style.zIndex = '';
                    detail.style.display = 'none';
                    arrow.style.display = 'none';
                }
            });
        });
        const markNode = document.createElement('div');
        markNode.setAttribute('class', `mark ${ type }`);
        const iconNode = document.createElement('div');
        iconNode.setAttribute('class', 'icon');
        iconNode.style.backgroundImage = `url("${ iconUrl }")`;
        const detailNode = document.createElement('div');
        detailNode.setAttribute('class', 'detail');
        detailNode.textContent = nodeTime;
        const detailArrow = document.createElement('div');
        detailArrow.setAttribute('class', 'detail-arrow');
        node.appendChild(markNode);
        node.appendChild(iconNode);
        node.appendChild(detailNode);
        node.appendChild(detailArrow);
        this.timeAxis.appendChild(node);
        return node;
    }

    clearNodes() {
        while (this.timeAxis.firstChild) {
            this.timeAxis.removeChild(this.timeAxis.firstChild);
        }
    }

    updateAxisNodes(axisTime) {
        this.timeAxis.childNodes.forEach((child) => {
            const { style, dataset } = child;
            const createTime = Number(dataset.createTime);
            const pos = ((createTime / axisTime) * 100).toFixed(2);
            style.left = `${ pos }%`;
        });
    }

    setTimer(time) {
        if (this.timer) {
            this.timer.textContent = time;
        }
    }

    resetTimer() {
        if (this.timer) {
            this.timer.textContent = '00:00.000';
        }
    }
}

export default TimeAxisUICtl;
