/* WhatsApp de El Ombú: enlaces con mensaje pre-rellenado y, en encargar.html,
   un formulario que compone el encargo completo (tienda, día, hora de recogida
   y cuántas empanadas de cada sabor) con el total aproximado.

   Los mensajes que se envían van SIN emojis: al pasar por el enlace de WhatsApp,
   algunos dispositivos (WhatsApp de escritorio, móviles antiguos) los reciben
   como "?". En su lugar se usa el formato propio de WhatsApp (*negrita*). */
(function () {
  var PHONE = "34674384559";
  var DEFAULT_MSG = "¡Hola El Ombú! Quería hacer un encargo de empanadas.";

  // Horario de recogida por tienda (minutos desde las 00:00). 0 = domingo ... 6 = sábado.
  // Carretería: lunes a miércoles 11:00 a 23:30, jueves a sábado 10:30 a 00:00, domingo 10:30 a 23:30.
  // Victoria: abre a las 11:30; hasta confirmar su cierre se ofrecen horas hasta las 23:00.
  var TIENDAS = {
    carreteria: {
      label: "Calle Carretería, 86",
      horario: { 0: [630, 1410], 1: [660, 1410], 2: [660, 1410], 3: [660, 1410], 4: [630, 1440], 5: [630, 1440], 6: [630, 1440] }
    },
    victoria: {
      label: "Calle Victoria, 65",
      horario: { 0: [690, 1380], 1: [690, 1380], 2: [690, 1380], 3: [690, 1380], 4: [690, 1380], 5: [690, 1380], 6: [690, 1380] }
    }
  };
  var STEP = 15;
  var MARGEN = 30; // minutos que necesitamos para tener listo un encargo

  // Quita cualquier emoji o pictograma que se cuele en un mensaje
  var EMOJI_RE = /(?:[←-⯿☀-➿️‍⃣]|[\uD83C-\uDBFF][\uDC00-\uDFFF])/g;

  function cleanMessage(message) {
    return message
      .replace(EMOJI_RE, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  function buildLink(message) {
    return "https://api.whatsapp.com/send?phone=" + PHONE + "&text=" + encodeURIComponent(cleanMessage(message));
  }

  document.querySelectorAll("[data-wa]").forEach(function (el) {
    var message = el.getAttribute("data-wa-message") || DEFAULT_MSG;
    el.setAttribute("href", buildLink(message));
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener");
  });

  /* ---- Formulario de encargo ---- */
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function toISODate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseISO(iso) { var p = iso.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function prettyDate(iso) { var d = parseISO(iso); return DIAS[d.getDay()] + " " + d.getDate() + " de " + MESES[d.getMonth()]; }
  function euros(n) { return n.toFixed(2).replace(".", ",") + " €"; }
  function hhmm(m) { return pad(Math.floor(m / 60) % 24) + ":" + pad(m % 60); }

  function currentTienda(form) {
    var input = form.querySelector('input[name="tienda"]:checked');
    return input && TIENDAS[input.value] ? input.value : "carreteria";
  }

  function fillTimes(form, iso) {
    var select = form.hora;
    var previous = select.value;
    var tramo = TIENDAS[currentTienda(form)].horario[iso ? parseISO(iso).getDay() : -1];
    if (!tramo) {
      select.innerHTML = '<option value="">Elige primero el día</option>';
      return;
    }
    var now = new Date();
    var isToday = iso === toISODate(now);
    var minutesNow = now.getHours() * 60 + now.getMinutes();
    select.innerHTML = '<option value="">Elige la hora</option>';
    for (var m = tramo[0] + MARGEN; m <= tramo[1] - 15; m += STEP) {
      if (isToday && m < minutesNow + MARGEN) continue;
      var opt = document.createElement("option");
      opt.value = hhmm(m);
      opt.textContent = hhmm(m);
      select.appendChild(opt);
    }
    if (select.options.length === 1) select.innerHTML = '<option value="">Ya no quedan horas hoy</option>';
    if (previous && select.querySelector('option[value="' + previous + '"]')) select.value = previous;
  }

  // Lee los contadores de sabores: [{ name, price, qty }]
  function readFlavors(form) {
    return Array.prototype.map.call(form.querySelectorAll(".flavor"), function (row) {
      return {
        name: row.getAttribute("data-name"),
        price: parseFloat(row.getAttribute("data-price")) || 0,
        qty: parseInt(row.querySelector("input").value, 10) || 0
      };
    });
  }

  function composeMessage(form) {
    var items = readFlavors(form).filter(function (f) { return f.qty > 0; });
    var total = 0, count = 0;
    items.forEach(function (f) { total += f.qty * f.price; count += f.qty; });
    var data = {
      nombre: form.nombre.value.trim(),
      tienda: TIENDAS[currentTienda(form)].label,
      fecha: form.fecha.value,
      hora: form.hora.value,
      notas: form.notas.value.trim(),
      items: items, total: total, count: count
    };
    var lines = ["¡Hola El Ombú! Quiero hacer un encargo para recoger:", ""];
    lines.push("*Nombre:* " + (data.nombre || "..."));
    lines.push("*Tienda:* " + data.tienda);
    lines.push("*Día:* " + (data.fecha ? prettyDate(data.fecha) : "..."));
    lines.push("*Hora de recogida:* " + (data.hora || "..."));
    lines.push("");
    if (items.length) {
      lines.push("*Empanadas (" + count + "):*");
      items.forEach(function (f) { lines.push("- " + f.qty + " x " + f.name); });
      lines.push("", "*Total aproximado:* " + euros(total));
    } else {
      lines.push("*Empanadas:* ...");
    }
    if (data.notas) lines.push("*Notas:* " + cleanMessage(data.notas));
    lines.push("", "¿Me lo confirmáis? ¡Gracias!");
    return { text: lines.join("\n"), data: data };
  }

  function firstDay(from) {
    var d = new Date(from);
    var tramo = TIENDAS.carreteria.horario[d.getDay()];
    var mins = d.getHours() * 60 + d.getMinutes();
    if (mins > tramo[1] - 15 - MARGEN * 2) d.setDate(d.getDate() + 1);
    return d;
  }

  document.querySelectorAll(".js-order-form").forEach(function (form) {
    var dateInput = form.fecha;
    var preview = form.querySelector(".reserve-form__preview");
    var error = form.querySelector(".reserve-form__error");
    var totalEl = form.querySelector("[data-order-total]");
    var countEl = form.querySelector("[data-order-count]");

    var today = new Date();
    var max = new Date();
    max.setMonth(max.getMonth() + 2);
    dateInput.min = toISODate(today);
    dateInput.max = toISODate(max);
    if (!dateInput.value) dateInput.value = toISODate(firstDay(today));

    // Preselección de tienda desde la URL: encargar.html?tienda=victoria
    try {
      var pre = new URLSearchParams(window.location.search).get("tienda");
      var preInput = pre && form.querySelector('input[name="tienda"][value="' + pre + '"]');
      if (preInput) preInput.checked = true;
    } catch (e) {}

    fillTimes(form, dateInput.value);

    // Botones + y - de cada sabor
    form.querySelectorAll(".flavor").forEach(function (row) {
      var input = row.querySelector("input");
      row.querySelectorAll("[data-step]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var v = (parseInt(input.value, 10) || 0) + parseInt(btn.getAttribute("data-step"), 10);
          input.value = Math.max(0, Math.min(99, v));
          input.dispatchEvent(new Event("input", { bubbles: true }));
        });
      });
    });

    function refresh() {
      var result = composeMessage(form);
      form.querySelectorAll(".flavor").forEach(function (row) {
        row.classList.toggle("is-picked", (parseInt(row.querySelector("input").value, 10) || 0) > 0);
      });
      if (totalEl) totalEl.textContent = euros(result.data.total);
      if (countEl) countEl.textContent = result.data.count + (result.data.count === 1 ? " empanada" : " empanadas");
      if (!preview) return;
      // Vista previa como la verá la tienda: *texto* en negrita, igual que WhatsApp
      preview.textContent = "";
      result.text.split(/(\*[^*\n]+\*)/).forEach(function (part) {
        if (/^\*[^*\n]+\*$/.test(part)) {
          var b = document.createElement("strong");
          b.textContent = part.slice(1, -1);
          preview.appendChild(b);
        } else {
          preview.appendChild(document.createTextNode(part));
        }
      });
    }

    dateInput.addEventListener("change", function () { fillTimes(form, dateInput.value); refresh(); });
    form.querySelectorAll('input[name="tienda"]').forEach(function (input) {
      input.addEventListener("change", function () { fillTimes(form, dateInput.value); refresh(); });
    });
    form.addEventListener("input", refresh);
    form.addEventListener("change", refresh);
    refresh();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var result = composeMessage(form);
      var d = result.data;
      var missing = [];
      if (!d.nombre) missing.push("tu nombre");
      if (!d.fecha) missing.push("el día");
      if (!d.hora) missing.push("la hora de recogida");
      if (!d.count) missing.push("al menos una empanada");
      if (missing.length) {
        if (error) error.textContent = "Nos falta " + missing.join(", ") + ".";
        return;
      }
      if (error) error.textContent = "";
      var link = buildLink(result.text);
      // Sin "noopener" en features: con él window.open devuelve siempre null
      // y no sabríamos si el navegador bloqueó la pestaña.
      var win = window.open(link, "_blank");
      if (win) win.opener = null;
      else window.location.href = link;
    });
  });
})();
