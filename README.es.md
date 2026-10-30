# Script para eliminar comentarios de Instagram en lote

🌐 [English](README.md) | **Español**

Un script para la consola del navegador que elimina tus propios comentarios de Instagram en masa, usando la página nativa **Tu actividad → Interacciones → Comentarios**. Automatiza el flujo "Seleccionar → Eliminar" por lotes, con pausas aleatorias y detención automática si Instagram muestra un aviso de límite.

> Adaptado del script para quitar "Me gusta" en lote. Funciona con la interfaz web de Instagram en **inglés y español**.

---

## ⚠️ Aviso legal

- Este es un script **no oficial** y **no está afiliado ni respaldado por Instagram / Meta**.
- Automatizar acciones puede ir en contra de los Términos de Uso de Instagram. **Úsalo bajo tu propio riesgo.** El exceso de automatización puede provocar bloqueos temporales de acciones u otras restricciones en tu cuenta.
- **Los comentarios eliminados no se pueden recuperar.** El script siempre selecciona los primeros comentarios de la lista, así que respalda antes lo que quieras conservar (por ejemplo, con *Descargar tu información*).
- Instagram puede cambiar el diseño de su página en cualquier momento, lo que podría dejar de funcionar el script.

---

## Características

- Elimina **100 comentarios por lote** por defecto (el máximo de Instagram por acción; configurable).
- Hace scroll automáticamente para cargar más elementos antes de seleccionar.
- Verifica el contador de selección (`Eliminar (N)`) y se recupera si Instagram reinicia la selección.
- **Pausas aleatorias** entre clics y entre lotes, más un **descanso largo** cada cierto número de lotes.
- **Se detiene solo** si aparece un aviso de "inténtalo de nuevo más tarde" o "acción bloqueada".
- Detecta el error **"Something went wrong"** de Instagram: el lote fallido no se cuenta, el script espera y se detiene tras fallos repetidos.
- Nunca da por terminado el proceso si la lista simplemente no cargó.
- Se puede detener manualmente en cualquier momento.
- Muestra diagnósticos en la consola si algo falla.

---

## Requisitos

- Un navegador de escritorio (Chrome, Edge, Firefox, etc.).
- Tener la sesión iniciada en Instagram web.
- Idioma de la interfaz de Instagram: **inglés o español**.

---

## Uso

1. Abre esta página con tu sesión iniciada:

   ```
   https://www.instagram.com/your_activity/interactions/comments
   ```

2. Abre la consola de desarrollador del navegador:
   - **Windows / Linux:** `F12` o `Ctrl + Shift + J`
   - **macOS:** `Cmd + Option + J`

3. Copia todo el contenido de [`instagram-bulk-delete-comments.js`](instagram-bulk-delete-comments.js), pégalo en la consola y presiona **Enter**.
   *(Algunos navegadores te piden escribir `allow pasting` antes de poder pegar.)*

4. Deja la pestaña abierta y en primer plano. El progreso se muestra en la consola:

   ```
   Loaded 100 checkboxes; target 100.
   Selected 100 of 100 (clicks made: 100).
   Batch 1: deleted 100 (total: 100)
   Pause between batches: waiting 42 s...
   ```

### Detener el script

Escribe esto en la consola en cualquier momento:

```js
window.__STOP_IG_BULK_DELETE__ = true;
```

El script termina el paso actual y se cierra.

---

## Configuración

Edita las constantes al inicio del script antes de ejecutarlo.

| Constante | Valor por defecto | Descripción |
| --- | --- | --- |
| `MAX` | `100` | Comentarios por lote (el máximo de Instagram por acción). Bájalo (por ejemplo, `50` o `25`) si te salen errores. |
| `MAX_FAILURES` | `2` | Lotes fallidos seguidos antes de que el script se detenga. |
| `BATCHES_BEFORE_REST` | `2` | Cantidad de lotes antes de un descanso largo. |
| `CYCLE_DELAY_MIN` / `CYCLE_DELAY_MAX` | `30 s` / `60 s` | Pausa aleatoria entre lotes. |
| `REST_MIN` / `REST_MAX` | `5 min` / `10 min` | Descanso largo aleatorio. |
| `ICON_DELAY_MIN` / `ICON_DELAY_MAX` | `250 ms` / `600 ms` | Pausa aleatoria entre cada clic de selección. |
| `LOAD_DELAY` | `3500 ms` | Espera tras hacer scroll para cargar más elementos. |
| `MAX_EMPTY_SCROLLS` | `5` | Se rinde tras N scrolls sin elementos nuevos. |
| `SELECT_DELAY`, `ACTION_DELAY`, `MODAL_DELAY` | `1000–1200 ms` | Tiempos de espera de la interfaz. |
| `BLOCK_HINTS` | ver script | Textos que provocan una detención automática (avisos de límite). |
| `ERROR_HINTS` | ver script | Textos que identifican el error "Something went wrong" de Instagram al eliminar. |

**Consejo:** si te aparecen bloqueos de acciones, alarga las pausas y/o baja `MAX`.

---

## Cómo funciona

1. Hace clic en **Seleccionar** para entrar al modo de selección.
2. Hace scroll hasta cargar suficientes elementos (cargar más reinicia la selección de Instagram, por eso se hace *antes* de seleccionar).
3. Hace clic en las casillas una por una y lee el contador `Eliminar (N)` para verificar cada clic.
4. Hace clic en **Eliminar** y confirma el cuadro de diálogo.
5. Revisa si Instagram mostró su diálogo de error. Si aparece, el lote **no** se cuenta, el script descansa y reintenta (se detiene tras `MAX_FAILURES` fallos seguidos).
6. Si no hay error, espera un tiempo aleatorio (o toma un descanso largo) y repite hasta que no encuentre casillas, lo detengas tú, o Instagram muestre un aviso de límite.

---

## Solución de problemas

| Problema | Qué probar |
| --- | --- |
| `Select button not found` | Verifica que estás en la página de comentarios indicada y que la interfaz está en inglés o español. |
| `Selection was reset by Instagram` | Baja `MAX` (por ejemplo, `50`) y aumenta `LOAD_DELAY`. |
| Instagram muestra **"Something went wrong… problem deleting some or all of your content"** | Normalmente es un límite temporal o un elemento que no se puede eliminar. Pulsa OK, **recarga la página**, baja `MAX` (por ejemplo, `25`), alarga las pausas y reintenta más tarde. El script espera por sí solo y se detiene tras `MAX_FAILURES` fallos. |
| La página se queda cargando / `No checkboxes found` | La página quedó trabada tras un error. Recárgala y revisa qué queda antes de volver a ejecutar. El script no asume que terminaste. |
| Muchos errores `net::ERR_BLOCKED_BY_CLIENT` en la consola | Tu bloqueador de anuncios o una extensión está bloqueando las peticiones de analítica de Instagram (`/ajax/bz`). Son inofensivos y no tienen relación con el script. |
| `Modal confirmation not found` | Instagram pudo haber cambiado su interfaz. Revisa la tabla de diagnóstico impresa en la consola. |
| El script se detiene con un aviso de límite | Espera varias horas (o un día) antes de volver a ejecutarlo, con pausas más largas. |
| No pasa nada al pegar | Escribe `allow pasting` en la consola y vuelve a pegar. |

Cuando el script falla, imprime un `console.table` con diagnósticos (botones encontrados, cantidad de casillas, texto del diálogo). Inclúyelo si abres un issue.

---

## Contribuir

Los issues y pull requests son bienvenidos, sobre todo para cambios en la interfaz de Instagram o para agregar más idiomas (añade las palabras traducidas en `SELECT_LABELS`, `DELETE_WORDS` y `BLOCK_HINTS`).

## Licencia

[MIT](LICENSE)
