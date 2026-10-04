/* ============================================================
   propshare.js — proportional-share widgets: lottery, stride, CFS.
   Include:  <script src="../assets/propshare.js" defer></script>
   (Uses OSViz.colour from gantt.js for job colours if it is loaded; works without it.)

   1) Lottery draw machine
      <div data-lottery='{"jobs":[["A",50],["B",30],["C",20]]}'></div>
      - shows each job's winning range (0-based, like rand() % total), a Draw / Draw 10 /
        Draw 1000 button set, the list-walk for the last draw, and win counts vs ticket share.

   2) Stride table builder (step row by row)
      <div data-stride='{"jobs":[["A",40],["B",80],["C",200]],"big":10000}'></div>
      - every row shows the pass values BEFORE the pick; "Who runs?" = lowest pass;
        ties go to the job listed first (matches Dr. Bilal's table and Lab 4 stride.c).
      - optional: add a late job with pass 0 or with the current minimum pass.

   3) CFS calculator + vruntime step-through
      <div data-cfs='{"tasks":[["A",0],["B",-5]],"latency":48,"mingran":6}'></div>
      - tasks are [name, nice]; in the text box a line "X w=700" sets a raw weight instead.
      - slice_i = weight_i / Σweights × sched_latency, raised to min_granularity if smaller.
      - vruntime gain = slice × 1024 / weight_i.
      - "Step" runs the task with the smallest vruntime (ties → listed first) for its slice.

   JS:  OSProp.NICE_TO_WEIGHT[nice] → weight;  OSProp.cfsSlices(tasks, latency, mingran);
        OSProp.strideRows(jobs, big, n)
   ============================================================ */
(function () {
  const NICE_TO_WEIGHT = {
    '-20': 88761, '-19': 71755, '-18': 56483, '-17': 46273, '-16': 36291,
    '-15': 29154, '-14': 23254, '-13': 18705, '-12': 14949, '-11': 11916,
    '-10': 9548, '-9': 7620, '-8': 6100, '-7': 4904, '-6': 3906,
    '-5': 3121, '-4': 2501, '-3': 1991, '-2': 1586, '-1': 1277,
    '0': 1024, '1': 820, '2': 655, '3': 526, '4': 423,
    '5': 335, '6': 272, '7': 215, '8': 172, '9': 137,
    '10': 110, '11': 87, '12': 70, '13': 56, '14': 45,
    '15': 36, '16': 29, '17': 23, '18': 18, '19': 15,
  };
  const col = n => (window.OSViz ? OSViz.colour(n) : 'var(--accent)');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f2 = x => (Number.isInteger(x) ? String(x) : (Math.round(x * 100) / 100).toString());
  const inputStyle = 'font-family:var(--mono);font-size:.82rem;padding:.3rem .45rem;border-radius:6px;border:1px solid var(--rule);background:var(--bg);color:var(--ink)';
  const parsePairs = s => s.split(/[,\n]+/).map(x => x.trim().split(/\s+/)).filter(p => p.length >= 2 && p[0]);

  /* ---------------- lottery ---------------- */
  function lottery(el, cfg) {
    let jobs = cfg.jobs.map(([n, t]) => ({ name: n, tickets: +t, wins: 0 }));
    let draws = 0, last = null;
    el.classList.add('sim');
    el.innerHTML = `<div class="controls">
        <label>jobs <input class="jt" type="text" style="${inputStyle};width:12rem"></label>
        <button class="btn" data-n="1">Draw</button><button class="btn ghost" data-n="10">Draw 10</button>
        <button class="btn ghost" data-n="1000">Draw 1000</button><button class="btn ghost" data-n="0">Reset</button></div>
      <div class="bar" style="display:flex;height:2rem;border-radius:6px;overflow:hidden;margin:.8rem 0 .2rem;font-family:var(--sans);font-size:.72rem;color:#fff;font-weight:600"></div>
      <div class="walk small" style="font-family:var(--sans);min-height:2.6rem"></div><div class="tbl"></div>`;
    const jt = el.querySelector('.jt');
    jt.value = jobs.map(j => `${j.name} ${j.tickets}`).join(', ');
    function total() { return jobs.reduce((s, j) => s + j.tickets, 0); }
    function render() {
      const T = total(); let lo = 0;
      el.querySelector('.bar').innerHTML = jobs.map(j => `<div style="flex:${j.tickets};background:${col(j.name)};display:grid;place-items:center;overflow:hidden" title="${esc(j.name)}">${esc(j.name)}</div>`).join('');
      let rows = '';
      jobs.forEach(j => {
        const hi = lo + j.tickets - 1;
        rows += `<tr${last && last.job === j ? ' style="background:var(--warn-bg)"' : ''}><td><b style="color:${col(j.name)}">■</b> ${esc(j.name)}</td><td class="num">${j.tickets}</td><td class="num">${lo}–${hi}</td>
          <td class="num">${f2(100 * j.tickets / T)}%</td><td class="num">${j.wins}</td><td class="num">${draws ? f2(100 * j.wins / draws) + '%' : '—'}</td></tr>`;
        lo = hi + 1;
      });
      el.querySelector('.tbl').innerHTML = `<div class="table-wrap"><table><thead><tr><th>Job</th><th class="num">Tickets</th><th class="num">Winning range</th>
        <th class="num">Expected share</th><th class="num">Wins</th><th class="num">Actual share</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="small" style="margin:0">Total tickets = ${T}. Draws so far: ${draws}.</p>`;
      el.querySelector('.walk').innerHTML = last
        ? `Winning ticket <b>${last.win}</b> (random number from 0 to ${T - 1}). Walk the list: ${last.steps.join(' → ')} → <b>${esc(last.job.name)} runs</b>.`
        : 'Press Draw. Each draw picks a random ticket, then walks the job list adding up tickets until the running total passes the winner.';
    }
    function draw() {
      const T = total(); const win = Math.floor(Math.random() * T);
      let counter = 0; const steps = [];
      for (const j of jobs) {
        counter += j.tickets;
        steps.push(`${esc(j.name)}: counter ${counter}${counter > win ? ' &gt; ' + win + ' ✓' : ''}`);
        if (counter > win) { j.wins++; draws++; last = { win, job: j, steps }; return; }
      }
    }
    el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const n = +b.dataset.n;
      if (!n) { jobs.forEach(j => (j.wins = 0)); draws = 0; last = null; }
      for (let i = 0; i < n; i++) draw();
      render();
    }));
    jt.addEventListener('change', () => {
      const p = parsePairs(jt.value).map(([n, t]) => ({ name: n, tickets: Math.floor(+t), wins: 0 })).filter(j => j.tickets > 0);
      if (p.length) { jobs = p; draws = 0; last = null; render(); }
    });
    render();
  }

  /* ---------------- stride ---------------- */
  function strideRows(jobs, big, n) {
    const js = jobs.map(([name, t]) => ({ name, stride: big / t, pass: 0 }));
    const rows = [];
    for (let i = 0; i < n; i++) {
      let w = 0; js.forEach((j, k) => { if (j.pass < js[w].pass) w = k; });
      rows.push({ passes: js.map(j => j.pass), runs: js[w].name });
      js[w].pass += js[w].stride;
    }
    return { strides: js.map(j => j.stride), rows };
  }

  function stride(el, cfg) {
    let big = cfg.big || 10000;
    let jobs, rows;
    el.classList.add('sim');
    el.innerHTML = `<div class="controls">
        <label>tickets <input class="jt" type="text" style="${inputStyle};width:11rem"></label>
        <label>large number <input class="bg" type="number" min="1" style="${inputStyle};width:6rem"></label></div>
      <div class="controls" style="margin-top:.5rem">
        <button class="btn" data-a="next">Next row</button><button class="btn ghost" data-a="five">+5 rows</button>
        <button class="btn ghost" data-a="reset">Reset</button></div>
      <div class="controls" style="margin-top:.5rem">
        <label>late job <input class="nn" type="text" value="D 100" style="${inputStyle};width:5.5rem"></label>
        <button class="btn ghost" data-a="add0">add with pass 0</button><button class="btn ghost" data-a="addmin">add with current min pass</button></div>
      <div class="tbl"></div><p class="small msg" style="margin:0"></p>`;
    const jt = el.querySelector('.jt'), bg = el.querySelector('.bg'), msg = el.querySelector('.msg');
    jt.value = cfg.jobs.map(j => j.join(' ')).join(', '); bg.value = big;
    function reset() {
      big = Math.max(1, +bg.value || 10000);
      jobs = parsePairs(jt.value).map(([n, t]) => ({ name: n, tickets: +t, stride: big / +t, pass: 0, runs: 0 })).filter(j => j.tickets > 0);
      rows = []; msg.textContent = '';
    }
    function pick() { let w = 0; jobs.forEach((j, k) => { if (j.pass < jobs[w].pass) w = k; }); return w; }
    function step() {
      const w = pick();
      rows.push({ passes: jobs.map(j => j.pass), w, n: jobs.length });
      jobs[w].pass += jobs[w].stride; jobs[w].runs++;
    }
    function render() {
      const head = jobs.map(j => `<th class="num">Pass(${esc(j.name)})<br><small>stride ${f2(j.stride)}</small></th>`).join('');
      const body = rows.map((r, i) => `<tr><td class="num">${i + 1}</td>${jobs.map((j, k) => k < r.n
        ? `<td class="num"${k === r.w ? ' style="background:var(--warn-bg);font-weight:700"' : ''}>${f2(r.passes[k])}</td>` : '<td class="num">—</td>').join('')}
        <td><b style="color:${col(jobs[r.w].name)}">■</b> ${esc(jobs[r.w].name)}</td></tr>`).join('');
      const nextW = pick();
      const nextRow = `<tr style="color:var(--muted)"><td class="num">${rows.length + 1}</td>${jobs.map(j => `<td class="num">${f2(j.pass)}</td>`).join('')}<td>${esc(jobs[nextW].name)}?</td></tr>`;
      el.querySelector('.tbl').innerHTML = `<div class="table-wrap"><table><thead><tr><th class="num">#</th>${head}<th>Who runs?</th></tr></thead><tbody>${body}${nextRow}</tbody></table></div>
        <p class="small" style="margin:0">Runs so far: ${jobs.map(j => `${esc(j.name)} ${j.runs}`).join(' · ')} (ticket ratio ${jobs.map(j => j.tickets).join(' : ')}).</p>`;
    }
    el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'next') step();
      if (a === 'five') for (let i = 0; i < 5; i++) step();
      if (a === 'reset') reset();
      if (a === 'add0' || a === 'addmin') {
        const p = el.querySelector('.nn').value.trim().split(/\s+/);
        const t = +p[1];
        if (p[0] && t > 0 && !jobs.some(j => j.name === p[0])) {
          const minPass = Math.min(...jobs.map(j => j.pass));
          jobs.push({ name: p[0], tickets: t, stride: big / t, pass: a === 'add0' ? 0 : minPass, runs: 0 });
          msg.textContent = a === 'add0'
            ? `${p[0]} joined with pass 0 while the others are far ahead, so it will win every pick until it catches up. That is the "new job monopolizes the CPU" problem.`
            : `${p[0]} joined with pass ${f2(minPass)} (the current minimum), so it shares fairly from now on.`;
        }
      }
      render();
    }));
    [jt, bg].forEach(x => x.addEventListener('change', () => { reset(); render(); }));
    reset(); render();
  }

  /* ---------------- CFS ---------------- */
  function weightOf(spec) {
    if (/^w=/.test(spec)) return +spec.slice(2);
    return NICE_TO_WEIGHT[String(Math.max(-20, Math.min(19, Math.round(+spec))))];
  }
  function cfsSlices(tasks, latency, mingran) {
    const total = tasks.reduce((s, t) => s + t.weight, 0);
    return tasks.map(t => {
      const raw = t.weight / total * latency;
      const slice = Math.max(raw, mingran);
      return { ...t, share: t.weight / total, raw, slice, clamped: raw < mingran, gain: slice * 1024 / t.weight };
    });
  }

  function cfs(el, cfg) {
    el.classList.add('sim');
    el.innerHTML = `<div class="controls">
        <label>sched_latency <input class="lat" type="number" min="1" step="any" style="${inputStyle};width:4.5rem"> ms</label>
        <label>min_granularity <input class="mg" type="number" min="0" step="any" style="${inputStyle};width:4.5rem"> ms</label></div>
      <label style="font-family:var(--sans);font-size:.8rem;display:block;margin-top:.5rem">tasks (name nice, or name w=weight; comma separated)
        <input class="tk" type="text" style="${inputStyle};width:100%;margin-top:.2rem"></label>
      <div class="tbl"></div>
      <div class="controls" style="margin-top:.4rem"><button class="btn" data-a="step">Step: run leftmost</button>
        <button class="btn ghost" data-a="reset">Reset vruntimes</button>
        <label>new task <input class="nn" type="text" value="N 0" style="${inputStyle};width:5rem"></label>
        <button class="btn ghost" data-a="add0">join at 0</button><button class="btn ghost" data-a="addmin">join at min_vruntime</button></div>
      <div class="tree" style="font-family:var(--sans);font-size:.85rem;margin-top:.6rem"></div>
      <ol class="log small" style="font-family:var(--sans);margin:.4rem 0 0;padding-left:1.4rem"></ol>`;
    const lat = el.querySelector('.lat'), mg = el.querySelector('.mg'), tk = el.querySelector('.tk');
    lat.value = cfg.latency; mg.value = cfg.mingran;
    tk.value = cfg.tasks.map(t => t.join(' ')).join(', ');
    let tasks = [], v = {};
    function parse() {
      tasks = parsePairs(tk.value).map(([name, spec]) => ({ name, spec, weight: weightOf(spec) })).filter(t => t.weight > 0);
    }
    function render() {
      const L = +lat.value || 1, G = +mg.value || 0;
      const r = cfsSlices(tasks, L, G);
      const total = tasks.reduce((s, t) => s + t.weight, 0);
      el.querySelector('.tbl').innerHTML = `<div class="table-wrap"><table><thead><tr><th>Task</th><th class="num">nice</th><th class="num">weight</th>
        <th class="num">weight / Σ</th><th class="num">formula slice</th><th class="num">actual slice</th><th class="num">vruntime gain<br><small>slice × 1024 / w</small></th></tr></thead><tbody>
        ${r.map(t => `<tr><td><b style="color:${col(t.name)}">■</b> ${esc(t.name)}</td><td class="num">${/^w=/.test(t.spec) ? '—' : esc(t.spec)}</td><td class="num">${t.weight}</td>
          <td class="num">${f2(t.share * 100)}%</td><td class="num">${f2(t.raw)} ms</td><td class="num">${t.clamped ? `<b>${f2(t.slice)} ms</b> <small>(raised to min)</small>` : f2(t.slice) + ' ms'}</td><td class="num">${f2(t.gain)} ms</td></tr>`).join('')}
        </tbody></table></div><p class="small" style="margin:0">Σ weights = ${total}. One full round takes ${f2(r.reduce((s, t) => s + t.slice, 0))} ms of real time.</p>`;
      const order = tasks.filter(t => t.name in v).map((t, i) => ({ t, i })).sort((a, b) => v[a.t.name] - v[b.t.name] || a.i - b.i);
      el.querySelector('.tree').innerHTML = 'Red-black tree in order (leftmost first): ' + order.map(({ t }, k) =>
        `<span style="display:inline-block;margin:.15rem .2rem;padding:.1rem .45rem;border-radius:5px;color:#fff;background:${col(t.name)}${k === 0 ? ';box-shadow:0 0 0 2px var(--ink)' : ''}">${esc(t.name)} · ${f2(v[t.name])}</span>`).join('');
      return r;
    }
    function resetV() { v = {}; tasks.forEach(t => (v[t.name] = 0)); el.querySelector('.log').innerHTML = ''; }
    function log(s) { const li = document.createElement('li'); li.innerHTML = s; el.querySelector('.log').appendChild(li); }
    el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.a;
      const r = render();
      if (a === 'step' && tasks.length) {
        let w = 0; tasks.forEach((t, k) => { if (v[t.name] < v[tasks[w].name]) w = k; });
        const t = r[w], before = v[t.name];
        v[t.name] = before + t.gain;
        log(`<b>${esc(t.name)}</b> had the smallest vruntime (${f2(before)}). It runs ${f2(t.slice)} ms → vruntime ${f2(before)} + ${f2(t.slice)} × 1024/${t.weight} = <b>${f2(v[t.name])}</b>`);
      }
      if (a === 'reset') resetV();
      if (a === 'add0' || a === 'addmin') {
        const p = el.querySelector('.nn').value.trim().split(/\s+/);
        if (p[0] && p[1] !== undefined && !tasks.some(t => t.name === p[0]) && weightOf(p[1]) > 0) {
          const mn = Math.min(...Object.values(v));
          tk.value += `, ${p[0]} ${p[1]}`; parse();
          v[p[0]] = a === 'add0' ? 0 : mn;
          log(`<b>${esc(p[0])}</b> joins with vruntime ${a === 'add0' ? '0 (it will win every pick until it catches up)' : f2(mn) + ' = min_vruntime (fair from now on)'}`);
        }
      }
      render();
    }));
    [lat, mg].forEach(x => x.addEventListener('input', render));
    tk.addEventListener('change', () => { parse(); resetV(); render(); });
    parse(); resetV(); render();
  }

  window.OSProp = { NICE_TO_WEIGHT, cfsSlices, strideRows };
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('[data-lottery]').forEach(el => lottery(el, JSON.parse(el.dataset.lottery)));
      document.querySelectorAll('[data-stride]').forEach(el => stride(el, JSON.parse(el.dataset.stride)));
      document.querySelectorAll('[data-cfs]').forEach(el => cfs(el, JSON.parse(el.dataset.cfs)));
    });
  }
})();
