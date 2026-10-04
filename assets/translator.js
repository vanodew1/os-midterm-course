/* ============================================================
   translator.js — interactive address translators (Lessons 12–13).
   Include:  <script src="../assets/translator.js" defer></script>

   Every number field accepts: 15000 · 0x3A98 · 0b1010 · 32KB · 2.5K · 1GB
   (K/KB = 1024, M/MB = 1024², G/GB = 1024³).

   A) Base-and-bounds translator (auto-rendered on load):
      <div data-bb='{"base":"32KB","bounds":"16KB","va":"15KB","mode":"size"}'></div>
      - mode "size": bounds = SIZE of the address space; check 0 <= VA < bounds, then PA = VA + base
      - mode "end" : bounds = PHYSICAL address of the END; PA = VA + base, then check PA < bounds
      - the reader can edit base / bounds / VA and flip the mode.

   B) Segmentation translator (explicit approach, top bits pick the segment):
      <div data-seg='{"vaBits":14,"selBits":2,"va":"4200",
         "segments":[{"sel":"00","name":"Code","base":"32KB","size":"2KB","grows":"+","prot":"R-X"},
                     {"sel":"01","name":"Heap","base":"34KB","size":"3KB","grows":"+","prot":"RW-"},
                     {"sel":"11","name":"Stack","base":"28KB","size":"2KB","grows":"-","prot":"RW-"}]}'></div>
      - selectors not listed are "unused" (any access faults).
      - grows "-" (negative growth, the stack): negOffset = offset - maxSegSize,
        valid if |negOffset| <= size, PA = base + negOffset   (OSTEP §16.3 / Quiz 6 convention)
      - "prot" is optional; if present an access-type picker (read / write / fetch) appears.
      - base and size cells are editable.

   C) From JS (also usable in node for checking answers):
      OSMem.parse("32KB")               -> 32768
      OSMem.bb({base, bounds, va, mode}) -> {ok, pa, fault, steps:[...]}
      OSMem.seg(cfg, va, access)         -> {ok, pa, sel, offset, seg, negOffset, fault, steps:[...]}
      OSMem.bin(n, bits)                 -> zero-padded binary string
   ============================================================ */
(function () {
  const W = typeof window !== 'undefined' ? window : globalThis;

  // ---------- pure helpers ----------
  function parse(v) {
    if (typeof v === 'number') return v;
    let s = String(v).trim().replace(/[,_\s]/g, '');
    if (!s) return NaN;
    if (/^-?0x[0-9a-f]+$/i.test(s)) return parseInt(s, 16);
    if (/^-?0b[01]+$/i.test(s)) return (s[0] === '-' ? -1 : 1) * parseInt(s.replace(/^-?0b/i, ''), 2);
    const m = /^(-?\d+(?:\.\d+)?)([kmg])?(i?b)?$/i.exec(s);
    if (!m) return NaN;
    const mult = { k: 1024, m: 1024 ** 2, g: 1024 ** 3 }[(m[2] || '').toLowerCase()] || 1;
    return Math.round(parseFloat(m[1]) * mult);
  }
  function kb(n) {
    const a = Math.abs(n), sign = n < 0 ? '−' : '';
    if (a >= 1024 ** 3 && a % (1024 ** 3) === 0) return sign + a / 1024 ** 3 + ' GB';
    if (a >= 1024 ** 2 && a % (1024 ** 2) === 0) return sign + a / 1024 ** 2 + ' MB';
    if (a >= 1024 && a % 1024 === 0) return sign + a / 1024 + ' KB';
    return '';
  }
  const fmt = n => { const k = kb(n); return (n < 0 ? '−' + Math.abs(n) : String(n)) + (k ? ' (' + k + ')' : ''); };
  const bin = (n, bits) => (n >>> 0).toString(2).padStart(bits, '0').slice(-bits);

  function bb({ base, bounds, va, mode = 'size' }) {
    base = parse(base); bounds = parse(bounds); va = parse(va);
    const steps = [];
    if ([base, bounds, va].some(isNaN)) return { ok: false, fault: 'Enter numbers like 16384, 0x4000 or 16KB.', steps };
    if (mode === 'end') {
      const pa = va + base;
      steps.push(`Translate first: PA = VA + base = ${va} + ${base} = ${fmt(pa)}`);
      const ok = va >= 0 && pa < bounds;
      steps.push(`Check: base ≤ PA < bounds  →  ${base} ≤ ${pa} < ${bounds} ? ${ok ? 'yes ✓' : 'NO ✗'}`);
      return ok ? { ok, pa, steps } : { ok, pa: null, steps, fault: 'Out of bounds → hardware raises an exception, OS handler runs (likely kills the process).' };
    }
    const ok = va >= 0 && va < bounds;
    steps.push(`Check first: 0 ≤ VA < bounds  →  0 ≤ ${va} < ${bounds} ? ${ok ? 'yes ✓' : 'NO ✗'}`);
    if (!ok) return { ok, pa: null, steps, fault: 'Out of bounds → hardware raises an exception, OS handler runs (likely kills the process).' };
    const pa = va + base;
    steps.push(`Translate: PA = VA + base = ${va} + ${base} = ${fmt(pa)}`);
    return { ok, pa, steps };
  }

  function seg(cfg, vaIn, access) {
    const vaBits = cfg.vaBits, selBits = cfg.selBits, offBits = vaBits - selBits;
    const maxSeg = 2 ** offBits, va = parse(vaIn);
    const SEG_MASK = (2 ** selBits - 1) * 2 ** offBits, OFFSET_MASK = maxSeg - 1;
    const steps = [];
    const r = { ok: false, va, steps, maxSeg, SEG_MASK, SEG_SHIFT: offBits, OFFSET_MASK };
    if (isNaN(va) || va < 0 || va >= 2 ** vaBits) { r.fault = `The address must be between 0 and ${2 ** vaBits - 1} (${vaBits} bits).`; return r; }
    const sel = Math.floor(va / maxSeg), offset = va % maxSeg;
    r.sel = sel; r.offset = offset;
    steps.push(`Segment = (VA & SEG_MASK) >> SEG_SHIFT = (${va} & 0x${SEG_MASK.toString(16).toUpperCase()}) >> ${offBits} = ${bin(sel, selBits)}₂ = ${sel}`);
    steps.push(`Offset  = VA & OFFSET_MASK = ${va} & 0x${OFFSET_MASK.toString(16).toUpperCase()} = ${offset}`);
    const s = (cfg.segments || []).find(x => parse('0b' + x.sel) === sel);
    if (!s) { steps.push(`Selector ${bin(sel, selBits)} is not used by any segment.`); r.fault = 'Unused segment → segmentation fault (exception).'; return r; }
    r.seg = s;
    const base = parse(s.base), size = parse(s.size);
    let pa;
    if (s.grows === '-' || s.grows === 0 || s.grows === '0') {
      const neg = offset - maxSeg; r.negOffset = neg;
      steps.push(`${s.name} grows DOWN: negative offset = offset − max segment size = ${offset} − ${maxSeg} = ${neg}`);
      const ok = Math.abs(neg) <= size;
      steps.push(`Bounds check: |${neg}| ≤ size ${size} ? ${ok ? 'yes ✓' : 'NO ✗'}`);
      if (!ok) { r.fault = 'Out of bounds → segmentation fault.'; return r; }
      pa = base + neg;
      steps.push(`PA = base + negative offset = ${base} + (${neg}) = ${fmt(pa)}`);
    } else {
      const ok = offset < size;
      steps.push(`Bounds check: offset ${offset} < size ${size} ? ${ok ? 'yes ✓' : 'NO ✗'}`);
      if (!ok) { r.fault = 'Out of bounds → segmentation fault.'; return r; }
      pa = base + offset;
      steps.push(`PA = base + offset = ${base} + ${offset} = ${fmt(pa)}`);
    }
    if (access && s.prot) {
      const need = { read: 'R', write: 'W', fetch: 'X' }[access];
      const ok = s.prot.toUpperCase().includes(need);
      steps.push(`Protection: ${access} needs ${need}; segment is ${s.prot} → ${ok ? 'allowed ✓' : 'NOT allowed ✗'}`);
      if (!ok) { r.fault = 'Protection fault → exception.'; return r; }
    }
    r.ok = true; r.pa = pa;
    return r;
  }

  // ---------- DOM ----------
  const CSS = `
  .xl { border:1px solid var(--rule); border-radius:12px; padding:1rem 1.1rem; margin:1.6rem 0; font-family:var(--sans); font-size:.85rem; }
  .xl .xl-title { font-size:.7rem; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); margin:0 0 .6rem; }
  .xl .controls { display:flex; flex-wrap:wrap; gap:.6rem 1rem; align-items:flex-end; }
  .xl label { display:flex; flex-direction:column; gap:.2rem; font-size:.75rem; color:var(--ink-2); }
  .xl input, .xl select { font-family:var(--mono); font-size:.85rem; padding:.35rem .5rem; border-radius:6px; border:1px solid var(--rule); background:var(--bg); color:var(--ink); width:8.5rem; max-width:100%; }
  .xl table input { width:6rem; padding:.2rem .35rem; }
  .xl .steps { font-family:var(--mono); font-size:.76rem; line-height:1.7; margin:.8rem 0 .4rem; padding:.6rem .8rem; background:var(--surface); border-radius:8px; overflow-x:auto; white-space:pre; }
  .xl .res { font-weight:600; padding:.5rem .8rem; border-radius:8px; margin-top:.5rem; }
  .xl .res.ok { background:var(--good-bg); color:var(--good); }
  .xl .res.no { background:var(--bad-bg); color:var(--bad); }
  .xl svg { width:100%; height:auto; display:block; margin-top:.8rem; }
  .xl .bits { display:flex; flex-wrap:wrap; gap:2px; margin:.9rem 0 .2rem; }
  .xl .bit { width:1.55rem; text-align:center; font-family:var(--mono); }
  .xl .bit i { display:block; font-style:normal; font-size:.6rem; color:var(--muted); }
  .xl .bit b { display:block; padding:.3rem 0; border-radius:4px; font-weight:600; }
  .xl .bit.sel b { background:var(--accent); color:#fff; }
  .xl .bit.off b { background:var(--surface-2); color:var(--ink); }
  .xl .bit.gap { margin-left:.45rem; }
  .xl .bitlegend { font-size:.75rem; color:var(--ink-2); }
  .xl tr.hit td { background:color-mix(in srgb, var(--accent) 16%, transparent); font-weight:600; }
  .xl .table-wrap table { margin:.6rem 0; }
  `;
  function injectCSS() {
    if (document.getElementById('xl-css')) return;
    const st = document.createElement('style'); st.id = 'xl-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function bbWidget(el, cfg) {
    el.classList.add('xl');
    el.innerHTML = `<p class="xl-title">Try it · base-and-bounds MMU</p>
      <div class="controls">
        <label>Base<input data-k="base" value="${esc(cfg.base ?? '32KB')}"></label>
        <label>Bounds<input data-k="bounds" value="${esc(cfg.bounds ?? '16KB')}"></label>
        <label>Virtual address<input data-k="va" value="${esc(cfg.va ?? '0')}"></label>
        <label>Bounds holds…<select data-k="mode"><option value="size">the size</option><option value="end">end physical addr</option></select></label>
      </div>
      <div class="steps"></div><div class="res"></div><div class="pic"></div>`;
    const get = k => el.querySelector(`[data-k="${k}"]`);
    get('mode').value = cfg.mode === 'end' ? 'end' : 'size';
    function render() {
      const c = { base: get('base').value, bounds: get('bounds').value, va: get('va').value, mode: get('mode').value };
      const r = bb(c);
      el.querySelector('.steps').textContent = r.steps.join('\n') || ' ';
      const res = el.querySelector('.res');
      res.className = 'res ' + (r.ok ? 'ok' : 'no');
      res.textContent = r.ok ? `✓ Physical address = ${fmt(r.pa)}` : `✗ FAULT: ${r.fault}`;
      // picture
      const base = parse(c.base), bounds = parse(c.bounds), va = parse(c.va);
      if ([base, bounds, va].some(isNaN)) { el.querySelector('.pic').innerHTML = ''; return; }
      const size = c.mode === 'end' ? bounds - base : bounds;
      const physMax = Math.max(base + Math.max(size, 0), base + va, 1) * 1.12;
      const X0 = 70, X1 = 590, px = p => X0 + Math.max(0, Math.min(1, p / physMax)) * (X1 - X0);
      const vaX = px(base + va), regA = px(base), regB = px(base + Math.max(size, 0));
      const colour = r.ok ? 'var(--good)' : 'var(--bad)';
      el.querySelector('.pic').innerHTML = `<svg viewBox="0 0 600 120" role="img" aria-label="Physical memory with this process's region and the translated address">
        <text x="0" y="62" class="fig-ink2" font-size="11">Physical</text><text x="0" y="76" class="fig-ink2" font-size="11">memory</text>
        <rect x="${X0}" y="48" width="${X1 - X0}" height="34" rx="4" class="fig-surface2"/>
        <rect x="${regA}" y="48" width="${Math.max(regB - regA, 1)}" height="34" fill="var(--s1)" opacity=".85"/>
        <text x="${(regA + regB) / 2}" y="70" text-anchor="middle" fill="#fff" font-size="11" font-weight="600">this process</text>
        <text x="${regA}" y="98" text-anchor="middle" class="fig-ink2" font-size="10">base ${base}</text>
        <text x="${regB}" y="112" text-anchor="middle" class="fig-ink2" font-size="10">${base + Math.max(size, 0)}</text>
        <text x="${X0}" y="98" text-anchor="middle" class="fig-muted" font-size="10">0</text>
        <line x1="${vaX}" y1="22" x2="${vaX}" y2="86" stroke="${colour}" stroke-width="2.5"/>
        <text x="${Math.min(Math.max(vaX, 120), 540)}" y="16" text-anchor="middle" font-size="11" font-weight="600" fill="${colour}">base + VA = ${base + va}${r.ok ? '' : '  ✗ outside'}</text>
      </svg>`;
    }
    el.addEventListener('input', render); el.addEventListener('change', render);
    render();
  }

  function segWidget(el, cfg) {
    el.classList.add('xl');
    const vaBits = cfg.vaBits || 14, selBits = cfg.selBits || 2, offBits = vaBits - selBits;
    const hasProt = (cfg.segments || []).some(s => s.prot);
    const rows = (cfg.segments || []).map((s, i) => `<tr data-i="${i}"><td>${esc(s.name)}</td><td><code>${esc(s.sel)}</code></td>
      <td><input data-i="${i}" data-f="base" value="${esc(s.base)}"></td><td><input data-i="${i}" data-f="size" value="${esc(s.size)}"></td>
      <td>${s.grows === '-' ? '0 (down)' : '1 (up)'}</td>${hasProt ? `<td>${esc(s.prot || '')}</td>` : ''}</tr>`).join('');
    el.innerHTML = `<p class="xl-title">Try it · segmentation MMU (${vaBits}-bit VA = ${selBits} segment bits + ${offBits} offset bits)</p>
      <div class="controls">
        <label>Virtual address<input data-k="va" value="${esc(cfg.va ?? '0')}"></label>
        ${hasProt ? '<label>Access<select data-k="acc"><option value="read">read (load)</option><option value="write">write (store)</option><option value="fetch">fetch (execute)</option></select></label>' : ''}
      </div>
      <div class="bits" aria-label="address bits"></div><div class="bitlegend"></div>
      <div class="table-wrap"><table><thead><tr><th>Segment</th><th>Bits</th><th>Base</th><th>Size</th><th>Grows +?</th>${hasProt ? '<th>Protection</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>
      <div class="steps"></div><div class="res"></div>`;
    const segs = (cfg.segments || []).map(s => ({ ...s }));
    function render() {
      el.querySelectorAll('input[data-f]').forEach(inp => { segs[+inp.dataset.i][inp.dataset.f] = inp.value; });
      const vaRaw = el.querySelector('[data-k="va"]').value;
      const acc = hasProt ? el.querySelector('[data-k="acc"]').value : null;
      const r = seg({ vaBits, selBits, segments: segs }, vaRaw, acc);
      const bitsEl = el.querySelector('.bits');
      if (!isNaN(r.va) && r.va >= 0 && r.va < 2 ** vaBits) {
        const b = bin(r.va, vaBits);
        bitsEl.innerHTML = [...b].map((ch, i) => {
          const pos = vaBits - 1 - i, isSel = i < selBits;
          return `<span class="bit ${isSel ? 'sel' : 'off'}${i === selBits ? ' gap' : ''}"><i>${pos}</i><b>${ch}</b></span>`;
        }).join('');
        el.querySelector('.bitlegend').innerHTML = `${r.va} = <code>${b.slice(0, selBits)} ${b.slice(selBits)}</code>₂ · <strong>segment bits ${b.slice(0, selBits)}</strong>${r.seg ? ' → ' + esc(r.seg.name) : ' → unused'} · offset bits = ${r.offset}`;
      } else { bitsEl.innerHTML = ''; el.querySelector('.bitlegend').textContent = ''; }
      el.querySelectorAll('tbody tr').forEach(tr => tr.classList.toggle('hit', r.seg && segs[+tr.dataset.i].sel === r.seg.sel));
      el.querySelector('.steps').textContent = r.steps.join('\n') || ' ';
      const res = el.querySelector('.res');
      res.className = 'res ' + (r.ok ? 'ok' : 'no');
      res.textContent = r.ok ? `✓ Physical address = ${fmt(r.pa)}` : `✗ FAULT: ${r.fault}`;
    }
    el.addEventListener('input', render); el.addEventListener('change', render);
    render();
  }

  W.OSMem = { parse, bb, seg, bin, fmt, bbWidget, segWidget };
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', () => {
      if (!document.querySelector('[data-bb],[data-seg]')) return;
      injectCSS();
      document.querySelectorAll('[data-bb]').forEach(el => bbWidget(el, JSON.parse(el.dataset.bb)));
      document.querySelectorAll('[data-seg]').forEach(el => segWidget(el, JSON.parse(el.dataset.seg)));
    });
  }
})();
