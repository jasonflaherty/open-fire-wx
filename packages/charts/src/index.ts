/** Chart helpers — stub for future forecast / history views. */

export type SeriesPoint = {
  t: string;
  value: number;
};

export function emptySeries(): SeriesPoint[] {
  return [];
}
