import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Fog,
  Material,
  Math as _Math,
  Mesh,
  Vector3,
} from '../../lib/three/build/three.module.js';
import Building from '../buildings/Building.js';
import Decoration from '../buildings/Decoration.js';
import { BlockUnit } from '../others/constants.js';
import { BlockInfoError, BuildingInfoError, ResourcesUnavailableError } from '../others/exceptions.js';
import { disposeResources } from '../others/utils.js';

class GameMap {
  constructor(data, resList) {
    this.data = data;
    this.resList = resList;
    this.name = data.name;
    this.width = data.mapWidth;
    this.height = data.mapHeight;
    this.blockData = new Array(this.width * this.height).fill(null);
    const blockInfo = JSON.parse(JSON.stringify(data.blockInfo));
    blockInfo.forEach((info) => {
      const { row, column, heightAlpha } = info;
      delete info.buildingInfo;
      const index = row * this.width + column;
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
      for (let row = 0; row < this.height; row += 1) {
        for (let column = 0; column < this.width; column += 1) {
          const thisBlock = this.getBlock(row, column);
          if (thisBlock === null) {
            sideGroup.push([0, 0]);
          } else {
            const thisHeight = thisBlock.heightAlpha;
            faces.forEach(({ corners, normal }) => {
              const sideBlock = this.getBlock(row + normal[2], column + normal[0]);
              const sideHeight = sideBlock ? sideBlock.heightAlpha : 0;
              if (thisHeight - sideHeight > 0 || normal[1]) {
                const ndx = positions.length / 3;
                corners.forEach(({ pos, uv }) => {
                  const x = pos[0] * BlockUnit;
                  const y = pos[1] * thisHeight * BlockUnit;
                  const z = pos[2] * BlockUnit;
                  positions.push(x + column * BlockUnit, y, z + row * BlockUnit);
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
      const mapGeometry = new BufferGeometry();
      mapGeometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
      mapGeometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
      mapGeometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
      mapGeometry.setIndex(indices);
      const materialList = [];
      const materialMap = {};
      data.resources.block.forEach((type) => {
        const res = resList.block[type];
        if (res.mat && res.mat instanceof Material) {
          materialList.push(res.mat);
          materialMap[type] = materialList.length - 1;
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
          mapGeometry.addGroup(s + c + 6, 6, materialMap[top]);
          mapGeometry.addGroup(s + c, 6, materialMap[bottom]);
          if (count) {
            mapGeometry.addGroup(s, c, materialMap[side]);
          }
        }
      });
      this.mesh = new Mesh(mapGeometry, materialList);
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
    }
  }
  getBlock(row, column) {
    const verifyRow = Math.floor(row / this.height);
    const verifyColumn = Math.floor(column / this.width);
    if (verifyRow || verifyColumn) {
      return null;
    }
    return this.blockData[row * this.width + column];
  }
  bindBuilding(row, column, info) {
    const block = this.getBlock(row, column);
    if (block === null) {
      return null;
    }
    const { entity } = this.resList.model[info.desc];
    if (entity === undefined) {
      throw new ResourcesUnavailableError('目标建筑实体未创建', this.resList.model[info.desc]);
    }
    const rowSpan = info.rowSpan ? info.rowSpan : 1;
    const colSpan = info.colSpan ? info.colSpan : 1;
    for (let x = 0; x < rowSpan; x += 1) {
      for (let y = 0; y < colSpan; y += 1) {
        const thisBlock = this.getBlock(row + x, column + y);
        if (thisBlock !== null && Object.prototype.hasOwnProperty.call(thisBlock, 'buildingInfo')) {
          console.warn(`无法绑定建筑：(${row}, ${column})处已存在建筑导致冲突`);
          return null;
        }
      }
    }
    let highestAlpha = block.heightAlpha;
    for (let x = 0; x < rowSpan; x += 1) {
      for (let y = 0; y < colSpan; y += 1) {
        const thisBlock = this.getBlock(row + x, column + y);
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
      row: {
        value: row,
        configurable: true,
        enumerable: true,
      },
      column: {
        value: column,
        configurable: true,
        enumerable: true,
      },
    });
    if (block.size === undefined) {
      throw new BlockInfoError('当前砖块尺寸未定义', block);
    } else {
      const x = (column + building.colSpan / 2) * block.size.x;
      const y = building.size.y / 2 + highestAlpha * BlockUnit - 0.01;
      const z = (row + building.rowSpan / 2) * block.size.z;
      building.mesh.position.set(x, y, z);
    }
    return building;
  }
  removeBuilding(r, c) {
    const block = this.getBlock(r, c);
    if (block === null || block.buildingInfo === undefined) {
      return;
    }
    const { buildingInfo } = block;
    const { row, column, rowSpan, colSpan } = buildingInfo;
    const mainBlock = this.getBlock(row, column);
    if (mainBlock === null) {
      throw new BuildingInfoError('指定的主建筑位置无效', buildingInfo);
    } else {
      if (mainBlock.buildingInfo !== undefined && mainBlock.buildingInfo.inst !== undefined) {
        disposeResources(mainBlock.buildingInfo.inst.mesh);
      } else {
        throw new BlockInfoError('主砖块不存在建筑信息或建筑信息错误', mainBlock);
      }
      if (rowSpan !== undefined && colSpan !== undefined) {
        for (let x = 0; x < rowSpan; x += 1) {
          for (let z = 0; z < colSpan; z += 1) {
            const thisBlock = this.getBlock(row + x, column + z);
            if (thisBlock !== null) {
              delete thisBlock.buildingInfo;
            }
          }
        }
      }
    }
  }
  createMap(frame) {
    const maxSize = Math.max(this.width, this.height) * BlockUnit;
    const centerX = (this.width * BlockUnit) / 2;
    const centerZ = (this.height * BlockUnit) / 2;
    const { scene, camera, controls, lights } = frame;
    scene.fog = new Fog(0x0, maxSize, maxSize * 2);
    camera.far = maxSize * 2;
    camera.position.set(centerX, centerZ * 3, centerZ * 3);
    camera.updateProjectionMatrix();
    controls.target.set(centerX, 0, centerZ);
    this.data.blockInfo.forEach((item) => {
      if (item !== null && item.buildingInfo) {
        const { row, column } = item;
        this.removeBuilding(row, column);
        const building = this.bindBuilding(row, column, item.buildingInfo);
        if (building !== null) {
          scene.add(building.mesh);
        }
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
      const cosTheta = Math.cos(_Math.degToRad(theta));
      const sinTheta = Math.sin(_Math.degToRad(theta));
      const cosPhi = Math.cos(_Math.degToRad(mapPhi));
      const sinPhi = Math.sin(_Math.degToRad(mapPhi));
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
}

export default GameMap;
