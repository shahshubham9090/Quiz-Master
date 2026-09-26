(function () {
  var root = document.documentElement;

  // Footer year
  document.querySelectorAll('.year, #year').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Theme toggle: remembers the visitor's choice, otherwise follows the system.
  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var current = root.getAttribute('data-theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // Header border once the page scrolls
  var header = document.querySelector('header.site');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Scroll reveal
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // Role tabs (arrow keys move between tabs, as per the ARIA tabs pattern)
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function select(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
      if (on) panel.classList.add('in');
    });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(tab); });
    tab.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      var next = tabs[(i + dir + tabs.length) % tabs.length];
      select(next);
      next.focus();
    });
  });
})();

// Live hero demo: the phone mockup answers quiz questions on a loop.
(function () {
  var card = document.getElementById('demo');
  if (!card) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var QUESTIONS = [
    { q: 'Which memory is erased when power is off?', o: ['ROM', 'RAM', 'Hard disk'], a: 1, pick: 0 },
    { q: '1 byte is equal to…', o: ['4 bits', '8 bits', '16 bits'], a: 1 },
    { q: 'Which of these is an input device?', o: ['Monitor', 'Printer', 'Keyboard'], a: 2 },
    { q: 'What does CPU stand for?', o: ['Central Processing Unit', 'Computer Power Unit', 'Central Program Utility'], a: 0 },
    { q: 'Which device connects different networks?', o: ['Hub', 'Router', 'Repeater'], a: 1 },
    { q: 'What does HTML stand for?', o: ['Hyper Tool Markup Language', 'HyperText Markup Language', 'Home Text Making Language'], a: 1 }
  ];
  var TOTAL = 20;

  var box = document.getElementById('demo-q');
  var tap = document.getElementById('demo-tap');
  var plus = document.getElementById('demo-plus');
  var pointsEl = document.getElementById('demo-points');
  var countEl = document.getElementById('demo-count');
  var timerEl = document.getElementById('demo-timer');
  var bar = document.getElementById('demo-bar');

  var points = 1240, number = 4, index = 0, seconds = 8 * 60 + 42;
  var visible = false;

  // Only animate while the phone is on screen and the tab is visible.
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(card);
  function active() { return visible && !document.hidden; }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function wait(ms) {
    await sleep(ms);
    while (!active()) await sleep(400);
  }

  setInterval(function () {
    if (!active() || seconds <= 0) return;
    seconds--;
    var m = Math.floor(seconds / 60), s = seconds % 60;
    timerEl.textContent = '⏱ ' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    timerEl.classList.toggle('low', seconds < 60);
  }, 1000);

  function render(item) {
    box.innerHTML = '<h5></h5>' + item.o.map(function () { return '<div class="opt"><span></span></div>'; }).join('');
    box.querySelector('h5').textContent = item.q;
    box.querySelectorAll('.opt span').forEach(function (s, i) { s.textContent = item.o[i]; });
    countEl.textContent = 'Question ' + number + ' of ' + TOTAL;
    bar.style.width = (number / TOTAL * 100) + '%';
  }

  function moveTapTo(el) {
    var c = card.getBoundingClientRect(), r = el.getBoundingClientRect();
    tap.style.left = (r.left - c.left + r.width * 0.72) + 'px';
    tap.style.top = (r.top - c.top + r.height / 2) + 'px';
  }

  function mark(el, cls, symbol) {
    el.classList.remove('pressed');
    el.classList.add(cls);
    var i = document.createElement('i');
    i.className = 'mk';
    i.textContent = symbol;
    el.appendChild(i);
  }

  function countUp(from, to) {
    var start = performance.now();
    pointsEl.classList.add('bump');
    (function frame(now) {
      var t = Math.min((now - start) / 500, 1);
      pointsEl.textContent = Math.round(from + (to - from) * t).toLocaleString('en-US');
      if (t < 1) requestAnimationFrame(frame);
      else pointsEl.classList.remove('bump');
    })(start);
  }

  async function tapOption(el) {
    moveTapTo(el);
    tap.classList.add('show');
    await sleep(600);
    tap.classList.remove('click');
    void tap.offsetWidth; // restart the ripple animation
    tap.classList.add('click');
    el.classList.add('pressed');
    await sleep(220);
    setTimeout(function () { tap.classList.remove('show'); }, 350);
  }

  async function play() {
    await wait(2200); // let visitors read the static first question
    for (;;) {
      // Slide the current question out and the next one in.
      box.classList.add('out');
      tap.classList.remove('show');
      await sleep(380);
      number = number >= TOTAL ? 1 : number + 1;
      if (number === 1) { seconds = 15 * 60; }
      var item = QUESTIONS[index++ % QUESTIONS.length];
      render(item);
      box.classList.remove('out');
      box.classList.add('pre');
      void box.offsetWidth;
      box.classList.remove('pre');

      await wait(1300); // "reading" the question
      var opts = box.querySelectorAll('.opt');
      var correct = opts[item.a];

      if (item.pick !== undefined && item.pick !== item.a) {
        await tapOption(opts[item.pick]);
        mark(opts[item.pick], 'wrong', '✗');
        await sleep(650);
        mark(correct, 'right', '✓');
      } else {
        await tapOption(correct);
        mark(correct, 'right', '✓');
        plus.classList.remove('go');
        plus.style.top = (correct.getBoundingClientRect().top - card.getBoundingClientRect().top) + 'px';
        void plus.offsetWidth;
        plus.classList.add('go');
        countUp(points, points + 10);
        points += 10;
      }
      await wait(1800);
    }
  }

  play();
})();
