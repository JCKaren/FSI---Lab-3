# Workflow n8n de AeroNova

## Importar y configurar

1. Abre la instancia n8n del equipo e importa `n8n/workflows/aeronova-chat.json`
   desde el editor de workflows.
2. Abre **Google Gemini Chat Model** y selecciona o crea una credencial de Gemini
   con la API key de Google AI Studio. La exportación no incluye la clave; para otra
   instancia, crea o asigna una credencial Gemini en n8n.
3. Comprueba las conexiones: **Webhook → ¿Request válido? → AI Agent → Responder
   éxito**; salida de error del agente → **Responder error**; rama inválida →
   **Responder 400**. Gemini y Simple Memory deben ir conectados al AI Agent.
4. En el nodo Webhook, el método es `POST` y el path `aeronova-chat`. Cambia
   `Allowed Origins` de `*` al origen local del frontend, normalmente
   `http://127.0.0.1:5173` (o el origen que muestre Vite). En el despliegue,
   permite el dominio real del frontend.
5. En la instancia local usada para este laboratorio, el workflow ya está publicado
   y su Webhook tuvo una ejecución exitosa. El JSON del proyecto se actualizó desde
   **Export JSON** y contiene `active: true` y el origen CORS local. En otra instancia,
   asigna una credencial Gemini propia, revisa el origen permitido y publica el
   workflow para obtener su Production URL.
6. Configura la URL en `frontend/.env` a partir de `frontend/.env.example`:

```dotenv
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/aeronova-chat
```

Esta URL funciona únicamente en la computadora donde corre n8n. Para una instancia
n8n Cloud u otra máquina, reemplázala por la Production URL de esa instancia.

7. Reinicia Vite, abre el chat y pregunta «¿Cuántos ingresos tuvimos?».
   Comprueba la ejecución en n8n y que el JSON devuelva `{ "response": "...",
   "actions": [] }`.


## Contrato con el frontend

El frontend hace `POST` con `Content-Type: application/json` y envía `message`,
`sessionId` y `context`. La memoria recibe el mismo `sessionId`. El agente usa
solo los datos del `context`; no accede a una base de datos.

La rama «Responder 400» devuelve estado HTTP 400 para una solicitud inválida. El
frontend muestra un aviso recuperable para errores HTTP; para errores del agente,
el workflow devuelve un JSON controlado con HTTP 200 y `error: true`.

## Alcance del export

El repositorio de origen incluía el JSON del workflow y un README; no incluye una
instancia n8n disponible en internet ni la API key de Gemini. La API key permanece
guardada de forma local en la credencial n8n del equipo.
