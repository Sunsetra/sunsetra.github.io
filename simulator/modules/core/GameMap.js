import {
    BufferAttribute,
    BufferGeometry,
    Color,
    Fog,
    Material,
    MathUtils,
    Mesh,
    MeshBasicMaterial,
    PlaneBufferGeometry,
    Vector2,
    Vector3,
} from '../../lib/three/build/three.module.js';
import Building from '../buildings/Building.js';
import Decoration from '../buildings/Decoration.js';
import { BlockType, BlockUnit, OverlayType } from '../others/constants.js';
import { BlockInfoError, BuildingInfoError, ResourcesUnavailableError } from '../others/exceptions.js';
import { disposeResources, realPosToAbsPos } from '../others/utils.js';
import Operator from '../units/Operator.js';
import Overlay from './Overlay.js';
import Tracker from './Tracker.js';

class GameMap {
    constructor(frame, data, resList) {
        this.frame = frame;
        this.data = data;
        this.resList = resList;
        this.name = data.name;
        this.width = data.mapWidth;
        this.height = data.mapHeight;
        this.blockData = new Array(this.width * this.height).fill(null);
        const blockInfo = JSON.parse(JSON.stringify(data.blockInfo));
        blockInfo.forEach((info) => {
            const { x, z, heightAlpha } = info;
            delete info.buildingInfo;
            const index = z * this.width + x;
            const blockSize = new Vector3(BlockUnit, heightAlpha * BlockUnit, BlockUnit);
            this.blockData[index] = info;
            Object.defineProperty(this.blockData[index], 'size', {
                value: blockSize,
                writable: true,
                enumerable: true,
            });
        });
        {
            const positions = [];
            const normals = [];
            const indices = [];
            const uvs = [];
            const sideGroup = [];
            const faces = [
                {
                    normal: [-1, 0, 0],
                    corners: [
                        { pos: [0, 1, 0], uv: [0, 1] },
                        { pos: [0, 0, 0], uv: [0, 0] },
                        { pos: [0, 1, 1], uv: [1, 1] },
                        { pos: [0, 0, 1], uv: [1, 0] },
                    ],
                },
                {
                    normal: [1, 0, 0],
                    corners: [
                        { pos: [1, 1, 1], uv: [0, 1] },
                        { pos: [1, 0, 1], uv: [0, 0] },
                        { pos: [1, 1, 0], uv: [1, 1] },
                        { pos: [1, 0, 0], uv: [1, 0] },
                    ],
                },
                {
                    normal: [0, 0, -1],
                    corners: [
                        { pos: [1, 0, 0], uv: [0, 0] },
                        { pos: [0, 0, 0], uv: [1, 0] },
                        { pos: [1, 1, 0], uv: [0, 1] },
                        { pos: [0, 1, 0], uv: [1, 1] },
                    ],
                },
                {
                    normal: [0, 0, 1],
                    corners: [
                        { pos: [0, 0, 1], uv: [0, 0] },
                        { pos: [1, 0, 1], uv: [1, 0] },
                        { pos: [0, 1, 1], uv: [0, 1] },
                        { pos: [1, 1, 1], uv: [1, 1] },
                    ],
                },
                {
                    normal: [0, -1, 0],
                    corners: [
                        { pos: [1, 0, 1], uv: [1, 0] },
                        { pos: [0, 0, 1], uv: [0, 0] },
                        { pos: [1, 0, 0], uv: [1, 1] },
                        { pos: [0, 0, 0], uv: [0, 1] },
                    ],
                },
                {
                    normal: [0, 1, 0],
                    corners: [
                        { pos: [0, 1, 1], uv: [1, 1] },
                        { pos: [1, 1, 1], uv: [0, 1] },
                        { pos: [0, 1, 0], uv: [1, 0] },
                        { pos: [1, 1, 0], uv: [0, 0] },
                    ],
                },
            ];
            let start = 0;
            let count = 0;
            for (let zNum = 0; zNum < this.height; zNum += 1) {
                for (let xNum = 0; xNum < this.width; xNum += 1) {
                    const thisBlock = this.getBlock(xNum, zNum);
                    if (thisBlock === null) {
                        sideGroup.push([0, 0]);
                    } else {
                        const thisHeight = thisBlock.heightAlpha;
                        faces.forEach(({ corners, normal }) => {
                            const sideBlock = this.getBlock(xNum + normal[0], zNum + normal[2]);
                            const sideHeight = sideBlock ? sideBlock.heightAlpha : 0;
                            if (thisHeight - sideHeight > 0 || normal[1]) {
                                const ndx = positions.length / 3;
                                corners.forEach(({ pos, uv }) => {
                                    const x = pos[0] * BlockUnit;
                                    const y = pos[1] * thisHeight * BlockUnit;
                                    const z = pos[2] * BlockUnit;
                                    positions.push(x + xNum * BlockUnit, y, z + zNum * BlockUnit);
                                    normals.push(...normal);
                                    uvs.push(...uv);
                                });
                                indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3);
                            }
                        });
                        count = indices.length - 12 - start;
                        sideGroup.push([start, count]);
                        start = indices.length;
                    }
                }
            }
            const mapGeo = new BufferGeometry();
            mapGeo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
            mapGeo.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
            mapGeo.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
            mapGeo.setIndex(indices);
            const matList = [];
            const matMap = {};
            data.resources.block.forEach((type) => {
                const res = resList.block[type];
                if (res.mat && res.mat instanceof Material) {
                    matList.push(res.mat);
                    matMap[type] = matList.length - 1;
                } else {
                    throw new ResourcesUnavailableError('材质资源不存在', res);
                }
            });
            this.blockData.forEach((item, ndx) => {
                if (item !== null) {
                    const { texture } = item;
                    const top = texture.top ? texture.top : 'topDefault';
                    const side = texture.side ? texture.side : 'sideDefault';
                    const bottom = texture.bottom ? texture.bottom : 'bottomDefault';
                    const [s, c] = sideGroup[ndx];
                    mapGeo.addGroup(s + c + 6, 6, matMap[top]);
                    mapGeo.addGroup(s + c, 6, matMap[bottom]);
                    if (count) {
                        mapGeo.addGroup(s, c, matMap[side]);
                    }
                }
            });
            this.mesh = new Mesh(mapGeo, matList);
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
        }
        {
            const maxSize = Math.max(this.width, this.height) * BlockUnit;
            const centerX = (this.width * BlockUnit) / 2;
            const centerZ = (this.height * BlockUnit) / 2;
            const { scene, camera, controls, lights } = this.frame;
            scene.fog = new Fog(0x0, maxSize, maxSize * 2);
            camera.far = maxSize * 2;
            camera.position.set(centerX, centerZ * 3, centerZ * 3);
            camera.updateProjectionMatrix();
            controls.target.set(centerX, 0, centerZ);
            controls.minDistance = maxSize / 1.5;
            controls.maxDistance = maxSize * 1.5;
            this.data.blockInfo.forEach((item) => {
                if (item !== null && item.buildingInfo) {
                    const { x, z } = item;
                    this.removeBuilding(x, z);
                    this.bindBuilding(x, z, item.buildingInfo);
                }
            });
            {
                const { envIntensity, envColor, color, intensity, hour, phi } = this.data.light;
                lights.envLight.color = new Color(envColor);
                lights.envLight.intensity = envIntensity;
                lights.sunLight.color = new Color(color);
                lights.sunLight.intensity = intensity;
                let mapHour = hour || new Date().getHours();
                if (mapHour < 6 || mapHour > 18) {
                    mapHour = mapHour < 6 ? mapHour + 12 : mapHour % 12;
                    lights.sunLight.intensity = 0.6;
                    lights.sunLight.color.set(0xffffff);
                    lights.envLight.color.set(0x5C6C7C);
                }
                const randomDeg = Math.floor(Math.random() * 360) + 1;
                const mapPhi = phi || randomDeg;
                const lightRad = maxSize;
                const theta = 140 - mapHour * 12;
                const cosTheta = Math.cos(MathUtils.degToRad(theta));
                const sinTheta = Math.sin(MathUtils.degToRad(theta));
                const cosPhi = Math.cos(MathUtils.degToRad(mapPhi));
                const sinPhi = Math.sin(MathUtils.degToRad(mapPhi));
                const lightPosX = lightRad * sinTheta * cosPhi + centerX;
                const lightPosY = lightRad * cosTheta;
                const lightPosZ = lightRad * sinTheta * sinPhi + centerZ;
                lights.sunLight.position.set(lightPosX, lightPosY, lightPosZ);
                lights.sunLight.target.position.set(centerX, 0, centerZ);
                lights.sunLight.target.updateWorldMatrix(false, true);
                lights.sunLight.castShadow = true;
                lights.sunLight.shadow.camera.left = -maxSize / 2;
                lights.sunLight.shadow.camera.right = maxSize / 2;
                lights.sunLight.shadow.camera.top = maxSize / 2;
                lights.sunLight.shadow.camera.bottom = -maxSize / 2;
                lights.sunLight.shadow.camera.near = maxSize / 2;
                lights.sunLight.shadow.camera.far = maxSize * 1.5;
                lights.sunLight.shadow.bias = 0.0001;
                lights.sunLight.shadow.mapSize.set(4096, 4096);
                lights.sunLight.shadow.camera.updateProjectionMatrix();
            }
            scene.add(this.mesh);
            scene.add(lights.envLight);
            scene.add(lights.sunLight);
            scene.add(lights.sunLight.target);
        }
        this.tracker = new Tracker(frame, this.mesh);
        this.overlay = new Map();
        const placeLayer = this.addOverlay(OverlayType.PlaceLayer);
        placeLayer.setOverlayStyle('green');
        const attackLayer = this.addOverlay(OverlayType.AttackLayer, placeLayer);
        attackLayer.setOverlayStyle('red');
        attackLayer.setEnableArea(this.getPlaceableArea());
    }
    getBlock(x, z) {
        if (x instanceof Vector2) {
            const verifyRow = Math.floor(x.x / this.width);
            const verifyColumn = Math.floor(x.y / this.height);
            if (verifyRow || verifyColumn) {
                return null;
            }
            return this.blockData[x.y * this.width + x.x];
        }
        if (typeof z === 'number') {
            const verifyRow = Math.floor(x / this.width);
            const verifyColumn = Math.floor(z / this.height);
            if (verifyRow || verifyColumn) {
                return null;
            }
            return this.blockData[z * this.width + x];
        }
        return null;
    }
    getBlocks() { return this.blockData; }
    getPlaceableArea(type) {
        const area = [];
        this.blockData.forEach((block) => {
            if (block !== null) {
                if (type === undefined
                  || (block.placeable && (type === block.blockType || type === BlockType.PlaceableBlock))) {
                    area.push(new Vector2(block.x, block.z));
                }
            }
        });
        return area;
    }
    addUnit(x, z, unit) {
        const thisBlock = this.getBlock(x, z);
        if (thisBlock !== null) {
            const y = thisBlock.size.y + unit.height / 2;
            unit.setY(y);
            unit.position = new Vector2(x + 0.5, z + 0.5);
            this.frame.scene.add(unit.mesh);
            if (unit instanceof Operator) {
                thisBlock.placeable = false;
            }
        }
    }
    bindBuilding(x, z, info) {
        const block = this.getBlock(x, z);
        if (block === null) {
            return;
        }
        const { entity } = this.resList.model[info.desc];
        if (entity === undefined) {
            throw new ResourcesUnavailableError('目标建筑实体未创建', this.resList.model[info.desc]);
        }
        const xSpan = info.xSpan ? info.xSpan : 1;
        const zSpan = info.zSpan ? info.zSpan : 1;
        for (let xNum = 0; xNum < xSpan; xNum += 1) {
            for (let zNum = 0; zNum < zSpan; zNum += 1) {
                const thisBlock = this.getBlock(xNum + x, zNum + z);
                if (thisBlock !== null && Object.prototype.hasOwnProperty.call(thisBlock, 'buildingInfo')) {
                    console.warn(`无法绑定建筑：(${ zNum }, ${ xNum })处已存在建筑导致冲突`);
                    return;
                }
            }
        }
        let highestAlpha = block.heightAlpha;
        for (let xNum = 0; xNum < xSpan; xNum += 1) {
            for (let zNum = 0; zNum < zSpan; zNum += 1) {
                const thisBlock = this.getBlock(xNum + x, zNum + z);
                if (thisBlock !== null) {
                    const { heightAlpha } = thisBlock;
                    highestAlpha = heightAlpha > highestAlpha ? heightAlpha : highestAlpha;
                    Object.defineProperty(thisBlock, 'buildingInfo', {
                        value: info,
                        configurable: true,
                        enumerable: true,
                    });
                }
            }
        }
        let building;
        if (info.desc === 'destination' || info.desc === 'entry') {
            building = new Building(entity.clone(), info);
        } else {
            building = new Decoration(entity.clone(), info);
        }
        Object.defineProperties(block.buildingInfo, {
            inst: {
                value: building,
                configurable: true,
                enumerable: true,
            },
            x: {
                value: x,
                configurable: true,
                enumerable: true,
            },
            z: {
                value: z,
                configurable: true,
                enumerable: true,
            },
        });
        const posX = (x + building.xSpan / 2) * block.size.x;
        const posY = building.size.y / 2 + highestAlpha * BlockUnit - 0.02;
        const posZ = (z + building.zSpan / 2) * block.size.z;
        building.mesh.position.set(posX, posY, posZ);
        this.frame.scene.add(building.mesh);
    }
    removeBuilding(xPos, zPos) {
        const block = this.getBlock(xPos, zPos);
        if (block === null || block.buildingInfo === undefined) {
            return;
        }
        const { buildingInfo } = block;
        const { x, z, xSpan, zSpan } = buildingInfo;
        const mainBlock = this.getBlock(x, z);
        if (mainBlock === null) {
            throw new BuildingInfoError('指定的主建筑位置无效', buildingInfo);
        } else {
            if (mainBlock.buildingInfo !== undefined && mainBlock.buildingInfo.inst !== undefined) {
                disposeResources(mainBlock.buildingInfo.inst.mesh);
            } else {
                throw new BlockInfoError('主砖块不存在建筑信息或建筑信息错误', mainBlock);
            }
            if (xSpan !== undefined && zSpan !== undefined) {
                for (let xNum = 0; xNum < xSpan; xNum += 1) {
                    for (let zNum = 0; zNum < zSpan; zNum += 1) {
                        const thisBlock = this.getBlock(x + xNum, z + zNum);
                        if (thisBlock !== null) {
                            delete thisBlock.buildingInfo;
                        }
                    }
                }
            }
        }
    }
    addOverlay(depth, parent) {
        const overlay = new Overlay(this, depth, parent);
        this.getBlocks().forEach((block) => {
            if (block !== null) {
                const geometry = new PlaneBufferGeometry(BlockUnit, BlockUnit);
                const material = new MeshBasicMaterial({
                    transparent: true,
                    opacity: 0.4,
                });
                const proto = new Mesh(geometry, material);
                const posX = block.size.x * (block.x + 0.5);
                const posY = block.size.y + (depth + 1) * 0.01;
                const posZ = block.size.z * (block.z + 0.5);
                proto.position.set(posX, posY, posZ);
                proto.rotateX(-Math.PI / 2);
                proto.visible = false;
                if (block.overlay === undefined) {
                    block.overlay = new Map();
                }
                const mesh = block.overlay.get(depth);
                if (mesh !== undefined) {
                    disposeResources(mesh);
                }
                block.overlay.set(depth, proto);
                this.frame.scene.add(proto);
            }
        });
        this.overlay.set(depth, overlay);
        return overlay;
    }
    getOverlay(depth) {
        return this.overlay.get(depth);
    }
    hideOverlay(depth) {
        if (depth === undefined) {
            this.overlay.forEach((layer) => { layer.hide(); });
        } else {
            const layer = this.overlay.get(depth);
            if (layer !== undefined) {
                layer.hide();
            }
        }
    }
    removeUnit(unit) {
        if (unit instanceof Operator) {
            const block = this.getBlock(unit.position.floor());
            block.placeable = true;
        }
        this.frame.scene.remove(unit.mesh);
        disposeResources(unit.mesh);
    }
    trackOverlay(layer, area) {
        if (this.tracker.pickPos === null) {
            if (layer.visibility !== false) {
                layer.hide();
            }
            this.tracker.lastPos = null;
        } else {
            const absPos = realPosToAbsPos(this.tracker.pickPos, true);
            if (!this.tracker.lastPos || !absPos.equals(this.tracker.lastPos)) {
                layer.hide();
                if ((() => {
                    if (layer.parent !== undefined) {
                        return layer.parent.has(absPos);
                    }
                    return true;
                })()) {
                    layer.showArea(absPos, area);
                }
                this.tracker.lastPos = absPos;
            }
        }
    }
}
export default GameMap;
