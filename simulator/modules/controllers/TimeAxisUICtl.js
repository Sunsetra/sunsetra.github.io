import { addEvListener } from '../../modules/others/utils.js';

class TimeAxisUICtl {
    constructor(timeAxis, resList) {
        this.timeAxis = timeAxis;
        this.icons = resList;
        this.unitColor = {
            operator: {
                create: 'LimeGreen',
                leave: 'dodgerblue',
                dead: 'gray',
            },
            enemy: {
                create: 'orange',
                leave: 'red',
                dead: 'gray',
            },
        };
        this.nodes = new Set();
        this.cvsNode = document.querySelector('.time-axis canvas');
        this.ctx = this.cvsNode.getContext('2d');
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        addEvListener(window, 'resize', () => {
            const { width, height } = this.cvsNode.getBoundingClientRect();
            this.cvsNode.width = width * window.devicePixelRatio;
            this.cvsNode.height = height * window.devicePixelRatio;
            this.ctx.fillStyle = 'white';
            this.ctx.font = `${ this.cvsNode.height / 3 }px sans-serif`;
            this.update();
        });
    }

    addNode(name, type, action) {
        const img = new Image();
        img.addEventListener('load', () => {
            const imgHeight = this.cvsNode.height / 1.5 - 3;
            const alpha = imgHeight / img.naturalHeight;
            img.width = img.naturalWidth * alpha;
            img.height = imgHeight;
        });
        img.src = this.icons[type][name];
        this.nodes.add({
            name,
            color: this.unitColor[type][action],
            ctTime: this.timeAxis.getCurrentTime()[1],
            img,
        });
    }

    reset() {
        this.nodes.clear();
        this.timeAxis.reset();
        this.update();
    }

    update() {
        const { width, height } = this.cvsNode;
        const [axisWidth, axisHeight] = [width * 0.85, height / 3];
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, axisWidth, axisHeight);
        this.ctx.fill();
        const now = this.timeAxis.getCurrentTime()[1];
        this.nodes.forEach((node) => {
            const { color, ctTime, img } = node;
            const left = (ctTime / now) * axisWidth;
            this.ctx.fillStyle = color;
            this.ctx.fillRect(left - 2, 0, 4, axisHeight);
            this.ctx.drawImage(img, left - img.width / 2, height / 3 + 3, img.width, img.height);
        });
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(this.timeAxis.getCurrentTime()[0], width * 0.87, height / 2, width * 0.12);
    }
}
export default TimeAxisUICtl;
