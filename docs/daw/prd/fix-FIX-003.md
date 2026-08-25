# Fix FIX-003: Agrandar tamaño de fuente del tooltip de la Regla

- **Bug**: el tooltip Δt/ΔmV que dibuja la herramienta Regla se pinta a `10px`, un tamaño chico
  y difícil de leer, pese a ser la información principal que la herramienta muestra.
- **Change**: `src/frontend/src/components/render/drawOverlay.ts:81` — cambiar
  `ctx.font = '10px sans-serif';` a `ctx.font = '20px sans-serif';` (el usuario pidió al menos
  duplicar el tamaño actual).
- **Regression test**: en `drawOverlay.test.ts`, extender el test existente "pinta el texto Δt/ΔmV
  con fillText..." para verificar también `ctx.font === '20px sans-serif'` — falla contra el código
  actual (`'10px sans-serif'`) y pasa tras el cambio.
- **Risk**: none — cambio puramente visual de una constante de estilo en una función de dibujo, sin
  efecto sobre el layout del tooltip más allá del tamaño del texto (la posición `tooltipX`/`y1±6` ya
  acota el X para no salirse del canvas; con fuente más grande el texto podría verse más apretado
  verticalmente entre las dos líneas, pero no es un riesgo funcional).
