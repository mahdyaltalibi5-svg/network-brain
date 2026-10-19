/**
 * Scroll-scene targets shared between the scroll controller (ScrollTrigger,
 * always loaded on the homepage) and the WebGL scene (lazy). Plain numbers;
 * the render loop damps toward them.
 */
export const scenes = {
  process: 0, // 0–1: jacket → trail with camps
  camp: 1, // active process step (continuous, 1–5)
  anatomy: 0, // 0–1: exploded layers
  fabric: 0, // 0–1: woven swatches
  hide: 0, // 0–1: particles fade once the 3D sections are passed
  /** where the subject sits on screen (0–1), per section */
  frameX: 0.74,
  frameY: 0.52,
  /** camera yaw for the 3/4 exploded view */
  yaw: 0,
  /** camera distance multiplier (subjects sit smaller beside text columns) */
  zoom: 1,
};
export type Scenes = typeof scenes;
