/* 会场空余情况查询 —— 概览图表（ECharts，正式校庆配色）
   手机端把「各时段」图转为横向条形，16 个时段标签全部可读，无需旋转或截断。 */
(function () {
  var App = window.VenueApp;
  if (!App || typeof echarts === 'undefined') return;

  var css = getComputedStyle(document.documentElement);
  var C = {
    free: css.getPropertyValue('--free-ink').trim(),   /* 深绿 */
    occ: css.getPropertyValue('--occ-ink').trim(),     /* 绛红 */
    gold: css.getPropertyValue('--gold').trim(),
    ink: css.getPropertyValue('--ink').trim(),
    muted: css.getPropertyValue('--muted').trim(),
    rule: css.getPropertyValue('--rule').trim(),
    bg2: css.getPropertyValue('--bg2').trim()
  };
  var DAYS = App.days, HALVES = App.halves, CATS = App.cats;
  var mq = window.matchMedia('(max-width: 720px)');
  var isMobile = function () { return mq.matches; };

  var slotLabels = [];
  for (var di = 0; di < 8; di++) for (var hi = 0; hi < 2; hi++) {
    slotLabels.push(DAYS[di] + '\n' + HALVES[hi]);
  }

  var elSlot = document.getElementById('chart-slot');
  var elCat = document.getElementById('chart-cat');
  var slotChart = echarts.init(elSlot, null, { renderer: 'svg' });
  var catChart = echarts.init(elCat, null, { renderer: 'svg' });

  function axisX(data, rotate) {
    return {
      type: 'category', data: data,
      axisLine: { lineStyle: { color: C.rule } },
      axisTick: { show: false },
      axisLabel: {
        color: C.muted, fontSize: 10, interval: 0, rotate: rotate || 0,
        lineHeight: 13, fontFamily: 'PlexMono, monospace'
      },
      splitLine: { show: false }
    };
  }
  function axisCatY(data) {
    return {
      type: 'category', data: data, inverse: true,
      axisLine: { lineStyle: { color: C.rule } },
      axisTick: { show: false },
      axisLabel: { color: C.muted, fontSize: 10, interval: 0, lineHeight: 13, fontFamily: 'PlexMono, monospace' },
      splitLine: { show: false }
    };
  }
  function axisY(name) {
    return {
      type: 'value', name: name,
      nameTextStyle: { color: C.muted, fontSize: 10, padding: [0, 0, 0, 2] },
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: C.muted, fontSize: 10, fontFamily: 'PlexMono, monospace' },
      splitLine: { lineStyle: { color: C.rule, type: 'dotted' } }
    };
  }
  function axisXValue(name) {
    return {
      type: 'value', name: name,
      nameTextStyle: { color: C.muted, fontSize: 10 },
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: C.muted, fontSize: 10, fontFamily: 'PlexMono, monospace' },
      splitLine: { lineStyle: { color: C.rule, type: 'dotted' } }
    };
  }
  function bar(name, color, stack, maxW) {
    return {
      name: name, type: 'bar', stack: stack, barMaxWidth: maxW || 22,
      itemStyle: { color: color, borderColor: C.bg2, borderWidth: 0.5 },
      emphasis: { focus: 'series' }
    };
  }
  function legend() {
    return {
      top: 0, right: 0, itemWidth: 10, itemHeight: 10, itemGap: 14,
      textStyle: { color: C.muted, fontSize: 11 }
    };
  }
  function tipBox() {
    return {
      trigger: 'axis', appendToBody: true,
      backgroundColor: '#26231D', borderColor: C.gold, borderWidth: 1,
      textStyle: { color: '#F5F3ED', fontSize: 12 },
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(140,26,34,0.06)' } }
    };
  }

  function slotData() {
    var free = [], occ = [];
    var venues = App.all.filter(App.venuePass);
    for (var s = 0; s < 16; s++) {
      var f = 0, o = 0;
      venues.forEach(function (v) { if (v.s.charAt(s) === 'F') f++; else o++; });
      free.push(f); occ.push(o);
    }
    return { free: free, occ: occ };
  }
  function catData() {
    var map = {};
    CATS.forEach(function (c) { map[c] = { f: 0, o: 0 }; });
    App.all.filter(App.venuePass).forEach(function (v) {
      for (var s = 0; s < 16; s++) {
        if (v.s.charAt(s) === 'F') map[v.cat].f++; else map[v.cat].o++;
      }
    });
    var cats = CATS.filter(function (c) { return map[c].f + map[c].o > 0; });
    return {
      cats: cats,
      free: cats.map(function (c) { return map[c].f; }),
      occ: cats.map(function (c) { return map[c].o; })
    };
  }

  function renderSlot() {
    var d = slotData();
    var mobile = isMobile();
    elSlot.style.height = mobile ? '520px' : '316px';
    slotChart.resize();

    if (mobile) {
      /* 横向条形：16 个时段自上而下排开，标签完整可读 */
      slotChart.setOption({
        animation: false,
        color: [C.free, C.occ],
        grid: { left: 4, right: 16, top: 36, bottom: 4, containLabel: true },
        legend: legend(),
        tooltip: tipBox(),
        xAxis: axisXValue('会场数'),
        yAxis: axisCatY(slotLabels),
        series: [
          Object.assign(bar('空闲', C.free, 't', 13), { data: d.free }),
          Object.assign(bar('已借用', C.occ, 't', 13), { data: d.occ })
        ]
      }, true);
      return;
    }

    slotChart.setOption({
      animation: false,
      color: [C.free, C.occ],
      grid: { left: 4, right: 10, top: 38, bottom: 6, containLabel: true },
      legend: legend(),
      tooltip: tipBox(),
      xAxis: axisX(slotLabels, 0),
      yAxis: axisY('会场数'),
      series: [
        Object.assign(bar('空闲', C.free, 't'), { data: d.free }),
        Object.assign(bar('已借用', C.occ, 't'), { data: d.occ })
      ]
    }, true);
  }

  function renderCat() {
    var d = catData();
    var mobile = isMobile();
    elCat.style.height = mobile ? '300px' : '316px';
    catChart.resize();
    catChart.setOption({
      animation: false,
      color: [C.free, C.occ],
      grid: { left: 4, right: 10, top: 38, bottom: 6, containLabel: true },
      legend: legend(),
      tooltip: tipBox(),
      xAxis: axisX(d.cats, 0),
      yAxis: axisY('时段格数'),
      series: [
        Object.assign(bar('空闲', C.free, 'c'), { data: d.free }),
        Object.assign(bar('已借用', C.occ, 'c'), { data: d.occ })
      ]
    }, true);
  }

  function renderAll() { renderSlot(); renderCat(); }

  App.onChange(renderAll);
  renderAll();
  mq.addEventListener('change', function () { renderAll(); });
  window.addEventListener('resize', function () { slotChart.resize(); catChart.resize(); });
})();
