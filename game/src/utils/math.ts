export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Interpolation indépendante du framerate. */
export const damp = (a: number, b: number, lambda: number, dt: number): number =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));
export const rand = (min: number, max: number): number => min + Math.random() * (max - min);
export const randInt = (min: number, max: number): number => Math.floor(rand(min, max + 1));
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
export type Range = readonly [number, number];
export const inRange = (r: Range): number => rand(r[0], r[1]);

/** Convertit une liste de points [[x,y],…] en tableau plat, avec un facteur d'échelle. */
export const flatPoints = (pts: ReadonlyArray<readonly [number, number]>, scale = 1): number[] =>
  pts.flatMap(([x, y]) => [x * scale, y * scale]);
