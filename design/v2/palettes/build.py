import json,os,re
P={
"A":("Navy & Champagne","Current v2: deep navy, platinum and warm ivory with a champagne signature.",dict(n950="#0B1626",n900="#101D30",n700="#22324B",n500="#4A5A74",plat="#E4E6EA",page="#F8F5EF",paper="#FFFDF9",ink="#161B24",muted="#5B6370",acc="#C2A574",acci="#7B6136",glow="#EFE7D8",field="#F4ECDD")),
"B":("Charcoal & Bronze","Charcoal and warm stone with bronze: gallery-quiet, architectural.",dict(n950="#171614",n900="#24221F",n700="#3A3631",n500="#5E5850",plat="#E8E2D8",page="#F3EFE8",paper="#FBF9F5",ink="#1E1C19",muted="#5F5950",acc="#B08457",acci="#7A5432",glow="#E8DCCB",field="#F1E6D8")),
"C":("Eucalyptus & Brass","Deep forest/eucalyptus green with sand and brass: a nod to WA bush and coast.",dict(n950="#132820",n900="#1F3A2E",n700="#2E5243",n500="#4D6C5D",plat="#E3E8E0",page="#F5F0E6",paper="#FCFAF5",ink="#17201B",muted="#55605A",acc="#C2A05A",acci="#735820",glow="#EADFC6",field="#F1E8D2")),
"D":("Midnight & Rose Gold","Midnight ink with soft pearl and rose-gold: evening, boutique hotel.",dict(n950="#0D0E18",n900="#171927",n700="#282C42",n500="#4C5170",plat="#ECE6EA",page="#F7F3F1",paper="#FFFCFB",ink="#1A1B26",muted="#5E5E6D",acc="#D4A491",acci="#8A5240",glow="#F0DFD8",field="#F6E6E0")),
"E":("Porcelain & Slate","Light and airy: porcelain white, slate blue-grey and silver.",dict(n950="#2B3B4A",n900="#36495C",n700="#4A5F74",n500="#5C6F82",plat="#EDF1F4",page="#FAFBFB",paper="#FFFFFF",ink="#1C232B",muted="#56626F",acc="#C3CCD5",acci="#4B5866",glow="#E6ECF1",field="#E9EEF2")),
}
ST=dict(safe=("#2F6B50","#E6F0EA"),watch=("#7A5B0C","#F6EED6"),risk=("#A4481A","#F9E7DC"),critical=("#9E2626","#F7E1E1"))
def L(h):
  c=[int(h[i:i+2],16)/255 for i in (1,3,5)];c=[x/12.92 if x<=.03928 else ((x+.055)/1.055)**2.4 for x in c];return .2126*c[0]+.7152*c[1]+.0722*c[2]
def cr(a,b):a,b=sorted([L(a),L(b)]);return round((b+.05)/(a+.05),2)
report={};allok=True
for k,(name,desc,t) in P.items():
  pairs={"text/page":(t["ink"],t["page"]),"text/surface":(t["ink"],t["paper"]),"muted/page":(t["muted"],t["page"]),"muted/surface":(t["muted"],t["paper"]),
   "accent-text/page":(t["acci"],t["page"]),"accent-text/field":(t["acci"],t["field"]),"white/primary":("#FFFFFF",t["n900"]),"white/primary-hover":("#FFFFFF",t["n700"]),
   "platinum/primary-deep":(t["plat"],t["n950"]),"accent/primary-deep":(t["acc"],t["n950"]),"accent/primary":(t["acc"],t["n900"]),"primary/page":(t["n900"],t["page"]),"grade-B/surface":(t["n500"],t["paper"])}
  for s,(f,b) in ST.items():pairs[f"{s}/page"]=(f,t["page"]);pairs[f"{s}/tint"]=(f,b);pairs[f"{s}/surface"]=(f,t["paper"])
  r={p:cr(*v) for p,v in pairs.items()};report[k]=r
  bad={p:v for p,v in r.items() if v<4.5}
  if bad:allok=False;print(k,"FAIL",bad)
  css=f"""/* Palette {k} · {name} — load after app.css */
:root{{--navy-950:{t['n950']};--navy-900:{t['n900']};--navy-700:{t['n700']};--navy-500:{t['n500']};--platinum:{t['plat']};
--ivory:{t['page']};--bg:{t['page']};--paper:{t['paper']};--surface:{t['paper']}c7;--ink:{t['ink']};--text:{t['ink']};--silver-700:{t['muted']};--muted:{t['muted']};
--champagne:{t['acc']};--champagne-ink:{t['acci']};--champagne-bg:{t['field']};--glow:{t['glow']};--bar-bg:{t['page']}b3;--tabbar-bg:{t['n900']}e0;
--grade-a:#2F6B50;--grade-b:{t['n500']};--grade-c:#7A5B0C;--grade-d:#9E2626}}
"""
  open(f"palette-{k}.css","w").write(css)
  json.dump({"name":name,"description":desc,"page":t["page"],"surface":t["paper"],"text":t["ink"],"text-muted":t["muted"],"primary":t["n900"],"primary-deep":t["n950"],"primary-hover":t["n700"],"primary-soft":t["n500"],"on-primary":"#FFFFFF","on-primary-muted":t["plat"],"accent":t["acc"],"accent-text":t["acci"],"accent-field":t["field"],
   "status":{s:{"fg":f,"bg":b} for s,(f,b) in ST.items()},"grade":{"A":"#2F6B50","B":t["n500"],"C":"#7A5B0C","D":"#9E2626"},"contrast":r},open(f"palette-{k}.json","w"),indent=2)
  for pg in ["director","pm-workspace"]:
    h=open(f"../{pg}.html").read().replace('href="app.css">',f'href="../app.css"><link rel="stylesheet" href="palette-{k}.css">')
    open(f"{pg}-{k}.html","w").write(h)
json.dump(report,open("contrast-report.json","w"),indent=1);print("ALL AA" if allok else "fix")
