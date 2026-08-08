/** Width-driven full-column count for the responsive multi-day day surface. */
export function responsiveDayColumnCount(
  availableWidth: number,
  minimumColumns = 1,
  idealColumnWidth = 220,
  axisWidth = 64,
  maximumColumns = 7,
): number {
  const minimum = Math.max(1, Math.round(minimumColumns));
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) return minimum;
  const target = Math.max(120, Number.isFinite(idealColumnWidth) ? idealColumnWidth : 220);
  const responsive = Math.floor(Math.max(0, availableWidth - Math.max(0, axisWidth)) / target);
  return Math.min(Math.max(minimum, maximumColumns), Math.max(minimum, responsive));
}
