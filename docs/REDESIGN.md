# Rediseño grafito v2 (solo presentación)

Fuente visual: imagen de referencia del usuario (solo temática, no sus cifras).

**Implementado y probado:** tokens grafito/ámbar (`#17191B`, `#242628`, `#E2C276`, sin azul ni glow), encabezado con menú/proyectos/reportes (con contador), 5 pasos (Proyecto, Cámara, Superficies, Cargas, Resultados), resumen "Último cálculo", cámara isométrica escalada a L·A·H con cotas, marcador de temperatura que sigue la barra, estados de reporte como chips (Pendiente / Abierto / Enviado / Resuelto), `theme-color` unificado.

**Sin cambios:** fórmulas, IDs de campos, claves de localStorage y los 14 escenarios golden (la línea base no se modificó).

**Decisiones de diseño:** un paso por pantalla (en impresión se muestran todos); al entrar a Resultados se ejecuta el `calculate()` existente para no mostrar cifras desactualizadas; el botón flotante de feedback se sustituye por el icono del encabezado (`window.btuFeedback.open()`).

**No incluido (fuera de "solo rediseño"):** herramientas Dibujar/Texto/Comentario, miniaturas de captura, clima, cambio de T de referencia (24 °C en el mockup, 20 °C en el código) y la corrección de infiltración.

## Biblioteca de materiales (fase 5)
- **Implementado y probado:** panel "Biblioteca de materiales y capas" en el paso Superficies: catálogo de 10 materiales con λ representativo y rango típico (editable), constructor de hasta 6 capas (R = e/λ, U = 1/(ΣR + Rsi + Rse)), transferencia de referencia con tus medidas, comparación de aislantes al mismo espesor, y botón explícito "Usar U" para paredes, techo o piso (pone el selector de material en "manual" y ejecuta el `calculate()` existente). Sin cambios de fórmulas del motor.
- **Aviso:** los λ son valores de rango medio para aprender; no vienen de una ficha concreta. Referencias: ISO 10456, ISO 6946, ASHRAE Fundamentals cap. 26 (sin citar tablas literales).
- **No incluido:** variación de λ con la temperatura (α) por material; requiere datos de fabricante.
