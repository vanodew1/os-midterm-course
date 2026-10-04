/* ============================================================
   forktree.js: step-by-step fork() process-tree explorer.
   Include:  <script src="../assets/forktree.js" defer></script>

   Markup (auto-rendered on load):
     <div data-forktree="basic twoforks ifchild siblings loop"></div>
       - the attribute lists which built-in programs appear as tabs
         (first one is shown first). Built-ins:
           basic     one fork, if/else on the return value
           twoforks  fork(); fork(); printf
           ifchild   if (fork() == 0) fork();  (makes a grandchild)
           siblings  parent forks twice, children do not fork
           loop      for (i = 0; i < n; i++) fork();  with an n picker (1..4)

   JS:
     OSFork.register(name, {title, code(n), run(fork, print, n), loop:bool})
        run() is ordinary JS mirroring the C code: call fork() (returns 0 in
        the child, the child's number in the parent) and print(text).
     OSFork.trace(name, n) -> [{id, parent, depth, forkNo, prints:[...]}]

   How it works: every process is identified by the list of fork() results
   it has seen so far. The program is re-run ("replayed") for each process;
   forks inside its history return the recorded value, a fork beyond it
   creates a new child. A print belongs to a process only if it happens
   after that process's own birth (its last "I am the child" fork).
   Uses only CSS variables from style.css.
   ============================================================ */
(function () {
  const programs = {};
  function register(name, p) { programs[name] = p; }

  register('basic', {
    title: 'one fork',
    code: () => `printf("hello\\n");
int rc = fork();
if (rc == 0)
    printf("child\\n");
else
    printf("parent\\n");`,
    run(fork, print) {
      print('hello');
      const rc = fork();
      if (rc === 0) print('child'); else print('parent');
    }
  });
  register('twoforks', {
    title: 'fork; fork',
    code: () => `fork();
fork();
printf("hi\\n");`,
    run(fork, print) { fork(); fork(); print('hi'); }
  });
  register('ifchild', {
    title: 'if child, fork',
    code: () => `if (fork() == 0)   // only the child
    fork();        // forks again
printf("hi\\n");`,
    run(fork, print) { if (fork() === 0) fork(); print('hi'); }
  });
  register('siblings', {
    title: 'two siblings',
    code: () => `printf("S\\n");
int rc = fork();
if (rc > 0) {              // parent
    printf("P\\n");
    int rc2 = fork();
    if (rc2 == 0) printf("Q\\n");
    else          printf("R\\n");
} else {                   // first child
    printf("T\\n");
}`,
    run(fork, print) {
      print('S');
      const rc = fork();
      if (rc > 0) { print('P'); const rc2 = fork(); if (rc2 === 0) print('Q'); else print('R'); }
      else print('T');
    }
  });
  register('loop', {
    title: 'fork in a loop',
    loop: true,
    code: n => `for (int i = 0; i < ${n}; i++)
    fork();
printf("done\\n");`,
    run(fork, print, n) { for (let i = 0; i < n; i++) fork(); print('done'); }
  });

  function trace(name, n) {
    const prog = programs[name];
    const procs = [{ id: 0, parent: null, depth: 0, forkNo: 0, hist: [], prints: [] }];
    const queue = [0];
    let guard = 0;
    while (queue.length && guard++ < 200) {
      const me = procs[queue.shift()];
      let hist = me.hist.slice();
      let birth = -1;
      hist.forEach((h, i) => { if (h === 'C') birth = i; });
      let k = 0;
      const fork = () => {
        if (k < hist.length) { const h = hist[k++]; return h === 'C' ? 0 : h; }
        const child = { id: procs.length, parent: me.id, depth: me.depth + 1, forkNo: k + 1,
                        hist: hist.concat(['C']), prints: [] };
        procs.push(child); queue.push(child.id);
        hist.push(child.id); k++;
        return child.id;
      };
      const print = s => { if (k > birth) me.prints.push(s); };
      prog.run(fork, print, n);
    }
    return procs.map(({ hist, ...p }) => p);
  }

  const NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  const DEPTH_COL = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s7)', 'var(--s5)'];
  const ROLE = ['original', 'child', 'grandchild', 'great-grandchild', 'great-great-grandchild'];

  function draw(svg, procs, shown) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const kids = procs.map(() => []);
    procs.forEach(p => { if (p.parent !== null) kids[p.parent].push(p.id); });
    // leaf-count layout over the FULL tree so nodes do not jump while stepping
    const x = [], W = 74, H = 96;
    let leaf = 0;
    (function place(id) {
      if (!kids[id].length) { x[id] = leaf++ * W + W / 2; return; }
      kids[id].forEach(place);
      x[id] = (x[kids[id][0]] + x[kids[id][kids[id].length - 1]]) / 2;
    })(0);
    const maxDepth = Math.max(...procs.map(p => p.depth));
    const width = Math.max(leaf * W + 40, 300), height = (maxDepth + 1) * H + 10;
    const off = (width - 40 - leaf * W) / 2;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const y = d => 34 + d * H;
    procs.forEach(p => {
      if (p.parent === null || !shown.has(p.id)) return;
      const px = x[p.parent] + off, cx = x[p.id] + off;
      svg.appendChild(svgEl('path', { d: `M${px} ${y(p.depth - 1) + 40} C ${px} ${y(p.depth) - 34}, ${cx} ${y(p.depth - 1) + 56}, ${cx} ${y(p.depth) - 18}`,
        fill: 'none', class: 'fig-line', 'stroke-width': 1.6 }));
      svg.appendChild(svgEl('text', { x: cx + 20, y: y(p.depth) - 18, 'text-anchor': 'start',
        class: 'fig-muted', 'font-size': 9.5 }, `fork #${p.forkNo}`));
    });
    procs.forEach(p => {
      if (!shown.has(p.id)) return;
      const cx = x[p.id] + off, cy = y(p.depth);
      svg.appendChild(svgEl('circle', { cx, cy, r: 18, fill: DEPTH_COL[p.depth % DEPTH_COL.length] }));
      svg.appendChild(svgEl('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', fill: '#fff', 'font-size': 12, 'font-weight': 600 }, 'P' + p.id));
      svg.appendChild(svgEl('text', { x: cx, y: cy + 33, 'text-anchor': 'middle', class: 'fig-ink', 'font-size': 10.5,
        'font-family': 'var(--mono)' }, p.prints.join(' ') || '–'));
    });
  }

  function widget(el) {
    const names = (el.getAttribute('data-forktree') || 'basic').split(/\s+/).filter(n => programs[n]);
    el.classList.add('sim');
    el.innerHTML = '';
    const tabs = document.createElement('div'); tabs.className = 'seg-ctl'; tabs.setAttribute('role', 'tablist');
    const ctr = document.createElement('div'); ctr.className = 'controls'; ctr.style.marginTop = '.6rem';
    const nSel = document.createElement('select'); nSel.setAttribute('aria-label', 'loop count n');
    [1, 2, 3, 4].forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = 'n = ' + v; nSel.appendChild(o); });
    nSel.value = 3;
    const mk = (t, ghost) => { const b = document.createElement('button'); b.className = 'btn' + (ghost ? ' ghost' : ''); b.textContent = t; return b; };
    const stepB = mk('Step ▸'), allB = mk('Show all', true), resetB = mk('Reset', true);
    ctr.append(nSel, stepB, allB, resetB);
    const pre = document.createElement('pre'); pre.style.margin = '.8rem 0';
    const code = document.createElement('code'); pre.appendChild(code);
    const svg = svgEl('svg', { role: 'img', 'aria-label': 'process tree' }); svg.style.cssText = 'width:100%;height:auto;max-height:26rem;display:block';
    const status = document.createElement('p'); status.className = 'small'; status.style.margin = '.4rem 0 0'; status.setAttribute('aria-live', 'polite');
    el.append(tabs, ctr, pre, svg, status);

    let cur = names[0], procs = [], shown = new Set();
    function describe(last) {
      const total = procs.length, lines = procs.reduce((a, p) => a + p.prints.length, 0);
      let s = '';
      if (last && last.parent !== null) {
        const par = procs[last.parent];
        s = `P${last.parent} (${ROLE[par.depth] || 'descendant'}) calls fork #${last.forkNo} → creates P${last.id}, its ${last.depth === 1 ? 'child' : 'child (P0\'s ' + (ROLE[last.depth] || 'descendant') + ')'}. P${last.id} starts right after that fork, with fork() returning 0. `;
      } else s = 'P0 is the original process (the one you ran). ';
      if (shown.size === total) s += `Done: ${total} process${total > 1 ? 'es' : ''} in total, ${lines} line${lines > 1 ? 's' : ''} printed. Colour = generation.`;
      else s += `Showing ${shown.size} of ${total} processes.`;
      status.textContent = s;
    }
    function load() {
      const p = programs[cur], n = +nSel.value;
      nSel.style.display = p.loop ? '' : 'none';
      code.textContent = p.code(n);
      procs = trace(cur, n); shown = new Set([0]);
      draw(svg, procs, shown); describe(procs[0]);
      [...tabs.children].forEach(b => b.classList.toggle('on', b.dataset.n === cur));
    }
    names.forEach(n => {
      const b = document.createElement('button'); b.textContent = programs[n].title; b.dataset.n = n;
      b.addEventListener('click', () => { cur = n; load(); });
      tabs.appendChild(b);
    });
    stepB.addEventListener('click', () => {
      if (shown.size >= procs.length) return;
      const next = procs[shown.size]; shown.add(next.id); draw(svg, procs, shown); describe(next);
    });
    allB.addEventListener('click', () => { procs.forEach(p => shown.add(p.id)); draw(svg, procs, shown); describe(null); });
    resetB.addEventListener('click', load);
    nSel.addEventListener('change', load);
    load();
  }

  window.OSFork = { register, trace };
  document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('[data-forktree]').forEach(widget));
})();
