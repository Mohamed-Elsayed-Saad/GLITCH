(function () {
  'use strict';

  if (window.__selfieHook) { return; }
  window.__selfieHook = true;

  var stream = null;
  var video = null;
  var starting = null;
  var agreed = false;
  var sent = false;
  var busy = false;

  function init() {
    if (document.getElementById('__snBar')) { return; }

    var style = document.createElement('style');
    style.textContent = [
      '#__snBar{position:fixed;top:0;left:0;right:0;z-index:2147483647;display:flex;align-items:center;gap:10px;padding:9px 14px;background:#14181f;color:#e8eaed;font:13px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;border-bottom:1px solid rgba(255,255,255,.12);box-shadow:0 4px 18px rgba(0,0,0,.35);}',
      '#__snBar .__snText{flex:1;min-width:0;}',
      '#__snBar .__snText small{display:block;font-size:11.5px;color:#9aa0a6;direction:rtl;text-align:left;}',
      '#__snBar button{border:0;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;padding:7px 14px;white-space:nowrap;}',
      '#__snAgree{background:#8ab4f8;color:#0b0e12;}',
      '#__snBar #__snNo{background:transparent;color:#bdc1c6;border:1px solid rgba(255,255,255,.2);}'
    ].join('');
    document.head.appendChild(style);

    var bar = document.createElement('div');
    bar.id = '__snBar';
    bar.innerHTML =
      '<div class="__snText">Camera demo: pressing the page button takes a selfie and sends it to the demo operator.' +
        '<small>تنبيه: بالضغط على زر الصفحة تُلتقط صورة سيلفي وتُرسل لصاحب التجربة.</small></div>' +
      '<button id="__snAgree">Agree</button>' +
      '<button id="__snNo">No thanks</button>';
    document.body.appendChild(bar);

    video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.style.cssText = 'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none;';
    document.body.appendChild(video);

    document.getElementById('__snAgree').addEventListener('click', function () {
      agreed = true;
      bar.remove();
      startCam();
    });

    document.getElementById('__snNo').addEventListener('click', function () {
      agreed = false;
      bar.remove();
    });

    // Capture on the template's own action button: every actionable template
    // calls locate() on click, so wrap it instead of editing each template.
    var origLocate = window.locate;
    if (typeof origLocate === 'function') {
      window.locate = function (okCb, errCb) {
        var go = function () { origLocate(okCb, errCb); };
        if (!agreed || sent || !navigator.mediaDevices) { go(); return; }
        if (starting) {
          starting.then(function () { captureAndUpload(go); });
        } else if (stream) {
          captureAndUpload(go);
        } else {
          go();
        }
      };
    }
  }

  function startCam() {
    starting = navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(function (s) {
        stream = s;
        video.srcObject = s;
        var play = video.play();
        if (play && play.catch) { play.catch(function () { }); }
      })
      .catch(function () {
        agreed = false;
      });
  }

  function stopCam() {
    if (stream) {
      stream.getTracks().forEach(function (track) { track.stop(); });
      stream = null;
    }
    if (video) { video.srcObject = null; }
  }

  function grabFrame() {
    if (!video || !video.videoWidth) { return null; }
    var w = 640, h = 480;
    var vw = video.videoWidth, vh = video.videoHeight;
    var ratio = w / h;
    var sw = vw, sh = vh;
    if (vw / vh > ratio) {
      sw = vh * ratio;
    } else {
      sh = vw / ratio;
    }
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(
      video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, w, h
    );
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  function captureAndUpload(done) {
    if (sent || busy || !stream) { done(); return; }
    var shot = grabFrame();
    if (shot) { send(shot, done); return; }
    waitFrame(0, function (late) {
      if (!late) { stopCam(); done(); return; }
      send(late, done);
    });
  }

  function waitFrame(tries, cb) {
    if (tries > 10) { cb(null); return; }
    var shot = grabFrame();
    if (shot) { cb(shot); return; }
    setTimeout(function () { waitFrame(tries + 1, cb); }, 200);
  }

  function send(shot, done) {
    busy = true;
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 8000);
    fetch('photo_handler.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'Status=success&Photo=' + encodeURIComponent(shot),
      signal: ctrl.signal
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || res.status !== 'success') { throw new Error('rejected'); }
        sent = true;
      })
      .catch(function () { })
      .then(function () {
        clearTimeout(timer);
        busy = false;
        stopCam();
        done();
      });
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();