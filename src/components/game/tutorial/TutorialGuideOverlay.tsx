import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

import type { TutorialAnchorId, TutorialCoach } from '../../../game/systems/tutorialSystem';
import { cn } from '../../../styles/tw';

interface TutorialGuideOverlayProps {
  coach?: TutorialCoach;
}

interface GuideRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface GuideCard {
  top: number;
  left: number;
  width: number;
  placement: 'top' | 'right' | 'bottom' | 'left';
}

interface GuideLayout {
  spotlight: GuideRect;
  card: GuideCard;
  anchorId: TutorialAnchorId;
}

interface VisibleAnchor {
  anchorId: TutorialAnchorId;
  element: HTMLElement;
}

const spotlightPadding = 10;
const viewportMargin = 12;
const cardGap = 18;
const maxCardWidth = 320;
const estimatedCardHeight = 172;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function anchorSelector(anchorId: TutorialAnchorId): string {
  return `[data-tutorial-anchor="${anchorId}"]`;
}

function isClosedRadixLayer(element: HTMLElement): boolean {
  return (
    element.getAttribute('data-state') === 'closed' &&
    (
      element.getAttribute('data-slot') === 'dialog-content' ||
      element.getAttribute('data-slot') === 'dialog-overlay'
    )
  );
}

function isElementVisible(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  if (
    rect.width <= 0 ||
    rect.height <= 0 ||
    rect.bottom <= 0 ||
    rect.right <= 0 ||
    rect.top >= window.innerHeight ||
    rect.left >= window.innerWidth
  ) {
    return false;
  }

  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    const style = window.getComputedStyle(current);
    if (
      current.hidden ||
      current.getAttribute('aria-hidden') === 'true' ||
      isClosedRadixLayer(current) ||
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      Number(style.opacity) === 0
    ) {
      return false;
    }
  }

  const centerX = clamp(rect.left + rect.width / 2, 0, window.innerWidth - 1);
  const centerY = clamp(rect.top + rect.height / 2, 0, window.innerHeight - 1);
  const hitElement = document.elementFromPoint(centerX, centerY);
  return Boolean(hitElement && (element === hitElement || element.contains(hitElement)));
}

function findVisibleAnchor(anchorIds: TutorialAnchorId[]): VisibleAnchor | undefined {
  for (const anchorId of anchorIds) {
    const elements = Array.from(document.querySelectorAll(anchorSelector(anchorId))).reverse();
    const element = elements.find(isElementVisible);
    if (element) {
      return { anchorId, element };
    }
  }

  return undefined;
}

function paddedSpotlight(rect: DOMRect): GuideRect {
  const top = clamp(
    Math.floor(rect.top - spotlightPadding),
    0,
    window.innerHeight,
  );
  const left = clamp(
    Math.floor(rect.left - spotlightPadding),
    0,
    window.innerWidth,
  );
  const right = clamp(
    Math.ceil(rect.right + spotlightPadding),
    0,
    window.innerWidth,
  );
  const bottom = clamp(
    Math.ceil(rect.bottom + spotlightPadding),
    0,
    window.innerHeight,
  );

  return {
    top,
    left,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function placeCard(spotlight: GuideRect): GuideCard {
  const width = Math.min(maxCardWidth, window.innerWidth - viewportMargin * 2);
  const centerX = spotlight.left + spotlight.width / 2;
  const centerY = spotlight.top + spotlight.height / 2;
  const canPlaceRight =
    spotlight.left + spotlight.width + cardGap + width <= window.innerWidth - viewportMargin;
  const canPlaceLeft = spotlight.left - cardGap - width >= viewportMargin;
  const canPlaceTop = spotlight.top - cardGap - estimatedCardHeight >= viewportMargin;

  if (canPlaceRight) {
    return {
      placement: 'right',
      width,
      left: spotlight.left + spotlight.width + cardGap,
      top: clamp(
        centerY - estimatedCardHeight / 2,
        viewportMargin,
        window.innerHeight - estimatedCardHeight - viewportMargin,
      ),
    };
  }
  if (canPlaceLeft) {
    return {
      placement: 'left',
      width,
      left: spotlight.left - cardGap - width,
      top: clamp(
        centerY - estimatedCardHeight / 2,
        viewportMargin,
        window.innerHeight - estimatedCardHeight - viewportMargin,
      ),
    };
  }
  if (canPlaceTop) {
    return {
      placement: 'top',
      width,
      left: clamp(centerX - width / 2, viewportMargin, window.innerWidth - width - viewportMargin),
      top: spotlight.top - cardGap - estimatedCardHeight,
    };
  }

  return {
    placement: 'bottom',
    width,
    left: clamp(centerX - width / 2, viewportMargin, window.innerWidth - width - viewportMargin),
    top: clamp(
      spotlight.top + spotlight.height + cardGap,
      viewportMargin,
      window.innerHeight - estimatedCardHeight - viewportMargin,
    ),
  };
}

const arrowClassByPlacement: Record<GuideCard['placement'], string> = {
  top: 'left-1/2 -bottom-9 -translate-x-1/2',
  right: '-left-9 top-1/2 -translate-y-1/2',
  bottom: 'left-1/2 -top-9 -translate-x-1/2',
  left: '-right-9 top-1/2 -translate-y-1/2',
};

const arrowIconByPlacement = {
  top: ArrowDown,
  right: ArrowLeft,
  bottom: ArrowUp,
  left: ArrowRight,
} satisfies Record<GuideCard['placement'], typeof ArrowDown>;

export function TutorialGuideOverlay({ coach }: TutorialGuideOverlayProps) {
  const anchorKey = useMemo(() => coach?.anchorIds.join('|') ?? '', [coach?.anchorIds]);
  const anchorIds = coach?.anchorIds ?? [];
  const [layout, setLayout] = useState<GuideLayout|undefined>();

  useEffect(() => {
    if (anchorIds.length === 0) {
      setLayout(undefined);
      return undefined;
    }

    let frameId = 0;
    let observedAnchor: HTMLElement | undefined;
    const resizeObserver = new ResizeObserver(() => scheduleMeasure());

    function measure() {
      const visibleAnchor = findVisibleAnchor(anchorIds);
      if (!visibleAnchor) {
        setLayout(undefined);
        return;
      }
      const { anchorId, element: anchor } = visibleAnchor;

      if (observedAnchor !== anchor) {
        if (observedAnchor) {
          resizeObserver.unobserve(observedAnchor);
        }
        resizeObserver.observe(anchor);
        observedAnchor = anchor;
      }

      const spotlight = paddedSpotlight(anchor.getBoundingClientRect());
      setLayout({
        spotlight,
        card: placeCard(spotlight),
        anchorId,
      });
    }

    function scheduleMeasure() {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(measure);
    }

    const mutationObserver = new MutationObserver(scheduleMeasure);
    resizeObserver.observe(document.body);
    mutationObserver.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('scroll', scheduleMeasure, true);
    scheduleMeasure();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('scroll', scheduleMeasure, true);
    };
  }, [anchorKey]);

  if (!coach || !layout || typeof document === 'undefined') {
    return null;
  }

  const { spotlight, card, anchorId } = layout;
  const ArrowIcon = arrowIconByPlacement[card.placement];
  const spotlightBottom = spotlight.top + spotlight.height;
  const spotlightRight = spotlight.left + spotlight.width;
  const bottomMaskHeight = Math.max(0, window.innerHeight - spotlightBottom);
  const rightMaskWidth = Math.max(0, window.innerWidth - spotlightRight);
  const closeDialogGuide = anchorId === 'dialog-close-button';
  const title = closeDialogGuide ? '关闭弹窗' : coach.title;
  const actionText = closeDialogGuide ? '点击右上角关闭按钮，回到主界面继续下一步。' : coach.actionText;
  const reasonText = closeDialogGuide ? '弹窗内动作已经完成，关闭后会继续指向新的目标。' : coach.reasonText;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden="true">
      <div
        className="fixed left-0 top-0 z-[60] bg-black/72"
        style={{ width: '100vw', height: spotlight.top }}
      />
      <div
        className="fixed left-0 z-[60] bg-black/72"
        style={{
          top: spotlightBottom,
          width: '100vw',
          height: bottomMaskHeight,
        }}
      />
      <div
        className="fixed left-0 z-[60] bg-black/72"
        style={{ top: spotlight.top, width: spotlight.left, height: spotlight.height }}
      />
      <div
        className="fixed z-[60] bg-black/72"
        style={{
          top: spotlight.top,
          left: spotlightRight,
          width: rightMaskWidth,
          height: spotlight.height,
        }}
      />
      <div
        className="fixed z-[61] rounded-lg border-2 border-[#ffd46a] shadow-[0_0_0_2px_rgba(255,212,106,0.32),0_0_34px_rgba(255,212,106,0.58),inset_0_0_26px_rgba(255,212,106,0.12)]"
        style={{
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
        }}
      />
      <section
        className="fixed z-[62] rounded-lg border-2 border-[#ffd46a] bg-[#17120a] p-4 text-[#fff3cd] shadow-[0_18px_60px_rgba(0,0,0,0.72),0_0_30px_rgba(255,212,106,0.36)]"
        style={{ top: card.top, left: card.left, width: card.width }}
      >
        <ArrowIcon
          className={cn(
            'absolute size-8 text-[#ffd46a] drop-shadow-[0_0_12px_rgba(255,212,106,0.7)]',
            arrowClassByPlacement[card.placement],
          )}
        />
        <p className="m-0 text-[11px] font-black text-[#ffcf5a]">新手引导</p>
        <h2 className="mb-2 mt-1 text-xl font-black leading-6 text-[#fff8df]">{title}</h2>
        <p className="m-0 text-[15px] font-black leading-6 text-[#fff3cd]">{actionText}</p>
        <p className="mb-0 mt-2 text-xs font-extrabold leading-5 text-[#d8cfbb]">
          {reasonText}
        </p>
      </section>
    </div>,
    document.body,
  );
}
