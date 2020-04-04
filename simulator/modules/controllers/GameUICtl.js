import { Vector2, Vector3 } from '../../lib/three/build/three.module.js';
import { OverlayType, RarityColor, RenderType } from '../../modules/others/constants.js';
import { absPosToRealPos, addEvListener, realPosToAbsPos, removeEvListener } from '../../modules/others/utils.js';

class GameUIController {
    constructor(frame, map, gameCtl, renderer, data) {
        this.frame = frame;
        this.map = map;
        this.renderer = renderer;
        this.gameCtl = gameCtl;
        this.matData = data.materials;
        this.unitData = data.units;
        this.cost = Math.floor(gameCtl.cost);
        this.center = new Vector2(0, 0);
        this.cdOpr = new Map();
        this.dpr = this.frame.renderer.getPixelRatio();
        this.oprCards = document.querySelector('.operator-cards');
        this.selectLayer = document.querySelector('.select-overlay');
        this.selectCtx = this.selectLayer.getContext('2d');
        this.selectCtx.scale(this.dpr, this.dpr);
        this.costCounter = document.querySelector('.cost-counter');
        this.costCounterCtx = this.costCounter.getContext('2d');
        this.costCounterCtx.scale(this.dpr, this.dpr);
        this.costBar = document.querySelector('.cost-bar');
        this.costBarCtx = this.costBar.getContext('2d');
        this.costBarCtx.scale(this.dpr, this.dpr);
        this.oprCounter = document.querySelector('.operator-counter canvas');
        this.oprCounterCtx = this.oprCounter.getContext('2d');
        this.oprCounterCtx.scale(this.dpr, this.dpr);
        addEvListener(window, 'resize', () => {
            const costRect = this.costCounter.getBoundingClientRect();
            this.costCounter.width = costRect.width * this.dpr;
            this.costCounter.height = costRect.height * this.dpr;
            this.costCounterCtx.textAlign = 'center';
            this.costCounterCtx.textBaseline = 'middle';
            this.costCounterCtx.fillStyle = 'white';
            this.costCounterCtx.font = `${ this.costCounter.height }px sans-serif`;
            const barRect = this.costBar.getBoundingClientRect();
            this.costBar.width = barRect.width * this.dpr;
            this.costBar.height = barRect.height * this.dpr;
            this.costBarCtx.lineWidth = this.costBar.height;
            const gradient = this.costBarCtx.createLinearGradient(0, 0, 0, this.costBar.height);
            gradient.addColorStop(0, 'dimgrey');
            gradient.addColorStop(0.25, 'white');
            gradient.addColorStop(0.75, 'white');
            gradient.addColorStop(1, 'dimgrey');
            this.costBarCtx.strokeStyle = gradient;
            const oprCounterRect = this.oprCounter.getBoundingClientRect();
            this.oprCounter.width = oprCounterRect.width * this.dpr;
            this.oprCounter.height = oprCounterRect.height * this.dpr;
            this.oprCounterCtx.fillStyle = 'white';
            this.oprCounterCtx.textBaseline = 'middle';
            this.oprCounterCtx.font = `${ this.oprCounter.height }px sans-serif`;
            this.oprCards.childNodes.forEach((card) => {
                const cdNode = card.querySelector('canvas');
                const cdRect = cdNode.getBoundingClientRect();
                cdNode.width = cdRect.width * this.dpr;
                cdNode.height = cdRect.height * this.dpr;
                const cdCtx = cdNode.getContext('2d');
                cdCtx.fillStyle = 'white';
                cdCtx.textBaseline = 'middle';
                cdCtx.textAlign = 'center';
                cdCtx.font = `${ cdNode.height / 3 }px sans-serif`;
            });
            this.updateCost();
            this.drawCostBar(this.gameCtl.cost - this.cost);
            this.drawOprCount(this.gameCtl.ctlData.oprLimit - this.cdOpr.size);
            this.updateOprCD();
        });
        let selectedOpr;
        let clickPos;
        let absPos = new Vector2();
        const withdrawNode = document.querySelector('.ui-overlay#withdraw');
        const resizeSelectLayer = () => {
            const selectLayerRect = this.selectLayer.getBoundingClientRect();
            this.selectLayer.width = selectLayerRect.width * this.dpr;
            this.selectLayer.height = selectLayerRect.height * this.dpr;
            this.drawSelectLayer(absPos);
            const rad = this.selectLayer.width * 0.1;
            const delta = rad / Math.sqrt(2) / 2;
            withdrawNode.style.left = `${ this.center.x / this.dpr - delta }px`;
            withdrawNode.style.top = `${ this.center.y / this.dpr - delta }px`;
        };
        addEvListener(withdrawNode, 'click', () => {
            this.withdrawOperator(selectedOpr);
            removeEvListener(this.selectLayer, 'click');
            removeEvListener(window, 'resize', resizeSelectLayer);
        });
        addEvListener(this.frame.canvas, 'mousedown', () => { clickPos = this.map.tracker.pickPos; });
        addEvListener(this.frame.canvas, 'mouseup', () => {
            const { pickPos } = this.map.tracker;
            if (pickPos !== null && clickPos === pickPos) {
                absPos = realPosToAbsPos(pickPos, true);
                if (this.map.getBlock(absPos) !== null) {
                    this.gameCtl.activeOperator.forEach((opr) => {
                        if (absPos.equals(opr.position.floor())) {
                            selectedOpr = opr;
                            this.selectLayer.style.display = 'block';
                            withdrawNode.style.display = 'block';
                            resizeSelectLayer();
                            const atkLayer = this.map.getOverlay(OverlayType.AttackLayer);
                            atkLayer.showArea(absPos, opr.atkArea);
                            if (this.frame.status.renderType !== RenderType.DynamicRender) {
                                this.renderer.requestRender();
                            }
                            addEvListener(this.selectLayer, 'click', () => {
                                removeEvListener(window, 'resize', resizeSelectLayer);
                                this.hideSelectLayer();
                            }, true);
                            addEvListener(window, 'resize', resizeSelectLayer);
                        }
                    });
                }
            }
        });
    }
    reset() {
        this.updateCost();
        this.drawCostBar(0, true);
        this.drawOprCount(this.gameCtl.ctlData.oprLimit);
        this.updateOprCD(true);
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
        const scale = this.gameCtl.cost - intCost;
        if (intCost === this.cost) {
            this.drawCostBar(scale);
        } else {
            this.updateCost();
            this.updateCardStatus();
            this.drawCostBar(scale, true);
        }
        this.updateOprCD();
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
        sortOpr().forEach((opr) => {
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
            const cdNode = document.createElement('canvas');
            cdNode.getContext('2d').scale(this.dpr, this.dpr);
            const costNode = document.createElement('div');
            const costText = document.createTextNode(oprData.cost.toString());
            costNode.appendChild(costText);
            oprNode.appendChild(oprIconNode);
            oprNode.appendChild(cdNode);
            oprNode.appendChild(costNode);
            this.oprCards.appendChild(oprNode);
            const placeLayer = this.map.getOverlay(OverlayType.PlaceLayer);
            const atkLayer = this.map.getOverlay(OverlayType.AttackLayer);
            const oprImg = new Image();
            oprImg.addEventListener('load', () => {
                const alpha = Math.max(this.selectLayer.width, this.selectLayer.height) * 0.0003;
                oprImg.width = oprImg.naturalWidth * alpha;
                oprImg.height = oprImg.naturalHeight * alpha;
            });
            const mouseupHandler = (reset = true) => {
                if (reset) {
                    const chosenCard = document.querySelector('.chosen');
                    if (chosenCard !== null) {
                        chosenCard.classList.remove('chosen');
                    }
                }
                this.selectLayer.style.display = '';
                this.selectLayer.style.pointerEvents = '';
                this.map.hideOverlay();
                if (this.frame.status.renderType !== RenderType.DynamicRender) {
                    this.renderer.requestRender();
                }
            };
            const onMousemove = () => {
                if (this.map.tracker.pointerPos !== null) {
                    const { x, y } = this.map.tracker.pointerPos;
                    const posX = x * this.dpr - oprImg.width / 2;
                    const posY = y * this.dpr - oprImg.height / 2;
                    this.selectCtx.clearRect(0, 0, this.selectLayer.width, this.selectLayer.height);
                    this.selectCtx.drawImage(oprImg, posX, posY, oprImg.width, oprImg.height);
                }
                this.map.trackOverlay(atkLayer, atkArea);
                if (this.frame.status.renderType !== RenderType.DynamicRender) {
                    this.renderer.requestRender();
                }
            };
            const onMouseup = () => {
                if (this.map.tracker.pickPos !== null) {
                    const pos = realPosToAbsPos(this.map.tracker.pickPos, true);
                    if (placeLayer.has(pos)) {
                        removeEvListener(this.frame.canvas, 'mousemove', onMousemove);
                        mouseupHandler(false);
                        this.map.addUnit(pos.x, pos.y, unit);
                        this.setDirection(unit);
                        return;
                    }
                }
                removeEvListener(this.frame.canvas, 'mousemove', onMousemove);
                mouseupHandler();
            };
            addEvListener(oprNode, 'mousedown', () => {
                oprNode.classList.add('chosen');
                placeLayer.setEnableArea(this.map.getPlaceableArea(oprData.posType));
                placeLayer.show();
                if (this.frame.status.renderType !== RenderType.DynamicRender) {
                    this.renderer.requestRender();
                }
                if (oprNode.dataset.status === 'enable') {
                    this.selectCtx.clearRect(0, 0, this.selectLayer.width, this.selectLayer.height);
                    this.selectLayer.style.display = 'block';
                    this.selectLayer.style.pointerEvents = 'none';
                    const selectLayerRect = this.selectLayer.getBoundingClientRect();
                    this.selectLayer.width = selectLayerRect.width * this.dpr;
                    this.selectLayer.height = selectLayerRect.height * this.dpr;
                    oprImg.src = this.matData.resources.operator[opr].url;
                    addEvListener(this.frame.canvas, 'mousemove', onMousemove);
                    addEvListener(this.frame.canvas, 'mouseup', onMouseup, true);
                } else {
                    addEvListener(this.frame.canvas, 'mouseup', () => mouseupHandler(), true);
                }
            });
            addEvListener(oprNode, 'mouseup', () => {
                mouseupHandler();
                removeEvListener(this.frame.canvas, 'mousemove', onMousemove);
                removeEvListener(this.frame.canvas, 'mouseup', onMouseup);
            });
        });
    }

    updateCost() {
        this.cost = Math.floor(this.gameCtl.cost);
        const { width, height } = this.costCounter;
        this.costCounterCtx.clearRect(0, 0, width, height);
        this.costCounterCtx.fillText(this.cost.toString(), width / 2, height / 1.5);
    }

    drawCostBar(pct, isClear = false) {
        const { width, height } = this.costBar;
        if (isClear) {
            this.costBarCtx.clearRect(0, 0, width, height);
            this.costBarCtx.beginPath();
        }
        this.costBarCtx.moveTo(0, height / 2);
        this.costBarCtx.lineTo(width * pct, height / 2);
        this.costBarCtx.stroke();
    }

    drawOprCount(num) {
        const count = typeof num === 'number' ? num.toString() : num;
        const { width, height } = this.oprCounter;
        this.oprCounterCtx.clearRect(0, 0, width, height);
        this.oprCounterCtx.fillText(count, 0, height / 1.5);
    }

    updateCardStatus() {
        if (this.gameCtl.ctlData.oprLimit - this.gameCtl.activeOperator.size > 0) {
            this.oprCards.childNodes.forEach((child) => {
                if (!this.cdOpr.has(child)) {
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

    updateOprCD(clearAll = false) {
        this.cdOpr.forEach((card, key) => {
            const [node, ctx, opr] = card;
            const { width, height } = node;
            ctx.clearRect(0, 0, width, height);
            if (opr.rspTime > 0 && !clearAll) {
                ctx.fillText(opr.rspTime.toFixed(1), width / 2, height / 2);
            } else {
                if (this.cost >= opr.cost) {
                    this.enableOprCard(key);
                } else {
                    this.disableOprCard(key);
                }
                this.cdOpr.delete(key);
            }
        });
    }

    withdrawOperator(opr) {
        this.map.removeUnit(opr);
        const remain = this.gameCtl.removeOperator(opr.name);
        this.drawOprCount(remain);
        this.updateCost();
        const oprNode = document.querySelector(`#${ opr.name }`);
        const canvas = oprNode.querySelector('canvas');
        const ctx = canvas.getContext('2d');
        this.cdOpr.set(oprNode, [canvas, ctx, opr]);
        oprNode.children[2].textContent = opr.cost.toString();
        this.hideSelectLayer();
        this.showOprCard(opr.name);
        this.updateCardStatus();
        this.updateOprCD();
    }
    hideSelectLayer() {
        this.map.hideOverlay();
        this.selectLayer.style.display = 'none';
        const overlayUI = document.querySelectorAll('.ui-overlay');
        overlayUI.forEach((child) => { child.style.display = 'none'; });
        if (this.frame.status.renderType !== RenderType.DynamicRender) {
            this.renderer.requestRender();
        }
    }
    drawSelectLayer(pos) {
        const { width, height } = this.selectLayer;
        if (pos !== undefined) {
            const bHeight = this.map.getBlock(pos).size.y;
            const realPos = absPosToRealPos(pos.x + 0.5, pos.y + 0.5);
            const normalizedSize = new Vector3(realPos.x, bHeight, realPos.y).project(this.frame.camera);
            const centerX = (normalizedSize.x * 0.5 + 0.5) * this.frame.canvas.width;
            const centerY = (normalizedSize.y * -0.5 + 0.5) * this.frame.canvas.height;
            this.center.set(centerX, centerY);
        }
        this.selectCtx.clearRect(0, 0, width, height);
        this.selectCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.selectCtx.fillRect(0, 0, width, height);
        this.selectCtx.strokeStyle = 'white';
        this.selectCtx.lineWidth = 10;
        this.selectCtx.beginPath();
        this.selectCtx.arc(this.center.x, this.center.y, width * 0.1, 0, 2 * Math.PI);
        this.selectCtx.stroke();
        this.selectCtx.globalCompositeOperation = 'destination-out';
        this.selectCtx.fillStyle = 'blue';
        this.selectCtx.fill();
        this.selectCtx.globalCompositeOperation = 'source-over';
    }
    enableOprCard(card) {
        if (card === undefined) {
            this.oprCards.childNodes.forEach((child) => {
                child.children[0].style.filter = 'brightness(100%)';
                child.children[2].style.filter = 'brightness(100%)';
                child.dataset.status = 'enable';
            });
        } else {
            card.children[0].style.filter = 'brightness(100%)';
            card.children[2].style.filter = 'brightness(100%)';
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
            const selectLayerRect = this.selectLayer.getBoundingClientRect();
            this.selectLayer.width = selectLayerRect.width * this.dpr;
            this.selectLayer.height = selectLayerRect.height * this.dpr;
            this.drawSelectLayer(absPos);
        };
        const drawSelector = (e) => {
            atkLayer.hide();
            this.drawSelectLayer();
            const distX = e.clientX - this.center.x / this.dpr;
            const distY = e.clientY - this.center.y / this.dpr;
            const dist = Math.sqrt(distX ** 2 + distY ** 2);
            const diam = this.selectLayer.width * 0.1;
            if (dist < diam / 4) {
                this.selectCtx.strokeStyle = 'white';
                this.selectCtx.beginPath();
                this.selectCtx.arc(this.center.x, this.center.y, diam / 2, 0, 2 * Math.PI);
                this.selectCtx.stroke();
                atkLayer.hide();
            } else {
                const theta = Math.atan2(distY, distX);
                this.selectCtx.strokeStyle = 'gold';
                this.selectCtx.beginPath();
                this.selectCtx.arc(this.center.x, this.center.y, diam + 20, theta - Math.PI / 4, theta + Math.PI / 4);
                this.selectCtx.stroke();
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
            if (this.frame.status.renderType !== RenderType.DynamicRender) {
                this.renderer.requestRender();
            }
        };
        addEvListener(this.selectLayer, 'click', (e) => {
            const distX = e.clientX - this.center.x / this.dpr;
            const distY = e.clientY - this.center.y / this.dpr;
            const dist = Math.sqrt(distX ** 2 + distY ** 2);
            const diam = this.selectLayer.width * 0.1;
            const chosenCard = document.querySelector('.chosen');
            if (chosenCard !== null) {
                chosenCard.classList.remove('chosen');
                if (dist > diam / 4) {
                    opr.atkArea = newArea;
                    this.hideOprCard(chosenCard);
                    const remain = this.gameCtl.addOperator(opr);
                    this.drawOprCount(remain);
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
            removeEvListener(this.selectLayer, 'mousemove', drawSelector);
            removeEvListener(window, 'resize', resizeSelectLayer);
            this.hideSelectLayer();
        }, true);
        this.selectLayer.style.display = 'block';
        resizeSelectLayer();
        addEvListener(this.selectLayer, 'mousemove', drawSelector);
        addEvListener(window, 'resize', resizeSelectLayer);
    }
}
export default GameUIController;
