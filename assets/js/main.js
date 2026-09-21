/* Zacs Hills Estate · page behaviour. No dependencies. */
(function () {
  'use strict';

  var WHATSAPP = 'https://wa.me/917358790580';
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var wa = function (text) { return WHATSAPP + '?text=' + encodeURIComponent(text); };

  /* ---------------------------------------------------------- Scroll reveal */
  // First, so the failsafe in <head> is only cancelled once reveals really work.

  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    reveals.forEach(function (el) { revealer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }
  clearTimeout(window.zvRevealFailsafe);

  /* ------------------------------------------------------------- Hero film */
  // After the reference page: the poster carries the first paint and the source is
  // attached by script once the page has loaded, so the video never competes with
  // fonts and styles. Autoplays muted on every width; pauses while scrolled out of
  // view; starts paused (poster only, nothing downloaded) under reduced motion.

  var film = $('[data-hero-video]');
  var filmToggle = $('[data-hero-toggle]');
  if (film && filmToggle) {
    var conn = navigator.connection || {};
    var slow = conn.saveData || /(^|slow-)2g|3g/.test(conn.effectiveType || '');
    var wantPlay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var heroInView = true;
    var pageLoaded = document.readyState === 'complete';

    var syncToggle = function () {
      filmToggle.hidden = false;
      filmToggle.classList.toggle('is-paused', !wantPlay);
      filmToggle.setAttribute('aria-label', wantPlay ? 'Pause the film' : 'Play the film');
    };

    var applyFilm = function () {
      if (wantPlay && heroInView && pageLoaded) {
        if (!film.getAttribute('src')) {
          // Wide screens get 1080p; phones, tablets and slow connections get 720p.
          var small = window.innerWidth < 1280 || slow;
          film.src = film.getAttribute(small ? 'data-src-small' : 'data-src');
        }
        var started = film.play();
        if (started && started.catch) {
          started.catch(function () { wantPlay = false; syncToggle(); }); // autoplay refused
        }
      } else if (!film.paused) {
        film.pause();
      }
    };

    filmToggle.addEventListener('click', function () {
      wantPlay = !wantPlay;
      syncToggle();
      applyFilm();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        heroInView = entries[0].isIntersecting;
        applyFilm();
      }).observe(film.closest('.hero'));
    }

    if (!pageLoaded) {
      window.addEventListener('load', function () { pageLoaded = true; applyFilm(); }, { once: true });
    }
    syncToggle();
    applyFilm();
  }

  /* ---------------------------------------------------------------- Header */

  var header = $('.site-header');
  var onScroll = function () { header.classList.toggle('is-stuck', window.scrollY > 8); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ----------------------------------------------------------- Mobile menu */

  var toggle = $('.menu-toggle');
  var menu = $('#mobile-menu');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    document.documentElement.classList.toggle('menu-open', open);
  }

  toggle.addEventListener('click', function () {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      toggle.focus();
    }
  });
  var wide = window.matchMedia('(min-width: 1200px)');
  var onWide = function (e) { if (e.matches) setMenu(false); };
  if (wide.addEventListener) wide.addEventListener('change', onWide);

  /* ------------------------------------------------ Current section in nav */

  var navLinks = $$('.site-nav a');
  if ('IntersectionObserver' in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
        var link = byId[entry.target.id];
        if (link) link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section[id]').forEach(function (s) { spy.observe(s); });
  }

  /* ------------------------------------ Floating WhatsApp over the footer */

  var float = $('.wa-float');
  var footer = $('.site-footer');
  if (float && footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      float.classList.toggle('is-away', entries[0].isIntersecting);
    }).observe(footer);
  }

  /* ----------------------------------------------------------- Plot picker */

  var plots = $$('.plot');
  var currentPlot = $('[data-plot-current]');
  plots.forEach(function (btn) {
    btn.addEventListener('click', function () {
      plots.forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      currentPlot.textContent = btn.getAttribute('data-plot');
    });
  });

  /* ------------------------------------------------------ Master plan view */

  var dialog = $('#plan-dialog');
  var canvas = $('[data-zoom-target]', dialog);
  var zoomIn = $('[data-zoom="in"]', dialog);
  var zoomOut = $('[data-zoom="out"]', dialog);
  var zoom = 1;
  var opener = null;

  function setZoom(value) {
    zoom = Math.min(2, Math.max(1, Math.round(value * 10) / 10));
    canvas.style.setProperty('--zoom', zoom);
    zoomOut.setAttribute('aria-disabled', String(zoom <= 1));
    zoomIn.setAttribute('aria-disabled', String(zoom >= 2));
  }

  function openPlan(e) {
    e.preventDefault();
    opener = e.currentTarget;
    setZoom(1);
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function closePlan() {
    if (typeof dialog.close === 'function') dialog.close();
    else { dialog.removeAttribute('open'); if (opener) opener.focus(); }
  }

  $$('[data-open-plan]').forEach(function (el) { el.addEventListener('click', openPlan); });
  zoomIn.addEventListener('click', function () { setZoom(zoom + 0.2); });
  zoomOut.addEventListener('click', function () { setZoom(zoom - 0.2); });
  $('[data-close]', dialog).addEventListener('click', closePlan);
  // A click on the backdrop lands on the dialog element itself.
  dialog.addEventListener('click', function (e) { if (e.target === dialog) closePlan(); });
  dialog.addEventListener('close', function () { if (opener) opener.focus(); });

  /* ------------------------------------------------------- Capital planner */

  var calc = $('[data-calc]');
  if (calc) {
    var inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    var cents = $('#calc-cents', calc);
    var sqft = $('#calc-sqft', calc);
    var occupancy = $('#calc-occ', calc);
    var quote = $('[data-quote]', calc);
    var out = function (key) { return $('[data-out="' + key + '"]', calc); };

    var fill = function (input) {
      var pct = (input.value - input.min) / (input.max - input.min) * 100;
      input.style.setProperty('--fill', pct + '%');
    };

    var update = function () {
      var c = Number(cents.value);
      var u = Number(sqft.value);
      var f = Number(occupancy.value);

      var plotCost = c * 250000;               // ₹2.5 lakh per cent
      var villaCost = u * 4000;                // ₹4,000 per sq ft
      var total = plotCost + villaCost;
      var rental = Math.round(f / 55 * 650000 * (u / 1800));

      out('cents').textContent = c + ' cents';
      out('sqft').textContent = u.toLocaleString('en-IN') + ' sq ft';
      out('occ').textContent = f + '%';
      out('plot').textContent = inr.format(plotCost);
      out('villa').textContent = inr.format(villaCost);
      out('total').textContent = inr.format(total);
      out('rental').textContent = inr.format(rental);

      quote.href = wa('Hello, please send me an investment quote for a ' + c + ' cent plot and ' + u + ' sq ft villa at Zacs Hills Estate.');
      [cents, sqft, occupancy].forEach(fill);
    };

    [cents, sqft, occupancy].forEach(function (input) { input.addEventListener('input', update); });
    update();
  }

  /* -------------------------------------------------- Site visit enquiry */

  var form = $('[data-enquiry]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var message = 'Hello, I am interested in Zacs Hills Estate.\n\n' +
        'Name: ' + data.get('name') + '\n' +
        'Phone: ' + data.get('phone') + '\n' +
        'Preferred site visit: ' + (data.get('date') || 'Flexible') + '\n' +
        'Interest: ' + data.get('interest');
      $('[data-submit-label]', form).textContent = 'Message ready — open WhatsApp';
      window.open(wa(message), '_blank', 'noopener,noreferrer');
    });
  }

  /* -------------------------------------------------------------- FAQ */

  // One answer open at a time. Native with <details name>, enforced here
  // for browsers that predate it.
  var faqs = $$('.faq details');
  faqs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      faqs.forEach(function (other) { if (other !== d && other.open) other.open = false; });
    });
  });
})();
