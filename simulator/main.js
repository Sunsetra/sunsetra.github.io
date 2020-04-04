import GameController from './modules/controllers/GameCtl.js';
import GameUIController from './modules/controllers/GameUICtl.js';
import LoadingUICtl from './modules/controllers/LoadingUICtl.js';
import RenderController from './modules/controllers/RenderCtl.js';
import TimeAxisUICtl from './modules/controllers/TimeAxisUICtl.js';
import GameFrame from './modules/core/GameFrame.js';
import GameMap from './modules/core/GameMap.js';
import TimeAxis from './modules/core/TimeAxis.js';
import MapLoader from './modules/loaders/MapLoader.js';
import ResourceLoader from './modules/loaders/ResourceLoader.js';
import { GameStatus, WebGLAvailability } from './modules/others/constants.js';
import { LoadingError } from './modules/others/exceptions.js';
import { addEvListener, checkWebGLVersion, clearEvListener, disposeResources } from './modules/others/utils.js';
import DynamicRenderer from './modules/renderers/DynamicRender.js';
import StaticRenderer from './modules/renderers/StaticRenderer.js';

const canvas = document.querySelector('.main');
const frame = new GameFrame(canvas);
const timeAxis = new TimeAxis();
const render = {
    static: new StaticRenderer(frame),
    dynamic: new DynamicRenderer(frame),
};
const renderCtl = new RenderController(frame, render);
function main(mapInfo, data) {
    const { materials } = data;
    const map = new GameMap(frame, JSON.parse(JSON.stringify(mapInfo)), materials.resources);
    const timeAxisUI = new TimeAxisUICtl(timeAxis, materials.icons);
    const gameCtl = new GameController(map, data, timeAxisUI);
    const gameUICtl = new GameUIController(frame, map, gameCtl, render.static, data);
    gameUICtl.addOprCard([
        'blaze', 'cardigan', 'ceylon', 'durin', 'haze', 'kroos',
        'lancet2', 'reed', 'rope', 'silverash', 'sora', 'vermeil',
    ]);
    renderCtl.callbacks = {
        start: () => {
            timeAxis.start();
            gameCtl.setStatus(GameStatus.Running);
        },
        pause: () => timeAxis.stop(),
        continue: () => timeAxis.continue(),
        stop: () => timeAxis.stop(),
        reset: () => {
            gameCtl.reset();
            gameCtl.setStatus(GameStatus.Standby);
            gameUICtl.reset();
            timeAxisUI.reset();
            map.hideOverlay();
        },
    };
    render.dynamic.callback = (rAFTime) => {
        if (gameCtl.getStatus() === GameStatus.Running || gameCtl.getStatus() === GameStatus.Standby) {
            const interval = (rAFTime - render.dynamic.lastTime) / 1000;
            gameCtl.updateProperty(interval);
            gameUICtl.updateUIStatus();
            gameCtl.updateEnemyStatus(timeAxis.getCurrentTime());
            gameCtl.updateEnemyPosition(interval);
            timeAxisUI.update();
        } else {
            render.dynamic.stopRender();
            renderCtl.stop();
        }
    };
    addEvListener(document, 'visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            renderCtl.pause();
        }
    });
    addEvListener(window, 'resize', () => render.static.checkResize());
    window.dispatchEvent(new Event('resize'));
    renderCtl.reset();
    render.static.checkResize();
}
function resetGameFrame() {
    renderCtl.reset();
    disposeResources(frame.scene);
    frame.scene.dispose();
    clearEvListener();
}
async function fetchData() {
    const fetchResInfo = fetch('res/list.json');
    const fetchUnitInfo = fetch('res/unit_data.json');
    const response = await Promise.all([fetchResInfo, fetchUnitInfo]);
    return {
        materials: await response[0].json(),
        units: await response[1].json(),
    };
}

if (checkWebGLVersion() === WebGLAvailability.Unavailable) {
    throw new Error('不支持WebGL，请更新浏览器。');
} else {
    fetchData().then((data) => {
        const loadResources = (mapData) => {
            let errorCounter = 0;
            const loadingProgress = (_, itemsLoaded, itemsTotal) => {
                if (!errorCounter) {
                    if (itemsLoaded !== itemsTotal) {
                        LoadingUICtl.updateLoadingBar(itemsLoaded, itemsTotal);
                    }
                }
            };
            const loadingError = (url) => {
                if (!errorCounter) {
                    LoadingUICtl.updateTip('');
                }
                errorCounter += 1;
                LoadingUICtl.updateTip(`加载${ url }时发生错误\n`, true);
                throw new LoadingError(`加载${ url }时发生错误`);
            };
            const loadingFinished = (miscData) => {
                if (!errorCounter) {
                    LoadingUICtl.updateLoadingBar(1, 1, () => main(mapData, miscData));
                }
            };
            resetGameFrame();
            const resLoader = new ResourceLoader(data, loadingFinished, loadingProgress, loadingError);
            resLoader.load(mapData.resources);
        };
        const mapLoader = new MapLoader(loadResources, (reason) => {
            console.error('加载地图文件失败\n', reason);
        });
        LoadingUICtl.initUI();
        LoadingUICtl.mapSelectToLoading(mapLoader);
    });
}
