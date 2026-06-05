import {
  AnimatedSprite,
  Assets,
  Container,
  Rectangle,
  Text,
  Texture,
  type Ticker,
} from 'pixi.js';
import type { EmployeeStatus } from '../../game/types';
import {
  DESK_COLUMNS,
  DESK_COLUMN_CENTER_XS,
  DESK_DISPLAY_HEIGHT,
  DESK_DISPLAY_WIDTH,
  DESK_ROWS,
  DESK_ROW_CENTER_YS,
} from './desk';
import { createEmployeeStationAnimation, type EmployeeStationAnimationHandle } from './employeeStationAnimation';

const WORKING_EMPLOYEE_JSON_SRC = '/employee/working_employee.json';
const WORKING_EMPLOYEE_IMAGE_FALLBACK_SRC = '/employee/working_employee.png';
const WORKING_EMPLOYEE_ATLAS_BASE_PATH = '/employee/';
const WORKING_EMPLOYEE_ANIMATION_NAME = 'typing';
const WORKING_EMPLOYEE_DISPLAY_WIDTH = DESK_DISPLAY_WIDTH * 0.4;
const WORKING_EMPLOYEE_DISPLAY_HEIGHT = WORKING_EMPLOYEE_DISPLAY_WIDTH;
const WORKING_EMPLOYEE_OFFSET_X = -20;
const WORKING_EMPLOYEE_OFFSET_Y = 0;
const STATUS_LABEL_OFFSET_Y = -58;
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
  setEmployees: (employeeViews: PixiEmployeeView[]) => void;
  destroy: () => void;
}

export interface PixiEmployeeView {
  id: string;
  name: string;
  status: EmployeeStatus;
  statusLabel: string;
}

interface EmployeeStation {
  layer: Container;
  employee: AnimatedSprite;
  animation: EmployeeStationAnimationHandle;
  statusText: Text;
  employeeId?: string;
  status?: EmployeeStatus;
}

function statusLabelColor(status: EmployeeStatus): number {
  if (status === 'focused_work' || status === 'working') {
    return 0x92d16e;
  }
  if (status === 'slacking' || status === 'job_browsing' || status === 'gaming') {
    return 0xffb86b;
  }
  if (status === 'smoking' || status === 'drinking_water' || status === 'toilet') {
    return 0x7fd4ff;
  }
  return 0xd8cfbb;
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

const createWorkingEmployeeMatrix = (frames: Texture[], onEmployeeClick: (employeeId: string) => void) => {
  const employeeLayer = new Container();
  const stations: EmployeeStation[] = [];
  for (let row = 0; row < DESK_ROWS; row += 1) {
    for (let column = 0; column < DESK_COLUMNS; column += 1) {
      const employeeStationLayer = new Container();
      const employee = new AnimatedSprite({
        textures: frames,
        animationSpeed: 0,
        autoUpdate: false,
        loop: true,
      });
      const animation = createEmployeeStationAnimation();

      const statusText = new Text({
        text: '',
        style: {
          fill: 0xd8cfbb,
          fontFamily: 'Arial, sans-serif',
          fontSize: 17,
          fontWeight: '700',
          stroke: { color: 0x111514, width: 4 },
        },
      });

      // 员工动画和头顶状态都是工位状态的视觉反馈：显示内容受员工列表、员工状态和点击热区影响，不直接改变现金流或项目进度。
      // JSON 的 frame 去掉了人物两侧空白，spriteSourceSize/sourceSize 负责把人物放回虚拟画布中心，减少切帧左右晃动。
      employeeStationLayer.x = DESK_COLUMN_CENTER_XS[column] + WORKING_EMPLOYEE_OFFSET_X;
      employeeStationLayer.y = DESK_ROW_CENTER_YS[row] + WORKING_EMPLOYEE_OFFSET_Y;
      employeeStationLayer.visible = false;
      employeeStationLayer.eventMode = 'none';
      employeeStationLayer.cursor = 'pointer';
      employeeStationLayer.hitArea = new Rectangle(
        -WORKING_EMPLOYEE_DISPLAY_WIDTH / 2,
        -WORKING_EMPLOYEE_DISPLAY_HEIGHT / 2 + STATUS_LABEL_OFFSET_Y,
        WORKING_EMPLOYEE_DISPLAY_WIDTH,
        WORKING_EMPLOYEE_DISPLAY_HEIGHT - STATUS_LABEL_OFFSET_Y,
      );
      employee.anchor.set(0.5);
      employee.width = WORKING_EMPLOYEE_DISPLAY_WIDTH;
      employee.height = WORKING_EMPLOYEE_DISPLAY_HEIGHT;
      employee.visible = false;
      employee.stop();
      statusText.anchor.set(0.5);
      statusText.y = STATUS_LABEL_OFFSET_Y;
      statusText.resolution = 2;

      const station: EmployeeStation = { layer: employeeStationLayer, employee, animation, statusText };
      employeeStationLayer.on('pointertap', () => {
        if (station.employeeId) {
          onEmployeeClick(station.employeeId);
        }
      });

      stations.push(station);
      employeeStationLayer.addChild(employee);
      employeeStationLayer.addChild(animation.effectLayer);
      employeeStationLayer.addChild(statusText);
      employeeLayer.addChild(employeeStationLayer);
    }
  }

  return { employeeLayer, stations };
};

async function createEmployeeLayer(
  ticker: Ticker,
  employeeViews: PixiEmployeeView[],
  onEmployeeClick: (employeeId: string) => void,
): Promise<EmployeeLayerHandle> {
  const atlas = await loadWorkingEmployeeAtlas();
  const baseTexture = await loadWorkingEmployeeTexture(atlas);
  const frames = createWorkingEmployeeFrames(atlas, baseTexture);
  const { employeeLayer, stations } = createWorkingEmployeeMatrix(frames, onEmployeeClick);

  const setEmployees = (nextEmployeeViews: PixiEmployeeView[]) => {
    const visibleEmployees = nextEmployeeViews.slice(0, MAX_VISIBLE_EMPLOYEES);

    stations.forEach((station, index) => {
      const employeeView = visibleEmployees[index];
      const visible = Boolean(employeeView);
      station.layer.visible = visible;
      station.layer.eventMode = visible ? 'static' : 'none';
      station.statusText.visible = visible;
      station.statusText.text = employeeView?.statusLabel ?? '';
      station.statusText.style.fill = employeeView ? statusLabelColor(employeeView.status) : 0xd8cfbb;

      const shouldResetAnimation = station.employeeId !== employeeView?.id || station.status !== employeeView?.status;
      station.employeeId = employeeView?.id;
      station.status = employeeView?.status;

      if (shouldResetAnimation) {
        // 工位动画受员工 ID 和状态共同影响：换人或状态变化时重置动作节奏和道具位置，避免上一名员工的烟雾、水杯位置残留。
        // 这里只更新 Pixi 表现层，不会修改员工、项目、合同或财务等游戏状态。
        station.animation.setStatus(employeeView?.status, station.employee);
      }
    });
  };

  const updateEmployees = (ticker: Ticker) => {
    stations.forEach((station) => {
      if (!station.layer.visible) {
        return;
      }

      if (station.employee.visible) {
        station.employee.update(ticker);
      }
      station.animation.update(ticker, station.employee);
    });
  };

  setEmployees(employeeViews);
  ticker.add(updateEmployees);

  return {
    layer: employeeLayer,
    setEmployees,
    destroy: () => {
      ticker.remove(updateEmployees);
    },
  };
}

export default createEmployeeLayer;
