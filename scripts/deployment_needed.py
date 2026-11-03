"""Compare the content fingerprint with production; no credentials or writes."""
from pathlib import Path
import json
import time
from urllib.request import Request, urlopen
ROOT=Path(__file__).resolve().parents[1]

def needed():
    expected=json.loads((ROOT/'.public/data/publish-state.json').read_text())
    try:
        req=Request('https://hotelagava.ge/data/publish-state.json?check='+str(time.time_ns()),headers={'User-Agent':'Mozilla/5.0 (Agava publication check)'})
        with urlopen(req,timeout=30) as res: actual=json.load(res)
        return actual != expected
    except Exception:
        return True  # Missing marker, network failure, or a previously failed deployment.
if __name__=='__main__': print('true' if needed() else 'false')
