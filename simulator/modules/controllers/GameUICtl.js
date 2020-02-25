import { Vector2, Vector3 } from '../../lib/three/build/three.module.js';
import { OverlayType, RarityColor } from '../../modules/others/constants.js';
import { absPosToRealPos, realPosToAbsPos } from '../../modules/others/utils.js';

class GameUIController {
    constructor(frame, map, gameCtl, renderer, data) {
        this.frame = frame;
        this.map = map;
        this.renderer = renderer;
        this.gameCtl = gameCtl;
        this.matData = data.materials;
        this.unitData = data.units;
        this.cost = Math.floor(gameCtl.cost);
        this.mouseLayer = document.querySelector('.mouse-overlay');
        this.selectLayer = document.querySelector('.select-overlay');
        this.bottomUI = document.querySelector('.ui-bottom');
        this.oprCards = this.bottomUI.children[2];
        this.costInnerBar = document.querySelector('.cost-bar div');
        this.ctx = this.selectLayer.getContext('2d');
        this.center = new Vector2(0, 0);
        let selectedOpr;
        let clickPos;
        const withdrawNode = document.querySelector('.ui-overlay#withdraw');
        this.frame.addEventListener(withdrawNode, 'click', () => {
            this.withdrawOperator(selectedOpr);
            this.frame.removeEventListener(this.selectLayer, 'click');
        });
        this.frame.addEventListener(this.frame.canvas, 'mousedown', () => {
            const { pickPos } = this.map.tracker;
            clickPos = pickPos === null ? null : pickPos;
        });
        this.frame.addEventListener(this.frame.canvas, 'mouseup', () => {
            const { pickPos } = this.map.tracker;
            if (pickPos !== null && clickPos === pickPos) {
                const absPos = realPosToAbsPos(pickPos, true);
                if (this.map.getBlock(absPos) !== null) {
                    this.gameCtl.activeOperator.forEach((opr) => {
                        if (absPos.equals(opr.position.floor())) {
                            selectedOpr = opr;
                            const calcIconsPos = () => {
                                const rad = this.selectLayer.width * 0.1;
                                const delta = rad / Math.sqrt(2) / 2;
                                withdrawNode.style.left = `${ this.center.x / 2 - delta }px`;
                                withdrawNode.style.top = `${ this.center.y / 2 - delta }px`;
                            };
                            const resizeSelectLayer = () => {
                                this.selectLayer.width = this.frame.canvas.width;
                                this.selectLayer.height = this.frame.canvas.height;
                                this.drawSelectLayer(absPos);
                                calcIconsPos();
                            };
                            this.selectLayer.style.display = 'block';
                            withdrawNode.style.display = 'block';
                            resizeSelectLayer();
                            const atkLayer = this.map.getOverlay(OverlayType.AttackLayer);
                            atkLayer.showArea(absPos, opr.atkArea);
                            this.renderer.requestRender();
                            this.frame.addEventListener(this.selectLayer, 'click', () => {
                                this.frame.removeEventListener(window, 'resize', resizeSelectLayer);
                                this.hideSelectLayer();
                            }, true);
                            this.frame.addEventListener(window, 'resize', resizeSelectLayer);
                        }
                    });
                }
            }
        });
    }

    reset() {
        this.updateCost();
        this.costInnerBar.style.width = '';
        this.bottomUI.children[1].textContent = this.gameCtl.ctlData.oprLimit.toString();
        this.oprCards.childNodes.forEach((child) => {
            const cdNode = child.children[1];
            cdNode.textContent = '';
            cdNode.style.display = '';
            const originCost = this.unitData.operator[child.id].cost;
            child.children[2].textContent = originCost.toString();
            child.dataset.status = '';
        });
        this.showOprCard();
        this.updateCardStatus();
    }

    updateUIStatus() {
        const intCost = Math.floor(this.gameCtl.cost);
        this.costInnerBar.style.width = `${ (this.gameCtl.cost - intCost) * 100 }%`;
        if (intCost !== this.cost) {
            this.updateCost();
            this.updateCardStatus();
        }
        this.oprCards.childNodes.forEach((child) => {
            if (child.dataset.status === 'cd') {
                const opr = this.gameCtl.allOperator.get(child.id);
                const cdNode = child.children[1];
                if (opr.rspTime > 0) {
                    cdNode.textContent = opr.rspTime.toFixed(1);
                } else {
                    cdNode.style.display = '';
                    if (this.cost >= opr.cost) {
                        this.enableOprCard(child);
                    } else {
                        this.disableOprCard(child);
                    }
                }
            }
        });
    }

    addOprCard(oprList) {
        const drawStars = (n) => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', `${ -150 * (n - 1) } 0 ${ 270 + (n - 1) * 146 } 256`);
            const stl = document.createElement('style');
            stl.textContent = '.st0{fill:#F7DF42;stroke:#787878;stroke-width:2;stroke-linejoin:round;stroke-miterlimit:10;}';
            svg.appendChild(stl);
            for (let i = 0; i < n; i += 1) {
                const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                polygon.setAttribute('class', 'st0');
                polygon.setAttribute('points', `${ 156 - (n - 1) * 1.6 - 150 * i },39.3 ${ 156 - (n - 1) * 1.6 - 150 * i },107.5 
                  ${ 220.8 - (n - 1) * 1.6 - 150 * i },128.5 ${ 156 - (n - 1) * 1.6 - 150 * i },149.5 
                  ${ 156 - (n - 1) * 1.6 - 150 * i },217.7 ${ 116 - (n - 1) * 1.6 - 150 * i },162.6 
                  ${ 51.2 - (n - 1) * 1.6 - 150 * i },183.6 ${ 91.2 - (n - 1) * 1.6 - 150 * i },128.5 
                  ${ 51.2 - (n - 1) * 1.6 - 150 * i },73.4 ${ 116 - (n - 1) * 1.6 - 150 * i },94.4`);
                svg.appendChild(polygon);
            }
            return `url(data:image/svg+xml;base64,${ btoa(new XMLSerializer().serializeToString(svg)) })`;
        };
        const swapNode = (list, i) => {
            const [lIndex, rIndex] = [2 * i + 1, 2 * i + 2];
            if (list[lIndex] === undefined) {
                return;
            }
            if (list[rIndex] === undefined) {
                if (list[i].cost < list[lIndex].cost) {
                    [list[i], list[lIndex]] = [list[lIndex], list[i]];
                }
                return;
            }
            [lIndex, rIndex].forEach((index) => {
                if (list[i].cost < list[index].cost) {
                    [list[i], list[index]] = [list[index], list[i]];
                    swapNode(list, index);
                }
            });
        };
        const sortOpr = () => {
            const costDict = [];
            const result = [];
            oprList.forEach((opr) => { costDict.push({ name: opr, cost: this.unitData.operator[opr].cost }); });
            while (costDict.length > 0) {
                for (let m = Math.floor(costDict.length / 2 - 1); m >= 0; m -= 1) {
                    swapNode(costDict, m);
                }
                [costDict[0], costDict[costDict.length - 1]] = [costDict[costDict.length - 1], costDict[0]];
                result.unshift(costDict.pop().name);
            }
            return result;
        };
        while (this.oprCards.childNodes.length) {
            this.oprCards.childNodes[0].remove();
        }
        const sortedOpr = sortOpr();
        sortedOpr.forEach((opr) => {
            const oprData = this.unitData.operator[opr];
            const unit = this.gameCtl.createOperator(opr, oprData);
            const atkArea = [];
            oprData.atkArea.forEach((tuple) => {
                atkArea.push(new Vector2(tuple[0], tuple[1]));
            });
            const oprNode = document.createElement('div');
            oprNode.setAttribute('id', opr);
            oprNode.dataset.class = oprData.prof;
            oprNode.style.borderBottomColor = RarityColor[Number(oprData.rarity)];
            const oprIconNode = document.createElement('div');
            oprIconNode.style.background = `
        url("${ this.matData.icons.prof[oprData.prof.toLowerCase()] }") no-repeat top left 35% / 21%,
        ${ drawStars(oprData.rarity) } no-repeat bottom right / auto 17%,
        url("${ this.matData.icons.operator[opr] }") no-repeat top left / cover`;
            const cdNode = document.createElement('div');
            const costNode = document.createElement('div');
            const costText = document.createTextNode(oprData.cost.toString());
            costNode.appendChild(costText);
            oprNode.appendChild(oprIconNode);
            oprNode.appendChild(cdNode);
            oprNode.appendChild(costNode);
            this.oprCards.appendChild(oprNode);
            const placeLayer = this.map.getOverlay(OverlayType.PlaceLayer);
            const atkLayer = this.map.getOverlay(OverlayType.AttackLayer);
            const mouseupHandler = (reset = true) => {
                if (reset) {
                    const chosenCard = document.querySelector('.chosen');
                    if (chosenCard !== null) {
                        chosenCard.classList.remove('chosen');
                    }
                }
                this.mouseLayer.style.display = '';
                this.map.hideOverlay();
                this.renderer.requestRender();
            };
            const onMousemove = () => {
                if (this.map.tracker.pointerPos !== null) {
                    this.mouseLayer.style.display = 'block';
                    const imgRect = this.mouseLayer.children[0].getBoundingClientRect();
                    this.mouseLayer.style.left = `${ this.map.tracker.pointerPos.x - imgRect.width / 2 }px`;
                    this.mouseLayer.style.top = `${ this.map.tracker.pointerPos.y - imgRect.height / 2 }px`;
                }
                this.map.trackOverlay(atkLayer, atkArea);
                this.renderer.requestRender();
            };
            const onMouseup = () => {
                if (this.map.tracker.pickPos !== null) {
                    const pos = realPosToAbsPos(this.map.tracker.pickPos, true);
                    if (placeLayer.has(pos)) {
                        this.frame.removeEventListener(this.frame.canvas, 'mousemove', onMousemove);
                        mouseupHandler(false);
                        this.map.addUnit(pos.x, pos.y, unit);
                        this.setDirection(unit);
                        return;
                    }
                }
                this.frame.removeEventListener(this.frame.canvas, 'mousemove', onMousemove);
                mouseupHandler();
            };
            this.frame.addEventListener(oprNode, 'mousedown', () => {
                oprNode.classList.add('chosen');
                placeLayer.setEnableArea(this.map.getPlaceableArea(oprData.posType));
                placeLayer.show();
                this.renderer.requestRender();
                if (oprNode.dataset.status === 'enable') {
                    const oprRes = this.matData.resources.operator[opr];
                    this.mouseLayer.children[0].setAttribute('src', oprRes.url);
                    this.frame.addEventListener(this.frame.canvas, 'mousemove', onMousemove);
                    this.frame.addEventListener(this.frame.canvas, 'mouseup', onMouseup, true);
                } else {
                    this.frame.addEventListener(this.frame.canvas, 'mouseup', () => mouseupHandler(), true);
                }
            });
            this.frame.addEventListener(oprNode, 'mouseup', () => {
                mouseupHandler();
                this.frame.removeEventListener(this.frame.canvas, 'mousemove', onMousemove);
                this.frame.removeEventListener(this.frame.canvas, 'mouseup', onMouseup);
            });
        });
    }

    updateCost() {
        this.cost = Math.floor(this.gameCtl.cost);
        const costTextNode = document.querySelector('.cost span');
        costTextNode.textContent = this.cost.toString();
    }

    withdrawOperator(opr) {
        this.map.removeUnit(opr);
        const remain = this.gameCtl.removeOperator(opr.name);
        this.bottomUI.children[1].textContent = remain.toString();
        this.updateCost();
        const oprNode = document.querySelector(`#${ opr.name }`);
        const cdNode = oprNode.children[1];
        cdNode.style.display = 'inline-block';
        cdNode.textContent = opr.rspTime.toFixed(1);
        oprNode.children[2].textContent = opr.cost.toString();
        this.hideSelectLayer();
        this.showOprCard(opr.name);
        oprNode.dataset.status = 'cd';
        this.updateCardStatus();
    }

    updateCardStatus() {
        if (this.gameCtl.ctlData.oprLimit - this.gameCtl.activeOperator.size > 0) {
            this.oprCards.childNodes.forEach((child) => {
                if (child.dataset.status !== 'cd') {
                    const opr = this.gameCtl.allOperator.get(child.id);
                    if (opr !== undefined && this.cost >= opr.cost) {
                        this.enableOprCard(child);
                    } else {
                        this.disableOprCard(child);
                    }
                }
            });
        }
    }

    hideSelectLayer() {
        this.map.hideOverlay();
        this.selectLayer.style.display = 'none';
        const overlayUI = document.querySelectorAll('.ui-overlay');
        overlayUI.forEach((child) => { child.style.display = 'none'; });
        this.renderer.requestRender();
    }

    drawSelectLayer(pos) {
        if (pos !== undefined) {
            const height = this.map.getBlock(pos).size.y;
            const realPos = absPosToRealPos(pos.x + 0.5, pos.y + 0.5);
            const normalizedSize = new Vector3(realPos.x, height, realPos.y).project(this.frame.camera);
            const centerX = (normalizedSize.x * 0.5 + 0.5) * this.frame.canvas.width;
            const centerY = (normalizedSize.y * -0.5 + 0.5) * this.frame.canvas.height;
            this.center.set(centerX, centerY);
        }
        this.ctx.clearRect(0, 0, this.selectLayer.width, this.selectLayer.height);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.selectLayer.width, this.selectLayer.height);
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 10;
        this.ctx.beginPath();
        this.ctx.arc(this.center.x, this.center.y, this.selectLayer.width * 0.1, 0, 2 * Math.PI);
        this.ctx.stroke();
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = 'blue';
        this.ctx.fill();
        this.ctx.globalCompositeOperation = 'source-over';
    }

    enableOprCard(card) {
        if (card === undefined) {
            this.oprCards.childNodes.forEach((child) => {
                child.children[0].style.filter = '';
                child.children[2].style.filter = '';
                child.dataset.status = 'enable';
            });
        } else {
            card.children[0].style.filter = '';
            card.children[2].style.filter = '';
            card.dataset.status = 'enable';
        }
    }

    disableOprCard(card) {
        if (card === undefined) {
            this.oprCards.childNodes.forEach((child) => {
                child.children[0].style.filter = 'brightness(50%)';
                child.children[2].style.filter = 'brightness(50%)';
                child.dataset.status = 'disable';
            });
        } else if (typeof card === 'string') {
            const oprNode = document.querySelector(`#${ card }`);
            if (oprNode !== null) {
                oprNode.children[0].style.filter = 'brightness(50%)';
                oprNode.children[2].style.filter = 'brightness(50%)';
                oprNode.dataset.status = 'disable';
            }
        } else {
            card.children[0].style.filter = 'brightness(50%)';
            card.children[2].style.filter = 'brightness(50%)';
            card.dataset.status = 'disable';
        }
    }

    hideOprCard(card) {
        if (this.oprCards.children.length === 1) {
            card.style.visibility = 'hidden';
        } else {
            card.style.display = 'none';
        }
    }

    showOprCard(oprName) {
        if (oprName === undefined) {
            this.oprCards.childNodes.forEach((card) => {
                card.style.visibility = '';
                card.style.display = '';
            });
        } else {
            const oprNode = document.querySelector(`#${ oprName }`);
            if (oprNode !== null) {
                oprNode.style.visibility = '';
                oprNode.style.display = '';
            }
        }
    }

    setDirection(opr) {
        const absPos = realPosToAbsPos(this.map.tracker.pickPos, true);
        const atkLayer = this.map.getOverlay(OverlayType.AttackLayer);
        atkLayer.hide();
        const aziAngle = this.frame.controls.getAzimuthalAngle();
        let newArea = [];
        const originArea = [];
        this.unitData.operator[opr.name].atkArea.forEach((tuple) => {
            originArea.push(new Vector2(tuple[0], tuple[1]));
        });
        const resizeSelectLayer = () => {
            this.selectLayer.width = this.frame.canvas.width;
            this.selectLayer.height = this.frame.canvas.height;
            this.drawSelectLayer(absPos);
        };
        const drawSelector = (e) => {
            atkLayer.hide();
            this.drawSelectLayer();
            const distX = e.clientX - this.center.x / 2;
            const distY = e.clientY - this.center.y / 2;
            const dist = Math.sqrt(distX ** 2 + distY ** 2);
            const rad = this.selectLayer.width * 0.1;
            if (dist < rad / 4) {
                this.ctx.strokeStyle = 'white';
                this.ctx.beginPath();
                this.ctx.arc(this.center.x, this.center.y, rad / 2, 0, 2 * Math.PI);
                this.ctx.stroke();
                atkLayer.hide();
            } else {
                const theta = Math.atan2(distY, distX);
                this.ctx.strokeStyle = 'gold';
                this.ctx.beginPath();
                this.ctx.arc(this.center.x, this.center.y, rad + 20, theta - Math.PI / 4, theta + Math.PI / 4);
                this.ctx.stroke();
                const tempAzi = aziAngle - 0.25 * Math.PI;
                const sinAzi = Math.sin(tempAzi) > 0;
                const cosAzi = Math.cos(tempAzi) > 0;
                const tanAzi = Math.tan(tempAzi) > 0;
                const andAzi = sinAzi && cosAzi && tanAzi;
                const tempTheta = theta - 0.25 * Math.PI;
                const sinTheta = Math.sin(tempTheta) > 0;
                const cosTheta = Math.cos(tempTheta) > 0;
                const tanTheta = Math.tan(tempTheta) > 0;
                const andTheta = sinTheta && cosTheta && tanTheta;
                const narrowBool = !andTheta && !andAzi;
                newArea = [];
                if ((andAzi && andTheta)
                  || (sinAzi && sinTheta && narrowBool)
                  || (tanAzi && tanTheta && narrowBool)
                  || (cosAzi && cosTheta && narrowBool)) {
                    opr.mesh.rotation.y = 0;
                    newArea = originArea;
                } else if ((andAzi && sinTheta)
                  || (sinAzi && tanTheta && narrowBool)
                  || (tanAzi && cosTheta && narrowBool)
                  || (cosAzi && andTheta)) {
                    opr.mesh.rotation.y = -0.5 * Math.PI;
                    originArea.forEach((area) => {
                        newArea.push(new Vector2(-area.y, area.x));
                    });
                } else if ((andAzi && tanTheta)
                  || (sinAzi && cosTheta && narrowBool)
                  || (tanAzi && andTheta)
                  || (cosAzi && sinTheta)) {
                    opr.mesh.rotation.y = Math.PI;
                    originArea.forEach((area) => {
                        newArea.push(new Vector2(-area.x, -area.y));
                    });
                } else if ((andAzi && cosTheta)
                  || (sinAzi && andTheta)
                  || (tanAzi && sinTheta)
                  || (cosAzi && tanTheta)) {
                    opr.mesh.rotation.y = 0.5 * Math.PI;
                    originArea.forEach((area) => {
                        newArea.push(new Vector2(area.y, -area.x));
                    });
                }
                atkLayer.showArea(absPos, newArea);
            }
            this.renderer.requestRender();
        };
        this.frame.addEventListener(this.selectLayer, 'click', (e) => {
            const distX = e.clientX - this.center.x / 2;
            const distY = e.clientY - this.center.y / 2;
            const dist = Math.sqrt(distX ** 2 + distY ** 2);
            const rad = this.selectLayer.width * 0.1;
            const chosenCard = document.querySelector('.chosen');
            if (chosenCard !== null) {
                chosenCard.classList.remove('chosen');
                if (dist > rad / 4) {
                    opr.atkArea = newArea;
                    this.hideOprCard(chosenCard);
                    const remain = this.gameCtl.addOperator(opr);
                    this.bottomUI.children[1].textContent = remain.toString();
                    this.updateCost();
                    if (remain === 0) {
                        this.disableOprCard();
                    } else {
                        this.updateCardStatus();
                    }
                } else {
                    this.map.removeUnit(opr);
                }
            }
            this.frame.removeEventListener(this.selectLayer, 'mousemove', drawSelector);
            this.frame.removeEventListener(window, 'resize', resizeSelectLayer);
            this.hideSelectLayer();
        }, true);
        resizeSelectLayer();
        this.frame.addEventListener(this.selectLayer, 'mousemove', drawSelector);
        this.frame.addEventListener(window, 'resize', resizeSelectLayer);
        this.selectLayer.style.display = 'block';
    }
}

export default GameUIController;
