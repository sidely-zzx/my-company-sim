import { Application, Assets, Container, Sprite, type Texture } from 'pixi.js';
import createChairLayer from './chair';
import createDeskLayer from './desk';

const OFFICE_BACKGROUND_SRC = '/office.png';
const OFFICE_IMAGE_WIDTH = 1672;
const OFFICE_IMAGE_HEIGHT = 941;

export interface GameAppHandle {
  destroy: () => void;
}

interface DragState {
  isDragging: boolean;
  pointerId: number | null;
  lastX: number;
  lastY: number;
}

const fitOfficeLayer = (officeLayer: Container, screenWidth: number, screenHeight: number) => {
  // 办公室层是游戏世界的坐标基准，只影响场景视觉和后续物件坐标参照，不直接改变现金流、士气、项目进度等经营属性。
  // 当容器尺寸变化时使用 cover 缩放整个办公室层，避免背景和桌子等场景资产错位。
  const scale = Math.max(screenWidth / OFFICE_IMAGE_WIDTH, screenHeight / OFFICE_IMAGE_HEIGHT);
  const width = OFFICE_IMAGE_WIDTH * scale;
  const height = OFFICE_IMAGE_HEIGHT * scale;
  officeLayer.scale.set(scale);
  officeLayer.x = (screenWidth - width) / 2;
  officeLayer.y = (screenHeight - height) / 2;
};

const bindRightButtonSceneDrag = (canvas: HTMLCanvasElement, sceneLayer: Container) => {
  const dragState: DragState = {
    isDragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
  };

  const stopDragging = () => {
    dragState.isDragging = false;
    dragState.pointerId = null;
    canvas.style.cursor = '';
  };

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 2) {
      return;
    }

    event.preventDefault();
    dragState.isDragging = true;
    dragState.pointerId = event.pointerId;
    dragState.lastX = event.clientX;
    dragState.lastY = event.clientY;
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!dragState.isDragging || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const deltaX = event.clientX - dragState.lastX;
    const deltaY = event.clientY - dragState.lastY;

    // 场景位移是镜头浏览属性：只影响玩家看到的办公室位置，不影响办公室内员工、项目、现金流等游戏数据。
    // 后续放入 sceneLayer 的员工、工位和装饰物会随场景一起移动，从而保持它们与背景图的相对位置。
    sceneLayer.x += deltaX;
    sceneLayer.y += deltaY;
    dragState.lastX = event.clientX;
    dragState.lastY = event.clientY;
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (dragState.pointerId !== event.pointerId) {
      return;
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    stopDragging();
  };

  canvas.addEventListener('contextmenu', handleContextMenu);
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);

  return () => {
    canvas.removeEventListener('contextmenu', handleContextMenu);
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('pointercancel', handlePointerUp);
  };
};

const createGameApp = async (node: HTMLDivElement): Promise<GameAppHandle> => {
  const app = new Application();
  // @ts-expect-error devtool插件
  globalThis.__PIXI_APP__ = app;
  await app.init({
    resizeTo: node,
    antialias: false,
    autoDensity: false,
    backgroundAlpha: 0,
  });

  app.canvas.className = 'h-full w-full';
  app.canvas.setAttribute('width', '1920');
  app.canvas.setAttribute('height', '1080');
  node.appendChild(app.canvas);

  const sceneLayer = new Container();
  const officeLayer = new Container();
  const backgroundLayer = new Container();
  sceneLayer.addChild(officeLayer);
  officeLayer.addChild(backgroundLayer);
  app.stage.addChild(sceneLayer);

  const [officeTexture, deskLayer, chairLayer] = await Promise.all([
    Assets.load<Texture>(OFFICE_BACKGROUND_SRC),
    createDeskLayer(),
    createChairLayer(),
  ]);
  const officeBackground = new Sprite(officeTexture);
  officeBackground.width = OFFICE_IMAGE_WIDTH;
  officeBackground.height = OFFICE_IMAGE_HEIGHT;
  backgroundLayer.addChild(officeBackground);
  officeLayer.addChild(deskLayer);
  officeLayer.addChild(chairLayer);

  const resizeOfficeLayer = () => {
    fitOfficeLayer(officeLayer, app.screen.width, app.screen.height);
  };

  resizeOfficeLayer();

  const resizeObserver = new ResizeObserver(resizeOfficeLayer);
  resizeObserver.observe(node);
  const unbindRightButtonSceneDrag = bindRightButtonSceneDrag(app.canvas, sceneLayer);

  return {
    destroy: () => {
      resizeObserver.disconnect();
      unbindRightButtonSceneDrag();
      app.destroy({ removeView: true }, { children: true });
    },
  };
};

export default createGameApp;
