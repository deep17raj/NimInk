import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, GRADIENT} from '../theme';
import {SANS, SERIF} from '../fonts';
import {Shell} from '../ui/Shell';
import {useBeat, useProgress, useSpr, lerp} from '../ui/anim';
import {Avatar, Check, Coin, Counter, Floaty, Glass, Pill, Reveal, Words, typed} from '../ui/kit';
import {
  CreateRequestScreen,
  EarningsScreen,
  HomeScreen,
  Ic,
  ICON,
  Phone,
  PayoutSheet,
  ReadScreen,
  RequestsScreen,
  SplashScreen,
  Tap,
  ToastView,
  WriteScreen,
} from '../ui/app';

const PH_SCALE = 0.96;
const PH_LEFT = 150;
const PH_TOP = 66;

/** Spring that goes in at `a` and out at `b` (0..1..0). */
function useWindow(a: number, b: number) {
  const inP = useSpr(a, 16, 130);
  const f = useCurrentFrame();
  const out = interpolate(f, [b - 8, b], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return inP * out;
}

const Feature: React.FC<{at: number; icon: string; title: string; sub: string; color: string; children?: React.ReactNode; active?: boolean}> = ({at, icon, title, sub, color, children, active}) => (
  <Reveal at={at} x={90} y={0}>
    <div
      style={{
        borderRadius: 30,
        background: '#fff',
        padding: '22px 30px',
        border: `2px solid ${active ? color : 'rgba(31,35,72,.06)'}`,
        boxShadow: active ? `0 24px 60px ${color}33` : '0 20px 50px rgba(31,35,72,.1)',
        transition: 'none',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
        <div style={{width: 76, height: 76, borderRadius: 24, background: `${color}1f`, color, display: 'grid', placeItems: 'center', flexShrink: 0}}>
          <Ic d={icon} size={40} />
        </div>
        <div>
          <div style={{fontFamily: SANS, fontSize: 36, fontWeight: 800, color: C.navy, letterSpacing: -0.5}}>{title}</div>
          <div style={{fontFamily: SANS, fontSize: 24, fontWeight: 500, color: '#667', marginTop: 4}}>{sub}</div>
        </div>
      </div>
      {children}
    </div>
  </Reveal>
);

/* =============== S08 — Title reveal =============== */
const S08Body: React.FC = () => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const bTag = beat('Write. Earn. Stake.');
  const bInside = beat('A writing and earning');
  const bNo = beat('No ads');
  const logoP = useSpr(2, 12, 90);
  const words: [string, string, number][] = [
    ['Write.', C.navy, bTag],
    ['Earn.', C.blue, bTag + 10],
    ['Stake.', C.gold, bTag + 20],
  ];
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 140, top: 130}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 30, transform: `scale(${0.6 + 0.4 * logoP})`, opacity: logoP, transformOrigin: 'left center'}}>
          <div style={{width: 128, height: 128, borderRadius: 34, background: '#1a1a1a', display: 'grid', placeItems: 'center', boxShadow: '0 24px 50px rgba(26,26,26,.35)'}}>
            <span style={{color: '#fff', fontFamily: SANS, fontWeight: 800, fontSize: 70}}>N</span>
          </div>
          <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 168, color: C.ink, letterSpacing: -7}}>NimInk</div>
        </div>
        <div style={{display: 'flex', gap: 28, marginTop: 26}}>
          {words.map(([w, c, at]) => {
            const p = useSpr(at, 12, 140);
            return (
              <div key={w} style={{fontFamily: SERIF, fontSize: 96, fontWeight: 700, color: c, opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 50}px) rotate(${(1 - p) * -4}deg)`, position: 'relative'}}>
                {w}
                <div style={{position: 'absolute', left: 0, bottom: -6, height: 8, borderRadius: 4, background: c, width: `${p * 100}%`, opacity: 0.35}} />
              </div>
            );
          })}
        </div>
        <Reveal at={bInside} y={30}>
          <div style={{marginTop: 46, display: 'flex', alignItems: 'center', gap: 18}}>
            <Pill bg={C.navy} color="#fff" size={30}>
              <Coin size={38} /> Built inside Nimiq Pay
            </Pill>
            <span style={{fontFamily: SANS, fontSize: 30, fontWeight: 600, color: '#556'}}>A writing &amp; earning mini app</span>
          </div>
        </Reveal>
        <div style={{marginTop: 34, display: 'flex', gap: 18}}>
          {['No ads', 'No separate accounts', 'No middlemen'].map((t, i) => (
            <Reveal key={t} at={bNo + i * 16} y={24}>
              <Pill bg="#fff" color={C.navy} size={26} style={{boxShadow: '0 10px 26px rgba(31,35,72,.1)', border: '1px solid rgba(31,35,72,.07)'}}>
                <Check size={26} color={C.green} /> {t}
              </Pill>
            </Reveal>
          ))}
        </div>
      </div>
      <div style={{position: 'absolute', right: 150, top: 82}}>
        <Reveal at={8} y={90} from={0.9}>
          <Floaty amp={8} speed={0.7}>
            <Phone scale={0.92} glow="rgba(5,130,202,.35)">
              <SplashScreen />
            </Phone>
          </Floaty>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};
export const S08: React.FC = () => (
  <Shell sceneIndex={7} bg="light">
    <S08Body />
  </Shell>
);

/* =============== S09 — Discover =============== */
const S09Body: React.FC = () => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const bL = beat('Latest');
  const bP = beat('Popular');
  const bT = beat('Top Tipped');
  const bQ = beat('test their');
  const bF = beat('find creators');
  const tab = f >= bT ? 2 : f >= bP ? 1 : 0;
  const quizP = useProgress(bQ + 6, bQ + 30);
  const pass = useProgress(bQ + 50, bQ + 62);
  const scroll = interpolate(f, [bL, bT + 80], [0, 60], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: PH_LEFT + 60, top: PH_TOP}}>
        <Reveal at={2} y={80} from={0.94}>
          <Phone scale={PH_SCALE}>
            <HomeScreen tab={tab as 0 | 1 | 2} scroll={scroll} glowCard={f > bF ? 0 : -1} />
          </Phone>
        </Reveal>
      </div>
      <div style={{position: 'absolute', left: 860, top: 70, width: 900, display: 'flex', flexDirection: 'column', gap: 18}}>
        <Feature at={bL - 4} icon={ICON.home} title="Discover what's worth reading" sub="Three ways to explore the feed" color={C.blue} active={f >= bL && f < bQ - 10}>
          <div style={{display: 'flex', gap: 14, marginTop: 16}}>
            {['Latest', 'Popular', 'Top Tipped'].map((t, i) => (
              <div key={t} style={{flex: 1, textAlign: 'center', padding: '14px 0', borderRadius: 16, fontFamily: SANS, fontWeight: 700, fontSize: 28, background: tab === i ? GRADIENT : '#f1f3f9', color: tab === i ? '#fff' : '#889'}}>
                {t}
              </div>
            ))}
          </div>
        </Feature>
        <Feature at={bQ - 4} icon={ICON.check} title="Quick comprehension quizzes" sub="Prove you read it. Reads are verified." color={C.green} active={f >= bQ && f < bF - 10}>
          <div style={{marginTop: 16, opacity: quizP, transform: `translateY(${(1 - quizP) * 14}px)`}}>
            <div style={{fontFamily: SANS, fontSize: 25, fontWeight: 700, color: C.navy, marginBottom: 8}}>What helps the best sentences arrive?</div>
            {['Writing in a rush', 'A slow morning ritual'].map((o, i) => (
              <div key={o} style={{padding: '9px 18px', borderRadius: 14, marginBottom: 6, fontFamily: SANS, fontSize: 23, fontWeight: 600, border: `2px solid ${i === 1 && pass > 0.5 ? C.green : '#e5e7eb'}`, background: i === 1 && pass > 0.5 ? C.greenSoft : '#fff', color: i === 1 && pass > 0.5 ? C.green : '#556', display: 'flex', justifyContent: 'space-between'}}>
                {o}
                {i === 1 && pass > 0.5 && <span>✓ Verified</span>}
              </div>
            ))}
          </div>
        </Feature>
        <Feature at={bF - 4} icon={ICON.user} title="Creators worth following" sub="Find your next favourite writer" color={C.violet} active={f >= bF}>
          <div style={{display: 'flex', marginTop: 16, alignItems: 'center'}}>
            {['Alex', 'Maya', 'Sam', 'Priya', 'Noah'].map((n, i) => {
              const p = useSpr(bF + 8 + i * 5, 12, 140);
              return <Avatar key={n} name={n} size={72} hue={i * 62 + 200} style={{marginLeft: i ? -14 : 0, transform: `scale(${p})`, border: '4px solid #fff'}} />;
            })}
            <span style={{fontFamily: SANS, fontSize: 26, fontWeight: 700, color: C.violet, marginLeft: 22}}>+ follow</span>
          </div>
        </Feature>
      </div>
    </AbsoluteFill>
  );
};
export const S09: React.FC = () => (
  <Shell sceneIndex={8} bg="light">
    <S09Body />
  </Shell>
);

/* =============== S10 — Tip =============== */
const S10Body: React.FC = () => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const bLike = beat('tap a like');
  const bTip = beat('They tip');
  const bSimple = beat('A simple gesture');
  const tapAt = bTip - 12;
  const sheetIn = useSpr(tapAt + 12, 18, 120);
  const approveAt = tapAt + 52;
  const sheetOut = interpolate(f, [approveAt + 8, approveAt + 22], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const sheetP = f < approveAt + 8 ? sheetIn : sheetOut;
  const toastP = useSpr(approveAt + 26, 16, 140);
  const toastOut = interpolate(f, [approveAt + 90, approveAt + 104], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const tipSel = f > tapAt + 4 ? 5 : 0;
  const received = f > approveAt + 22;
  // coin flight
  const flight = interpolate(f, [approveAt + 14, approveAt + 54], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: PH_LEFT + 20, top: PH_TOP}}>
        <Reveal at={2} y={80} from={0.94}>
          <Phone scale={PH_SCALE}>
            <ReadScreen tipSel={tipSel} />
            <Tap x={228} y={782} at={tapAt} hold={14} />
            {sheetP > 0.01 && <PayoutSheet amount="5" to="Alex Rivera" p={sheetP} approving={f > approveAt + 2} />}
            {sheetP > 0.01 && <Tap x={283} y={786} at={approveAt} hold={14} />}
            {f > approveAt + 24 && toastOut > 0 && <ToastView msg="Tip sent successfully!" p={toastP * toastOut} />}
          </Phone>
        </Reveal>
      </div>

      <div style={{position: 'absolute', left: 840, top: 120, width: 960}}>
        <Words text="More than a like." at={4} size={84} color={C.navy} serif gap={6} highlight={{like: '#9aa3c7'}} />
      </div>
      <div style={{position: 'absolute', left: 860, top: 330, display: 'flex', gap: 34, alignItems: 'stretch'}}>
        <Reveal at={bLike} y={40}>
          <div style={{width: 360, borderRadius: 32, padding: 30, background: '#fff', border: '2px dashed #cfd5e8', textAlign: 'center', opacity: f > bTip ? 0.5 : 1}}>
            <div style={{color: '#b3bad3', display: 'grid', placeItems: 'center'}}>
              <Ic d={ICON.heart} size={96} stroke={1.8} />
            </div>
            <div style={{fontFamily: SANS, fontSize: 34, fontWeight: 800, color: '#99a'}}>A like</div>
            <div style={{fontFamily: SANS, fontSize: 44, fontWeight: 800, color: '#b3bad3', marginTop: 6}}>0 NIM</div>
          </div>
        </Reveal>
        <Reveal at={bTip} y={40}>
          <div style={{width: 470, borderRadius: 32, padding: 30, background: GRADIENT, textAlign: 'center', color: '#fff', boxShadow: '0 30px 70px rgba(5,130,202,.35)'}}>
            <div style={{display: 'grid', placeItems: 'center', height: 96}}>
              <Floaty amp={7}>
                <Coin size={104} spin={Math.sin(f / 14) * 12} />
              </Floaty>
            </div>
            <div style={{fontFamily: SANS, fontSize: 34, fontWeight: 800, marginTop: 4, opacity: 0.9}}>A tip, in NIM</div>
            <div style={{fontFamily: SANS, fontSize: 70, fontWeight: 800, color: C.goldLight, letterSpacing: -2}}>
              +<Counter to={5} start={approveAt + 22} end={approveAt + 40} /> NIM
            </div>
            <div style={{fontFamily: SANS, fontSize: 24, opacity: 0.8, marginTop: 6}}>straight to Alex's wallet</div>
          </div>
        </Reveal>
      </div>
      {/* flying coins */}
      {[0, 1, 2, 3, 4].map((i) => {
        const t = Math.min(1, Math.max(0, flight * 1.25 - i * 0.08));
        if (t <= 0 || t >= 1) return null;
        const x = lerp(520, 1290, t) + Math.sin(t * 6 + i) * 24;
        const y = lerp(800, 600, t) - Math.sin(t * Math.PI) * 120;
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, transform: `scale(${0.7 + t * 0.4})`}}>
            <Coin size={64} spin={t * 520} />
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 860, top: 700}}>
        <Reveal at={bSimple} y={30}>
          <Pill bg={C.amberSoft} color={C.goldDeep} size={32} style={{border: `2px solid ${C.goldLight}`}}>
            <Ic d={ICON.star} size={30} fill color={C.gold} /> A simple gesture becomes real support
          </Pill>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};
export const S10: React.FC = () => (
  <Shell sceneIndex={9} bg="light">
    <S10Body />
  </Shell>
);

/* =============== S11 — Write & sell =============== */
const S11Body: React.FC = () => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const bFree = beat('publish free');
  const bPrem = beat('sell premium');
  const bSub = beat('build subscriptions');
  const bWallet = beat('All paid');
  const title = typed('Why slow mornings make better writers', f, 6, 20);
  const access = f >= bSub ? 'subscription' : f >= bPrem ? 'one_time' : 'free';
  const lines = Math.min(5, Math.floor(f / 14));
  const walletP = useSpr(bWallet, 14, 110);
  const tiers = [
    {at: bFree, k: 'free', title: 'Free articles', sub: 'Grow your audience', badge: 'Free', c: C.blue, icon: ICON.doc},
    {at: bPrem, k: 'one_time', title: 'Premium content', sub: 'Readers unlock once', badge: '2 NIM', c: C.gold, icon: ICON.lock},
    {at: bSub, k: 'subscription', title: 'Subscriptions', sub: '30-day access to all', badge: '12 NIM / 30d', c: C.violet, icon: ICON.requests},
  ];
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: PH_LEFT + 20, top: PH_TOP}}>
        <Reveal at={2} y={80} from={0.94}>
          <Phone scale={PH_SCALE}>
            <WriteScreen title={title} bodyLines={lines} access={access as 'free'} price={access === 'one_time' ? '2' : undefined} />
          </Phone>
        </Reveal>
      </div>
      <div style={{position: 'absolute', left: 840, top: 110}}>
        <Words text="Write once. Earn your way." at={4} size={78} color={C.navy} serif gap={5} highlight={{Earn: C.blue}} />
      </div>
      <div style={{position: 'absolute', left: 850, top: 280, width: 560, display: 'flex', flexDirection: 'column', gap: 22}}>
        {tiers.map((t) => {
          const on = access === t.k;
          return (
            <Reveal key={t.k} at={t.at - 6} x={60} y={0}>
              <div style={{display: 'flex', alignItems: 'center', gap: 22, padding: '22px 28px', borderRadius: 28, background: '#fff', border: `2.5px solid ${on ? t.c : 'rgba(31,35,72,.06)'}`, boxShadow: on ? `0 22px 50px ${t.c}40` : '0 14px 36px rgba(31,35,72,.08)', transform: on ? 'scale(1.03)' : 'none'}}>
                <div style={{width: 72, height: 72, borderRadius: 22, background: `${t.c}22`, color: t.c, display: 'grid', placeItems: 'center'}}>
                  <Ic d={t.icon} size={38} />
                </div>
                <div style={{flex: 1}}>
                  <div style={{fontFamily: SANS, fontSize: 36, fontWeight: 800, color: C.navy}}>{t.title}</div>
                  <div style={{fontFamily: SANS, fontSize: 23, color: '#667', fontWeight: 500}}>{t.sub}</div>
                </div>
                <Pill bg={`${t.c}1f`} color={t.k === 'one_time' ? C.goldDeep : t.c} size={24}>{t.badge}</Pill>
              </div>
            </Reveal>
          );
        })}
      </div>
      {/* wallet */}
      <div style={{position: 'absolute', left: 1480, top: 300, width: 330, opacity: walletP, transform: `scale(${0.85 + 0.15 * walletP})`}}>
        <div style={{borderRadius: 32, padding: 30, background: GRADIENT, color: '#fff', boxShadow: '0 30px 70px rgba(5,130,202,.35)', textAlign: 'center', height: 470, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', right: -60, top: -60, width: 200, height: 200, borderRadius: '50%', border: '30px solid rgba(255,255,255,.06)'}} />
          <Ic d={ICON.coin} size={74} color="#fff" />
          <div style={{fontFamily: SANS, fontSize: 28, fontWeight: 600, opacity: 0.8, marginTop: 14}}>Alex's wallet</div>
          <div style={{fontFamily: SANS, fontSize: 64, fontWeight: 800, color: C.goldLight, letterSpacing: -2}}>
            <Counter to={186} start={bWallet} end={bWallet + 70} />
          </div>
          <div style={{fontFamily: SANS, fontSize: 24, opacity: 0.8}}>NIM and counting</div>
        </div>
      </div>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const startF = bWallet - 10 + i * 9;
        const t = interpolate(f, [startF, startF + 36], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        if (t <= 0 || t >= 1) return null;
        return (
          <div key={i} style={{position: 'absolute', left: lerp(1360, 1560, t), top: 360 + (i % 3) * 90 + Math.sin(t * Math.PI) * -40, opacity: Math.sin(t * Math.PI)}}>
            <Coin size={54} spin={t * 400} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
export const S11: React.FC = () => (
  <Shell sceneIndex={10} bg="light">
    <S11Body />
  </Shell>
);

/* =============== S12 — Paid requests =============== */
const S12Body: React.FC = () => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const bPost = beat('Readers can even');
  const bBudget = beat('Set a budget');
  const bDead = beat('Set a deadline');
  const bSubmit = beat('Writers submit');
  const bWin = beat('picks the winner');
  const bPay = beat('pays them');
  const bDemand = beat('Demand meets');
  const showForm = f >= bPost + 24;
  const formP = useProgress(bPost + 16, bPost + 30);
  const topic = typed('How does staking work for beginners?', f, bPost + 28, 26);
  const desc = typed('A friendly 600-word guide with a simple example.', f, bPost + 56, 30);
  const budget = f >= bBudget ? '200' : '';
  const deadline = f >= bDead ? '25/11/2026' : '';
  const steps = [
    {at: bPost, t: 'Reader posts a request', s: 'Topic · budget · deadline', c: C.blue, icon: ICON.requests},
    {at: bSubmit, t: 'Writers submit drafts', s: 'Anyone can pitch their best work', c: C.violet, icon: ICON.pen},
    {at: bWin, t: 'Requester picks the winner', s: 'Quality decides, not an algorithm', c: C.goldDeep, icon: ICON.star},
    {at: bPay, t: 'Winner gets paid in NIM', s: '200 NIM, straight to the writer', c: C.green, icon: ICON.coin},
  ];
  const activeIdx = f >= bPay ? 3 : f >= bWin ? 2 : f >= bSubmit ? 1 : f >= bPost ? 0 : -1;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: PH_LEFT + 20, top: PH_TOP}}>
        <Reveal at={2} y={80} from={0.94}>
          <Phone scale={PH_SCALE}>
            <RequestsScreen />
            {showForm && (
              <div style={{position: 'absolute', inset: 0, opacity: formP, transform: `translateX(${(1 - formP) * 60}px)`}}>
                <CreateRequestScreen topic={topic} desc={f > bPost + 56 ? desc : ''} budget={budget} deadline={deadline} submitHot={f > bDead + 40} />
              </div>
            )}
            <Tap x={310} y={78} at={bPost + 6} hold={12} />
          </Phone>
        </Reveal>
      </div>
      <div style={{position: 'absolute', left: 840, top: 100}}>
        <Words text="Demand meets knowledge." at={4} size={78} color={C.navy} serif gap={5} highlight={{knowledge: C.blue}} />
      </div>
      <div style={{position: 'absolute', left: 850, top: 260, width: 900}}>
        <div style={{position: 'absolute', left: 52, top: 40, width: 6, height: 480, borderRadius: 3, background: 'rgba(31,35,72,.1)'}}>
          <div style={{width: '100%', height: `${Math.min(1, (activeIdx + (activeIdx >= 0 ? 0.2 : 0)) / 3) * 100}%`, borderRadius: 3, background: GRADIENT}} />
        </div>
        {steps.map((s, i) => {
          const on = activeIdx === i;
          const done = activeIdx > i;
          return (
            <Reveal key={s.t} at={s.at - 4} x={70} y={0} style={{marginBottom: 26}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 28}}>
                <div style={{width: 110, height: 110, borderRadius: 34, flexShrink: 0, display: 'grid', placeItems: 'center', background: on || done ? s.c : '#fff', color: on || done ? '#fff' : s.c, boxShadow: on ? `0 0 0 10px ${s.c}30, 0 20px 40px ${s.c}55` : '0 12px 30px rgba(31,35,72,.1)', transform: on ? 'scale(1.06)' : 'none'}}>
                  <Ic d={done ? ICON.check : s.icon} size={52} stroke={2} />
                </div>
                <div>
                  <div style={{fontFamily: SANS, fontSize: 40, fontWeight: 800, color: C.navy, letterSpacing: -0.5}}>{s.t}</div>
                  <div style={{fontFamily: SANS, fontSize: 25, fontWeight: 500, color: '#667'}}>{s.s}</div>
                </div>
                {i === 1 && f >= bSubmit && (
                  <div style={{display: 'flex', marginLeft: 'auto'}}>
                    {['Maya', 'Sam', 'Priya'].map((n, k) => (
                      <Avatar key={n} name={n} size={62} hue={k * 80 + 200} style={{marginLeft: k ? -12 : 0, border: '3px solid #fff'}} />
                    ))}
                  </div>
                )}
                {i === 3 && f >= bPay && (
                  <div style={{marginLeft: 'auto'}}>
                    <Floaty amp={6}>
                      <Coin size={86} spin={f * 3} />
                    </Floaty>
                  </div>
                )}
              </div>
            </Reveal>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
export const S12: React.FC = () => (
  <Shell sceneIndex={11} bg="light">
    <S12Body />
  </Shell>
);

/* =============== S13 — Earnings dashboard =============== */
const S13Body: React.FC = () => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const bMonths = beat('Months later');
  const bDash = beat('The earnings dashboard');
  const bTips = beat('Tips.');
  const bSubs = beat('Subscriptions.');
  const bSales = beat('Article sales');
  const bReq = beat('And requests');
  const k = useProgress(bMonths + 10, bMonths + 100);
  const sources = [
    {l: 'Tips', v: 218.5, c: '#d97706', at: bTips},
    {l: 'Subscriptions', v: 312, c: C.violet, at: bSubs},
    {l: 'Article sales', v: 103.5, c: C.green, at: bSales},
    {l: 'Requests', v: 650, c: C.blue, at: bReq},
  ];
  const total = sources.reduce((a, s) => a + s.v, 0);
  const scroll = interpolate(f, [bDash, bDash + 150], [0, 210], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const vis = (at: number) => (f >= at ? 1 : 0);
  const sv = (s: (typeof sources)[number]) => s.v * Math.min(1, Math.max(0, (f - s.at) / 22));
  const tip = sv(sources[0]);
  const sub = sv(sources[1]);
  const sale = sv(sources[2]);
  const req = sv(sources[3]);
  const tot = tip + sub + sale + req;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: PH_LEFT + 20, top: PH_TOP}}>
        <Reveal at={2} y={80} from={0.94}>
          <Phone scale={PH_SCALE}>
            <EarningsScreen total={tot} wallet={tot} tips={tip} requests={req} subs={sub} sales={sale} staked={0} scroll={scroll} />
          </Phone>
        </Reveal>
      </div>
      <div style={{position: 'absolute', left: 840, top: 100}}>
        <Reveal at={bMonths} y={30}>
          <Pill bg={C.blueSoft} color={C.blue} size={28}>
            <Ic d={ICON.trend} size={30} /> Months later
          </Pill>
        </Reveal>
        <div style={{marginTop: 20}}>
          <div style={{fontFamily: SANS, fontSize: 32, fontWeight: 600, color: '#667'}}>Total earned</div>
          <div style={{fontFamily: SANS, fontSize: 150, fontWeight: 800, color: C.navy, letterSpacing: -6, lineHeight: 1}}>
            {tot.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            <span style={{fontSize: 52, color: C.blue, letterSpacing: 0, marginLeft: 14}}>NIM</span>
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 850, top: 470, width: 900}}>
        <div style={{display: 'flex', height: 54, borderRadius: 27, overflow: 'hidden', background: '#e9ecf5', boxShadow: 'inset 0 2px 6px rgba(31,35,72,.08)'}}>
          {[tip, sub, sale, req].map((v, i) => (
            <div key={i} style={{width: `${(v / total) * 100}%`, background: sources[i].c}} />
          ))}
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 28}}>
          {sources.map((s, i) => (
            <Reveal key={s.l} at={s.at - 2} y={30}>
              <div style={{display: 'flex', alignItems: 'center', gap: 18, padding: '18px 24px', borderRadius: 24, background: '#fff', boxShadow: '0 14px 34px rgba(31,35,72,.09)', border: `2px solid ${f >= s.at && f < s.at + 40 ? s.c : 'transparent'}`}}>
                <span style={{width: 22, height: 22, borderRadius: 7, background: s.c}} />
                <div>
                  <div style={{fontFamily: SANS, fontSize: 24, fontWeight: 600, color: '#667'}}>{s.l}</div>
                  <div style={{fontFamily: SANS, fontSize: 40, fontWeight: 800, color: C.navy}}>
                    {sv(s).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        {vis(bDash) ? (
          <Reveal at={bDash} y={20} style={{marginTop: 26}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14, fontFamily: SANS, fontSize: 28, fontWeight: 700, color: C.navy}}>
              <Check size={34} /> Every transaction tracked · see exactly where income comes from
            </div>
          </Reveal>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
export const S13: React.FC = () => (
  <Shell sceneIndex={12} bg="light">
    <S13Body />
  </Shell>
);
