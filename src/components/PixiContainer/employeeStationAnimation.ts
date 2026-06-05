import { Container, Graphics, type AnimatedSprite, type Ticker } from 'pixi.js';
import type { EmployeeStatus } from '../../game/types';

type EmployeeStationEffect = 'none' | 'phone' | 'cup' | 'smoke';

interface EmployeeStationAnimationConfig {
  animationSpeed: number;
  bodyVisible: boolean;
  effect: EmployeeStationEffect;
  bobRange: number;
  swayRange: number;
  swaySpeed: number;
}

interface PhoneEffect {
  layer: Container;
  screen: Graphics;
}

interface CupEffect {
  layer: Container;
}

interface SmokeEffect {
  layer: Container;
  cigarette: Graphics;
  particles: Graphics[];
}

export interface EmployeeStationAnimationHandle {
  effectLayer: Container;
  setStatus: (status?: EmployeeStatus, employee?: AnimatedSprite) => void;
  update: (ticker: Ticker, employee: AnimatedSprite) => void;
}

const PHONE_X = -58;
const PHONE_Y = 18;
const CUP_X = -54;
const CUP_FROM_Y = 20;
const CUP_TO_Y = -16;
const SMOKE_X = -66;
const SMOKE_Y = -8;

const EMPLOYEE_STATION_ANIMATION_CONFIGS: Record<EmployeeStatus, EmployeeStationAnimationConfig> = {
  idle: {
    animationSpeed: 0,
    bodyVisible: true,
    effect: 'none',
    bobRange: 0.9,
    swayRange: 0.08,
    swaySpeed: 0.045,
  },
  focused_work: {
    animationSpeed: 0.22,
    bodyVisible: true,
    effect: 'none',
    bobRange: 0.8,
    swayRange: 0.08,
    swaySpeed: 0.12,
  },
  working: {
    animationSpeed: 0.14,
    bodyVisible: true,
    effect: 'none',
    bobRange: 0.6,
    swayRange: 0.06,
    swaySpeed: 0.09,
  },
  slacking: {
    animationSpeed: 0.035,
    bodyVisible: true,
    effect: 'phone',
    bobRange: 1.4,
    swayRange: 0.65,
    swaySpeed: 0.04,
  },
  drinking_water: {
    animationSpeed: 0,
    bodyVisible: true,
    effect: 'cup',
    bobRange: 0.5,
    swayRange: 0.12,
    swaySpeed: 0.035,
  },
  smoking: {
    animationSpeed: 0,
    bodyVisible: true,
    effect: 'smoke',
    bobRange: 0.5,
    swayRange: 0.12,
    swaySpeed: 0.03,
  },
  toilet: {
    animationSpeed: 0,
    bodyVisible: false,
    effect: 'none',
    bobRange: 0,
    swayRange: 0,
    swaySpeed: 0,
  },
  job_browsing: {
    animationSpeed: 0.04,
    bodyVisible: true,
    effect: 'phone',
    bobRange: 1.2,
    swayRange: 0.55,
    swaySpeed: 0.045,
  },
  gaming: {
    animationSpeed: 0.05,
    bodyVisible: true,
    effect: 'phone',
    bobRange: 1,
    swayRange: 0.75,
    swaySpeed: 0.055,
  },
  fired: {
    animationSpeed: 0,
    bodyVisible: false,
    effect: 'none',
    bobRange: 0,
    swayRange: 0,
    swaySpeed: 0,
  },
};

const easeInOut = (value: number) => {
  const clampedValue = Math.max(0, Math.min(1, value));

  return clampedValue * clampedValue * (3 - 2 * clampedValue);
};

const createPhoneEffect = (): PhoneEffect => {
  const layer = new Container();
  const body = new Graphics();
  const screen = new Graphics();
  const button = new Graphics();

  // 手机只表现摸鱼、刷招聘软件和打游戏等非工作状态；它受员工 status 影响，但不会改变产出、罚款或满意度。
  body
    .roundRect(-8, -14, 16, 28, 4)
    .fill({ color: 0x1b2028 })
    .stroke({ width: 1.5, color: 0x06080b, alpha: 0.9 });
  screen
    .roundRect(-5, -10, 10, 19, 2)
    .fill({ color: 0x7fd4ff, alpha: 0.8 });
  button
    .circle(0, 10.5, 1.2)
    .fill({ color: 0xd8e7ef, alpha: 0.9 });

  layer.addChild(body);
  layer.addChild(screen);
  layer.addChild(button);
  layer.x = PHONE_X;
  layer.y = PHONE_Y;
  layer.rotation = -0.24;
  layer.visible = false;

  return { layer, screen };
};

const createCupEffect = (): CupEffect => {
  const layer = new Container();
  const body = new Graphics();
  const water = new Graphics();
  const handle = new Graphics();

  // 水杯表现喝水这种低严重度休息状态；视觉上提醒玩家员工短暂停工，实际精力、产出仍由员工系统按 status 结算。
  body
    .roundRect(-7, -10, 14, 20, 3)
    .fill({ color: 0xc6f0ff, alpha: 0.9 })
    .stroke({ width: 1.5, color: 0x34596d, alpha: 0.85 });
  water
    .roundRect(-4.5, -6, 9, 6, 2)
    .fill({ color: 0x48b7ff, alpha: 0.75 });
  handle
    .roundRect(5, -4, 6, 10, 4)
    .stroke({ width: 1.5, color: 0x9eddf3, alpha: 0.9 });

  layer.addChild(body);
  layer.addChild(water);
  layer.addChild(handle);
  layer.x = CUP_X;
  layer.y = CUP_FROM_Y;
  layer.visible = false;

  return { layer };
};

const createSmokeEffect = (): SmokeEffect => {
  const layer = new Container();
  const cigarette = new Graphics();
  const particles = Array.from({ length: 4 }, (_, index) => {
    const particle = new Graphics();
    const radius = 2.6 + index * 0.3;

    // 烟雾粒子只表达抽烟状态的视觉反馈；粒子生命周期不参与压力、满意度或劳动风险计算。
    particle
      .circle(0, 0, radius)
      .fill({ color: 0xf4f0df, alpha: 0.55 });
    particle.visible = false;

    return particle;
  });

  // 香烟道具让 smoking 状态在小尺寸下也能被识别；真实处罚和状态恢复仍走员工管理动作。
  cigarette
    .moveTo(-8, 0)
    .lineTo(8, 0)
    .stroke({ width: 2.5, color: 0xf2ead4, alpha: 0.95 })
    .circle(8.5, 0, 2)
    .fill({ color: 0xff8a3d, alpha: 0.9 });
  cigarette.x = SMOKE_X;
  cigarette.y = SMOKE_Y;
  cigarette.rotation = -0.28;

  layer.addChild(cigarette);
  particles.forEach((particle) => layer.addChild(particle));
  layer.visible = false;

  return { layer, cigarette, particles };
};

export const createEmployeeStationAnimation = (): EmployeeStationAnimationHandle => {
  const effectLayer = new Container();
  const phone = createPhoneEffect();
  const cup = createCupEffect();
  const smoke = createSmokeEffect();
  let elapsedTime = 0;
  let currentStatus: EmployeeStatus | undefined;

  effectLayer.addChild(phone.layer);
  effectLayer.addChild(cup.layer);
  effectLayer.addChild(smoke.layer);

  const setEffectVisibility = (effect: EmployeeStationEffect) => {
    phone.layer.visible = effect === 'phone';
    cup.layer.visible = effect === 'cup';
    smoke.layer.visible = effect === 'smoke';
    effectLayer.visible = effect !== 'none';
  };

  const resetEffects = () => {
    phone.layer.x = PHONE_X;
    phone.layer.y = PHONE_Y;
    phone.screen.alpha = 0.8;
    cup.layer.x = CUP_X;
    cup.layer.y = CUP_FROM_Y;
    cup.layer.rotation = 0;
    smoke.cigarette.alpha = 1;
    smoke.particles.forEach((particle) => {
      particle.visible = false;
      particle.alpha = 0;
      particle.scale.set(1);
    });
  };

  const resetEmployeePose = (employee?: AnimatedSprite) => {
    if (!employee) {
      return;
    }

    employee.x = 0;
    employee.y = 0;
    employee.rotation = 0;
    employee.alpha = 1;
  };

  const setStatus = (status?: EmployeeStatus, employee?: AnimatedSprite) => {
    currentStatus = status;
    elapsedTime = 0;
    resetEmployeePose(employee);
    resetEffects();

    if (!status) {
      setEffectVisibility('none');
      if (employee) {
        employee.visible = false;
        employee.stop();
      }
      return;
    }

    const config = EMPLOYEE_STATION_ANIMATION_CONFIGS[status];

    setEffectVisibility(config.effect);
    if (!employee) {
      return;
    }

    // 主人物帧动画只读取员工状态做表现：工作状态更快，摸鱼更慢，喝水/抽烟停在坐姿帧并由道具层表达动作。
    // 项目进度、甲方满意度、罚款收益等经营结果仍由 game/systems 根据 EmployeeStatus 计算。
    employee.visible = config.bodyVisible;
    employee.animationSpeed = config.animationSpeed;
    if (!config.bodyVisible) {
      employee.stop();
      return;
    }
    if (config.animationSpeed > 0) {
      employee.play();
    } else {
      employee.gotoAndStop(0);
    }
  };

  const updatePhone = () => {
    phone.layer.x = PHONE_X + Math.sin(elapsedTime * 0.04) * 1.2;
    phone.layer.y = PHONE_Y + Math.sin(elapsedTime * 0.07) * 0.8;
    phone.screen.alpha = 0.5 + (Math.sin(elapsedTime * 0.14) + 1) * 0.2;
  };

  const updateCup = () => {
    const cycle = (elapsedTime * 0.012) % 1;
    const lift = cycle < 0.34
      ? easeInOut(cycle / 0.34)
      : cycle < 0.54
        ? 1
        : cycle < 0.88
          ? 1 - easeInOut((cycle - 0.54) / 0.34)
          : 0;

    cup.layer.x = CUP_X + lift * 8;
    cup.layer.y = CUP_FROM_Y + (CUP_TO_Y - CUP_FROM_Y) * lift;
    cup.layer.rotation = -0.18 * lift;
  };

  const updateSmoke = () => {
    smoke.cigarette.alpha = 0.86 + Math.sin(elapsedTime * 0.08) * 0.12;
    smoke.particles.forEach((particle, index) => {
      const progress = (elapsedTime * 0.012 + index * 0.24) % 1;
      const drift = Math.sin(elapsedTime * 0.035 + index * 1.7) * 5;

      particle.visible = true;
      particle.x = SMOKE_X + 8 + drift;
      particle.y = SMOKE_Y - 8 - progress * 42;
      particle.alpha = (1 - progress) * 0.48;
      particle.scale.set(0.55 + progress * 0.95);
    });
  };

  const update = (ticker: Ticker, employee: AnimatedSprite) => {
    if (!currentStatus) {
      return;
    }

    const config = EMPLOYEE_STATION_ANIMATION_CONFIGS[currentStatus];
    elapsedTime += ticker.deltaTime;

    if (config.bodyVisible) {
      employee.x = Math.sin(elapsedTime * config.swaySpeed) * config.swayRange;
      employee.y = Math.sin(elapsedTime * config.swaySpeed * 1.8) * config.bobRange;
      employee.rotation = Math.sin(elapsedTime * config.swaySpeed * 0.7) * 0.012;
    }

    if (config.effect === 'phone') {
      updatePhone();
      return;
    }
    if (config.effect === 'cup') {
      updateCup();
      return;
    }
    if (config.effect === 'smoke') {
      updateSmoke();
    }
  };

  return {
    effectLayer,
    setStatus,
    update,
  };
};
