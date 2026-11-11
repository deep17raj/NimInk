"""Generate a soft original ambient bed (no external assets) that shifts mood with the story:
moody & sparse for the problem, brighter with a gentle pulse for the solution, fuller for staking."""
import json, math, wave
from pathlib import Path
import numpy as np

root = Path(__file__).resolve().parent.parent
SR = 32000
FPS = 30
LEAD, TAIL, OV = 9, 16, 12
EXTRA = {"s08": 24, "s14": 90, "s15": 12, "s17": 54}
scenes = json.loads((root / "scripts" / "scenes.json").read_text(encoding="utf-8"))
durs = json.loads((root / "public" / "vo" / "durations.json").read_text())
starts, cur = {}, 0
for s in scenes:
    f = math.ceil(durs[s["id"]] * FPS) + LEAD + TAIL + EXTRA.get(s["id"], 0)
    starts[s["id"]] = cur / FPS
    cur += f
total = (cur + OV) / FPS + 2
n = int(total * SR)
t = np.arange(n) / SR
t_solution, t_stake, t_trust = starts["s08"], starts["s14"], starts["s16"]


def hz(note):  # note name like A3
    names = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    k = names[note[0]] + (1 if "#" in note else 0)
    octv = int(note[-1])
    return 440.0 * 2 ** (((octv + 1) * 12 + k - 69) / 12)


def tone(freq, length, kind="pad"):
    tt = np.arange(int(length * SR)) / SR
    if kind == "pad":
        w = np.sin(2 * np.pi * freq * tt) + 0.5 * np.sin(2 * np.pi * freq * 1.003 * tt) + 0.25 * np.sin(2 * np.pi * freq * 2 * tt)
        a = np.minimum(tt / 2.2, 1) * np.minimum((length - tt) / 2.2, 1)
        return w * np.clip(a, 0, 1) * 0.12
    w = np.sin(2 * np.pi * freq * tt) + 0.3 * np.sin(2 * np.pi * freq * 2 * tt)
    return w * np.exp(-tt * 5.5) * np.minimum(tt / 0.01, 1) * 0.16


out = np.zeros(n)
chords_dark = [["A2", "E3", "A3", "C4"], ["F2", "C3", "E3", "A3"], ["C3", "G3", "E4", "B3"], ["G2", "D3", "B3", "F#3"]]
chords_bright = [["C3", "G3", "E4", "B3"], ["G2", "D3", "B3", "G4"], ["A2", "E3", "C4", "A3"], ["F2", "C3", "A3", "E4"]]
BAR = 4.0


def add(sig, at):
    i = int(at * SR)
    j = min(n, i + len(sig))
    if i < n:
        out[i:j] += sig[: j - i]


# pads across the whole piece, chord set chosen by act
tcur, k = 0.0, 0
while tcur < total:
    bright = tcur >= t_solution
    chord = (chords_bright if bright else chords_dark)[k % 4]
    for nn in chord:
        add(tone(hz(nn), BAR * 1.6, "pad") * (1.15 if tcur >= t_stake else 1.0), tcur)
    tcur += BAR
    k += 1

# gentle pulse + arpeggio from the solution onward
bpm = 96
step = 60 / bpm / 2
tcur, i = t_solution, 0
while tcur < total - 3:
    chord = chords_bright[int((tcur - t_solution) // BAR) % 4]
    seq = [chord[0], chord[1], chord[2], chord[1], chord[3], chord[2], chord[1], chord[2]]
    nn = seq[i % 8]
    amp = 1.25 if tcur >= t_stake else 0.9
    if t_solution + 4 < tcur:
        add(tone(hz(nn[:-1] + str(int(nn[-1]) + 1)), 1.2, "pluck") * amp, tcur)
    if i % 4 == 0 and tcur >= t_stake:  # soft sub pulse in the staking section
        add(tone(hz(chord[0]), 1.0, "pluck") * 1.1, tcur)
    tcur += step
    i += 1

# sparse bell notes in the problem section to build tension
for tt_, nn in [(6, "E5"), (14, "C5"), (22, "A4"), (31, "E5"), (40, "G4"), (50, "C5"), (58, "A4"), (66, "E5"), (75, "D5")]:
    if tt_ < t_solution - 2:
        add(tone(hz(nn), 2.4, "pluck") * 0.8, tt_)

# stereo-less final shaping
out = np.tanh(out * 1.6) * 0.8
out *= np.minimum(t / 2.0, 1) * np.minimum((total - t) / 3.0, 1)
pcm = (out / max(1e-9, np.abs(out).max()) * 0.85 * 32767).astype(np.int16)
dest = root / "public" / "music.wav"
with wave.open(str(dest), "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes(pcm.tobytes())
print("music", round(total, 1), "s ->", dest)
