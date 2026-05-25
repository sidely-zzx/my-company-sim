import { Assets, Container, Graphics, Sprite, type Texture, type Ticker } from 'pixi.js';
import {
  DESK_COLUMNS,
  DESK_COLUMN_CENTER_XS,
  DESK_DISPLAY_HEIGHT,
  DESK_DISPLAY_WIDTH,
  DESK_ROWS,
  DESK_ROW_CENTER_YS,
} from './desk';

const PC_SRC = '/pc.png';
const WORKING_SCREEN_SRC = '/sreen/working_sreen.png';
const PC_IMAGE_WIDTH = 1536;
const PC_IMAGE_HEIGHT = 1024;
const WORKING_SCREEN_IMAGE_WIDTH = 941;
const WORKING_SCREEN_IMAGE_HEIGHT = 1672;
const PC_DISPLAY_WIDTH = DESK_DISPLAY_WIDTH * 0.45;
const PC_DISPLAY_HEIGHT = PC_DISPLAY_WIDTH * (PC_IMAGE_HEIGHT / PC_IMAGE_WIDTH);
const PC_OFFSET_Y = -DESK_DISPLAY_HEIGHT * 0.12;
const PC_OFFSET_X = -12;
const SCREEN_SOURCE_X = 430;
const SCREEN_SOURCE_Y = 227;
const SCREEN_SOURCE_WIDTH = 670;
const SCREEN_SOURCE_HEIGHT = 326;
const SCREEN_SCROLL_SPEED = 0.3;

const createWorkingScreen = (screenTexture: Texture) => {
  const screenLayer = new Container();
  const contentLayer = new Container();
  const screenX = (SCREEN_SOURCE_X / PC_IMAGE_WIDTH - 0.5) * PC_DISPLAY_WIDTH;
  const screenY = (SCREEN_SOURCE_Y / PC_IMAGE_HEIGHT - 0.5) * PC_DISPLAY_HEIGHT;
  const screenWidth = (SCREEN_SOURCE_WIDTH / PC_IMAGE_WIDTH) * PC_DISPLAY_WIDTH;
  const screenHeight = (SCREEN_SOURCE_HEIGHT / PC_IMAGE_HEIGHT) * PC_DISPLAY_HEIGHT;
  const contentWidth = screenWidth;
  const contentHeight = contentWidth * (WORKING_SCREEN_IMAGE_HEIGHT / WORKING_SCREEN_IMAGE_WIDTH);
  const screenMask = new Graphics();
  const workingScreens = [
    new Sprite(screenTexture),
    new Sprite(screenTexture),
  ];
  let scrollOffset = 0;

  screenMask
    .rect(screenX, screenY, screenWidth, screenHeight)
    .fill({ color: 0xffffff });

  workingScreens.forEach((workingScreen) => {
    // 工作屏幕是员工编码状态的视觉反馈：滚动速度表现输入代码的忙碌感，不直接改变项目进度、士气或现金流。
    // 屏幕被裁剪在显示器黑屏区域内，渲染顺序高于电脑外壳、低于椅子和未来员工，保证遮挡关系符合工位层级。
    workingScreen.width = contentWidth;
    workingScreen.height = contentHeight;
    workingScreen.x = screenX;
    contentLayer.addChild(workingScreen);
  });

  contentLayer.mask = screenMask;
  screenLayer.addChild(contentLayer);
  screenLayer.addChild(screenMask);

  return {
    layer: screenLayer,
    update: (deltaTime: number) => {
      scrollOffset = (scrollOffset + SCREEN_SCROLL_SPEED * deltaTime) % contentHeight;
      workingScreens[0].y = screenY - scrollOffset;
      workingScreens[1].y = workingScreens[0].y + contentHeight;
    },
  };
};

const createPcMatrix = (pcTexture: Texture, screenTexture: Texture, ticker: Ticker) => {
  const pcLayer = new Container();

  for (let row = 0; row < DESK_ROWS; row += 1) {
    for (let column = 0; column < DESK_COLUMNS; column += 1) {
      const stationLayer = new Container();
      const pc = new Sprite(pcTexture);
      const workingScreen = createWorkingScreen(screenTexture);

      // 电脑是桌面的生产设备视觉资产：它遮挡桌子表面，但会被椅子和未来坐下的员工遮挡。
      // 电脑位置影响桌面摆件、显示器点击热区和工位状态展示，不直接影响现金流、项目进度等经营数值。
      stationLayer.x = DESK_COLUMN_CENTER_XS[column] + PC_OFFSET_X;
      stationLayer.y = DESK_ROW_CENTER_YS[row] + PC_OFFSET_Y;
      pc.anchor.set(0.5);
      pc.width = PC_DISPLAY_WIDTH;
      pc.height = PC_DISPLAY_HEIGHT;
      stationLayer.addChild(pc);
      stationLayer.addChild(workingScreen.layer);
      pcLayer.addChild(stationLayer);
      ticker.add((ticker) => {
        workingScreen.update(ticker.deltaTime);
      });
    }
  }

  return pcLayer;
};

async function createPcLayer(ticker: Ticker) {
  const [pcTexture, screenTexture] = await Promise.all([
    Assets.load<Texture>(PC_SRC),
    Assets.load<Texture>(WORKING_SCREEN_SRC),
  ]);

  return createPcMatrix(pcTexture, screenTexture, ticker);
}

export default createPcLayer;
