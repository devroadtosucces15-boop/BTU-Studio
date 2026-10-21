# BTU Studio — auditoría P0 (2026-10-21)

Leyenda: **[HECHO]** implementado y probado · **[PROPUESTO]** no implementado · **[NO PROBADO]** · **[BLOQUEADO]**

## Pruebas (`npm test`, requiere Playwright + Chromium)
- **[HECHO]** `tests/golden.js`: 14 escenarios sobre el `calculate()` real (defaults, 3 ejemplos, congelado, estacional verano/invierno, márgenes y entradas límite). Línea base en `tests/golden/calculate.golden.json`, generada con el motor **sin modificar**. `npm run golden:update` solo debe usarse con un cambio de fórmula deliberado y aprobado.
- **[HECHO]** `tests/reference.js`: reimplementación independiente de las fórmulas; coincide con el DOM (42.17 kW por defecto).
- **[HECHO]** `tests/feedback.js` (21 comprobaciones), `tests/sw.js` (caché/offline), `tests/overflow.js` (320/375/390/430/768/1280 px: sin scroll horizontal).

## Motor — hallazgo de unidades en infiltración (NO modificado)
`qInf = V · ach · airhours · 1.2 · 1.005 · ΔT / 3600`
- `V·ach` es m³/h; × `airhours` (h) → m³ por periodo; × ρ·cp·ΔT → kJ; ÷ 3600 → **kWh**, no kW.
- El resultado se suma como kW. Con los valores por defecto la infiltración es **28.3 kW de 42.2 kW** (67 %), aunque la cámara tiene 2 kW internos y 2.8 kW de transmisión.
- Si `airhours` significa "horas al día con puerta abierta/exposición", la potencia media sería `qInf / 24` ≈ 1.18 kW (un factor 24 menos). Si `ach` ya es el promedio, `airhours` sobra.
- **[PROPUESTO]** decidir semántica con el usuario (opciones: A. `ach` medio de 24 h y quitar `airhours`; B. mantener `airhours` y dividir entre 24; C. fracción de tiempo `airhours/24` como factor). Cualquier cambio debe aparecer como diff explícito en los golden tests y con `engineVersion` nuevo.
- También: no hay carga latente; el texto de la UI ya lo declara.

## Feedback — [HECHO]
- Capa de captura ya no queda activa fuera del modo anotar (máquina de estados `idle/menu/annotate/compose/saved/list`).
- Estado honesto: abrir el formulario de GitHub registra "Borrador abierto (envío sin confirmar)"; solo "Confirmar que lo envié" (acción del usuario) marca enviado. Estados antiguos en localStorage se muestran tal cual (sin migración destructiva).
- Modal: foco entra al diálogo, trampa de Tab, Escape, restauración de foco, `aria-labelledby`, fondo `inert`.
- Táctil: `pointercancel`, `setPointerCapture` protegido, recorte de URL de GitHub a 7000 caracteres.
- Objetivo del área marcada se resuelve ignorando la UI del propio feedback.
- **[PROPUESTO]** modo "Desplazar" durante la anotación (hoy la capa bloquea el scroll); captura de pantalla opcional.

## Service worker — [HECHO]
Precache incluye PNG de iconos y las URLs versionadas (`?v=2`); fallback `ignoreSearch` y a `index.html` en navegación; caché `btu-v8-p0`. **[PROPUESTO]** aviso "hay nueva versión" (hoy `skipWaiting` actualiza sin recargar la página abierta).

## Manifest / iconos / workflow
- Iconos PNG con tamaños reales correctos (192, 512, 180).
- **[PROPUESTO]** `purpose: "any maskable"` combinado puede recortar el arte; separar en entradas `any` y `maskable` (con zona segura) al rediseñar el icono.
- **[PROPUESTO]** unificar `theme-color`: index `#181819`, manifest `#1c1c1d`, spec `#17191B`.
- Workflow `build-icons.yml` solo corre al cambiar `icon.svg`; el commit del bot no dispara otros workflows. Sin cambios.

## Bloqueado / no probado
- **[BLOQUEADO]** Comparación con el sitio público: el proxy del entorno devuelve 403 para `*.github.io`. Verificar manualmente que Pages sirve `main` (y que el SW `btu-v7-…` previo se reemplaza al actualizar).
- **[NO PROBADO]** iPhone Safari real (solo Chromium/emulación táctil).
- **[NO PROBADO]** claves `btu-v6-*`: no se tocó su lectura/escritura; falta test de importación de JSON antiguo.

## Ideas propuestas
1. `engineVersion` y `climateDataDate` en el JSON exportado (trazabilidad); import tolerante a su ausencia.
2. Migración con respaldo: antes de cambiar un esquema, copiar a `btu-backup-<fecha>-<clave>`.
3. Golden tests de importación de proyectos v6 reales como segunda red de seguridad.
4. Señal en la UI cuando una entrada domina >50 % de la carga (hoy infiltración).
