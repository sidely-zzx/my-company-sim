import { Assets, Container, Sprite, type Texture } from 'pixi.js';
import {
  DESK_COLUMNS,
  DESK_COLUMN_CENTER_XS,
  DESK_DISPLAY_HEIGHT,
  DESK_DISPLAY_WIDTH,
  DESK_ROWS,
  DESK_ROW_CENTER_YS,
} from './desk';

const CHAIR_SRC = '/chair.png';
const CHAIR_IMAGE_WIDTH = 1536;
const CHAIR_IMAGE_HEIGHT = 1024;
const CHAIR_DISPLAY_WIDTH = DESK_DISPLAY_WIDTH * 0.8;
const CHAIR_DISPLAY_HEIGHT = CHAIR_DISPLAY_WIDTH * (CHAIR_IMAGE_HEIGHT / CHAIR_IMAGE_WIDTH);
const CHAIR_OFFSET_Y = DESK_DISPLAY_HEIGHT * 0.12;
const MAX_OCCUPIED_CHAIRS = DESK_COLUMNS * DESK_ROWS;

export interface ChairLayerHandle {
  layer: Container;
  setOccupiedEmployeeCount: (count: number) => void;
}

const createChairMatrix = (chairTexture: Texture) => {
  const chairLayer = new Container();
  const chairs: Sprite[] = [];

  for (let row = 0; row < DESK_ROWS; row += 1) {
    for (let column = 0; column < DESK_COLUMNS; column += 1) {
      const chair = new Sprite(chairTexture);

      // 椅子是每个桌子对应的前景工位资产：它遮挡桌子、显示器、电脑和桌面摆件等同工位物件。
      // 椅子位置跟随桌子坐标，影响员工坐姿、点击热区和后续工位状态的视觉对齐，不直接改变经营数值。
      chair.anchor.set(0.5);
      chair.width = CHAIR_DISPLAY_WIDTH;
      chair.height = CHAIR_DISPLAY_HEIGHT;
      chair.x = DESK_COLUMN_CENTER_XS[column] - 10;
      chair.y = DESK_ROW_CENTER_YS[row] + CHAIR_OFFSET_Y;
      chairs.push(chair);
      chairLayer.addChild(chair);
    }
  }

  return { chairLayer, chairs };
};

async function createChairLayer() {
  const chairTexture = await Assets.load<Texture>(CHAIR_SRC);
  const { chairLayer, chairs } = createChairMatrix(chairTexture);

  const setOccupiedEmployeeCount = (count: number) => {
    const occupiedCount = Math.max(0, Math.min(MAX_OCCUPIED_CHAIRS, count));

    chairs.forEach((chair, index) => {
      // 员工工作图已经包含椅子时，隐藏对应工位的独立椅子，避免同一把椅子被绘制两次。
      // 隐藏数量受在职员工数量影响，只改变视觉遮挡，不改变员工、工位或经营属性数据。
      chair.visible = index >= occupiedCount;
    });
  };

  return {
    layer: chairLayer,
    setOccupiedEmployeeCount,
  };
}

export default createChairLayer;
