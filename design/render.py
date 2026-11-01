from playwright.sync_api import sync_playwright
import os
P="/workspace/platinum-portal/design"
jobs=[(f,1440,f.replace('.html','-1440.jpg')) for f in ["director.html","pm-workspace.html","suppliers.html","comms.html","styleguide.html"]]+[("pm-workspace.html",390,"pm-workspace-390.jpg")]
with sync_playwright() as p:
    b=p.chromium.launch(channel="chrome")
    for f,w,o in jobs:
        pg=b.new_page(viewport={"width":w,"height":900},device_scale_factor=1 if w>400 else 2);pg.goto(f"file://{P}/{f}");pg.wait_for_timeout(1500)
        q=80
        while True:
            pg.screenshot(path=f"{P}/share/{o}",full_page=True,type="jpeg",quality=q)
            if os.path.getsize(f"{P}/share/{o}")<1e6 or q<40:break
            q-=10
        print(o,os.path.getsize(f"{P}/share/{o}"))
    b.close()
