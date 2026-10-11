// Pruebas de los cálculos. Correr con: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  totalDia, gramosBolsita, carneBolsita, verduraBolsita, proporcion,
  desdeCarne, desdeVerdura, conLoQueTengo, paraDias, aGramos, cuantoQueda, porTandas,
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
