/* ============================================================
   quiz.js — practice widgets with instant feedback.
   Include once per page:  <script src="../assets/quiz.js" defer></script>

   1) Multiple choice (data-correct is the 0-based index of the right button)
      <div class="mcq" data-correct="1">
        <p class="q">Question?</p>
        <button>Option A</button><button>Option B</button>
        <div class="why" hidden>Explanation shown after answering.</div>
      </div>

   2) Numeric / short exact answer
      <div class="num" data-answer="4.67" data-tol="0.01">
        <p class="q">Average turnaround time?</p>
        <div class="why" hidden>Worked solution.</div>
      </div>
      - data-answer may list several accepted answers separated by "|"
      - numeric input accepts arithmetic, e.g. "14/3" or "20*1024+2500"
      - data-tol is relative (0.01 = 1%); default 0.01
      - non-numeric answers compare case/space-insensitively ("A B C")

   3) Free recall: see recall.js (.rc cards; old <details class="recall"> is upgraded)

   4) Score line: <p class="score" data-score></p>  (counts first attempts)
   ============================================================ */
(function () {
  const state = { total: 0, right: 0, answered: 0 };

  function updateScore() {
    document.querySelectorAll('[data-score]').forEach(el => {
      el.textContent = state.answered
        ? `First-try score: ${state.right} / ${state.answered} answered (of ${state.total})`
        : `${state.total} practice questions on this page`;
    });
  }

  function evalNumber(s) {
    s = String(s).trim().replace(/,/g, '').replace(/\s+/g, '');
    if (!/^[-+*/().0-9eE]+$/.test(s)) return NaN;
    try { const v = Function('"use strict";return (' + s + ')')(); return typeof v === 'number' ? v : NaN; }
    catch { return NaN; }
  }
  const norm = s => String(s).toLowerCase().replace(/[\s,]+/g, ' ').trim();
  // recall.js listens for this to collect wrong first tries for review
  const report = (box, ok) => document.dispatchEvent(new CustomEvent('practice:graded', { detail: { box, ok } }));

  function initMCQ(box) {
    state.total++;
    const correct = +box.dataset.correct;
    const buttons = [...box.querySelectorAll('button')];
    const why = box.querySelector('.why');
    let first = true;
    buttons.forEach((b, i) => b.addEventListener('click', () => {
      if (i === correct) {
        b.classList.add('right');
        buttons.forEach(x => x.disabled = true);
        if (why) why.hidden = false;
        if (first) state.right++;
      } else {
        b.classList.add('wrong'); b.disabled = true;
      }
      if (first) { state.answered++; first = false; updateScore(); report(box, i === correct); }
    }));
  }

  function initNum(box) {
    state.total++;
    const answers = box.dataset.answer.split('|');
    const tol = parseFloat(box.dataset.tol || '0.01');
    const why = box.querySelector('.why');
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = '<input type="text" aria-label="your answer" placeholder="your answer"> <button class="btn">Check</button> <button class="btn ghost">Show</button>';
    const fb = document.createElement('div'); fb.className = 'feedback';
    const anchor = why || null;
    box.insertBefore(row, anchor); box.insertBefore(fb, anchor);
    const [input, check, show] = row.querySelectorAll('input, button');
    let first = true;
    function grade() {
      const raw = input.value; if (!raw.trim()) return;
      const v = evalNumber(raw);
      const ok = answers.some(a => {
        const av = evalNumber(a);
        if (!isNaN(av) && !isNaN(v)) return Math.abs(v - av) <= tol * Math.max(1, Math.abs(av));
        return norm(a) === norm(raw);
      });
      fb.className = 'feedback ' + (ok ? 'ok' : 'no');
      fb.textContent = ok ? '✓ Correct.' : '✗ Not quite — try again, or press Show.';
      if (first) { state.answered++; if (ok) state.right++; first = false; updateScore(); report(box, ok); }
      if (ok && why) why.hidden = false;
    }
    check.addEventListener('click', grade);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') grade(); });
    show.addEventListener('click', () => {
      if (first) { state.answered++; first = false; updateScore(); report(box, false); }
      fb.className = 'feedback'; fb.textContent = 'Answer: ' + answers[0];
      if (why) why.hidden = false;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mcq').forEach(initMCQ);
    document.querySelectorAll('div.num').forEach(initNum);
    updateScore();
  });
})();
