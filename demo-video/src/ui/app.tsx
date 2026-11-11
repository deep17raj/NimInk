import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C} from '../theme';
import {SANS, SERIF} from '../fonts';

/* ---------- Device frame ---------- */
export const Phone: React.FC<{scale?: number; children: React.ReactNode; style?: React.CSSProperties; glow?: string}> = ({
  scale = 1,
  children,
  style,
  glow,
}) => (
  <div style={{width: 414 * scale, height: 868 * scale, position: 'relative', ...style}}>
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 414,
        height: 868,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        borderRadius: 60,
        background: '#0b0d1a',
        padding: 12,
        boxShadow: `0 40px 90px rgba(0,0,0,.45), 0 0 0 2px #2b3050 inset, 0 0 70px ${glow ?? 'rgba(5,130,202,.28)'}`,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 390,
          height: 844,
          borderRadius: 48,
          overflow: 'hidden',
          background: C.canvas,
          fontFamily: SANS,
        }}
      >
        <div className="n-app">{children}</div>
        <div
          style={{
            position: 'absolute',
            top: 11,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 112,
            height: 32,
            borderRadius: 20,
            background: '#05060d',
            zIndex: 60,
          }}
        />
      </div>
    </div>
  </div>
);

export const Ic: React.FC<{d: string; size?: number; stroke?: number; color?: string; fill?: boolean}> = ({
  d,
  size = 22,
  stroke = 1.8,
  color = 'currentColor',
  fill = false,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : 'none'} stroke={fill ? 'none' : color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export const ICON = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  homeFill: 'M12 2.1L1 12h3v9h7v-6h2v6h7v-9h3L12 2.1z',
  requests: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  coin: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  plus: 'M12 4v16m8-8H4',
  back: 'M15 19l-7-7 7-7',
  check: 'M5 13l4 4L19 7',
  trend: 'M4 17l5-5 4 3 7-8M14 7h6v6',
  lock: 'M8 10V7a4 4 0 118 0v3M6 10h12a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7a2 2 0 012-2z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  shield: 'M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3z',
  pen: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  share: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
  heart: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  x: 'M6 18L18 6M6 6l12 12',
  arrow: 'M13 7l5 5m0 0l-5 5m5-5H6',
};

/* ---------- Pieces ---------- */
export const StatusBar: React.FC = () => (
  <div className="n-status">
    <span>9:41</span>
    <span style={{display: 'flex', gap: 6, alignItems: 'center', fontSize: 12}}>
      <span style={{width: 18, height: 10, border: '1.6px solid #1a1a1a', borderRadius: 3, position: 'relative'}}>
        <span style={{position: 'absolute', inset: 1.5, background: '#1a1a1a', borderRadius: 1}} />
      </span>
    </span>
  </div>
);

export const AppBar: React.FC<{title?: string; back?: boolean; home?: boolean; menu?: boolean}> = ({title, back, home, menu}) => (
  <div className="n-head" style={{height: 56}}>
    <div style={{width: 40, color: '#444'}}>{back ? <Ic d={ICON.back} stroke={2} /> : menu ? <Ic d={ICON.menu} /> : null}</div>
    <span style={{fontSize: 15, fontWeight: 700}}>{title}</span>
    <div style={{width: 40, color: '#444', display: 'flex', justifyContent: 'flex-end'}}>{home ? <Ic d={ICON.home} /> : null}</div>
  </div>
);

export const BottomNav: React.FC<{active: 'home' | 'requests' | 'write' | 'earnings' | 'profile'}> = ({active}) => {
  const items: {k: typeof active; d: string; label: string}[] = [
    {k: 'home', d: active === 'home' ? ICON.homeFill : ICON.home, label: 'Home'},
    {k: 'requests', d: ICON.requests, label: 'Requests'},
    {k: 'write', d: ICON.plus, label: 'Write'},
    {k: 'earnings', d: ICON.coin, label: 'Earnings'},
    {k: 'profile', d: ICON.user, label: 'Profile'},
  ];
  return (
    <div className="n-nav">
      {items.map((it) =>
        it.k === 'write' ? (
          <div key={it.k} style={{gap: 3}}>
            <span style={{width: 36, height: 36, borderRadius: 12, display: 'grid', placeItems: 'center', background: active === 'write' ? C.blue : C.navy, color: '#fff', boxShadow: '0 6px 14px rgba(31,35,72,.22)'}}>
              <Ic d={ICON.plus} size={20} stroke={2.5} />
            </span>
            <span style={{color: active === 'write' ? C.blue : '#6b7280'}}>{it.label}</span>
          </div>
        ) : (
          <div key={it.k} className={active === it.k ? 'on' : ''}>
            <Ic d={it.d} size={22} fill={it.k === 'home' && active === 'home'} />
            <span>{it.label}</span>
          </div>
        ),
      )}
    </div>
  );
};

export type Art = {
  author: string;
  ago: string;
  title: string;
  preview: string;
  min: number;
  reads: number;
  tip?: number;
  badge?: string;
  mine?: boolean;
};

export const ARTICLES: Art[] = [
  {author: 'Alex Rivera', ago: '2 hr ago', title: 'Why slow mornings make better writers', preview: 'The best sentences rarely arrive in a rush. Here is the small morning ritual that changed how I draft, edit and finish…', min: 6, reads: 1284, tip: 38, mine: true},
  {author: 'Maya Chen', ago: '5 hr ago', title: "A beginner's guide to staking NIM", preview: 'Staking lets you put idle NIM to work. Choose a validator, check the fee, and decide how much to stake…', min: 4, reads: 860, tip: 52},
  {author: 'Sam Okoye', ago: '1d ago', title: 'Inside the Nimiq blockchain: five ideas that matter', preview: 'From fast sync to proof-of-stake, these are the design choices that make Nimiq different from the rest…', min: 8, reads: 2140, tip: 91, badge: 'Premium article'},
  {author: 'Priya Nair', ago: '2d ago', title: 'Ten habits of consistent writers', preview: 'Consistency beats inspiration. These ten small habits keep a writing practice alive month after month…', min: 5, reads: 530, badge: 'Subscriber-only article'},
];

export const ArticleCardView: React.FC<{a: Art; glow?: number}> = ({a, glow = 0}) => (
  <div
    className="n-card"
    style={{padding: 16, borderColor: glow ? `rgba(5,130,202,${0.15 + glow * 0.5})` : undefined, boxShadow: glow ? `0 0 0 ${glow * 4}px rgba(5,130,202,.12), 0 10px 28px rgba(31,35,72,.1)` : undefined}}
  >
    <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10}}>
      <div className="n-av" style={{width: 32, height: 32, fontSize: 13}}>{a.author[0]}</div>
      <span style={{fontSize: 14, fontWeight: 600}}>{a.author}</span>
      <span style={{fontSize: 13, color: '#9ca3af', marginLeft: 'auto'}}>{a.ago}</span>
    </div>
    {(a.badge || a.mine) && (
      <div style={{display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap'}}>
        {a.badge && (
          <span className="n-chip" style={{background: '#eff6ff', color: '#1F5D91'}}>
            <Ic d={ICON.lock} size={13} /> {a.badge}
          </span>
        )}
        {a.mine && (
          <span className="n-chip" style={{background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ede9fe'}}>Written by you</span>
        )}
      </div>
    )}
    <div style={{fontSize: 17, fontWeight: 700, lineHeight: 1.35, marginBottom: 8}}>{a.title}</div>
    <div style={{fontSize: 14, color: '#6b7280', lineHeight: 1.55, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{a.preview}</div>
    <div className="n-btn">Read more</div>
    <div style={{display: 'flex', gap: 10, marginTop: 12, fontSize: 12, color: '#9ca3af'}}>
      <span>{a.min} min read</span>
      <span>· {a.reads.toLocaleString()} reads</span>
      {a.tip ? <span style={{marginLeft: 'auto', color: C.goldDeep, fontWeight: 600}}>{a.tip} NIM</span> : null}
    </div>
  </div>
);

/** Tap ripple (coordinates are in phone-screen px). */
export const Tap: React.FC<{x: number; y: number; at: number; hold?: number}> = ({x, y, at, hold = 18}) => {
  const f = useCurrentFrame();
  const t = f - at;
  if (t < -14 || t > hold + 10) return null;
  const appear = interpolate(t, [-14, -4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const press = interpolate(t, [-4, 0, 5], [1, 0.78, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rip = interpolate(t, [0, hold], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const out = interpolate(t, [hold, hold + 10], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const slide = interpolate(t, [-14, -2], [28, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: x, top: y, zIndex: 80, pointerEvents: 'none', opacity: appear * out}}>
      {t >= 0 && (
        <div style={{position: 'absolute', left: -30, top: -30, width: 60, height: 60, borderRadius: '50%', border: '3px solid rgba(233,178,19,.9)', transform: `scale(${0.3 + rip * 1.5})`, opacity: 1 - rip}} />
      )}
      <div
        style={{
          position: 'absolute',
          left: -17 + slide * 0.4,
          top: -17 + slide,
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.88)',
          border: '2px solid rgba(31,35,72,.35)',
          boxShadow: '0 6px 16px rgba(0,0,0,.28)',
          transform: `scale(${press})`,
        }}
      />
    </div>
  );
};

export const ToastView: React.FC<{msg: string; p: number}> = ({msg, p}) => (
  <div className="n-toast" style={{opacity: p, transform: `translateY(${(1 - p) * -22}px)`}}>
    <Ic d={ICON.check} size={16} stroke={2.6} /> {msg}
  </div>
);

export const PayoutSheet: React.FC<{amount: string; to: string; p: number; approving?: boolean; label?: string}> = ({amount, to, p, approving, label}) => (
  <>
    <div className="n-sheet-bg" style={{opacity: p}} />
    <div className="n-sheet" style={{transform: `translateY(${(1 - p) * 100}%)`}}>
      <div style={{width: 32, height: 4, borderRadius: 4, background: '#e5e7eb', margin: '0 auto 18px'}} />
      {label && <div className="n-chip" style={{background: '#fef3c7', color: '#92400e', display: 'flex', width: 'fit-content', margin: '0 auto 10px'}}>{label}</div>}
      <div style={{textAlign: 'center', fontSize: 36, fontWeight: 700, letterSpacing: -0.5, marginBottom: 18}}>{amount} NIM</div>
      <div style={{border: '1px solid #f0f2f7', borderRadius: 16, padding: 16, marginBottom: 18, fontSize: 14}}>
        <div style={{display: 'flex', justifyContent: 'space-between'}}>
          <span style={{color: '#9ca3af'}}>To</span>
          <b>{to}</b>
        </div>
        <div style={{height: 1, background: '#f0f2f7', margin: '12px 0'}} />
        <div style={{display: 'flex', justifyContent: 'space-between'}}>
          <span style={{color: '#9ca3af'}}>Fee</span>
          <b>0 NIM</b>
        </div>
      </div>
      <div style={{display: 'flex', gap: 12}}>
        <div className="n-btn-2" style={{flex: 1}}>Cancel</div>
        <div className="n-btn" style={{flex: 1, filter: approving ? 'brightness(1.15)' : undefined}}>{approving ? 'Approving…' : 'Approve'}</div>
      </div>
    </div>
  </>
);

/* ---------- Screens ---------- */
export const SplashScreen: React.FC = () => (
  <div className="n-app" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px'}}>
    <div style={{width: 64, height: 64, borderRadius: 16, background: '#1a1a1a', display: 'grid', placeItems: 'center', margin: '0 auto 22px'}}>
      <span style={{color: '#fff', fontSize: 26, fontWeight: 700}}>N</span>
    </div>
    <div style={{fontSize: 32, fontWeight: 700, letterSpacing: -0.5}}>NimInk</div>
    <div style={{color: C.blue, fontWeight: 600, marginTop: 4, fontSize: 16}}>Write. Earn. Stake.</div>
    <div style={{color: '#9ca3af', fontSize: 14, maxWidth: 280, margin: '38px 0 34px', lineHeight: 1.6}}>A writing platform for the Nimiq community</div>
    <div className="n-btn" style={{width: 300, minHeight: 50, fontSize: 15}}>Sign in with Nimiq Pay</div>
    <div style={{color: '#9ca3af', fontSize: 12, marginTop: 16, maxWidth: 300}}>Your keys stay in Nimiq Pay. Sign-in confirms your wallet address.</div>
  </div>
);

const HOME_ORDER: Record<number, number[]> = {0: [0, 1, 2, 3], 1: [2, 0, 1, 3], 2: [2, 1, 0, 3]};

export const HomeScreen: React.FC<{tab: 0 | 1 | 2; scroll?: number; glowCard?: number}> = ({tab, scroll = 0, glowCard = -1}) => {
  const labels = ['Latest', 'Popular', 'Top Tipped'];
  const order = HOME_ORDER[tab];
  return (
    <div className="n-app">
      <div style={{transform: `translateY(${-scroll}px)`, paddingTop: 48 + 52}}>
        <div style={{padding: '0 20px'}}>
          <div style={{position: 'relative', margin: '20px 0 18px'}}>
            <div className="n-input" style={{paddingLeft: 44, color: '#9ca3af'}}>Search...</div>
            <div style={{position: 'absolute', left: 14, top: 14, color: '#9ca3af'}}><Ic d={ICON.search} size={18} /></div>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 22, borderBottom: '1px solid #eef0f6'}}>
            {labels.map((l, i) => (
              <div key={l} style={{textAlign: 'center', paddingBottom: 12, fontSize: 14, fontWeight: 500, position: 'relative', color: tab === i ? '#111' : '#9ca3af'}}>
                {l}
                {tab === i && <span style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#111', borderRadius: 2}} />}
              </div>
            ))}
          </div>
          {order.map((idx, pos) => (
            <ArticleCardView key={`${tab}-${idx}`} a={ARTICLES[idx]} glow={glowCard === idx ? 1 : 0} />
          ))}
        </div>
      </div>
      <div style={{position: 'absolute', top: 0, left: 0, right: 0}}>
        <StatusBar />
        <div className="n-head"><Ic d={ICON.menu} size={22} /></div>
      </div>
      <BottomNav active="home" />
    </div>
  );
};

export const ReadScreen: React.FC<{tipSel: number; scroll?: number; quizP?: number}> = ({tipSel, scroll = 0, quizP = 0}) => (
  <div className="n-app" style={{background: '#fff'}}>
    <div style={{transform: `translateY(${-scroll}px)`, paddingTop: 56 + 48}}>
      <div style={{padding: '14px 24px 120px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14}}>
          <div className="n-av" style={{width: 36, height: 36, fontSize: 14}}>A</div>
          <div>
            <div style={{fontSize: 14, fontWeight: 600}}>Alex Rivera</div>
            <div style={{fontSize: 12, color: '#9ca3af'}}>6 min read · 2 hr ago</div>
          </div>
        </div>
        <div className="serif" style={{fontFamily: SERIF, fontSize: 27, fontWeight: 700, lineHeight: 1.25, marginBottom: 16}}>Why slow mornings make better writers</div>
        {[0.98, 1, 0.92, 1, 0.7].map((w, i) => (
          <div key={i} style={{height: 11, borderRadius: 6, background: '#eceef4', width: `${w * 100}%`, marginBottom: 11}} />
        ))}
        <div style={{height: 14}} />
        {[1, 0.95, 1, 0.85].map((w, i) => (
          <div key={i} style={{height: 11, borderRadius: 6, background: '#eceef4', width: `${w * 100}%`, marginBottom: 11}} />
        ))}
        <div style={{marginTop: 22, borderRadius: 16, border: '1px solid #e8ebf2', padding: 16, background: '#fafbff', opacity: quizP, transform: `translateY(${(1 - quizP) * 14}px)`}}>
          <div style={{fontSize: 12, fontWeight: 700, color: C.blue, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6}}>Quick comprehension check</div>
          <div style={{fontSize: 14, fontWeight: 600, marginBottom: 10}}>What helps the best sentences arrive?</div>
          {['Writing in a rush', 'A slow morning ritual', 'Skipping edits'].map((o, i) => (
            <div key={o} style={{padding: '9px 12px', borderRadius: 10, border: `1px solid ${i === 1 && quizP > 0.9 ? C.green : '#e5e7eb'}`, background: i === 1 && quizP > 0.9 ? C.greenSoft : '#fff', fontSize: 13, marginBottom: 6, color: i === 1 && quizP > 0.9 ? C.green : '#374151', fontWeight: i === 1 && quizP > 0.9 ? 700 : 500}}>
              {o}
            </div>
          ))}
        </div>
      </div>
    </div>
    <div style={{position: 'absolute', top: 0, left: 0, right: 0}}>
      <StatusBar />
      <AppBar back home />
    </div>
    <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #eef0f6', padding: '12px 14px 30px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 6}}>
      <span style={{fontSize: 14, fontWeight: 600, marginRight: 'auto', color: '#374151'}}>Tip the author</span>
      {[1, 5, 10].map((n) => (
        <span key={n} style={{padding: '7px 12px', borderRadius: 9, border: `1px solid ${tipSel === n ? C.blue : '#e5e7eb'}`, background: tipSel === n ? C.blueSoft : '#fff', color: tipSel === n ? C.blue : '#374151', fontSize: 13, fontWeight: 600}}>{n}</span>
      ))}
      <span style={{padding: '7px 12px', borderRadius: 9, background: '#1a1a1a', color: '#fff', fontSize: 13, fontWeight: 600}}>Custom</span>
    </div>
  </div>
);

export const WriteScreen: React.FC<{title: string; bodyLines: number; access: 'free' | 'subscription' | 'one_time'; price?: string}> = ({title, bodyLines, access, price}) => {
  const opt = (k: 'free' | 'subscription' | 'one_time', t1: string, t2: string) => (
    <div style={{display: 'flex', gap: 12, padding: 12, borderRadius: 16, border: `1.5px solid ${access === k ? C.blue : '#e5e7eb'}`, background: access === k ? '#fff' : 'rgba(255,255,255,.7)', marginBottom: 8, boxShadow: access === k ? '0 6px 16px rgba(5,130,202,.12)' : undefined}}>
      <span style={{width: 16, height: 16, borderRadius: '50%', border: `2px solid ${access === k ? C.blue : '#cbd5e1'}`, display: 'grid', placeItems: 'center', marginTop: 2, flexShrink: 0}}>
        {access === k && <span style={{width: 8, height: 8, borderRadius: '50%', background: C.blue}} />}
      </span>
      <span>
        <span style={{display: 'block', fontSize: 13, fontWeight: 600}}>{t1}</span>
        <span style={{display: 'block', fontSize: 11, color: '#6b7280', marginTop: 2}}>{t2}</span>
      </span>
    </div>
  );
  return (
    <div className="n-app" style={{background: '#fff'}}>
      <div style={{paddingTop: 48}}>
        <div className="n-head" style={{height: 56}}>
          <Ic d={ICON.x} />
          <span style={{fontSize: 18, fontWeight: 700}}>Your story</span>
          <span className="n-btn" style={{minHeight: 34, padding: '0 16px', fontSize: 13}}>Publish</span>
        </div>
        <div style={{padding: '14px 22px'}}>
          <div style={{fontFamily: SERIF, fontSize: 28, fontWeight: 700, lineHeight: 1.25, minHeight: 72}}>
            {title || <span style={{color: '#d1d5db'}}>Give your story a title…</span>}
            <span style={{display: 'inline-block', width: 2, height: 28, background: C.blue, marginLeft: 2, verticalAlign: 'middle'}} />
          </div>
          <div style={{display: 'flex', gap: 4, padding: 8, borderRadius: '14px 14px 0 0', background: '#f9fafb', border: '1px solid #f0f2f7', margin: '10px 0 10px'}}>
            {['B', 'I', 'U'].map((c) => (
              <span key={c} style={{width: 32, height: 32, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, fontStyle: c === 'I' ? 'italic' : undefined, textDecoration: c === 'U' ? 'underline' : undefined}}>{c}</span>
            ))}
          </div>
          {[1, 0.96, 0.9, 1, 0.6].slice(0, bodyLines).map((w, i) => (
            <div key={i} style={{height: 10, borderRadius: 6, background: '#eceef4', width: `${w * 100}%`, marginBottom: 10}} />
          ))}
          <div style={{height: 8}} />
          <div style={{fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8}}>Reader access</div>
          {opt('free', 'Free for everyone', 'Anyone can read the full article.')}
          {opt('subscription', 'Subscriber only', 'A 30-day subscription unlocks all your subscriber-only articles.')}
          {opt('one_time', 'Premium article' + (price ? ` · ${price} NIM` : ''), 'Readers unlock this article with a one-time payment.')}
        </div>
      </div>
      <div style={{position: 'absolute', top: 0, left: 0, right: 0}}><StatusBar /></div>
      <BottomNav active="write" />
    </div>
  );
};

export const RequestsScreen: React.FC = () => {
  const reqs = [
    {who: 'Maya', topic: 'Explain Nimiq staking for complete beginners', desc: 'A friendly 600-word guide with a simple example.', budget: '200', status: 'Open'},
    {who: 'Sam', topic: 'Five lessons from running a validator', desc: 'Personal story with practical tips and numbers.', budget: '150', status: 'Open'},
    {who: 'Priya', topic: 'How do micro-tips change a writer’s week?', desc: 'Interview style, reader perspective welcome.', budget: '90', status: 'In review'},
  ];
  return (
    <div className="n-app">
      <div style={{paddingTop: 100}}>
        <div style={{padding: '18px 20px'}}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', padding: 4, borderRadius: 16, border: '1px solid #e5e7eb', background: '#fff', marginBottom: 16}}>
            <div style={{borderRadius: 12, background: C.navy, color: '#fff', textAlign: 'center', padding: '11px 0', fontSize: 13, fontWeight: 600}}>Discover · 3</div>
            <div style={{textAlign: 'center', padding: '11px 0', fontSize: 13, fontWeight: 600, color: '#6b7280'}}>My requests · 1</div>
          </div>
          <div style={{fontSize: 16, fontWeight: 700}}>Open requests from others</div>
          <div style={{fontSize: 12, color: '#6b7280', margin: '4px 0 14px'}}>These topics are open for article submissions.</div>
          {reqs.map((r) => (
            <div key={r.topic} className="n-card" style={{padding: 14}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10}}>
                <div className="n-av" style={{width: 26, height: 26, fontSize: 10, background: '#eef3fa', color: '#42516b'}}>{r.who[0]}</div>
                <span style={{fontSize: 11, color: '#6b7280', fontWeight: 500}}>Requested by {r.who}</span>
                <span className="n-chip" style={{marginLeft: 'auto', background: r.status === 'Open' ? '#ecfdf5' : '#eff6ff', color: r.status === 'Open' ? '#047857' : '#1d4ed8', fontSize: 10}}>{r.status}</span>
              </div>
              <div style={{fontSize: 15, fontWeight: 700, lineHeight: 1.35}}>{r.topic}</div>
              <div style={{fontSize: 12, color: '#6b7280', marginTop: 5}}>{r.desc}</div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12}}>
                <span style={{color: C.goldDeep, fontWeight: 700}}>{r.budget} NIM budget</span>
                <span style={{color: '#9ca3af'}}>Due in 7 days</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{position: 'absolute', top: 0, left: 0, right: 0}}>
        <StatusBar />
        <div className="n-head" style={{height: 52}}>
          <span style={{fontSize: 18, fontWeight: 700}}>Requests</span>
          <span className="n-btn" style={{minHeight: 36, padding: '0 14px', fontSize: 13}}>Create request</span>
        </div>
      </div>
      <BottomNav active="requests" />
    </div>
  );
};

export const CreateRequestScreen: React.FC<{topic: string; desc: string; budget: string; deadline: string; submitHot?: boolean}> = ({topic, desc, budget, deadline, submitHot}) => {
  const field = (label: string, val: string, ph: string, tall?: boolean) => (
    <div style={{marginBottom: 14}}>
      <span className="n-label">{label}</span>
      <div className="n-input" style={{minHeight: tall ? 96 : 46, alignItems: tall ? 'flex-start' : 'center', color: val ? '#111' : '#9ca3af', lineHeight: 1.45}}>{val || ph}</div>
    </div>
  );
  return (
    <div className="n-app" style={{background: '#fff'}}>
      <div style={{paddingTop: 48 + 56}}>
        <div style={{padding: '14px 20px'}}>
          {field('Topic', topic, 'What do you want written about?')}
          {field('Description', desc, 'Details, requirements, style preferences...', true)}
          {field('Budget (NIM)', budget, '0')}
          {field('Deadline', deadline, 'dd/mm/yyyy')}
          <div className="n-btn" style={{marginTop: 8, minHeight: 50, boxShadow: submitHot ? '0 0 0 6px rgba(5,130,202,.18), 0 8px 20px rgba(5,130,202,.35)' : undefined}}>Create request</div>
        </div>
      </div>
      <div style={{position: 'absolute', top: 0, left: 0, right: 0}}>
        <StatusBar />
        <AppBar back home title="Create request" />
      </div>
    </div>
  );
};

export const EarningsScreen: React.FC<{total: number; wallet: number; tips: number; requests: number; subs: number; sales: number; staked: number; scroll?: number; ctaHot?: number}> = ({total, wallet, tips, requests, subs, sales, staked, scroll = 0, ctaHot = 0}) => {
  const f = (n: number) => n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const src = [
    {l: 'Tips', v: tips, bg: '#fffbeb', c: '#d97706', s: '＋'},
    {l: 'Requests', v: requests, bg: '#eff6ff', c: '#2563eb', s: '✎'},
    {l: 'Subscriptions', v: subs, bg: '#f5f3ff', c: '#7c3aed', s: '↻'},
    {l: 'Premium articles', v: sales, bg: '#ecfdf5', c: '#059669', s: '▤'},
  ];
  const acts = [
    ['Tip · Why slow mornings…', '+5.00', '＋'],
    ['Request awarded · Staking guide', '+200.00', '✎'],
    ['Subscription · Maya C.', '+12.00', '↻'],
    ['Premium article unlocked', '+8.50', '▤'],
  ];
  return (
    <div className="n-app">
      <div style={{transform: `translateY(${-scroll}px)`, paddingTop: 48 + 62}}>
        <div style={{padding: '18px 20px'}}>
          <div className="n-grad" style={{borderRadius: 24, padding: 20, marginBottom: 18, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#20264f,#172c58 50%,#0582CA)'}}>
            <div style={{position: 'absolute', right: -40, top: -64, width: 176, height: 176, borderRadius: '50%', border: '24px solid rgba(255,255,255,.06)'}} />
            <div style={{fontSize: 14, color: '#bfdbfe', fontWeight: 500}}>Total earned</div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6}}>
              <span style={{fontSize: 38, fontWeight: 700, letterSpacing: -1}}>{f(total)}</span>
              <span style={{fontSize: 14, color: '#bfdbfe', fontWeight: 600}}>NIM</span>
            </div>
            <div style={{marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div>
                <div style={{fontSize: 12, color: '#bfdbfe'}}>Available in wallet</div>
                <div style={{fontSize: 18, fontWeight: 600, marginTop: 2}}>{f(wallet)} <span style={{fontSize: 12, color: '#bfdbfe'}}>NIM</span></div>
              </div>
              <span style={{background: 'rgba(255,255,255,.15)', padding: '8px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600}}>Update balance</span>
            </div>
          </div>
          <div style={{fontWeight: 700, fontSize: 16}}>Income sources</div>
          <div style={{fontSize: 12, color: '#6b7280', margin: '2px 0 12px'}}>Your confirmed creator earnings</div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18}}>
            {src.map((s) => (
              <div key={s.l} className="n-card" style={{padding: 14, marginBottom: 0}}>
                <div style={{width: 36, height: 36, borderRadius: 12, background: s.bg, color: s.c, display: 'grid', placeItems: 'center', fontSize: 16, marginBottom: 10}}>{s.s}</div>
                <div style={{fontSize: 18, fontWeight: 700}}>{f(s.v)} <span style={{fontSize: 10, color: '#9ca3af'}}>NIM</span></div>
                <div style={{fontSize: 12, color: '#6b7280', marginTop: 2}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{display: 'flex', gap: 14, alignItems: 'center', padding: 14, borderRadius: 24, border: `1.5px solid ${ctaHot ? C.blue : '#dbeafe'}`, background: 'linear-gradient(90deg,#eff6ff,#fff)', marginBottom: 8, boxShadow: ctaHot ? `0 0 0 ${ctaHot * 7}px rgba(5,130,202,.14)` : undefined}}>
            <div style={{width: 48, height: 48, borderRadius: 16, background: C.navy, color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0}}>
              <Ic d={ICON.trend} size={24} />
            </div>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{fontWeight: 700, fontSize: 15}}>{staked > 0 ? 'Manage your stake' : 'Put NIM to work'}</div>
              <div style={{fontSize: 12, color: '#6b7280', marginTop: 2}}>{staked > 0 ? `${staked.toFixed(2)} NIM currently staked` : 'Choose a validator and stake from your wallet'}</div>
            </div>
            <span style={{background: C.navy, color: '#fff', borderRadius: 12, padding: '9px 12px', fontSize: 12, fontWeight: 600}}>{staked > 0 ? 'View stake' : 'Stake NIM'}</span>
          </div>
          <div style={{fontSize: 11, color: '#9ca3af', padding: '0 4px', marginBottom: 18, lineHeight: 1.4}}>Staking involves network lockup periods. Rewards vary by validator and are not guaranteed.</div>
          <div style={{borderRadius: 24, border: '1px solid #f0f2f7', background: '#fff', overflow: 'hidden'}}>
            <div style={{padding: '16px 16px 6px'}}>
              <div style={{fontWeight: 700}}>Recent activity</div>
              <div style={{fontSize: 12, color: '#6b7280'}}>Your latest confirmed earnings</div>
            </div>
            {acts.map(([t1, amt, ic]) => (
              <div key={t1} style={{display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: '1px solid #f3f4f6'}}>
                <span style={{width: 40, height: 40, borderRadius: 12, background: '#f9fafb', color: C.blue, display: 'grid', placeItems: 'center', fontWeight: 700}}>{ic}</span>
                <span style={{fontSize: 13, fontWeight: 600, flex: 1}}>{t1}</span>
                <span style={{fontSize: 13, fontWeight: 700, color: C.green}}>{amt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', top: 0, left: 0, right: 0}}>
        <StatusBar />
        <div className="n-head" style={{height: 62, justifyContent: 'space-between'}}>
          <div>
            <div style={{fontSize: 10, fontWeight: 700, letterSpacing: 1.6, color: C.blue, textTransform: 'uppercase'}}>Creator dashboard</div>
            <div style={{fontSize: 18, fontWeight: 700}}>Earnings</div>
          </div>
          <span style={{fontSize: 12, fontWeight: 700, color: C.blue}}>Refresh</span>
        </div>
      </div>
      <BottomNav active="earnings" />
    </div>
  );
};

export const VALIDATORS = [
  {name: 'NimPool Alpha', fee: 5, payout: 'Auto-restake', trust: 95},
  {name: 'StakeNIM Pro', fee: 3, payout: 'Direct payout', trust: 90},
  {name: 'Community Stakers', fee: 8, payout: 'Auto-restake', trust: 85},
];

export const StakeScreen: React.FC<{selected: number; amount: string; staked: number; rewards: number; available: number; scroll?: number; reviewHot?: number}> = ({selected, amount, staked, rewards, available, scroll = 0, reviewHot = 0}) => (
  <div className="n-app" style={{background: '#fff'}}>
    <div style={{transform: `translateY(${-scroll}px)`, paddingTop: 48 + 56}}>
      <div style={{padding: '18px 20px 40px'}}>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16}}>
          <div style={{borderRadius: 16, background: C.navy, color: '#fff', padding: 16}}>
            <div style={{fontSize: 12, color: '#bfdbfe'}}>Currently staked</div>
            <div style={{fontSize: 22, fontWeight: 700, marginTop: 4}}>{staked.toFixed(2)} <span style={{fontSize: 12, color: '#bfdbfe'}}>NIM</span></div>
          </div>
          <div style={{borderRadius: 16, background: '#ecfdf5', border: '1px solid #d1fae5', padding: 16}}>
            <div style={{fontSize: 12, color: '#047857'}}>Demo rewards earned</div>
            <div style={{fontSize: 22, fontWeight: 700, marginTop: 4, color: '#065f46'}}>{rewards.toFixed(2)} <span style={{fontSize: 12}}>NIM</span></div>
          </div>
        </div>
        <div style={{borderRadius: 16, border: '1px solid #fde68a', background: '#fffbeb', padding: 14, marginBottom: 18}}>
          <div style={{fontSize: 13, color: '#92400e', lineHeight: 1.45}}>Staking rewards vary and are not guaranteed. Staked NIM is locked; exiting requires multiple steps.</div>
        </div>
        <div className="n-section">Choose a validator</div>
        {VALIDATORS.map((v, i) => (
          <div key={v.name} style={{display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, border: `2px solid ${selected === i ? '#1a1a1a' : '#f0f2f7'}`, background: selected === i ? '#f9fafb' : '#fff', marginBottom: 10}}>
            <span style={{width: 24, height: 24, borderRadius: '50%', border: `2px solid ${selected === i ? '#1a1a1a' : '#d1d5db'}`, background: selected === i ? '#1a1a1a' : 'transparent', display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0}}>
              {selected === i && <Ic d={ICON.check} size={14} stroke={3} />}
            </span>
            <div style={{flex: 1}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600}}>
                <span>{v.name}</span>
                <span style={{fontSize: 12, color: '#9ca3af', fontWeight: 500}}>Fee: {v.fee}%</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', marginTop: 3}}>
                <span>{v.payout}</span>
                <span>Trust: {v.trust}%</span>
              </div>
            </div>
          </div>
        ))}
        <div className="n-section" style={{marginTop: 20, marginBottom: 4}}>Amount to stake</div>
        <div style={{fontSize: 12, color: '#9ca3af', marginBottom: 8}}>Minimum 100 NIM for first stake</div>
        <div className="n-input" style={{marginBottom: 8, borderColor: amount ? '#9ca3af' : '#e5e7eb'}}>{amount}{amount && <span style={{display: 'inline-block', width: 2, height: 18, background: C.blue, marginLeft: 1}} />}</div>
        <div style={{fontSize: 12, color: '#9ca3af', marginBottom: 18}}>Available: {available.toFixed(2)} NIM</div>
        <div className="n-btn" style={{minHeight: 50, boxShadow: reviewHot ? `0 0 0 ${reviewHot * 7}px rgba(5,130,202,.2), 0 8px 20px rgba(5,130,202,.35)` : undefined}}>Review stake</div>
        <div style={{marginTop: 24, borderRadius: 16, border: '1px solid #f0f2f7', background: '#f9fafb', padding: 16}}>
          <div style={{fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 6}}>How to exit a stake:</div>
          {['Deactivate your stake', 'Wait one full epoch', 'Retire the stake', 'Remove to get your NIM back'].map((t1, i) => (
            <div key={t1} style={{fontSize: 12, color: '#9ca3af', marginBottom: 3}}>{i + 1}. {t1}</div>
          ))}
        </div>
      </div>
    </div>
    <div style={{position: 'absolute', top: 0, left: 0, right: 0}}>
      <StatusBar />
      <AppBar back home title="Stake NIM" />
    </div>
  </div>
);
