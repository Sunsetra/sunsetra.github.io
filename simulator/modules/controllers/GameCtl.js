import { Vector2 } from '../../lib/three/build/three.module.js';
import { GameStatus } from '../../modules/others/constants.js';
import { DataError, ResourcesUnavailableError } from '../../modules/others/exceptions.js';
import Enemy from '../../modules/units/Enemy.js';
import Operator from '../../modules/units/Operator.js';

class GameController {
    constructor(map, data, timeAxisUI) {
        this.map = map;
        this.ctlData = map.data.ctlData;
        this.matData = data.materials;
        this.unitData = data.units;
        this.waves = JSON.parse(JSON.stringify(map.data.waves));
        this.timeAxisUI = timeAxisUI;
        this.lifePoint = this.ctlData.maxLP;
        this.enemyCount = this.ctlData.enemyNum;
        this.cost = this.ctlData.initCost;
        this.activeEnemy = new Set();
        this.activeOperator = new Map();
        this.allOperator = new Map();
        this.enemyId = 0;
        this.stat = GameStatus.Standby;
    }
    setStatus(newStatus) {
        this.stat = newStatus;
    }
    getStatus() {
        if (this.lifePoint === 0) {
            return GameStatus.Defeat;
        }
        if (this.enemyCount === 0) {
            return GameStatus.Victory;
        }
        return this.stat;
    }
    updateProperty(interval) {
        const newCost = this.cost + this.ctlData.costInc * interval;
        this.cost = newCost > this.ctlData.maxCost ? this.ctlData.maxCost : newCost;
        this.allOperator.forEach((opr) => {
            if (opr.rspTime > 0) {
                opr.rspTime -= interval;
            }
        });
    }
    updateEnemyStatus(axisTime) {
        if (this.waves.length) {
            const { fragments } = this.waves[0];
            const thisFrag = fragments[0];
            const { time, name, route } = thisFrag;
            if (Math.abs(axisTime[1] - time) <= 0.01 || axisTime[1] > time) {
                const enemyData = this.unitData.enemy[name];
                const enemy = this.createEnemy(name, thisFrag, enemyData);
                const { x, z } = route[0];
                this.map.addUnit(x, z, enemy);
                this.timeAxisUI.addNode(name, 'enemy', 'create');
                route.shift();
                fragments.shift();
                if (!fragments.length) {
                    this.waves.shift();
                }
            }
        }
    }
    updateEnemyPosition(interval) {
        this.activeEnemy.forEach((frag) => {
            const { route, name, inst } = frag;
            if (inst === undefined) {
                throw new DataError(`未找到${ name }单位实例:`, frag);
            } else if (route.length) {
                if ('pause' in route[0]) {
                    if (frag.pause === undefined) {
                        frag.pause = route[0].pause - interval;
                    } else {
                        frag.pause -= interval;
                        if (frag.pause <= 0) {
                            route.shift();
                            delete frag.pause;
                        }
                    }
                } else {
                    const oldX = inst.position.x;
                    const oldZ = inst.position.y;
                    const newX = route[0].x + 0.5;
                    const newZ = route[0].z + 0.5;
                    const moveSpd = inst.moveSpd * this.ctlData.moveSpdMulti;
                    let velocityX = moveSpd / Math.sqrt(((newZ - oldZ) / (newX - oldX)) ** 2 + 1);
                    velocityX = newX >= oldX ? velocityX : -velocityX;
                    let velocityZ = Math.abs(((newZ - oldZ) / (newX - oldX)) * velocityX);
                    velocityZ = newZ >= oldZ ? velocityZ : -velocityZ;
                    const stepX = interval * velocityX + oldX;
                    const stepZ = interval * velocityZ + oldZ;
                    inst.position = new Vector2(stepX, stepZ);
                    const rotateDeg = Math.atan((newZ - oldZ) / (newX - oldX));
                    inst.mesh.rotation.y = Math.PI - rotateDeg;
                    const ifDeltaX = Math.abs(newX - stepX) <= Math.abs(interval * velocityX);
                    const ifDeltaZ = Math.abs(newZ - stepZ) <= Math.abs(interval * velocityZ);
                    if (ifDeltaX && ifDeltaZ) {
                        route.shift();
                    }
                }
            } else {
                this.lifePoint -= 1;
                this.map.removeUnit(inst);
                this.activeEnemy.delete(frag);
                this.enemyCount -= 1;
                this.timeAxisUI.addNode(name, 'enemy', 'leave');
            }
        });
    }
    reset() {
        this.activeEnemy.forEach((enemy) => {
            this.map.removeUnit(enemy.inst);
        });
        this.activeEnemy.clear();
        this.activeOperator.forEach((opr) => {
            this.map.removeUnit(opr);
            this.allOperator.set(opr.name, opr);
        });
        this.activeOperator.clear();
        this.allOperator.forEach((opr) => {
            opr.cost = this.unitData.operator[opr.name].cost;
            opr.rspTime = 0;
            opr.trackData.withdrawCnt = 0;
            this.map.removeUnit(opr);
        });
        this.enemyCount = this.ctlData.enemyNum;
        this.lifePoint = this.ctlData.maxLP;
        this.cost = this.ctlData.initCost;
        this.waves = JSON.parse(JSON.stringify(this.map.data.waves));
    }
    createEnemy(name, frag, data) {
        const { sizeAlpha, entity } = this.matData.resources.enemy[name];
        if (entity === undefined) {
            throw new ResourcesUnavailableError(`未找到${ name }单位实体:`, this.matData.resources.enemy[name]);
        }
        const enemy = new Enemy(entity.clone(), sizeAlpha, data);
        const wrapper = Object.defineProperties(frag, {
            id: { value: this.enemyId, enumerable: true },
            inst: { value: enemy, enumerable: true },
        });
        this.activeEnemy.add(wrapper);
        this.enemyId += 1;
        return enemy;
    }
    createOperator(name, data) {
        const { sizeAlpha, entity } = this.matData.resources.operator[name];
        if (entity === undefined) {
            throw new ResourcesUnavailableError(`未找到${ name }单位实体:`, this.matData.resources.operator[name]);
        }
        const opr = new Operator(entity.clone(), sizeAlpha, data);
        this.allOperator.set(name, opr);
        return opr;
    }
    addOperator(opr) {
        this.cost -= opr.cost;
        const inst = this.allOperator.get(opr.name);
        if (inst !== undefined) {
            this.activeOperator.set(inst.name, inst);
            this.allOperator.delete(opr.name);
            this.timeAxisUI.addNode(opr.name, 'operator', 'create');
        }
        return this.ctlData.oprLimit - this.activeOperator.size;
    }
    removeOperator(opr) {
        const oprInst = this.activeOperator.get(opr);
        if (oprInst !== undefined) {
            oprInst.rspTime = this.unitData.operator[opr].rspTime;
            const { cost } = this.unitData.operator[opr];
            const newCost = this.cost + Math.floor(oprInst.cost / 2);
            this.cost = newCost > this.ctlData.maxCost ? this.ctlData.maxCost : newCost;
            if (oprInst.trackData.withdrawCnt === 0) {
                oprInst.cost = Math.floor(cost * 1.5);
            } else if (oprInst.trackData.withdrawCnt === 1) {
                oprInst.cost = cost * 2;
            }
            oprInst.trackData.withdrawCnt += 1;
            this.activeOperator.delete(opr);
            this.allOperator.set(opr, oprInst);
            this.timeAxisUI.addNode(opr, 'operator', 'leave');
        }
        return this.ctlData.oprLimit - this.activeOperator.size;
    }
}
export default GameController;
