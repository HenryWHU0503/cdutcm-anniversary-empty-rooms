/* 会场空余情况查询 —— 筛选与渲染
   交互约定：每组筛选项独立多选；某组不选任何项＝该组「全部」。
   手机端：筛选项收进底部抽屉；色块点按弹出详情；矩阵改为单日聚焦，免横向滚动。 */
(function () {
  var D = window.VENUE_DATA;
  var V = D.venues;
  var DAYS = [24, 25, 26, 27, 28, 29, 30, 31];
  var HALVES = ['上午', '下午'];
  var CATS = ['图书馆研修室', '单位会场', '教室'];
  var STATUS = ['空闲', '已借用'];
  var CAMPUS = ['温江校区', '十二桥校区', '彭州校区'];
  var TOTAL_CELLS = V.length * 16;

  var state = { days: new Set(), halves: new Set(), cats: new Set(), status: new Set(), campus: new Set(), q: '' };
  var subs = [];
  var slotIndex = function (di, hi) { return di * 2 + hi; };
  var statusAt = function (v, di, hi) { return v.s.charAt(slotIndex(di, hi)) === 'F' ? '空闲' : '已借用'; };
  var pick = function (set, val) { return set.size === 0 || set.has(val); };

  var mq = window.matchMedia('(max-width: 820px)');
  var isMobile = function () { return mq.matches; };
  var mDay = 0; /* 手机端矩阵当前聚焦的日期下标 */

  function venuePass(v) {
    return pick(state.cats, v.cat) && pick(state.campus, v.campus) &&
      (!state.q || v.name.toLowerCase().indexOf(state.q) >= 0);
  }
  function cellMatch(v, di, hi) {
    return pick(state.days, DAYS[di]) && pick(state.halves, HALVES[hi]) && pick(state.status, statusAt(v, di, hi));
  }

  function compute() {
    var r = { venueHits: 0, cellHits: 0, freeHits: 0, occHits: 0 };
    V.forEach(function (v) {
      var ok = venuePass(v), local = 0;
      for (var di = 0; di < 8; di++) for (var hi = 0; hi < 2; hi++) {
        if (!cellMatch(v, di, hi)) continue;
        local++;
        if (!ok) continue;
        r.cellHits++;
        if (statusAt(v, di, hi) === '空闲') r.freeHits++; else r.occHits++;
      }
      v._hit = ok && local > 0;
      if (v._hit) r.venueHits++;
    });
    return r;
  }

  /* ---------------- 筛选器 ---------------- */
  var GROUPS = [
    { row: 'row-day', key: 'days', label: '日期', kind: 'day', vals: DAYS, txt: function (d) { return d + '日'; } },
    { row: 'row-attr', key: 'halves', label: '时段', kind: 'half', vals: HALVES, txt: function (h) { return h; } },
    { row: 'row-attr', key: 'cats', label: '场地类型', kind: 'cat', vals: CATS, txt: function (c) { return c; } },
    { row: 'row-attr', key: 'status', label: '借用状态', kind: 'status', vals: STATUS, txt: function (s) { return s; } },
    { row: 'row-more', key: 'campus', label: '所在校区', kind: 'campus', vals: CAMPUS, txt: function (c) { return c.replace('校区', ''); } }
  ];
  var searchInput = null;
  var allChips = {};

  function syncGroup(g) {
    var s = state[g.key];
    allChips[g.key].forEach(function (pair) {
      var on = pair.val === null ? s.size === 0 : s.has(pair.val);
      pair.el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function syncAll() { GROUPS.forEach(syncGroup); }

  function buildFilters() {
    GROUPS.forEach(function (g) {
      var host = document.getElementById(g.row);
      var lab = document.createElement('span');
      lab.className = 'flabel'; lab.textContent = g.label;
      host.appendChild(lab);

      allChips[g.key] = [];

      var allBtn = document.createElement('button');
      allBtn.type = 'button'; allBtn.className = 'chip chip-all';
      allBtn.textContent = '全部';
      allBtn.addEventListener('click', function () {
        state[g.key].clear(); syncGroup(g); run();
      });
      host.appendChild(allBtn);
      allChips[g.key].push({ val: null, el: allBtn });

      g.vals.forEach(function (val) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'chip';
        b.dataset.kind = g.kind; b.dataset.val = String(val);
        b.textContent = g.txt(val);
        b.addEventListener('click', function () {
          var s = state[g.key];
          if (s.has(val)) s.delete(val); else s.add(val);
          syncGroup(g); run();
        });
        host.appendChild(b);
        allChips[g.key].push({ val: val, el: b });
      });
      syncGroup(g);
    });

    var more = document.getElementById('row-more');
    var sp = document.createElement('span'); sp.className = 'spacer'; more.appendChild(sp);

    searchInput = document.createElement('input');
    searchInput.type = 'search'; searchInput.className = 'search';
    searchInput.placeholder = '搜索场地名称…';
    searchInput.setAttribute('aria-label', '搜索场地名称');
    searchInput.addEventListener('input', function () {
      state.q = searchInput.value.trim().toLowerCase(); run();
    });
    more.appendChild(searchInput);

    var rst = document.createElement('button');
    rst.type = 'button'; rst.className = 'reset'; rst.textContent = '清除全部筛选';
    rst.addEventListener('click', resetAll);
    more.appendChild(rst);
  }

  function resetAll() {
    state.days.clear(); state.halves.clear(); state.cats.clear();
    state.status.clear(); state.campus.clear();
    state.q = '';
    if (searchInput) searchInput.value = '';
    syncAll(); run();
  }

  /* ---------------- 手机端抽屉 ---------------- */
  function bindDrawer() {
    var bar = document.querySelector('.filterbar');
    var toggle = document.getElementById('ftoggle');
    var done = document.getElementById('fdone');
    var back = document.getElementById('fback');
    var reset = document.getElementById('freset');
    if (!bar || !toggle) return;

    function open(state) {
      document.body.classList.toggle('fopen', state);
      toggle.setAttribute('aria-expanded', state ? 'true' : 'false');
    }
    toggle.addEventListener('click', function () { open(!document.body.classList.contains('fopen')); });
    if (done) done.addEventListener('click', function () { open(false); });
    if (back) back.addEventListener('click', function () { open(false); });
    if (reset) reset.addEventListener('click', resetAll);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') open(false);
    });
  }

  /* 顶部摘要：把当前条件压成一行，收起抽屉后仍能看见选中了什么 */
  function summaryText() {
    var parts = [];
    if (state.days.size) {
      parts.push(Array.from(state.days).sort(function (a, b) { return a - b; })
        .map(function (d) { return d + '日'; }).join('、'));
    }
    if (state.halves.size) parts.push(Array.from(state.halves).join('、'));
    if (state.status.size) parts.push(Array.from(state.status).join('、'));
    if (state.cats.size) parts.push(Array.from(state.cats).join('、'));
    if (state.campus.size) parts.push(Array.from(state.campus).map(function (c) { return c.replace('校区', ''); }).join('、'));
    if (state.q) parts.push('“' + state.q + '”');
    return parts.length ? parts.join(' · ') : '全部场地';
  }
  function updateSummary() {
    var sum = document.getElementById('fsum');
    var cnt = document.getElementById('fcount');
    if (sum) sum.textContent = summaryText();
    if (cnt) {
      var n = 0;
      ['days', 'halves', 'cats', 'status', 'campus'].forEach(function (k) { if (state[k].size) n++; });
      if (state.q) n++;
      cnt.textContent = String(n);
      if (n) cnt.removeAttribute('hidden'); else cnt.setAttribute('hidden', '');
    }
  }

  /* ---------------- 统计卡 ---------------- */
  function statCard(k, v, u, cls, sub) {
    return '<div class="stat ' + cls + '"><div class="k">' + k + '</div>'
      + '<div class="v">' + v + '<span class="u">' + u + '</span></div>'
      + '<div class="d">' + sub + '</div></div>';
  }
  function renderStats(r) {
    document.getElementById('stats').innerHTML = ''
      + statCard('符合条件场地', r.venueHits, '个', '', '共 ' + V.length + ' 个场地')
      + statCard('命中时段', r.cellHits, '格', '', '共 ' + TOTAL_CELLS + ' 格')
      + statCard('其中空闲', r.freeHits, '格', 'free', '可直接借用')
      + statCard('其中已借用', r.occHits, '格', 'occ', '不可借用');
  }

  /* ---------------- 场地卡片 ---------------- */
  function stripHead() {
    return '<div class="striphead">'
      + DAYS.map(function (d) { return '<span>' + d + '</span>'; }).join('')
      + '</div>';
  }

  function renderCards() {
    var host = document.getElementById('cards');
    var list = V.filter(function (v) { return v._hit; });

    if (!list.length) {
      host.innerHTML = '<div class="empty">当前筛选条件下没有符合条件的场地。<br>试着放宽日期、时段、场地类型或借用状态。</div>';
      return;
    }
    host.innerHTML = list.map(function (v) {
      var cells = '', freeN = 0;
      for (var di = 0; di < 8; di++) for (var hi = 0; hi < 2; hi++) {
        var st = statusAt(v, di, hi);
        if (st === '空闲') freeN++;
        var hit = cellMatch(v, di, hi);
        var cls = 'cell ' + (st === '空闲' ? 'free' : 'occ')
          + (hit ? (' on' + (st === '已借用' ? ' sel-occ' : '')) : ' miss');
        cells += '<span class="' + cls + '" data-v="' + v.id + '" data-s="' + slotIndex(di, hi) + '">'
          + (hi === 0 ? '上' : '下') + '</span>';
      }
      var mgr = (v.mgr && v.mgr !== '待补充') ? v.mgr : '待补充';
      var tel = (v.tel && v.tel !== '待补充') ? v.tel : '';
      return '<article class="card">'
        + '<div class="card-h"><h3>' + v.name + '</h3><div class="tags">'
        + '<span class="tag cat">' + v.cat + '</span>'
        + '<span class="tag">' + v.campus.replace('校区', '') + '</span></div></div>'
        + '<div class="facts"><span>容量 <b>' + v.capRaw + '</b></span>'
        + '<span>空闲 <b>' + freeN + '</b>/16</span>'
        + '<span>' + (v.layout || '—') + '</span>'
        + (v.dev ? '<span>' + v.dev + '</span>' : '') + '</div>'
        + '<div class="facts"><span>管理人 <b>' + mgr + '</b></span>'
        + (tel ? '<span class="tel"><b>' + tel + '</b></span>' : '') + '</div>'
        + '<div class="strip-wrap">' + stripHead() + '<div class="strip">' + cells + '</div></div>'
        + '<div class="facts avail"><span>可用时间：<b>' + (v.avail || v.win || '无可用时段') + '</b></span></div>'
        + '</article>';
    }).join('');
  }

  /* ---------------- 全景矩阵 ---------------- */
  function buildDayTabs() {
    var host = document.getElementById('mday');
    if (!host) return;
    host.innerHTML = DAYS.map(function (d, i) {
      return '<button type="button" data-d="' + i + '" aria-pressed="' + (i === mDay ? 'true' : 'false') + '">' + d + '日</button>';
    }).join('');
    host.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      mDay = Number(b.dataset.d);
      syncDayTabs(); renderMatrix();
    });
  }
  function syncDayTabs() {
    var host = document.getElementById('mday');
    if (!host) return;
    Array.prototype.forEach.call(host.children, function (b) {
      b.setAttribute('aria-pressed', Number(b.dataset.d) === mDay ? 'true' : 'false');
    });
  }

  function renderMatrix() {
    var mobile = isMobile();
    var rows = V.filter(venuePass);
    var dayIdxs = mobile ? [mDay] : [0, 1, 2, 3, 4, 5, 6, 7];

    var hh = '<thead><tr><th class="lft dupe">场地</th>';
    if (!mobile) hh += '<th class="lft">类型</th><th class="lft">校区</th><th>容量</th>';
    dayIdxs.forEach(function (di) {
      for (var hi = 0; hi < 2; hi++) {
        hh += '<th>' + (mobile ? HALVES[hi] : DAYS[di] + '<br>' + HALVES[hi].charAt(0)) + '</th>';
      }
    });
    hh += '<th>空闲</th></tr></thead>';

    var body = '<tbody>';
    if (!rows.length) body += '<tr><td colspan="' + (mobile ? 4 : 21) + '" class="lft">无匹配场地</td></tr>';
    rows.forEach(function (v) {
      var freeN = 0, hasHit = false, tds = '';
      for (var di = 0; di < 8; di++) for (var hi = 0; hi < 2; hi++) {
        if (statusAt(v, di, hi) === '空闲') freeN++;
      }
      dayIdxs.forEach(function (di) {
        for (var hi = 0; hi < 2; hi++) {
          var st = statusAt(v, di, hi);
          var hit = mobile
            ? (pick(state.halves, HALVES[hi]) && pick(state.status, st))
            : cellMatch(v, di, hi);
          if (hit) hasHit = true;
          tds += '<td class="c ' + (st === '空闲' ? 'free' : 'occ') + (hit ? '' : ' miss') + '">'
            + (st === '空闲' ? '空' : '借') + '</td>';
        }
      });
      body += '<tr' + (hasHit ? '' : ' class="rowmiss"') + '>'
        + '<td class="lft venue dupe">' + v.name
        + '<span class="vsub">' + v.cat + ' · ' + v.campus.replace('校区', '') + ' · 容 ' + v.capRaw + '</span></td>'
        + (mobile ? '' : '<td class="cat">' + v.cat + '</td><td class="cam">' + v.campus.replace('校区', '') + '</td><td class="cap">' + v.capRaw + '</td>')
        + tds + '<td class="tot">' + freeN + '</td></tr>';
    });
    body += '</tbody>';
    document.getElementById('matrix').innerHTML = hh + body;
  }

  /* ---------------- 时段详情 ----------------
     桌面：悬停浮层；所有设备：点按色块在卡片内就地展开，不遮挡页面。 */
  var tip = null;
  var coarse = window.matchMedia('(hover: none)').matches;

  function actMeta(a) {
    var parts = [];
    if (a.u) parts.push(a.u);
    if (a.sp) parts.push(a.sp);
    if (a.lv) parts.push(a.lv);
    var meta = parts.join('，');
    if (a.x) meta = meta ? meta + '　' + a.x : a.x;
    return meta;
  }

  function slotText(v, s) {
    var di = Math.floor(s / 2), hi = s % 2;
    var a = v.acts[String(s)];
    var tel = (v.tel && v.tel !== '待补充') ? v.tel : '';
    return {
      head: DAYS[di] + '日 ' + HALVES[hi] + ' · ' + statusAt(v, di, hi),
      act: a ? { t: a.t, n: a.n, meta: actMeta(a) } : null,
      mgr: '管理人 ' + (v.mgr === '待补充' ? '待补充' : v.mgr) + (tel ? '　' + tel : '')
    };
  }

  function tipHTML(v, s) {
    var d = slotText(v, s);
    return '<div><b>' + v.name + '</b></div>'
      + '<div>' + d.head + '</div>'
      + (d.act ? '<div style="margin-top:.25rem">' + d.act.t + '　' + d.act.n
        + (d.act.meta ? '<br>' + d.act.meta : '') + '</div>' : '')
      + '<div style="margin-top:.25rem;opacity:.75">' + d.mgr + '</div>';
  }

  function detailHTML(v, s) {
    var d = slotText(v, s);
    return '<div class="si-h"><span>' + d.head + '</span>'
      + '<span class="si-x" role="button" aria-label="收起">✕</span></div>'
      + (d.act ? '<div class="si-a">' + d.act.t + '　' + d.act.n + '</div>'
        + (d.act.meta ? '<div class="si-meta">' + d.act.meta + '</div>' : '') : '')
      + '<div class="si-meta">' + d.mgr + '</div>';
  }

  function closeDetail() {
    var boxes = document.querySelectorAll('.slotinfo');
    Array.prototype.forEach.call(boxes, function (n) { n.parentNode.removeChild(n); });
    var picks = document.querySelectorAll('.strip .cell.pick');
    Array.prototype.forEach.call(picks, function (n) { n.classList.remove('pick'); });
  }

  function hideTip() {
    if (!tip) return;
    tip.classList.remove('on');
    tip.innerHTML = '';
    tip.style.left = ''; tip.style.top = '';
  }

  function bindTip() {
    tip = document.getElementById('tip');

    document.addEventListener('mouseover', function (e) {
      if (coarse) return;
      var el = e.target.closest ? e.target.closest('.cell') : null;
      if (!el) { tip.classList.remove('on'); return; }
      var v = V[Number(el.dataset.v)];
      if (!v) return;
      tip.innerHTML = tipHTML(v, Number(el.dataset.s));
      tip.classList.add('on');
    });

    document.addEventListener('mousemove', function (e) {
      if (coarse || !tip.classList.contains('on')) return;
      var w = tip.offsetWidth, h = tip.offsetHeight, pad = 14;
      var x = e.clientX + pad, y = e.clientY + pad;
      if (x + w > window.innerWidth - 8) x = e.clientX - w - pad;
      if (y + h > window.innerHeight - 8) y = e.clientY - h - pad;
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    });

    document.addEventListener('mouseleave', hideTip);

    /* 点按色块：在该卡片内就地展开详情，再次点按同一格收起 */
    document.addEventListener('click', function (e) {
      if (!e.target.closest) return;
      if (e.target.closest('.si-x')) { closeDetail(); return; }
      var el = e.target.closest('.cell');
      if (!el) return;
      var card = el.closest('.card');
      var v = V[Number(el.dataset.v)];
      if (!card || !v) return;

      var open = card.querySelector('.slotinfo');
      var same = open && open.dataset.v === el.dataset.v && open.dataset.s === el.dataset.s;
      closeDetail();
      if (same) return;

      var box = document.createElement('div');
      box.className = 'slotinfo';
      box.dataset.v = el.dataset.v; box.dataset.s = el.dataset.s;
      box.innerHTML = detailHTML(v, Number(el.dataset.s));
      var wrap = card.querySelector('.strip-wrap');
      if (!wrap) return;
      wrap.insertAdjacentElement('afterend', box);
      el.classList.add('pick');
    });
  }

  /* ---------------- 主流程 ---------------- */
  function syncDay() {
    if (!isMobile()) return;
    if (state.days.size && !state.days.has(DAYS[mDay])) {
      mDay = DAYS.indexOf(Array.from(state.days).sort(function (a, b) { return a - b; })[0]);
      if (mDay < 0) mDay = 0;
    }
    syncDayTabs();
  }

  function run() {
    var r = compute();
    renderStats(r);
    renderCards();
    syncDay();
    renderMatrix();
    updateSummary();
    document.getElementById('rescount').textContent =
      '命中 ' + r.venueHits + ' 个场地 · ' + r.cellHits + ' 个时段（空闲 ' + r.freeHits + '、已借用 ' + r.occHits + '）';
    subs.forEach(function (fn) { fn(r, state); });
  }

  window.VenueApp = {
    state: state, all: V, days: DAYS, halves: HALVES, cats: CATS, status: STATUS, campus: CAMPUS,
    statusAt: statusAt, cellMatch: cellMatch, venuePass: venuePass,
    onChange: function (fn) { subs.push(fn); }
  };

  function boot() {
    buildFilters();
    buildDayTabs();
    bindDrawer();
    bindTip();
    run();
    mq.addEventListener('change', function () {
      hideTip();
      syncDay();
      renderMatrix();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
