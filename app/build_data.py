#!/usr/bin/env python3
"""Build portal JSON from real Platinum/Tapi data. No invented data.
Usage: python3 build_data.py            -> data/portal.json (INTERNAL: includes street addresses)
       python3 build_data.py --public   -> data/portal.json with street addresses stripped (suburb only)
Sources: /workspace/tapi/Outstanding_jobs.xlsx, Dashboard_data.xlsx, jobs_export.csv (counts only),
         design/final/suppliers-data.json (trade labels), contractor lists for suggested suppliers.
"""
import json, sys, math, re
from pathlib import Path
import pandas as pd

HERE = Path(__file__).parent
T = Path('/workspace/tapi')
PUBLIC = '--public' in sys.argv
cfg = json.load(open(HERE/'config.json'))
OFF = cfg['offices']
AS_OF = pd.Timestamp(cfg['as_of'])

def clean(v):
    if v is None: return None
    if isinstance(v, float) and math.isnan(v): return None
    if isinstance(v, pd.Timestamp): return None if pd.isna(v) else v.strftime('%Y-%m-%d')
    if hasattr(v, 'item'): v = v.item()
    return v

def addr(a):
    """Street address internally; suburb only in a public build."""
    if not isinstance(a, str): return None
    a = a.replace(', WA', '').strip()
    if PUBLIC:
        parts = [p.strip() for p in a.split(',')]
        return parts[-1] if len(parts) > 1 else '[address withheld]'
    return a

X = pd.read_excel(T/'Outstanding_jobs.xlsx', sheet_name=None)
calc, tri, board, reg = X['Outstanding calc'], X['Triage'], X['Supplier board'], X['Regions']
qsum = dict(zip(X['Email queue summary'].item, X['Email queue summary'].value))
D = pd.read_excel(T/'Dashboard_data.xlsx', sheet_name=None)

# ---------- jobs (open) ----------
op = calc[calc.is_open == True].merge(
    tri[['issue_id','region','pm','triage','triage_reason','reconfirm','reconfirm_reasons','overdue_triage']],
    on='issue_id', how='left').drop_duplicates('issue_id')
jobs = []
for r in op.itertuples():
    jobs.append(dict(wo=clean(r.workorder_number) or '(no WO)', id=r.issue_id, title=str(r.title).strip(), stage=r.stage, tapi_priority=r.priority,
        triage=clean(r.triage), triage_reason=clean(r.triage_reason), category=r.category,
        supplier=clean(r.supplier), pm=clean(r.pm) or clean(r.job_agent),
        office=OFF.get(r.region), address=addr(r.address),
        lodged=clean(r.lodged), requested=clean(r.requested), requested_type=clean(r.requested_date_type),
        days_open=clean(r.days_out_lodged), days_past_sla=clean(r.days_past_sla), sla_days=clean(r.sla_days),
        last_action=clean(r.last_action), days_since_action=clean(r.days_since_action),
        next_action=clean(r.next_action), next_party=clean(r.next_party),
        next_due=clean(r.next_due), tenant_update_due=clean(r.tenant_update_due),
        reconfirm=bool(r.reconfirm) if r.reconfirm == r.reconfirm else False,
        reconfirm_reasons=clean(r.reconfirm_reasons), overdue=bool(r.days_past_sla > 0),
        tapi_url=r.tapi_url))

# ---------- offices + safe-zone status (worst measure wins) ----------
th = cfg['office_thresholds']; LV = ['safe','watch','risk','critical']
def lvl(v, t, inclusive=False):
    if inclusive:  # count thresholds: safe<=s, watch<=w, risk<=r
        return 0 if v <= t['safe'] else 1 if v <= t['watch'] else 2 if v <= t['risk'] else 3
    return 0 if v < t['safe'] or (t['safe']==0 and v==0) else 1 if v < t['watch'] else 2 if v < t['risk'] else 3
offices = []
for r in reg.itertuples():
    oj = [j for j in jobs if j['office'] == OFF[r.region]]
    n = len(oj) or 1
    stale30 = 100*sum(1 for j in oj if (j['days_since_action'] or 0) >= 30)/n
    recon = 100*sum(j['reconfirm'] for j in oj)/n
    m = dict(p1_overdue=lvl(r.p1_overdue, th['p1_overdue'], True), overdue_pct=lvl(r.overdue_pct, th['overdue_pct']),
             stale_30d_pct=lvl(stale30, th['stale_30d_pct']), reconfirm_pct=lvl(recon, th['reconfirm_pct']))
    offices.append(dict(office=OFF[r.region], region=r.region, open=int(r.open), overdue=int(r.overdue),
        overdue_pct=float(r.overdue_pct), p1_open=int(r.p1_open), p1_overdue=int(r.p1_overdue),
        stale30_pct=round(stale30,1), reconfirm_pct=round(recon,1), reconfirm=int(r.reconfirm),
        no_supplier=int(r.no_supplier), awaiting_approval=int(r.awaiting_approval), owner_calls=int(r.owner_calls),
        reassign=int(r.reassign_tasks), median_days_open=float(r.median_days_open), intake_per_week=float(r.intake_per_week),
        rank=int(r.rank), measure_levels={k: LV[v] for k,v in m.items()}, status=LV[max(m.values())]))
offices.sort(key=lambda o: o['rank'])

k = D['open KPIs'].iloc[0]
on_target = sum(1 for j in jobs if not j['overdue'])
na = op.next_action.value_counts()
out = dict(
    as_of=cfg['as_of'], public_build=PUBLIC, config=cfg,
    kpis=dict(open=int(k.open), overdue=int(k.overdue), overdue_pct=float(k.overdue_pct), stale=int(k.stale),
              urgent_open=int(k.urgent_open), urgent_overdue=int(k.urgent_overdue), median_age=float(k.median_age),
              jobs_in_calc=len(jobs), on_target=on_target, on_target_pct=round(100*on_target/len(jobs)),
              p1_overdue=int(reg.p1_overdue.sum()), reconfirm=int(sum(j['reconfirm'] for j in jobs)),
              no_supplier=int((op.category=='No supplier assigned').sum())),
    actions={a:int(v) for a,v in na.items()},
    queues=dict(supplier=int(qsum['sup_today']), owner=int(qsum['own_today']), tenant=int(qsum['ten_today']),
                note=qsum.get('NOTE')),
    offices=offices, jobs=jobs,
    window=dict(m3=D['3m KPIs'].iloc[0].map(clean).to_dict(), m4=D['4m KPIs'].iloc[0].map(clean).to_dict()),
    sources=['Outstanding_jobs.xlsx (Tapi last synced 22 Oct 2026)','Dashboard_data.xlsx','contractor lists'])

# ---------- completed-work history (neutral facts only) ----------
JX = pd.read_csv(T/'jobs_export.csv')
from mm_refs import Refs, relabel
MM = Refs()
for _r in JX.sort_values(['created_at','workorder_number'], na_position='last').itertuples():
    if isinstance(_r.workorder_number, str) and _r.workorder_number.strip(): MM.get('tapi', _r.workorder_number)
done = JX[JX.state.str.lower().isin(['completed','closed'])].copy()
sub2reg = dict(zip(X['Suburb to region'].suburb.str.lower(), X['Suburb to region'].region))
def suburb(a):
    if not isinstance(a,str): return None
    p=[x.strip() for x in a.replace(', WA','').split(',')]; return p[-1] if len(p)>1 else None
done['suburb'] = done.address.map(suburb)
done['office'] = done.suburb.str.lower().map(sub2reg).map(OFF)
# invoice date only where the invoice's job number AND supplier both match the job (reliable link)
INV = pd.read_csv(T/'invoices.csv')
INV = INV[INV.Status=='Approved'].copy()
INV['rec'] = pd.to_datetime(INV.Received.str.split(' ').str[0], format='%d/%m/%Y', errors='coerce')
inv = INV.groupby(['Job no.','Supplier']).rec.max()
hist = {}
for r in done.itertuples():
    if not isinstance(r.company_supplier_name,str): continue
    d = inv.get((r.workorder_number, r.company_supplier_name))
    if d is not None and not pd.isna(d): date, basis = d.strftime('%Y-%m-%d'), 'invoice received'
    else: date, basis = str(r.created_at)[:10], 'lodged'
    hist.setdefault(r.company_supplier_name, []).append(dict(wo=r.workorder_number, title=str(r.title).strip(),
        property=(r.suburb if PUBLIC else addr(r.address)), office=r.office, date=date, date_basis=basis))
# ---------- supplier directory: Preferred (booked in Tapi) and Suggested (not yet used) ----------
def norm(n): 
    n = re.sub(r'\b(pty|ltd|limited|the|wa|perth)\b', ' ', str(n).lower())
    return re.sub(r'[^a-z0-9]', '', n)
TRADES = [('Plumbing & gas', r'plumb|gas|drain|hot water'), ('Electrical', r'electric|sparky|solar'),
    ('Air-con & heating', r'air ?con|cool|heat|refrig|hvac'), ('Locks & security', r'lock|security|key'),
    ('Glass & windows', r'glass|glaz|window|screen|blind|shutter|curtain'), ('Roofing & gutters', r'roof|gutter'),
    ('Fencing & gates', r'fenc|gate'), ('Garden & trees', r'garden|lawn|tree|landscap|retic|mow'),
    ('Pest control', r'pest|termite'), ('Cleaning & carpets', r'clean|carpet|steam'), ('Painting', r'paint'),
    ('Appliances', r'appliance|dishwasher|oven|washer'), ('Doors & garage', r'door|garage'),
    ('Building & handyman', r'build|construct|handy|maint|carpent|renovat|property|repair|tiling|tile')]
def trade_of(name):
    for t, p in TRADES:
        if re.search(p, str(name), re.I): return t
    return 'Other'
used = set(norm(x) for x in pd.read_csv(T/'suppliers.csv').company.dropna()) | set(norm(x) for x in JX.company_supplier_name.dropna())
used.discard('')
pref = {}
booked = JX[JX.company_supplier_name.notna()].copy()
booked['office'] = booked.address.map(suburb).str.lower().map(sub2reg).map(OFF)
for (name, office), g in booked.groupby(['company_supplier_name', 'office']):
    c = int(sum(1 for x in hist.get(name, []) if x['office'] == office))
    if not c: continue
    t = trade_of(name)
    pref.setdefault(office, {}).setdefault(t, []).append(dict(name=name, completed_in_office=c, jobs_in_office=len(g)))
for o in pref:
    for t in pref[o]: pref[o][t].sort(key=lambda x: x['name'].lower())
pref_hist = {x['name']: sorted(hist.get(x['name'], []), key=lambda h: h['date'], reverse=True)[:40]
             for o in pref.values() for L in o.values() for x in L}
AREA = lambda r: 'Mandurah' if 'mandurah' in r.lower() else 'Perth'   # Cockburn, Rockingham, Fremantle, Kwinana are Perth metro
sug = {}; seen = set()
for f in ['/workspace/property-contractors-all-areas.csv', '/workspace/property-suppliers-all-areas.csv']:
    d = pd.read_csv(f)
    for r in d.itertuples(index=False):
        name = str(r[0]).strip(' .'); k = norm(name)
        if not k or k in used or k in seen: continue
        seen.add(k)
        areas = sorted(set(AREA(x) for x in str(r[3]).split(';')))
        item = dict(name=name, trade=str(r[2]) if isinstance(r[2], str) else None, area=str(r[3]),
                    location=r[4] if isinstance(r[4], str) else None, phone=r[5] if isinstance(r[5], str) else None,
                    email=r[6] if isinstance(r[6], str) else None, website=r[7] if isinstance(r[7], str) else None)
        for o in areas: sug.setdefault(o, {}).setdefault(str(r[1]), []).append(item)
for o in sug:
    for t in sug[o]: sug[o][t].sort(key=lambda x: x['name'].lower())
out['suppliers_dir'] = dict(
    preferred=dict(basis='Booked with Platinum before: completed jobs in this office in the Tapi job history. Trade is inferred from the business name.', by_office=pref, history=pref_hist),
    suggested=dict(basis='Not yet used: suggestions to try. No licence, insurance or rate checks have been done.', by_office=sug),
    offices=list(OFF.values()))

# ---------- Find a trade: job trade inferred from title + description (same rules as supplier trades) ----------
desc = dict(zip(JX.issue_id, JX.description))
for j in jobs:
    j['trade'] = trade_of(j['title'] + ' ' + str(desc.get(j['id']) or ''))
    j['needs_trade'] = not j['supplier']
    j['not_responding'] = bool(j['supplier']) and (j['days_since_action'] or 0) >= 14
# ---------- Vacate work: rule list in config.json['vacate'] (see vacate_rules.py) ----------
from vacate_rules import compile_rules, classify
_VR = compile_rules(cfg['vacate'])
for j in jobs:
    ok, m, why = classify(j['title'] + ' || ' + str(desc.get(j['id']) or ''), j['triage'], _VR)
    j['vacate_auto'] = bool(ok); j['vacate_rule'] = m if ok else None
out['vacate_rules'] = dict(include=cfg['vacate']['include'], exclude=cfg['vacate']['exclude'], exclude_triage=cfg['vacate']['exclude_triage'])
done['trade'] = (done.title.fillna('') + ' ' + done.description.fillna('')).map(trade_of)
match = {}
for (office, t, name), g in done[done.company_supplier_name.notna() & done.office.notna()].groupby(['office','trade','company_supplier_name']):
    last = max(h['date'] for h in hist.get(name, []) if h['office'] == office) if hist.get(name) else None
    match.setdefault(office, {}).setdefault(t, []).append(dict(name=name, jobs=int(len(g)), last=last))
for o in match:
    for t in match[o]: match[o][t].sort(key=lambda x: x['name'].lower())   # alphabetical: no ranking
sugt = {}
for o, cats in sug.items():
    for L in cats.values():
        for x in L:
            t = trade_of((x['trade'] or '')); sugt.setdefault(o, {}).setdefault(t, {})[x['name']] = x
out['find_trade'] = dict(preferred=match, suggested={o: {t: sorted(v.values(), key=lambda x: x['name'].lower()) for t, v in d.items()} for o, d in sugt.items()},
    basis='Trade is inferred from the job title and description. Matches are contractors who completed that trade in that office (Tapi job history), then contractors not yet used from the directory data.')
for o in match: match[o].pop('Other', None)   # unrecognised trade: no matching
for j in jobs: j['pref_matches'] = len(match.get(j['office'], {}).get(j['trade'], []))

# ---------- benchmarks (derived from Tapi averages; parameters in config.benchmarks) ----------
B = cfg['benchmarks']
JX['c'] = pd.to_datetime(JX.created_at, format='mixed')
JX['suburb'] = JX.address.map(suburb)
JX['office'] = JX.suburb.str.lower().map(sub2reg).map(OFF)
INVd = INV.groupby(['Job no.','Supplier']).rec.min().reset_index()
comp = JX[JX.state=='Completed'].merge(INVd, left_on=['workorder_number','company_supplier_name'], right_on=['Job no.','Supplier'])
comp['days'] = (comp.rec - comp.c.dt.normalize()).dt.days
comp = comp[comp.days >= 0]
win = AS_OF - pd.Timedelta(days=B['intake_window_days'])
full_weeks = (AS_OF - JX.c.min()).days / 7
def bench(sel_jobs, sel_x, sel_comp, n_offices=1):
    wk = len(sel_x[sel_x.c >= win]) / (B['intake_window_days']/7)
    wk_full = len(sel_x) / full_weeks
    cap = wk * B['target_turnaround_weeks']; ocap = cap * B['overdue_share_of_cap']
    op_ = len(sel_jobs); ov = sum(j['overdue'] for j in sel_jobs)
    return dict(intake_week_4m=round(wk,1), intake_month_4m=round(wk*52/12,1), intake_week_full=round(wk_full,1),
        intake_month_full=round(wk_full*52/12,1), median_completion_days=clean(sel_comp.days.median()),
        median_completion_days_4m=clean(sel_comp[sel_comp.c>=win].days.median()), mean_completion_days=round(float(sel_comp.days.mean()),1),
        completion_sample=len(sel_comp), open=op_, overdue=ov, overdue_pct=round(100*ov/op_,1) if op_ else 0,
        avg_open_per_office=round(op_/n_offices,1), outstanding_cap=round(cap), overdue_cap=round(ocap),
        outstanding_gap=op_-round(cap), overdue_gap=ov-round(ocap))
out['benchmarks'] = dict(params=B, history_start=JX.c.min().strftime('%Y-%m-%d'),
    portfolio=bench(jobs, JX, comp, 4),
    offices={o: bench([j for j in jobs if j['office']==o], JX[JX.office==o], comp[comp.office==o]) for o in OFF.values()})

# ---------- urgent (P1) monitor: ESTIMATED history ----------
import sys as _s; _s.path.insert(0, str(T))
import importlib, io, contextlib
import os as _os; _cwd=_os.getcwd(); _os.chdir(T)
with contextlib.redirect_stdout(io.StringIO()): TR = importlib.import_module('triage')
_os.chdir(_cwd)
closed = JX[JX.state.isin(['Completed','Cancelled'])].copy()
closed['text'] = (closed.title.fillna('') + ' || ' + closed.description.fillna('')).str.replace(r'\s+',' ',regex=True)
closed['triage'] = [TR.triage(t, TR.category(t), ti)[0] for t,ti in zip(closed.text, closed.title)]
closed = TR.apply_ovr(closed)
cp1 = closed[closed.triage=='P1'].merge(INVd, how='left', left_on=['workorder_number','company_supplier_name'], right_on=['Job no.','Supplier'])
cp1 = cp1[cp1.rec.isna() | (cp1.rec >= cp1.c.dt.normalize())]
U = cfg['urgent']
def urgent(sel_open, sel_cp1):
    now = len(sel_open); r = dict(open_now=now)
    for d in U['windows_days']:
        D = AS_OF - pd.Timedelta(days=d)
        lodged_since = sum(1 for j in sel_open if pd.Timestamp(j['lodged']) > D)
        closed_since = int(((sel_cp1.c <= D) & (sel_cp1.rec > D)).sum())
        r[f'open_{d}d_ago_est'] = now - lodged_since + closed_since
        r[f'change_vs_{d}d'] = now - r[f'open_{d}d_ago_est']
        r[f'cleared_{d}d'] = int((sel_cp1.rec > D).sum())
    r['cleared_per_week_30d'] = round(r['cleared_30d'] / (30/7), 1)
    r['closed_no_date'] = int(sel_cp1.rec.isna().sum())
    w = sel_cp1[sel_cp1.rec.notna()].sort_values('rec', ascending=False).head(U['recent_wins_count'])
    r['recent_wins'] = [dict(wo=x.workorder_number, title=str(x.title).strip(), property=(x.suburb if PUBLIC else addr(x.address)),
        office=x.office, closed=x.rec.strftime('%Y-%m-%d'), days=int((x.rec - x.c.normalize()).days), supplier=x.company_supplier_name) for x in w.itertuples()]
    return r
P1o = [j for j in jobs if j['triage']=='P1']
out['urgent'] = dict(estimated=True,
    basis='ESTIMATED. Export is one snapshot. Past counts = open now, minus urgent jobs lodged since, plus urgent jobs closed since (closure date = approved invoice received, only where job number and supplier both match). Closed urgent jobs without a linked invoice date are not counted, so past counts may be understated. Urgent for closed jobs is the same P1 triage rules run on title and description.',
    portfolio=urgent(P1o, cp1), offices={o: urgent([j for j in P1o if j['office']==o], cp1[cp1.office==o]) for o in OFF.values()})

# ---------- snapshot history (exact going forward) ----------
hp = HERE/'data/history.json'
hist_s = json.loads(hp.read_text()) if hp.exists() else []
snap = dict(as_of=cfg['as_of'], built_at=pd.Timestamp.now().isoformat(timespec='seconds'),
    portfolio=dict(open=len(jobs), overdue=sum(j['overdue'] for j in jobs), urgent_open=len(P1o), urgent_overdue=sum(j['overdue'] for j in P1o)),
    offices={o: dict(open=sum(1 for j in jobs if j['office']==o), overdue=sum(1 for j in jobs if j['office']==o and j['overdue']),
        urgent_open=sum(1 for j in P1o if j['office']==o)) for o in OFF.values()})
hist_s = [h for h in hist_s if h['as_of'] != snap['as_of']] + [snap]   # one snapshot per data date
# ---------- Properties ranked by maintenance volume (all Tapi jobs) -> data/properties.js ----------
PC = cfg['property_categories']; _pc = {k: re.compile(r'\b(?:' + '|'.join(v) + r')\b', re.I) for k, v in PC['rules'].items()}
_open_ids = {j['id']: j for j in jobs}
def pcat(text, oj):
    if oj is not None and oj['triage'] == 'P1': return 'urgent_safety'
    for k in PC['order']:
        if k == 'cosmetic':
            if classify(text, oj['triage'] if oj else None, _VR)[0]: return k
        elif k in _pc and _pc[k].search(text): return k
    return 'general'
props = {}
for r in JX.itertuples():
    if not isinstance(r.address, str): continue
    key = r.address.replace(', WA', '').strip(); oj = _open_ids.get(r.issue_id)
    sb = suburb(r.address); off = OFF.get(sub2reg.get((sb or '').lower()))
    p = props.setdefault(key, dict(address=addr(r.address), office=off, total=0, open=0, cancelled=0, cats={k: 0 for k in PC['order']}, open_cats={k: 0 for k in PC['order']}, jobs=[]))
    c_ = pcat(str(r.title) + ' || ' + str(r.description if isinstance(r.description, str) else ''), oj)
    p['total'] += 1; p['cats'][c_] += 1; p['cancelled'] += r.state == 'Cancelled'
    if oj: p['open'] += 1; p['open_cats'][c_] += 1; oj['pcat'] = c_
    p['jobs'].append(dict(wo=r.workorder_number, title=str(r.title).strip(), date=str(r.created_at)[:10], state=r.state, cat=c_, open=bool(oj)))
for p in props.values(): p['jobs'].sort(key=lambda x: x['date'], reverse=True)
PL = sorted(props.values(), key=lambda p: (-p['total'], -p['open'], p['address'] or ''))
for i, p in enumerate(PL): p['rank'] = i + 1
relabel(PL, MM)
ptxt = json.dumps(dict(as_of=out['as_of'], labels=PC['labels'], order=PC['order'], rules=PC['rules'], note=PC['_note'],
    basis='All Tapi jobs as last synced (%d jobs with an address). Open = in the current outstanding backlog. Office from suburb.' % sum(p['total'] for p in PL), properties=PL), default=clean, separators=(',', ':'))
(HERE/'data').mkdir(exist_ok=True); (HERE/'data/properties.js').write_text('window.PROPS=' + ptxt + ';')
print('properties', len(PL), 'top', [(p['address'], p['total'], p['open']) for p in PL[:3]])
(HERE/'data').mkdir(exist_ok=True); hp.write_text(json.dumps(hist_s, indent=1))
out['snapshots'] = hist_s
import datetime as _dt
_asof = _dt.date.fromisoformat(out['as_of']); _wk = []
_cd = [str(x)[:10] for x in JX.created_at if isinstance(x, str) or x == x]
for w in range(11, -1, -1):
    e = _asof - _dt.timedelta(days=7*w); b = e - _dt.timedelta(days=7)
    _wk.append(dict(end=e.isoformat(), lodged=sum(b.isoformat() < d <= e.isoformat() for d in _cd)))
out['weekly'] = dict(basis='Jobs lodged in Tapi per 7-day week ending on the date shown (all jobs as last synced).', weeks=_wk)
(HERE/'data').mkdir(exist_ok=True)

# ---- Maintenance Matt's trade shortlist (read-only xlsx) ----
import re as _re, pandas as _pd
_mx = HERE.parent/'matt-batches'/'Platinum_Trade_Shortlist.xlsx'
if _mx.exists():
    _X = _pd.read_excel(_mx, sheet_name=None)
    _sl, _bv, _ns = _X['batch-trade-shortlist'], _X['batches-v2'], _X['new-suppliers-found']
    def _v(x):
        if x is None or (isinstance(x, float) and x != x): return None
        if isinstance(x, float) and x.is_integer(): return int(x)
        return str(x).strip() or None
    def _clean_note(t):
        t = _v(t) or ''
        t = _re.sub(r'Rating:.*?(?=ABR entity type|$)', '', t)
        t = _re.sub(r'low Google rating [\d.]+ \(\d*\)', '', t)
        return _re.sub(r'\s+', ' ', t).strip(' ;') or None
    _ver = set()
    _opts = {}
    for r in _sl.itertuples():
        lv = str(r.licence_status).strip() == 'verified (WA register)'
        d = _pd.to_numeric(r.distance_km, errors='coerce')
        if lv: _ver.add(str(r.supplier).strip().lower())
        _opts.setdefault(r.batch_id, []).append(dict(rank=int(r.option_rank), name=_v(r.supplier), panel=_v(r.panel_status), trade=_v(r.supplier_trade), abn=_v(r.abn), phone=_v(r.phone), website=_v(r.website), base=_v(r.base_location), km=None if d != d else int(round(d)), lic_ok=lv, far=bool(d == d and d > 60), new=_v(r.source) == 'new', jobs_won=_v(r.platinum_jobs_won), note=_clean_note(r.notes)))
    _mb = []
    for r in _bv.itertuples():
        _mb.append(dict(id=r.batch_id, priority=_v(r.priority), trade=_v(r.trade), office=_v(r.office), suburbs=_v(r.suburbs), jobs=int(r.job_count), overdue=_v(r.overdue_count), oldest=_v(r.oldest_days), wos=[w.strip() for w in _re.split(r'[;,\s]+', str(r.job_ids)) if w.strip()], options=sorted(_opts.get(r.batch_id, []), key=lambda o: o['rank'])))
    _new = []
    for r in _ns.itertuples():
        nt = _v(r.notes) or ''; m = _re.search(r'Base: ([^.]*)\.', nt); w = _re.search(r'Website: ([^ ]*?)\.? ', nt + ' ')
        _new.append(dict(id=_v(r.supplier_id), name=_v(r.business_name), trade=_v(r.trade), regions=_v(r.regions_covered), phone=_v(r.mobile), abn=_v(r.abn), panel=_v(r.panel_status), base=m.group(1) if m else None, website=(w.group(1) if w and w.group(1) else None), lic_ok=str(r.business_name).strip().lower() in _ver, note=_clean_note(nt)))
    out['matt'] = dict(source='Platinum_Trade_Shortlist.xlsx (25 Oct 2026)', note='Research by Maintenance Matt. No one has been contacted. Option order is his suggested order, not a ranking of quality.', batches=_mb, new_suppliers=_new)
    print('matt batches', len(_mb), 'options', sum(len(b['options']) for b in _mb), 'lic_ok', sum(o['lic_ok'] for b in _mb for o in b['options']), 'far', sum(o['far'] for b in _mb for o in b['options']), 'new', len(_new), 'new lic_ok', sum(x['lic_ok'] for x in _new))
relabel(out, MM); MM.save(); print('mm refs', len(MM.d['map']), 'new this run', MM.new)
txt = json.dumps(out, default=clean, separators=(',',':'))
(HERE/'data/portal.json').write_text(txt)
(HERE/'data/portal.js').write_text('window.PORTAL=' + txt + ';')  # works from file:// too
print('backlog', len(jobs), 'needs_trade', sum(j['needs_trade'] for j in jobs), 'not_responding', sum(j['not_responding'] for j in jobs), 'overdue', sum(j['overdue'] for j in jobs), 'pref_match', sum(j['pref_matches']>0 for j in jobs), 'needs_trade_with_match', sum(j['pref_matches']>0 and j['needs_trade'] for j in jobs), 'public', PUBLIC, 'on_target', on_target,
      {o['office']: o['status'] for o in offices})
