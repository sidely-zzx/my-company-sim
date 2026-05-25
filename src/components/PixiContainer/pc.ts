import { Assets, Container, Sprite, type Texture } from 'pixi.js';
import {
  DESK_COLUMNS,
  DESK_COLUMN_CENTER_XS,
  DESK_DISPLAY_HEIGHT,
  DESK_DISPLAY_WIDTH,
  DESK_ROWS,
  DESK_ROW_CENTER_YS,
} from './desk';

const PC_SRC = '/pc.png';
const PC_IMAGE_WIDTH = 1536;
const PC_IMAGE_HEIGHT = 1024;
const PC_DISPLAY_WIDTH = DESK_DISPLAY_WIDTH * 0.45;
const PC_DISPLAY_HEIGHT = PC_DISPLAY_WIDTH * (PC_IMAGE_HEIGHT / PC_IMAGE_WIDTH);
const PC_OFFSET_Y = -DESK_DISPLAY_HEIGHT * 0.12;

const createPcMatrix = (pcTexture: Texture) => {
  const pcLayer = new Container();

  for (let row = 0; row < DESK_ROWS; row += 1) {
    for (let column = 0; column < DESK_COLUMNS; column += 1) {
      const pc = new Sprite(pcTexture);

      // 电脑是桌面的生产设备视觉资产：它遮挡桌子表面，但会被椅子和未来坐下的员工遮挡。
      // 电脑位置影响桌面摆件、显示器点击热区和工位状态展示，不直接影响现金流、项目进度等经营数值。
      pc.anchor.set(0.5);
      pc.width = PC_DISPLAY_WIDTH;
      pc.height = PC_DISPLAY_HEIGHT;
      pc.x = DESK_COLUMN_CENTER_XS[column] - 12;
      pc.y = DESK_ROW_CENTER_YS[row] + PC_OFFSET_Y;
      pcLayer.addChild(pc);
    }
  }

  return pcLayer;
};

async function createPcLayer() {
  const pcTexture = await Assets.load<Texture>(PC_SRC);

  return createPcMatrix(pcTexture);
}

export default createPcLayer;
