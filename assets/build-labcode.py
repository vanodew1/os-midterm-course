#!/usr/bin/env python3
"""Fill every <figure class="labcode"> in the lessons with the real lines from
the student's lab files, then regenerate reference/lab-map.html.

Authoring markup (everything inside the figure is regenerated):

  <figure class="labcode" data-src="Labs/Lab 4/stride.c" data-lines="20-35"
          data-hl="25,28-29" data-caption="Picking the job with the lowest pass"></figure>

data-src   path relative to the course root
data-lines "a-b" (1-based, inclusive); omit for the whole file
data-hl    optional lines to highlight
Run from anywhere:  python3 assets/build-labcode.py   (--check: validate only, write nothing)
"""
import html, re, sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
FIG = re.compile(r'<figure class="labcode"([^>]*)>.*?</figure>', re.S)
ATTR = re.compile(r'(data-[a-z]+)="([^"]*)"')
H2 = re.compile(r'<h2[^>]*>(.*?)</h2>', re.S)
CHECK = '--check' in sys.argv
TITLE = re.compile(r'<title>(.*?)</title>', re.S)


def ranges(spec):
    out = set()
    for part in filter(None, (p.strip() for p in spec.split(','))):
        a, _, b = part.partition('-')
        out.update(range(int(a), int(b or a) + 1))
    return out


def strip_tags(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()


def render(attrs, errors, where):
    src = attrs.get('data-src', '')
    path = ROOT / src
    if not path.is_file():
        errors.append(f'{where}: missing file {src}')
        return None, None
    lines = path.read_text(errors='replace').expandtabs(4).split('\n')
    if lines and lines[-1] == '':
        lines.pop()
    spec = attrs.get('data-lines', '')
    a, b = (map(int, spec.split('-')) if '-' in spec else (int(spec), int(spec))) if spec else (1, len(lines))
    if not (1 <= a <= b <= len(lines)):
        errors.append(f'{where}: {src} has {len(lines)} lines, asked for {spec}')
        return None, None
    hl = ranges(attrs.get('data-hl', ''))
    rows = []
    for n in range(a, b + 1):
        cls = ' hl' if n in hl else ''
        rows.append(f'<span class="ln{cls}" data-n="{n}">{html.escape(lines[n-1]) or " "}</span>')
    href = '../' + quote(src)
    span = f'lines {a}–{b}' if (a, b) != (1, len(lines)) else 'whole file'
    cap = attrs.get('data-caption', '')
    head = (f'<div class="lc-head"><span class="lc-tag">Your code</span>'
            f'<a href="{href}">{html.escape(src)}</a><span class="lc-span">{span}</span></div>')
    capt = f'<figcaption>{cap}</figcaption>' if cap else ''
    attr_str = ''.join(f' {k}="{v}"' for k, v in attrs.items())
    fig = f'<figure class="labcode"{attr_str}>{head}<pre>{"".join(rows)}</pre>{capt}</figure>'
    return fig, (src, span)


def main():
    errors, rows = [], []
    for page in sorted((ROOT / 'lessons').glob('*.html')):
        text = page.read_text()
        if 'class="labcode"' not in text:
            continue
        title = strip_tags(TITLE.search(text).group(1)) if TITLE.search(text) else page.stem
        out, pos = [], 0
        for m in FIG.finditer(text):
            attrs = dict(ATTR.findall(m.group(1)))
            heads = H2.findall(text, 0, m.start())
            section = strip_tags(heads[-1]) if heads else ''
            fig, info = render(attrs, errors, f'{page.name}')
            out.append(text[pos:m.start()])
            out.append(fig or m.group(0))
            pos = m.end()
            if info:
                rows.append((page.name, title, section, info[0], info[1], strip_tags(attrs.get('data-caption', ''))))
        out.append(text[pos:])
        new = ''.join(out)
        if new != text and not CHECK:
            page.write_text(new)
    if not CHECK:
        write_map(rows)
    for e in errors:
        print('ERROR', e, file=sys.stderr)
    print(f'{len(rows)} code blocks filled, {len(errors)} errors')
    sys.exit(1 if errors else 0)


def write_map(rows):
    tpl = (ROOT / 'assets' / 'lab-map-template.html').read_text()
    body, last = [], None
    for page, title, section, src, span, cap in rows:
        if page != last:
            body.append(f'<tr class="lm-lesson"><th colspan="3"><a href="../lessons/{page}">{html.escape(title)}</a></th></tr>')
            last = page
        body.append('<tr>'
                    f'<td>{html.escape(section)}</td>'
                    f'<td><a href="../{quote(src)}"><code>{html.escape(src)}</code></a><br><span class="small">{span}</span></td>'
                    f'<td>{html.escape(cap)}</td></tr>')
    (ROOT / 'reference' / 'lab-map.html').write_text(tpl.replace('<!--ROWS-->', '\n'.join(body)))


if __name__ == '__main__':
    main()
