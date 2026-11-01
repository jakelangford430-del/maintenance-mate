"""Vacate-work classifier. Rules live in config.json['vacate']; same rules used by build_data.py and the spot-check."""
import re
def compile_rules(v):
    w=lambda L: re.compile(r'\b(?:'+'|'.join(L)+r')\b', re.I)
    return w(v['include']), w(v['exclude']), set(v.get('exclude_triage',[]))
def classify(text, triage, R):
    inc, exc, xt = R
    if triage in xt: return False, None, 'triage '+triage
    m=inc.search(text or '')
    if not m: return False, None, None
    x=exc.search(text or '')
    if x: return False, m.group(0), 'excluded: '+x.group(0)
    return True, m.group(0), None
