import durations from '../public/vo/durations.json';
import scenes from '../scripts/scenes.json';

export const FPS = 30;
export const LEAD = 9; // frames of silence before narration starts
export const TAIL = 16; // frames of breathing room after narration
export const OV = 12; // cross-fade overlap between scenes

// Extra hold (frames) so visuals can land after the narration.
const EXTRA: Record<string, number> = {s08: 24, s14: 90, s15: 12, s17: 54};

export type SceneInfo = {id: string; text: string; dur: number; frames: number; start: number; index: number};

let cursor = 0;
export const SCENES: SceneInfo[] = scenes.map((s, index) => {
  const dur = (durations as Record<string, number>)[s.id];
  const frames = Math.ceil(dur * FPS) + LEAD + TAIL + (EXTRA[s.id] ?? 0);
  const info = {id: s.id, text: s.text, dur, frames, start: cursor, index};
  cursor += frames;
  return info;
});
export const TOTAL_FRAMES = cursor + OV;
