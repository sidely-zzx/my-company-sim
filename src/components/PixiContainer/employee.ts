import { Assets, Container, Rectangle, Text, Texture, type Ticker } from 'pixi.js';
import type { EmployeeStatus } from '../../game/types';
import {
  DESK_COLUMNS,
  DESK_COLUMN_CENTER_XS,
  DESK_DISPLAY_WIDTH,
  DESK_ROWS,
  DESK_ROW_CENTER_YS,
} from './desk';
import {
  createEmployeeStationAnimation,
  type EmployeePoseTextures,
  type EmployeeStationAnimationHandle,
} from './employeeStationAnimation';

const EMPLOYEE_POSE_SHEET_SRC = '/employee/employee_pose_sheet.png';
const EMPLOYEE_POSE_SHEET_WIDTH = 1280;
const EMPLOYEE_POSE_SHEET_HEIGHT = 1280;
const EMPLOYEE_POSE_SHEET_COLUMNS = 4;
const EMPLOYEE_POSE_SHEET_ROWS = 2;
const EMPLOYEE_WORK_TYPING_SHEET_SRC = '/employee/employee_work_typing_sheet.png';
const EMPLOYEE_WORK_TYPING_SHEET_WIDTH = 1280;
const EMPLOYEE_WORK_TYPING_SHEET_HEIGHT = 640;
const EMPLOYEE_WORK_TYPING_SHEET_COLUMNS = 4;
const EMPLOYEE_HOTSPOT_WIDTH = DESK_DISPLAY_WIDTH * 0.4;
const EMPLOYEE_HOTSPOT_HEIGHT = EMPLOYEE_HOTSPOT_WIDTH;
const EMPLOYEE_OFFSET_X = -20;
const EMPLOYEE_OFFSET_Y = 0;
const STATUS_LABEL_OFFSET_Y = -58;
const MAX_VISIBLE_EMPLOYEES = DESK_COLUMNS * DESK_ROWS;

export interface EmployeeLayerHandle {
  layer: Container;
  rowLayers: Container[];
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

const createEmployeePoseTextures = (sheetTexture: Texture, workTypingSheetTexture: Texture): EmployeePoseTextures => {
  const cellWidth = EMPLOYEE_POSE_SHEET_WIDTH / EMPLOYEE_POSE_SHEET_COLUMNS;
  const cellHeight = EMPLOYEE_POSE_SHEET_HEIGHT / EMPLOYEE_POSE_SHEET_ROWS;
  const createCellTexture = (column: number, row: number) => new Texture({
    source: sheetTexture.source,
    frame: new Rectangle(column * cellWidth, row * cellHeight, cellWidth, cellHeight),
  });
  const workTypingCellWidth = EMPLOYEE_WORK_TYPING_SHEET_WIDTH / EMPLOYEE_WORK_TYPING_SHEET_COLUMNS;
  const createWorkTypingCellTexture = (column: number) => new Texture({
    source: workTypingSheetTexture.source,
    frame: new Rectangle(column * workTypingCellWidth, 0, workTypingCellWidth, EMPLOYEE_WORK_TYPING_SHEET_HEIGHT),
  });

  // 完整人物姿势表固定为 4x2 单元：每格已经包含身体、椅子、手臂和道具，避免再用独立手臂硬拼导致漂浮。
  // 这些贴图只供 Pixi 视觉层按员工状态切换，不进入存档，也不会影响员工状态判定或项目产出。
  return {
    idle: createCellTexture(0, 0),
    typingA: createCellTexture(1, 0),
    phone: createCellTexture(3, 0),
    cupDown: createCellTexture(0, 1),
    cupUp: createCellTexture(1, 1),
    smoke: createCellTexture(2, 1),
    // 工作/专注工作使用单独 4 帧完整人物图集：身体和椅子逐帧保持一致，只让手部像素变化。
    // 它只改变办公室动画表现，不影响项目进度、员工精力、满意度或任何经营结算。
    workTypingFrames: Array.from({ length: EMPLOYEE_WORK_TYPING_SHEET_COLUMNS }, (_, column) => (
      createWorkTypingCellTexture(column)
    )),
  };
};

const createEmployeePoseMatrix = (
  poseTextures: EmployeePoseTextures,
  onEmployeeClick: (employeeId: string) => void,
) => {
  const employeeLayer = new Container();
  const rowLayers: Container[] = [];
  const stations: EmployeeStation[] = [];
  for (let row = 0; row < DESK_ROWS; row += 1) {
    const rowLayer = new Container();
    rowLayers.push(rowLayer);
    employeeLayer.addChild(rowLayer);

    for (let column = 0; column < DESK_COLUMNS; column += 1) {
      const employeeStationLayer = new Container();
      const animation = createEmployeeStationAnimation(poseTextures);

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
      // 现在每个状态直接使用完整人物姿势帧，不再叠加独立手臂，避免手臂和肩部脱节。
      employeeStationLayer.x = DESK_COLUMN_CENTER_XS[column] + EMPLOYEE_OFFSET_X;
      employeeStationLayer.y = DESK_ROW_CENTER_YS[row] + EMPLOYEE_OFFSET_Y;
      employeeStationLayer.visible = false;
      employeeStationLayer.eventMode = 'none';
      employeeStationLayer.cursor = 'pointer';
      employeeStationLayer.hitArea = new Rectangle(
        -EMPLOYEE_HOTSPOT_WIDTH / 2,
        -EMPLOYEE_HOTSPOT_HEIGHT / 2 + STATUS_LABEL_OFFSET_Y,
        EMPLOYEE_HOTSPOT_WIDTH,
        EMPLOYEE_HOTSPOT_HEIGHT - STATUS_LABEL_OFFSET_Y,
      );
      statusText.anchor.set(0.5);
      statusText.y = STATUS_LABEL_OFFSET_Y;
      statusText.resolution = 2;

      const station: EmployeeStation = { layer: employeeStationLayer, animation, statusText };
      employeeStationLayer.on('pointertap', () => {
        if (station.employeeId) {
          onEmployeeClick(station.employeeId);
        }
      });

      stations.push(station);
      employeeStationLayer.addChild(animation.effectLayer);
      employeeStationLayer.addChild(statusText);
      rowLayer.addChild(employeeStationLayer);
    }
  }

  return { employeeLayer, rowLayers, stations };
};

async function createEmployeeLayer(
  ticker: Ticker,
  employeeViews: PixiEmployeeView[],
  onEmployeeClick: (employeeId: string) => void,
): Promise<EmployeeLayerHandle> {
  const [poseSheetTexture, workTypingSheetTexture] = await Promise.all([
    Assets.load<Texture>(EMPLOYEE_POSE_SHEET_SRC),
    Assets.load<Texture>(EMPLOYEE_WORK_TYPING_SHEET_SRC),
  ]);
  const poseTextures = createEmployeePoseTextures(poseSheetTexture, workTypingSheetTexture);
  const { employeeLayer, rowLayers, stations } = createEmployeePoseMatrix(poseTextures, onEmployeeClick);

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
        station.animation.setStatus(employeeView?.status);
      }
    });
  };

  const updateEmployees = (ticker: Ticker) => {
    stations.forEach((station) => {
      if (!station.layer.visible) {
        return;
      }

      station.animation.update(ticker);
    });
  };

  setEmployees(employeeViews);
  ticker.add(updateEmployees);

  return {
    layer: employeeLayer,
    rowLayers,
    setEmployees,
    destroy: () => {
      ticker.remove(updateEmployees);
    },
  };
}

export default createEmployeeLayer;
