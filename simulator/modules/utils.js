/**
 * 工具函数集
 * @author: 落日羽音
 */
import * as THREE from "../lib/three/build/three.module.js";
import { WEBGL } from '../lib/three/examples/jsm/WebGL.js';
import { WebGL2Available, WebGLAvailable, WebGLUnavailable } from '../modules/constant.js';


/**
 * 检测webgl可用性
 * @returns - 返回值表示当前环境中webgl的可用性及支持的版本
 */
function checkWebGLVersion() {
    if (WEBGL.isWebGLAvailable()) {
        return WEBGL.isWebGL2Available() ? WebGL2Available : WebGLAvailable;
    }
    else {
        return WebGLUnavailable;
    }
}
/**
 * 递归释放参数对象中包含的资源
 * @param resource - 包含资源的对象
 * @returns - 返回被释放的对象
 */
function disposeResources(resource) {
    if (!resource) {
        return resource;
    } // 传入空对象时直接返回
    if (Array.isArray(resource)) { // 传入数组（材质对象或Object3D的children）
        resource.forEach((res) => disposeResources(res));
        return resource;
    }
    if (resource instanceof THREE.Object3D) { // 解包Object3D中的资源
        if (resource instanceof THREE.Mesh) {
            disposeResources(resource.geometry); // 解包Mesh中的几何体
            if (Array.isArray(resource.material)) { // 解包Mesh中的材质
                resource.material.forEach((mat) => disposeResources(mat));
            }
            else {
                disposeResources(resource.material);
            }
        }
        while (resource.children.length) { // 解包Object3D的子对象
            const firstObj = resource.children[0];
            resource.remove(firstObj);
            disposeResources(firstObj);
        }
    }
    else if (resource instanceof THREE.Material) {
        Object.values(resource).forEach((value) => {
            if (value instanceof THREE.Texture) {
                value.dispose();
            } // 废弃其中的贴图实例
        });
        resource.dispose(); // 废弃材质对象
    }
    else if (resource instanceof THREE.BufferGeometry || resource instanceof THREE.Geometry) {
        resource.dispose(); // 废弃几何体对象
    }
    return resource;
}
export { checkWebGLVersion, disposeResources };
