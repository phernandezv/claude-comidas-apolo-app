// Pruebas de los cálculos. Correr con: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  totalDia, gramosBolsita, carneBolsita, verduraBolsita, proporcion,
  desdeCarne, desdeVerdura, conLoQueTengo, paraDias, aGramos, cuantoQueda, porTandas,
  estadoPreparaciones, sumarDias, diasEntre, diaSemana, bolsitasPorPreparacion,
  historialPreparaciones,
} from "../js/calc.js";

const cerca = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≠ ${b}`);

test("ración diaria: 350 + 100 = 450 g en 2 bolsitas de 225 g", () => {
  assert.equal(totalDia, 450);
  assert.equal(gramosBolsita, 225);
  assert.equal(carneBolsita, 175);
  assert.equal(verduraBolsita, 50);
  assert.equal(proporcion, 3.5);
});

test("desde carne: 3,5 kg de carne → 1 kg de verdura, 20 bolsitas, 10 días", () => {
  const r = desdeCarne(3500);
  cerca(r.verdura, 1000);
  cerca(r.total, 4500);
  assert.equal(r.bolsitas, 20);
  cerca(r.dias, 10);
  cerca(r.restoGramos, 0);
});

test("desde verdura: 1 kg de verdura → 3,5 kg de carne", () => {
  cerca(desdeVerdura(1000).carne, 3500);
});

test("desde carne con resto: 1 kg de carne → 285,7 g verdura, 5 bolsitas y sobra", () => {
  const r = desdeCarne(1000);
  cerca(r.verdura, 1000 / 3.5);
  assert.equal(r.bolsitas, 5);
  cerca(r.restoGramos, 1000 + 1000 / 3.5 - 5 * 225);
});

test("con lo que tengo: falta carne", () => {
  const r = conLoQueTengo(3000, 1000);
  assert.equal(r.limita, "carne");
  cerca(r.carneUsada, 3000);
  cerca(r.verduraUsada, 3000 / 3.5);
  cerca(r.sobraVerdura, 1000 - 3000 / 3.5);
  cerca(r.faltaComprar, 500);
});

test("con lo que tengo: falta verdura", () => {
  const r = conLoQueTengo(3500, 800);
  assert.equal(r.limita, "verdura");
  cerca(r.sobraCarne, 3500 - 2800);
  cerca(r.faltaComprar, 200);
  assert.equal(r.bolsitas, 16);
});

test("con lo que tengo: proporción exacta", () => {
  const r = conLoQueTengo(700, 200);
  assert.equal(r.limita, null);
  assert.equal(r.bolsitas, 4);
});

test("para días: 7 días", () => {
  assert.deepEqual(paraDias(7), { carne: 2450, verdura: 700, total: 3150, bolsitas: 14 });
});

test("conversión de unidades", () => {
  assert.equal(aGramos(2, "kg"), 2000);
  assert.equal(aGramos(3, "bolsitas"), 675);
  assert.equal(aGramos(1, "dias"), 450);
  assert.equal(aGramos(500, "g"), 500);
});

test("cuánto queda: 20 bolsitas preparadas, 3 días usados → 14 bolsitas", () => {
  const r = cuantoQueda(aGramos(20, "bolsitas"), aGramos(3, "dias"));
  assert.equal(r.bolsitas, 14);
  cerca(r.dias, 7);
  assert.equal(r.usadoDeMas, false);
});

test("cuánto queda: usado de más", () => {
  const r = cuantoQueda(1000, 2000);
  assert.equal(r.usadoDeMas, true);
  assert.equal(r.bolsitas, 0);
});

test("por tandas: taza de 1,5 kg, 3,5 kg de carne → 3 tandas de 1,17 kg carne + 333 g verdura", () => {
  const r = porTandas(1500, 3500);
  cerca(r.maxCarne, 1500 * 350 / 450);
  cerca(r.maxVerdura, 1500 * 100 / 450);
  assert.equal(r.tandas, 3);
  cerca(r.carneTanda, 3500 / 3);
  cerca(r.verduraTanda, 1000 / 3);
  cerca(r.mezclaTanda, 1500);
});

test("por tandas: si cabe todo es una sola tanda", () => {
  const r = porTandas(2000, 700);
  assert.equal(r.tandas, 1);
  cerca(r.verduraTanda, 200);
});

test("por tandas: solo capacidad → máximos por tanda", () => {
  const r = porTandas(900);
  cerca(r.maxCarne, 700);
  cerca(r.maxVerdura, 200);
  assert.equal(r.tandas, undefined);
});

test("calendario: 102 bolsitas el sábado 10 oct 2026", () => {
  const reg = [{ fecha: "2026-10-10", bolsitas: 102 }];
  const r = estadoPreparaciones(reg, "2026-10-10");
  assert.equal(r.quedanHoy, 102);
  assert.equal(r.ultimoDia, "2026-11-30"); // 51 días, comiendo desde el 11 oct
  assert.equal(r.proximaPreparacion, "2026-11-28"); // sábado antes de que se acaben
  assert.equal(r.quedanEseDia, 6); // 28, 29 y 30 nov
  assert.equal(r.encargarCarne, "2026-11-14"); // dos sábados antes
  assert.equal(estadoPreparaciones(reg, "2026-10-11").quedanHoy, 100);
  assert.equal(estadoPreparaciones(reg, "2026-11-01").quedanHoy, 102 - 2 * 22);
});

test("calendario: lo que sobra se suma a la siguiente preparación", () => {
  const reg = [{ fecha: "2026-10-10", bolsitas: 102 }, { fecha: "2026-11-28", bolsitas: 100 }];
  const r = estadoPreparaciones(reg, "2026-11-28");
  assert.equal(r.quedanHoy, 4 + 100); // al cerrar el 28: quedaban 6, comió 2, + 100
  assert.equal(r.ultimoDia, sumarDias("2026-11-28", 52));
});

test("calendario: ya se acabaron", () => {
  const r = estadoPreparaciones([{ fecha: "2026-10-10", bolsitas: 4 }], "2026-10-20");
  assert.equal(r.quedanHoy, 0);
  assert.equal(r.proximaPreparacion, null);
});

test("calendario: sin sábado a tiempo", () => {
  // Domingo 11 oct con 6 bolsitas: alcanzan hasta el miércoles 14, no hay sábado antes.
  const r = estadoPreparaciones([{ fecha: "2026-10-11", bolsitas: 6 }], "2026-10-11");
  assert.equal(r.ultimoDia, "2026-10-14");
  assert.equal(r.proximaPreparacion, null);
});

test("fechas: días entre y día de la semana", () => {
  assert.equal(diasEntre("2026-10-10", "2026-11-30"), 51);
  assert.equal(diaSemana("2026-10-10"), 6);
  assert.equal(sumarDias("2026-12-31", 1), "2027-01-01");
});

test("próxima preparación: 90 bolsitas = 45 días = 15,75 kg carne + 4,5 kg verdura", () => {
  assert.equal(bolsitasPorPreparacion, 90);
  assert.equal(bolsitasPorPreparacion * carneBolsita, 15750);
  assert.equal(bolsitasPorPreparacion * verduraBolsita, 4500);
});

test("historial: cada preparación con su rango de fechas", () => {
  const reg = [{ fecha: "2026-10-10", bolsitas: 102 }, { fecha: "2026-11-28", bolsitas: 90 }];
  const h = historialPreparaciones(reg, "2026-12-05");
  assert.equal(h.length, 2);
  assert.deepEqual(
    { desde: h[0].desde, hasta: h[0].hasta, estado: h[0].estado, quedanHoy: h[0].quedanHoy },
    { desde: "2026-10-11", hasta: "2026-11-30", estado: "terminada", quedanHoy: 0 },
  );
  // Al cerrar el 28 nov quedaban 4 de la anterior (29 y 30 nov); la nueva arranca el 1 dic.
  assert.equal(h[1].quedabanAntes, 4);
  assert.equal(h[1].desde, "2026-12-01");
  assert.equal(h[1].hasta, sumarDias("2026-12-01", 44)); // 90 bolsitas = 45 días
  assert.equal(h[1].estado, "en curso");
  assert.equal(h[1].quedanHoy, 90 - 2 * 5); // 1 al 5 dic
  // El total coincide con el estado general.
  assert.equal(h[0].quedanHoy + h[1].quedanHoy, estadoPreparaciones(reg, "2026-12-05").quedanHoy);
});

test("historial: la nueva queda en espera mientras se come la anterior", () => {
  const reg = [{ fecha: "2026-10-10", bolsitas: 102 }, { fecha: "2026-11-28", bolsitas: 90 }];
  const h = historialPreparaciones(reg, "2026-11-29");
  assert.equal(h[0].estado, "en curso");
  assert.equal(h[1].estado, "en espera");
  assert.equal(h[0].quedanHoy, 2);
  assert.equal(h[1].quedanHoy, 90);
});
