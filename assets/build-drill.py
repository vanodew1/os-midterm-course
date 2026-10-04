#!/usr/bin/env python3
"""Rebuild drill.html from every "spot the true one" (.close) question in lessons/.

Run from anywhere:  python3 assets/build-drill.py
Re-run it whenever a lesson's .close questions change.
"""
import html
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / 'assets' / 'drill-template.html'
OUT = ROOT / 'drill.html'
SKIP = {'0001-what-is-a-process.html'}  # unused leftover

CLOSE = re.compile(r'<div class="close"[^>]*>.*?</ul>\s*</div>', re.S)


def text(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()


def main():
    groups, options, total = [], [], 0
    for f in sorted((ROOT / 'lessons').glob('*.html')):
        if f.name in SKIP:
            continue
        src = f.read_text(encoding='utf-8')
        blocks = CLOSE.findall(src)
        if not blocks:
            continue
        kicker = re.search(r'<p class="kicker">(.*?)</p>', src, re.S)
        h1 = re.search(r'<h1>(.*?)</h1>', src, re.S)
        num = re.search(r'Lesson\s+(\d+)', text(kicker.group(1)) if kicker else '')
        n = int(num.group(1)) if num else 0
        title = f'Lesson {n} · {text(h1.group(1))}' if h1 else f.stem
        page = f'lessons/{f.name}'
        attrs = f' data-page="{html.escape(page)}" data-title="{html.escape(title)}" data-lesson="{n}"'
        blocks = [b.replace('<div class="close"', '<div class="close"' + attrs, 1) for b in blocks]
        total += len(blocks)
        options.append(f'<option value="{n}">{html.escape(title)} ({len(blocks)})</option>')
        groups.append(f'<section class="drill-group" data-lesson="{n}">\n'
                      f'<h2>{html.escape(title)} <a class="small" href="{page}">open lesson ↗</a></h2>\n'
                      + '\n'.join(blocks) + '\n</section>')
    out = (TEMPLATE.read_text(encoding='utf-8')
           .replace('<!--OPTIONS-->', '\n'.join(options))
           .replace('<!--GROUPS-->', '\n\n'.join(groups))
           .replace('<!--TOTAL-->', str(total)))
    OUT.write_text(out, encoding='utf-8')
    print(f'drill.html: {total} questions from {len(groups)} lessons')


if __name__ == '__main__':
    main()
