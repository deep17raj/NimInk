import {createContext, useContext} from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {FPS, LEAD, SceneInfo} from '../timing';

export const SceneContext = createContext<SceneInfo>({id: '', text: '', dur: 1, frames: 30, start: 0, index: 0});
export const useScene = () => useContext(SceneContext);

/** Frame (scene-local) at which a phrase of the narration begins, estimated from character position. */
export function useBeat() {
  const s = useScene();
  const len = s.text.length;
  return (phrase: string, offset = 0): number => {
    const i = s.text.indexOf(phrase);
    const p = i < 0 ? 0 : i / len;
    return Math.max(0, Math.round(LEAD + p * s.dur * FPS + offset));
  };
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const ease = Easing.bezier(0.22, 1, 0.36, 1);

export function useSpr(delay = 0, damping = 16, stiffness = 110, mass = 0.8) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping, stiffness, mass}});
}

export function useProgress(start: number, end: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, end], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const fmt = (n: number, d = 0) =>
  n.toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});
