# -*- coding: utf-8 -*-
"""Generate js/config.js from .env.local (URL + anon key only)."""
import os, re, io

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(root, ".env.local")
out_path = os.path.join(root, "js", "config.js")

env = {}
with io.open(env_path, encoding="utf-8") as f:
    for line in f:
        m = re.match(r"^([A-Z_]+)=(.*)$", line.strip())
        if m:
            env[m.group(1)] = m.group(2).strip()

url = env.get("SUPABASE_URL", "")
anon = env.get("SUPABASE_ANON_KEY", "")
configured = "YOUR-" not in url and "YOUR-" not in anon and url and anon

content = u"""/* AUTO-GENERATED from .env.local — არ ჩაასწორო ხელით.
   განახლება: python scripts/gen-config.py */
window.AGAVA_CONFIG = {
  SUPABASE_URL: "%s",
  SUPABASE_ANON_KEY: "%s",
  CONFIGURED: %s,
  WHATSAPP: "995597121212",
  PHONE: "+995597121212"
};
""" % (url, anon, "true" if configured else "false")

with io.open(out_path, "w", encoding="utf-8") as f:
    f.write(content)
print("config.js written, CONFIGURED =", configured)
