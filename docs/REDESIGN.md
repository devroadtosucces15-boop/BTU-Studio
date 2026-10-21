# Rediseño grafito v2 (solo presentación)

Fuente visual: imagen de referencia del usuario (solo temática, no sus cifras).

**Implementado y probado:** tokens grafito/ámbar (`#17191B`, `#242628`, `#E2C276`, sin azul ni glow), encabezado con menú/proyectos/reportes (con contador), 5 pasos (Proyecto, Cámara, Superficies, Cargas, Resultados), resumen "Último cálculo", cámara isométrica escalada a L·A·H con cotas, marcador de temperatura que sigue la barra, estados de reporte como chips (Pendiente / Abierto / Enviado / Resuelto), `theme-color` unificado.

**Sin cambios:** fórmulas, IDs de campos, claves de localStorage y los 14 escenarios golden (la línea base no se modificó).

**Decisiones de diseño:** un paso por pantalla (en impresión se muestran todos); al entrar a Resultados se ejecuta el `calculate()` existente para no mostrar cifras desactualizadas; el botón flotante de feedback se sustituye por el icono del encabezado (`window.btuFeedback.open()`).

**No incluido (fuera de "solo rediseño"):** herramientas Dibujar/Texto/Comentario, miniaturas de captura, clima, cambio de T de referencia (24 °C en el mockup, 20 °C en el código) y la corrección de infiltración.

## Clima y trazabilidad (fase 4)
- **Implementado y probado (con Open-Meteo simulado):** panel "Clima del sitio" (búsqueda por nombre o ubicación solo tras pulsar un botón); temperatura actual informativa y separada de la temperatura de diseño sugerida (percentil 99 de las máximas diarias de 5 años); aplicar a `To` solo con botón explícito; `engineVersion: "v6.0"` y `climate` (fuente, fecha de consulta, periodo, método, si se aplicó) en el JSON exportado y en proyectos guardados; importación tolerante a JSON antiguos. Clave nueva `btu-v6-climate` (aditiva).
- **No probado:** llamadas reales a Open-Meteo (el entorno bloquea hosts externos), geolocalización en iPhone Safari.
- **Aviso de licencia:** Open-Meteo es gratuito solo para uso no comercial (CC BY 4.0, atribución incluida en la UI).
- **Pendiente:** biblioteca de materiales, microlecciones 3D y corrección de infiltración (espera decisión A/B/C).
