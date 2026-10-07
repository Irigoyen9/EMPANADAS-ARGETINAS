(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---- Pantalla de carga con la firma (solo la primera vez en la sesión) ---- */
  var loader = document.querySelector(".loader");
  var introDelay = 0;
  if (loader) {
    var seen = false;
    try { seen = sessionStorage.getItem("ombu-intro") === "1"; sessionStorage.setItem("ombu-intro", "1"); } catch (e) {}
    if (seen || reduceMotion) {
      loader.remove();
    } else {
      introDelay = 1.5;
      var hideLoader = function () {
        loader.classList.add("is-done");
        setTimeout(function () { loader.remove(); }, 900);
      };
      setTimeout(hideLoader, 1600);
    }
  }

  /* ---- Nombre del hero: cada letra entra girando en 3D ---- */
  var heroTitle = document.querySelector("[data-letters]");
  if (heroTitle && !reduceMotion) {
    var heroText = heroTitle.textContent.trim();
    heroTitle.setAttribute("aria-label", heroText);
    heroTitle.textContent = "";
    var letterDelay = introDelay + 0.15;
    // Cada palabra va en su propio bloque para que el título nunca se parta a mitad de palabra
    heroText.split(" ").forEach(function (word, i) {
      if (i > 0) heroTitle.appendChild(document.createTextNode(" "));
      var wordSpan = document.createElement("span");
      wordSpan.className = "letter-word";
      wordSpan.setAttribute("aria-hidden", "true");
      word.split("").forEach(function (ch) {
        var span = document.createElement("span");
        span.className = "letter";
        span.textContent = ch;
        span.style.animationDelay = letterDelay.toFixed(2) + "s";
        letterDelay += 0.07;
        wordSpan.appendChild(span);
      });
      heroTitle.appendChild(wordSpan);
    });
  }

  /* ---- Claim del hero: palabra a palabra ---- */
  document.querySelectorAll("[data-words]").forEach(function (el) {
    if (reduceMotion) return;
    var words = el.textContent.trim().split(/\s+/);
    var delay = introDelay + 0.9;
    el.setAttribute("aria-label", el.textContent.trim());
    el.textContent = "";
    words.forEach(function (w, i) {
      var span = document.createElement("span");
      span.className = "word";
      span.setAttribute("aria-hidden", "true");
      span.textContent = w;
      span.style.animationDelay = (delay + i * 0.08).toFixed(2) + "s";
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
  });

  /* ---- Tilt 3D genérico: [data-tilt] (con brillo si hay .service-card__glare) ---- */
  if (!reduceMotion && canHover) {
    document.querySelectorAll("[data-tilt]").forEach(function (el) {
      var max = parseFloat(el.getAttribute("data-tilt")) || 10;
      var glare = el.querySelector(".service-card__glare");
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "perspective(1000px) rotateX(" + (-y * max).toFixed(2) + "deg) rotateY(" + (x * max * 1.2).toFixed(2) + "deg) translateZ(10px)";
        if (glare) {
          glare.style.setProperty("--gx", ((x + 0.5) * 100).toFixed(1) + "%");
          glare.style.setProperty("--gy", ((y + 0.5) * 100).toFixed(1) + "%");
        }
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* ---- Botones magnéticos ---- */
  if (!reduceMotion && canHover) {
    document.querySelectorAll("[data-magnetic]").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        btn.style.transform = "translate(" + (x * 0.22).toFixed(1) + "px," + (y * 0.3).toFixed(1) + "px)";
      });
      btn.addEventListener("mouseleave", function () { btn.style.transform = ""; });
    });
  }

  /* ---- Cursor personalizado ---- */
  if (!reduceMotion && canHover) {
    var ring = document.createElement("div");
    var dot = document.createElement("div");
    ring.className = "cursor";
    dot.className = "cursor-dot";
    document.body.appendChild(ring);
    document.body.appendChild(dot);
    var mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate(" + mx + "px," + my + "px)";
      document.documentElement.classList.add("has-cursor");
    }, { passive: true });
    document.addEventListener("mouseleave", function () { document.documentElement.classList.remove("has-cursor"); });
    (function follow() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = "translate(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px)";
      requestAnimationFrame(follow);
    })();
    document.querySelectorAll("a, button, .flip-card, .gallery-grid figure, .chip, .pizarra").forEach(function (el) {
      el.addEventListener("mouseenter", function () { ring.classList.add("is-hover"); });
      el.addEventListener("mouseleave", function () { ring.classList.remove("is-hover"); });
    });
  }

  /* ---- Tarjetas que se voltean: en táctil, con un toque ---- */
  document.querySelectorAll(".flip-card").forEach(function (card) {
    card.addEventListener("click", function (e) {
      if (e.target.closest("a")) return;
      if (!canHover) card.classList.toggle("is-flipped");
    });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.classList.toggle("is-flipped"); }
    });
  });

  /* ---- Header: fondo al hacer scroll + barra de progreso + menú móvil ---- */
  var header = document.querySelector(".header");
  var progress = document.querySelector(".scroll-progress");
  var navToggle = document.querySelector(".header__nav-toggle");
  var nav = document.querySelector(".header__nav");

  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 40);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = "scaleX(" + (max > 0 ? y / max : 0).toFixed(4) + ")";
    }
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      document.body.style.overflow = isOpen ? "hidden" : "";
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---- Reveal on scroll (mejora progresiva: si algo falla, todo queda visible) ---- */
  try {
    var revealEls = document.querySelectorAll(".reveal, .reveal-3d, .reveal-zoom");
    if ("IntersectionObserver" in window && revealEls.length) {
      document.documentElement.classList.add("reveal-armed");
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      revealEls.forEach(function (el) { io.observe(el); });
      // Red de seguridad: nada se queda oculto para siempre
      setTimeout(function () {
        revealEls.forEach(function (el) { el.classList.add("is-visible"); });
      }, 4000);
    }
  } catch (err) {
    document.documentElement.classList.remove("reveal-armed");
  }

  /* ---- Contadores animados ---- */
  var counters = document.querySelectorAll("[data-count]");
  function formatNum(v, decimals) {
    return decimals ? v.toFixed(decimals).replace(".", ",") : Math.round(v).toLocaleString("es-ES");
  }
  function runCounter(el) {
    var end = parseFloat(el.getAttribute("data-count"));
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduceMotion) { el.textContent = prefix + formatNum(end, decimals) + suffix; return; }
    var start = null;
    var dur = 1800;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = prefix + formatNum(end * eased, decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (counters.length) {
    if ("IntersectionObserver" in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { runCounter(entry.target); cio.unobserve(entry.target); }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (c) { cio.observe(c); });
    } else {
      counters.forEach(runCounter);
    }
  }

  /* ---- Móvil de Instagram: gira con el scroll y el ratón ---- */
  var phone = document.querySelector(".phone");
  if (phone && !reduceMotion) {
    var pmx = 0, pmy = 0;
    var scene = phone.parentElement;
    if (canHover) {
      scene.addEventListener("mousemove", function (e) {
        var r = scene.getBoundingClientRect();
        pmx = (e.clientX - r.left) / r.width - 0.5;
        pmy = (e.clientY - r.top) / r.height - 0.5;
        updatePhone();
      });
      scene.addEventListener("mouseleave", function () { pmx = 0; pmy = 0; updatePhone(); });
    }
    function updatePhone() {
      var r = phone.getBoundingClientRect();
      var p = (r.top + r.height / 2) / window.innerHeight - 0.5;
      var ry = -22 + p * 30 + pmx * 26;
      var rxx = 8 - p * 10 - pmy * 16;
      phone.style.transform = "rotateY(" + ry.toFixed(2) + "deg) rotateX(" + rxx.toFixed(2) + "deg) rotateZ(2deg)";
    }
    window.addEventListener("scroll", updatePhone, { passive: true });
    updatePhone();
  }

  /* ---- Horario: marca el día de hoy y si está abierto ahora ---- */
  // 0 = domingo ... 6 = sábado. Tramos en minutos desde las 00:00.
  // Tienda de calle Carretería: lunes a miércoles 11:00 a 23:30 · jueves a sábado 10:30 a 00:00 · domingo 10:30 a 23:30
  var HORARIO = { 0: [[630, 1410]], 1: [[660, 1410]], 2: [[660, 1410]], 3: [[660, 1410]], 4: [[630, 1440]], 5: [[630, 1440]], 6: [[630, 1440]] };
  var now = new Date();
  var today = now.getDay();
  var mins = now.getHours() * 60 + now.getMinutes();
  document.querySelectorAll(".hours-table tr[data-days]").forEach(function (tr) {
    var days = tr.getAttribute("data-days").split(",").map(Number);
    if (days.indexOf(today) !== -1) tr.classList.add("is-today");
  });
  var isOpen = (HORARIO[today] || []).some(function (t) { return mins >= t[0] && mins < t[1]; });
  document.querySelectorAll(".open-status").forEach(function (el) {
    el.classList.toggle("is-open", isOpen);
    el.textContent = isOpen ? "Abierto ahora" : "Cerrado ahora";
  });

  /* ---- Galería: lightbox ---- */
  var galleryImgs = document.querySelectorAll(".gallery-grid img");
  var lightbox = document.querySelector(".lightbox");
  if (galleryImgs.length && lightbox) {
    var lightboxImg = lightbox.querySelector("img");
    var closeBtn = lightbox.querySelector(".lightbox__close");
    galleryImgs.forEach(function (img) {
      img.addEventListener("click", function () {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.classList.add("is-open");
      });
    });
    var closeLightbox = function () { lightbox.classList.remove("is-open"); };
    closeBtn.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLightbox(); });
  }

  /* ---- Carta: resaltar la categoría activa al hacer scroll ---- */
  var menuNavLinks = document.querySelectorAll(".menu-nav a");
  var menuSections = document.querySelectorAll(".menu-section");
  if (menuNavLinks.length && menuSections.length && "IntersectionObserver" in window) {
    var menuIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.getAttribute("id");
          menuNavLinks.forEach(function (link) {
            var active = link.getAttribute("href") === "#" + id;
            link.classList.toggle("is-active", active);
            if (active && link.scrollIntoView && window.innerWidth < 900) {
              link.parentElement.scrollTo({ left: link.offsetLeft - 20, behavior: "smooth" });
            }
          });
        }
      });
    }, { rootMargin: "-40% 0px -50% 0px" });
    menuSections.forEach(function (section) { menuIo.observe(section); });
  }

  /* ---- Carrusel 3D (auto-giro + arrastre + botones) ---- */
  document.querySelectorAll(".carousel3d").forEach(function (root) {
    var ringEl = root.querySelector(".carousel3d__ring");
    var cards = ringEl ? ringEl.querySelectorAll(".carousel3d__card") : [];
    if (!cards.length) return;
    var n = cards.length;
    var step = 360 / n;
    var angle = 0, target = 0;
    var dragging = false, hovering = false, visible = true;
    var lastX = 0;
    var auto = reduceMotion ? 0 : 0.12;

    function layout() {
      var w = Math.min(270, Math.max(165, root.clientWidth * 0.25));
      root.style.setProperty("--card-w", w + "px");
      var radius = Math.round((w / 2) / Math.tan(Math.PI / n)) + 40;
      cards.forEach(function (card, i) {
        card.style.transform = "rotateY(" + i * step + "deg) translateZ(" + radius + "px)";
      });
      ringEl.dataset.radius = radius;
    }
    layout();
    window.addEventListener("resize", layout);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(root);
    }

    function render() {
      if (visible) {
        if (!dragging && !hovering) target -= auto;
        angle += (target - angle) * 0.08;
        ringEl.style.transform = "translateZ(-" + ringEl.dataset.radius + "px) rotateY(" + angle + "deg)";
      }
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    root.addEventListener("pointerdown", function (e) {
      dragging = true; lastX = e.clientX; root.classList.add("is-dragging");
    });
    window.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      target += (e.clientX - lastX) * 0.35;
      lastX = e.clientX;
    });
    window.addEventListener("pointerup", function () {
      if (!dragging) return;
      dragging = false; root.classList.remove("is-dragging");
      target = Math.round(target / step) * step;
    });
    if (canHover) {
      root.addEventListener("mouseenter", function () { hovering = true; });
      root.addEventListener("mouseleave", function () { hovering = false; });
    }

    var section = root.parentElement;
    var prev = section.querySelector("[data-carousel-prev]");
    var next = section.querySelector("[data-carousel-next]");
    if (prev) prev.addEventListener("click", function () { target = Math.round(target / step) * step + step; });
    if (next) next.addEventListener("click", function () { target = Math.round(target / step) * step - step; });
  });

  /* ---- Año del footer ---- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
