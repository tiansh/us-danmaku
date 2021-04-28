#!/usr/bin/env node
/**
 * Need to install node locally
 * Usage:
 *   ./app.js danmaku.xml
 * or
 *   node app.js danmaku.xml
 */

var fs = require("fs")

eval(fs.readFileSync('bilibili_ASS_Danmaku_Downloader.user.js').toString())

config.font = config.fontlist[0]
calcWidth = (text, fontsize) => text.length * fontsize;

var filename = process.argv[process.argv.length - 1]
var title = filename.split('.')[0]

fs.readFile(filename, 'utf8', (e, s) => {
  if (e) throw e;
  var ass = generateASS(setPosition(parseXML(s)), {
    'title': title,
    'ori': filename,
  });
  fs.writeFile(title + '.ass', ass, (e) => {
    if (e) throw e;
  });
})
