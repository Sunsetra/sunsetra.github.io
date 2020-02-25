class TimeAxisUICtl {
    constructor(timeAxis, resList) {
        this.timeAxis = timeAxis;
        this.resList = resList;
        const axisNode = document.querySelector('.time-axis');
        this.timeAxisNode = axisNode.children[0];
        this.timer = axisNode.children[1];
    }

    createAxisNode(prop, id, name) {
        const type = prop.split(' ')[0];
        const { url } = this.resList[type][name];
        const [nodeTime, createTime] = this.timeAxis.getCurrentTime();
        const node = document.createElement('div');
        node.dataset.createTime = createTime.toFixed(3);
        node.setAttribute('class', `mark-icon ${ id }`);
        if (createTime) {
            node.style.left = '100%';
        }
        node.addEventListener('mouseover', () => {
            const nodes = this.timeAxisNode.querySelectorAll(`.${ id }`);
            nodes.forEach((item) => {
                const icon = item.children[1];
                const detail = item.children[2];
                const arrow = item.children[3];
                if (icon && detail && arrow) {
                    if (window.getComputedStyle(icon).filter === 'none') {
                        icon.style.filter = 'brightness(200%)';
                    } else {
                        icon.style.filter = `${ window.getComputedStyle(icon).filter } brightness(2)`;
                    }
                    icon.style.zIndex = '2';
                    detail.style.display = 'block';
                    arrow.style.display = 'block';
                }
            });
            node.style.zIndex = '3';
        });
        node.addEventListener('mouseout', () => {
            const nodes = this.timeAxisNode.querySelectorAll(`.${ id }`);
            nodes.forEach((item) => {
                const icon = item.children[1];
                const detail = item.children[2];
                const arrow = item.children[3];
                if (icon && detail && arrow) {
                    icon.style.filter = '';
                    icon.style.zIndex = '';
                    detail.style.display = 'none';
                    arrow.style.display = 'none';
                }
            });
            node.style.zIndex = '';
        });
        const markNode = document.createElement('div');
        markNode.setAttribute('class', `mark ${ prop }`);
        const iconNode = document.createElement('div');
        iconNode.setAttribute('class', 'icon');
        iconNode.style.backgroundImage = `url("${ url }")`;
        const detailNode = document.createElement('div');
        detailNode.setAttribute('class', 'detail');
        detailNode.textContent = nodeTime;
        const detailArrow = document.createElement('div');
        detailArrow.setAttribute('class', 'detail-arrow');
        node.appendChild(markNode);
        node.appendChild(iconNode);
        node.appendChild(detailNode);
        node.appendChild(detailArrow);
        this.timeAxisNode.appendChild(node);
        return node;
    }

    clearNodes() {
        while (this.timeAxisNode.firstChild) {
            this.timeAxisNode.removeChild(this.timeAxisNode.firstChild);
        }
    }

    updateAxisNodes() {
        this.timeAxisNode.childNodes.forEach((child) => {
            const { style, dataset } = child;
            const createTime = Number(dataset.createTime);
            const pos = ((createTime / this.timeAxis.getCurrentTime()[1]) * 100).toFixed(2);
            style.left = `${ pos }%`;
        });
    }

    setTimer() {
        [this.timer.textContent] = this.timeAxis.getCurrentTime();
    }

    resetTimer() {
        this.timer.textContent = '00:00.000';
    }
}
export default TimeAxisUICtl;
