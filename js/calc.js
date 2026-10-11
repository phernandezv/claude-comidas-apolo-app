// Cálculos puros de la ración de Apolo (sin acceso al DOM), para poder probarlos aparte.
// Todas las cantidades se manejan en gramos.

// Ración diaria de Apolo. Si el veterinario cambia la dieta, se ajusta solo aquí.
export const RACION = {
  carneDia: 350, // g de carne por día
  verduraDia: 100, // g de verdura por día
  tomasDia: 2, // comidas (bolsitas) por día
};

export const totalDia = RACION.carneDia + RACION.verduraDia; // 450 g
export const gramosBolsita = totalDia / RACION.tomasDia; // 225 g
export const carneBolsita = RACION.carneDia / RACION.tomasDia; // 175 g
export const verduraBolsita = RACION.verduraDia / RACION.tomasDia; // 50 g
// Gramos de carne por cada gramo de verdura (3,5 : 1).
export const proporcion = RACION.carneDia / RACION.verduraDia;

// Cuánto rinde una mezcla de `total` gramos: bolsitas completas, lo que sobra y días.
export function rendimiento(total) {
  const bolsitas = Math.floor(total / gramosBolsita + 1e-9);
  return {
    total,
    bolsitas,
    restoGramos: Math.max(0, total - bolsitas * gramosBolsita),
    dias: total / totalDia,
  };
}

// Tengo `carne` gramos: cuánta verdura necesito para mantener la proporción.
export function desdeCarne(carne) {
  const verdura = carne / proporcion;
  return { carne, verdura, ...rendimiento(carne + verdura) };
}

// Tengo `verdura` gramos: cuánta carne necesito para mantener la proporción.
export function desdeVerdura(verdura) {
  const carne = verdura * proporcion;
  return { carne, verdura, ...rendimiento(carne + verdura) };
}

// Tengo carne y verdura: cuánto puedo preparar respetando la proporción, qué sobra
// y cuánto habría que comprar del ingrediente que limita para usar todo lo demás.
export function conLoQueTengo(carne, verdura) {
  const diasCarne = carne / RACION.carneDia;
  const diasVerdura = verdura / RACION.verduraDia;
  const dias = Math.min(diasCarne, diasVerdura);
  const carneUsada = dias * RACION.carneDia;
  const verduraUsada = dias * RACION.verduraDia;
  let limita = null;
  let faltaComprar = 0;
  if (diasCarne < diasVerdura) {
    limita = "carne";
    faltaComprar = verdura * proporcion - carne;
  } else if (diasVerdura < diasCarne) {
    limita = "verdura";
    faltaComprar = carne / proporcion - verdura;
  }
  return {
    carneUsada,
    verduraUsada,
    sobraCarne: carne - carneUsada,
    sobraVerdura: verdura - verduraUsada,
    limita,
    faltaComprar,
    ...rendimiento(carneUsada + verduraUsada),
  };
}

// Cuánto se necesita para `dias` días de comida.
export function paraDias(dias) {
  return {
    carne: dias * RACION.carneDia,
    verdura: dias * RACION.verduraDia,
    total: dias * totalDia,
    bolsitas: dias * RACION.tomasDia,
  };
}

// Convierte una cantidad a gramos de mezcla según su unidad.
export function aGramos(cantidad, unidad) {
  switch (unidad) {
    case "kg":
      return cantidad * 1000;
    case "bolsitas":
      return cantidad * gramosBolsita;
    case "dias":
      return cantidad * totalDia;
    default:
      return cantidad; // "g"
  }
}

// Preparé `preparado` gramos de mezcla y se han usado `usado`: cuánto queda.
export function cuantoQueda(preparado, usado) {
  const queda = Math.max(0, preparado - usado);
  return { usadoDeMas: usado > preparado, ...rendimiento(queda) };
}
