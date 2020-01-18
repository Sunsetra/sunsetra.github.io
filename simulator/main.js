import GameController from './modules/controllers/GameCtl.js';
import LoadingUICtl from './modules/controllers/LoadingUICtl.js';
import RenderController from './modules/controllers/RenderCtl.js';
import TimeAxisUICtl from './modules/controllers/TimeAxisUICtl.js';
import GameFrame from './modules/core/GameFrame.js';
import GameMap from './modules/core/GameMap.js';
import TimeAxis from './modules/core/TimeAxis.js';
import MapLoader from './modules/loaders/MapLoader.js';
import { ResourceLoader } from './modules/loaders/ResourceLoader.js';
import { WebGLUnavailable } from './modules/others/constants.js';
import { LoadingError } from './modules/others/exceptions.js';
import { checkWebGLVersion, disposeResources } from './modules/others/utils.js';
import DynamicRenderer from './modules/renderers/DynamicRender.js';
import StaticRenderer from './modules/renderers/StaticRenderer.js';

const canvas = document.querySelector('canvas');
const frame = new GameFrame(canvas);
const timeAxis = new TimeAxis();
const timeAxisUI = new TimeAxisUICtl();
const staticRenderer = new StaticRenderer(frame);
const dynamicRenderer = new DynamicRenderer(frame);
const renderCtl = new RenderController(frame, staticRenderer, dynamicRenderer);

function main(mapInfo, resList) {
    const map = new GameMap(JSON.parse(JSON.stringify(mapInfo)), resList);
    map.createMap(frame);
    const gameCtl = new GameController(map, frame.scene, resList, timeAxisUI);
    renderCtl.callbacks = {
        start: () => timeAxis.start(),
        pause: () => timeAxis.stop(),
        continue: () => timeAxis.continue(),
        stop: () => timeAxis.stop(),
        reset: () => {
            timeAxis.stop();
            timeAxisUI.clearNodes();
            timeAxisUI.resetTimer();
            gameCtl.resetGame();
        },
    };
    renderCtl.reset();

    function frameCallback(rAFTime) {
        const currentTime = timeAxis.getCurrentTime();
        if (gameCtl.enemyCount) {
            gameCtl.updateEnemyStatus(currentTime);
            const interval = (rAFTime - dynamicRenderer.lastTime) / 1000;
            gameCtl.updateEnemyPosition(interval, currentTime);
            timeAxisUI.setTimer(currentTime[0]);
            timeAxisUI.updateAxisNodes(currentTime[1]);
        } else {
            dynamicRenderer.stopRender();
            renderCtl.stop();
        }
    }

    dynamicRenderer.callback = frameCallback;
    frame.addEventListener(document, 'visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            renderCtl.pause();
        }
    });
}

function resetGameFrame() {
    renderCtl.reset();
    disposeResources(frame.scene);
    frame.clearEventListener();
}

if (checkWebGLVersion() === WebGLUnavailable) {
    throw new Error('不支持WebGL，请更新浏览器。');
} else {
    fetch('res/list.json')
      .then((resResp) => resResp.json())
      .then((resList) => {
          function loadResources(mapData) {
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
                  LoadingUICtl.updateTip(`加载${ url }时发生错误`, true);
                  throw new LoadingError(`加载${ url }时发生错误`);
              };
              const loadingFinished = (list) => {
                  if (!errorCounter) {
                      LoadingUICtl.updateLoadingBar(1, 1, () => main(mapData, list));
                  }
              };
              resetGameFrame();
              const resLoader = new ResourceLoader(resList, loadingFinished, loadingProgress, loadingError);
              resLoader.load(mapData.resources);
          }

          const mapLoader = new MapLoader(loadResources, (reason) => {
              console.error('加载地图文件失败\n', reason);
          });
          LoadingUICtl.initUI();
          LoadingUICtl.mapSelectToLoading(mapLoader);
      })
      .catch((reason) => console.error('加载总资源列表失败\n', reason));
}
