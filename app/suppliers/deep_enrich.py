#!/usr/bin/env python3
"""Second-pass enrichment for suppliers with no usable contact, most-used first.
Search: Brave (fallback Bing; DuckDuckGo blocks this box). Queries: "name" office WA / "name" WA / name facebook WA.
Accepts (1) the supplier's own website (domain carries the name) read for phone/mobile/email/form,
(2) phones shown in a search result whose title carries the business name and whose text names the office area or WA
(Facebook, Yellow Pages, True Local, hipages, Oneflare listings), (3) ABN from abr.business.gov.au when the name matches
and the postcode is in WA. Every value keeps its source URL + date. Nothing is invented. Values that are partial
matches are stored with verify='needs the owner'. Writes back into data/contacts.json (refresh_contacts.py carries them over).
Usage: deep_enrich.py [--limit N] [--pause S]"""
import json,re,sys,time,html,urllib.parse,argparse,datetime
from pathlib import Path
A=Path(__file__).resolve().parent.parent;D=A/'data'
ap=argparse.ArgumentParser();ap.add_argument('--limit',type=int,default=1000);ap.add_argument('--pause',type=float,default=2.5);ap.add_argument('--names',default='');a=ap.parse_args()
src=open(Path(__file__).parent/'refresh_contacts.py').read();sec=src[src.index('# ---- web enrichment ----'):src.index('def enrich(x):')]
class _A:pause=0
ns={'a':_A,'re':re,'time':time,'html':html,'urllib':urllib};exec('import urllib.request,urllib.parse\n'+sec,ns)
get,readsite,score,toks,PH,EM,MOB,SKIP=(ns[k] for k in ('get','readsite','score','toks','PH','EM','MOB','SKIP'))
import subprocess
def cget(u,t=15):
  r=subprocess.run(['curl','-sL','-m',str(t),'-A','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36','-w','\n%{http_code}',u],capture_output=True,text=True,errors='ignore')
  b,_,c=r.stdout.rpartition('\n')
  if c!='200':raise Exception('http '+c)
  return u,b
TODAY=datetime.date.today().isoformat()
OFFAREA={'Mandurah':r'mandurah|peel|halls head|rockingham|pinjarra|falcon|dawesville|baldivis|waroona|62[01]\d','Perth':r'perth|\b6[01]\d\d\b','Bunbury':r'bunbury|south ?west|busselton|australind|dalyellup|eaton|collie|harvey|capel|davenport|62[2-9]\d','Geraldton':r'geraldton|mid ?west|dongara|65[0-3]\d'}
WA=re.compile(r'\bWA\b|western australia|\b6\d{3}\b',re.I)
def brave(q):
  for w in (0,10,30):
    time.sleep(w+a.pause)
    try:
      _,h=cget('https://search.brave.com/search?q='+urllib.parse.quote(q)+'&source=web',15)
      out=[]
      for b in re.split(r'data-type="web"',h)[1:]:
        u=re.search(r'<a href="(https?://[^"]+)"',b);t=re.search(r'title="([^"]*)"',b);s=re.search(r'class="content[^"]*">(.*?)</div>',b,re.S)
        if u:out.append((html.unescape(u.group(1)),html.unescape(t.group(1)) if t else '',html.unescape(re.sub('<[^>]+>','',s.group(1))) if s else ''))
      if out or 'data-type' in h:return out,'Brave'
    except Exception as e:err=e
  _,h=cget('https://www.bing.com/search?q='+urllib.parse.quote(q)+'&cc=AU',15);out=[]
  for b in re.split(r'<li class="b_algo"',h)[1:]:
    u=re.search(r'<h2[^>]*><a[^>]*href="(https?://[^"]+)"[^>]*>(.*?)</a>',b,re.S);s=re.search(r'<p[^>]*>(.*?)</p>',b,re.S)
    if u:out.append((html.unescape(u.group(1)),html.unescape(re.sub('<[^>]+>','',u.group(2))),html.unescape(re.sub('<[^>]+>','',s.group(1))) if s else ''))
  return out,'Bing'
def namehit(n,t):
  T=toks(n);tl=re.sub(r'[^a-z0-9 ]',' ',t.lower());h=[x for x in T if re.search(r'\b'+re.escape(x)+r'\b',tl) or x in tl.replace(' ','')]
  return len(h)/len(T) if T else 0
def abr(n):
  try:_,h=cget('https://abr.business.gov.au/Search/ResultsActive?SearchText='+urllib.parse.quote(n),15)
  except Exception:return None
  best=None
  for r in re.findall(r'<tr>(.*?)</tr>',h,re.S):
    c=[re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',x))).strip() for x in re.findall(r'<td[^>]*>(.*?)</td>',r,re.S)]
    if len(c)<4:continue
    abn=re.search(r'\d{2} \d{3} \d{3} \d{3}',c[0]);loc=c[-1];nm=c[1]
    if abn and re.search(r'\b6\d{3}\s+WA\b',loc):
      sc=namehit(n,nm)
      norm=lambda s:re.sub(r'[^a-z0-9]','',re.sub(r'\b(pty|ltd|the|and)\b','',s.lower()))
      if norm(nm)==norm(n) and (not best or best[3]<2):best=(abn.group(0),nm,loc,2)
      elif sc==1 and not best:best=(abn.group(0),nm,loc,1)
  return best
def put(x,k,v,src,verify=None,why=None):
  if not v or (k in x['f'] and not x['f'][k].get('verify')):return False
  if k in x['f'] and x['f'][k].get('by'):return False
  x['f'][k]={'v':str(v).strip(),'src':src,'checked':TODAY,**({'verify':verify,'why':why} if verify else {})};return True
C=json.load(open(D/'contacts.json'));L=C['suppliers']
usable=lambda x:x['name']=='__' or any(k in x['f'] and not x['f'][k].get('verify') for k in ('email','mobile','phone','form'))
due=[x for x in sorted(L,key=lambda x:-x['used']) if not usable(x) and not x.get('deep_checked')]
if a.names:due=[x for x in L if x['name'] in a.names.split('|')]
due=due[:a.limit];print('deep due',len(due),flush=True)
for i,x in enumerate(due):
  n=x['name'];offs=x['offices'] or [];area=re.compile('|'.join(OFFAREA[o] for o in offs if o in OFFAREA) or r'\bWA\b',re.I);got=[];log=[]
  try:
    R=[];eng=set()
    for q in ([f'"{n}" {offs[0]} WA'] if offs else [])+[f'"{n}" WA',f'{n} WA facebook']:
      r,e=brave(q);R+=r;eng.add(e)
      if any(score(n,u,t)>=0.5 and not SKIP.search(urllib.parse.urlparse(u).netloc) for u,t,_ in r) and len(R)>8:break
    # 1 own website
    site=[(score(n,u,t),u,t,s) for u,t,s in R if not SKIP.search(urllib.parse.urlparse(u).netloc)]
    site.sort(key=lambda c:-c[0])
    if site and site[0][0]>=0.5:
      sc,u,t,s=site[0];p=urllib.parse.urlparse(u);root=f'{p.scheme}://{p.netloc}/'
      try:
        fu,res=readsite(root);_,hh=cget(root,12);ok=bool(area.search(hh) or WA.search(hh))
        v,w=(None,None) if sc>=1 and ok else ('needs the owner','Website matched on part of the name only' if sc<1 else 'Website does not mention the office area or WA')
        if put(x,'website',root.rstrip('/'),'Search result: business website',v,w):got.append('website')
        for k in ('phone','mobile','email','address','form'):
          if k in res and put(x,k,res[k][0],res[k][1],v,w):got.append(k)
      except Exception as e:log.append('site '+str(e)[:60])
    # 2 listing snippets (Facebook, Yellow Pages, True Local, hipages, Oneflare...) naming the business + area
    for u,t,s in R:
      if 'phone' in x['f'] and not x['f']['phone'].get('verify'):break
      txt=t+' '+s;nh=namehit(n,t)
      if nh<1:continue
      ph=[p for p in PH.findall(txt) if not re.match(r'1[38]00|13',re.sub(r'\D','',p))]
      if not ph:continue
      ok=area.search(txt) or WA.search(txt)
      dom=urllib.parse.urlparse(u).netloc.replace('www.','')
      v,w=(None,None) if ok and len(set(re.sub(r'\D','',p) for p in ph))==1 else ('needs the owner','Search snippet: area not shown or several numbers')
      if put(x,'phone',re.sub(r'\s+',' ',ph[0]),f'{u} (search listing on {dom})',v,w):got.append('phone')
      m=[p for p in ph if MOB.search(p)]
      if m and put(x,'mobile',re.sub(r'\s+',' ',m[0]),f'{u} (search listing on {dom})',v,w):got.append('mobile')
    # Facebook page link (manual contact route)
    fb=[u for u,t,s in R if 'facebook.com' in u and namehit(n,t)>=1 and (area.search(t+s) or WA.search(t+s))]
    if fb and put(x,'facebook',fb[0].split('?')[0],'Search result: Facebook page'):got.append('facebook')
    # 3 ABR
    b=abr(n)
    if b:
      abn,nm,loc,q=b
      if put(x,'abn',abn,'https://abr.business.gov.au/ABN/View?abn='+abn.replace(' ',''),None if q==2 else 'needs the owner',None if q==2 else f'ABR name "{nm}" is close, not exact'):got.append('abn')
      x['abr_loc']=loc
    x['deep_checked']=TODAY;x['deep_engine']=sorted(eng)
  except Exception as e:log.append('ERR '+str(e)[:80])
  print(i,x['used'],n,'->',','.join(got) or '-',' '.join(log),flush=True)
  if i%10==9:json.dump(C,open(D/'contacts.json','w'),indent=0)
json.dump(C,open(D/'contacts.json','w'),indent=0);print('done',flush=True)
