import { Assets, Container, Sprite, type Texture } from 'pixi.js';

const DESK_SRC = '/desk.png';
const DESK_IMAGE_WIDTH = 1536;
const DESK_IMAGE_HEIGHT = 1024;

export const DESK_COLUMNS = 5;
export const DESK_ROWS = 3;
export const DESK_DISPLAY_WIDTH = 460;
export const DESK_DISPLAY_HEIGHT = DESK_DISPLAY_WIDTH * (DESK_IMAGE_HEIGHT / DESK_IMAGE_WIDTH);
export const DESK_COLUMN_CENTER_XS = [336, 586, 836, 1086, 1336];
export const DESK_ROW_CENTER_YS = [430, 590, 750];

export interface DeskLayerHandle {
  layer: Container;
  rowLayers: Container[];
}

const createDeskMatrix = (deskTexture: Texture) => {
  const deskLayer = new Container();
  const rowLayers: Container[] = [];

  for (let row = 0; row < DESK_ROWS; row += 1) {
    const rowLayer = new Container();
    rowLayers.push(rowLayer);
    deskLayer.addChild(rowLayer);

    for (let column = 0; column < DESK_COLUMNS; column += 1) {
      const desk = new Sprite(deskTexture);

      // 桌子是办公室里的视觉工位资产：位置影响员工、工位交互点和装饰物的视觉对齐，不直接影响经营数值。
      // 行容器只影响前后排遮挡：后一排桌面和电脑会盖住前一排员工/椅子下探，不改变工位数据。
      desk.anchor.set(0.5);
      desk.width = DESK_DISPLAY_WIDTH;
      desk.height = DESK_DISPLAY_HEIGHT;
      desk.x = DESK_COLUMN_CENTER_XS[column];
      desk.y = DESK_ROW_CENTER_YS[row];
      rowLayer.addChild(desk);
    }
  }

  return { layer: deskLayer, rowLayers };
};

async function createDeskLayer(): Promise<DeskLayerHandle> {
  const deskTexture = await Assets.load<Texture>(DESK_SRC);

  return createDeskMatrix(deskTexture);
}

export default createDeskLayer;
