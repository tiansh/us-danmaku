var gotFile = function (name, content) {
  var danmaku = parseFile(content);
  var ass = generateASS(setPosition(danmaku), {
    'title': document.title,
    'ori': name,
  });
  startDownload('\ufeff' + ass, name.replace(/\.[^.]*$/, '') + '.ass');
};
window.addEventListener('load', function () {
  var upload = document.querySelector('#upload');
  upload.addEventListener('change', function () {
    var file = upload.files[0];
    var name = file.name;
    var reader = new FileReader();
    if (file.size > (1 << 24)) error();
    else reader.addEventListener('load', function () {
      gotFile(name, reader.result);
    });
    reader.readAsText(file);
    upload.value = '';
  });
});


if (navigator.userAgent.match(/^Mozilla\/5.0 \([^)]+; rv:[\d.]+\) Gecko\/[\d]{8} Firefox\/[\d.]+$/)) {
  const style = document.createElement('style');
  style.innerHTML = '.addon { display: block; }';
  document.documentElement.appendChild(style);
}
