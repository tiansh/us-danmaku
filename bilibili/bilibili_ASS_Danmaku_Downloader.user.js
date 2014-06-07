// ==UserScript==
// @name        bilibili ASS Danmaku Downloader
// @namespace   https://github.com/tiansh
// @description 以 ASS 格式下载 bilibili 的弹幕
// @include     http://www.bilibili.tv/video/*
// @include     http://bilibili.kankanews.com/video/*
// @updateURL   https://tiansh.github.io/us-danmaku/bilibili/bilibili_ASS_Danmaku_Downloader.meta.js
// @downloadURL https://tiansh.github.io/us-danmaku/bilibili/bilibili_ASS_Danmaku_Downloader.user.js
// @version     0.7
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// @run-at      document-start
// ==/UserScript==

// 设置项
var config = {
  'playResX': 560,           // 分辨率 宽
  'playResY': 420,           // 分辨率 高
  'font': 'Microsoft YaHei', // 字体
  'font_size': 1.0,          // 字体大小（比例）
  'r2ltime': 8,              // 右到左弹幕持续时间
  'fixtime': 4,              // 固定弹幕持续时间
  'opacity': 0.75,           // 不透明度
  'max_delay': 6,            // 最多允许延迟几秒出现弹幕
  'timepad': 1.125           // 两条弹幕间隔比例
};

// 参数：第一个参数为对应的函数名（String，如"ping"、"getCid"）
//      后面的若干个参数为传给这个函数的参数
var rbb = function () {
  if (!unsafeWindow.replaceBilibiliBofqi) unsafeWindow.replaceBilibiliBofqi = [];
  unsafeWindow.replaceBilibiliBofqi.push(Array.apply(Array, arguments));
  return unsafeWindow.replaceBilibiliBofqi.constructor.name !== 'Array';
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
Style: Fix,Microsoft YaHei,25,&H{{alpha}}FFFFFF,&H{{alpha}}FFFFFF,&H{{alpha}}000000,&H{{alpha}}000000,1,0,0,0,100,100,0,0,1,2,0,2,20,20,2,0
Style: R2L,Microsoft YaHei,25,&H{{alpha}}FFFFFF,&H{{alpha}}FFFFFF,&H{{alpha}}000000,&H{{alpha}}000000,1,0,0,0,100,100,0,0,1,2,0,2,20,20,2,0

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text

  */}), config, info, {'alpha': hexAlpha(config.opacity) });
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

// 计算文本宽度
// 使用Canvas作为计算方法
var calcWidth = (function () {
  var canvas = document.createElement("canvas");
  var context = canvas.getContext("2d");
  return function (text, font, fontsize) {
    context.font = fontsize + 'px ' + font;
    return Math.ceil(context.measureText(text).width);
  };
}());

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

t: 时间点
u: 时间段
r: 延迟

并规定
ts := t0s + r
tf := wv / (wc + ws) * p + ts
tl := ws / (wc + ws) * p + ts
td := p + ts

*/

var normalDanmaku = (function (wc, hc, u, maxr) {
  return function () {
    // 初始化屏幕外面是不可用的
    var used = [
      { 'p': -Infinity, 'm': 0, 'tf': Infinity, 'td': Infinity },
      { 'p': hc, 'm': Infinity, 'tf': Infinity, 'td': Infinity },
    ];
    // 检查一些可用的位置
    var available = function (hv, t0s, t0l) {
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
      used.push({ 'p': p, 'm': m, 'tf': tf, 'td': td });
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
    return function (t0s, wv, hv) {
      var t0l = wc / (wv + wc) * u + t0s;
      syn(t0s, t0l);
      var al = available(hv, t0s, t0l);
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
}(config.playResX, config.playResY, config.r2ltime * config.timepad, config.max_delay));

var sideDanmaku = (function (hc, u, maxr) {
  return function () {
    var used = [
      { 'p': -Infinity, 'm': 0, 'td': Infinity },
      { 'p': hc, 'm': Infinity, 'td': Infinity },
    ];
    var fr = function (p, m, t0s) {
      var tas = t0s;
      used.forEach(function (j) {
        if (j.p >= m) return;
        if (j.m <= p) return;
        tas = Math.max(tas, j.td);
      });
      return { 'r': tas - t0s, 'p': p, 'm': m };
    };
    var top = function (hv, t0s) {
      var suggestion = [];
      used.forEach(function (i) {
        if (i.m > hc) return;
        suggestion.push(fr(i.m, i.m + hv, t0s));
      });
      return suggestion;
    };
    var bottom = function (hv, t0s) {
      var suggestion = [];
      used.forEach(function (i) {
        if (i.p < 0) return;
        suggestion.push(fr(i.p - hv, i.p, t0s));
      });
      return suggestion;
    };
    var use = function (p, m, td) {
      used.push({ 'p': p, 'm': m, 'td': td });
    };
    var syn = function (t0s) {
      used = used.filter(function (i) { return i.td > t0s; });
    };
    var score = function (i, is_top) {
      if (i.r > maxr) return -Infinity;
      var f = function (p) { return is_top ? p : (hc - p); };
      return 1 - (i.r / maxr * (31/32) + f(i.p) / hc * (1/32));
    };
    return function (t0s, hv, is_top) {
      syn(t0s);
      var al = (is_top ? top : bottom)(hv, t0s);
      if (!al.length) return null;
      var scored = al.map(function (i) { return [score(i, is_top), i]; });
      var best = scored.reduce(function (x, y) {
        return x[0] > y[0] ? x : y;
      })[1];
      use(best.p, best.m, best.r + t0s + u)
      return { 'top': best.p, 'time': best.r + t0s };
    };
  };
}(config.playResY, config.fixtime * config.timepad, config.max_delay));

// 为每条弹幕安置位置
var setPosition = function (danmaku) {
  var normal = normalDanmaku(), side = sideDanmaku();
  return danmaku
    .sort(function (x, y) { return x.time - y.time; })
    .map(function (line) {
      var font_size = Math.round(line.size * config.font_size);
      var width = calcWidth(line.text, config.font, font_size);
      switch (line.mode) {
        case 'R2L': return (function () {
          var pos = normal(line.time, width, font_size);
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
          var pos = side(line.time, font_size, isTop);
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

// 获取xml
var fetchXML = function (cid, callback) {
  GM_xmlhttpRequest({
    'method': 'GET',
    'url': 'http://comment.bilibili.cn/{{cid}}.xml'.replace('{{cid}}', cid),
    'onload': function (resp) {
      var data = (new DOMParser()).parseFromString(resp.responseText, 'text/xml');
      var danmaku = Array.apply(Array, data.querySelectorAll('d')).map(function (line) {
        var info = line.getAttribute('p').split(','), text = line.textContent;
        return {
          'text': text,
          'time': Number(info[0]),
          'mode': [undefined, 'R2L', 'R2L', 'R2L', 'BOTTOM', 'TOP'][Number(info[1])],
          'size': Number(info[2]),
          'color': RRGGBB(Number(info[3])),
          'create': new Date(Number(info[4])),
          'pool': Number(info[5]),
          'sender': String(info[6]),
          'dmid': Number(info[7]),
        };
      });
      callback(danmaku);
    }
  });
};

// 获取当前cid
var getCid = function (callback) {
  var cid = null;
  try {
    cid = Number(
      document.querySelector('#bofqi iframe').src
      .match(/cid=(\d+)/)[1]);
  } catch (e) { }
  if (!cid) try {
    cid = Number(
      document.querySelector('#bofqi embed').getAttribute('flashvars')
      .match(/cid=(\d+)/)[1]);
  } catch (e) { }
  if (cid) setTimeout(function () { callback(cid); }, 0);
};

// 下载的主程序
var mina = function (cid0) {
  getCid(function (cid) {
    cid = cid || cid0;
    fetchXML(cid, function (danmaku) {
      var name;
      try { name = document.querySelector('.viewbox h2').textContent; }
      catch (e) { name = '' + cid; }
      var ass = generateASS(setPosition(danmaku), {
        'title': document.title,
        'ori': location.href,
      });
      startDownload(ass, name + '.ass');
    });
  });
};

var showButton = function () {
  GM_addStyle('#assdown { display: block !important; }');
  document.querySelector('#assdown').href = '#';
};

// 初始化按钮
var initButton = (function () {
  var done = false;
  return function () {
    if (!document.querySelector('#assdown')) return;
    getCid(function (cid) {
      if (done) return; else done = true;
      showButton();
      document.querySelector('#assdown') .addEventListener('click', function (e) {
        e.preventDefault();
        mina(cid);
      });
    });
  };
}());

window.addEventListener('DOMContentLoaded', initButton);
rbb('replaced', initButton);
