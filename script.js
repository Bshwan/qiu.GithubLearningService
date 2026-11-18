/* ============================================================
   GitHub Explained: interactions
   Plain JavaScript, no libraries. Icons come from assets/icons.js
   ============================================================ */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svgNS = 'http://www.w3.org/2000/svg';
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));

  /* ---------- icons ---------- */
  const icon = (name, cls = '') => `<svg class="oct ${cls}" viewBox="0 0 16 16" aria-hidden="true">${window.OCT[name] || ''}</svg>`;
  function paintIcons(root = document) {
    $$('[data-oct]', root).forEach((el) => { el.outerHTML = icon(el.dataset.oct); });
  }
  paintIcons();

  /* ---------- toast ---------- */
  const toastEl = $('#toast'); let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  /* ---------- nav: scroll state, progress, active link, mobile menu ---------- */
  const nav = $('#nav'), bar = $('#progressBar');
  function onScroll() {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    bar.style.transform = `scaleX(${p})`;
    nav.classList.toggle('scrolled', h.scrollTop > 10);
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const menuBtn = $('#menuBtn'), navLinks = $('#navLinks');
  menuBtn.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  navLinks.addEventListener('click', (e) => { if (e.target.closest('a')) { navLinks.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); } });

  const linkFor = Object.fromEntries($$('#navLinks a').map((a) => [a.getAttribute('href').slice(1), a]));
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting && linkFor[en.target.id]) {
        Object.values(linkFor).forEach((a) => a.classList.remove('active'));
        linkFor[en.target.id].classList.add('active');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => secObs.observe(s));

  /* ---------- reveal on scroll, staggered within each parent ---------- */
  const revObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); revObs.unobserve(en.target); } });
  }, { threshold: 0.12 });
  $$('.reveal').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    el.style.setProperty('--d', `${Math.min(sibs.indexOf(el), 6) * 0.08}s`);
    revObs.observe(el);
  });
  function whenVisible(el, fn, threshold = 0.3) {
    const o = new IntersectionObserver((en) => { if (en[0].isIntersecting) { o.disconnect(); fn(); } }, { threshold });
    o.observe(el);
  }

  /* ---------- hero: rotating word ---------- */
  const words = ['store', 'track', 'share', 'review', 'build'];
  const rot = $('#rotator'); let wi = 0;
  if (!reduceMotion) setInterval(() => {
    rot.classList.add('out');
    setTimeout(() => { wi = (wi + 1) % words.length; rot.textContent = words[wi]; rot.classList.remove('out'); }, 300);
  }, 2200);

  /* ---------- hero: counters ---------- */
  function countUp(el) {
    const to = +el.dataset.to, suf = el.dataset.suffix || '', dur = reduceMotion ? 0 : 1600, t0 = performance.now();
    const step = (t) => {
      const k = dur ? Math.min(1, (t - t0) / dur) : 1;
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  $$('.count').forEach((el) => whenVisible(el, () => countUp(el), 0.6));

  /* ---------- hero: Octocat drawn as a contribution graph ---------- */
  const octo = $('#octoGrid');
  const cells = [];
  window.OCTO.forEach((row, r) => [...row].forEach((ch, c) => {
    const i = document.createElement('i');
    const lvl = ch === '#' ? 2 + Math.floor(Math.random() * 3) : ch === '+' ? 1 : 0;
    i.dataset.l = lvl;
    const d = Math.hypot(r - 10, c - 10);
    i.style.transitionDelay = `${d * 0.045}s, 0s`;
    octo.appendChild(i);
    if (ch === '#') cells.push(i);
  }));
  requestAnimationFrame(() => setTimeout(() => octo.classList.add('on'), 150));
  if (!reduceMotion) setInterval(() => {
    for (let k = 0; k < 6; k++) { const c = cells[Math.floor(Math.random() * cells.length)]; c.dataset.l = 2 + Math.floor(Math.random() * 3); }
  }, 700);

  /* ---------- basics: push / pull / clone animation ---------- */
  const markPath = (window.OCT['mark-github'].match(/d="([^"]+)"/) || [])[1] || '';
  $('.cloud-mark').setAttribute('d', markPath);
  const syncPath = $('#syncPath'), packets = $('#packets'), caption = $('#syncCaption');
  const captions = {
    push: '<code>git push</code> uploads the commits you saved on your computer to GitHub.',
    pull: '<code>git pull</code> downloads your teammates\' new commits from GitHub to your computer.',
    clone: '<code>git clone</code> copies a whole project from GitHub onto your computer, with its full history.',
  };
  const colors = { push: '#f0883e', pull: '#3fb950', clone: '#4493f8' };
  let syncMode = 'push';
  const dots = [];
  for (let k = 0; k < 4; k++) {
    const g = document.createElementNS(svgNS, 'g');
    g.innerHTML = '<rect x="-11" y="-11" width="22" height="22" rx="6"/><circle r="4" fill="#0d1117"/>';
    packets.appendChild(g); dots.push(g);
  }
  const L = syncPath.getTotalLength();
  let t0 = performance.now();
  function animatePackets(t) {
    const n = syncMode === 'clone' ? 4 : 3;
    dots.forEach((g, k) => {
      g.style.display = k < n ? '' : 'none';
      let p = (((t - t0) / 2400) + k / n) % 1;
      if (syncMode !== 'push') p = 1 - p;
      const pt = syncPath.getPointAtLength(p * L);
      const fade = Math.min(1, Math.min(p, 1 - p) * 8);
      g.setAttribute('transform', `translate(${pt.x} ${pt.y}) scale(${syncMode === 'clone' ? 1.15 : 1})`);
      g.style.opacity = fade;
      g.querySelector('rect').setAttribute('fill', colors[syncMode]);
    });
    if (!reduceMotion) requestAnimationFrame(animatePackets);
  }
  requestAnimationFrame(animatePackets);
  $$('.seg-btn').forEach((b) => b.addEventListener('click', () => {
    syncMode = b.dataset.mode; t0 = performance.now();
    $$('.seg-btn').forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
    syncPath.classList.toggle('rev', syncMode !== 'push');
    caption.style.opacity = 0;
    setTimeout(() => { caption.innerHTML = captions[syncMode]; caption.style.opacity = 1; }, 180);
    if (reduceMotion) requestAnimationFrame(animatePackets);
  }));

  /* ---------- key terms: flip cards ---------- */
  const terms = [
    ['repo', 'Repository', 'var(--blue)', 'A project folder that remembers its whole history: every file and every change.', 'Like a shared Google Drive folder for your group project, with a time machine.'],
    ['git-commit', 'Commit', 'var(--purple)', 'A save point. It records what changed, who changed it and a short note about why.', '"Fixed spelling on the home page" is a typical commit message.'],
    ['git-branch', 'Branch', 'var(--green)', 'A separate line of development within a repository, so you can experiment safely.', 'Like making a copy of an essay to try a new ending without touching the original.'],
    ['git-pull-request', 'Pull request', 'var(--orange)', 'A formal request to review and merge proposed changes into the main project.', '"Here is my new search bar. Can someone check it before we add it?"'],
    ['git-merge', 'Merge', 'var(--pink)', 'Joining approved changes from a branch into the main project.', 'Your edited copy of the essay becomes the official version.'],
    ['issue-opened', 'Issue', 'var(--yellow)', 'A record used to report a bug or propose an improvement, which can be assigned to someone.', '"The login button does nothing on mobile" is an issue.'],
  ];
  const cardsEl = $('#termCards');
  cardsEl.innerHTML = terms.map(([ic, name, c, def, eg], i) => `
    <div class="card reveal" style="--c:${c};--d:${i * 0.07}s">
      <button aria-pressed="false" aria-label="${name}: show definition">
        <span class="face front"><span class="f-ic">${icon(ic)}</span><span><span class="ttl">${name}</span><span class="hint">${icon('sync')} Tap to flip</span></span></span>
        <span class="face back"><span class="ttl">${name}</span><span class="def">${def}</span><span class="eg">Example: ${eg}</span></span>
      </button>
    </div>`).join('');
  $$('.card', cardsEl).forEach((card) => {
    revObs.observe(card);
    const btn = $('button', card), name = $('.ttl', card).textContent;
    btn.addEventListener('click', () => {
      const f = card.classList.toggle('flipped');
      btn.setAttribute('aria-pressed', f);
      btn.setAttribute('aria-label', `${name}: ${f ? 'show name' : 'show definition'}`);
    });
  });

  /* ---------- branch playground ---------- */
  const G = { svg: $('#graph'), wrap: $('#graphWrap'), term: $('#termOut'), sel: $('#pgSwitch') };
  const laneColor = ['#3fb950', '#4493f8', '#f778ba'];
  const branchNames = ['search-bar', 'dark-mode', 'login-page', 'fix-typo', 'new-logo'];
  const msgs = {
    main: ['Update README', 'Fix footer link', 'Add contact page', 'Tidy styles'],
    branch: ['Add search input', 'Style search bar', 'Handle empty search', 'Add tests', 'Polish design'],
  };
  let st, lastNew;
  const hash = () => Math.random().toString(16).slice(2, 9).padEnd(7, '0');
  function pgInit(silent) {
    st = { commits: [], branches: {}, current: 'main', order: ['main'], nameIdx: 0, msgIdx: { main: 0, branch: 0 }, done: new Set() };
    const c0 = { id: hash(), lane: 0, branch: 'main', parents: [], msg: 'Initial commit', i: 0 };
    st.commits.push(c0);
    st.branches.main = { lane: 0, head: c0.id, own: 0, color: laneColor[0] };
    lastNew = new Set([c0.id]);
    G.term.innerHTML = '';
    termLine('<span class="o"># A new repository with one commit on main</span>');
    $$('#challenge li').forEach((li) => li.classList.remove('done'));
    $('#win').hidden = true;
    renderGraph(); syncSelect();
    if (!silent) toast('Playground reset');
  }
  function termLine(html) {
    const s = document.createElement('span'); s.className = 'line'; s.innerHTML = html;
    G.term.appendChild(s); G.term.scrollTop = G.term.scrollHeight;
  }
  const cmd = (c) => termLine(`<span class="p">$</span> ${c}`);
  const byId = (id) => st.commits.find((c) => c.id === id);
  function nextMsg(kind) { const list = msgs[kind]; return list[st.msgIdx[kind]++ % list.length]; }

  function pgCommit() {
    const b = st.branches[st.current];
    const msg = nextMsg(st.current === 'main' ? 'main' : 'branch');
    const c = { id: hash(), lane: b.lane, branch: st.current, parents: [b.head], msg, i: st.commits.length };
    st.commits.push(c); b.head = c.id; if (st.current !== 'main') b.own++;
    lastNew = new Set([c.id]);
    cmd(`git commit -m <span class="s">"${msg}"</span>`);
    termLine(`<span class="o">[${st.current} ${c.id}] ${msg}</span>`);
    renderGraph(); checkChallenge();
  }
  function pgBranch() {
    const used = new Set(Object.values(st.branches).filter((b) => !b.merged).map((b) => b.lane));
    const lane = [1, 2].find((l) => !used.has(l));
    if (!lane) { toast('Two branches at once is plenty here. Merge one first.'); return; }
    const name = branchNames[st.nameIdx++ % branchNames.length];
    st.branches[name] = { lane, head: st.branches[st.current].head, own: 0, color: laneColor[lane] };
    st.order.push(name); st.current = name; lastNew = new Set();
    cmd(`git switch -c ${name}`);
    termLine(`<span class="o">Switched to a new branch '${name}'</span>`);
    st.done.add('branch'); renderGraph(); syncSelect(); checkChallenge();
  }
  function pgSwitch(name) {
    if (name === st.current) return;
    st.current = name; lastNew = new Set();
    cmd(`git switch ${name}`); termLine(`<span class="o">Switched to branch '${name}'</span>`);
    renderGraph(); syncSelect();
  }
  function pgMerge() {
    if (st.current === 'main') {
      const open = st.order.filter((n) => n !== 'main' && !st.branches[n].merged && st.branches[n].own > 0);
      if (!open.length) { toast('Create a branch and commit on it first.'); return; }
      toast(`Switch to "${open[0]}" first, then merge it.`); return;
    }
    const b = st.branches[st.current];
    if (b.own === 0) { toast('Nothing to merge yet. Make a commit on this branch first.'); return; }
    const name = st.current, main = st.branches.main;
    const c = { id: hash(), lane: 0, branch: 'main', parents: [main.head, b.head], msg: `Merge ${name}`, i: st.commits.length, merge: name };
    st.commits.push(c); main.head = c.id;
    const ownCommits = b.own;
    b.merged = true; b.own = 0; st.current = 'main'; lastNew = new Set([c.id]);
    cmd('git switch main'); cmd(`git merge ${name}`);
    termLine('<span class="o">Merge made by the \'ort\' strategy.</span>');
    if (ownCommits >= 2 && st.done.has('commits')) st.done.add('merge');
    renderGraph(); syncSelect(); checkChallenge();
  }
  function syncSelect() {
    const live = st.order.filter((n) => n === 'main' || !st.branches[n].merged);
    G.sel.innerHTML = live.map((n) => `<option value="${n}" ${n === st.current ? 'selected' : ''}>${n}</option>`).join('');
  }
  function checkChallenge() {
    if (Object.values(st.branches).some((b) => b.own >= 2)) st.done.add('commits');
    $$('#challenge li').forEach((li) => li.classList.toggle('done', st.done.has(li.dataset.step)));
    if (st.done.has('branch') && st.done.has('commits') && st.done.has('merge') && $('#win').hidden) {
      $('#win').hidden = false; confetti(); toast('Challenge complete!');
    }
  }
  function renderGraph() {
    const X0 = 130, DX = 84, laneY = (l) => 48 + l * 72;
    const n = st.commits.length;
    const width = Math.max(G.wrap.clientWidth - 20, X0 + n * DX + 60);
    G.svg.setAttribute('width', width); G.svg.setAttribute('viewBox', `0 0 ${width} 240`);
    const pos = (c) => [X0 + c.i * DX, laneY(c.lane)];
    let out = '';
    // lane labels
    st.order.forEach((name) => {
      const b = st.branches[name];
      if (b.merged && name !== 'main') return;
      const y = laneY(b.lane);
      out += `<line x1="0" x2="${width}" y1="${y}" y2="${y}" stroke="${b.color}" stroke-opacity=".08" stroke-width="22"/>`;
      out += `<text class="lane-label" x="14" y="${y + 4}" fill="${b.color}">${name}</text>`;
    });
    // edges
    st.commits.forEach((c) => c.parents.forEach((pid, k) => {
      const p = byId(pid); const [x1, y1] = pos(p); const [x2, y2] = pos(c);
      const color = k === 1 ? st.branches[c.merge].color : laneColor[c.lane];
      const d = y1 === y2 ? `M${x1} ${y1} L${x2} ${y2}` : `M${x1} ${y1} C${x1 + DX * 0.6} ${y1}, ${x2 - DX * 0.6} ${y2}, ${x2} ${y2}`;
      const isNew = lastNew.has(c.id);
      out += `<path class="edge${isNew ? '' : ' static'}" d="${d}" stroke="${color}" pathLength="100" style="--len:100${isNew ? '' : ';animation:none;stroke-dasharray:none'}"/>`;
    }));
    // nodes
    st.commits.forEach((c) => {
      const [x, y] = pos(c);
      const color = laneColor[c.lane];
      const label = c.msg.length > 13 ? c.msg.slice(0, 12) + '…' : c.msg;
      out += `<g class="node${lastNew.has(c.id) ? ' new' : ''}"><circle cx="${x}" cy="${y}" r="11" fill="${c.merge ? color : '#0d1117'}" stroke="${color}" stroke-width="4"><title>${c.id}: ${c.msg}</title></circle></g>`;
      out += `<text class="msg" x="${x}" y="${y + 30}" text-anchor="middle">${label}</text>`;
    });
    // HEAD
    const head = byId(st.branches[st.current].head); const [hx, hy] = pos(head);
    out += `<circle class="head-ring" cx="${hx}" cy="${hy}" r="18" stroke="#d29922"/>`;
    out += `<g><rect x="${hx - 34}" y="${hy - 44}" width="68" height="20" rx="10" fill="#d29922"/><text x="${hx}" y="${hy - 30}" text-anchor="middle" style="font:700 11px var(--mono)" fill="#0d1117">HEAD</text></g>`;
    G.svg.innerHTML = out;
    G.wrap.scrollLeft = G.wrap.scrollWidth;
  }
  $('#pgCommit').addEventListener('click', pgCommit);
  $('#pgBranch').addEventListener('click', pgBranch);
  $('#pgMerge').addEventListener('click', pgMerge);
  $('#pgReset').addEventListener('click', () => pgInit(false));
  G.sel.addEventListener('change', (e) => pgSwitch(e.target.value));
  window.addEventListener('resize', () => renderGraph());
  pgInit(true);

  /* ---------- pull request journey ---------- */
  const steps = [
    ['git-branch', 'Branch', 'Start a branch', 'Alaa wants to add a search bar. She creates a branch called search-bar, a safe copy where she can work without touching the live project.'],
    ['git-commit', 'Commit', 'Save the work', 'She makes her changes and saves them as commits. Each commit has a short message describing what changed.'],
    ['git-pull-request', 'Open PR', 'Open a pull request', 'When she is ready, she opens a pull request: a formal request asking the team to review her changes and add them to main.'],
    ['comment-discussion', 'Review', 'Teammates review', 'Bshwan reads the changes line by line, leaves a comment and approves. Every discussion is saved next to the code.'],
    ['check-circle', 'Checks', 'Automatic checks', 'GitHub Actions runs the tests automatically. A green tick means nothing is broken.'],
    ['git-merge', 'Merge', 'Merge into main', 'With approval and passing checks, the pull request is merged. The search bar is now part of the main project.'],
  ];
  const stepsEl = $('#steps'), prCard = $('#prCard'), prState = $('#prState'), mergeBtn = $('#mergeBtn');
  stepsEl.innerHTML = steps.map(([ic, short], i) => `<li><button role="tab" aria-selected="false" aria-controls="prCard" data-i="${i}"><span class="s-dot">${icon(ic)}</span><span class="lbl-txt">${short}</span></button></li>`).join('');
  let stepI = -1, playTimer = null, checkTimer = null;
  function setStep(i) {
    stepI = Math.max(0, Math.min(steps.length - 1, i));
    $$('button', stepsEl).forEach((b, k) => { b.setAttribute('aria-selected', k === stepI); b.classList.toggle('past', k < stepI); b.tabIndex = k === stepI ? 0 : -1; });
    stepsEl.style.setProperty('--p', stepI / (steps.length - 1));
    const [, , title, text] = steps[stepI];
    const t = $('#stepTitle'), p = $('#stepText');
    t.textContent = title; p.textContent = text;
    [t, p].forEach((el) => { el.classList.remove('fade-swap'); void el.offsetWidth; el.classList.add('fade-swap'); });
    $$('.pr-item', prCard).forEach((it) => it.classList.toggle('show', stepI >= +it.dataset.at));
    $('#prCommits').textContent = stepI >= 1 ? 2 : 0;
    prState.className = 'pr-state' + (stepI >= 5 ? ' merged' : stepI >= 2 ? ' open' : '');
    prState.innerHTML = stepI >= 5 ? `${icon('git-merge')} Merged` : stepI >= 2 ? `${icon('git-pull-request')} Open` : `${icon('git-branch')} Draft`;
    prCard.classList.toggle('merged', stepI >= 5);
    const check = $('.pr-item.check', prCard);
    clearTimeout(checkTimer);
    check.classList.remove('passed'); $('.check-txt', check).textContent = 'Running tests…';
    mergeBtn.className = 'merge-btn'; mergeBtn.disabled = true; $('span', mergeBtn).textContent = 'Merge pull request';
    if (stepI === 4) {
      checkTimer = setTimeout(() => { check.classList.add('passed'); $('.check-txt', check).textContent = 'All checks have passed'; mergeBtn.classList.add('ready'); mergeBtn.disabled = false; }, reduceMotion ? 0 : 1300);
    } else if (stepI > 4) {
      check.classList.add('passed'); $('.check-txt', check).textContent = 'All checks have passed';
      mergeBtn.classList.add('done'); $('span', mergeBtn).textContent = 'Merged';
    }
  }
  stepsEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { stopPlay(); setStep(+b.dataset.i); } });
  stepsEl.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault(); stopPlay(); setStep(stepI + (e.key === 'ArrowRight' ? 1 : -1)); $$('button', stepsEl)[stepI].focus();
  });
  $('#nextStep').addEventListener('click', () => { stopPlay(); setStep(stepI + 1); });
  $('#prevStep').addEventListener('click', () => { stopPlay(); setStep(stepI - 1); });
  mergeBtn.addEventListener('click', () => { stopPlay(); setStep(5); confetti(30); });
  const playBtn = $('#playSteps');
  function stopPlay() { clearInterval(playTimer); playTimer = null; playBtn.innerHTML = `${icon('play')} <span>Play</span>`; }
  playBtn.addEventListener('click', () => {
    if (playTimer) { stopPlay(); return; }
    if (stepI >= steps.length - 1) setStep(0);
    playBtn.innerHTML = `${icon('stop')} <span>Pause</span>`;
    playTimer = setInterval(() => { if (stepI >= steps.length - 1) { stopPlay(); return; } setStep(stepI + 1); }, 3200);
  });
  setStep(0);
  whenVisible($('#flow'), () => { if (!reduceMotion && !playTimer) playBtn.click(); }, 0.45);

  /* ---------- features: tabs ---------- */
  const tabs = $$('#featTabs [role="tab"]');
  const onShow = {};
  function selectTab(tab, focus) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    const key = tab.id.replace('tab-', ''); if (onShow[key]) onShow[key]();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); selectTab(tabs[(i + k + tabs.length) % tabs.length], true); }
      if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0], true); }
      if (e.key === 'End') { e.preventDefault(); selectTab(tabs[tabs.length - 1], true); }
    });
  });
  const panelVisible = (id) => !$('#' + id).hidden;

  // Issues & Projects: a board that keeps moving
  const kanban = $('#kanban');
  const kcols = $$('.col', kanban);
  const startCards = [
    [0, 'Search ignores capital letters', 'bug'], [0, 'Add dark mode', 'idea'], [0, 'Write install guide', 'docs'],
    [1, 'Build login page', 'idea'], [2, 'Fix typo on About page', 'docs'],
  ];
  function kcard(text, lbl, closed) {
    const d = document.createElement('div'); d.className = 'kcard' + (closed ? ' closed' : '');
    d.innerHTML = `<span class="kt">${icon(closed ? 'issue-closed' : 'issue-opened')}<span>${text}</span></span><span class="lbl ${lbl}">${lbl}</span>`;
    d.dataset.text = text; d.dataset.lbl = lbl; return d;
  }
  function kanbanReset() { kcols.forEach((c) => $$('.kcard', c).forEach((x) => x.remove())); startCards.forEach(([col, t, l]) => kcols[col].appendChild(kcard(t, l, col === 2))); }
  kanbanReset();
  setInterval(() => {
    if (reduceMotion || !panelVisible('panel-issues') || document.hidden) return;
    const prog = $('.kcard', kcols[1]), todo = $('.kcard', kcols[0]);
    if (prog) { kcols[2].appendChild(kcard(prog.dataset.text, prog.dataset.lbl, true)); prog.remove(); }
    if (todo) { kcols[1].appendChild(kcard(todo.dataset.text, todo.dataset.lbl, false)); todo.remove(); }
    if (!prog && !todo) kanbanReset();
  }, 2400);

  // Actions: a pipeline that runs step by step
  const pipeSteps = [['Set up job', '2s'], ['Install dependencies', '18s'], ['Build', '42s'], ['Run tests', '1m 05s'], ['Deploy', '31s']];
  let runNo = 127, running = false;
  const pipeEl = $('#pipeline');
  function pipeReset() { pipeEl.innerHTML = pipeSteps.map(([n]) => `<li><span class="st"></span>${n}<span class="t"></span></li>`).join(''); }
  async function runPipeline() {
    if (running) return; running = true;
    $('#runNo').textContent = `run #${++runNo}`; pipeReset();
    const lis = $$('li', pipeEl);
    for (let k = 0; k < lis.length; k++) {
      lis[k].classList.add('running'); await sleep(650);
      lis[k].classList.replace('running', 'ok'); $('.t', lis[k]).textContent = pipeSteps[k][1];
    }
    const s = document.createElement('li'); s.className = 'summary'; s.innerHTML = `${icon('check-circle-fill')} All jobs passed in 2m 38s`;
    pipeEl.appendChild(s); running = false;
  }
  pipeReset();
  $('#runWorkflow').addEventListener('click', runPipeline);
  onShow.actions = () => { if (!running && !$('.summary', pipeEl)) runPipeline(); };

  // Pages: deploy a site
  const brBody = $('#brBody'), deployBtn = $('#deployBtn');
  let deploying = false;
  deployBtn.addEventListener('click', async () => {
    if (deploying) return; deploying = true;
    brBody.innerHTML = '<div style="width:100%;display:grid;place-items:center;gap:12px"><p class="muted">Building and deploying…</p><div class="deploy-bar"><span></span></div></div>';
    await sleep(60); $('.deploy-bar span', brBody).style.width = '100%';
    await sleep(1700);
    $('#urlText').textContent = 'alaa-shvan.github.io';
    brBody.innerHTML = `<div class="site"><div class="site-nav"><span>Alaa.</span><i><b></b><b></b><b></b></i></div><div class="site-hero"><div><h5>Hi, I build <span>websites</span>.</h5><p>IT student at Qaiwan International University. Here are my projects.</p></div><div class="ph"></div></div></div>`;
    deployBtn.innerHTML = `${icon('sync')} Deploy again`; deploying = false; toast('Your site is live!');
  });

  // Codespaces: an editor that types itself
  const csLines = [
    ['<span class="c">&lt;!-- edited right in the browser --&gt;</span>'],
    ['<span class="t">&lt;h1&gt;</span>Hello, Bshwan!<span class="t">&lt;/h1&gt;</span>'],
    ['<span class="t">&lt;p&gt;</span>No installs needed.<span class="t">&lt;/p&gt;</span>'],
    ['<span class="t">&lt;button</span> <span class="f">class</span>=<span class="s">"cta"</span><span class="t">&gt;</span>Start<span class="t">&lt;/button&gt;</span>'],
  ];
  let csRun = 0;
  async function typeCodespace() {
    const me = ++csRun, el = $('#csCode'); el.innerHTML = '';
    for (let k = 0; k < csLines.length; k++) {
      const tmp = document.createElement('div'); tmp.innerHTML = csLines[k][0];
      const plain = tmp.textContent; let shown = '';
      const line = document.createElement('div'); el.appendChild(line);
      for (let j = 0; j <= plain.length; j++) {
        if (me !== csRun) return;
        shown = plain.slice(0, j);
        line.innerHTML = `<span class="ln">${k + 1}</span>${j === plain.length ? csLines[k][0] : shown.replace(/</g, '&lt;')}<span class="caret"></span>`;
        await sleep(28);
      }
      line.querySelector('.caret')?.remove();
    }
    el.lastChild.insertAdjacentHTML('beforeend', '<span class="caret"></span>');
  }
  onShow.codespaces = typeCodespace;

  // Security: Dependabot fixes a library
  const fixBtn = $('#fixBtn'), alertEl = $('#alert'), fixPr = $('#fixPr');
  fixBtn.addEventListener('click', async () => {
    if (alertEl.classList.contains('fixed')) {
      alertEl.classList.remove('fixed'); fixPr.hidden = true;
      $('#alertTitle').textContent = '1 vulnerable library found'; $('#alertText').textContent = 'image-tools 2.1.0 has a known security issue';
      alertEl.querySelector('.oct').outerHTML = icon('alert', 'al-ic'); fixBtn.innerHTML = `${icon('dependabot')} Let Dependabot fix it`; return;
    }
    fixPr.hidden = false; paintIcons(fixPr);
    await sleep(900);
    alertEl.classList.add('fixed'); $('#alertTitle').textContent = 'No vulnerable libraries'; $('#alertText').textContent = 'image-tools updated to 2.1.4';
    alertEl.querySelector('.oct').outerHTML = icon('shield-check', 'al-ic');
    fixBtn.innerHTML = `${icon('sync')} Reset demo`;
  });

  /* ---------- copilot ---------- */
  const cpTabs = $$('#cpTabs [role="tab"]');
  function selectCp(tab, focus) {
    cpTabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }
  cpTabs.forEach((t, i) => {
    t.addEventListener('click', () => selectCp(t));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (k) { e.preventDefault(); selectCp(cpTabs[(i + k + cpTabs.length) % cpTabs.length], true); }
    });
  });

  // Suggest: accept the grey suggestion
  const ghost = $('#ghost'), acceptBtn = $('#acceptBtn');
  acceptBtn.addEventListener('click', () => {
    if (ghost.classList.contains('accepted')) { ghost.classList.remove('accepted'); acceptBtn.innerHTML = '<kbd>Tab</kbd> Accept suggestion'; return; }
    ghost.classList.add('accepted'); acceptBtn.innerHTML = `${icon('sync')} Try again`; toast('Suggestion accepted. Always read it before you use it!');
  });

  // Chat: pick a question, Copilot streams an answer
  const chatLog = $('#chatLog'), chips = $$('#cpp-chat .chip');
  const chatSr = document.createElement('p'); chatSr.className = 'sr-only'; chatSr.setAttribute('aria-live', 'polite');
  chatLog.after(chatSr);
  const answers = {
    explain: ['It adds up every grade with <code>reduce</code>, starting from 0, then divides the total by how many grades there are. The result is the average.'],
    bug: ['If the list is empty, <code>grades.length</code> is 0, so it divides by zero and returns <code>NaN</code>. Check for an empty list first:',
      '<span class="k">if</span> (grades.length === <span class="s">0</span>) <span class="k">return</span> <span class="s">0</span>;'],
    test: ['Here is a quick check you can run. It should print nothing if the function works:',
      '<span class="f">console</span>.assert(<span class="f">average</span>([<span class="s">80</span>, <span class="s">90</span>, <span class="s">100</span>]) === <span class="s">90</span>);'],
  };
  const bubble = (who, html) => {
    const d = document.createElement('div'); d.className = `bubble ${who}`;
    d.innerHTML = who === 'bot' ? `<span class="who">${icon('copilot')}</span><div class="b-body">${html}</div>` : `<div class="b-body">${html}</div>`;
    chatLog.appendChild(d); chatLog.scrollTop = chatLog.scrollHeight; return $('.b-body', d);
  };
  async function ask(chip) {
    const [text, code] = answers[chip.dataset.q];
    chips.forEach((c) => { c.disabled = true; });
    bubble('me', chip.textContent);
    await sleep(350);
    const body = bubble('bot', '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>');
    await sleep(900);
    const tmp = document.createElement('div'); tmp.innerHTML = text;
    const words = tmp.textContent.split(' ');
    for (let k = 1; k <= words.length && !reduceMotion; k++) { body.textContent = words.slice(0, k).join(' '); chatLog.scrollTop = chatLog.scrollHeight; await sleep(38); }
    body.innerHTML = text + (code ? `<pre class="code">${code}</pre>` : '');
    chatLog.scrollTop = chatLog.scrollHeight;
    chatSr.textContent = 'Copilot: ' + body.textContent;
    chips.forEach((c) => { c.disabled = false; });
  }
  chips.forEach((c) => c.addEventListener('click', () => ask(c)));

  // Agent: assign an issue, watch it work, get a pull request
  const agentSteps = [['Reading the repository', '8s'], ['Planning a fix', '12s'], ['Editing grades.js', '21s'], ['Running tests', '34s']];
  const agentEl = $('#agentSteps'), assignBtn = $('#assignBtn'), agentPr = $('#agentPr'), assignee = $('#assignee');
  let agentBusy = false;
  assignBtn.addEventListener('click', async () => {
    if (agentBusy) return;
    if (!agentPr.hidden) {
      agentPr.hidden = true; assignee.hidden = true; agentEl.innerHTML = '';
      assignBtn.innerHTML = `${icon('copilot')} Assign to Copilot`; return;
    }
    agentBusy = true; assignBtn.disabled = true; assignee.hidden = false;
    agentEl.innerHTML = agentSteps.map(([n]) => `<li><span class="st"></span>${n}<span class="t"></span></li>`).join('');
    const lis = $$('li', agentEl);
    for (let k = 0; k < lis.length; k++) {
      lis[k].classList.add('running'); await sleep(750);
      lis[k].classList.replace('running', 'ok'); $('.t', lis[k]).textContent = agentSteps[k][1];
    }
    agentPr.hidden = false;
    assignBtn.disabled = false; agentBusy = false;
    assignBtn.innerHTML = `${icon('sync')} Reset demo`;
    toast('Copilot opened a pull request. A person still reviews it before merging.');
  });

  /* ---------- contribution graph ---------- */
  const cGrid = $('#cGrid'), WEEKS = 52;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const perLevel = [0, 1, 4, 7, 11];
  const cCells = [];
  for (let k = 0; k < WEEKS * 7; k++) {
    const i = document.createElement('i'); i.dataset.l = 0; i.dataset.k = k;
    i.title = `Week ${Math.floor(k / 7) + 1}, ${days[k % 7]}`;
    cGrid.appendChild(i); cCells.push(i);
  }
  function cStats() {
    let total = 0, best = 0, run = 0;
    cCells.forEach((c) => { const l = +c.dataset.l; total += perLevel[l]; run = l ? run + 1 : 0; best = Math.max(best, run); });
    $('#cTotal').textContent = total; $('#cStreak').textContent = best;
  }
  let painting = false, paintLevel = 1;
  function paint(cell) { if (cell && cell.dataset.k !== undefined) { cell.dataset.l = paintLevel; cStats(); } }
  cGrid.addEventListener('pointerdown', (e) => {
    const cell = e.target.closest('i'); if (!cell) return;
    painting = true; paintLevel = (+cell.dataset.l + 1) % 5; paint(cell);
    cGrid.setPointerCapture?.(e.pointerId);
  });
  cGrid.addEventListener('pointermove', (e) => { if (!painting) return; paint(document.elementFromPoint(e.clientX, e.clientY)?.closest('#cGrid i')); });
  window.addEventListener('pointerup', () => { painting = false; });
  function fillYear(randomise) {
    cCells.forEach((c, k) => {
      const wk = Math.floor(k / 7), dow = k % 7, weekend = dow === 0 || dow === 6;
      const busy = 0.35 + 0.55 * Math.sin(wk / 5.5) ** 2;
      const r = Math.random();
      const lvl = !randomise ? 0 : r < (weekend ? 0.6 : 0.22) ? 0 : Math.min(4, 1 + Math.floor(r * busy * 5));
      setTimeout(() => { c.dataset.l = lvl; if (k === cCells.length - 1) cStats(); }, reduceMotion ? 0 : wk * 12);
    });
  }
  $('#cRandom').addEventListener('click', () => fillYear(true));
  $('#cClear').addEventListener('click', () => fillYear(false));
  whenVisible(cGrid, () => fillYear(true), 0.4);

  /* ---------- confetti ---------- */
  function confetti(n = 70) {
    if (reduceMotion) return;
    const cols = ['#3fb950', '#4493f8', '#ab7df8', '#f778ba', '#d29922', '#39d353'];
    for (let k = 0; k < n; k++) {
      const p = document.createElement('i'); p.className = 'confetti';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = cols[k % cols.length];
      p.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
      p.style.animationDelay = Math.random() * 0.4 + 's';
      p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 4200);
    }
  }
})();
