#!/usr/bin/env python3
"""把 src/ content/ assets/ 打包成根目錄的單一 index.html。用法：python3 build.py"""
import base64, glob, json, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(ROOT, *a)
JS_FILES = ['core', 'labs', 'viz', 'app', 'account']
THEME_KEYS = ('id', 'order', 'icon', 'title', 'sub', 'idBase', 'intro', 'channel', 'videos', 'official')
UNIT_KEYS = ('id', 'n', 'icon', 'title', 'sub', 'official', 'cards', 'questions', 'lab')


def read(path):
    with open(P(path), encoding='utf-8', newline='') as f:
        return f.read()


def b64(path):
    with open(P(path), 'rb') as f:
        return base64.b64encode(f.read()).decode('ascii')


def js(obj):
    return json.dumps(obj, ensure_ascii=False)


def load_themes():
    """讀取 content/<主題>/theme.json 與該主題的 u*.json，依 theme.json 的 order 排序。"""
    themes = []
    for tp in glob.glob(P('content', '*', 'theme.json')):
        d = os.path.basename(os.path.dirname(tp))
        theme = json.loads(read('content/%s/theme.json' % d))
        theme['_dir'] = d
        units = [json.loads(read(os.path.relpath(p, ROOT))) for p in glob.glob(P('content', d, 'u*.json'))]
        units.sort(key=lambda u: u.get('n', 0))
        theme['_units'] = units
        themes.append(theme)
    themes.sort(key=lambda t: t.get('order', 99))
    return themes


def validate(themes):
    """檢查主題與單元資料格式。errors 會讓打包失敗，warnings 只提醒。"""
    errors, warns = [], []
    labs = set(re.findall(r'^Labs\.(\w+) =', read('src/labs.js'), re.M))
    seen_ids = {}
    for t in themes:
        tw = '主題 %s' % t['_dir']
        miss = [k for k in THEME_KEYS if k not in t]
        if miss:
            errors.append('%s 的 theme.json 缺少欄位：%s' % (tw, ', '.join(miss))); continue
        if t['id'] != t['_dir']: errors.append('%s：theme.json 的 id 必須等於資料夾名稱' % tw)
        if not isinstance(t['idBase'], int) or t['idBase'] < 0 or t['idBase'] % 100: errors.append('%s：idBase 必須是 0、100、200… 的整數' % tw)
        if not t['videos']: errors.append('%s：videos 至少要有一支影片' % tw)
        for v in t['videos']:
            if not (v.get('title') and str(v.get('url', '')).startswith('http')): errors.append('%s：每支影片需要 title 與 url' % tw)
        if not t['_units']: errors.append('%s 沒有任何單元' % tw)
        for i, u in enumerate(t['_units'], 1):
            exp = 'u%d' % (t['idBase'] + i)
            w = u.get('id', '?')
            miss = [k for k in UNIT_KEYS if k not in u]
            if miss: errors.append('%s 缺少欄位：%s' % (w, ', '.join(miss))); continue
            if u['n'] != i or u['id'] != exp: errors.append('%s：這個主題第 %d 個單元的 id 必須是 %s、n 必須是 %d（id = u + idBase + n）' % (w, i, exp, i))
            if u['id'] in seen_ids: errors.append('%s：id 與主題 %s 重複' % (w, seen_ids[u['id']]))
            seen_ids[u['id']] = t['_dir']
            if not re.fullmatch(r'u\d{1,3}', u['id']): errors.append('%s：id 必須是 u 加 1~3 位數字（後端同步只認這個格式）' % w)
            if 'video' in u and not (isinstance(u['video'], int) and 0 <= u['video'] < len(t['videos'])): errors.append('%s：video 必須是 theme.json 裡 videos 的索引' % w)
            if not u['cards']: errors.append('%s 沒有學習卡片' % w)
            for c in u['cards']:
                if not (isinstance(c.get('t'), str) and isinstance(c.get('body'), str)): errors.append('%s：卡片需要 t 與 body' % w)
            ch = []
            for j, q in enumerate(u['questions'], 1):
                ty, where = q.get('type'), '%s 第 %d 題' % (w, j)
                if ty not in ('choice', 'tf', 'fill'): errors.append(where + '：type 必須是 choice/tf/fill'); continue
                if not q.get('q') or not q.get('explain'): errors.append(where + '：需要 q 與 explain')
                if ty == 'choice':
                    o, a = q.get('options'), q.get('answer')
                    if not (isinstance(o, list) and 2 <= len(o) <= 4 and isinstance(a, int) and 0 <= a < len(o)): errors.append(where + '：options 需 2~4 項，answer 是 0 起算的索引')
                    else: ch.append(a)
                if ty == 'tf' and not isinstance(q.get('answer'), bool): errors.append(where + '：answer 必須是 true/false')
                if ty == 'fill':
                    if '___' not in q.get('code', ''): errors.append(where + '：code 必須含 ___')
                    if not (q.get('answers') and isinstance(q.get('hints'), list)): errors.append(where + '：需要 answers 與 hints')
                    if 'ci' in q and not isinstance(q['ci'], bool): errors.append(where + '：ci 必須是 true/false')
            if len(ch) >= 2 and len(set(ch)) == 1: warns.append('%s：單選題答案位置全是 %s，請分散 A~D' % (w, 'ABCD'[ch[0]]))
            lab = u['lab']
            if lab.get('type') not in labs: errors.append('%s：lab.type「%s」在 src/labs.js 找不到（已有：%s）' % (w, lab.get('type'), ', '.join(sorted(labs))))
            if lab.get('type') == 'sort' and u['id'] != 'u1':
                if sorted(lab.get('lines', [])) != sorted(lab.get('answer', [None])): errors.append(w + '：sort 的 lines 與 answer 必須是同一組行')
                elif lab['lines'] == lab['answer']: errors.append(w + '：sort 的 lines 不能已經是正確順序')
                if not lab.get('hint'): warns.append(w + '：sort 建議加 hint')
                if 'ok' in lab and not isinstance(lab['ok'], str): errors.append(w + '：lab.ok 必須是字串')
    return errors, warns


def main():
    themes = load_themes()
    errors, warns = validate(themes)
    for m in warns: print('⚠ ' + m)
    if errors:
        for m in errors: print('✗ ' + m)
        raise SystemExit('資料檢查失敗，沒有產生 index.html')

    meta, units = [], []
    for t in themes:
        meta.append({k: v for k, v in t.items() if not k.startswith('_')})
        for u in t['_units']:
            units.append(dict(u, theme=t['id']))
    mascot = {os.path.splitext(os.path.basename(p))[0]: 'data:image/webp;base64,' + b64(os.path.relpath(p, ROOT))
              for p in sorted(glob.glob(P('assets', 'mascot', '*.webp')))}
    order = ['happy', 'cheer', 'sad', 'think']   # 維持固定的表情順序
    mascot = dict(sorted(mascot.items(), key=lambda kv: order.index(kv[0]) if kv[0] in order else 99))

    data = '\n'.join(['const THEMES = %s;' % js(meta), 'const UNITS = %s;' % js(units), 'const MASCOT = %s;' % js(mascot)])
    out = read('src/template.html')
    out = out.replace('{{CSS}}', read('src/style.css'))
    out = out.replace('{{CONFIG}}', read('src/config.js'))
    out = out.replace('{{DATA}}', data)
    out = out.replace('{{JS}}', '\n'.join(read('src/%s.js' % n) for n in JS_FILES))
    out = re.sub(r'\{\{b64:([^}]+)\}\}', lambda m: b64(m.group(1)), out)
    with open(P('index.html'), 'w', encoding='utf-8', newline='') as f:
        f.write(out)
    print('built index.html (%d bytes, %d themes, %d units)' % (len(out.encode('utf-8')), len(meta), len(units)))


if __name__ == '__main__':
    main()
