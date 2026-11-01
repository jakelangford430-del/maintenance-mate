"""Maintenance Mate job references (MM-10001 ...), allocated once per source ref and kept forever.
Mapping lives in data/mm_refs.json: {"next": int, "map": {"tapi:TAPI-11166": 10001, ...}}.
Imported jobs use MM-10001 upward (5 digits). Jobs lodged in the portal itself keep MM-1001..MM-9999
(allocated by the server), so the two ranges never collide. Never renumber or delete entries."""
import json, re, os
from pathlib import Path
P = Path(__file__).parent/'data'/'mm_refs.json'
START = 10001
class Refs:
    def __init__(self):
        self.d = json.loads(P.read_text()) if P.exists() else {"next": START, "map": {}}
        self.new = 0
    def key(self, source, ref): return f"{source.lower()}:{str(ref).strip()}"
    def get(self, source, ref):
        k = self.key(source, ref); m = self.d["map"]
        if k not in m: m[k] = self.d["next"]; self.d["next"] += 1; self.new += 1
        return "MM-%d" % m[k]
    def save(self):
        tmp = P.with_suffix('.tmp'); tmp.write_text(json.dumps(self.d, indent=0, sort_keys=True)); os.replace(tmp, P)
TAPI = re.compile(r'^TAPI-\d+$')
def relabel(obj, refs, idkey=None):
    """Walk built data: every dict with a Tapi 'wo' gets wo=MM ref, source='Tapi', source_ref=<Tapi ref>."""
    if isinstance(obj, list):
        for i, x in enumerate(obj):
            if isinstance(x, str) and TAPI.match(x): obj[i] = refs.get('tapi', x)
            else: relabel(x, refs)
    elif isinstance(obj, dict):
        w = obj.get('wo')
        if isinstance(w, str) and TAPI.match(w.strip()):
            obj['source'], obj['source_ref'], obj['wo'] = 'Tapi', w.strip(), refs.get('tapi', w)
        elif w == '(no WO)' and obj.get('id'):
            obj['source'], obj['source_ref'], obj['wo'] = 'Tapi', None, refs.get('tapi-issue', obj['id'])
        for k, v in obj.items():
            if k == 'source_ref': continue
            if isinstance(v, (dict, list)): relabel(v, refs)
            elif isinstance(v, str) and TAPI.match(v): obj[k] = refs.get('tapi', v)
