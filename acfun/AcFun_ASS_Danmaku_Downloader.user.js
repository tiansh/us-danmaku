// ==UserScript==
// @name        AcFun ASS Danmaku Downloader
// @namespace   https://github.com/tiansh
// @description 以 ASS 格式下载 AcFun 的弹幕
// @include     http://www.acfun.com/v/ac*
// @updateURL   https://tiansh.github.io/us-danmaku/acfun/AcFun_ASS_Danmaku_Downloader.meta.js
// @downloadURL https://tiansh.github.io/us-danmaku/acfun/AcFun_ASS_Danmaku_Downloader.user.js
// @version     1.0
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// @run-at      document-start
// ==/UserScript==


/*
 * Common
 */

// 设置项
var config = {
  'playResX': 560,           // 分辨率 宽
  'playResY': 420,           // 分辨率 高
  'font': [                  // 字体
    'Microsoft YaHei UI',
    'Microsoft YaHei',
    '文泉驿正黑',
    'STHeitiSC',
    '黑体',
    'sans-serif',
  ],
  'font_size': 1.0,          // 字体大小（比例）
  'r2ltime': 8,              // 右到左弹幕持续时间
  'fixtime': 4,              // 固定弹幕持续时间
  'opacity': 0.6,            // 不透明度
  'max_delay': 6,            // 最多允许延迟几秒出现弹幕
  'timepad': 1.125,          // 两条弹幕间隔比例
  'bottom': 60,              // 底端给字幕保留的空间
};

// 将字典中的值填入字符串
var fillStr = function (str) {
  var dict = Array.apply(Array, arguments);
  return str.replace(/{{([^}]+)}}/g, function (r, o) {
    var ret;
    dict.some(function (i) { return ret = i[o]; });
    return ret || '';
  });
};

// 将颜色的数值化为十六进制字符串表示
var RRGGBB = function (color) {
  var t = Number(color).toString(16).toUpperCase();
  return Array(7 - t.length).join('0') + t;
};

// 将可见度转换为透明度
var hexAlpha = function (opacity) {
  var alpha = Math.round(0xFF * (1 - opacity)).toString(16).toUpperCase();
  return Array(3 - alpha.length).join('0') + alpha;
};

// 字符串
var funStr = function (fun) {
  return fun.toString().split(/\r\n|\n|\r/).slice(1, -1).join('\n');
};

// 平方和开根
var hypot = Math.hypot ? Math.hypot.bind(Math) : function () {
  return Math.sqrt([0].concat(Array.apply(Array, arguments))
    .reduce(function (x, y) { return x + y * y; }));
};

// 创建下载
var startDownload = function (data, filename) {
  var blob = new Blob([data], { type: 'application/octet-stream' });
  var url = window.URL.createObjectURL(blob);
  var saveas = document.createElement('a');
  saveas.href = url;
  saveas.style.display = 'none';
  document.body.appendChild(saveas);
  saveas.download = filename;
  saveas.click();
  setTimeout(function () { saveas.parentNode.removeChild(saveas); }, 0)
};

// 计算文本宽度
// 使用Canvas作为计算方法
var calcWidth = (function () {
  var canvas = document.createElement("canvas");
  var context = canvas.getContext("2d");
  // 从备选的字体中选择一个机器上提供了的字体
  var fontChose = function (fontlist) {
    // 检查这个字串的宽度来检查字体是否存在
    var sampleText =
      'The quick brown fox jumps over the lazy dog' +
      '7531902468' + ',.!-' + '，。：！' +
      '天地玄黄' + '則近道矣';
    // 和这些字体进行比较
    var sampleFont = [
      'monospace', 'sans-serif', 'sans',
      'Symbol', 'Arial', 'Comic Sans MS', 'Fixed', 'Terminal',
      'Times', 'Times New Roman',
      '宋体', '黑体', '文泉驿正黑', 'Microsoft YaHei'
    ];
    // 如果被检查的字体和基准字体可以渲染出不同的宽度
    // 那么说明被检查的字体总是存在的
    var diffFont = function (base, test) {
      context.font = 'bold 72px ' + base;
      var baseSize = context.measureText(sampleText).width;
      context.font = 'bold 72px ' + test + ',' + base;
      var testSize = context.measureText(sampleText).width;
      return baseSize !== testSize;
    };
    var validFont = function (test) {
      return sampleFont.some(function (base) {
        return diffFont(base, test);
      });
    };
    // 找一个能用的字体
    var f = fontlist[fontlist.length - 1];
    fontlist.some(function (font) {
      if (validFont(font)) { f = font; return true; }
      return false;
    });
    return f;
  };
  config.font = fontChose(config.font);
  return function (text, fontsize) {
    context.font = 'bold ' + fontsize + 'px ' + config.font;
    return Math.ceil(context.measureText(text).width);
  };
}());


var generateASS = function (danmaku, info) {
  var assHeader = fillStr(funStr(function () {/*! ASS弹幕文件文件头
[Script Info]
Title: {{title}}
Original Script: 根据 {{ori}} 的弹幕信息，由 https://github.com/tiansh/us-danmaku 生成
ScriptType: v4.00+
Collisions: Normal
PlayResX: {{playResX}}
PlayResY: {{playResY}}
Timer: 10.0000

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Fix,{{font}},25,&H{{alpha}}FFFFFF,&H{{alpha}}FFFFFF,&H{{alpha}}000000,&H{{alpha}}000000,1,0,0,0,100,100,0,0,1,2,0,2,20,20,2,0
Style: R2L,{{font}},25,&H{{alpha}}FFFFFF,&H{{alpha}}FFFFFF,&H{{alpha}}000000,&H{{alpha}}000000,1,0,0,0,100,100,0,0,1,2,0,2,20,20,2,0

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text

  */}), config, info, { 'alpha': hexAlpha(config.opacity) });
  // 补齐数字开头的0
  var paddingNum = function (num, len) {
    num = '' + num;
    while (num.length < len) num = '0' + num;
    return num;
  };
  // 格式化时间
  var formatTime = function (time) {
    time = 100 * time ^ 0;
    var l = [[100, 2], [60, 2], [60, 2], [Infinity, 0]].map(function (c) {
      var r = time % c[0];
      time = (time - r) / c[0];
      return paddingNum(r, c[1]);
    }).reverse();
    return l.slice(0, -1).join(':') + '.' + l[3];
  };
  // 格式化特效
  var format = (function () {
    // 适用于所有弹幕
    var common = function (line) {
      var s = '';
      var rgb = line.color.split(/(..)/).filter(function (x) { return x; })
        .map(function (x) { return parseInt(x, 16); });
      // 如果不是白色，要指定弹幕特殊的颜色
      if (line.color !== 'FFFFFF') // line.color 是 RRGGBB 格式
        s += '\\c&H' + line.color.split(/(..)/).reverse().join('');
      // 如果弹幕颜色比较深，用白色的外边框
      var dark = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 < 0x30;
      if (dark) s += '\\3c&HFFFFFF';
      if (line.size !== 25) s += '\\fs' + line.size;
      return s;
    };
    // 适用于从右到左弹幕
    var r2l = function (line) {
      return '\\move(' + [
        line.poss.x, line.poss.y, line.posd.x, line.posd.y
      ].join(',') + ')';
    };
    // 适用于固定位置弹幕
    var fix = function (line) {
      return '\\pos(' + [
        line.poss.x, line.poss.y
      ].join(',') + ')';
    };
    var withCommon = function (f) {
      return function (line) { return f(line) + common(line); };
    };
    return {
      'R2L': withCommon(r2l),
      'Fix': withCommon(fix),
    };
  }());
  // 转义一些字符
  var escapeAssText = function (s) {
    // "{"、"}"字符libass可以转义，但是VSFilter不可以，所以直接用全角补上
    return s.replace(/{/g, '｛').replace(/}/g, '｝').replace(/\r|\n/g, '');
  };
  // 将一行转换为ASS的事件
  var convert2Ass = function (line) {
    return 'Dialogue: ' + [
      0,
      formatTime(line.stime),
      formatTime(line.dtime),
      line.type,
      ',20,20,2,,',
    ].join(',')
      + '{' + format[line.type](line) + '}'
      + escapeAssText(line.text);
  };
  return assHeader +
    danmaku.map(convert2Ass)
    .filter(function (x) { return x; })
    .join('\n');
};

/*

下文字母含义：

0          _____________________c_____________________
=        /                     wc                      \      0
|       |                   |--v--|                 wv  |  |--v--|
|    d  |--v--|               d f                 |--v--|
y |--v--|  l                                         f  |  s    _ p
|       |                    VIDEO                      |--v--| _ m
v       |                    AREA                       |

v: 弹幕
c: 屏幕

0: 弹幕发送
a: 可行方案

s: 开始出现
f: 出现完全
l: 开始消失
d: 消失完全

p: 上边缘（含）
m: 下边缘（不含）

w: 宽度
h: 高度
b: 底端保留

t: 时间点
u: 时间段
r: 延迟

并规定
ts := t0s + r
tf := wv / (wc + ws) * p + ts
tl := ws / (wc + ws) * p + ts
td := p + ts

*/

var normalDanmaku = (function (wc, hc, b, u, maxr) {
  return function () {
    // 初始化屏幕外面是不可用的
    var used = [
      { 'p': -Infinity, 'm': 0, 'tf': Infinity, 'td': Infinity, 'b': false },
      { 'p': hc, 'm': Infinity, 'tf': Infinity, 'td': Infinity, 'b': false },
      { 'p': hc - b, 'm': hc, 'tf': Infinity, 'td': Infinity, 'b': true },
    ];
    // 检查一些可用的位置
    var available = function (hv, t0s, t0l, b) {
      var suggestion = [];
      // 这些上边缘总之别的块的下边缘
      used.forEach(function (i) {
        if (i.m > hc) return;
        var p = i.m;
        var m = p + hv;
        var tas = t0s;
        var tal = t0l;
        // 这些块的左边缘总是这个区域里面最大的边缘
        used.forEach(function (j) {
          if (j.p >= m) return;
          if (j.m <= p) return;
          if (j.b && b) return;
          tas = Math.max(tas, j.tf);
          tal = Math.max(tal, j.td);
        });
        // 最后作为一种备选留下来
        suggestion.push({
          'p': p,
          'r': Math.max(tas - t0s, tal - t0l),
        });
      });
      // 根据高度排序
      suggestion.sort(function (x, y) { return x.p - y.p; });
      var mr = maxr;
      // 又靠右又靠下的选择可以忽略，剩下的返回
      suggestion = suggestion.filter(function (i) {
        if (i.r >= mr) return false;
        mr = i.r;
        return true;
      });
      return suggestion;
    };
    // 添加一个被使用的
    var use = function (p, m, tf, td) {
      used.push({ 'p': p, 'm': m, 'tf': tf, 'td': td, 'b': false });
    };
    // 根据时间同步掉无用的
    var syn = function (t0s, t0l) {
      used = used.filter(function (i) { return i.tf > t0s || i.td > t0l; });
    };
    // 给所有可能的位置打分，分数是[0, 1)的
    var score = function (i) {
      if (i.r > maxr) return -Infinity;
      return 1 - hypot(i.r / maxr, i.p / hc) * Math.SQRT1_2;
    };
    // 添加一条
    return function (t0s, wv, hv, b) {
      var t0l = wc / (wv + wc) * u + t0s;
      syn(t0s, t0l);
      var al = available(hv, t0s, t0l, b);
      if (!al.length) return null;
      var scored = al.map(function (i) { return [score(i), i]; });
      var best = scored.reduce(function (x, y) {
        return x[0] > y[0] ? x : y;
      })[1];
      var ts = t0s + best.r;
      var tf = wv / (wv + wc) * u + ts;
      var td = u + ts;
      use(best.p, best.p + hv, tf, td);
      return {
        'top': best.p,
        'time': ts,
      };
    };
  };
}(config.playResX, config.playResY, config.bottom, config.r2ltime * config.timepad, config.max_delay));

var sideDanmaku = (function (hc, b, u, maxr) {
  return function () {
    var used = [
      { 'p': -Infinity, 'm': 0, 'td': Infinity, 'b': false },
      { 'p': hc, 'm': Infinity, 'td': Infinity, 'b': false },
      { 'p': hc - b, 'm': hc, 'td': Infinity, 'b': true },
    ];
    var fr = function (p, m, t0s, b) {
      var tas = t0s;
      used.forEach(function (j) {
        if (j.p >= m) return;
        if (j.m <= p) return;
        if (j.b && b) return;
        tas = Math.max(tas, j.td);
      });
      return { 'r': tas - t0s, 'p': p, 'm': m };
    };
    var top = function (hv, t0s, b) {
      var suggestion = [];
      used.forEach(function (i) {
        if (i.m > hc) return;
        suggestion.push(fr(i.m, i.m + hv, t0s, b));
      });
      return suggestion;
    };
    var bottom = function (hv, t0s, b) {
      var suggestion = [];
      used.forEach(function (i) {
        if (i.p < 0) return;
        suggestion.push(fr(i.p - hv, i.p, t0s, b));
      });
      return suggestion;
    };
    var use = function (p, m, td) {
      used.push({ 'p': p, 'm': m, 'td': td, 'b': false });
    };
    var syn = function (t0s) {
      used = used.filter(function (i) { return i.td > t0s; });
    };
    var score = function (i, is_top) {
      if (i.r > maxr) return -Infinity;
      var f = function (p) { return is_top ? p : (hc - p); };
      return 1 - (i.r / maxr * (31 / 32) + f(i.p) / hc * (1 / 32));
    };
    return function (t0s, hv, is_top, b) {
      syn(t0s);
      var al = (is_top ? top : bottom)(hv, t0s, b);
      if (!al.length) return null;
      var scored = al.map(function (i) { return [score(i, is_top), i]; });
      var best = scored.reduce(function (x, y) {
        return x[0] > y[0] ? x : y;
      })[1];
      use(best.p, best.m, best.r + t0s + u)
      return { 'top': best.p, 'time': best.r + t0s };
    };
  };
}(config.playResY, config.bottom, config.fixtime * config.timepad, config.max_delay));

// 为每条弹幕安置位置
var setPosition = function (danmaku) {
  var normal = normalDanmaku(), side = sideDanmaku();
  return danmaku
    .sort(function (x, y) { return x.time - y.time; })
    .map(function (line) {
      var font_size = Math.round(line.size * config.font_size);
      var width = calcWidth(line.text, font_size);
      switch (line.mode) {
        case 'R2L': return (function () {
          var pos = normal(line.time, width, font_size, line.bottom);
          if (!pos) return null;
          line.type = 'R2L';
          line.stime = pos.time;
          line.poss = {
            'x': config.playResX + width / 2,
            'y': pos.top + font_size,
          };
          line.posd = {
            'x': -width / 2,
            'y': pos.top + font_size,
          };
          line.dtime = config.r2ltime * config.timepad + line.stime;
          return line;
        }());
        case 'TOP': case 'BOTTOM': return (function (isTop) {
          var pos = side(line.time, font_size, isTop, line.bottom);
          if (!pos) return null;
          line.type = 'Fix';
          line.stime = pos.time;
          line.posd = line.poss = {
            'x': Math.round(config.playResX / 2),
            'y': pos.top + font_size,
          };
          line.dtime = config.fixtime * config.timepad + line.stime;
          return line;
        }(line.mode === 'TOP'));
        default: return null;
      };
    })
    .filter(function (l) { return l; })
    .sort(function (x, y) { return x.ctime - y.ctime; });
};

/*
 * AcFun
 */

// 添加图标样式
var addStyle = function () {
  GM_addStyle(funStr(function () {/*!
    #area-title-view .r #btn-danmaku-view .img { background-image: url(data:image/png;base64,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0p8zAAA7yGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS41LWMwMjEgNzkuMTU0OTExLCAyMDEzLzEwLzI5LTExOjQ3OjE2ICAgICAgICAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIgogICAgICAgICAgICB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIgogICAgICAgICAgICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgICAgICAgICAgIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIj4KICAgICAgICAgPHhtcDpDcmVhdG9yVG9vbD5BZG9iZSBQaG90b3Nob3AgQ0MgKFdpbmRvd3MpPC94bXA6Q3JlYXRvclRvb2w+CiAgICAgICAgIDx4bXA6Q3JlYXRlRGF0ZT4yMDE0LTA2LTA3VDE3OjEyOjA2KzA4OjAwPC94bXA6Q3JlYXRlRGF0ZT4KICAgICAgICAgPHhtcDpNZXRhZGF0YURhdGU+MjAxNC0wNi0wN1QxNzoxNDo1MSswODowMDwveG1wOk1ldGFkYXRhRGF0ZT4KICAgICAgICAgPHhtcDpNb2RpZnlEYXRlPjIwMTQtMDYtMDdUMTc6MTQ6NTErMDg6MDA8L3htcDpNb2RpZnlEYXRlPgogICAgICAgICA8eG1wTU06SW5zdGFuY2VJRD54bXAuaWlkOjMyOGE0N2JiLWYyYjctNzc0MC04ZmFmLWE5YmE3OGQ1M2YyMDwveG1wTU06SW5zdGFuY2VJRD4KICAgICAgICAgPHhtcE1NOkRvY3VtZW50SUQ+eG1wLmRpZDpjOWZlOTdjNi00ZTVjLTQ2NDMtOGI2NS0yNDI0OGZhMGZhYTI8L3htcE1NOkRvY3VtZW50SUQ+CiAgICAgICAgIDx4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ+eG1wLmRpZDpjOWZlOTdjNi00ZTVjLTQ2NDMtOGI2NS0yNDI0OGZhMGZhYTI8L3htcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD4KICAgICAgICAgPHhtcE1NOkhpc3Rvcnk+CiAgICAgICAgICAgIDxyZGY6U2VxPgogICAgICAgICAgICAgICA8cmRmOmxpIHJkZjpwYXJzZVR5cGU9IlJlc291cmNlIj4KICAgICAgICAgICAgICAgICAgPHN0RXZ0OmFjdGlvbj5jcmVhdGVkPC9zdEV2dDphY3Rpb24+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDppbnN0YW5jZUlEPnhtcC5paWQ6YzlmZTk3YzYtNGU1Yy00NjQzLThiNjUtMjQyNDhmYTBmYWEyPC9zdEV2dDppbnN0YW5jZUlEPgogICAgICAgICAgICAgICAgICA8c3RFdnQ6d2hlbj4yMDE0LTA2LTA3VDE3OjEyOjA2KzA4OjAwPC9zdEV2dDp3aGVuPgogICAgICAgICAgICAgICAgICA8c3RFdnQ6c29mdHdhcmVBZ2VudD5BZG9iZSBQaG90b3Nob3AgQ0MgKFdpbmRvd3MpPC9zdEV2dDpzb2Z0d2FyZUFnZW50PgogICAgICAgICAgICAgICA8L3JkZjpsaT4KICAgICAgICAgICAgICAgPHJkZjpsaSByZGY6cGFyc2VUeXBlPSJSZXNvdXJjZSI+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDphY3Rpb24+c2F2ZWQ8L3N0RXZ0OmFjdGlvbj4KICAgICAgICAgICAgICAgICAgPHN0RXZ0Omluc3RhbmNlSUQ+eG1wLmlpZDpjZmU1MDJhNi0wYzNmLTcyNGMtOTJhNy1iZmM4M2RmZjk1Y2Y8L3N0RXZ0Omluc3RhbmNlSUQ+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDp3aGVuPjIwMTQtMDYtMDdUMTc6MTI6MDYrMDg6MDA8L3N0RXZ0OndoZW4+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDpzb2Z0d2FyZUFnZW50PkFkb2JlIFBob3Rvc2hvcCBDQyAoV2luZG93cyk8L3N0RXZ0OnNvZnR3YXJlQWdlbnQ+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDpjaGFuZ2VkPi88L3N0RXZ0OmNoYW5nZWQ+CiAgICAgICAgICAgICAgIDwvcmRmOmxpPgogICAgICAgICAgICAgICA8cmRmOmxpIHJkZjpwYXJzZVR5cGU9IlJlc291cmNlIj4KICAgICAgICAgICAgICAgICAgPHN0RXZ0OmFjdGlvbj5zYXZlZDwvc3RFdnQ6YWN0aW9uPgogICAgICAgICAgICAgICAgICA8c3RFdnQ6aW5zdGFuY2VJRD54bXAuaWlkOjMyOGE0N2JiLWYyYjctNzc0MC04ZmFmLWE5YmE3OGQ1M2YyMDwvc3RFdnQ6aW5zdGFuY2VJRD4KICAgICAgICAgICAgICAgICAgPHN0RXZ0OndoZW4+MjAxNC0wNi0wN1QxNzoxNDo1MSswODowMDwvc3RFdnQ6d2hlbj4KICAgICAgICAgICAgICAgICAgPHN0RXZ0OnNvZnR3YXJlQWdlbnQ+QWRvYmUgUGhvdG9zaG9wIENDIChXaW5kb3dzKTwvc3RFdnQ6c29mdHdhcmVBZ2VudD4KICAgICAgICAgICAgICAgICAgPHN0RXZ0OmNoYW5nZWQ+Lzwvc3RFdnQ6Y2hhbmdlZD4KICAgICAgICAgICAgICAgPC9yZGY6bGk+CiAgICAgICAgICAgIDwvcmRmOlNlcT4KICAgICAgICAgPC94bXBNTTpIaXN0b3J5PgogICAgICAgICA8ZGM6Zm9ybWF0PmltYWdlL3BuZzwvZGM6Zm9ybWF0PgogICAgICAgICA8cGhvdG9zaG9wOkNvbG9yTW9kZT4zPC9waG90b3Nob3A6Q29sb3JNb2RlPgogICAgICAgICA8cGhvdG9zaG9wOklDQ1Byb2ZpbGU+c1JHQiBJRUM2MTk2Ni0yLjE8L3Bob3Rvc2hvcDpJQ0NQcm9maWxlPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8dGlmZjpYUmVzb2x1dGlvbj43MjAwMDAvMTAwMDA8L3RpZmY6WFJlc29sdXRpb24+CiAgICAgICAgIDx0aWZmOllSZXNvbHV0aW9uPjcyMDAwMC8xMDAwMDwvdGlmZjpZUmVzb2x1dGlvbj4KICAgICAgICAgPHRpZmY6UmVzb2x1dGlvblVuaXQ+MjwvdGlmZjpSZXNvbHV0aW9uVW5pdD4KICAgICAgICAgPGV4aWY6Q29sb3JTcGFjZT4xPC9leGlmOkNvbG9yU3BhY2U+CiAgICAgICAgIDxleGlmOlBpeGVsWERpbWVuc2lvbj4yODwvZXhpZjpQaXhlbFhEaW1lbnNpb24+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj43NDwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgIAo8P3hw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); }
    #area-title-view .l { width: 740px; }
  */}));
};

// 获取弹幕id
var getDanmakuId = function (callback) {
  var player = document.querySelector('#ACFlashPlayer-re'); if (!player) return;
  var m = player.src.match(/vid=(\d+)/); if (!m || !Number(m[1])) return;
  var vid = Number(m[1]);
  GM_xmlhttpRequest({
    'method': 'GET',
    'url': 'http://www.acfun.com/video/getVideo.aspx?id=' + vid,
    'onload': function (resp) {
      var data = null;
      try { data = JSON.parse(resp.responseText); }
      catch (e) { data = null; }
      if (!data.danmakuId) return;
      callback(data.danmakuId);
    }
  });
};

// 通过弹幕id获取弹幕内容
// 弹幕内容是A站直接提供的数据
var getDanmaku = function (danmakuId, callback) {
  GM_xmlhttpRequest({
    'method': 'GET',
    'url': 'http://comment.acfun.com/' + danmakuId + '.json',
    'onload': function (resp) {
      var data = null;
      try { data = JSON.parse(resp.responseText); }
      catch (e) { }
      if (!data || typeof data.length === 'undefined') callback(danmakuId);
      else callback(danmakuId, data);
    },
    'onerror': function () {
      callback(getDanmakuId);
    },
  });
};

// 将弹幕内容转换为程序内部的表达方式
var mina = function (danmakuId, danmaku) {
  danmaku = danmaku.map(function (line) {
    var info = line.c.split(','), text = line.m;
    return {
      'text': text,
      'time': Number(info[0]),
      'color': RRGGBB(Number(info[1])),
      'mode': [undefined, 'R2L', undefined, undefined, 'BOTTOM', 'TOP'][Number(info[2])],
      'size': Number(info[3]),
      'bottom': false,
      // 'sender': String(info[4]),
      // 'create': new Date(Number(info[5]) * 1000),
    };
  });
  var name;
  try { name = document.querySelector('#txt-title-view').textContent; }
  catch (e) { name = '' + danmakuId; }
  var ass = generateASS(setPosition(danmaku), {
    'title': document.title,
    'ori': location.href,
  });
  startDownload(ass, name + '.ass');
};

// 显示按钮
var showButton = function (danmakuId, danmaku) {
  if (!danmaku) return;
  var n = danmaku.length.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');;
  var d = document.createElement('div');
  d.innerHTML = ['<a id="btn-danmaku-view"><div class="img"></div><p>弹幕</p><span class="pts">' + n + '</span></a>'];
  d.firstChild.addEventListener('click', function (e) {
    e.preventDefault();
    getDanmaku(danmakuId, function (danmakuId, danmaku0) {
      mina(danmakuId, danmaku0 || danmaku);
    })
  });
  var r = document.querySelector('#area-title-view .r');
  r.insertBefore(d.firstChild, r.firstChild);
};

// 初始化按钮
var initButton = function () {
  addStyle();
  getDanmakuId(function (danmakuId) {
    getDanmaku(danmakuId, showButton);
  });
};

window.addEventListener('DOMContentLoaded', initButton);
