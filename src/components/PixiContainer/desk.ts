import { Application, Assets, Container, Sprite, type Texture } from 'pixi.js';

async function displayDesk(officeLayer: Container) {
  const DESK_SRC = '/desk.png';
  const [deskTexture] = await Promise.all([Assets.load<Texture>(DESK_SRC)]);
  const DESK_IMAGE_WIDTH = 1536;
  const DESK_IMAGE_HEIGHT = 1024;
  const DESK_COLUMNS = 5;
  const DESK_ROWS = 3;
  const DESK_DISPLAY_WIDTH = 460;
  const DESK_DISPLAY_HEIGHT = DESK_DISPLAY_WIDTH * (DESK_IMAGE_HEIGHT / DESK_IMAGE_WIDTH);
  const DESK_COLUMN_CENTER_XS = [336, 586, 836, 1086, 1336];
  const DESK_ROW_CENTER_YS = [430, 590, 750];
  const createDeskMatrix = (deskTexture: Texture) => {
    const deskLayer = new Container();

    for (let row = 0; row < DESK_ROWS; row += 1) {
      for (let column = 0; column < DESK_COLUMNS; column += 1) {
        const desk = new Sprite(deskTexture);

        // 桌子是办公室里的视觉工位资产：位置影响员工、工位交互点和装饰物的视觉对齐，不直接影响经营数值。
        // 后续若要把员工绑定到桌子，可以用 row/column 作为工位索引映射到招聘、项目分配等系统。
        desk.anchor.set(0.5);
        desk.width = DESK_DISPLAY_WIDTH;
        desk.height = DESK_DISPLAY_HEIGHT;
        desk.x = DESK_COLUMN_CENTER_XS[column];
        desk.y = DESK_ROW_CENTER_YS[row];
        deskLayer.addChild(desk);
      }
    }

    return deskLayer;
  };
  const deskLayer = createDeskMatrix(deskTexture);
  officeLayer.addChild(deskLayer);
}

export default displayDesk;
