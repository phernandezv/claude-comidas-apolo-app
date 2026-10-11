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

// La taza de mezclar tiene capacidad para `capacidad` gramos de mezcla.
// Devuelve lo máximo de carne y verdura por tanda y, si se indica `carneTotal`,
// cuántas tandas iguales hacen falta y cuánto echar de cada ingrediente en cada una.
export function porTandas(capacidad, carneTotal = 0) {
  const r = {
    maxCarne: (capacidad * RACION.carneDia) / totalDia,
    maxVerdura: (capacidad * RACION.verduraDia) / totalDia,
  };
  if (!carneTotal) return r;
  const verduraTotal = carneTotal / proporcion;
  const total = carneTotal + verduraTotal;
  const tandas = Math.max(1, Math.ceil(total / capacidad - 1e-9));
  return {
    ...r,
    carneTotal,
    verduraTotal,
    total,
    tandas,
    carneTanda: carneTotal / tandas,
    verduraTanda: verduraTotal / tandas,
    mezclaTanda: total / tandas,
  };
}

// ---- Calendario de preparaciones ----
// Fechas como texto "AAAA-MM-DD" (fecha local, sin hora), para evitar líos de zona horaria.

const DIA_MS = 86400000;
const aDia = (iso) => {
  const [a, m, d] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, d) / DIA_MS;
};
const aIso = (dia) => new Date(dia * DIA_MS).toISOString().slice(0, 10);
export const sumarDias = (iso, n) => aIso(aDia(iso) + n);
export const diasEntre = (desde, hasta) => aDia(hasta) - aDia(desde);
// 0 = domingo … 6 = sábado.
export const diaSemana = (iso) => new Date(aDia(iso) * DIA_MS).getUTCDay();

export const SABADO = 6;
export const SEMANAS_ANTES_ENCARGO = 2; // la carne se encarga dos sábados antes de preparar
// Cada preparación se calcula para mes y medio de comida: 45 días = 90 bolsitas.
export const DIAS_POR_PREPARACION = 45;
export const bolsitasPorPreparacion = DIAS_POR_PREPARACION * RACION.tomasDia;

// Simula día a día el congelador a partir del registro de preparaciones
// ([{ fecha, bolsitas }]). Supuesto: el día de una preparación las bolsitas nuevas
// no se tocan (ese día Apolo come de lo anterior) y desde el día siguiente come
// `RACION.tomasDia` por día. Lo que sobra de una preparación se suma a la siguiente.
//
// Devuelve, para `hoy`:
//  - quedanHoy: bolsitas al cerrar el día de hoy.
//  - ultimoDia: último día en que todavía hay comida.
//  - proximaPreparacion: último sábado (desde hoy) antes de que se acaben, o null si
//    ya no queda ningún sábado a tiempo.
//  - quedanEseDia: bolsitas que habrá al empezar ese sábado.
//  - encargarCarne: dos sábados antes de la próxima preparación.
export function estadoPreparaciones(registro, hoy) {
  if (!registro.length) return null;
  const orden = [...registro].sort((a, b) => diasEntre(b.fecha, a.fecha));
  const porDia = new Map();
  for (const p of orden) porDia.set(p.fecha, (porDia.get(p.fecha) ?? 0) + p.bolsitas);

  const inicio = orden[0].fecha;
  const fin = orden[orden.length - 1].fecha;
  const alInicio = new Map(); // bolsitas al empezar cada día, desde hoy en adelante
  let stock = 0;
  let quedanHoy = 0;
  let ultimoDia = null;
  let dia = inicio;
  // Hasta hoy (o la última preparación, si se registró una a futuro) y luego hasta que se acaben.
  const limite = diasEntre(inicio, hoy) >= diasEntre(inicio, fin) ? hoy : fin;
  for (let i = 0; i < 100000; i++) {
    if (diasEntre(hoy, dia) >= 0) alInicio.set(dia, stock);
    if (dia !== inicio) {
      if (stock > 0) ultimoDia = dia;
      stock = Math.max(0, stock - RACION.tomasDia);
    }
    stock += porDia.get(dia) ?? 0;
    if (dia === hoy) quedanHoy = stock;
    if (diasEntre(limite, dia) >= 0 && stock === 0) break;
    dia = sumarDias(dia, 1);
  }

  const ultimaPreparacion = orden[orden.length - 1];
  const r = { quedanHoy, ultimoDia, ultimaPreparacion, proximaPreparacion: null, quedanEseDia: 0, encargarCarne: null };
  if (!ultimoDia || diasEntre(hoy, ultimoDia) < 0) return r; // ya se acabaron

  // Último sábado ≤ último día con comida, sin pasar antes de hoy.
  const atras = (diaSemana(ultimoDia) - SABADO + 7) % 7;
  const sabado = sumarDias(ultimoDia, -atras);
  if (diasEntre(hoy, sabado) >= 0) {
    r.proximaPreparacion = sabado;
    r.quedanEseDia = alInicio.get(sabado) ?? 0;
    r.encargarCarne = sumarDias(sabado, -7 * SEMANAS_ANTES_ENCARGO);
  }
  return r;
}

// Historial: cada preparación con su propio rango de fechas. Se come primero lo más
// viejo (lo que sobraba de la anterior) y después lo nuevo, con el mismo supuesto que
// estadoPreparaciones (el día de la preparación no se toca lo nuevo). Devuelve, en
// orden de fecha, cada preparación con:
//  - quedabanAntes: bolsitas que sobraban de las anteriores al cerrar ese día.
//  - desde / hasta: primer y último día en que Apolo come de esa preparación
//    (si todavía no se acaba, `hasta` es la proyección).
//  - quedanHoy: bolsitas de esa preparación que quedan al cerrar `hoy`.
//  - estado: "terminada", "en curso" o "en espera" (todavía se come de la anterior).
export function historialPreparaciones(registro, hoy) {
  const orden = [...registro]
    .map((p, i) => ({ ...p, i }))
    .sort((a, b) => diasEntre(b.fecha, a.fecha) || a.i - b.i);
  if (!orden.length) return [];
  const lotes = orden.map((p) => ({
    fecha: p.fecha, bolsitas: p.bolsitas, quedabanAntes: 0, desde: null, hasta: null, restan: p.bolsitas, quedanHoy: 0,
  }));
  let siguiente = 0; // próximo lote por entrar al congelador
  const enCongelador = []; // lotes ya preparados con bolsitas, del más viejo al más nuevo
  let dia = lotes[0].fecha;
  for (let i = 0; i < 100000; i++) {
    if (dia !== lotes[0].fecha) {
      // Comidas del día: primero de lo más viejo.
      let porComer = RACION.tomasDia;
      while (porComer > 0 && enCongelador.length) {
        const l = enCongelador[0];
        if (!l.desde) l.desde = dia;
        l.hasta = dia;
        const come = Math.min(porComer, l.restan);
        l.restan -= come;
        porComer -= come;
        if (l.restan === 0) enCongelador.shift();
      }
    }
    while (siguiente < lotes.length && lotes[siguiente].fecha === dia) {
      const l = lotes[siguiente++];
      l.quedabanAntes = enCongelador.reduce((s, x) => s + x.restan, 0);
      enCongelador.push(l);
    }
    if (dia === hoy) for (const l of lotes) l.quedanHoy = l.restan;
    if (siguiente === lotes.length && !enCongelador.length && diasEntre(hoy, dia) >= 0) break;
    dia = sumarDias(dia, 1);
  }
  return lotes.map(({ restan, ...l }) => {
    let estado = "en espera";
    if (l.hasta && diasEntre(hoy, l.hasta) < 0) estado = "terminada";
    else if (l.desde && diasEntre(l.desde, hoy) >= 0) estado = "en curso";
    // Antes de `hoy` nunca se calculó quedanHoy: si la fecha es futura, aún no existe.
    if (diasEntre(hoy, l.fecha) > 0) l.quedanHoy = 0;
    return { ...l, estado };
  });
}
