import React from 'react';
import {interpolate, random, useCurrentFrame} from 'remotion';
import {C} from '../theme';
import {SANS, SERIF} from '../fonts';
import {ease, useSpr} from './anim';

/** Springs children in at a frame. */
export const Reveal: React.FC<{
  at?: number;
  y?: number;
  x?: number;
  from?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
  damping?: number;
}> = ({at = 0, y = 40, x = 0, from = 0.92, style, children, damping = 15}) => {
  const p = useSpr(at, damping, 110, 0.8);
  const op = Math.min(1, Math.max(0, p * 1.6));
  return (
    <div
      style={{
        opacity: op,
        transform: `translate(${(1 - p) * x}px, ${(1 - p) * y}px) scale(${from + (1 - from) * p})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Counter: React.FC<{
  from?: number;
  to: number;
  start: number;
  end: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}> = ({from = 0, to, start, end, decimals = 0, prefix = '', suffix = ''}) => {
  const f = useCurrentFrame();
  const v = interpolate(f, [start, end], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  return (
    <>
      {prefix}
      {v.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}
      {suffix}
    </>
  );
};

export const typed = (text: string, frame: number, start: number, cps = 22, fps = 30) => {
  const n = Math.max(0, Math.floor(((frame - start) / fps) * cps));
  return text.slice(0, n);
};

/** Words that pop in one by one. */
export const Words: React.FC<{
  text: string;
  at: number;
  gap?: number;
  size: number;
  color: string;
  serif?: boolean;
  weight?: number;
  highlight?: Record<string, string>;
  align?: 'left' | 'center';
  lineHeight?: number;
}> = ({text, at, gap = 4, size, color, serif, weight = 700, highlight = {}, align = 'left', lineHeight = 1.12}) => {
  const words = text.split(' ');
  return (
    <div style={{fontFamily: serif ? SERIF : SANS, fontSize: size, fontWeight: weight, lineHeight, textAlign: align, color, letterSpacing: -size * 0.01}}>
      {words.map((w, i) => (
        <Word key={i} at={at + i * gap} color={highlight[w.replace(/[.,?!]/g, '')] ?? color}>
          {w}
        </Word>
      ))}
    </div>
  );
};

const Word: React.FC<{at: number; color: string; children: React.ReactNode}> = ({at, color, children}) => {
  const p = useSpr(at, 14, 130, 0.7);
  return (
    <span style={{display: 'inline-block', opacity: Math.min(1, p * 1.8), transform: `translateY(${(1 - p) * 34}px)`, marginRight: '0.26em', color}}>
      {children}
    </span>
  );
};

/** Hexagon NIM coin. */
export const Coin: React.FC<{size?: number; spin?: number; style?: React.CSSProperties; label?: string}> = ({size = 80, spin = 0, style, label = 'NIM'}) => {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{filter: 'drop-shadow(0 8px 14px rgba(233,178,19,.45))', ...style}}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE699" />
          <stop offset="0.5" stopColor={C.gold} />
          <stop offset="1" stopColor="#B8870A" />
        </linearGradient>
      </defs>
      <g transform={`rotate(${spin} 50 50)`}>
        <path d="M50 4 L90 27 V73 L50 96 L10 73 V27 Z" fill={`url(#g${id})`} stroke="#8C6708" strokeWidth="2" strokeLinejoin="round" />
        <path d="M50 14 L81 32 V68 L50 86 L19 68 V32 Z" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2.5" strokeLinejoin="round" />
      </g>
      <text x="50" y="58" textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize="22" fill="#5b4004">
        {label}
      </text>
    </svg>
  );
};

export const Avatar: React.FC<{name: string; size?: number; hue?: number; style?: React.CSSProperties}> = ({name, size = 56, hue = 210, style}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      fontFamily: SANS,
      fontWeight: 700,
      fontSize: size * 0.42,
      color: '#fff',
      background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${hue + 30} 70% 40%))`,
      boxShadow: '0 8px 18px rgba(0,0,0,.25)',
      ...style,
    }}
  >
    {name[0]}
  </div>
);

export const Pill: React.FC<{children: React.ReactNode; bg: string; color: string; size?: number; style?: React.CSSProperties}> = ({children, bg, color, size = 26, style}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', gap: 10, padding: `${size * 0.35}px ${size * 0.8}px`, borderRadius: 999, background: bg, color, fontFamily: SANS, fontWeight: 700, fontSize: size, ...style}}>
    {children}
  </div>
);

export const Glass: React.FC<{children: React.ReactNode; style?: React.CSSProperties; dark?: boolean}> = ({children, style, dark = true}) => (
  <div
    style={{
      borderRadius: 28,
      background: dark ? 'rgba(255,255,255,0.07)' : '#fff',
      border: dark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(31,35,72,0.07)',
      boxShadow: dark ? '0 20px 50px rgba(0,0,0,0.35)' : '0 20px 50px rgba(31,35,72,0.12)',
      backdropFilter: 'blur(12px)',
      ...style,
    }}
  >
    {children}
  </div>
);

export const Floaty: React.FC<{children: React.ReactNode; amp?: number; speed?: number; phase?: number; style?: React.CSSProperties}> = ({children, amp = 10, speed = 1, phase = 0, style}) => {
  const f = useCurrentFrame();
  return <div style={{transform: `translateY(${Math.sin((f / 30) * speed * 2 + phase) * amp}px)`, ...style}}>{children}</div>;
};

/** Stroke draw helper: returns style for an SVG path drawn 0..1. */
export const draw = (len: number, p: number): React.CSSProperties => ({strokeDasharray: len, strokeDashoffset: len * (1 - p)});

export const rnd = (seed: string) => random(seed);

export const Check: React.FC<{size?: number; color?: string; bad?: boolean}> = ({size = 40, color, bad}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? (bad ? C.red : C.green)} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    {bad ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M5 13l4 4L19 7" />}
  </svg>
);
