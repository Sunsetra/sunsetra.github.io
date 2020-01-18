import { Vector2 } from '../../lib/three/build/three.module.js';
import Enemies from '../../modules/enemies/EnemyClassList.js';
import { disposeResources } from '../../modules/others/utils.js';

class GameController {
    constructor(map, scene, resList, timeAxisUI) {
        this.map = map;
        this.scene = scene;
        this.resList = resList;
        this.timeAxisUI = timeAxisUI;
        this.enemyCount = map.data.enemyNum;
        this.waves = JSON.parse(JSON.stringify(map.data.waves));
        this.activeEnemy = new Set();
        this.enemyId = 0;
    }

    updateEnemyStatus(axisTime) {
        if (this.waves.length) {
            const { fragments } = this.waves[0];
            const thisFrag = fragments[0];
            const { time, name, path } = thisFrag;
            if (Math.abs(axisTime[1] - time) <= 0.01 || axisTime[1] > time) {
                const enemy = this.createEnemy(name, thisFrag);
                if (enemy !== null) {
                    const { x, z } = path[0];
                    const thisBlock = this.map.getBlock(z, x);
                    if (thisBlock !== null && thisBlock.size !== undefined) {
                        const y = thisBlock.size.y + enemy.height / 2;
                        enemy.setY(y);
                        enemy.position = new Vector2(x, z);
                    }
                    const nodeType = 'enemy create';
                    const nodeId = `${ name }-${ thisFrag.id }`;
                    const resUrl = this.resList.enemy[name].url;
                    this.timeAxisUI.createAxisNode(nodeType, nodeId, resUrl, axisTime);
                    path.shift();
                    fragments.shift();
                    if (!fragments.length) {
                        this.waves.shift();
                    }
                }
            }
        }
    }

    updateEnemyPosition(interval, currentTime) {
        this.activeEnemy.forEach((frag) => {
            const { path, name, inst } = frag;
            if (inst !== undefined) {
                if (path.length) {
                    if ('pause' in path[0]) {
                        if (typeof frag.pause === 'undefined') {
                            frag.pause = path[0].pause - interval;
                        } else {
                            frag.pause -= interval;
                            if (frag.pause <= 0) {
                                path.shift();
                                delete frag.pause;
                            }
                        }
                    } else {
                        const oldX = inst.position.x;
                        const oldZ = inst.position.y;
                        const newX = path[0].x;
                        const newZ = path[0].z;
                        let velocityX = inst.speed / Math.sqrt(((newZ - oldZ) / (newX - oldX)) ** 2 + 1);
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
                            path.shift();
                        }
                    }
                } else {
                    this.scene.remove(inst.mesh);
                    disposeResources(inst.mesh);
                    const nodeType = 'enemy drop';
                    const nodeId = `${ name }-${ frag.id }`;
                    const resUrl = this.resList.enemy[name].url;
                    this.timeAxisUI.createAxisNode(nodeType, nodeId, resUrl, currentTime);
                    this.activeEnemy.delete(frag);
                    this.enemyCount -= 1;
                }
            }
        });
    }

    resetGame() {
        this.activeEnemy.forEach((enemy) => {
            if (enemy.inst !== undefined) {
                this.scene.remove(enemy.inst.mesh);
                this.activeEnemy.delete(enemy);
            }
        });
        this.enemyCount = this.map.data.enemyNum;
        this.waves = JSON.parse(JSON.stringify(this.map.data.waves));
    }

    createEnemy(name, enemyFrag) {
        const mesh = this.resList.enemy[name].entity;
        if (mesh === undefined) {
            return null;
        }
        const enemy = new Enemies[name](mesh.clone());
        Object.defineProperties(enemyFrag, {
            id: { value: this.enemyId, enumerable: true },
            inst: { value: enemy, enumerable: true },
        });
        this.enemyId += 1;
        this.activeEnemy.add(enemyFrag);
        this.scene.add(enemy.mesh);
        return enemy;
    }
}

export default GameController;
