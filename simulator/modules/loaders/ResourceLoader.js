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
    constructor(resListAll, onLoad, onProgress, onError) {
        this.resListAll = resListAll;
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
                this.onLoad(this.resListAll);
            }
        }, onProgress, onError);
        this.texLoader = new TextureLoader(this.loadManager);
        this.gltfLoader = new GLTFLoader(this.loadManager);
        this.loadingFlag = false;
    }

    load(mapRes) {
        this.mapResList = mapRes;
        Object.values(this.resListAll.EDPoint).forEach((texRes) => {
            this.loadTexture(texRes);
        });
        ['block', 'enemy'].forEach((category) => {
            mapRes[category].forEach((texType) => {
                const thisRes = this.resListAll[category][texType];
                this.loadTexture(thisRes);
            });
        });
        mapRes.model.forEach((modelType) => {
            const thisRes = this.resListAll.model[modelType];
            this.loadModel(thisRes);
        });
        if (!this.loadingFlag) {
            this.loadManager.onLoad();
        }
    }

    createGeometry(res) {
        Object.values(this.resListAll.EDPoint).forEach((edRes) => {
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
                integrity = integrity && Object.prototype.hasOwnProperty.call(this.resListAll.model[type], 'geo');
                integrity = integrity && Object.prototype.hasOwnProperty.call(this.resListAll.model[type], 'mat');
                integrity = integrity && Object.prototype.hasOwnProperty.call(this.resListAll.model[type], 'entity');
            });
            return integrity;
        })()) {
            const { destTop, destSide, entryTop, entrySide } = this.resListAll.EDPoint;
            const destTopMat = (destTop.mat ? destTop.mat : new Material());
            const destSideMat = (destSide.mat ? destSide.mat : new Material());
            const entryTopMat = (entryTop.mat ? entryTop.mat : new Material());
            const entrySideMat = (entrySide.mat ? entrySide.mat : new Material());
            const destMat = [destSideMat, destSideMat, destTopMat, destSideMat, destSideMat, destSideMat];
            const entryMat = [entrySideMat, entrySideMat, entryTopMat, entrySideMat, entrySideMat, entrySideMat];
            const geometry = new BoxBufferGeometry(BlockUnit, BlockUnit, BlockUnit);
            const destMesh = new Mesh(geometry, destMat);
            const entryMesh = new Mesh(geometry, entryMat);
            Object.defineProperties(this.resListAll.model.destination, {
                geo: { value: geometry },
                mat: { value: destMat },
                entity: { value: destMesh },
            });
            Object.defineProperties(this.resListAll.model.entry, {
                geo: { value: geometry },
                mat: { value: entryMat },
                entity: { value: entryMesh },
            });
        }
        res.block.forEach((texType) => {
            const texRes = this.resListAll.block[texType];
            if (!Object.prototype.hasOwnProperty.call(texRes, 'mat')) {
                const material = new MeshPhysicalMaterial({
                    metalness: 0.1,
                    roughness: 0.6,
                    map: texRes.tex,
                });
                Object.defineProperty(texRes, 'mat', { value: material });
            }
        });
        res.enemy.forEach((name) => {
            const texRes = this.resListAll.enemy[name];
            if (!Object.prototype.hasOwnProperty.call(texRes, 'mat') && texRes.tex) {
                const material = new MeshBasicMaterial({
                    alphaTest: 0.6,
                    map: texRes.tex,
                    side: DoubleSide,
                    transparent: true,
                });
                Object.defineProperty(texRes, 'mat', { value: material });
                const { width, height } = texRes.tex.image;
                const enemyGeo = new PlaneBufferGeometry(width, height);
                Object.defineProperty(texRes, 'geo', { value: enemyGeo });
                const mesh = new Mesh(enemyGeo, material);
                Object.defineProperty(texRes, 'entity', { value: mesh });
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

export { ResourceLoader };
