import { Container, Graphics, Sprite, type Texture, type Ticker } from 'pixi.js';
import type { EmployeeStatus } from '../../game/types';

type StaticEmployeePoseName = 'idle' | 'typingA' | 'phone' | 'cupDown' | 'cupUp' | 'smoke';
type EmployeePoseName = StaticEmployeePoseName | 'workTyping';
type EmployeeStationPoseName = EmployeePoseName | 'hidden';

interface PoseOffset {
  x: number;
  y: number;
}

interface EmployeeStationAnimationConfig {
  pose: EmployeeStationPoseName;
  nextPose?: StaticEmployeePoseName;
  frameSpeed: number;
  breatheRange: number;
  breatheSpeed: number;
  smokeVisible: boolean;
}

interface SmokeParticle {
  sprite: Graphics;
  offset: number;
}

export interface EmployeePoseTextures {
  idle: Texture;
  typingA: Texture;
  phone: Texture;
  cupDown: Texture;
  cupUp: Texture;
  smoke: Texture;
  workTypingFrames: Texture[];
}

export interface EmployeeStationAnimationHandle {
  effectLayer: Container;
  setStatus: (status?: EmployeeStatus) => void;
  update: (ticker: Ticker) => void;
}

const POSE_CELL_DISPLAY_HEIGHT = 300;
const POSE_OFFSET_X = 0;
const POSE_OFFSET_Y = 0;
const SMOKE_ORIGIN_X = 28;
const SMOKE_ORIGIN_Y = -52;
const POSE_OFFSETS: Record<EmployeePoseName, PoseOffset> = {
  idle: { x: 0, y: 0 },
  typingA: { x: 6, y: 0 },
  workTyping: { x: 6, y: 0 },
  phone: { x: 16, y: 0 },
  cupDown: { x: 0, y: 42 },
  cupUp: { x: 7, y: 42 },
  smoke: { x: -5, y: 42 },
};

const EMPLOYEE_STATION_ANIMATION_CONFIGS: Record<EmployeeStatus, EmployeeStationAnimationConfig> = {
  idle: {
    pose: 'idle',
    frameSpeed: 0,
    breatheRange: 0.7,
    breatheSpeed: 0.045,
    smokeVisible: false,
  },
  focused_work: {
    pose: 'workTyping',
    frameSpeed: 0.16,
    breatheRange: 0,
    breatheSpeed: 0,
    smokeVisible: false,
  },
  working: {
    pose: 'workTyping',
    frameSpeed: 0.1,
    breatheRange: 0,
    breatheSpeed: 0,
    smokeVisible: false,
  },
  slacking: {
    pose: 'phone',
    frameSpeed: 0,
    breatheRange: 0.65,
    breatheSpeed: 0.035,
    smokeVisible: false,
  },
  drinking_water: {
    pose: 'cupDown',
    nextPose: 'cupUp',
    frameSpeed: 0.035,
    breatheRange: 0.45,
    breatheSpeed: 0.032,
    smokeVisible: false,
  },
  smoking: {
    pose: 'smoke',
    frameSpeed: 0,
    breatheRange: 0.45,
    breatheSpeed: 0.03,
    smokeVisible: true,
  },
  toilet: {
    pose: 'hidden',
    frameSpeed: 0,
    breatheRange: 0,
    breatheSpeed: 0,
    smokeVisible: false,
  },
  job_browsing: {
    pose: 'phone',
    frameSpeed: 0,
    breatheRange: 0.6,
    breatheSpeed: 0.04,
    smokeVisible: false,
  },
  gaming: {
    pose: 'phone',
    frameSpeed: 0,
    breatheRange: 0.55,
    breatheSpeed: 0.048,
    smokeVisible: false,
  },
  fired: {
    pose: 'hidden',
    frameSpeed: 0,
    breatheRange: 0,
    breatheSpeed: 0,
    smokeVisible: false,
  },
};

const createSmokeParticles = () => Array.from({ length: 4 }, (_, index): SmokeParticle => {
  const sprite = new Graphics();

  // 烟雾粒子只补强 smoking 的视觉反馈：它跟随员工状态显示，不改变压力、满意度、处罚收益或项目进度。
  sprite
    .circle(0, 0, 2.6 + index * 0.25)
    .fill({ color: 0xf4f0df, alpha: 0.48 });
  sprite.visible = false;

  return {
    sprite,
    offset: index * 0.23,
  };
});

export const createEmployeeStationAnimation = (textures: EmployeePoseTextures): EmployeeStationAnimationHandle => {
  const effectLayer = new Container();
  const poseSprite = new Sprite(textures.idle);
  const smokeParticles = createSmokeParticles();
  let elapsedTime = 0;
  let currentStatus: EmployeeStatus | undefined;
  let currentPose: EmployeeStationPoseName = 'hidden';
  let currentTexture: Texture | undefined;

  poseSprite.anchor.set(0.5);
  poseSprite.height = POSE_CELL_DISPLAY_HEIGHT;
  poseSprite.width = POSE_CELL_DISPLAY_HEIGHT * (poseSprite.texture.width / poseSprite.texture.height);
  poseSprite.x = POSE_OFFSET_X;
  poseSprite.y = POSE_OFFSET_Y;
  poseSprite.visible = false;

  effectLayer.addChild(poseSprite);
  smokeParticles.forEach((particle) => effectLayer.addChild(particle.sprite));

  const resetSmoke = () => {
    smokeParticles.forEach((particle) => {
      particle.sprite.visible = false;
      particle.sprite.alpha = 0;
      particle.sprite.scale.set(1);
    });
  };

  const resolveTexture = (pose: EmployeeStationPoseName, config: EmployeeStationAnimationConfig): Texture | undefined => {
    if (pose === 'hidden') {
      return undefined;
    }

    if (pose === 'workTyping') {
      const frameIndex = Math.floor(elapsedTime * config.frameSpeed) % textures.workTypingFrames.length;

      return textures.workTypingFrames[frameIndex] ?? textures.typingA;
    }

    return textures[pose];
  };

  const setPoseTexture = (pose: EmployeeStationPoseName, config: EmployeeStationAnimationConfig) => {
    const nextTexture = resolveTexture(pose, config);

    if (currentPose === pose && currentTexture === nextTexture) {
      return;
    }

    currentPose = pose;
    currentTexture = nextTexture;
    poseSprite.visible = pose !== 'hidden';
    effectLayer.visible = pose !== 'hidden';

    if (pose === 'hidden' || !nextTexture) {
      return;
    }

    const offset = POSE_OFFSETS[pose];
    poseSprite.texture = nextTexture;
    poseSprite.height = POSE_CELL_DISPLAY_HEIGHT;
    poseSprite.width = POSE_CELL_DISPLAY_HEIGHT * (poseSprite.texture.width / poseSprite.texture.height);
    poseSprite.x = POSE_OFFSET_X + offset.x;
    poseSprite.y = POSE_OFFSET_Y + offset.y;
  };

  const selectPose = (config: EmployeeStationAnimationConfig): EmployeeStationPoseName => {
    if (!config.nextPose || config.pose === 'hidden' || config.pose === 'workTyping') {
      return config.pose;
    }

    // 喝水等状态继续用完整人物姿势做两帧循环：手臂已经画在人物身上，因此不会出现漂浮或袖口断开。
    // 工作状态改为播放单独的完整人物打字图集，只有图集里的手部像素变化，避免椅子和身体被整图帧差带着晃动。
    // 这里只影响办公室表现，真实产出、精力、满意度和处罚仍然由 EmployeeStatus 在游戏系统里结算。
    const frameIndex = Math.floor(elapsedTime * config.frameSpeed) % 2;

    return frameIndex === 0 ? config.pose : config.nextPose;
  };

  const setStatus = (status?: EmployeeStatus) => {
    currentStatus = status;
    elapsedTime = 0;
    resetSmoke();

    if (!status) {
      setPoseTexture('hidden', EMPLOYEE_STATION_ANIMATION_CONFIGS.idle);
      return;
    }

    setPoseTexture(EMPLOYEE_STATION_ANIMATION_CONFIGS[status].pose, EMPLOYEE_STATION_ANIMATION_CONFIGS[status]);
  };

  const updateSmoke = () => {
    smokeParticles.forEach((particle, index) => {
      const progress = (elapsedTime * 0.012 + particle.offset) % 1;
      const drift = Math.sin(elapsedTime * 0.035 + index * 1.7) * 5;

      particle.sprite.visible = true;
      particle.sprite.x = SMOKE_ORIGIN_X + drift;
      particle.sprite.y = SMOKE_ORIGIN_Y - progress * 42;
      particle.sprite.alpha = (1 - progress) * 0.42;
      particle.sprite.scale.set(0.55 + progress * 0.95);
    });
  };

  const update = (ticker: Ticker) => {
    if (!currentStatus) {
      return;
    }

    const config = EMPLOYEE_STATION_ANIMATION_CONFIGS[currentStatus];
    elapsedTime += ticker.deltaTime;
    const pose = selectPose(config);
    setPoseTexture(pose, config);

    if (pose !== 'hidden') {
      const offset = POSE_OFFSETS[pose];
      poseSprite.x = POSE_OFFSET_X + offset.x;
      poseSprite.y = POSE_OFFSET_Y + offset.y + Math.sin(elapsedTime * config.breatheSpeed) * config.breatheRange;
    }

    if (config.smokeVisible) {
      updateSmoke();
    }
  };

  return {
    effectLayer,
    setStatus,
    update,
  };
};
