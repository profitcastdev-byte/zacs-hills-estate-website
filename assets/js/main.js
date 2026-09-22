/* Zacs Hills Estate · page behaviour. No dependencies. */
(function () {
  'use strict';

  var WHATSAPP = 'https://wa.me/917358790580';
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var wa = function (text) { return WHATSAPP + '?text=' + encodeURIComponent(text); };

  /* ------------------------------------------------------------- Tracking */
  // GA4 for reporting, Google Ads for bidding. The descriptive event and the
  // conversion go out as two separate gtag calls: Ads counts the event
  // literally named "conversion" against the label in send_to, and send_to on
  // the descriptive event keeps the custom name out of the Ads account.
  //
  // Deliberately not the copy-and-paste snippets from the Ads interface. The
  // Thank You snippet there fires on page load of a separate thank you page,
  // and this form never navigates away, so pasted as given it would have
  // counted a conversion for every visitor who merely opened the page. The
  // call and WhatsApp snippets each define a function named
  // gtag_report_conversion, so pasting both would leave the second
  // overwriting the first and report every phone tap as a WhatsApp click.
  //
  // No event_callback redirect dance: every WhatsApp CTA opens in a new tab
  // and tel: hands off to the dialer, so the page is never unloaded and
  // delaying the click would only risk swallowing it.

  var GA4_ID = 'G-88KZC3RMY5';
  var ADS_CONVERSIONS = {
    hills_enquiry_submit: 'AW-762151354/5_ouCPiS1N0cELqDtusC',
    hills_call_click:     'AW-762151354/1-N3CM7S0d0cELqDtusC',
    hills_whatsapp_click: 'AW-762151354/a1pvCKX81N0cELqDtusC'
  };

  function track(name, params) {
    var payload = params || {};

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: name }, payload));

    if (typeof window.gtag !== 'function') return;

    window.gtag('event', name, Object.assign({ send_to: GA4_ID }, payload));

    var label = ADS_CONVERSIONS[name];
    if (label) {
      window.gtag('event', 'conversion', { send_to: label, value: 1.0, currency: 'INR' });
    }
  }

  // Delegated, because the calculator rewrites its own WhatsApp href as the
  // numbers change and every CTA wraps its label in an icon that is the real
  // click target. The section id rides along so the report says which CTA won.
  document.addEventListener('click', function (e) {
    var el = e.target;
    if (!el || typeof el.closest !== 'function') return;

    var link = el.closest('a[href]');
    if (!link) return;

    var href = link.getAttribute('href') || '';
    var section = link.closest('section[id]');
    var where = section ? section.id : 'chrome';

    if (href.indexOf(WHATSAPP) === 0) {
      track('hills_whatsapp_click', { link_section: where });
    } else if (href.indexOf('tel:') === 0) {
      track('hills_call_click', { link_section: where });
    }
  });

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
  // view; stays on the poster under reduced motion, and on the poster for good if
  // the browser refuses to autoplay, since there is no longer a control to offer.

  var film = $('[data-hero-video]');
  if (film) {
    var conn = navigator.connection || {};
    var slow = conn.saveData || /(^|slow-)2g|3g/.test(conn.effectiveType || '');
    var wantPlay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var heroInView = true;
    var pageLoaded = document.readyState === 'complete';

    var applyFilm = function () {
      if (wantPlay && heroInView && pageLoaded) {
        if (!film.getAttribute('src')) {
          // Wide screens get 1080p; phones, tablets and slow connections get 720p.
          var small = window.innerWidth < 1280 || slow;
          film.src = film.getAttribute(small ? 'data-src-small' : 'data-src');
        }
        var started = film.play();
        if (started && started.catch) {
          started.catch(function () { wantPlay = false; }); // autoplay refused; the poster stands in
        }
      } else if (!film.paused) {
        film.pause();
      }
    };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        heroInView = entries[0].isIntersecting;
        applyFilm();
      }).observe(film.closest('.hero'));
    }

    if (!pageLoaded) {
      window.addEventListener('load', function () { pageLoaded = true; applyFilm(); }, { once: true });
    }
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

  // Ad attribution, read once on arrival and kept for the session. Captured up
  // front rather than at submit time so the values are the ones the visitor
  // actually landed on, whatever rewrites the URL between arriving and filling
  // the form in.
  var ATTRIBUTION_KEY = 'zhe_attribution';

  function attribution() {
    var stored = null;
    try { stored = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || 'null'); } catch (err) { /* private mode */ }
    if (stored) return stored;

    var q = new URLSearchParams(location.search);
    var fresh = {
      gclid: q.get('gclid') || '',
      utm_source: q.get('utm_source') || '',
      utm_medium: q.get('utm_medium') || '',
      utm_campaign: q.get('utm_campaign') || '',
      utm_term: q.get('utm_term') || '',
      referrer: document.referrer || ''
    };
    try { sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(fresh)); } catch (err) { /* private mode */ }
    return fresh;
  }

  // Fire and forget, on purpose. The same click opens WhatsApp in a new tab, so
  // this one is racing a context switch: sendBeacon is built for exactly that
  // and returns immediately. FormData posts as multipart, which is a CORS
  // safelisted request, so there is no preflight for an Apps Script web app to
  // fail to answer. Nothing here is allowed to delay the WhatsApp handoff,
  // which is the conversion that actually matters.
  function sendLead(endpoint, data) {
    if (!endpoint) return;

    var attr = attribution();
    for (var key in attr) {
      if (Object.prototype.hasOwnProperty.call(attr, key) && attr[key]) data.append(key, attr[key]);
    }
    data.append('page', 'zacs-hills-estate');

    if (navigator.sendBeacon && navigator.sendBeacon(endpoint, data)) return;
    fetch(endpoint, { method: 'POST', body: data, keepalive: true, mode: 'no-cors' })
      .catch(function () { /* the lead still reaches the team over WhatsApp */ });
  }

  var form = $('[data-enquiry]');
  if (form) {
    attribution();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var message = 'Hello, I am interested in Zacs Hills Estate.\n\n' +
        'Name: ' + data.get('name') + '\n' +
        'Phone: ' + data.get('phone') + '\n' +
        'Preferred site visit: ' + (data.get('date') || 'Flexible') + '\n' +
        'Interest: ' + data.get('interest');
      track('hills_enquiry_submit', { interest: data.get('interest') || '' });
      sendLead(form.getAttribute('data-endpoint'), data);
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
