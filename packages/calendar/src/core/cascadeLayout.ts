export interface CascadeItem {
  id: string;
  lane: number;
  laneCount: number;
  startMinutes: number;
  endMinutes: number;
  textEndMinutes: number;
  preferredVisibleWidth: number;
  compactPreferredVisibleWidth?: number;
}

export interface CascadeFrame {
  x: number;
  width: number;
  visibleContentWidth: number;
}

/**
 * Width-independent Apple-style timed-card cascade. Units are arbitrary but consistent; the web
 * caller uses percentages while iOS uses pixels. Temporal lane assignment remains untouched.
 */
export function contentAwareCascadeFrames(
  items: readonly CascadeItem[],
  columnWidth = 100,
  outerGutter = 1.5,
  minimumVisibleWidth = 18,
): Map<string, CascadeFrame> {
  const result = new Map<string, CascadeFrame>();
  if (!Number.isFinite(columnWidth) || columnWidth <= 0 || items.length === 0) return result;
  const outer = Number.isFinite(outerGutter)
    ? Math.min(columnWidth / 2, Math.max(0, outerGutter))
    : 0;
  const usableWidth = Math.max(0, columnWidth - 2 * outer);
  const minimum = Number.isFinite(minimumVisibleWidth) ? Math.max(0, minimumVisibleWidth) : 0;
  const sorted = items
    .map((item, index) => ({ item, index }))
    .sort(
      (left, right) =>
        left.item.startMinutes - right.item.startMinutes ||
        right.item.endMinutes - left.item.endMinutes ||
        left.index - right.index,
    )
    .map(({ item }) => item);

  const components: CascadeItem[][] = [];
  let current: CascadeItem[] = [];
  let maxEnd = -Infinity;
  for (const item of sorted) {
    if (item.startMinutes >= maxEnd) {
      if (current.length) components.push(current);
      current = [item];
      maxEnd = item.endMinutes;
    } else {
      current.push(item);
      maxEnd = Math.max(maxEnd, item.endMinutes);
    }
  }
  if (current.length) components.push(current);

  for (const component of components) {
    const laneCount = Math.max(...component.map((item) => item.laneCount), 1);
    const equalWidth = usableWidth / laneCount;
    const stridesFor = (compact: boolean): number[] | null => {
      const strides = Array.from({ length: Math.max(0, laneCount - 1) }, () =>
        Math.min(minimum, equalWidth),
      );
      for (const behind of component.filter((item) => item.lane < laneCount - 1)) {
        if (behind.lane < 0) return null;
        const textEnd = Math.min(behind.endMinutes, behind.textEndMinutes);
        const covered = component.some(
          (front) =>
            front.lane > behind.lane &&
            front.startMinutes < textEnd &&
            front.endMinutes > behind.startMinutes,
        );
        if (!covered) continue;
        const preferred = compact
          ? (behind.compactPreferredVisibleWidth ?? behind.preferredVisibleWidth)
          : behind.preferredVisibleWidth;
        if (!Number.isFinite(preferred)) return null;
        strides[behind.lane] = Math.max(strides[behind.lane], Math.max(0, preferred));
      }
      const width = usableWidth - strides.reduce((sum, value) => sum + value, 0);
      return width >= equalWidth && !strides.some((stride) => stride > width) ? strides : null;
    };
    const cascading = stridesFor(false) ?? stridesFor(true);
    const sideBySide = cascading === null;
    const strides =
      cascading ?? Array.from({ length: Math.max(0, laneCount - 1) }, () => equalWidth);
    const width = sideBySide
      ? equalWidth
      : usableWidth - strides.reduce((sum, value) => sum + value, 0);
    const laneX = Array.from({ length: laneCount }, () => outer);
    for (let lane = 1; lane < laneCount; lane += 1)
      laneX[lane] = laneX[lane - 1] + strides[lane - 1];

    for (const item of component.filter((value) => value.lane >= 0 && value.lane < laneCount)) {
      let visibleContentWidth = width;
      if (!sideBySide) {
        const contentEnd = Math.min(item.endMinutes, item.textEndMinutes);
        const coveringX = component
          .filter(
            (front) =>
              front.lane > item.lane &&
              front.lane < laneCount &&
              front.startMinutes < contentEnd &&
              front.endMinutes > item.startMinutes,
          )
          .map((front) => laneX[front.lane]);
        if (coveringX.length)
          visibleContentWidth = Math.max(
            0,
            Math.min(width, Math.min(...coveringX) - laneX[item.lane]),
          );
      }
      result.set(item.id, { x: laneX[item.lane], width, visibleContentWidth });
    }
  }
  return result;
}
