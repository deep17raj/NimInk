import React from 'react';
import {Composition} from 'remotion';
import {NimInkDemo} from './Video';
import {TOTAL_FRAMES, FPS} from './timing';

export const Root: React.FC = () => (
  <Composition
    id="NimInkDemo"
    component={NimInkDemo}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
