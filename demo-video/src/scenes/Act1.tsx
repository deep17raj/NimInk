import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {C} from '../theme';
import {SANS, SERIF} from '../fonts';
import {Shell} from '../ui/Shell';
import {useBeat, useProgress, useSpr, ease, fmt, lerp} from '../ui/anim';
import {Avatar, Check, Coin, Counter, Floaty, Glass, Pill, Reveal, Words, draw} from '../ui/kit';
import {Ic, ICON, Tap} from '../ui/app';

/* =============== S01 — Meet Alex =============== */
const Stars: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {Array.from({length: 26}).map((_, i) => {
        const x = 20 + random(`st${i}`) * 440;
        const y = 20 + random(`sy${i}`) * 230;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(f / 18 + i));
        return <circle key={i} cx={x} cy={y} r={1 + random(`sr${i}`) * 2} fill="#fff" opacity={tw * 0.9} />;
      })}
    </>
  );
};

const AlexIllustration: React.FC = () => {
  const f = useCurrentFrame();
  const p = useSpr(4, 18, 90);
  const lines = [0.82, 0.95, 0.6, 0.9, 0.7, 0.85];
  const steam = (i: number) => ({
    opacity: 0.35 + 0.35 * Math.sin(f / 10 + i),
    transform: `translateY(${-((f * 0.8 + i * 14) % 40)}px)`,
  });
  return (
    <svg viewBox="0 0 900 720" width={900} height={720} style={{opacity: p, transform: `translateY(${(1 - p) * 40}px)`}}>
      <defs>
        <radialGradient id="lampG" cx="0.5" cy="0" r="1">
          <stop offset="0" stopColor="#FFE699" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFE699" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="screenG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10204a" />
          <stop offset="1" stopColor="#0b1433" />
        </linearGradient>
      </defs>
      {/* window */}
      <g transform="translate(60 20)">
        <rect width="480" height="270" rx="26" fill="#141a3a" stroke="#2b3469" strokeWidth="6" />
        <Stars />
        <circle cx="390" cy="76" r="38" fill="#F6E7A5" />
        <circle cx="408" cy="66" r="34" fill="#141a3a" />
        <line x1="240" y1="0" x2="240" y2="270" stroke="#2b3469" strokeWidth="6" />
      </g>
      {/* clock */}
      <g transform="translate(620 50)">
        <rect width="200" height="84" rx="18" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.18)" />
        <text x="100" y="56" textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize="44" fill="#fff">
          {f % 60 < 30 ? '2:47' : '2:47'}
          <tspan fontSize="20" dx="6" fill="#9db4ff">AM</tspan>
        </text>
      </g>
      {/* lamp light */}
      <polygon points="670,300 560,560 780,560" fill="url(#lampG)" opacity={0.7 + 0.1 * Math.sin(f / 9)} />
      {/* desk */}
      <rect x="40" y="560" width="820" height="26" rx="12" fill="#2b3469" />
      <rect x="90" y="586" width="26" height="130" fill="#222a57" />
      <rect x="784" y="586" width="26" height="130" fill="#222a57" />
      {/* lamp */}
      <g>
        <rect x="640" y="548" width="70" height="14" rx="7" fill="#3a447f" />
        <path d="M675 548 L700 420 L640 330" fill="none" stroke="#4b57a0" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M610 352 L670 300 L700 346 Z" fill={C.gold} />
        <circle cx="676" cy="342" r="10" fill="#FFF2B0" opacity={0.9} />
      </g>
      {/* person (back view) */}
      <g>
        <path d="M230 560 C230 470 300 430 360 430 C420 430 490 470 490 560 Z" fill="#2f4cc4" />
        <path d="M300 440 Q360 470 420 440" fill="none" stroke="#2540a3" strokeWidth="6" />
        <rect x="337" y="400" width="46" height="40" rx="14" fill="#e8b98e" />
        <circle cx="360" cy="370" r="52" fill="#e8b98e" />
        <path d="M306 362 C300 308 350 298 372 304 C410 304 424 336 414 372 C400 346 372 336 346 342 C328 346 316 352 306 362 Z" fill="#1d2149" />
      </g>
      {/* laptop */}
      <g>
        <path d="M410 560 L430 410 L700 410 L720 560 Z" fill="#c7cde6" />
        <path d="M424 418 L704 418 L714 548 L416 548 Z" fill="url(#screenG)" stroke="#5f73d8" strokeWidth="3" />
        {lines.map((w, i) => {
          const prog = interpolate(f, [18 + i * 26, 18 + i * 26 + 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return <rect key={i} x={446} y={440 + i * 18} width={(w * 232) * prog} height={7} rx={3.5} fill={i === 0 ? C.gold : '#6fb4ff'} opacity={0.9} />;
        })}
        <rect x="396" y="556" width="340" height="14" rx="7" fill="#aab3d9" />
      </g>
      {/* mug */}
      <g transform="translate(150 500)">
        <rect width="52" height="58" rx="10" fill="#f3f4f8" />
        <path d="M52 14 q22 4 0 30" fill="none" stroke="#f3f4f8" strokeWidth="8" />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${14 + i * 12} -6 q8 -14 0 -28`} stroke="#c9d3ff" strokeWidth="4" fill="none" strokeLinecap="round" style={steam(i)} />
        ))}
      </g>
      {/* crumpled drafts */}
      {Array.from({length: 6}).map((_, i) => {
        const t = ((f + i * 22) % 130) / 130;
        const x = lerp(600, 760 + i * 28, t);
        const y = 440 - Math.sin(t * Math.PI) * 200 + t * t * 120;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${t * 380 + i * 40})`} opacity={t < 0.85 ? 1 : (1 - t) / 0.15}>
            <rect x="-17" y="-17" width="34" height="34" rx="6" fill="#f1f3fb" />
            <path d="M-10 -6h20M-10 2h14M-10 9h18" stroke="#9aa3c7" strokeWidth="3" strokeLinecap="round" />
          </g>
        );
      })}
    </svg>
  );
};

const StatCard: React.FC<{at: number; value: React.ReactNode; label: string; color: string}> = ({at, value, label, color}) => (
  <Reveal at={at} y={36}>
    <Glass style={{padding: '22px 30px', minWidth: 250}}>
      <div style={{fontFamily: SANS, fontSize: 64, fontWeight: 800, color, letterSpacing: -2, lineHeight: 1}}>{value}</div>
      <div style={{fontFamily: SANS, fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.72)', marginTop: 8}}>{label}</div>
    </Glass>
  </Reveal>
);

const S01Body: React.FC = () => {
  const beat = useBeat();
  const b1 = beat('Hours of research');
  const b2 = beat('Countless drafts');
  const b3 = beat('Stories that');
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 110, top: 150}}>
        <Words text="Meet" at={10} size={190} color="#fff" serif highlight={{}} />
        <Words text="Alex." at={18} size={190} color={C.gold} serif />
        <Reveal at={36} y={20}>
          <div style={{fontFamily: SANS, fontSize: 32, color: 'rgba(255,255,255,.72)', fontWeight: 500, marginTop: 8}}>A writer. A laptop. A very late night.</div>
        </Reveal>
      </div>
      <div style={{position: 'absolute', left: 110, top: 640, display: 'flex', gap: 24}}>
        <StatCard at={b1} color="#7fc4ff" value={<Counter to={128} start={b1} end={b1 + 40} />} label="hours of research" />
        <StatCard at={b2} color={C.gold} value={<Counter to={27} start={b2} end={b2 + 36} />} label="drafts rewritten" />
        <StatCard at={b3} color="#9be7b8" value={<Counter to={1000} start={b3} end={b3 + 40} suffix="s" />} label="people it could help" />
      </div>
      <div style={{position: 'absolute', left: 940, top: 110}}>
        <AlexIllustration />
      </div>
    </AbsoluteFill>
  );
};
export const S01: React.FC = () => (
  <Shell sceneIndex={0} bg="dark">
    <S01Body />
  </Shell>
);

/* =============== S02 — Publish & readers discover =============== */
const S02Body: React.FC = () => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const bPub = beat('Alex hits publish');
  const bRead = beat('People read it');
  const bShare = beat('They share');
  const bThou = beat('Thousands');
  const pressed = f > bPub + 14;
  const rise = useSpr(bPub + 14, 12, 120);
  return (
    <AbsoluteFill>
      {/* browser */}
      <div style={{position: 'absolute', left: 120, top: 150}}>
        <Reveal at={4} y={50}>
          <div style={{width: 880, height: 640, borderRadius: 30, background: '#fff', overflow: 'hidden', boxShadow: '0 40px 90px rgba(0,0,0,.5)', position: 'relative'}}>
            <div style={{height: 56, background: '#eef0f6', display: 'flex', alignItems: 'center', padding: '0 22px', gap: 10}}>
              {['#ff6b6b', '#ffd166', '#3ddc97'].map((c) => (
                <span key={c} style={{width: 14, height: 14, borderRadius: '50%', background: c}} />
              ))}
              <div style={{marginLeft: 20, flex: 1, height: 32, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 16px', fontFamily: SANS, fontSize: 18, color: '#8a90a6'}}>my-draft / why-slow-mornings</div>
            </div>
            <div style={{padding: '34px 56px'}}>
              <div style={{fontFamily: SANS, fontSize: 18, fontWeight: 700, letterSpacing: 2, color: C.blue, textTransform: 'uppercase'}}>New story</div>
              <div style={{fontFamily: SERIF, fontSize: 52, fontWeight: 700, color: C.ink, lineHeight: 1.15, margin: '12px 0 20px'}}>Why slow mornings make better writers</div>
              {[1, 0.96, 0.9, 1, 0.74].map((w, i) => (
                <div key={i} style={{height: 15, borderRadius: 8, background: '#eceef4', width: `${w * 100}%`, marginBottom: 16}} />
              ))}
            </div>
            <div style={{position: 'absolute', right: 48, bottom: 40, display: 'flex', alignItems: 'center', gap: 16}}>
              {pressed && (
                <Pill bg={C.greenSoft} color={C.green} size={22} style={{transform: `scale(${rise})`}}>
                  <Check size={24} /> Live now
                </Pill>
              )}
              <div
                style={{
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: 28,
                  color: '#fff',
                  padding: '18px 44px',
                  borderRadius: 18,
                  background: pressed ? C.green : 'linear-gradient(120deg,#1F2348,#0582CA)',
                  transform: `scale(${f > bPub + 8 && f < bPub + 16 ? 0.93 : 1})`,
                  boxShadow: pressed ? '0 0 0 10px rgba(18,161,80,.18)' : '0 10px 24px rgba(5,130,202,.35)',
                }}
              >
                {pressed ? 'Published' : 'Publish'}
              </div>
            </div>
            <Tap x={735} y={567} at={bPub + 8} hold={16} />
          </div>
        </Reveal>
      </div>

      {/* reader bubbles */}
      {Array.from({length: 14}).map((_, i) => {
        const at = bRead + i * 5;
        const ang = (i / 14) * Math.PI * 2 + f / 220;
        const rx = 250 + (i % 3) * 36;
        const cx = 1400 + Math.cos(ang) * rx;
        const cy = 450 + Math.sin(ang) * (210 + (i % 2) * 26);
        const s = useSpr(at, 10, 120);
        const names = ['Mia', 'Noah', 'Zara', 'Leo', 'Ana', 'Ravi', 'Kai', 'Ivy', 'Omar', 'Eli', 'Sia', 'Tom', 'Uma', 'Joe'];
        return (
          <div key={i} style={{position: 'absolute', left: cx - 28, top: cy - 28, transform: `scale(${s})`, opacity: Math.min(1, s * 2)}}>
            <Avatar name={names[i]} size={56} hue={(i * 47) % 360} />
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 1230, top: 345}}>
        <Reveal at={bRead} y={30}>
          <Glass style={{padding: '24px 34px', width: 340, textAlign: 'center'}}>
            <div style={{fontFamily: SANS, color: 'rgba(255,255,255,.7)', fontSize: 22, fontWeight: 600, display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center'}}>
              <Ic d={ICON.eye} size={24} /> Reads
            </div>
            <div style={{fontFamily: SANS, fontSize: 76, fontWeight: 800, color: '#fff', letterSpacing: -2}}>
              <Counter to={12480} start={bRead} end={bThou + 60} />
            </div>
          </Glass>
        </Reveal>
      </div>
      {/* shares */}
      {[0, 1, 2, 3, 4].map((i) => {
        const t = interpolate(f, [bShare + i * 7, bShare + i * 7 + 50], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        return (
          <div key={i} style={{position: 'absolute', left: 1300 + i * 54, top: 330 - t * 190, opacity: t > 0 && t < 1 ? Math.sin(t * Math.PI) : 0, color: i % 2 ? C.gold : '#7fc4ff'}}>
            <Ic d={i % 2 ? ICON.heart : ICON.share} size={46} fill={i % 2 === 1} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
export const S02: React.FC = () => (
  <Shell sceneIndex={1} bg="dark">
    <S02Body />
  </Shell>
);

/* =============== S03 — The problem =============== */
const S03Body: React.FC = () => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const bDesp = beat('Despite');
  const bBarely = beat('Alex can barely');
  const p = useProgress(bDesp - 6, bDesp + 70);
  const w = 880;
  const h = 400;
  const readsPath = `M0 ${h} C ${w * 0.3} ${h - 20}, ${w * 0.55} ${h - 150}, ${w} ${h - 360}`;
  const earnPath = `M0 ${h} C ${w * 0.4} ${h - 4}, ${w * 0.7} ${h - 8}, ${w} ${h - 12}`;
  const shake = f > bBarely ? Math.sin(f * 1.7) * Math.max(0, 6 - (f - bBarely) / 6) : 0;
  const s2 = useSpr(bBarely, 12, 130);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 110, top: 70}}>
        <Words text="But there's one problem." at={6} size={112} color="#fff" serif highlight={{problem: '#ff7b80'}} gap={5} />
      </div>
      <div style={{position: 'absolute', left: 110, top: 300}}>
        <Reveal at={bDesp - 10}>
          <Glass style={{padding: 36, width: 1010}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: SANS, fontSize: 26, fontWeight: 600, marginBottom: 20, color: 'rgba(255,255,255,.8)'}}>
              <span style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <span style={{width: 18, height: 6, borderRadius: 3, background: '#4cb3ff'}} /> Reads
              </span>
              <span style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <span style={{width: 18, height: 6, borderRadius: 3, background: '#ff6b70'}} /> Earnings
              </span>
            </div>
            <svg width={w} height={h + 10} viewBox={`0 0 ${w} ${h + 10}`} style={{overflow: 'visible', marginLeft: 20}}>
              {[0, 1, 2, 3].map((i) => (
                <line key={i} x1="0" x2={w} y1={(h / 4) * i + 5} y2={(h / 4) * i + 5} stroke="rgba(255,255,255,.08)" />
              ))}
              <path d={readsPath} fill="none" stroke="#4cb3ff" strokeWidth="8" strokeLinecap="round" style={draw(1400, p)} />
              <path d={earnPath} fill="none" stroke="#ff6b70" strokeWidth="8" strokeLinecap="round" style={draw(1400, p)} />
              <circle cx={w} cy={h - 360} r="12" fill="#4cb3ff" opacity={p > 0.98 ? 1 : 0} />
              <circle cx={w} cy={h - 12} r="12" fill="#ff6b70" opacity={p > 0.98 ? 1 : 0} />
            </svg>
          </Glass>
        </Reveal>
      </div>
      <div style={{position: 'absolute', left: 1210, top: 320, width: 600}}>
        <Reveal at={bDesp + 10} y={30}>
          <div style={{fontFamily: SANS, fontSize: 28, fontWeight: 600, color: 'rgba(255,255,255,.7)'}}>Value created</div>
          <div style={{fontFamily: SANS, fontSize: 100, fontWeight: 800, color: '#6dc2ff', letterSpacing: -3}}>
            <Counter to={48213} start={bDesp} end={bDesp + 70} />
          </div>
          <div style={{fontFamily: SANS, fontSize: 28, fontWeight: 600, color: 'rgba(255,255,255,.7)'}}>reads</div>
        </Reveal>
        <div style={{transform: `translateX(${shake}px) scale(${0.6 + 0.4 * s2})`, opacity: s2, transformOrigin: 'left center', marginTop: 34}}>
          <div style={{fontFamily: SANS, fontSize: 28, fontWeight: 600, color: 'rgba(255,255,255,.7)'}}>Value earned</div>
          <div style={{fontFamily: SANS, fontSize: 100, fontWeight: 800, color: '#ff7b80', letterSpacing: -3}}>$0.12</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
export const S03: React.FC = () => (
  <Shell sceneIndex={2} bg="dark">
    <S03Body />
  </Shell>
);

/* =============== S04 — Platforms fail =============== */
const Card4: React.FC<{at: number; title: string; sub: string; accent: string; children: React.ReactNode}> = ({at, title, sub, accent, children}) => {
  const p = useSpr(at, 14, 110);
  const f = useCurrentFrame();
  const hl = Math.max(0, 1 - Math.abs(f - at - 20) / 55);
  return (
    <div style={{opacity: Math.min(1, p * 1.6), transform: `translateY(${(1 - p) * 70}px) scale(${0.94 + 0.06 * p})`}}>
      <Glass style={{width: 400, height: 560, padding: 28, borderColor: `rgba(255,255,255,${0.14 + hl * 0.3})`, boxShadow: `0 20px 50px rgba(0,0,0,.35), 0 0 ${hl * 50}px ${accent}55`}}>
        <div style={{height: 280, borderRadius: 20, background: 'rgba(0,0,0,.28)', display: 'grid', placeItems: 'center', overflow: 'hidden', position: 'relative'}}>{children}</div>
        <div style={{fontFamily: SANS, fontSize: 34, fontWeight: 800, color: '#fff', marginTop: 26, lineHeight: 1.15}}>{title}</div>
        <div style={{fontFamily: SANS, fontSize: 23, fontWeight: 500, color: 'rgba(255,255,255,.68)', marginTop: 10, lineHeight: 1.35}}>{sub}</div>
      </Glass>
    </div>
  );
};

const S04Body: React.FC = () => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const b = [beat('On one platform'), beat('On another'), beat('Some take'), beat('Others make')];
  const click = (f % 40) / 40;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 110, top: 80}}>
        <Words text="Platform after platform…" at={4} size={78} color="#fff" serif gap={6} />
      </div>
      <div style={{position: 'absolute', left: 90, top: 240, display: 'flex', gap: 34}}>
        <Card4 at={b[0]} title="Paid per click" sub="Income depends on ads and clicks, not on the value of your ideas." accent="#ffb020">
          <div style={{width: 300, height: 150, borderRadius: 14, background: 'linear-gradient(135deg,#ffb020,#ff6b35)', display: 'grid', placeItems: 'center', position: 'relative'}}>
            <span style={{fontFamily: SANS, fontWeight: 800, fontSize: 44, color: '#fff'}}>SALE!</span>
            <span style={{position: 'absolute', top: 8, right: 10, fontFamily: SANS, fontSize: 14, fontWeight: 700, background: 'rgba(0,0,0,.4)', color: '#fff', borderRadius: 6, padding: '2px 8px'}}>AD</span>
          </div>
          <div style={{position: 'absolute', left: 190 + Math.sin(f / 9) * 6, top: 150 + Math.cos(f / 9) * 6, transform: `scale(${1 - Math.max(0, 0.2 - Math.abs(click - 0.5)) * 1.2})`}}>
            <svg width="44" height="44" viewBox="0 0 24 24"><path d="M5 3l14 8-6 1.5L9.5 19z" fill="#fff" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" /></svg>
          </div>
        </Card4>
        <Card4 at={b[1]} title="At the algorithm's mercy" sub="A ranking system decides who gets seen. Great work can stay buried." accent="#8a7dff">
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, width: 300}}>
            {Array.from({length: 9}).map((_, i) => (
              <div key={i} style={{height: 64, borderRadius: 10, background: i === 8 ? 'rgba(233,178,19,.9)' : 'rgba(150,170,255,.55)', opacity: i === 8 ? 0.4 + 0.2 * Math.sin(f / 7) : 1, position: 'relative', border: i === 8 ? '2px dashed #fff' : undefined}}>
                {i === 8 && <span style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: SANS, fontWeight: 800, fontSize: 20, color: '#fff'}}>Alex</span>}
              </div>
            ))}
          </div>
        </Card4>
        <Card4 at={b[2]} title="Cut after cut" sub="Some platforms take a portion of every single earning." accent="#ff6b70">
          <svg width="220" height="220" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="90" fill="#4cb3ff" />
            <path d={`M110 110 L110 20 A90 90 0 0 1 ${110 + 90 * Math.sin(Math.PI * 1.2)} ${110 - 90 * Math.cos(Math.PI * 1.2)} Z`} fill="#ff6b70" transform={`translate(${Math.min(1, Math.max(0, (f - b[2]) / 20)) * 22} ${-Math.min(1, Math.max(0, (f - b[2]) / 20)) * 18})`} />
            <text x="110" y="128" textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize="34" fill="#fff">−cut</text>
          </svg>
        </Card4>
        <Card4 at={b[3]} title="No direct line" sub="It's hard to build a real relationship with your own readers." accent="#34d3a0">
          <svg width="320" height="160" viewBox="0 0 320 160">
            <circle cx="50" cy="80" r="34" fill="#4cb3ff" />
            <circle cx="270" cy="80" r="34" fill={C.gold} />
            <path d="M88 80 H140 M180 80 H232" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 12" />
            <path d="M146 58 L174 102 M174 58 L146 102" stroke="#ff6b70" strokeWidth="8" strokeLinecap="round" opacity={0.5 + 0.5 * Math.abs(Math.sin(f / 8))} />
          </svg>
        </Card4>
      </div>
    </AbsoluteFill>
  );
};
export const S04: React.FC = () => (
  <Shell sceneIndex={3} bg="dark">
    <S04Body />
  </Shell>
);

/* =============== S05 — The pie =============== */
const S05Body: React.FC = () => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const bR = beat('The reader');
  const bP = beat('The platform');
  const bC = beat('And the creator');
  const segs = [
    {v: 0.5, c: '#2f9cf0', at: bP},
    {v: 0.35, c: '#7a6bff', at: bP + 6},
    {v: 0.15, c: C.gold, at: bC},
  ];
  const R = 190;
  const circ = 2 * Math.PI * R;
  let acc = 0;
  const pulse = 0.5 + 0.5 * Math.sin(f / 5);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 110, top: 90}}>
        <Words text="Who gets the biggest slice?" at={4} size={84} color="#fff" serif gap={5} />
      </div>
      <div style={{position: 'absolute', left: 190, top: 270}}>
        <svg width={520} height={520} viewBox="0 0 520 520">
          <g transform="rotate(-90 260 260)">
            {segs.map((s, i) => {
              const len = circ * s.v;
              const p = Math.min(1, Math.max(0, (f - s.at) / 26));
              const eased = ease(p);
              const el = (
                <circle
                  key={i}
                  cx="260"
                  cy="260"
                  r={R}
                  fill="none"
                  stroke={s.c}
                  strokeWidth={i === 2 ? 74 + pulse * 10 : 74}
                  strokeDasharray={`${len * eased - 4} ${circ}`}
                  strokeDashoffset={-acc * circ}
                />
              );
              acc += s.v;
              return el;
            })}
          </g>
          <text x="260" y="256" textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize="48" fill="#fff">Revenue</text>
          <text x="260" y="296" textAnchor="middle" fontFamily={SANS} fontWeight={600} fontSize="24" fill="rgba(255,255,255,.6)">illustrative</text>
        </svg>
      </div>
      <div style={{position: 'absolute', left: 860, top: 250, width: 900, display: 'flex', flexDirection: 'column', gap: 26}}>
        {[
          {at: bR, name: 'Reader', val: 'Gets knowledge', c: '#6dc2ff', icon: ICON.eye},
          {at: bP, name: 'Platform', val: 'Gets revenue', c: '#7a6bff', icon: ICON.trend},
          {at: bC, name: 'Creator', val: 'Gets the smallest slice', c: C.gold, icon: ICON.pen},
        ].map((r, i) => (
          <Reveal key={r.name} at={r.at} x={80} y={0}>
            <Glass style={{padding: '26px 34px', display: 'flex', alignItems: 'center', gap: 28, borderColor: i === 2 ? `rgba(233,178,19,${0.4 + 0.5 * pulse})` : undefined}}>
              <div style={{width: 84, height: 84, borderRadius: 26, background: `${r.c}26`, color: r.c, display: 'grid', placeItems: 'center'}}>
                <Ic d={r.icon} size={46} />
              </div>
              <div>
                <div style={{fontFamily: SANS, fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.65)'}}>{r.name}</div>
                <div style={{fontFamily: SANS, fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: -1}}>{r.val}</div>
              </div>
              {i === 2 && <Coin size={64} style={{marginLeft: 'auto', transform: `scale(${0.8 + pulse * 0.12})`}} />}
            </Glass>
          </Reveal>
        ))}
      </div>
    </AbsoluteFill>
  );
};
export const S05: React.FC = () => (
  <Shell sceneIndex={4} bg="dark">
    <S05Body />
  </Shell>
);

/* =============== S06 — Millions of writers =============== */
const S06Body: React.FC = () => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const bM = beat('Millions');
  const bE = beat('Publishing');
  const bN = beat('Earning never');
  const cols = 38;
  const rows = 9;
  return (
    <AbsoluteFill>
      <AbsoluteFill>
        {Array.from({length: cols * rows}).map((_, i) => {
          const cx = i % cols;
          const ry = Math.floor(i / cols);
          const x = 60 + cx * 48.5;
          const y = 90 + ry * 52;
          const d = Math.hypot(cx - cols / 2, (ry - rows / 2) * 2.4);
          const s = useSpr(8 + d * 1.6, 14, 140);
          const lit = Math.sin(f / 14 - d * 0.55) > 0.8;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: 26,
                height: 26,
                borderRadius: '50%',
                transform: `scale(${s})`,
                background: lit ? C.gold : `hsl(${205 + (i % 5) * 10} 70% ${48 + (i % 3) * 6}%)`,
                opacity: lit ? 1 : 0.55,
              }}
            />
          );
        })}
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: 215, display: 'flex', justifyContent: 'center'}}>
        <Reveal at={bM - 6} y={30}>
          <div style={{padding: '24px 56px', borderRadius: 30, background: 'rgba(13,15,28,.88)', border: '1px solid rgba(255,255,255,.18)', boxShadow: '0 30px 80px rgba(0,0,0,.5)'}}>
            <div style={{fontFamily: SERIF, fontSize: 96, fontWeight: 700, color: '#fff', textAlign: 'center', letterSpacing: -2}}>
              Millions of <span style={{color: C.gold}}>independent writers</span>
            </div>
          </div>
        </Reveal>
      </div>
      <div style={{position: 'absolute', left: 130, top: 640, display: 'flex', gap: 50}}>
        <Reveal at={bE} y={50}>
          <Glass style={{width: 800, padding: '30px 38px', display: 'flex', alignItems: 'center', gap: 26}}>
            <Check size={72} />
            <div>
              <div style={{fontFamily: SANS, fontSize: 26, fontWeight: 600, color: 'rgba(255,255,255,.65)'}}>Publishing</div>
              <div style={{fontFamily: SANS, fontSize: 58, fontWeight: 800, color: '#fff'}}>Effortless</div>
            </div>
          </Glass>
        </Reveal>
        <Reveal at={bN} y={50}>
          <Glass style={{width: 800, padding: '30px 38px', display: 'flex', alignItems: 'center', gap: 26, borderColor: 'rgba(255,107,112,.5)'}}>
            <Check size={72} bad />
            <div>
              <div style={{fontFamily: SANS, fontSize: 26, fontWeight: 600, color: 'rgba(255,255,255,.65)'}}>Earning</div>
              <div style={{fontFamily: SANS, fontSize: 58, fontWeight: 800, color: '#ff8a8e'}}>Still complicated</div>
            </div>
          </Glass>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};
export const S06: React.FC = () => (
  <Shell sceneIndex={5} bg="dark">
    <S06Body />
  </Shell>
);

/* =============== S07 — What if (the turn) =============== */
const Strike: React.FC<{at: number; label: string}> = ({at, label}) => {
  const p = useProgress(at + 6, at + 22);
  const s = useSpr(at, 14, 120);
  return (
    <div style={{opacity: s, transform: `translateY(${(1 - s) * 30}px)`, position: 'relative'}}>
      <Pill bg="rgba(255,255,255,.1)" color="#fff" size={44} style={{border: '1px solid rgba(255,255,255,.25)'}}>
        <span style={{opacity: 1 - p * 0.6}}>{label}</span>
      </Pill>
      <div style={{position: 'absolute', left: 0, top: '50%', height: 6, width: `${p * 100}%`, background: C.red, borderRadius: 3, transform: 'translateY(-50%) rotate(-3deg)'}} />
    </div>
  );
};

const S07Body: React.FC = () => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const bI = beat('So imagine');
  const bW = beat('What if readers');
  const bAds = beat('No ads');
  const bAlg = beat('No algorithms');
  const bMid = beat('No middlemen');
  const bChain = beat('And what if writers');
  const bBlock = beat('blockchain');
  const grow = useProgress(bChain, bBlock + 50);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 110, top: 90}}>
        <Words text="Imagine a different world." at={bI} size={104} color="#fff" serif gap={5} highlight={{different: C.gold}} />
      </div>
      <div style={{position: 'absolute', left: 110, top: 330, width: 1000}}>
        <Words text="What if readers could reward writers directly?" at={bW} size={58} color="rgba(255,255,255,.92)" weight={600} gap={3} highlight={{directly: '#7fd0ff'}} />
      </div>
      <div style={{position: 'absolute', left: 110, top: 520, display: 'flex', gap: 22}}>
        <Strike at={bAds} label="Ads" />
        <Strike at={bAlg} label="Algorithms" />
        <Strike at={bMid} label="Middlemen" />
      </div>
      <div style={{position: 'absolute', left: 110, top: 680, width: 1000}}>
        <Words text="What if they could grow their earnings on the blockchain?" at={bChain} size={58} color="rgba(255,255,255,.92)" weight={600} gap={3} highlight={{grow: C.gold, blockchain: C.gold}} />
      </div>
      {/* growth visual */}
      <div style={{position: 'absolute', left: 1180, top: 120, width: 640, height: 700, opacity: Math.min(1, grow * 2)}}>
        <svg width="640" height="700" viewBox="0 0 640 700">
          <defs>
            <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.gold} stopOpacity="0.5" />
              <stop offset="1" stopColor={C.gold} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1="20" x2="620" y1={120 + i * 120} y2={120 + i * 120} stroke="rgba(255,255,255,.1)" />
          ))}
          <path d="M20 600 C140 590 200 560 300 480 C400 400 450 300 620 150 L620 640 L20 640 Z" fill="url(#areaG)" opacity={grow} />
          <path d="M20 600 C140 590 200 560 300 480 C400 400 450 300 620 150" fill="none" stroke={C.gold} strokeWidth="10" strokeLinecap="round" style={draw(900, grow)} />
        </svg>
        <div style={{position: 'absolute', left: 20 + grow * 560 - 56, top: 600 - grow * 470 - 70 + Math.sin(f / 8) * 5}}>
          <Coin size={112} spin={f * 2} />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <Floaty key={i} phase={i} amp={12} speed={0.8} style={{position: 'absolute', left: 60 + i * 130, top: 40 + (i % 2) * 40, opacity: grow}}>
            <Coin size={50 + i * 4} spin={i * 20 + f} />
          </Floaty>
        ))}
      </div>
    </AbsoluteFill>
  );
};
export const S07: React.FC = () => (
  <Shell sceneIndex={6} bg="navy">
    <S07Body />
  </Shell>
);
