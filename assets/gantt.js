/* ============================================================
   gantt.js — CPU timeline charts + scheduling simulators.
   Include:  <script src="../assets/gantt.js" defer></script>

   A) Static chart from markup (auto-rendered on load):
      <div data-gantt='{
         "lanes":[{"label":"CPU","segs":[["A",0,3],["B",3,5],["-",5,6]]}],
         "arrivals":[["A",0],["B",1]],
         "end": 9 }'></div>
      - segs are [job, start, end]; job "-" means the CPU is idle.
      - several lanes = several CPUs or several queues (MLFQ, multiprocessor).
      - a job keeps the same colour everywhere (colour follows the job name:
        A..H, and P1..P8 / J1..J8 / T1..T8 map to fixed palette slots).

   B) Interactive simulator from markup:
      <div data-sim='{"jobs":[{"name":"A","arrival":0,"burst":3}], "policy":"FIFO", "q":2,
                      "policies":["FIFO","SJF","STCF","RR"]}'></div>

   C) From JS:
      OSViz.gantt(el, spec)
      const r = OSViz.schedule('RR', jobs, {q: 1})    // 'FIFO' | 'SJF' | 'STCF' | 'RR'
         r = {segs, rows:[{name,arrival,burst,start,end,turnaround,response}], avgT, avgR}
      OSViz.statsTable(el, r)
      OSViz.simulator(el, cfg)
      OSViz.colour(jobName) -> CSS colour for that job
   Conventions (match the course quizzes): ties broken by arrival, then by list order;
   in RR, jobs arriving during a slice join the queue BEFORE the preempted job.
   ============================================================ */
(function () {
  const SLOTS = ['--s1', '--s2', '--s3', '--s4', '--s5', '--s6', '--s7', '--s8'];
  const colourMap = new Map();
  function colourFor(job) {
    if (!colourMap.has(job)) colourMap.set(job, `var(${SLOTS[colourMap.size % SLOTS.length]})`);
    return colourMap.get(job);
  }
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(colourFor);
  const familyIndex = name => { const m = /^[A-Za-z]+(\d)$/.exec(name); return m ? +m[1] - 1 : -1; };
  function colour(job) {
    const i = familyIndex(job);
    if (i >= 0 && i < SLOTS.length) return `var(${SLOTS[i]})`;
    return colourFor(job);
  }

  let tip;
  function showTip(e, text) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'gantt-tip'; document.body.appendChild(tip); }
    tip.textContent = text; tip.style.display = 'block';
    tip.style.left = (e.clientX + 12) + 'px'; tip.style.top = (e.clientY + 12) + 'px';
  }
  const hideTip = () => { if (tip) tip.style.display = 'none'; };

  function gantt(el, spec) {
    if (Array.isArray(spec)) spec = { lanes: [{ label: 'CPU', segs: spec }] };
    const lanes = spec.lanes.map(l => ({ label: l.label, segs: l.segs.map(s => Array.isArray(s) ? s : [s.job, s.start, s.end]) }));
    const end = spec.end || Math.max(1, ...lanes.flatMap(l => l.segs.map(s => s[2])));
    const pct = t => (t / end * 100) + '%';
    el.classList.add('gantt'); el.innerHTML = '';

    if (spec.arrivals && spec.arrivals.length) {
      const ar = document.createElement('div'); ar.className = 'arrivals';
      const byT = {};
      spec.arrivals.forEach(([n, t]) => (byT[t] = byT[t] || []).push(n));
      Object.entries(byT).forEach(([t, ns]) => {
        const s = document.createElement('span'); s.style.left = pct(+t);
        s.textContent = ns.join(',') + ' ↓'; ar.appendChild(s);
      });
      el.appendChild(ar);
    }
    lanes.forEach(l => {
      const lane = document.createElement('div'); lane.className = 'lane';
      lane.innerHTML = `<div class="lane-label">${l.label}</div><div class="track"></div>`;
      const track = lane.lastChild;
      l.segs.forEach(([job, a, b]) => {
        const d = document.createElement('div');
        d.className = 'seg' + (job === '-' ? ' idle' : '');
        d.style.left = pct(a); d.style.width = `calc(${pct(b - a)} - 2px)`;
        if (job !== '-') d.style.background = colour(job);
        d.textContent = (b - a) / end > 0.025 ? (job === '-' ? '' : job) : '';
        const label = job === '-' ? `idle: ${a} → ${b}` : `${job} runs ${a} → ${b}  (${+(b - a).toFixed(2)} units)`;
        d.setAttribute('aria-label', label);
        d.addEventListener('mousemove', e => showTip(e, label));
        d.addEventListener('mouseleave', hideTip);
        track.appendChild(d);
      });
      el.appendChild(lane);
    });
    const ax = document.createElement('div'); ax.className = 'axis';
    const step = spec.step || (end <= 20 ? 1 : end <= 40 ? 2 : end <= 100 ? 5 : Math.ceil(end / 20));
    for (let t = 0; t <= end + 1e-9; t += step) {
      const s = document.createElement('span'); s.style.left = pct(t); s.textContent = +t.toFixed(2); ax.appendChild(s);
    }
    el.appendChild(ax);
  }

  /* ---------------- scheduling policies ---------------- */
  function schedule(policy, jobsIn, opts = {}) {
    const q = opts.q || 1;
    const jobs = jobsIn.map((j, i) => ({ ...j, idx: i, rem: j.burst, start: null, end: null }));
    const segs = [];
    const push = (job, a, b) => {
      const last = segs[segs.length - 1];
      if (last && last[0] === job && last[2] === a) last[2] = b; else segs.push([job, a, b]);
    };
    const byArrival = (a, b) => a.arrival - b.arrival || a.idx - b.idx;
    let t = 0;
    const done = () => jobs.every(j => j.rem <= 0);
    const arrived = () => jobs.filter(j => j.rem > 0 && j.arrival <= t);
    const nextArrival = () => Math.min(...jobs.filter(j => j.rem > 0 && j.arrival > t).map(j => j.arrival));
    const run = (j, len) => {
      if (j.start === null) j.start = t;
      push(j.name, t, t + len); t += len; j.rem -= len;
      if (j.rem <= 0) j.end = t;
    };

    if (policy === 'FIFO' || policy === 'SJF') {
      while (!done()) {
        const ready = arrived();
        if (!ready.length) { const n = nextArrival(); push('-', t, n); t = n; continue; }
        ready.sort(policy === 'FIFO' ? byArrival : (a, b) => a.burst - b.burst || byArrival(a, b));
        run(ready[0], ready[0].rem);
      }
    } else if (policy === 'STCF') {
      let cur = null;
      while (!done()) {
        const ready = arrived();
        if (!ready.length) { const n = nextArrival(); push('-', t, n); t = n; continue; }
        ready.sort((a, b) => a.rem - b.rem || (b === cur) - (a === cur) || byArrival(a, b));
        cur = ready[0];
        const n = nextArrival();
        run(cur, Math.min(cur.rem, isFinite(n) ? n - t : cur.rem));
      }
    } else if (policy === 'RR') {
      const queue = []; const seen = new Set();
      const admit = upTo => jobs.filter(j => !seen.has(j) && j.arrival <= upTo).sort(byArrival)
        .forEach(j => { seen.add(j); queue.push(j); });
      admit(t);
      while (!done()) {
        if (!queue.length) { const n = nextArrival(); push('-', t, n); t = n; admit(t); continue; }
        const j = queue.shift();
        run(j, Math.min(q, j.rem));
        admit(t);                      // arrivals during the slice queue up first…
        if (j.rem > 0) queue.push(j);  // …then the preempted job goes to the back
      }
    } else throw new Error('unknown policy ' + policy);

    const rows = jobs.map(j => ({
      name: j.name, arrival: j.arrival, burst: j.burst, start: j.start, end: j.end,
      turnaround: j.end - j.arrival, response: j.start - j.arrival,
    }));
    const avg = k => rows.reduce((s, r) => s + r[k], 0) / rows.length;
    return { segs, rows, avgT: avg('turnaround'), avgR: avg('response'), end: t };
  }

  const fmt = x => Number.isInteger(x) ? String(x) : x.toFixed(2);

  function statsTable(el, r) {
    el.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Job</th><th class="num">Arrives</th><th class="num">Burst</th><th class="num">First runs</th><th class="num">Finishes</th>
      <th class="num">Turnaround<br><small>finish − arrive</small></th><th class="num">Response<br><small>first run − arrive</small></th></tr></thead>
      <tbody>${r.rows.map(x => `<tr><td><b style="color:${colour(x.name)}">■</b> ${x.name}</td><td class="num">${x.arrival}</td><td class="num">${x.burst}</td>
        <td class="num">${x.start}</td><td class="num">${x.end}</td><td class="num">${x.turnaround}</td><td class="num">${x.response}</td></tr>`).join('')}
      <tr><td colspan="5"><b>Average</b></td><td class="num"><b>${fmt(r.avgT)}</b></td><td class="num"><b>${fmt(r.avgR)}</b></td></tr></tbody></table></div>`;
  }

  function simulator(el, cfg) {
    const policies = cfg.policies || ['FIFO', 'SJF', 'STCF', 'RR'];
    let policy = cfg.policy || policies[0];
    let q = cfg.q || 1;
    const jobsText = cfg.jobs.map(j => `${j.name} ${j.arrival} ${j.burst}`).join('\n');
    el.classList.add('sim');
    el.innerHTML = `
      <div class="controls">
        <span class="seg-ctl">${policies.map(p => `<button data-p="${p}">${p}</button>`).join('')}</span>
        <label class="qwrap">quantum <input type="number" min="1" value="${q}" style="width:4rem"></label>
      </div>
      <div class="chart"></div><div class="stats"></div>
      <details style="font-family:var(--sans);font-size:.8rem"><summary>Edit the jobs (name arrival burst — one per line)</summary>
        <textarea rows="5" style="width:100%;font-family:var(--mono);font-size:.85rem;margin-top:.4rem;background:var(--bg);color:var(--ink);border:1px solid var(--rule);border-radius:6px;padding:.4rem">${jobsText}</textarea>
      </details>`;
    const btns = el.querySelectorAll('.seg-ctl button');
    const qIn = el.querySelector('.qwrap input');
    const ta = el.querySelector('textarea');
    function parseJobs() {
      return ta.value.trim().split('\n').map(l => l.trim().split(/\s+/)).filter(p => p.length === 3)
        .map(([name, a, b]) => ({ name, arrival: +a, burst: +b })).filter(j => j.burst > 0 && j.arrival >= 0);
    }
    function render() {
      btns.forEach(b => b.classList.toggle('on', b.dataset.p === policy));
      el.querySelector('.qwrap').style.display = policy === 'RR' ? '' : 'none';
      const jobs = parseJobs(); if (!jobs.length) return;
      const r = schedule(policy, jobs, { q });
      gantt(el.querySelector('.chart'), { lanes: [{ label: policy, segs: r.segs }], arrivals: jobs.map(j => [j.name, j.arrival]) });
      statsTable(el.querySelector('.stats'), r);
    }
    btns.forEach(b => b.addEventListener('click', () => { policy = b.dataset.p; render(); }));
    qIn.addEventListener('input', () => { q = Math.max(1, +qIn.value || 1); render(); });
    ta.addEventListener('input', render);
    render();
  }

  window.OSViz = { gantt, schedule, statsTable, simulator, colour };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-gantt]').forEach(el => gantt(el, JSON.parse(el.dataset.gantt)));
    document.querySelectorAll('[data-sim]').forEach(el => simulator(el, JSON.parse(el.dataset.sim)));
  });
})();
