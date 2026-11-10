#!/usr/bin/env python3
"""把 src/ content/ assets/ 打包成根目錄的單一 index.html。用法：python3 build.py"""
import base64, glob, json, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(ROOT, *a)

def read(path):
    with open(P(path), encoding='utf-8', newline='') as f:
        return f.read()

def b64(path):
    with open(P(path), 'rb') as f:
        return base64.b64encode(f.read()).decode('ascii')

def js(obj):
    return json.dumps(obj, ensure_ascii=False)

def load_theme(theme_id):
    theme = json.loads(read('content/%s/theme.json' % theme_id))
    units = [json.loads(open(p, encoding='utf-8').read()) for p in glob.glob(P('content', theme_id, 'u*.json'))]
    units.sort(key=lambda u: u['n'])
    return theme, units

def validate(units):
    """檢查單元資料格式。errors 會讓打包失敗，warnings 只提醒。"""
    errors, warns = [], []
    labs = set(re.findall(r'^Labs\.(\w+) =', read('src/labs.js'), re.M))
    for i, u in enumerate(units, 1):
        w = u.get('id', '?')
        for k in ('id', 'n', 'icon', 'title', 'sub', 'official', 'cards', 'questions', 'lab'):
            if k not in u: errors.append('%s 缺少欄位 %s' % (w, k))
        if errors and errors[-1].startswith(w + ' 缺少'): continue
        if u['n'] != i or u['id'] != 'u%d' % i: errors.append('%s：id/n 必須是連續的 u%d / %d' % (w, i, i))
        if not u['cards']: errors.append('%s 沒有學習卡片' % w)
        for c in u['cards']:
            if not (isinstance(c.get('t'), str) and isinstance(c.get('body'), str)): errors.append('%s：卡片需要 t 與 body' % w)
        ch = []
        for j, q in enumerate(u['questions'], 1):
            t, where = q.get('type'), '%s 第 %d 題' % (w, j)
            if t not in ('choice', 'tf', 'fill'): errors.append(where + '：type 必須是 choice/tf/fill'); continue
            if not q.get('q') or not q.get('explain'): errors.append(where + '：需要 q 與 explain')
            if t == 'choice':
                o, a = q.get('options'), q.get('answer')
                if not (isinstance(o, list) and 2 <= len(o) <= 4 and isinstance(a, int) and 0 <= a < len(o)): errors.append(where + '：options 需 2~4 項，answer 是 0 起算的索引')
                else: ch.append(a)
            if t == 'tf' and not isinstance(q.get('answer'), bool): errors.append(where + '：answer 必須是 true/false')
            if t == 'fill':
                if '___' not in q.get('code', ''): errors.append(where + '：code 必須含 ___')
                if not (q.get('answers') and isinstance(q.get('hints'), list)): errors.append(where + '：需要 answers 與 hints')
        if len(ch) >= 2 and len(set(ch)) == 1: warns.append('%s：單選題答案位置全是 %s，請分散 A~D' % (w, 'ABCD'[ch[0]]))
        lab = u['lab']
        if lab.get('type') not in labs: errors.append('%s：lab.type「%s」在 src/labs.js 找不到（已有：%s）' % (w, lab.get('type'), ', '.join(sorted(labs))))
        if lab.get('type') == 'sort' and u['id'] != 'u1':
            if sorted(lab.get('lines', [])) != sorted(lab.get('answer', [None])): errors.append(w + '：sort 的 lines 與 answer 必須是同一組行')
            elif lab['lines'] == lab['answer']: errors.append(w + '：sort 的 lines 不能已經是正確順序')
            if not lab.get('hint'): warns.append(w + '：sort 建議加 hint')
    return errors, warns

def main():
    theme, units = load_theme('latex')
    errors, warns = validate(units)
    for m in warns: print('⚠ ' + m)
    if errors:
        for m in errors: print('✗ ' + m)
        raise SystemExit('資料檢查失敗，沒有產生 index.html')
    mascot = {os.path.splitext(os.path.basename(p))[0]: 'data:image/webp;base64,' + b64(os.path.relpath(p, ROOT))
              for p in sorted(glob.glob(P('assets', 'mascot', '*.webp')))}
    # 維持原本的表情順序
    order = ['happy', 'cheer', 'sad', 'think']
    mascot = dict(sorted(mascot.items(), key=lambda kv: order.index(kv[0]) if kv[0] in order else 99))

    data = '\n'.join([
        'const VIDEO = %s;' % js(theme['video']),
        'const UNITS = %s;' % js(units),
        'const MASCOT = %s;' % js(mascot),
    ])
    js_files = ['core', 'labs', 'viz', 'app', 'account']
    out = read('src/template.html')
    out = out.replace('{{CSS}}', read('src/style.css'))
    out = out.replace('{{CONFIG}}', read('src/config.js'))
    out = out.replace('{{DATA}}', data)
    out = out.replace('{{JS}}', '\n'.join(read('src/%s.js' % n) for n in js_files))
    out = re.sub(r'\{\{b64:([^}]+)\}\}', lambda m: b64(m.group(1)), out)
    with open(P('index.html'), 'w', encoding='utf-8', newline='') as f:
        f.write(out)
    print('built index.html (%d bytes, %d units)' % (len(out.encode('utf-8')), len(units)))

if __name__ == '__main__':
    main()
