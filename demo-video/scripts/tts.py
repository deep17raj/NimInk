"""Generate per-scene voiceover with the Kokoro engine used by the kokoro-tts MCP server."""
import json, sys, os, shutil
from pathlib import Path
import soundfile as sf
from mcp_kokoro_tts.lib import (ensure_provisioned, SpeechEngine, list_voice_files,
                                resolve_voice_path, package_voices_dir)

VOICE = os.environ.get("VO_VOICE", "af_heart")
SPEED = float(os.environ.get("VO_SPEED", "0.98"))
root = Path(__file__).resolve().parent.parent
out = root / "public" / "vo"
out.mkdir(parents=True, exist_ok=True)
only = set(sys.argv[1:])

paths = ensure_provisioned(force=False, log=lambda m: print(m, file=sys.stderr))
engine = SpeechEngine(paths)
vp = resolve_voice_path(VOICE, model_dir=paths.model_dir, package_voices=package_voices_dir())
scenes = json.loads((root / "scripts" / "scenes.json").read_text(encoding="utf-8"))
durs_file = out / "durations.json"
durs = json.loads(durs_file.read_text()) if durs_file.exists() else {}
tmp = root / "scripts" / "_tmp"
for s in scenes:
    if only and s["id"] not in only:
        continue
    wav = engine.synthesize(s["text"], voice_path=vp, speed=SPEED, output_dir=tmp)
    dest = out / f'{s["id"]}.wav'
    shutil.move(str(wav), dest)
    info = sf.info(str(dest))
    durs[s["id"]] = round(info.frames / info.samplerate, 3)
    print(s["id"], durs[s["id"]], flush=True)
durs_file.write_text(json.dumps(durs, indent=1))
shutil.rmtree(tmp, ignore_errors=True)
print("total", round(sum(durs.values()), 1))
