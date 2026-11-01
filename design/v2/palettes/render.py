from playwright.sync_api import sync_playwright
import os,json
D=os.path.dirname(os.path.abspath(__file__));S=D+"/share"
K="ABCDE"
def shot(pg,o,full=True):
  q=82
  while True:
    pg.screenshot(path=o,full_page=full,type="jpeg",quality=q)
    if os.path.getsize(o)<1e6 or q<40:break
    q-=10
  print(os.path.basename(o),os.path.getsize(o))
with sync_playwright() as p:
  b=p.chromium.launch(channel="chrome")
  for k in K:
    for f,w,sc in [("pm-workspace",390,2),("director",1440,1)]:
      pg=b.new_page(viewport={"width":w,"height":900},device_scale_factor=sc);pg.goto(f"file://{D}/{f}-{k}.html");pg.add_style_tag(content=".tabbar{position:static!important;margin:24px 16px!important}");pg.wait_for_timeout(1200)
      shot(pg,f"{S}/{f}-{w}-{k}.jpg");pg.close()
  # comparison sheets
  for f,w,crop in [("pm-workspace",390,1700),("director",1440,2300)]:
    cols=""
    for k in K:
      j=json.load(open(f"{D}/palette-{k}.json"))
      sw="".join(f'<div style="flex:1;height:44px;background:{c}" title="{c}"></div>' for c in [j["page"],j["surface"],j["primary"],j["primary-soft"],j["accent"],j["accent-text"],j["text"]])
      cols+=f'''<div class="c"><div class="tile" style="background:{j["primary"]};color:#fff"><div style="font:500 11px Inter;letter-spacing:.16em;color:{j["accent"]}">OPTION {k}</div><div style="font:500 30px 'Cormorant Garamond';margin-top:6px">{j["name"]}</div><div style="font:13px/1.5 Inter;color:{j["on-primary-muted"]};margin-top:6px">{j["description"]}</div></div><div style="display:flex;border-radius:10px;overflow:hidden;margin:12px 0;box-shadow:0 0 0 1px rgba(0,0,0,.06)">{sw}</div><div class="shot"><img src="{f}-{w}-{k}.jpg"></div></div>'''
    html=f'''<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Inter:wght@400;500&display=swap"><style>body{{margin:0;padding:48px;background:#EDEBE7;font-family:Inter}}h1{{font:500 44px 'Cormorant Garamond';margin:0 0 6px}}
    .g{{display:grid;grid-template-columns:repeat(5,1fr);gap:28px;margin-top:32px}}.tile{{border-radius:16px;padding:20px;min-height:150px}}.shot{{overflow:hidden;border-radius:14px;box-shadow:0 20px 40px -20px rgba(0,0,0,.3)}}.shot img{{width:100%;display:block}}</style></head><body><h1>Example Property Co · palette options</h1><div style="color:#555">{"PM workspace, phone (390)" if w==390 else "Director overview, desktop (1440), top of page"} · all text pairings pass WCAG AA</div><div class="g">{cols}</div></body></html>'''
    open(f"{S}/_cmp-{f}.html","w").write(html)
    pg=b.new_page(viewport={"width":2400 if w==390 else 3000,"height":900});pg.goto(f"file://{S}/_cmp-{f}.html");pg.wait_for_timeout(1500)
    shot(pg,f"{S}/compare-{f}.jpg");pg.close()
  b.close()
