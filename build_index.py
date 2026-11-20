"""Builds data/*.js (the local search index) from: data/fannie.json (crawl_fannie.py), guides/hud-4000.1.pdf (-> text) and data_curated.py.
Run:  python build_index.py        (re-run after refreshing sources)"""
import json, re, os, subprocess, sys, datetime
os.makedirs('data',exist_ok=True)
HUD_PDF_URL='https://www.hud.gov/sites/default/files/Housing/documents/40001-hsgh-Update-18.pdf'
def clean(t): 
    t=re.sub(r'[ \t]+',' ',t); t=re.sub(r'\n\s*\n+','\n',t); return t.strip()
def write(name,rows,meta):
    js='window.GL=window.GL||{docs:[],meta:{}};\nGL.meta[%s]=%s;\nGL.docs.push.apply(GL.docs,%s);\n'%(json.dumps(name),json.dumps(meta),json.dumps(rows,ensure_ascii=False,separators=(',',':')))
    open('data/%s.js'%name,'w',encoding='utf-8').write(js); print(name,len(rows),'entries',round(len(js)/1e6,1),'MB')
today=datetime.date.today().isoformat()
# Fannie
if os.path.exists('data/fannie.json'):
    d=json.load(open('data/fannie.json',encoding='utf-8')); rows=[]
    for p,v in d.items():
        m=re.match(r'^\s*([A-Z]\d[\w.\-]*),?\s*(.*)$',v['t'].replace('Section ','').replace('Subpart ','').replace('Topic ',''))
        sec=m.group(1) if m else ''; title=(m.group(2) if m else v['t']).strip() or v['t']
        rows.append(dict(a='Fannie',s=sec,t=title,u=v['u'],x=clean(v['x'])))
    write('fannie',rows,dict(agency='Fannie Mae Selling Guide',built=today,source='selling-guide.fanniemae.com'))
# HUD 4000.1
if os.path.exists('guides/hud-4000.1.pdf'):
    if not os.path.exists('guides/hud.txt'): subprocess.run(['pdftotext','-layout','guides/hud-4000.1.pdf','guides/hud.txt'],check=True)
    pages=open('guides/hud.txt',encoding='utf-8',errors='ignore').read().split('\f'); rows=[]
    for i,pg in enumerate(pages,1):
        lines=[l.rstrip() for l in pg.split('\n') if l.strip()]
        if len(lines)<4: continue
        head=[l.strip() for l in lines[:3]]; body=lines[3:]
        sub=next((l.strip() for l in body if re.match(r'^\s{0,10}([a-z]|\d+|[A-Z])\.\s+\S',l) or re.match(r'^\s{0,12}\([A-Z]\)\s+\S',l)),'')
        title=(head[2] if len(head)>2 else head[-1]); 
        if sub: title+=' > '+sub[:90]
        sec=' / '.join(h.split('.')[0] for h in head[:3] if re.match(r'^[IVX]+\.|^[A-Z]\.|^\d+\.',h))
        rows.append(dict(a='FHA',s='4000.1 p.%d'%i,t=title,u='%s#page=%d'%(HUD_PDF_URL,i),x=clean('\n'.join(l.strip() for l in body)),h=' | '.join(head[:3])))
    write('fha',rows,dict(agency='HUD Handbook 4000.1',built=today,source=HUD_PDF_URL))
# Curated (Freddie, VA, other)
from data_curated import CURATED
rows=[dict(a=c['a'],s=c['s'],t=c['t'],u=c['u'],x=c['x'],k=c.get('k','')) for c in CURATED]
write('curated',rows,dict(agency='Curated pointers',built=today))
print('done')
