/* ============================================================
   mlfq.js — Multi-Level Feedback Queue simulator (tick based).
   Needs gantt.js loaded first (uses OSViz.gantt / OSViz.colour):
     <script src="../assets/gantt.js" defer></script>
     <script src="../assets/mlfq.js" defer></script>

   A) Interactive widget from markup (rendered on DOMContentLoaded):
      <div data-mlfq='{
         "quanta":[2,4,0],          // slice per level, TOP level first; 0 = FCFS (run to completion)
         "boost":0,                 // Rule 5 period S in ticks; 0 = no priority boost
         "accounting":"allotment",  // "allotment" = Rule 4 (total time at a level)
                                    // "slice"     = old Rules 4a/4b (I/O resets the count)
         "jobs":[{"name":"A","arrival":0,"burst":5},
                 {"name":"B","arrival":0,"burst":20,"io":[1,1]}],   // io: [run k ticks, then block m ticks]
         "presets":{"Label":{...same keys...}},   // optional dropdown of scenarios
         "controls":true }'></div>               // false = chart + table only

   B) From JS:
      const r = OSMLFQ.simulate(cfg)
        r = { lanes:[{label,segs}], rows:[{name,arrival,burst,start,end,turnaround,response}],
              boosts:[t...], end }
      OSMLFQ.render(el, cfg)

   Conventions (state these when using the widget):
   - Levels are named like Dr. Bilal's slides: with 3 levels the top is Q2, the bottom Q0.
   - Time allotment at a level = that level's slice (as in the quizzes).
   - Using up the allotment demotes one level; at the bottom level the job just goes to the back (RR).
   - At each tick boundary, in this order: new arrivals join the top queue, I/O returners join
     their own queue, then a job whose slice just ended joins its (new) queue.
   - Rule 5 boost at t = S, 2S, …: every job moves to the top queue (queued jobs keep their
     top-to-bottom order; the job that was running goes to the back); allotments reset.
   - Rule 1 is preemptive: a job arriving in a higher queue interrupts a lower one
     (the interrupted job keeps its used allotment and goes to the back of its queue).
   ============================================================ */
(function () {
  function simulate(cfg) {
    const quanta = cfg.quanta.map(q => (q > 0 ? q : Infinity));
    const L = quanta.length;
    const S = cfg.boost || 0;
    const oldRules = cfg.accounting === 'slice';
    const jobs = cfg.jobs.map((j, i) => ({
      name: j.name, arrival: j.arrival, burst: j.burst, io: j.io || null, idx: i,
      rem: j.burst, level: 0, allot: quanta[0], sinceIO: 0, blockedUntil: -1,
      start: null, end: null, admitted: false,
    }));
    const queues = Array.from({ length: L }, () => []);
    const segs = Array.from({ length: L }, () => []);
    const boosts = [];
    const push = (lvl, name, a, b) => {
      const s = segs[lvl], last = s[s.length - 1];
      if (last && last[0] === name && last[2] === a) last[2] = b; else s.push([name, a, b]);
    };
    let t = 0, running = null, sliceUsed = 0, pending = null;
    const limit = cfg.maxTime || 400;
    while (jobs.some(j => j.end === null) && t < limit) {
      // 1. arrivals (list order) → top queue
      jobs.filter(j => !j.admitted && j.arrival <= t).forEach(j => {
        j.admitted = true; j.level = 0; j.allot = quanta[0]; queues[0].push(j);
      });
      // 2. I/O returners → their own queue
      jobs.filter(j => j.blockedUntil === t && j.end === null).forEach(j => { j.blockedUntil = -1; queues[j.level].push(j); });
      // 3. job whose slice just ended
      if (pending) { queues[pending.level].push(pending); pending = null; }
      // 4. Rule 5: priority boost
      if (S > 0 && t > 0 && t % S === 0) {
        const all = [];
        queues.forEach(q => { all.push(...q); q.length = 0; });
        if (running) { all.push(running); running = null; }
        all.forEach(j => { j.level = 0; j.allot = quanta[0]; queues[0].push(j); });
        jobs.filter(j => j.blockedUntil > t).forEach(j => { j.level = 0; j.allot = quanta[0]; });
        boosts.push(t);
      }
      // 5. Rule 1 preemption by a higher queue
      if (running && queues.slice(0, running.level).some(q => q.length)) {
        queues[running.level].push(running); running = null;
      }
      // 6. pick
      if (!running) {
        const q = queues.find(q => q.length);
        if (q) { running = q.shift(); sliceUsed = 0; }
      }
      if (!running) { t++; continue; }   // idle tick (not drawn)
      // 7. run one tick
      const j = running;
      if (j.start === null) j.start = t;
      push(j.level, j.name, t, t + 1);
      j.rem--; j.allot--; sliceUsed++; j.sinceIO++;
      t++;
      if (j.rem === 0) { j.end = t; running = null; continue; }
      if (j.allot <= 0) {                      // Rule 4 (or 4a): allotment used up → demote
        j.level = Math.min(j.level + 1, L - 1); j.allot = quanta[j.level];
        if (j.io && j.sinceIO >= j.io[0]) { j.sinceIO = 0; j.blockedUntil = t + j.io[1]; }
        else pending = j;
        running = null; continue;
      }
      if (j.io && j.sinceIO >= j.io[0]) {     // gives up the CPU for I/O
        j.sinceIO = 0; j.blockedUntil = t + j.io[1];
        if (oldRules) j.allot = quanta[j.level]; // Rule 4b: stays, and the count starts over
        running = null; continue;
      }
      if (sliceUsed >= quanta[j.level]) { pending = j; running = null; }
    }
    const names = L === 1 ? ['Q0'] : quanta.map((_, i) => 'Q' + (L - 1 - i));
    const rows = jobs.map(j => ({ name: j.name, arrival: j.arrival, burst: j.burst, start: j.start, end: j.end,
      turnaround: j.end === null ? null : j.end - j.arrival, response: j.start === null ? null : j.start - j.arrival }));
    return { lanes: names.map((label, i) => ({ label, segs: segs[i] })), rows, boosts, end: t };
  }

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function table(r) {
    const col = n => (window.OSViz ? OSViz.colour(n) : 'currentColor');
    const v = x => (x === null ? '—' : x);
    const done = r.rows.filter(x => x.end !== null);
    const avg = k => done.length ? (done.reduce((s, x) => s + x[k], 0) / done.length) : 0;
    const f = x => Number.isInteger(x) ? x : x.toFixed(2);
    return `<div class="table-wrap"><table>
      <thead><tr><th>Job</th><th class="num">Arrives</th><th class="num">Burst</th><th class="num">First runs</th><th class="num">Finishes</th>
      <th class="num">Turnaround</th><th class="num">Response</th></tr></thead><tbody>
      ${r.rows.map(x => `<tr><td><b style="color:${col(x.name)}">■</b> ${esc(x.name)}</td><td class="num">${x.arrival}</td><td class="num">${x.burst}</td>
      <td class="num">${v(x.start)}</td><td class="num">${v(x.end)}</td><td class="num">${v(x.turnaround)}</td><td class="num">${v(x.response)}</td></tr>`).join('')}
      <tr><td colspan="5"><b>Average</b></td><td class="num"><b>${f(avg('turnaround'))}</b></td><td class="num"><b>${f(avg('response'))}</b></td></tr>
      </tbody></table></div>`;
  }

  function jobsToText(jobs) {
    return jobs.map(j => `${j.name} ${j.arrival} ${j.burst}${j.io ? ' io ' + j.io[0] + ' ' + j.io[1] : ''}`).join('\n');
  }
  function textToJobs(s) {
    return s.trim().split('\n').map(l => l.trim().split(/\s+/)).filter(p => p.length >= 3)
      .map(p => {
        const j = { name: p[0], arrival: +p[1], burst: +p[2] };
        if (p[3] === 'io' && +p[4] > 0 && +p[5] > 0) j.io = [+p[4], +p[5]];
        return j;
      }).filter(j => j.burst > 0 && j.arrival >= 0);
  }

  function render(el, cfg) {
    const draw = (c, chart, stats, note) => {
      const r = simulate(c);
      const spec = { lanes: r.lanes, end: Math.max(r.end, 1),
        arrivals: c.jobs.filter(j => j.arrival > 0).map(j => [j.name, j.arrival]) };
      OSViz.gantt(chart, spec);
      stats.innerHTML = table(r);
      if (note) {
        const q = c.quanta.map((x, i) => `${r.lanes[i].label}: ${x > 0 ? 'slice ' + x : 'FCFS'}`).join(' · ');
        note.textContent = `${q} · boost ${c.boost ? 'every S = ' + c.boost : 'off'}` +
          (r.boosts.length ? ` (at t = ${r.boosts.join(', ')})` : '') +
          ` · ${c.accounting === 'slice' ? 'old Rules 4a/4b' : 'Rule 4 (allotment)'}`;
      }
    };
    if (cfg.controls === false) {
      el.innerHTML = '<div class="chart"></div><div class="stats"></div>';
      draw(cfg, el.querySelector('.chart'), el.querySelector('.stats'));
      return;
    }
    let c = JSON.parse(JSON.stringify(cfg));
    const presets = cfg.presets || null;
    el.classList.add('sim');
    el.innerHTML = `
      <div class="controls">
        ${presets ? `<label>scenario <select class="pre">${Object.keys(presets).map(k => `<option>${esc(k)}</option>`).join('')}</select></label>` : ''}
        <label>slices (top→bottom, 0 = FCFS) <input class="qs" type="text" style="width:6.5rem"></label>
        <label>boost S <input class="bs" type="number" min="0" style="width:4.2rem"></label>
        <span class="seg-ctl"><button data-a="allotment">Rule 4</button><button data-a="slice">Old 4a/4b</button></span>
      </div>
      <p class="small note" style="margin:.5rem 0 0"></p>
      <div class="chart"></div><div class="stats"></div>
      <details style="font-family:var(--sans);font-size:.8rem"><summary>Edit the jobs (name arrival burst [io run block]; one per line)</summary>
        <textarea rows="5" style="width:100%;font-family:var(--mono);font-size:.85rem;margin-top:.4rem;background:var(--bg);color:var(--ink);border:1px solid var(--rule);border-radius:6px;padding:.4rem"></textarea>
        <p class="small">Example: <code>B 0 12 io 1 2</code> means B needs 12 ticks of CPU; it runs 1 tick, then waits 2 ticks for I/O, and repeats.</p>
      </details>`;
    const qs = el.querySelector('.qs'), bs = el.querySelector('.bs'), ta = el.querySelector('textarea');
    const ab = el.querySelectorAll('.seg-ctl button'), pre = el.querySelector('.pre');
    function fill() {
      qs.value = c.quanta.join(','); bs.value = c.boost || 0; ta.value = jobsToText(c.jobs);
      ab.forEach(b => b.classList.toggle('on', b.dataset.a === (c.accounting || 'allotment')));
    }
    function go() {
      const qv = qs.value.split(/[,\s]+/).map(Number).filter(x => x >= 0 && isFinite(x));
      if (!qv.length || qv.length > 6) return;
      c.quanta = qv; c.boost = Math.max(0, +bs.value || 0);
      const jobs = textToJobs(ta.value); if (!jobs.length) return;
      c.jobs = jobs;
      draw(c, el.querySelector('.chart'), el.querySelector('.stats'), el.querySelector('.note'));
    }
    if (pre) pre.addEventListener('change', () => { c = JSON.parse(JSON.stringify(presets[pre.value])); fill(); go(); });
    if (presets) { const first = Object.keys(presets)[0]; c = JSON.parse(JSON.stringify(presets[first])); }
    [qs, bs, ta].forEach(x => x.addEventListener('input', go));
    ab.forEach(b => b.addEventListener('click', () => { c.accounting = b.dataset.a; fill(); go(); }));
    fill(); go();
  }

  window.OSMLFQ = { simulate, render };
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('[data-mlfq]').forEach(el => render(el, JSON.parse(el.dataset.mlfq)));
    });
  }
})();
