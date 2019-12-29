/**
 * 地图所需资源加载器
 * @author: 落日羽音
 */
import * as THREE from "../../lib/three/build/three.module.js";
import { GLTFLoader } from '../../lib/three/examples/jsm/loaders/GLTFLoader.js';
import { BlockUnit } from '../constant.js';


class ResourceLoader {
    constructor(resListAll, onLoad, onProgress, onError) {
        this.resListAll = resListAll;
        this.onLoad = onLoad;
        this.onProgress = onProgress;
        this.onError = onError;
        this.loadManager = new THREE.LoadingManager(() => {
            if (this.mapResList !== undefined) {
                this.createGeometry(this.mapResList);
            }
            if (this.onLoad !== undefined) {
                this.onLoad(this.resListAll);
            }
        }, onProgress, onError);
        this.texLoader = new THREE.TextureLoader(this.loadManager);
        this.gltfLoader = new GLTFLoader(this.loadManager);
        this.loadingFlag = false;
    }
    /**
     * 构建资源实体，包括但不限于材质，几何体
     * @param res: 地图中所需要的资源信息
     */
    createGeometry(res) {
        /* 构建ED点的材质 */
        Object.values(this.resListAll.EDPoint).forEach((edRes) => {
            if (!Object.prototype.hasOwnProperty.call(edRes, 'mat')) {
                const material = new THREE.MeshBasicMaterial({
                    alphaTest: 0.6,
                    map: edRes.tex,
                    side: THREE.DoubleSide,
                    transparent: true,
                });
                Object.defineProperty(edRes, 'mat', { value: material });
            }
        });
        /* 构建ED点的几何体 */
        const { destTop, destSide, entryTop, entrySide } = this.resListAll.EDPoint;
        /* EDPoint中加载的材质一定不是数组 */
        const destTopMat = (destTop.mat ? destTop.mat : new THREE.Material());
        const destSideMat = (destSide.mat ? destSide.mat : new THREE.Material());
        const entryTopMat = (entryTop.mat ? entryTop.mat : new THREE.Material());
        const entrySideMat = (entrySide.mat ? entrySide.mat : new THREE.Material());
        const destMat = [destSideMat, destSideMat, destTopMat, destSideMat, destSideMat, destSideMat];
        const entryMat = [entrySideMat, entrySideMat, entryTopMat, entrySideMat, entrySideMat, entrySideMat];
        const geometry = new THREE.BoxBufferGeometry(BlockUnit, BlockUnit, BlockUnit);
        const destMesh = new THREE.Mesh(geometry, destMat);
        const entryMesh = new THREE.Mesh(geometry, entryMat);
        Object.defineProperties(this.resListAll.model.destination, {
            'geo': { value: geometry },
            'mat': { value: destMat },
            'entity': { value: destMesh },
        });
        Object.defineProperties(this.resListAll.model.entry, {
            'geo': { value: geometry },
            'mat': { value: entryMat },
            'entity': { value: entryMesh },
        });
        /* 构建砖块材质 */
        res.block.forEach((texType) => {
            const res = this.resListAll.block[texType];
            if (!Object.prototype.hasOwnProperty.call(res, 'mat')) {
                const material = new THREE.MeshPhysicalMaterial({
                    metalness: 0.1,
                    roughness: 0.6,
                    map: res.tex,
                });
                Object.defineProperty(res, 'mat', { value: material });
            }
        });
        /* 构建敌方单位材质及实体 */
        res.enemy.forEach((name) => {
            const res = this.resListAll.enemy[name];
            if (!Object.prototype.hasOwnProperty.call(res, 'mat') && res.tex) { // tex属性一定存在
                const material = new THREE.MeshBasicMaterial({
                    alphaTest: 0.6,
                    depthWrite: false,
                    map: res.tex,
                    side: THREE.DoubleSide,
                    transparent: true,
                });
                Object.defineProperty(res, 'mat', { value: material });
                const { width, height } = res.tex.image;
                const geometry = new THREE.PlaneBufferGeometry(width, height);
                Object.defineProperty(res, 'geo', { value: geometry });
                const mesh = new THREE.Mesh(geometry, material);
                Object.defineProperty(res, 'entity', { value: mesh });
            }
        });
    }
    /**
     * 加载源资源对象的贴图
     * 异步加载，不可用返回值的形式
     * @param res: 贴图源资源对象
     */
    loadTexture(res) {
        if (!Object.prototype.hasOwnProperty.call(res, 'tex')) { // 若已有已加载的贴图则跳过加载
            const texture = this.texLoader.load(res.url);
            texture.encoding = THREE.sRGBEncoding;
            texture.anisotropy = 16;
            Object.defineProperty(res, 'tex', { value: texture });
            this.loadingFlag = true;
        }
    }
    /**
     * 加载源资源对象的GLTF模型
     * 异步加载，不可用返回值的形式
     * @param res: 模型源资源对象
     */
    loadModel(res) {
        if (!Object.prototype.hasOwnProperty.call(res, 'entity')) { // 若已有已加载的模型则跳过加载
            this.gltfLoader.load(res.url, (gltf) => {
                const model = gltf.scene.children[0];
                Object.defineProperty(res, 'entity', { value: model });
                this.loadingFlag = true;
            });
        }
    }
    /**
     * 从总资源字典中加载地图信息中需要的资源并创建实体
     * @param mapRes: 地图信息中所需的资源列表
     */
    load(mapRes) {
        this.mapResList = mapRes;
        /* 加载进出点贴图 */
        Object.values(this.resListAll.EDPoint).forEach((texRes) => {
            this.loadTexture(texRes);
        });
        /* 加载砖块及敌人贴图 */
        ['block', 'enemy'].forEach((category) => {
            mapRes[category].forEach((texType) => {
                const thisRes = this.resListAll[category][texType];
                this.loadTexture(thisRes);
            });
        });
        /* 加载建筑模型 */
        mapRes.model.forEach((modelType) => {
            const thisRes = this.resListAll.model[modelType];
            this.loadModel(thisRes);
        });
        if (!this.loadingFlag) {
            this.loadManager.onLoad();
        } // 未实际加载时手动调用加载完成回调
    }
}
export { ResourceLoader };
