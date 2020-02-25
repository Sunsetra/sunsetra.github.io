import {
    BoxBufferGeometry,
    DoubleSide,
    LoadingManager,
    Material,
    Mesh,
    MeshBasicMaterial,
    MeshPhysicalMaterial,
    PlaneBufferGeometry,
    sRGBEncoding,
    TextureLoader,
} from '../../lib/three/build/three.module.js';
import { GLTFLoader } from '../../lib/three/examples/jsm/loaders/GLTFLoader.js';
import { BlockUnit } from '../others/constants.js';
import { LoadingError } from '../others/exceptions.js';

class ResourceLoader {
    constructor(data, onLoad, onProgress, onError) {
        this.resList = data.materials.resources;
        this.onLoad = onLoad;
        this.onProgress = onProgress;
        this.onError = onError;
        this.loadManager = new LoadingManager(() => {
            if (this.mapResList === undefined) {
                throw new LoadingError('地图资源信息未加载或加载错误');
            } else {
                this.createGeometry(this.mapResList);
            }
            if (this.onLoad !== undefined) {
                this.onLoad(data);
            }
        }, onProgress, onError);
        this.texLoader = new TextureLoader(this.loadManager);
        this.gltfLoader = new GLTFLoader(this.loadManager);
        this.loadingFlag = false;
    }
    load(mapRes) {
        this.mapResList = mapRes;
        ['EDPoint', 'operator'].forEach((type) => {
            Object.values(this.resList[type]).forEach((texRes) => {
                this.loadTexture(texRes);
            });
        });
        ['block', 'enemy'].forEach((category) => {
            mapRes[category].forEach((texType) => {
                const thisRes = this.resList[category][texType];
                this.loadTexture(thisRes);
            });
        });
        mapRes.model.forEach((modelType) => {
            const thisRes = this.resList.model[modelType];
            this.loadModel(thisRes);
        });
        if (!this.loadingFlag) {
            this.loadManager.onLoad();
        }
    }
    createGeometry(res) {
        const createUnitRes = (unitRes) => {
            if (!Object.prototype.hasOwnProperty.call(unitRes, 'mat') && unitRes.tex) {
                const material = new MeshBasicMaterial({
                    alphaTest: 0.6,
                    map: unitRes.tex,
                    side: DoubleSide,
                    transparent: true,
                });
                Object.defineProperty(unitRes, 'mat', { value: material });
                const { width, height } = unitRes.tex.image;
                const geometry = new PlaneBufferGeometry(width, height);
                Object.defineProperty(unitRes, 'geo', { value: geometry });
                const mesh = new Mesh(geometry, material);
                Object.defineProperty(unitRes, 'entity', { value: mesh });
            }
        };
        res.enemy.forEach((name) => {
            const texRes = this.resList.enemy[name];
            createUnitRes(texRes);
        });
        Object.values(this.resList.operator).forEach((opRes) => { createUnitRes(opRes); });
        Object.values(this.resList.EDPoint).forEach((edRes) => {
            if (!Object.prototype.hasOwnProperty.call(edRes, 'mat')) {
                const material = new MeshBasicMaterial({
                    depthWrite: false,
                    map: edRes.tex,
                    side: DoubleSide,
                    transparent: true,
                });
                Object.defineProperty(edRes, 'mat', { value: material });
            }
        });
        if (!(() => {
            let integrity = true;
            ['destination', 'entry'].forEach((type) => {
                integrity = integrity && Object.prototype.hasOwnProperty.call(this.resList.model[type], 'geo');
                integrity = integrity && Object.prototype.hasOwnProperty.call(this.resList.model[type], 'mat');
                integrity = integrity && Object.prototype.hasOwnProperty.call(this.resList.model[type], 'entity');
            });
            return integrity;
        })()) {
            const { destTop, destSide, entryTop, entrySide } = this.resList.EDPoint;
            const destTopMat = (destTop.mat ? destTop.mat : new Material());
            const destSideMat = (destSide.mat ? destSide.mat : new Material());
            const entryTopMat = (entryTop.mat ? entryTop.mat : new Material());
            const entrySideMat = (entrySide.mat ? entrySide.mat : new Material());
            const destMat = [destSideMat, destSideMat, destTopMat, destSideMat, destSideMat, destSideMat];
            const entryMat = [entrySideMat, entrySideMat, entryTopMat, entrySideMat, entrySideMat, entrySideMat];
            const geometry = new BoxBufferGeometry(BlockUnit, BlockUnit, BlockUnit);
            const destMesh = new Mesh(geometry, destMat);
            const entryMesh = new Mesh(geometry, entryMat);
            Object.defineProperties(this.resList.model.destination, {
                geo: { value: geometry },
                mat: { value: destMat },
                entity: { value: destMesh },
            });
            Object.defineProperties(this.resList.model.entry, {
                geo: { value: geometry },
                mat: { value: entryMat },
                entity: { value: entryMesh },
            });
        }
        res.block.forEach((texType) => {
            const texRes = this.resList.block[texType];
            if (!Object.prototype.hasOwnProperty.call(texRes, 'mat')) {
                const material = new MeshPhysicalMaterial({
                    metalness: 0.1,
                    roughness: 0.6,
                    map: texRes.tex,
                });
                Object.defineProperty(texRes, 'mat', { value: material });
            }
        });
    }
    loadTexture(res) {
        if (!Object.prototype.hasOwnProperty.call(res, 'tex')) {
            const texture = this.texLoader.load(res.url);
            texture.encoding = sRGBEncoding;
            texture.anisotropy = 16;
            Object.defineProperty(res, 'tex', { value: texture });
            this.loadingFlag = true;
        }
    }
    loadModel(res) {
        if (!Object.prototype.hasOwnProperty.call(res, 'entity')) {
            this.gltfLoader.load(res.url, (gltf) => {
                const model = gltf.scene.children[0];
                Object.defineProperty(res, 'entity', { value: model });
                this.loadingFlag = true;
            });
        }
    }
}

export default ResourceLoader;
