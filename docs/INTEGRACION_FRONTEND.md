# Integración del frontend con n8n — contrato v1.0

Estado: el front cumple el contrato v1.0 y está conectado al workflow exportado en
`backend/n8n/workflows/aeronova-chat.json`. En la instancia n8n local se configuró
Gemini, se publicó el workflow y una conversación desde el dashboard terminó con
una ejecución exitosa. La API key permanece en las credenciales locales de n8n.

## Lo que debe compartir el equipo backend

1. La instancia local publica `http://localhost:5678/webhook/aeronova-chat`.
   Esta URL solo es accesible desde la computadora donde corre n8n.
2. El Webhook permite el origen local de Vite: `http://127.0.0.1:5173`.
3. La credencial de Gemini está guardada en n8n y no se guarda en este repositorio.

## Configuración

La configuración local (ignorada por Git y excluida del ZIP) usa:

```dotenv
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/aeronova-chat
```

En otro equipo, configura `frontend/.env` con la Production URL de su instancia y
permite el origen exacto de Vite en CORS. Después reinicia Vite. Sin URL se usa una
respuesta local calculada; no es el agente Gemini.

## Request que ya envía el front

`src/services/chatService.js` es el único punto de llamada al webhook.

```json
{
  "message": "Texto del usuario sin modificar",
  "sessionId": "UUID-v4-persistido-en-sessionStorage",
  "context": {
    "view": "dashboard",
    "filters": { "dateFrom": "2026-10-01", "dateTo": "2026-10-31", "route": null, "channel": null, "flight": null, "agentId": null },
    "kpis": { "ventas": {}, "checkin": {} },
    "breakdowns": { "revenueByChannel": [], "revenueByRoute": [], "occupancyByFlight": [], "rejectionsByReason": [], "agentPerformance": [] },
    "selected": null,
    "generatedAt": "ISO-8601"
  }
}
```

La petición usa `Content-Type: application/json`. Timeout: 30 segundos.
El reloj de los datos es fijo (28/10/2026 12:00 Bogotá); `generatedAt` es el
momento real en que se genera el contexto. El agente debe interpretar las fechas
de filtros y registros, sin asumir que los vuelos ficticios son del día actual.

## Response esperada

```json
{ "response": "Respuesta del agente", "actions": [] }
```

Se tolera `actions` pero no se ejecutan acciones v2. El contrato actual es v1.
`error: true`, error HTTP, JSON inválido, fallo de red o timeout muestran un aviso
recuperable. Reintentar conserva la pregunta y el contexto de la solicitud fallida.

## Recorrido de prueba conjunta

Verificado: abrir el dashboard y preguntar por ingresos produce respuesta de Nova y
una ejecución exitosa en n8n. Para ampliar la revisión manual:

1. Abrir dashboard sin filtros extra y preguntar por ingresos: comparar con tarjetas.
2. Elegir BOG-MDE + Web y repetir: verificar filtros y cifras en `Executions`.
3. Abrir una reserva → Consultar este registro con Nova: verificar `context.selected`.
4. Cambiar de módulo: verificar `context.view` y que se elimina la selección previa.
5. Preguntar algo ausente: el agente debe reconocer el límite del contexto.
6. Detener el backend: comprobar aviso y botón de reintento.
7. Restaurar backend y reintentar; abrir otra pestaña para verificar sesiones separadas.
