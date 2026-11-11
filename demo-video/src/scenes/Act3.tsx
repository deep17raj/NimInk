import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, GRADIENT} from '../theme';
import {SANS, SERIF, loraItalic} from '../fonts';
import {Shell} from '../ui/Shell';
import {useBeat, useProgress, useSpr, lerp, ease} from '../ui/anim';
import {Check, Coin, Counter, Floaty, Glass, Pill, Reveal, Words, draw, typed} from '../ui/kit';
import {EarningsScreen, Ic, ICON, PayoutSheet, Phone, StakeScreen, Tap, ToastView} from '../ui/app';

const win = (f: number, a: number, b: number, fade = 10) =>
  interpolate(f, [a, a + fade, b - fade, b], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/* =============== S14 — STAKING (the highlight) =============== */
const S14Body: React.FC = () => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const bAnd = beat('And now');
  const bTapStake = beat('Alex taps');
  const bValid = beat('Choose a validator');
  const bFee = beat('Check the fee');
  const bAmt = beat('Enter an amount');
  const bReview = beat('Review.');
  const bConfirm = beat('Confirm.');
  const bWork = beat('Alex\'s earnings');
  const bRewards = beat('Rewards vary');

  // phone timeline
  const tapCta = bTapStake + 12;
  const toStake = useProgress(tapCta + 10, tapCta + 26);
  const selected = f >= bValid + 22 ? 1 : 0;
  const amount = typed('500', f, bAmt + 4, 4);
  const reviewTap = bReview + 2;
  const sheetIn = useSpr(reviewTap + 12, 18, 120);
  const approveAt = Math.max(bConfirm + 14, reviewTap + 46);
  const sheetOut = interpolate(f, [approveAt + 8, approveAt + 22], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const sheetP = f < approveAt + 8 ? sheetIn : sheetOut;
  const done = f > approveAt + 22;
  const toastP = useSpr(approveAt + 24, 16, 140);
  const toastOut = interpolate(f, [approveAt + 100, approveAt + 114], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const staked = done ? 500 : 0;
  const rewards = done ? interpolate(f, [bWork + 10, bRewards + 40], [0, 7.42], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease}) : 0;
  const available = done ? 1284 - 500 : 1284;
  const hot = (a: number, b: number) => Math.max(0, Math.min(1, Math.sin(((f - a) / (b - a)) * Math.PI)));

  const steps = [
    {at: bTapStake, t: 'Tap “Stake NIM”', s: 'Right from the earnings screen'},
    {at: bValid, t: 'Choose a validator', s: 'NimPool, StakeNIM, Community…'},
    {at: bFee, t: 'Check fee & trust score', s: 'Fee 3% · Trust 90%'},
    {at: bAmt, t: 'Enter an amount', s: 'Minimum 100 NIM for first stake'},
    {at: bReview, t: 'Review the stake', s: '500 NIM · fee 0 NIM'},
    {at: bConfirm, t: 'Confirm', s: 'Approved in Nimiq Pay'},
  ];
  const active = steps.reduce((a, s, i) => (f >= s.at ? i : a), -1);
  const stepsOp = win(f, bTapStake - 8, bWork, 12) + (f < bTapStake - 8 ? 0 : 0);
  const summaryP = useSpr(bWork, 16, 100);
  const glow = 0.5 + 0.5 * Math.sin(f / 12);
  const chartP = useProgress(bWork + 8, bWork + 70);

  return (
    <AbsoluteFill>
      {/* glowing backdrop ring */}
      <div style={{position: 'absolute', left: 60, top: 60, width: 520, height: 868, borderRadius: 90, boxShadow: `0 0 ${120 + glow * 60}px rgba(233,178,19,${0.22 + glow * 0.12})`}} />
      <div style={{position: 'absolute', left: 120, top: 56}}>
        <Reveal at={2} y={80} from={0.94}>
          <Phone scale={1} glow="rgba(233,178,19,.35)">
            {toStake < 1 && (
              <div style={{position: 'absolute', inset: 0, transform: `translateX(${-toStake * 120}px)`, opacity: 1 - toStake}}>
                <EarningsScreen total={1284} wallet={1284} tips={218.5} requests={650} subs={312} sales={103.5} staked={0} ctaHot={hot(bTapStake - 20, tapCta + 6)} />
              </div>
            )}
            {toStake > 0 && (
              <div style={{position: 'absolute', inset: 0, transform: `translateX(${(1 - toStake) * 120}px)`, opacity: toStake}}>
                <StakeScreen selected={selected} amount={amount} staked={staked} rewards={rewards} available={available} reviewHot={hot(bReview - 12, reviewTap + 4)} />
              </div>
            )}
            <Tap x={314} y={678} at={tapCta} hold={12} />
            <Tap x={195} y={468} at={bValid + 18} hold={12} />
            <Tap x={195} y={662} at={bAmt} hold={10} />
            <Tap x={195} y={756} at={reviewTap} hold={12} />
            {sheetP > 0.01 && <PayoutSheet amount="500" to="StakeNIM Pro" p={sheetP} approving={f > approveAt + 2} />}
            {sheetP > 0.01 && <Tap x={283} y={786} at={approveAt} hold={14} />}
            {done && toastOut > 0 && <ToastView msg="Staked successfully!" p={toastP * toastOut} />}
          </Phone>
        </Reveal>
      </div>

      {/* headline */}
      <div style={{position: 'absolute', left: 700, top: 70}}>
        <Reveal at={bAnd} y={30}>
          <Pill bg={`${C.gold}26`} color={C.goldLight} size={28} style={{border: `2px solid ${C.gold}88`}}>
            <Ic d={ICON.trend} size={32} /> THE BIG ONE · STAKING
          </Pill>
        </Reveal>
        <div style={{marginTop: 22}}>
          <Words text="Put your earnings" at={bAnd + 6} size={104} color="#fff" serif gap={5} />
          <Words text="to work." at={bAnd + 22} size={104} color={C.gold} serif gap={5} />
        </div>
      </div>

      {/* steps */}
      <div style={{position: 'absolute', left: 700, top: 392, width: 1000, opacity: stepsOp}}>
        {steps.map((s, i) => {
          const on = active === i;
          const past = active > i;
          const p = useSpr(s.at - 4, 15, 120);
          return (
            <div key={s.t} style={{display: 'flex', alignItems: 'center', gap: 22, marginBottom: 9, opacity: Math.min(1, p * 2) * (past ? 0.62 : 1), transform: `translateX(${(1 - p) * 60}px)`}}>
              <div style={{width: 56, height: 56, borderRadius: 18, display: 'grid', placeItems: 'center', fontFamily: SANS, fontWeight: 800, fontSize: 28, background: on ? C.gold : past ? C.green : 'rgba(255,255,255,.1)', color: on ? '#3a2900' : '#fff', boxShadow: on ? `0 0 0 8px ${C.gold}33, 0 12px 30px ${C.gold}66` : 'none', border: on || past ? 'none' : '1px solid rgba(255,255,255,.2)'}}>
                {past ? <Check size={34} color="#fff" /> : i + 1}
              </div>
              <div>
                <div style={{fontFamily: SANS, fontSize: on ? 42 : 36, fontWeight: 800, color: on ? '#fff' : 'rgba(255,255,255,.85)', letterSpacing: -0.5}}>{s.t}</div>
                <div style={{fontFamily: SANS, fontSize: 22, fontWeight: 500, color: on ? C.goldLight : 'rgba(255,255,255,.55)'}}>{s.s}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* summary */}
      {f >= bWork - 6 && (
        <div style={{position: 'absolute', left: 700, top: 400, width: 1040, opacity: Math.min(1, summaryP * 1.5), transform: `translateY(${(1 - summaryP) * 40}px)`}}>
          <div style={{display: 'flex', gap: 26}}>
            <Glass style={{flex: 1, padding: '30px 36px', background: 'rgba(255,255,255,.1)'}}>
              <div style={{fontFamily: SANS, fontSize: 26, fontWeight: 600, color: 'rgba(255,255,255,.7)'}}>Currently staked</div>
              <div style={{fontFamily: SANS, fontSize: 96, fontWeight: 800, color: '#fff', letterSpacing: -3}}>
                <Counter to={500} start={bWork} end={bWork + 36} />
                <span style={{fontSize: 40, color: '#9fd3ff', marginLeft: 10}}>NIM</span>
              </div>
            </Glass>
            <Glass style={{flex: 1, padding: '30px 36px', background: 'rgba(18,161,80,.16)', borderColor: 'rgba(52,211,153,.4)'}}>
              <div style={{fontFamily: SANS, fontSize: 26, fontWeight: 600, color: '#9ff0c6'}}>Demo rewards earned</div>
              <div style={{fontFamily: SANS, fontSize: 96, fontWeight: 800, color: '#6ee7a8', letterSpacing: -3}}>
                +<Counter to={7.42} start={bWork + 10} end={bRewards + 40} decimals={2} />
                <span style={{fontSize: 40, marginLeft: 10}}>NIM</span>
              </div>
            </Glass>
          </div>
          <div style={{marginTop: 28, position: 'relative', height: 190}}>
            <svg width="1040" height="190" viewBox="0 0 1040 250" preserveAspectRatio="none" style={{overflow: 'visible'}}>
              <defs>
                <linearGradient id="stkA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={C.gold} stopOpacity="0.45" />
                  <stop offset="1" stopColor={C.gold} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 230 C160 225 260 205 380 170 C520 128 640 90 780 62 C880 42 960 28 1040 14 L1040 250 L0 250 Z" fill="url(#stkA)" opacity={chartP} />
              <path d="M0 230 C160 225 260 205 380 170 C520 128 640 90 780 62 C880 42 960 28 1040 14" fill="none" stroke={C.gold} strokeWidth="9" strokeLinecap="round" style={draw(1300, chartP)} />
            </svg>
            {[0, 1, 2, 3, 4].map((i) => {
              const t = interpolate(f, [bWork + 10 + i * 12, bWork + 50 + i * 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
              const x = lerp(0, 1040, t);
              return (
                <div key={i} style={{position: 'absolute', left: x - 22, top: (220 - t * 220) * 0.76 - 22 + Math.sin(i + f / 9) * 6, opacity: t > 0 && t < 0.98 ? 1 : 0}}>
                  <Coin size={46} spin={f * 4 + i * 40} />
                </div>
              );
            })}
          </div>
          <Reveal at={bRewards} y={20}>
            <div style={{fontFamily: SANS, fontSize: 26, fontWeight: 600, color: 'rgba(255,255,255,.7)', display: 'flex', alignItems: 'center', gap: 12}}>
              <Ic d={ICON.shield} size={30} /> Demo rewards are simulated. Real rewards vary by validator and are not guaranteed.
            </div>
          </Reveal>
        </div>
      )}
    </AbsoluteFill>
  );
};
export const S14: React.FC = () => (
  <Shell sceneIndex={13} bg="navy">
    <S14Body />
  </Shell>
);

/* =============== S15 — Write → Earn → Stake flow =============== */
const S15Body: React.FC = () => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const bW = beat('From writing');
  const bE = beat('to earning');
  const bS = beat('to staking');
  const bEco = beat('One ecosystem');
  const bWal = beat('One wallet');
  const bMore = beat('More possibilities');
  const nodes = [
    {x: 330, label: 'Write', icon: ICON.pen, c: '#6dc2ff', at: bW, big: 1},
    {x: 960, label: 'Earn', icon: ICON.coin, c: '#9be7b8', at: bE, big: 1},
    {x: 1590, label: 'Stake', icon: ICON.trend, c: C.gold, at: bS, big: 1.18},
  ];
  const y = 400;
  return (
    <AbsoluteFill>
      <svg width="1920" height="1080" style={{position: 'absolute', inset: 0}}>
        {[0, 1].map((i) => {
          const a = nodes[i];
          const b = nodes[i + 1];
          const p = useProgress(b.at - 10, b.at + 14);
          return (
            <g key={i}>
              <line x1={a.x + 130} x2={b.x - 130} y1={y} y2={y} stroke="rgba(255,255,255,.18)" strokeWidth="6" strokeDasharray="4 16" strokeLinecap="round" />
              <line x1={a.x + 130} x2={lerp(a.x + 130, b.x - 130, p)} y1={y} y2={y} stroke={b.c} strokeWidth="8" strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
      {/* travelling coins */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const t = ((f - bE + i * 22) % 132) / 132;
        if (f < bE) return null;
        const seg = t < 0.5 ? 0 : 1;
        const lt = (t % 0.5) / 0.5;
        const a = nodes[seg].x + 130;
        const b = nodes[seg + 1].x - 130;
        if (seg === 1 && f < bS) return null;
        return (
          <div key={i} style={{position: 'absolute', left: lerp(a, b, lt) - 24, top: y - 24 - Math.sin(lt * Math.PI) * 34, opacity: Math.sin(lt * Math.PI)}}>
            <Coin size={48} spin={f * 5 + i * 30} />
          </div>
        );
      })}
      {nodes.map((n, i) => {
        const p = useSpr(n.at - 2, 12, 110);
        const pulse = i === 2 ? 0.5 + 0.5 * Math.sin(f / 10) : 0;
        const size = 250 * n.big;
        return (
          <div key={n.label} style={{position: 'absolute', left: n.x - size / 2, top: y - size / 2, width: size, height: size, transform: `scale(${p})`, opacity: Math.min(1, p * 2)}}>
            <div style={{width: '100%', height: '100%', borderRadius: size * 0.3, background: i === 2 ? `linear-gradient(145deg, ${C.gold}, #b8870a)` : 'rgba(255,255,255,.1)', border: i === 2 ? 'none' : '2px solid rgba(255,255,255,.22)', display: 'grid', placeItems: 'center', boxShadow: i === 2 ? `0 0 ${60 + pulse * 50}px rgba(233,178,19,.6)` : '0 24px 60px rgba(0,0,0,.35)', color: i === 2 ? '#3a2900' : n.c}}>
              <Ic d={n.icon} size={size * 0.42} stroke={1.8} />
            </div>
            <div style={{position: 'absolute', left: 0, right: 0, top: size + 22, textAlign: 'center', fontFamily: SERIF, fontSize: 76, fontWeight: 700, color: i === 2 ? C.gold : '#fff'}}>{n.label}</div>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 0, right: 0, top: 770, display: 'flex', justifyContent: 'center', gap: 28}}>
        {[
          {t: 'One ecosystem', at: bEco},
          {t: 'One wallet', at: bWal},
          {t: 'More possibilities', at: bMore},
        ].map((x, i) => (
          <Reveal key={x.t} at={x.at} y={30}>
            <Pill bg={i === 2 ? C.gold : 'rgba(255,255,255,.1)'} color={i === 2 ? '#3a2900' : '#fff'} size={38} style={{border: i === 2 ? 'none' : '1px solid rgba(255,255,255,.22)'}}>
              {x.t}
            </Pill>
          </Reveal>
        ))}
      </div>
    </AbsoluteFill>
  );
};
export const S15: React.FC = () => (
  <Shell sceneIndex={14} bg="navy">
    <S15Body />
  </Shell>
);

/* =============== S16 — Trust =============== */
const S16Body: React.FC = () => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const bTrust = beat('needs trust');
  const items = [
    {at: beat('content reporting'), t: 'Content reporting', s: 'Flag anything that crosses the line', icon: ICON.flag, c: '#ff8a8e'},
    {at: beat('moderation'), t: 'Moderation', s: 'A review queue for every report', icon: ICON.eye, c: '#6dc2ff'},
    {at: beat('fraud protection'), t: 'Fraud protection', s: 'Payments verified before they count', icon: ICON.lock, c: '#9be7b8'},
    {at: beat('reputation'), t: 'Reputation', s: 'Quality and trust earn visibility', icon: ICON.star, c: C.gold},
  ];
  const shield = useSpr(bTrust - 8, 14, 90);
  const pulse = 0.5 + 0.5 * Math.sin(f / 14);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 130, top: 120, width: 700}}>
        <Words text="A creator economy needs trust." at={bTrust - 6} size={86} color="#fff" serif gap={4} highlight={{trust: C.gold}} />
      </div>
      <div style={{position: 'absolute', left: 190, top: 520, transform: `scale(${shield})`, opacity: shield}}>
        <svg width="400" height="400" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="shG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1f7fd0" />
              <stop offset="1" stopColor="#1F2348" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r={92 + pulse * 6} fill="rgba(5,130,202,.14)" />
          <path d="M100 18 L172 44 V100 C172 142 142 172 100 184 C58 172 28 142 28 100 V44 Z" fill="url(#shG)" stroke="rgba(255,255,255,.55)" strokeWidth="3" />
          <path d="M68 100 L92 124 L136 76" fill="none" stroke={C.gold} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" style={draw(120, useProgress(bTrust + 6, bTrust + 30))} />
        </svg>
      </div>
      <div style={{position: 'absolute', left: 930, top: 130, width: 860, display: 'flex', flexDirection: 'column', gap: 24}}>
        {items.map((it) => (
          <Reveal key={it.t} at={it.at - 4} x={80} y={0}>
            <Glass style={{display: 'flex', alignItems: 'center', gap: 28, padding: '26px 34px', borderColor: f >= it.at && f < it.at + 36 ? `${it.c}aa` : undefined}}>
              <div style={{width: 92, height: 92, borderRadius: 28, background: `${it.c}22`, color: it.c, display: 'grid', placeItems: 'center'}}>
                <Ic d={it.icon} size={50} />
              </div>
              <div>
                <div style={{fontFamily: SANS, fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: -1}}>{it.t}</div>
                <div style={{fontFamily: SANS, fontSize: 26, fontWeight: 500, color: 'rgba(255,255,255,.65)'}}>{it.s}</div>
              </div>
              <div style={{marginLeft: 'auto', opacity: f >= it.at ? 1 : 0}}>
                <Check size={52} color={it.c} />
              </div>
            </Glass>
          </Reveal>
        ))}
      </div>
    </AbsoluteFill>
  );
};
export const S16: React.FC = () => (
  <Shell sceneIndex={15} bg="navy">
    <S16Body />
  </Shell>
);

/* =============== S17 — Outro =============== */
const S17Body: React.FC = () => {
  const f = useCurrentFrame();
  const beat = useBeat();
  const bWr = beat('Thousands of writers');
  const bRd = beat('Thousands of readers');
  const bVal = beat('Value flowing');
  const bBec = beat('Because writing');
  const bRec = beat('recognition');
  const bRew = beat('Rewards');
  const bOpp = beat('And opportunity');
  const bFinal = beat('NimInk. Write.');
  const gA = win(f, 0, bBec + 4, 12);
  const gB = win(f, bBec - 2, bFinal + 4, 14);
  const gC = interpolate(f, [bFinal - 2, bFinal + 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const logoP = useSpr(bFinal, 12, 90);
  const glow = 0.5 + 0.5 * Math.sin(f / 16);
  return (
    <AbsoluteFill>
      {/* A: thousands */}
      <div style={{position: 'absolute', inset: 0, opacity: gA}}>
        <div style={{position: 'absolute', left: 140, top: 200}}>
          <Words text="Thousands of writers." at={bWr} size={120} color="#fff" serif gap={4} />
          <Words text="Thousands of readers." at={bRd} size={120} color="#fff" serif gap={4} highlight={{readers: '#6dc2ff'}} />
          <div style={{marginTop: 34}}>
            <Words text="Value flowing directly to the people who create it." at={bVal} size={52} color={C.goldLight} weight={600} gap={3} />
          </div>
        </div>
        {Array.from({length: 18}).map((_, i) => {
          const t = ((f - bVal + i * 9) % 160) / 160;
          if (f < bVal) return null;
          const x = lerp(1100 + (i % 6) * 70, 1480, t);
          return (
            <div key={i} style={{position: 'absolute', left: x, top: 330 + (i % 6) * 70 + Math.sin(t * 6) * 12, opacity: Math.sin(t * Math.PI) * 0.9}}>
              <Coin size={44} spin={f * 4 + i * 20} />
            </div>
          );
        })}
      </div>

      {/* B: because writing deserves */}
      <div style={{position: 'absolute', inset: 0, opacity: gB}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 230, textAlign: 'center'}}>
          <Words text="Writing deserves more than views." at={bBec} size={118} color="#fff" serif gap={4} align="center" highlight={{views: '#9aa3c7'}} />
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 620, display: 'flex', justifyContent: 'center', gap: 28}}>
          {[
            {t: 'Recognition', at: bRec, c: '#6dc2ff'},
            {t: 'Rewards', at: bRew, c: '#9be7b8'},
            {t: 'Opportunity', at: bOpp, c: C.gold},
          ].map((x) => (
            <Reveal key={x.t} at={x.at} y={40}>
              <div style={{padding: '24px 52px', borderRadius: 999, fontFamily: SERIF, fontSize: 64, fontWeight: 700, color: x.c, background: 'rgba(255,255,255,.08)', border: `2px solid ${x.c}77`, boxShadow: `0 0 50px ${x.c}33`}}>{x.t}</div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* C: lockup */}
      <div style={{position: 'absolute', inset: 0, opacity: gC}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 36, transform: `scale(${0.7 + 0.3 * logoP})`}}>
            <div style={{width: 170, height: 170, borderRadius: 46, background: '#fff', display: 'grid', placeItems: 'center', boxShadow: `0 0 ${70 + glow * 50}px rgba(233,178,19,.5)`}}>
              <span style={{color: '#1a1a1a', fontFamily: SANS, fontWeight: 800, fontSize: 96}}>N</span>
            </div>
            <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 230, color: '#fff', letterSpacing: -10}}>NimInk</div>
          </div>
          <div style={{display: 'flex', gap: 30, marginTop: 22}}>
            {[
              ['Write.', '#fff'],
              ['Earn.', '#6dc2ff'],
              ['Stake.', C.gold],
            ].map(([w, c], i) => {
              const p = useSpr(bFinal + 18 + i * 12, 12, 140);
              return (
                <span key={w} style={{fontFamily: SERIF, fontSize: 104, fontWeight: 700, color: c, opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 40}px)`}}>
                  {w}
                </span>
              );
            })}
          </div>
          <Reveal at={bFinal + 70} y={20}>
            <div style={{fontFamily: loraItalic.fontFamily, fontStyle: 'italic', fontSize: 50, fontWeight: 500, color: 'rgba(255,255,255,.82)', marginTop: 38}}>
              Where every word has the potential to create value.
            </div>
          </Reveal>
          <Reveal at={bFinal + 96} y={20}>
            <div style={{marginTop: 34}}>
              <Pill bg="rgba(255,255,255,.1)" color="#fff" size={30} style={{border: '1px solid rgba(255,255,255,.25)'}}>
                <Coin size={40} /> Built for Nimiq Pay · Nimiq Mini Apps Competition
              </Pill>
            </div>
          </Reveal>
        </div>
      </div>
    </AbsoluteFill>
  );
};
export const S17: React.FC = () => (
  <Shell sceneIndex={16} bg="navy">
    <S17Body />
  </Shell>
);
