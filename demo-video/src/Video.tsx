import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile} from 'remotion';
import {OV, SCENES, TOTAL_FRAMES} from './timing';
import {S01, S02, S03, S04, S05, S06, S07} from './scenes/Act1';
import {S08, S09, S10, S11, S12, S13} from './scenes/Act2';
import {S14, S15, S16, S17} from './scenes/Act3';
import './fonts';

const COMPONENTS = [S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12, S13, S14, S15, S16, S17];

export const NimInkDemo: React.FC = () => (
  <AbsoluteFill style={{background: '#0D0F1C'}}>
    {SCENES.map((s, i) => {
      const Comp = COMPONENTS[i];
      return (
        <Sequence key={s.id} from={s.start} durationInFrames={s.frames + OV} name={s.id}>
          <Comp />
        </Sequence>
      );
    })}
    <Audio
      src={staticFile('music.wav')}
      volume={(f) =>
        interpolate(f, [0, 45, TOTAL_FRAMES - 90, TOTAL_FRAMES], [0, 0.14, 0.14, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      }
    />
  </AbsoluteFill>
);
