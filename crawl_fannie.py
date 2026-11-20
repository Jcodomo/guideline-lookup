"""Fannie Mae Selling Guide crawler: builds data/fannie.json from the public guide site (polite, threaded, resumable).
Run:  python crawl_fannie.py   then   python build_index.py"""
import re, json, time, os, urllib.request
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
BASE='https://selling-guide.fanniemae.com'; UA={'User-Agent':'Mozilla/5.0 (local guideline index builder)'}
OUT='data/fannie.json'; WORKERS=6
TOPIC=re.compile(r'^/sel/[a-z]\d[^/]*-\d\d/')
def get(u):
    for i in range(3):
        try: return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=40).read().decode('utf-8','ignore')
        except Exception: time.sleep(1.5)
    return ''
def extract(h):
    s=BeautifulSoup(h,'lxml'); a=next((x for x in s.find_all('article') if x.find('h1')),None)
    if not a: return None
    title=re.sub(r'\s+',' ',a.find('h1').get_text(' ')).strip()
    for t in a.select('.guide-toc,#structured-content-toc,script,style'): t.decompose()
    body=a.select_one('.structured-content') or a
    text=re.sub(r'[ \t]+',' ',body.get_text('\n')); text=re.sub(r'\n\s*\n+','\n',text).strip()
    return title,text
os.makedirs('data',exist_ok=True)
done=json.load(open(OUT,encoding='utf-8')) if os.path.exists(OUT) else {}
seen={'/'}; frontier=['/']; n=0
def work(p):
    h=get(BASE+p); time.sleep(0.15)
    return p,h
with ThreadPoolExecutor(WORKERS) as ex:
    while frontier:
        batch=frontier; frontier=[]
        for p,h in ex.map(work,batch):
            n+=1
            for l in set(re.findall(r'href="(/sel/[^"#?]+)"',h)):
                if l not in seen: seen.add(l); frontier.append(l)
            if TOPIC.match(p) and p not in done:
                r=extract(h)
                if r: done[p]={'t':r[0],'u':BASE+p,'x':r[1]}
        print('fetched',n,'queued',len(frontier),'topics',len(done),flush=True)
        json.dump(done,open(OUT,'w',encoding='utf-8'),ensure_ascii=False)
print('DONE',len(done),flush=True)
