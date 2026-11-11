import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {C} from '../theme';
import {SANS} from '../fonts';
import {LEAD, OV, SCENES, FPS} from '../timing';
import {SceneContext} from './anim';

export type Bg = 'dark' | 'light' | 'navy';

const BACKGROUNDS: Record<Bg, string> = {
  dark: `radial-gradient(1200px 700px at 85% 10%, rgba(5,130,202,0.22), transparent 60%), radial-gradient(900px 600px at 5% 100%, rgba(31,35,72,0.9), transparent 65%), ${C.dark}`,
  light: `radial-gradient(1100px 700px at 90% 0%, rgba(5,130,202,0.12), transparent 60%), radial-gradient(900px 600px at 0% 100%, rgba(233,178,19,0.13), transparent 60%), ${C.canvas}`,
  navy: `radial-gradient(1000px 650px at 80% 105%, rgba(233,178,19,0.28), transparent 60%), radial-gradient(1000px 700px at 10% -10%, rgba(5,130,202,0.38), transparent 60%), linear-gradient(135deg, #1F2348 0%, #12162f 70%)`,
};

export const Particles: React.FC<{count?: number; color: string; seed?: string; speed?: number}> = ({
  count = 26,
  color,
  seed = 'p',
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: count}).map((_, i) => {
        const x = random(`${seed}x${i}`) * 1920;
        const size = 3 + random(`${seed}s${i}`) * 7;
        const sp = (0.25 + random(`${seed}v${i}`) * 0.6) * speed;
        const y0 = random(`${seed}y${i}`) * 1200;
        const y = 1160 - ((y0 + frame * sp * 2) % 1240);
        const o = 0.15 + random(`${seed}o${i}`) * 0.35;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x + Math.sin(frame / 40 + i) * 14,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              background: color,
              opacity: o,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const DotGrid: React.FC<{color: string}> = ({color}) => (
  <AbsoluteFill
    style={{
      backgroundImage: `radial-gradient(${color} 1.5px, transparent 1.6px)`,
      backgroundSize: '44px 44px',
      opacity: 0.55,
      maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 85%)',
      WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 85%)',
    }}
  />
);

/** Caption text, split into readable chunks and timed across the narration. */
function chunkText(text: string): string[] {
  const sentences = text.match(/[^.?!]+[.?!]+(\s|$)|[^.?!]+$/g)?.map((s) => s.trim()) ?? [text];
  const chunks: string[] = [];
  let buf = '';
  for (const s of sentences) {
    buf = buf ? `${buf} ${s}` : s;
    if (buf.length >= 34) {
      chunks.push(buf);
      buf = '';
    }
  }
  if (buf) {
    if (chunks.length && buf.length < 20) chunks[chunks.length - 1] += ` ${buf}`;
    else chunks.push(buf);
  }
  return chunks;
}

const Caption: React.FC<{text: string; dur: number; dark: boolean}> = ({text, dur, dark}) => {
  const frame = useCurrentFrame();
  const chunks = React.useMemo(() => chunkText(text), [text]);
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const span = dur * FPS;
  let acc = 0;
  let current = -1;
  let startF = 0;
  let endF = 0;
  chunks.forEach((c, i) => {
    const s = LEAD + (acc / total) * span;
    const e = LEAD + ((acc + c.length) / total) * span;
    if (frame >= s - 1 && frame < e) {
      current = i;
      startF = s;
      endF = e;
    }
    acc += c.length;
  });
  if (current < 0) return null;
  const inP = interpolate(frame, [startF, startF + 7], [0, 1], {extrapolateRight: 'clamp'});
  const outP = interpolate(frame, [endF - 4, endF], [1, 0], {extrapolateLeft: 'clamp'});
  const o = Math.min(inP, outP);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 46,
        display: 'flex',
        justifyContent: 'center',
        opacity: o,
        transform: `translateY(${(1 - inP) * 10}px)`,
      }}
    >
      <div
        style={{
          maxWidth: 1360,
          padding: '14px 30px',
          borderRadius: 18,
          fontFamily: SANS,
          fontSize: 31,
          fontWeight: 600,
          lineHeight: 1.3,
          textAlign: 'center',
          color: dark ? '#fff' : C.navy,
          background: dark ? 'rgba(10,12,28,0.62)' : 'rgba(255,255,255,0.82)',
          border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(31,35,72,0.08)',
          boxShadow: dark ? '0 10px 30px rgba(0,0,0,0.35)' : '0 10px 30px rgba(31,35,72,0.12)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {chunks[current]}
      </div>
    </div>
  );
};

export const Shell: React.FC<{
  sceneIndex: number;
  bg: Bg;
  children: React.ReactNode;
  particles?: boolean;
}> = ({sceneIndex, bg, children, particles = true}) => {
  const scene = SCENES[sceneIndex];
  const frame = useCurrentFrame();
  const total = scene.frames + OV;
  const fadeIn = sceneIndex === 0 ? 1 : interpolate(frame, [0, OV], [0, 1], {extrapolateRight: 'clamp'});
  const fadeOut =
    sceneIndex === SCENES.length - 1
      ? interpolate(frame, [total - 24, total], [1, 0], {extrapolateLeft: 'clamp'})
      : interpolate(frame, [total - OV, total], [1, 0], {extrapolateLeft: 'clamp'});
  const dark = bg !== 'light';
  return (
    <SceneContext.Provider value={scene}>
      <AbsoluteFill style={{opacity: Math.min(fadeIn, fadeOut), fontFamily: SANS}}>
        <AbsoluteFill style={{background: BACKGROUNDS[bg]}} />
        <DotGrid color={dark ? 'rgba(255,255,255,0.09)' : 'rgba(31,35,72,0.09)'} />
        {particles && <Particles color={dark ? '#7fb8ff' : C.blue} seed={scene.id} />}
        {children}
        <Caption text={scene.text} dur={scene.dur} dark={dark} />
        <Sequence from={LEAD}>
          <Audio src={staticFile(`vo/${scene.id}.wav`)} volume={1} />
        </Sequence>
      </AbsoluteFill>
    </SceneContext.Provider>
  );
};
