import {
  AnimatedSprite,
  Assets,
  Container,
  Rectangle,
  Texture,
  type Ticker,
} from 'pixi.js';
import {
  DESK_COLUMNS,
  DESK_COLUMN_CENTER_XS,
  DESK_DISPLAY_HEIGHT,
  DESK_DISPLAY_WIDTH,
  DESK_ROWS,
  DESK_ROW_CENTER_YS,
} from './desk';

const WORKING_EMPLOYEE_JSON_SRC = '/employee/working_employee.json';
const WORKING_EMPLOYEE_IMAGE_FALLBACK_SRC = '/employee/working_employee.png';
const WORKING_EMPLOYEE_ATLAS_BASE_PATH = '/employee/';
const WORKING_EMPLOYEE_ANIMATION_NAME = 'typing';
const WORKING_EMPLOYEE_DISPLAY_WIDTH = DESK_DISPLAY_WIDTH * 0.4;
const WORKING_EMPLOYEE_DISPLAY_HEIGHT = WORKING_EMPLOYEE_DISPLAY_WIDTH;
const WORKING_EMPLOYEE_OFFSET_X = -20;
const WORKING_EMPLOYEE_OFFSET_Y = 0;
const WORKING_EMPLOYEE_ANIMATION_SPEED = 0;
const MAX_VISIBLE_EMPLOYEES = DESK_COLUMNS * DESK_ROWS;

interface WorkingEmployeeAtlasFrame {
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  spriteSourceSize?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  sourceSize?: {
    w: number;
    h: number;
  };
}

interface WorkingEmployeeAtlas {
  frames: Record<string, WorkingEmployeeAtlasFrame>;
  meta: {
    image: string;
  };
  animations: Record<string, string[]>;
}

export interface EmployeeLayerHandle {
  layer: Container;
  setActiveEmployeeCount: (count: number) => void;
  destroy: () => void;
}

const loadWorkingEmployeeAtlas = async () => {
  const response = await fetch(WORKING_EMPLOYEE_JSON_SRC);

  if (!response.ok) {
    throw new Error(`加载员工动画 JSON 失败：${WORKING_EMPLOYEE_JSON_SRC}`);
  }

  return response.json() as Promise<WorkingEmployeeAtlas>;
};

const loadWorkingEmployeeTexture = async (atlas: WorkingEmployeeAtlas) => {
  const imageSrc = `${WORKING_EMPLOYEE_ATLAS_BASE_PATH}${atlas.meta.image}`;

  try {
    return await Assets.load<Texture>(imageSrc);
  } catch {
    return Assets.load<Texture>(WORKING_EMPLOYEE_IMAGE_FALLBACK_SRC);
  }
};

const createWorkingEmployeeFrames = (atlas: WorkingEmployeeAtlas, baseTexture: Texture) => {
  const frameNames = atlas.animations[WORKING_EMPLOYEE_ANIMATION_NAME] ?? Object.keys(atlas.frames);

  return frameNames.map((frameName) => {
    const frameData = atlas.frames[frameName];

    if (!frameData) {
      throw new Error(`员工动画 JSON 缺少帧：${frameName}`);
    }

    const sourceSize = frameData.sourceSize ?? frameData.frame;
    const trim = frameData.spriteSourceSize
      ? new Rectangle(
        frameData.spriteSourceSize.x,
        frameData.spriteSourceSize.y,
        frameData.spriteSourceSize.w,
        frameData.spriteSourceSize.h,
      )
      : undefined;

    return new Texture({
      source: baseTexture.source,
      frame: new Rectangle(
        frameData.frame.x,
        frameData.frame.y,
        frameData.frame.w,
        frameData.frame.h,
      ),
      orig: new Rectangle(0, 0, sourceSize.w, sourceSize.h),
      trim,
    });
  });
};

const createWorkingEmployeeMatrix = (frames: Texture[]) => {
  const employeeLayer = new Container();
  const employees: AnimatedSprite[] = [];
  for (let row = 0; row < DESK_ROWS; row += 1) {
    for (let column = 0; column < DESK_COLUMNS; column += 1) {
      const employeeStationLayer = new Container();
      const employee = new AnimatedSprite({
        textures: frames,
        animationSpeed: WORKING_EMPLOYEE_ANIMATION_SPEED,
        autoUpdate: false,
        loop: true,
      });

      // 员工认真工作动画是工位状态的视觉反馈：显示数量受在职员工数量影响，不直接改变现金流、项目进度或满意度。
      // JSON 的 frame 去掉了人物两侧空白，spriteSourceSize/sourceSize 负责把人物放回虚拟画布中心，减少切帧左右晃动。
      employeeStationLayer.x = DESK_COLUMN_CENTER_XS[column] + WORKING_EMPLOYEE_OFFSET_X;
      employeeStationLayer.y = DESK_ROW_CENTER_YS[row] + WORKING_EMPLOYEE_OFFSET_Y;
      employee.anchor.set(0.5);
      employee.width = WORKING_EMPLOYEE_DISPLAY_WIDTH;
      employee.height = WORKING_EMPLOYEE_DISPLAY_HEIGHT;
      employee.visible = false;
      employee.play();

      employees.push(employee);
      employeeStationLayer.addChild(employee);
      employeeLayer.addChild(employeeStationLayer);
    }
  }

  return { employeeLayer, employees };
};

async function createEmployeeLayer(ticker: Ticker, activeEmployeeCount: number): Promise<EmployeeLayerHandle> {
  const atlas = await loadWorkingEmployeeAtlas();
  const baseTexture = await loadWorkingEmployeeTexture(atlas);
  const frames = createWorkingEmployeeFrames(atlas, baseTexture);
  const { employeeLayer, employees } = createWorkingEmployeeMatrix(frames);

  const setActiveEmployeeCount = (count: number) => {
    const visibleCount = Math.max(0, Math.min(MAX_VISIBLE_EMPLOYEES, count));

    employees.forEach((employee, index) => {
      employee.visible = index < visibleCount;
    });
  };

  const updateEmployees = (ticker: Ticker) => {
    employees.forEach((employee) => {
      if (employee.visible) {
        employee.update(ticker);
      }
    });
  };

  setActiveEmployeeCount(activeEmployeeCount);
  ticker.add(updateEmployees);

  return {
    layer: employeeLayer,
    setActiveEmployeeCount,
    destroy: () => {
      ticker.remove(updateEmployees);
    },
  };
}

export default createEmployeeLayer;
