# Comidas de Apolo

Página sencilla (HTML, CSS y JavaScript, sin dependencias) para llevar la preparación de la comida de Apolo, un Golden Retriever.

## Ración

- **Por día:** 350 g de carne + 100 g de verdura = 450 g.
- **Por comida:** 2 bolsitas al día de 225 g cada una (175 g de carne + 50 g de verdura).
- **Proporción:** 3,5 g de carne por cada gramo de verdura.

Si la dieta cambia, se ajusta en un solo lugar: `RACION` en `js/calc.js`.

## Qué hace

- **Convertidor carne ⇄ verdura:** "tengo X kg de carne, ¿cuánta verdura necesito?" (o al revés), y cuántas bolsitas y días rinde.
- **Mezclar por tandas:** para cuando la taza no da para todo de una vez. Con lo que cabe en la taza (se recuerda) y la carne o verdura total a preparar, dice cuántas tandas iguales hacer y cuánta carne y verdura echar en cada una.
- **¿Cuánto preparo con lo que tengo?:** con la carne y la verdura disponibles, cuánto usar de cada una, qué sobra y cuánto falta comprar para aprovechar todo.
- **¿Cuánto compro para varios días?:** carne, verdura y bolsitas para N días.
- **¿Cuántas bolsitas quedan?:** según la comida preparada y la utilizada (en bolsitas, días, kg o g).
- **Seguimiento de preparaciones:** registro con fecha y bolsitas que salieron. Calcula las bolsitas que quedan hoy (2 por día desde el día siguiente a cada preparación; lo que sobra se suma a la siguiente), cuándo se acaban, la **próxima preparación** (el último sábado antes de que se acaben, con las bolsitas que quedarán ese día) y cuándo **encargar la carne** (dos sábados antes), con la carne y verdura para la próxima tanda: mes y medio de comida, 45 días = 90 bolsitas (15,75 kg de carne + 4,5 kg de verdura; se cambia en `DIAS_POR_PREPARACION`, `js/calc.js`). Cada preparación queda en un **historial** con su propio rango de fechas (del primer al último día en que Apolo come de ella, cuántas sobraban de la anterior y su estado: en curso, en espera o terminada); registrar una nueva no borra las anteriores. Arranca con la preparación del sábado 10 de octubre de 2026 (102 bolsitas). Se guarda en el navegador (`localStorage`), así que es por dispositivo: lo que se registra en un celular no aparece en otro.

- **Tema claro/oscuro:** claro por defecto. El botón del encabezado lo cambia y la elección se recuerda en cada dispositivo.

## En iPhone y iPad

Pensada primero para el celular: campos de 16 px (Safari no hace zoom al tocarlos), teclado numérico con coma decimal, márgenes que respetan el notch y botones grandes.

Para tenerla como app: en Safari, **Compartir → Agregar a pantalla de inicio**. Queda con el ícono de la huella y abre en Safari, así que comparte el conteo de bolsitas con el Safari de ese mismo equipo.

Safari borra los datos guardados de un sitio que no se abre en 7 días de uso del navegador. Si se usa a diario no pasa nada, pero tras una pausa larga el conteo puede volver a cero.

## Publicar en GitHub Pages

En el repositorio: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**, rama `main`, carpeta `/ (root)`. Queda en `https://phernandezv.github.io/claude-comidas-apolo-app/`.

## Desarrollo

```bash
python3 -m http.server 8000      # abrir http://localhost:8000 (los módulos JS no cargan con file://)
node --test tests/*.test.mjs     # pruebas de los cálculos (Node 18+)
```
