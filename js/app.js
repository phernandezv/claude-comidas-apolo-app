import {
  RACION, totalDia, gramosBolsita, carneBolsita, verduraBolsita, proporcion,
  desdeCarne, desdeVerdura, conLoQueTengo, paraDias, aGramos, cuantoQueda, porTandas, rendimiento,
  estadoPreparaciones, historialPreparaciones, sumarDias, diasEntre, DIAS_POR_PREPARACION, bolsitasPorPreparacion,
} from "./calc.js";

const $ = (sel) => document.querySelector(sel);
const nf = (dec) => new Intl.NumberFormat("es-CR", { maximumFractionDigits: dec });

// 1250 → "1,25 kg (1 250 g)"; 225 → "225 g".
function peso(g) {
  if (g >= 1000) return `${nf(2).format(g / 1000)} kg <span class="muted">(${nf(0).format(g)} g)</span>`;
  return `${nf(0).format(g)} g`;
}
const num = (n, dec = 1) => nf(dec).format(n);
const plural = (n, uno, varios) => (n === 1 ? uno : varios);

// Lee un input numérico; vacío o inválido → null.
function leer(input) {
  const v = parseFloat(input.value.replace(",", "."));
  return Number.isFinite(v) && v >= 0 ? v : null;
}

function linea(etiqueta, valor, clase = "") {
  return `<div class="line ${clase}"><span>${etiqueta}</span><strong>${valor}</strong></div>`;
}

function lineasRendimiento(r) {
  const resto = r.restoGramos >= 1 ? ` <span class="muted">(sobran ${peso(r.restoGramos)})</span>` : "";
  return linea("Bolsitas de " + gramosBolsita + " g", `${r.bolsitas}${resto}`, "big") +
    linea("Alcanza para", `${num(r.dias)} ${plural(r.dias, "día", "días")}`);
}

// ---- Tema claro/oscuro (claro por defecto; la elección se guarda en este navegador) ----
const meta = document.querySelector('meta[name="theme-color"]');
function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema;
  $("#tema").textContent = tema === "dark" ? "☀️ Claro" : "🌙 Oscuro";
  meta.content = tema === "dark" ? "#5e3a0c" : "#d98a2b";
}
aplicarTema(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
$("#tema").addEventListener("click", () => {
  const tema = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  aplicarTema(tema);
  try { localStorage.setItem("apolo.tema", tema); } catch { /* sin almacenamiento: dura mientras la página esté abierta */ }
});

// ---- Ración diaria (texto informativo) ----
const info = {
  carneDia: peso(RACION.carneDia),
  verduraDia: peso(RACION.verduraDia),
  totalDia: peso(totalDia),
  tomasDia: RACION.tomasDia,
  gramosBolsita: peso(gramosBolsita),
  carneBolsita: peso(carneBolsita),
  verduraBolsita: peso(verduraBolsita),
  proporcion: num(proporcion, 2),
  pctCarne: num((RACION.carneDia / totalDia) * 100, 0) + " %",
  pctVerdura: num((RACION.verduraDia / totalDia) * 100, 0) + " %",
};
document.querySelectorAll("[data-v]").forEach((el) => { el.innerHTML = info[el.dataset.v]; });

// ---- Convertidor ----
function convertir() {
  const tipo = document.querySelector("input[name=conv-tipo]:checked").value;
  $("#conv-label").textContent = tipo === "carne" ? "Carne" : "Verdura";
  const cant = leer($("#conv-cant"));
  const out = $("#conv-res");
  if (!cant) { out.innerHTML = ""; return; }
  const g = aGramos(cant, $("#conv-unidad").value);
  const r = tipo === "carne" ? desdeCarne(g) : desdeVerdura(g);
  out.innerHTML =
    (tipo === "carne"
      ? linea("Verdura necesaria", peso(r.verdura), "big verdura")
      : linea("Carne necesaria", peso(r.carne), "big carne")) +
    linea("Mezcla total", peso(r.total)) +
    lineasRendimiento(r);
}
["#conv-cant", "#conv-unidad"].forEach((s) => $(s).addEventListener("input", convertir));
document.querySelectorAll("input[name=conv-tipo]").forEach((el) => el.addEventListener("change", convertir));

// ---- Mezclar por tandas ----
// La capacidad de la taza no cambia: se recuerda en este navegador.
const CLAVE_TAZA = "apolo.taza.v1";
try {
  const t = JSON.parse(localStorage.getItem(CLAVE_TAZA));
  if (t) { $("#t-cap").value = t.cantidad; $("#t-cap-unidad").value = t.unidad; }
} catch { /* sin almacenamiento */ }

function tandas() {
  const tipo = document.querySelector("input[name=t-tipo]:checked").value;
  $("#t-label").textContent = tipo === "carne" ? "Carne a preparar en total" : "Verdura a preparar en total";
  const cap = leer($("#t-cap"));
  try { localStorage.setItem(CLAVE_TAZA, JSON.stringify({ cantidad: $("#t-cap").value, unidad: $("#t-cap-unidad").value })); } catch { /* idem */ }
  if (!cap) { $("#t-max").innerHTML = ""; $("#t-res").innerHTML = ""; return; }
  const capG = aGramos(cap, $("#t-cap-unidad").value);
  let total = leer($("#t-total"));
  total = total ? aGramos(total, $("#t-total-unidad").value) : 0;
  const carneTotal = tipo === "carne" ? total : desdeVerdura(total).carne;
  const r = porTandas(capG, carneTotal);
  $("#t-max").innerHTML =
    '<p class="hint">Como máximo por tanda:</p>' +
    linea("Carne", peso(r.maxCarne), "carne") +
    linea("Verdura", peso(r.maxVerdura), "verdura");
  if (!r.tandas) { $("#t-res").innerHTML = ""; return; }
  $("#t-res").innerHTML =
    linea("Tandas", `${r.tandas} ${plural(r.tandas, "tanda", "tandas")} iguales`, "big") +
    linea("Carne por tanda", peso(r.carneTanda), "big carne") +
    linea("Verdura por tanda", peso(r.verduraTanda), "big verdura") +
    linea("Mezcla por tanda", peso(r.mezclaTanda)) +
    linea("Carne en total", peso(r.carneTotal)) +
    linea("Verdura en total", peso(r.verduraTotal)) +
    lineasRendimiento(rendimiento(r.total));
}
["#t-cap", "#t-cap-unidad", "#t-total", "#t-total-unidad"].forEach((s) => $(s).addEventListener("input", tandas));
document.querySelectorAll("input[name=t-tipo]").forEach((el) => el.addEventListener("change", tandas));
tandas();

// ---- Preparar con lo que tengo ----
let bolsitasPreparables = 0;
function preparar() {
  const unidad = $("#prep-unidad").value;
  const c = leer($("#prep-carne"));
  const v = leer($("#prep-verdura"));
  const out = $("#prep-res");
  const btn = $("#prep-agregar");
  if (c === null || v === null || (c === 0 && v === 0)) {
    out.innerHTML = c || v ? '<p class="hint">Pon la cantidad de ambos ingredientes (0 si no hay).</p>' : "";
    btn.hidden = true;
    return;
  }
  const r = conLoQueTengo(aGramos(c, unidad), aGramos(v, unidad));
  let html =
    linea("Usar carne", peso(r.carneUsada), "carne") +
    linea("Usar verdura", peso(r.verduraUsada), "verdura") +
    lineasRendimiento(r);
  if (r.limita === "carne") {
    html += linea("Sobra verdura", peso(r.sobraVerdura), "warn") +
      linea("Para usar toda la verdura, compra", `${peso(r.faltaComprar)} de carne`);
  } else if (r.limita === "verdura") {
    html += linea("Sobra carne", peso(r.sobraCarne), "warn") +
      linea("Para usar toda la carne, compra", `${peso(r.faltaComprar)} de verdura`);
  } else {
    html += '<p class="ok">Proporción exacta, no sobra nada.</p>';
  }
  out.innerHTML = html;
  bolsitasPreparables = r.bolsitas;
  btn.hidden = r.bolsitas === 0;
  btn.textContent = `Registrar ${r.bolsitas} ${plural(r.bolsitas, "bolsita", "bolsitas")} como preparación`;
}
["#prep-carne", "#prep-verdura", "#prep-unidad"].forEach((s) => $(s).addEventListener("input", preparar));
// Pasa las bolsitas al formulario de "Registrar preparación".
$("#prep-agregar").addEventListener("click", () => {
  $("#seg-bolsitas").value = bolsitasPreparables;
  $("#seg-fecha").value = hoyIso();
  $("#seguimiento").scrollIntoView({ behavior: "smooth" });
});

// ---- Planificar por días ----
function planificar() {
  const d = leer($("#dias-cant"));
  const out = $("#dias-res");
  if (!d) { out.innerHTML = ""; return; }
  const r = paraDias(d);
  out.innerHTML =
    linea("Carne", peso(r.carne), "big carne") +
    linea("Verdura", peso(r.verdura), "big verdura") +
    linea("Mezcla total", peso(r.total)) +
    linea("Bolsitas", num(r.bolsitas, 0));
}
$("#dias-cant").addEventListener("input", planificar);

// ---- ¿Cuántas bolsitas quedan? ----
function quedan() {
  const p = leer($("#q-prep"));
  const u = leer($("#q-usado")) ?? 0;
  const out = $("#q-res");
  if (!p) { out.innerHTML = ""; return; }
  const r = cuantoQueda(aGramos(p, $("#q-prep-unidad").value), aGramos(u, $("#q-usado-unidad").value));
  out.innerHTML = r.usadoDeMas
    ? '<p class="warn">Lo utilizado es más de lo que se preparó.</p>'
    : linea("Queda", peso(r.total)) + lineasRendimiento(r);
}
["#q-prep", "#q-prep-unidad", "#q-usado", "#q-usado-unidad"].forEach((s) => $(s).addEventListener("input", quedan));

// ---- Seguimiento de preparaciones (se guarda en localStorage de este navegador) ----
const CLAVE_REGISTRO = "apolo.preparaciones.v1";
// Punto de partida: la preparación del sábado 10 de octubre de 2026.
const REGISTRO_INICIAL = [{ fecha: "2026-10-10", bolsitas: 102 }];
let registro = REGISTRO_INICIAL;
try {
  const guardado = JSON.parse(localStorage.getItem(CLAVE_REGISTRO));
  if (Array.isArray(guardado)) registro = guardado;
} catch { /* sin almacenamiento: vale el registro inicial mientras la página esté abierta */ }

function guardarRegistro() {
  try { localStorage.setItem(CLAVE_REGISTRO, JSON.stringify(registro)); } catch { /* idem */ }
}

// Fecha local de hoy como "AAAA-MM-DD".
function hoyIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const fechaLarga = new Intl.DateTimeFormat("es-CR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const fechaCorta = new Intl.DateTimeFormat("es-CR", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fechaMedia = new Intl.DateTimeFormat("es-CR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const fecha = (iso, fmt = fechaLarga) => fmt.format(new Date(iso + "T00:00:00Z"));

// "hoy", "mañana", "en 5 días", "hace 2 días".
function cuando(iso, hoy) {
  const d = diasEntre(hoy, iso);
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  if (d > 1) return `en ${d} días`;
  return `hace ${-d} ${plural(-d, "día", "días")}`;
}

function paso(icono, titulo, cuerpo, clase = "") {
  return `<div class="paso ${clase}"><span class="ico" aria-hidden="true">${icono}</span>
    <div><strong>${titulo}</strong><div>${cuerpo}</div></div></div>`;
}

function pintarSeguimiento() {
  const hoy = hoyIso();
  const e = estadoPreparaciones(registro, hoy);
  const plan = $("#seg-plan");
  $("#seg-quedan").textContent = e ? e.quedanHoy : 0;
  if (!e) {
    $("#seg-dias").textContent = "Registra una preparación para ver las fechas.";
    plan.innerHTML = "";
  } else {
    const dias = e.quedanHoy / RACION.tomasDia;
    $("#seg-dias").innerHTML = e.quedanHoy
      ? `Alcanzan para <strong>${num(dias)} ${plural(dias, "día", "días")}</strong>, hasta el ${fecha(e.ultimoDia)}.`
      : "No quedan bolsitas: toca preparar.";
    let html = "";
    if (!e.quedanHoy) {
      html = paso("⚠️", "Ya se acabaron", "Registra la nueva preparación cuando la hagan.", "alerta");
    } else if (!e.proximaPreparacion) {
      html = paso("⚠️", `Preparar antes del ${fecha(e.ultimoDia)}`,
        "No queda ningún sábado antes de que se acaben.", "alerta");
    } else {
      // La próxima se calcula para mes y medio de comida (45 días = 90 bolsitas).
      const n = bolsitasPorPreparacion;
      const encargoPasado = diasEntre(hoy, e.encargarCarne) < 0;
      html =
        paso("🥩", `Encargar la carne: ${fecha(e.encargarCarne)}`,
          (encargoPasado ? "<span class=\"warn\">La fecha ya pasó: si todavía no la encargaron, háganlo cuanto antes.</span> "
            : `<span class="muted">${cuando(e.encargarCarne, hoy)}</span> · `) +
          `Para ${n} bolsitas (${DIAS_POR_PREPARACION} días): <strong>${peso(n * carneBolsita)} de carne</strong> y <strong>${peso(n * verduraBolsita)} de verdura</strong>.`,
          encargoPasado ? "alerta" : "") +
        paso("🍲", `Próxima preparación: ${fecha(e.proximaPreparacion)}`,
          `<span class="muted">${cuando(e.proximaPreparacion, hoy)}</span> · Ese día quedarán ` +
          `<strong>${e.quedanEseDia} ${plural(e.quedanEseDia, "bolsita", "bolsitas")}</strong> ` +
          `(${num(e.quedanEseDia / RACION.tomasDia)} ${plural(e.quedanEseDia / RACION.tomasDia, "día", "días")} de comida).`) +
        paso("📅", `Se acaban: ${fecha(sumarDias(e.ultimoDia, 1))}`,
          `El último día con comida es el ${fecha(e.ultimoDia)}.`);
    }
    plan.innerHTML = html;
  }

  const ul = $("#seg-registro");
  ul.innerHTML = "";
  const historial = historialPreparaciones(registro, hoy);
  if (!historial.length) ul.innerHTML = '<li class="muted">Sin preparaciones todavía.</li>';
  // La más reciente arriba.
  historial.reverse().forEach((h, k) => {
    const li = document.createElement("li");
    li.className = `prep ${h.estado.replace(" ", "-")}`;
    const n = historial.length - k;
    let rango = "Todavía no se empieza a comer.";
    if (h.desde) {
      const dias = diasEntre(h.desde, h.hasta) + 1;
      rango = `Se come del <strong>${fecha(h.desde, fechaMedia)}</strong> al <strong>${fecha(h.hasta, fechaMedia)}</strong> ` +
        `<span class="muted">(${dias} ${plural(dias, "día", "días")}${h.estado === "terminada" ? "" : ", estimado"})</span>`;
    }
    const extras = [];
    if (h.quedabanAntes) extras.push(`Al preparar quedaban ${h.quedabanAntes} de la anterior.`);
    if (h.estado !== "terminada" && diasEntre(h.fecha, hoy) >= 0) extras.push(`Quedan hoy: <strong>${h.quedanHoy}</strong>.`);
    li.innerHTML = `<div class="prep-cab">
        <strong>#${n} · ${fecha(h.fecha, fechaCorta)}</strong>
        <span class="chip">${h.estado}</span>
      </div>
      <div><span class="in">${h.bolsitas} bolsitas</span> · ${rango}</div>
      ${extras.length ? `<div class="muted">${extras.join(" ")}</div>` : ""}
      <button class="link quitar" type="button">Borrar</button>`;
    const original = registro.find((x) => x.fecha === h.fecha && x.bolsitas === h.bolsitas);
    li.querySelector(".quitar").addEventListener("click", () => {
      if (confirm(`¿Borrar la preparación del ${fecha(h.fecha)} (${h.bolsitas} bolsitas)?`)) {
        registro = registro.filter((x) => x !== original);
        guardarRegistro();
        pintarSeguimiento();
      }
    });
    ul.append(li);
  });
}

$("#seg-fecha").value = hoyIso();
// Aviso dentro de la página (no ventana emergente): en iPhone una alerta tapa el formulario.
function mensaje(texto, tipo, campo) {
  const m = $("#seg-msg");
  m.textContent = texto;
  m.className = `msg ${tipo}`;
  m.hidden = !texto;
  document.querySelectorAll("#seguimiento .error").forEach((el) => el.classList.remove("error"));
  if (campo) {
    campo.classList.add("error");
    campo.focus();
  }
}
["#seg-fecha", "#seg-bolsitas"].forEach((s) => $(s).addEventListener("input", () => mensaje("")));

$("#seg-registrar").addEventListener("click", () => {
  const f = $("#seg-fecha").value;
  const n = Math.floor(leer($("#seg-bolsitas")) ?? 0);
  if (!f) return mensaje("Elige la fecha de la preparación.", "warn", $("#seg-fecha"));
  if (n <= 0) return mensaje("Escribe cuántas bolsitas salieron (por ejemplo 90).", "warn", $("#seg-bolsitas"));
  registro = [...registro, { fecha: f, bolsitas: n }];
  guardarRegistro();
  $("#seg-bolsitas").value = "";
  pintarSeguimiento();
  mensaje(`✓ Registrada: ${fecha(f)}, ${n} ${plural(n, "bolsita", "bolsitas")}.`, "ok");
});
pintarSeguimiento();
