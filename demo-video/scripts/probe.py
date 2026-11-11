from mcp_kokoro_tts.lib import ensure_provisioned, format_voice_listing, TEXT_MAX_LEN
import sys
p = ensure_provisioned(force=False, log=lambda m: print(m, file=sys.stderr))
print("MAX", TEXT_MAX_LEN)
print(format_voice_listing(p))
