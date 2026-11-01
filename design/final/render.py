from playwright.sync_api import sync_playwright
import os
P=os.path.dirname(os.path.abspath(__file__))
J=[(f,1440) for f in ["director","pm-workspace","suppliers","suppliers-database","comms","styleguide"]]+[("pm-workspace",390),("suppliers-database",390),("director",390)]
with sync_playwright() as p:
    b=p.chromium.launch(channel="chrome")
    for f,w in J:
        pg=b.new_page(viewport={"width":w,"height":900},device_scale_factor=1 if w>400 else 2);pg.goto(f"file://{P}/{f}.html");pg.add_style_tag(content=".tabbar{position:static!important;margin:24px 16px!important}");pg.wait_for_timeout(1500)
        o=f"{P}/share/{f}-{w}.jpg";q=82
        while True:
            pg.screenshot(path=o,full_page=True,type="jpeg",quality=q)
            if os.path.getsize(o)<1e6 or q<40:break
            q-=10
        print(o,os.path.getsize(o))
    b.close()
