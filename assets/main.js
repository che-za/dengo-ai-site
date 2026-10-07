/* Dengo AI — svetainės scenarijus.
   1) Pokalbio pavyzdys pirmame ekrane: klientas rašo žinutę įvesties lauke,
      asistentas „galvoja“ ~4 s (kaip tikras), pokalbį galima slinkti.
      Jei naršyklėje įjungta „mažinti judesį“, iš karto rodoma galutinė būsena.
   2) Greitos navigacijos meniu viršuje užsidaro paspaudus nuorodą, šalia arba Esc. */
(function () {
  /* ---------- Meniu ---------- */
  var menu = document.querySelector('.menu');
  if (menu) {
    menu.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.menu__panel a')) menu.removeAttribute('open');
    });
    document.addEventListener('click', function (e) {
      if (menu.hasAttribute('open') && !menu.contains(e.target)) menu.removeAttribute('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.hasAttribute('open')) {
        menu.removeAttribute('open');
        menu.querySelector('summary').focus();
      }
    });
  }

  /* ---------- Pokalbio pavyzdys ---------- */
  var demo = document.querySelector('[data-demo]');
  if (!demo) return;

  var body = demo.querySelector('.chat-body');
  var field = demo.querySelector('[data-field]');
  var placeholder = field ? field.textContent : '';
  var steps = Array.prototype.slice.call(demo.querySelectorAll('[data-step]'));
  steps.sort(function (a, b) { return +a.getAttribute('data-step') - +b.getAttribute('data-step'); });

  var SPEED = { charMin: 45, charMax: 100 };   // ~14 simbolių per sekundę
  var PAUSE = {
    beforeTyping: 1100,  // kol klientas pradeda rašyti
    afterTyping: 450,    // nuo paskutinės raidės iki „siųsti“
    beforeThinking: 400, // kol pasirodo „asistentas rašo“
    thinking: 4000,      // tiek vidutiniškai galvoja tikras asistentas
    beforeNotice: 1200
  };

  function kind(el) {
    if (el.classList.contains('msg--typing')) return 'typing';
    if (el.classList.contains('msg--bot')) return 'bot';
    if (el.classList.contains('notice')) return 'notice';
    return 'me';
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function nearBottom() { return body.scrollHeight - body.scrollTop - body.clientHeight < 80; }
  function toBottom(smooth) {
    if (body.scrollTo) body.scrollTo({ top: body.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    else body.scrollTop = body.scrollHeight;
  }
  function show(el) {
    var stick = nearBottom();
    el.classList.add('is-on');
    if (stick) toBottom(true);   // jei lankytojas paslinko aukštyn, netrukdome
  }

  function showFinal() {
    steps.forEach(function (el) {
      if (kind(el) === 'typing') el.classList.remove('is-on');
      else el.classList.add('is-on');
    });
    toBottom(false);
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !field || !window.Promise) { showFinal(); return; }

  function typeText(text) {
    field.textContent = '';
    field.classList.add('is-typing');
    var i = 0;
    return new Promise(function (done) {
      (function next() {
        if (i >= text.length) { done(); return; }
        field.textContent += text.charAt(i++);
        field.scrollTop = field.scrollHeight;
        setTimeout(next, SPEED.charMin + Math.random() * (SPEED.charMax - SPEED.charMin));
      })();
    });
  }
  function clearField() {
    field.classList.remove('is-typing');
    field.textContent = placeholder;
  }

  var typingEl = null;
  function run(i) {
    if (i >= steps.length) return;
    var el = steps[i], k = kind(el), p;
    if (k === 'me') {
      p = wait(PAUSE.beforeTyping)
        .then(function () { return typeText(el.textContent.trim()); })
        .then(function () { return wait(PAUSE.afterTyping); })
        .then(function () { clearField(); show(el); });
    } else if (k === 'typing') {
      p = wait(PAUSE.beforeThinking).then(function () { typingEl = el; show(el); });
    } else if (k === 'bot') {
      // data-think: patvirtinimą po „Taip“ siunčia programos kodas, todėl jis ateina beveik iš karto
      var think = +(el.getAttribute('data-think') || PAUSE.thinking);
      p = wait(think).then(function () {
        if (typingEl) { typingEl.classList.remove('is-on'); typingEl = null; }
        show(el);
      });
    } else {
      p = wait(PAUSE.beforeNotice).then(function () { el.classList.add('is-on'); });
    }
    p.then(function () { run(i + 1); });
  }

  var started = false;
  function start() { if (!started) { started = true; run(0); } }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { start(); io.disconnect(); } });
    }, { threshold: 0.4 });
    io.observe(demo.querySelector('.phone') || demo);
  } else {
    start();
  }
})();
