import {
  RACION, totalDia, gramosBolsita, carneBolsita, verduraBolsita, proporcion,
  desdeCarne, desdeVerdura, conLoQueTengo, paraDias, aGramos, cuantoQueda,
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
  btn.textContent = `Agregar ${r.bolsitas} ${plural(r.bolsitas, "bolsita", "bolsitas")} al congelador`;
}
["#prep-carne", "#prep-verdura", "#prep-unidad"].forEach((s) => $(s).addEventListener("input", preparar));
$("#prep-agregar").addEventListener("click", () => {
  movimiento(bolsitasPreparables, "Preparación");
  $("#inventario").scrollIntoView({ behavior: "smooth" });
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

// ---- Inventario (se guarda en localStorage de este navegador) ----
const CLAVE = "apolo.inventario.v1";
let inv = { bolsitas: 0, historial: [] };
try {
  const guardado = JSON.parse(localStorage.getItem(CLAVE));
  if (guardado && Number.isFinite(guardado.bolsitas)) inv = guardado;
} catch { /* sin almacenamiento disponible: el conteo vive solo mientras la página esté abierta */ }

function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(inv)); } catch { /* idem */ }
}

function movimiento(cambio, motivo) {
  if (!cambio) return;
  inv.bolsitas = Math.max(0, inv.bolsitas + cambio);
  inv.historial.unshift({ fecha: new Date().toISOString(), cambio, motivo, saldo: inv.bolsitas });
  inv.historial = inv.historial.slice(0, 50);
  guardar();
  pintarInventario();
}

const fechaFmt = new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" });
function pintarInventario() {
  $("#inv-count").textContent = inv.bolsitas;
  const dias = inv.bolsitas / RACION.tomasDia;
  $("#inv-dias").innerHTML = inv.bolsitas
    ? `Alcanza para <strong>${num(dias)} ${plural(dias, "día", "días")}</strong> · ${peso(inv.bolsitas * gramosBolsita)} de comida.`
    : "No quedan bolsitas: toca preparar.";
  $("#inv-dias").classList.toggle("warn", inv.bolsitas <= RACION.tomasDia * 2);
  const ul = $("#inv-historial");
  ul.innerHTML = "";
  if (!inv.historial.length) {
    ul.innerHTML = '<li class="muted">Sin movimientos todavía.</li>';
    return;
  }
  for (const m of inv.historial.slice(0, 15)) {
    const li = document.createElement("li");
    const signo = m.cambio > 0 ? "+" : "−";
    li.innerHTML = `<span class="muted">${fechaFmt.format(new Date(m.fecha))}</span>
      <span class="${m.cambio > 0 ? "in" : "out"}">${signo}${Math.abs(m.cambio)}</span>
      <span class="muted">quedan ${m.saldo}</span>`;
    li.prepend(document.createTextNode(m.motivo + " "));
    ul.append(li);
  }
}

document.querySelectorAll("[data-usar]").forEach((b) =>
  b.addEventListener("click", () => {
    const n = Math.min(Number(b.dataset.usar), inv.bolsitas);
    movimiento(-n, "Usada");
  }));
$("#inv-agregar").addEventListener("click", () => {
  const n = Math.floor(leer($("#inv-nuevas")) ?? 0);
  if (n > 0) {
    movimiento(n, "Preparación");
    $("#inv-nuevas").value = "";
  }
});
$("#inv-reiniciar").addEventListener("click", () => {
  if (confirm("¿Borrar el conteo de bolsitas y el historial?")) {
    inv = { bolsitas: 0, historial: [] };
    guardar();
    pintarInventario();
  }
});
pintarInventario();
