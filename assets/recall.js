/* ============================================================
   recall.js — active-recall layer for every page.
   Include once per page:  <script src="../assets/recall.js" defer></script>
   (Load it after quiz.js so wrong practice answers are captured.)

   1) Recall prompt: type first, reveal, then grade yourself
      <div class="rc">
        <p class="q">Prompt?</p>
        <div class="a">Model answer.</div>
      </div>
      - Put plain HTML in .q/.a (no gantt/simulator widgets): the
        review page shows them again out of context.
      - Old-style <details class="recall"> boxes are upgraded automatically.

   2) Section checkpoint (a heading is added automatically)
      <div class="checkpoint"> ...one to three .rc... </div>

   3) Warm-up from earlier lessons (a heading is added automatically)
      <div class="warmup"> ...two or three .rc... </div>

   4) Spot the true one: near-identical options, exactly one true, one try
      <div class="close">
        <p class="q">Which is TRUE about fork()?</p>
        <ul>
          <li data-true>Returns 0 in the child… <span class="why">Why it's right.</span></li>
          <li>Returns 0 in the parent… <span class="why">The detail that's wrong.</span></li>
          …
        </ul>
      </div>
      - Options are shuffled on every load. The pick is graded once
        (Got it / Missed) and saved like any other card.
      - Optional data-page / data-title point the grade at the source
        lesson (used by drill.html, which collects them all).

   Grades are kept in localStorage ("osrecall:v1") and feed review.html.
   Wrong first tries on .mcq / .num questions (quiz.js) are saved too.
   ============================================================ */
(function () {
  const KEY = 'osrecall:v1';
  const GRADES = [['got', 'Got it'], ['shaky', 'Shaky'], ['missed', 'Missed']];

  const script = document.currentScript;
  const rootURL = script ? new URL('..', script.src).href : '';

  /* ---------- storage (never throws) ---------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { items: {} }; }
    catch { return { items: {} }; }
  }
  function save(db) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
    catch { return false; }
  }
  function getItem(id) { return load().items[id] || null; }
  function putItem(id, data) {
    const db = load();
    db.items[id] = Object.assign({}, db.items[id], data, { when: Date.now() });
    save(db);
    updateCounts();
  }

  /* ---------- page identity ---------- */
  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  const clean = s => String(s).replace(/\s+/g, ' ').trim();
  function pageRel() {
    const here = location.href.split('#')[0].split('?')[0];
    return rootURL && here.startsWith(rootURL) ? here.slice(rootURL.length) : here;
  }
  function pageTitle() {
    const k = document.querySelector('.kicker');
    const h = document.querySelector('h1');
    const lesson = k && /Lesson\s+\d+/.exec(k.textContent);
    return clean((lesson ? lesson[0] + ' · ' : '') + (h ? h.textContent : document.title));
  }
  const reviewHref = () => rootURL + 'review.html';

  /* ---------- the recall card ---------- */
  function initCard(box, meta) {
    if (box.dataset.ready) return;
    box.dataset.ready = '1';
    const q = box.querySelector('.q');
    const a = box.querySelector('.a');
    if (!q || !a) return;
    const id = box.dataset.id || (pageRel() + ':' + hash(clean(q.textContent)));
    box.dataset.id = id;
    meta = meta || { page: pageRel(), title: pageTitle(), kind: 'recall' };

    a.hidden = true;
    const ui = document.createElement('div');
    ui.className = 'rc-ui';
    ui.innerHTML =
      '<textarea rows="2" placeholder="Type your answer from memory first…" aria-label="your answer"></textarea>' +
      '<div class="rc-row"><button class="btn" disabled>Reveal answer</button>' +
      '<button class="rc-blank" type="button">I can\'t remember, show me</button>' +
      '<span class="rc-last"></span></div>';
    q.after(ui);
    const grade = document.createElement('div');
    grade.className = 'rc-grade'; grade.hidden = true;
    grade.innerHTML = '<span>Compare with your answer. How did you do?</span>' +
      GRADES.map(([g, label]) => `<button type="button" data-g="${g}">${label}</button>`).join('');
    a.after(grade);

    const ta = ui.querySelector('textarea');
    const reveal = ui.querySelector('.btn');
    const blank = ui.querySelector('.rc-blank');
    const last = ui.querySelector('.rc-last');

    const prev = getItem(id);
    if (prev && prev.grade) {
      last.textContent = 'Last time: ' + GRADES.find(g => g[0] === prev.grade)[1];
      last.dataset.g = prev.grade;
    }

    function mark(g) {
      grade.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.g === g));
      box.dataset.graded = g;
      putItem(id, { grade: g, q: q.innerHTML, a: a.innerHTML, page: meta.page, title: meta.title, kind: meta.kind });
      last.textContent = 'Saved: ' + GRADES.find(x => x[0] === g)[1];
      last.dataset.g = g;
      box.dispatchEvent(new CustomEvent('recall:graded', { bubbles: true, detail: { id, grade: g } }));
    }
    function open(auto) {
      a.hidden = false; grade.hidden = false;
      ta.readOnly = true; reveal.disabled = true; blank.hidden = true;
      box.classList.add('revealed');
      if (auto) mark(auto);
    }
    ta.addEventListener('input', () => { reveal.disabled = ta.value.trim().length < 2; });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !reveal.disabled) open();
    });
    reveal.addEventListener('click', () => open());
    blank.addEventListener('click', () => open('missed'));
    grade.addEventListener('click', e => { const g = e.target.dataset.g; if (g) mark(g); });
  }

  /* <details class="recall"><summary>Q</summary><div>A</div></details>  →  .rc */
  function upgradeDetails(d) {
    const sum = d.querySelector('summary');
    const box = document.createElement('div');
    box.className = 'rc';
    const q = document.createElement('p'); q.className = 'q'; q.innerHTML = sum ? sum.innerHTML : '';
    const a = document.createElement('div'); a.className = 'a';
    [...d.childNodes].forEach(n => { if (n !== sum) a.appendChild(n); });
    box.append(q, a);
    d.replaceWith(box);
  }

  function addHeading(el, text) {
    if (el.querySelector(':scope > .tag')) return;
    const t = document.createElement('span');
    t.className = 'tag'; t.textContent = text;
    el.prepend(t);
  }

  /* ---------- spot the true one ---------- */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function initClose(box) {
    if (box.dataset.ready) return;
    box.dataset.ready = '1';
    const q = box.querySelector('.q');
    const ul = box.querySelector('ul');
    if (!q || !ul) return;
    const opts = [...ul.children];
    const right = opts.find(li => li.hasAttribute('data-true'));
    if (!right) return;
    const optText = li => clean([...li.childNodes].filter(n => !(n.classList && n.classList.contains('why'))).map(n => n.textContent).join(''));
    const meta = {
      page: box.dataset.page || pageRel(),
      title: box.dataset.title || pageTitle(),
      kind: 'close'
    };
    const id = meta.page + ':' + hash(clean(q.textContent) + '|' + optText(right));
    box.dataset.id = id;

    shuffle(opts).forEach(li => ul.appendChild(li));
    const hint = document.createElement('p');
    hint.className = 'close-hint';
    hint.textContent = 'Only one of these is true. They differ by small details, so read every word. One try.';
    q.after(hint);
    const prev = getItem(id);
    if (prev && prev.grade) {
      const last = document.createElement('span');
      last.className = 'rc-last'; last.dataset.g = prev.grade;
      last.textContent = 'Last time: ' + GRADES.find(g => g[0] === prev.grade)[1];
      hint.appendChild(last);
    }

    ul.addEventListener('click', e => {
      const li = e.target.closest('li');
      if (!li || box.classList.contains('answered')) return;
      box.classList.add('answered');
      const ok = li === right;
      li.classList.add(ok ? 'right' : 'wrong', 'picked');
      right.classList.add('right');
      const fb = document.createElement('p');
      fb.className = 'feedback ' + (ok ? 'ok' : 'no');
      fb.textContent = ok
        ? '✓ Correct. Read why each of the others is wrong: that is where the marks are.'
        : '✗ Fooled you. The true one is marked in green; read why yours is wrong.';
      ul.after(fb);
      const ans = '<p><strong>True:</strong> ' + right.innerHTML.replace(/<span class="why">/, '<br><span class="small">') + '</p>';
      putItem(id, { grade: ok ? 'got' : 'missed', q: q.innerHTML, a: ans, page: meta.page, title: meta.title, kind: 'close' });
      box.dispatchEvent(new CustomEvent('recall:graded', { bubbles: true, detail: { id, grade: ok ? 'got' : 'missed' } }));
    });
  }

  /* ---------- weak-spots link in the nav ---------- */
  function weakCount() {
    return Object.values(load().items).filter(i => i.grade === 'missed' || i.grade === 'shaky').length;
  }
  function updateCounts() {
    const n = weakCount();
    document.querySelectorAll('[data-weak-count]').forEach(el => { el.textContent = n; });
  }
  function addNavLink() {
    if (/review\.html$/.test(location.pathname)) return;
    const crumbs = document.querySelector('.crumbs');
    if (!crumbs) return;
    const a = document.createElement('a');
    a.href = reviewHref(); a.className = 'weak-link';
    a.innerHTML = '★ My weak spots (<span data-weak-count>0</span>)';
    crumbs.appendChild(a);
  }

  /* ---------- capture wrong .mcq / .num attempts from quiz.js ---------- */
  function hookPractice() {
    document.addEventListener('practice:graded', e => {
      const { box, ok } = e.detail || {};
      if (!box) return;
      const q = box.querySelector('.q');
      if (!q) return;
      const id = pageRel() + ':' + hash(clean(q.textContent));
      if (ok && !getItem(id)) return;            // right first time, nothing to review
      let ans = '';
      if (box.classList.contains('mcq')) {
        const right = box.querySelectorAll('button')[+box.dataset.correct];
        ans = '<p><strong>Answer:</strong> ' + (right ? right.innerHTML : '') + '</p>';
      } else {
        ans = '<p><strong>Answer:</strong> ' + (box.dataset.answer || '').split('|')[0] + '</p>';
      }
      const why = box.querySelector('.why');
      if (why) ans += why.innerHTML;
      const qhtml = q.innerHTML + (box.querySelector('[data-gantt],[data-sim],svg')
        ? ' <em class="small">(this question has a chart; open the lesson to see it)</em>' : '');
      putItem(id, { grade: ok ? 'got' : 'missed', q: qhtml, a: ans, page: pageRel(), title: pageTitle(), kind: 'practice' });
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    document.querySelectorAll('details.recall').forEach(upgradeDetails);
    document.querySelectorAll('.checkpoint').forEach(el => addHeading(el, 'Recall check · close your notes and answer from memory'));
    document.querySelectorAll('.warmup').forEach(el => addHeading(el, 'Warm-up · from earlier lessons'));
    document.querySelectorAll('.rc').forEach(b => initCard(b));
    document.querySelectorAll('.close').forEach(initClose);
    addNavLink();
    hookPractice();
    updateCounts();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Recall = { load, save, initCard, initClose, reviewHref, GRADES };
})();
