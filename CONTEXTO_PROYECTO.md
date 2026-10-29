# CONTEXTO DEL PROYECTO — CRM AeroNova (Lab 3 FSI)

> **Para el agente de IA que lea este archivo:** este es el documento de contexto principal del proyecto. Léelo completo antes de proponer o escribir código. Trabajas con el **desarrollador backend** (n8n + agente de IA). Sigue las reglas de la sección 1.

---

## Índice
1. Instrucciones para el agente de IA
2. Resumen del laboratorio
3. Equipo y división de responsabilidades
4. Dominio: la aerolínea AeroNova
5. Proceso de venta de tiquetes
6. Proceso de check-in
7. Reglas de negocio
8. Caso de uso, KPIs y decisiones
9. Modelo de datos
10. Arquitectura
11. Estructura del monorepo
12. Contrato API front ↔ back (**fuente de verdad**)
13. Especificación del backend (workflow n8n)
14. System message del agente de IA
15. Mock del webhook para desarrollo del front
16. Pruebas
17. Variables de entorno y secretos
18. Plan de trabajo y checklist del backend
19. Problemas conocidos y riesgos
20. Glosario

---

## 1. Instrucciones para el agente de IA

- **Idioma:** responde y documenta en **español**. Los identificadores de código, campos JSON y nombres de archivos van en inglés o snake_case, tal como aparecen en este documento.
- **Alcance:** trabajas en `backend/` y `docs/`. **No modifiques `frontend/`**; esa carpeta es del compañero. Si algo del front debe cambiar, explícalo como sugerencia.
- **Contrato API:** la sección 12 es la fuente de verdad entre front y back. No la cambies sin que el usuario lo pida explícitamente. Si cambia, actualiza la versión del contrato y anota el cambio en `docs/CHANGELOG_CONTRATO.md`.
- **Datos:** siguiendo el laboratorio, **no hay base de datos real**. Los datos viven como mock en el frontend (`frontend/src/data/mockData.js`) y llegan al backend dentro del campo `context` de cada mensaje. No propongas bases de datos, ORMs ni servidores propios como backend principal.
- **Secretos:** nunca escribas API keys en archivos del repo. La API key de Gemini vive solo en las credenciales de n8n.
- **n8n:** los workflows se versionan como JSON exportado en `backend/n8n/workflows/`. Si generas o editas un JSON de workflow, debe poder importarse en n8n (Workflow → Import from File).
- **Reglas de negocio y KPIs:** usa exactamente las definiciones de las secciones 7 y 8. No inventes otras.
- **Dudas:** si un requisito no está aquí, pregunta al usuario en vez de suponer.

---

## 2. Resumen del laboratorio

| Campo | Valor |
|---|---|
| Asignatura | Fundamentos de Sistemas de Información |
| Laboratorio | Nro. 3: Integración de n8n con agentes de IA |
| Profesor | Diego José Luis Botia V. |
| Fecha de entrega | **27 de noviembre de 2026** |
| Herramientas del lab | Google Antigravity (IDE con IA, para el front), n8n (Cloud o self-hosted), Google AI Studio (API key de Gemini) |

**Objetivos del laboratorio**
- Aplicar el flujo de *vibecoding* (desarrollo asistido por IA).
- Diseñar una UI funcional basada en una referencia visual (Dribbble).
- Integrar un backend en n8n con un frontend generado por IA.
- Implementar un agente de IA que interactúe con datos.

**Entregables oficiales**
1. Código fuente completo en la carpeta del proyecto.
2. Archivo de exportación (`.json`) del workflow de n8n.
3. Uso de filtros en el dashboard.
4. Un dashboard con métricas claras para los procesos de la aerolínea (venta y check-in).
5. **Ampliación:** implementar las demás funciones del CRM e integrarlas al chatbot.

**Pasos del laboratorio (resumen)**
- **Fase I (datos):** definir el caso de uso (problema/KPIs, usuario final, acción) y crear `schema.json` y `estructura_datos.md`.
- **Fase II (front, Antigravity):** prompt maestro con imagen de referencia, generación del dashboard con `mockData.js` separado, KPIs calculados (no texto estático), gráficos con Recharts y filtros por fecha y equipo.
- **Fase III (back, n8n):**
  - Webhook POST, luego publicar el workflow y usar la Production URL.
  - Ventana de chat en el front que llama al webhook.
  - Nodo AI Agent con Google Gemini Chat Model (`gemini-3-flash-preview`), Simple Memory y System Message.
  - El AI Agent usa la opción Respond: "Using 'Respond to Webhook' node".
  - El nodo Respond to Webhook devuelve la salida del agente (`output`).

---

## 3. Equipo y división de responsabilidades

| Rol | Responsable | Carpeta | Entregables |
|---|---|---|---|
| **Frontend** | Compañero | `frontend/` | Dashboard React con mock data, filtros, módulos del CRM y ventana de chat que consume el contrato de la sección 12 |
| **Backend** | Yo (usuario de este agente) | `backend/`, `docs/` | Workflow n8n con el agente de IA, system message, export JSON, mock del webhook, pruebas y contrato API |

**Puntos de coordinación**
- El contrato (sección 12) se acuerda primero. El front puede avanzar contra el mock (sección 15) mientras el workflow real no está listo.
- El front es dueño de `mockData.js` y del cálculo de KPIs. El back es dueño de cómo el agente interpreta el `context`.
- La URL de producción del webhook se comparte por `.env`, nunca hardcodeada en el código.

---

## 4. Dominio: la aerolínea AeroNova

- **AeroNova** es una aerolínea virtual (nombre provisional). Código de vuelo `NV` (ej. `NV214`) y moneda **COP**.
- Opera rutas nacionales e internacionales desde Colombia (BOG, MDE, CLO, CTG, BAQ, MIA, PTY, MEX, MAD...).
- El CRM cubre dos procesos de cara al cliente, modelados en BPMN en `docs/procesos/`:
  - **Venta de tiquetes** (sección 5).
  - **Check-in** (sección 6).
- Los dos procesos están encadenados: **solo una venta pagada (tiquete emitido) habilita el check-in.**

---

## 5. Proceso de venta de tiquetes

Archivo: `docs/procesos/venta_tiquetes.bpmn`

**Participantes (carriles):** Cliente · Sistema de reservas y ventas · Agente de ventas (counter / call center) · Pasarela de pagos

| # | Actor | Paso | Dato que genera |
|---|---|---|---|
| 1 | Cliente | Inicia: quiere comprar un tiquete | — |
| 2 | — | **¿Canal de compra?** Web/App o Counter/Call center | `bookings.channel` |
| 3a | Cliente | Busca vuelos (origen, destino, fecha, pasajeros) | — |
| 3b | Agente | Atiende al cliente y busca vuelos | `bookings.agent_id` |
| 4 | Sistema | Consulta disponibilidad y tarifas | — |
| 5 | — | **¿Hay sillas disponibles?** No → informa y sugiere alternativas → *Venta no realizada* | `lost_reason = sin_disponibilidad` |
| 6 | Cliente | Selecciona vuelo y tarifa | `fare_class`, `base_fare`, `taxes` |
| 7 | Cliente | Ingresa datos de los pasajeros | `passenger_id` |
| 8 | Sistema | Crea la reserva (PNR) con plazo de pago de 24 h | `pnr`, `created_at`, `expires_at`, `status = pending` |
| 9 | Cliente | Realiza el pago | `payment_method` |
| 10 | Pasarela | Procesa el pago | — |
| 11 | — | **¿Pago aprobado?** | — |
| 12a | Sistema | Sí → emite el tiquete electrónico y registra la venta | `status = paid`, `paid_at` |
| 13a | Sistema | Envía el tiquete y el itinerario → *Venta completada (habilitado para check-in)* | — |
| 12b | Sistema | No → notifica el pago rechazado | — |
| 13b | — | **¿Reintenta antes de que expire la reserva?** Sí → vuelve al paso 9 | — |
| 14b | Sistema | No → cancela la reserva y libera sillas → *Venta no realizada* | `status = expired / cancelled`, `lost_reason` |

---

## 6. Proceso de check-in

Archivo: `docs/procesos/checkin_corregido.bpmn` (versión corregida del modelo original hecho en Bizagi).

**Participantes (carriles):** Pasajero · Sistema de check-in · Agente de aeropuerto (counter / bag drop) · Seguridad aeroportuaria

| # | Actor | Paso | Dato que genera |
|---|---|---|---|
| 1 | Pasajero | Inicia: necesita hacer check-in | `checkins.started_at` |
| 2 | — | **¿Canal de check-in?** Web/App/Kiosko o Counter | `checkins.channel` |
| 3a | Pasajero | Ingresa código de reserva y apellido | — |
| 3b | Agente | Recibe al pasajero y su documento | `checkins.agent_id` |
| 4 | Sistema | Verifica la reserva (pago y estado del vuelo) | — |
| 5 | — | **¿Reserva válida?** No → paso R | — |
| 6 | Sistema | Verifica ventana de check-in y documentos de viaje | — |
| 7 | — | **¿Puede hacer check-in?** No → paso R | — |
| R | Sistema | Registra el motivo de rechazo → *Check-in no realizado* (notifica al pasajero) | `status = rejected`, `rejection_reason` |
| 8 | Pasajero | Confirma sus datos | — |
| 9 | Pasajero | Selecciona o confirma asiento | `seat` |
| 10 | — | **¿Tiene equipaje para registrar?** | — |
| 11 | Agente | Pesa, etiqueta y registra el equipaje | `bags_count`, `bags_weight_kg` |
| 12 | — | **¿Excede la franquicia de su tarifa?** Sí → el agente cobra el cargo por exceso | `excess_fee` |
| 13 | Sistema | Genera el pase de abordar y registra el check-in | `status = completed`, `completed_at`, `duration_seconds` |
| 14 | Sistema | Envía el pase de abordar (correo / app) | — |
| 15 | Pasajero | Pasa por control de seguridad | — |
| 16 | Seguridad | Realiza la inspección de seguridad | — |
| 17 | — | **¿Control superado?** Sí → *Espera su abordaje en sala*. No → niega el paso, reporta a la aerolínea → *No puede abordar su vuelo* | `security_passed`, `boarded` |

**Correcciones aplicadas al modelo original** (detalle en `docs/procesos/revision_y_correcciones.md`):
- Se agregaron el canal de check-in, el registro del motivo de rechazo, la selección de asiento, el exceso de equipaje con su cobro, el envío del pase y las compuertas de unión.
- El control de seguridad pasó a un carril propio.
- Se corrigió la ortografía.

---

## 7. Reglas de negocio

| Regla | Valor |
|---|---|
| Ventana de check-in online (web/app/kiosko) | Abre 48 h y cierra 1 h antes de la salida |
| Ventana de check-in en counter | Abre 3 h antes; cierra 1 h antes (nacional) o 1,5 h antes (internacional) |
| Documentos | Nacional: documento de identidad. Internacional: pasaporte vigente y visa si aplica. |
| Plazo de pago de una reserva | 24 h desde `created_at`. Si vence → `status = expired` |
| Franquicia de equipaje por tarifa | `basica`: 0 maletas · `clasica`: 1 × 23 kg · `flex`: 2 × 23 kg · `business`: 2 × 32 kg |
| Cargo por exceso | Maleta adicional: COP 150.000 · Sobrepeso (hasta 32 kg): COP 90.000 |
| Motivos de rechazo de check-in | `reserva_no_encontrada`, `pago_pendiente`, `vuelo_cancelado`, `fuera_de_ventana`, `documento_invalido`, `sobreventa` |
| Motivos de venta no realizada | `sin_disponibilidad`, `pago_rechazado`, `reserva_expirada`, `cancelada_por_cliente` |
| Canales de venta | `web`, `app`, `counter`, `call_center` (web y app no tienen agente) |
| Canales de check-in | `web`, `app`, `kiosk`, `counter` (solo counter tiene agente) |
| No-show | Tiquete pagado de un vuelo `departed` sin check-in completado o sin abordar |

---

## 8. Caso de uso, KPIs y decisiones

**Problema:** no hay una vista unificada de venta y check-in. No se detectan a tiempo las rutas que venden poco, los canales que convierten mal, los vuelos con muchos pendientes de check-in ni las causas de los rechazos.

**Usuario final:** el gerente comercial y de servicio al pasajero. Es un perfil ejecutivo, no técnico. Secundario: los supervisores de aeropuerto.

### KPIs de venta (sobre `bookings`)
| KPI | Fórmula |
|---|---|
| Ingresos totales | Σ `total_amount` donde `status = 'paid'` (con comparación contra el mes anterior) |
| Tiquetes vendidos | conteo de `status = 'paid'` |
| Tiquete promedio | ingresos ÷ tiquetes vendidos |
| Tasa de conversión | `paid` ÷ (`paid` + `expired` + `cancelled`) |
| Reservas pendientes de pago | conteo de `status = 'pending'` |
| Ocupación por vuelo (load factor) | tiquetes `paid` del vuelo ÷ `flights.capacity` |
| Ventas por canal / ruta / agente | agrupaciones de los ingresos |
| Cumplimiento de meta | ventas del agente en el mes ÷ `users.quota_amount` |

### KPIs de check-in (sobre `checkins`)
| KPI | Fórmula |
|---|---|
| Tasa de check-in completado | `completed` ÷ (`completed` + `rejected`) |
| % check-in digital | (`web` + `app` + `kiosk`) ÷ total de completados |
| Tiempo promedio de check-in | promedio de `duration_seconds`, por canal |
| Rechazos por motivo | conteo por `rejection_reason` |
| Ingresos por exceso de equipaje | Σ `excess_fee` |
| Pendientes de check-in | tiquetes `paid` de vuelos `scheduled` dentro de la ventana, sin check-in completado |
| No-show | ver la regla en la sección 7 |

### Decisiones que habilita el dashboard
| Si el dashboard muestra… | Decisión |
|---|---|
| Ruta con ocupación < 60 % a pocos días del vuelo | Lanzar una promoción en esa ruta |
| Canal con conversión baja | Revisar la pasarela o la experiencia de pago de ese canal |
| Agente por debajo de su meta | Reasignar clientes y dar acompañamiento |
| Muchos pendientes de check-in en un vuelo próximo | Enviar recordatorios y abrir más counters |
| Tiempo alto de check-in en counter | Reasignar agentes o promover el check-in digital |
| Muchos `documento_invalido` en rutas internacionales | Comunicar los requisitos desde la venta |

### Módulos del CRM (alcance de la app)
1. **Dashboard:** KPIs, gráfico de barras (ingresos por etapa de venta), gráfico de línea (ventas en el tiempo) y tabla de ventas recientes.
2. **Ventas / Reservas:** listado, búsqueda por PNR y detalle.
3. **Pasajeros:** ficha con historial de compras y check-ins.
4. **Vuelos:** ocupación, estado y pendientes de check-in.
5. **Check-in:** registros y motivos de rechazo.
6. **Equipo:** agentes, metas y cumplimiento.
7. **Chatbot:** disponible en todos los módulos y conectado a n8n.

**Filtros globales (obligatorios):** rango de fechas, ruta, canal, vuelo y agente (equipo de ventas).

---

## 9. Modelo de datos

Copia completa en `docs/estructura_datos.md`; ejemplo en `docs/schema.json`. Moneda COP, fechas en ISO 8601 (UTC).

### 9.1 `users` (agentes y equipo)
```json
{ "id": "UUID", "full_name": "string", "email": "string",
  "role": "admin | manager | sales_agent | checkin_agent",
  "station": "IATA, ej. BOG", "avatar_url": "string",
  "quota_amount": "decimal (meta mensual COP; 0 para checkin_agent)",
  "status": "active | inactive" }
```
### 9.2 `sale_stages` (etapas de venta, eje X del gráfico de barras)
```json
{ "id": "UUID", "name": "Búsqueda | Reservada | Pago pendiente | Emitida | Cancelada/Expirada",
  "display_order": "integer", "conversion_probability": "integer (%)" }
```
### 9.3 `passengers`
```json
{ "id": "UUID", "full_name": "string", "document_type": "CC | CE | PASAPORTE",
  "document_number": "string", "nationality": "ISO 3166", "email": "string", "phone": "string",
  "loyalty_tier": "none | silver | gold | diamond", "created_at": "datetime" }
```
### 9.4 `routes`
```json
{ "id": "UUID", "origin": "IATA", "destination": "IATA", "origin_city": "string",
  "destination_city": "string", "is_international": "boolean", "distance_km": "integer" }
```
### 9.5 `flights`
```json
{ "id": "UUID", "flight_number": "NV###", "route_id": "FK routes", "departure_at": "datetime",
  "arrival_at": "datetime", "aircraft": "string", "capacity": "integer",
  "status": "scheduled | boarding | departed | delayed | cancelled" }
```
### 9.6 `bookings` (tabla central de ventas; 1 fila = 1 pasajero en 1 vuelo)
```json
{ "id": "UUID", "pnr": "6 caracteres", "passenger_id": "FK", "flight_id": "FK",
  "agent_id": "FK users | null (web/app)", "stage_id": "FK sale_stages",
  "channel": "web | app | counter | call_center",
  "fare_class": "basica | clasica | flex | business",
  "base_fare": "decimal", "taxes": "decimal", "total_amount": "decimal", "currency": "COP",
  "payment_method": "tarjeta_credito | tarjeta_debito | pse | efectivo | null",
  "status": "pending | paid | expired | cancelled",
  "created_at": "datetime", "expires_at": "datetime", "paid_at": "datetime | null",
  "lost_reason": "sin_disponibilidad | pago_rechazado | reserva_expirada | cancelada_por_cliente | null" }
```
### 9.7 `checkins` (tabla central de operación; 1 fila = 1 intento)
```json
{ "id": "UUID", "booking_id": "FK", "passenger_id": "FK", "flight_id": "FK",
  "agent_id": "FK users | null", "channel": "web | app | kiosk | counter",
  "status": "completed | rejected", "rejection_reason": "ver sección 7 | null",
  "seat": "string | null", "bags_count": "integer", "bags_weight_kg": "decimal",
  "excess_fee": "decimal", "started_at": "datetime", "completed_at": "datetime | null",
  "duration_seconds": "integer", "security_passed": "boolean | null", "boarded": "boolean" }
```
### 9.8 Relaciones
- 1 usuario → N bookings y N checkins (counter).
- 1 pasajero → N bookings y N checkins.
- 1 ruta → N vuelos.
- 1 vuelo → N bookings y N checkins.
- 1 etapa → N bookings.
- 1 booking pagado → 0..N check-ins rechazados y como máximo 1 completado.

### 9.9 Reglas de coherencia del mock
- Solo los bookings `paid` tienen check-in completado.
- Web/app → `agent_id = null`.
- Un check-in completado tiene `seat` y `completed_at`. Uno rechazado tiene `rejection_reason`.
- `excess_fee > 0` solo si se supera la franquicia de la tarifa.
- Duraciones: web/app 60–180 s, kiosko 120–300 s, counter 300–900 s.
- Volumen mínimo: 8 agentes, 10 rutas, 30 vuelos, 80 pasajeros, 150 bookings y 100 check-ins, distribuidos en los últimos 3 meses.

---

## 10. Arquitectura

Enfoque del laboratorio: **el frontend es dueño de los datos (mock); n8n es el backend conversacional.** No hay base de datos.

```
┌─────────────────────────── Navegador ───────────────────────────┐
│  frontend/ (React + Vite + Recharts)  — COMPAÑERO              │
│  ┌──────────────┐   calcula   ┌───────────────┐                 │
│  │ mockData.js  │ ──────────▶ │ KPIs/filtros  │──▶ Dashboard y  │
│  └──────────────┘             └───────┬───────┘    módulos CRM  │
│                                       │ arma "context"          │
│                              ┌────────▼────────┐                │
│                              │  ChatWidget     │                │
│                              └────────┬────────┘                │
└───────────────────────────────────────┼─────────────────────────┘
                 HTTPS POST (JSON)      │  contrato sección 12
┌───────────────────────────────────────▼─────────────────────────┐
│  n8n (Cloud) — BACKEND (YO)                                      │
│  Webhook POST /webhook/aeronova-chat                            │
│        │                                                        │
│        ▼                                                        │
│  AI Agent ── Google Gemini Chat Model (gemini-3-flash-preview)  │
│        │  └─ Simple Memory (clave: sessionId, ventana 10)       │
│        │  └─ System Message (sección 14)                        │
│        ▼                                                        │
│  Respond to Webhook  → { response, actions }                    │
│  (rama de error → respuesta amable con error: true)             │
└─────────────────────────────────────────────────────────────────┘
```

**Por qué así:**
- Cumple al pie de la letra la guía del laboratorio: mock en el front, webhook, AI Agent, Gemini, memoria y Respond to Webhook.
- El agente "ve" los datos que el usuario está viendo, porque el front le manda los KPIs, las agrupaciones y los filtros activos en `context`.
- Para "integrar las demás funciones del CRM al chatbot", el front incluye en `context` la vista actual y el registro seleccionado. En la fase 2, el agente puede devolver `actions` (aplicar filtros, navegar, abrir un registro) que el front ejecuta.

**Limitación aceptada:** el agente no puede consultar datos que el front no le envíe. Por eso el `context` debe incluir agregados útiles (sección 12.3).

---

## 11. Estructura del monorepo

```
aeronova-crm/
├── README.md                     # cómo correr todo, integrantes, links
├── CONTEXTO_PROYECTO.md          # ESTE archivo
├── .gitignore                    # node_modules, .env, dist, .DS_Store
├── docs/
│   ├── caso_de_uso.md
│   ├── estructura_datos.md
│   ├── schema.json
│   ├── CHANGELOG_CONTRATO.md     # historial de cambios del contrato API
│   ├── capturas/                 # evidencias para el informe
│   └── procesos/
│       ├── checkin_corregido.bpmn
│       ├── venta_tiquetes.bpmn
│       ├── ver_procesos.html
│       └── revision_y_correcciones.md
├── frontend/                     # ← COMPAÑERO (Antigravity). No tocar desde backend.
│   ├── .env.example              # VITE_N8N_WEBHOOK_URL=
│   ├── package.json
│   └── src/
│       ├── data/mockData.js
│       ├── services/chatService.js   # único lugar que llama al webhook
│       ├── components/ChatWidget/...
│       └── ...
└── backend/                      # ← YO
    ├── README.md                 # cómo importar/publicar el workflow
    ├── n8n/
    │   ├── workflows/
    │   │   └── aeronova-chat.json        # ENTREGABLE: export del workflow
    │   └── prompts/
    │       └── system-message.md         # fuente del System Message
    ├── contracts/
    │   ├── chat-request.schema.json      # JSON Schema del request
    │   ├── chat-response.schema.json     # JSON Schema del response
    │   └── examples/                     # requests/responses de ejemplo
    ├── mock-webhook/
    │   └── server.js                     # mock local del webhook (Node, sin dependencias)
    └── tests/
        ├── test-webhook.sh               # pruebas con curl
        └── preguntas-prueba.md           # casos de prueba del agente
```

**Convenciones de Git**
- Rama `main` protegida. Se trabaja en `feat/backend-*` (yo) y `feat/frontend-*` (compañero), y se integra con pull request.
- Commits en español con prefijo: `feat:`, `fix:`, `docs:`, `chore:`.
  - Ejemplo: `feat: agregar rama de error al workflow de chat`.
- Cada vez que cambie el workflow en n8n: exportarlo de nuevo y hacer commit de `backend/n8n/workflows/aeronova-chat.json`.

---

## 12. Contrato API front ↔ back (v1.0)

### 12.1 Endpoint
| Campo | Valor |
|---|---|
| Método | `POST` |
| URL | `https://<subdominio>.app.n8n.cloud/webhook/aeronova-chat` (Production URL, workflow publicado) |
| Headers | `Content-Type: application/json` |
| Configuración en el front | `import.meta.env.VITE_N8N_WEBHOOK_URL` |
| Timeout sugerido en el front | 30 s |

### 12.2 Request
```json
{
  "message": "¿Qué ruta tiene peor ocupación este mes?",
  "sessionId": "8f2c1a7e-3b1d-4c55-9a0e-2f6b7d9c1e44",
  "context": {
    "view": "dashboard",
    "filters": {
      "dateFrom": "2026-10-01",
      "dateTo": "2026-10-31",
      "route": null,
      "channel": null,
      "flight": null,
      "agentId": null
    },
    "kpis": {
      "ventas": {
        "totalRevenue": 184500000, "totalRevenuePrevMonth": 162300000,
        "ticketsSold": 312, "avgTicket": 591346, "conversionRate": 0.74,
        "pendingBookings": 18
      },
      "checkin": {
        "completionRate": 0.91, "digitalShare": 0.68, "avgDurationSec": 214,
        "excessFeesTotal": 3450000, "pendingCheckins": 42, "noShows": 7
      }
    },
    "breakdowns": {
      "revenueByChannel": [{ "channel": "web", "revenue": 81200000, "tickets": 140 }],
      "revenueByRoute":   [{ "route": "BOG-MDE", "revenue": 35100000, "tickets": 88 }],
      "occupancyByFlight":[{ "flight": "NV530", "route": "BOG-MIA", "departureAt": "2026-10-30T14:00:00Z", "loadFactor": 0.52, "pendingCheckins": 12 }],
      "rejectionsByReason":[{ "reason": "documento_invalido", "count": 9 }],
      "agentPerformance": [{ "agentId": "u3", "name": "Laura Méndez", "sales": 22400000, "quota": 30000000 }]
    },
    "selected": null,
    "generatedAt": "2026-10-28T19:40:00Z"
  }
}
```

### 12.3 Reglas del request
| Campo | Obligatorio | Regla |
|---|---|---|
| `message` | Sí | 1 a 1000 caracteres; texto del usuario sin modificar |
| `sessionId` | Sí | UUID generado por el front al abrir la app y guardado en `sessionStorage`. Lo usa la memoria del agente. |
| `context` | Sí | Puede tener campos `null`, pero el objeto siempre existe |
| `context.view` | Sí | `dashboard`, `ventas`, `pasajeros`, `vuelos`, `checkin` o `equipo` |
| `context.filters` | Sí | Filtros activos; `null` = sin filtro |
| `context.kpis` | Sí | Ya calculados por el front con las fórmulas de la sección 8, **respetando los filtros** |
| `context.breakdowns` | Sí | Listas agregadas, **máximo 10 elementos por lista**, ordenadas por relevancia |
| `context.selected` | No | Registro abierto en pantalla: `{ "type": "booking|passenger|flight|checkin|user", "data": { ... } }` |
| Tamaño total | — | Menos de **15 KB**. No enviar el mock completo. |

Valores monetarios en COP, enteros y sin formato. Las tasas van como decimal entre 0 y 1.

### 12.4 Response (éxito, HTTP 200)
```json
{
  "response": "La ruta BOG-MIA tiene la ocupación más baja (52 %) en el vuelo NV530 del 30/10. Te sugiero lanzar una promoción y enviar recordatorios: tiene 12 pasajeros sin check-in.",
  "actions": []
}
```
| Campo | Tipo | Regla |
|---|---|---|
| `response` | string | Texto para mostrar en el chat. Puede traer Markdown simple (negritas y listas). |
| `actions` | array | **v1: siempre `[]`.** El front debe tolerar el campo desde ya. |
| `error` | boolean (opcional) | `true` solo en respuestas de la rama de error |

### 12.5 Response (error controlado, HTTP 200)
```json
{ "response": "Lo siento, no pude procesar tu pregunta en este momento. Intenta de nuevo.", "actions": [], "error": true }
```
Si el front recibe un error HTTP, un timeout o un JSON inválido, muestra un mensaje genérico y deja reintentar.

### 12.6 Acciones (v2, opcional; solo se implementa si sobra tiempo)
| `type` | Payload | Efecto en el front |
|---|---|---|
| `set_filters` | `{ "filters": { ...mismos campos de 12.2 } }` | Aplica los filtros en el dashboard |
| `navigate` | `{ "view": "vuelos" }` | Cambia de módulo |
| `open_record` | `{ "recordType": "booking", "key": "K7XQ2M" }` | Abre el detalle (PNR, flight_number, id) |

Ejemplo: `"actions": [{ "type": "set_filters", "filters": { "route": "BOG-MIA" } }]`

---

## 13. Especificación del backend (workflow n8n)

Nombre del workflow: **`AeroNova - Chat Agente`**. Export: `backend/n8n/workflows/aeronova-chat.json`.

```
Webhook ──▶ AI Agent ──▶ Respond to Webhook (éxito)
              │  ├─ Google Gemini Chat Model
              │  └─ Simple Memory
              └─(error output)──▶ Respond to Webhook (error)
```

### 13.1 Webhook
- HTTP Method: `POST`
- Path: `aeronova-chat`
- Respond: **Using 'Respond to Webhook' node**
- Options → **Allowed Origins (CORS):** `*` mientras se desarrolla; al final, el dominio del front (ej. `http://localhost:5173`).
- Después de probar con la Test URL, **publicar** el workflow (Publish) y usar la **Production URL**.

### 13.2 AI Agent
- Source for Prompt: **Define below**
- Prompt (User Message):
  ```
  Pregunta del usuario: {{ $json.body.message }}

  Vista actual: {{ $json.body.context.view }}
  Contexto del CRM (JSON): {{ JSON.stringify($json.body.context) }}
  ```
- Options → System Message: el texto de la sección 14 (fuente: `backend/n8n/prompts/system-message.md`).
- Settings → On Error: **Continue (using error output)**, conectado al Respond de error.

### 13.3 Google Gemini Chat Model
- Credencial: API key creada en Google AI Studio (guardada solo en n8n).
- Model: `gemini-3-flash-preview` (indicado por el lab para consumir menos tokens).
- Temperature sugerida: 0.3, para respuestas consistentes con los datos.

### 13.4 Simple Memory
- Session ID: **Define below** → `{{ $('Webhook').item.json.body.sessionId }}`
- Context Window Length: `10`

### 13.5 Respond to Webhook (éxito)
- Respond With: **JSON**
- Response Body (expresión; evita romper el JSON si la respuesta trae comillas o saltos de línea):
  ```
  {{ { "response": $json.output, "actions": [] } }}
  ```
- Response Code: 200

### 13.6 Respond to Webhook (error)
- Respond With: JSON → `{{ { "response": "Lo siento, no pude procesar tu pregunta en este momento. Intenta de nuevo.", "actions": [], "error": true } }}`

### 13.7 (v2) Acciones
Activar "Require Specific Output Format" en el AI Agent con un **Structured Output Parser** que tenga el esquema `{ response: string, actions: array }`. El Respond pasa a usar `$json.output.response` y `$json.output.actions`. Si se activa, sube el contrato a v1.1.

---

## 14. System message del agente de IA

Fuente oficial: `backend/n8n/prompts/system-message.md`. Contenido inicial:

```
Eres "Nova", el asistente de análisis del CRM de AeroNova, una aerolínea colombiana.
Ayudas al gerente comercial y de servicio al pasajero a entender y actuar sobre dos
procesos: la VENTA DE TIQUETES y el CHECK-IN.

Cómo responder:
- Responde siempre en español, de forma concisa (máximo 5 frases o una lista corta).
- Usa ÚNICAMENTE los datos que vienen en el "Contexto del CRM". Si un dato no está,
  dilo claramente y sugiere qué filtro o módulo revisar. Nunca inventes cifras.
- Ten en cuenta los filtros activos (filters) al interpretar los números y menciónalos
  cuando sea relevante (ej. "en octubre, para la ruta BOG-MDE...").
- Formatea el dinero en pesos colombianos (ej. $184.500.000 COP) y las tasas como porcentaje.
- Cuando detectes un problema, termina con una recomendación accionable.

Definiciones de KPIs:
- Ingresos = suma de ventas pagadas. Tiquete promedio = ingresos / tiquetes vendidos.
- Conversión = pagadas / (pagadas + expiradas + canceladas).
- Ocupación = tiquetes pagados / capacidad del vuelo (<60% es baja).
- Tasa de check-in completado = completados / (completados + rechazados).
- % digital = check-ins por web, app o kiosko / total completados.
- No-show = tiquete pagado de un vuelo ya despegado sin check-in o sin abordar.

Reglas de negocio:
- Check-in online: abre 48 h y cierra 1 h antes. Counter: abre 3 h antes y cierra 1 h
  (nacional) o 1,5 h (internacional) antes.
- Las reservas tienen 24 h para pagarse; si no, expiran.
- Franquicia: básica 0 maletas, clásica 1x23 kg, flex 2x23 kg, business 2x32 kg.
  Exceso: maleta adicional $150.000, sobrepeso $90.000.
- Motivos de rechazo de check-in: reserva_no_encontrada, pago_pendiente, vuelo_cancelado,
  fuera_de_ventana, documento_invalido, sobreventa.

Decisiones típicas que puedes recomendar: promociones en rutas con baja ocupación,
recordatorios de check-in, abrir más counters, reasignar clientes a agentes bajo su meta,
revisar la pasarela de pagos de un canal con baja conversión, reforzar la comunicación de
documentos en rutas internacionales.

Si te preguntan algo fuera del CRM de AeroNova, responde amablemente que solo puedes
ayudar con información de ventas y check-in.
```

---

## 15. Mock del webhook para desarrollo del front

Para que el compañero no dependa de n8n mientras el workflow no está listo, el backend entrega `backend/mock-webhook/server.js`.

Requisitos:
- Node.js 18+ y **cero dependencias** (módulo `http`).
- Puerto `5678`, ruta `POST /webhook/aeronova-chat`.
- Responde a `OPTIONS` con los headers CORS (`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: Content-Type`, `Access-Control-Allow-Methods: POST, OPTIONS`).
- Valida que existan `message`, `sessionId` y `context`. Si falta alguno, devuelve 400 con `{ "response": "...", "actions": [], "error": true }`.
- Devuelve una respuesta de ejemplo que repite la vista y los filtros recibidos, con un retraso de 800 ms para simular la latencia.
- Uso: `node backend/mock-webhook/server.js`. En el front: `VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/aeronova-chat`.

---

## 16. Pruebas

### 16.1 Prueba del endpoint (`backend/tests/test-webhook.sh`)
```bash
curl -s -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" \
  -d @backend/contracts/examples/request-dashboard.json
```
Verificar: HTTP 200, el JSON tiene `response` (string no vacío) y `actions` (array).

### 16.2 Casos de prueba del agente (`backend/tests/preguntas-prueba.md`)
| # | Pregunta | Resultado esperado |
|---|---|---|
| 1 | "Hola" | Saludo breve y ofrece ayuda con ventas y check-in |
| 2 | "¿Cuánto vendimos este mes y cómo vamos frente al anterior?" | Usa `totalRevenue` y `totalRevenuePrevMonth`, con el % de variación |
| 3 | "¿Qué ruta tiene peor ocupación?" | Usa `occupancyByFlight` y recomienda una promoción |
| 4 | "¿Por qué se están rechazando check-ins?" | Usa `rejectionsByReason` con la acción correspondiente |
| 5 | "¿Qué agente está más lejos de su meta?" | Usa `agentPerformance` |
| 6 | "¿Cuántos pasajeros hay en el vuelo NV999?" (no está en el contexto) | Dice que no tiene ese dato; **no inventa** |
| 7 | Seguimiento: "¿y en el canal app?" después de la #2 | Mantiene el contexto gracias a la memoria |
| 8 | "Escríbeme un poema" | Redirige amablemente al alcance del CRM |
| 9 | Request sin `sessionId` | No rompe: respuesta controlada (rama de error) |
| 10 | Vista `checkin` con `selected` = un check-in rechazado | Explica el motivo y qué debe hacer el pasajero |

Guardar capturas de cada prueba en `docs/capturas/` para el informe.

---

## 17. Variables de entorno y secretos

| Variable / secreto | Dónde vive | En el repo |
|---|---|---|
| API key de Gemini | Credenciales de n8n | **Nunca** |
| `VITE_N8N_WEBHOOK_URL` | `frontend/.env` | Solo `frontend/.env.example`, sin valor real |
| `WEBHOOK_URL` (para las pruebas con curl) | Variable de shell local | No |

El JSON exportado de n8n no incluye el valor de las API keys, solo una referencia a la credencial. Aun así, revísalo antes de hacer commit.

---

## 18. Plan de trabajo y checklist del backend

| Semana | Tareas backend | Entregable de coordinación |
|---|---|---|
| 29 oct – 3 nov | Crear el monorepo, `.gitignore` y `docs/`. Escribir el contrato y los JSON Schemas en `backend/contracts/`. Hacer el mock del webhook. | **Contrato v1.0 acordado con el compañero** y mock funcionando |
| 4 – 10 nov | Crear el workflow en n8n (Webhook → AI Agent → Respond), la credencial de Gemini, Simple Memory y el System Message. Probar con la Test URL. | Workflow funcionando en modo test |
| 11 – 17 nov | Publicar y compartir la Production URL. Configurar CORS y la rama de error. Integrar con el front real y ajustar el System Message con las pruebas de 16.2. | Chat integrado end-to-end |
| 18 – 24 nov | (Opcional) Acciones v2. Exportar el JSON final. Escribir README del backend y tomar capturas. | Export final en el repo |
| 25 – 27 nov | Revisión final conjunta y entrega | **Entrega 27 nov** |

**Checklist**
- [ ] `backend/contracts/*.schema.json` creados y coherentes con la sección 12
- [ ] `backend/mock-webhook/server.js` funcionando con CORS
- [ ] Credencial de Gemini creada en n8n (no en el repo)
- [ ] Webhook POST `aeronova-chat` con Respond = Using 'Respond to Webhook' node
- [ ] AI Agent con prompt "Define below", System Message y On Error → error output
- [ ] Gemini `gemini-3-flash-preview` conectado
- [ ] Simple Memory con `sessionId`
- [ ] Respond to Webhook de éxito y de error devolviendo `{ response, actions }`
- [ ] Allowed Origins (CORS) configurado
- [ ] Workflow **publicado** y Production URL compartida con el front
- [ ] Los 10 casos de prueba de 16.2 pasan
- [ ] `backend/n8n/workflows/aeronova-chat.json` exportado y en el repo
- [ ] `backend/README.md` con pasos para importar y publicar

---

## 19. Problemas conocidos y riesgos

| Riesgo | Mitigación |
|---|---|
| La prueba gratis de n8n Cloud dura unos 14 días y vence antes de la entrega | Crear la cuenta hacia el 10 de noviembre, o usar n8n local (`npx n8n` o Docker) y exportar el JSON igual |
| Error al escribir "Hola" desde el front (lo menciona el lab) | Casi siempre es CORS, o que el workflow no está publicado, o que se usa la Test URL en vez de la Production URL. Revisar Executions en n8n. |
| La Test URL solo funciona mientras se presiona "Listen for test event" | El front siempre usa la Production URL del workflow publicado |
| JSON roto en la respuesta por comillas en el texto del agente | Usar la expresión de 13.5, no una plantilla con `"{{ }}"` |
| Contexto demasiado grande (consumo de tokens) | Límite de 15 KB y máximo 10 elementos por lista (12.3) |
| Memoria mezclando conversaciones | `sessionId` obligatorio y único por pestaña |
| El nombre del modelo de Gemini cambia o no está disponible | Elegir el modelo Flash vigente en el selector de n8n y anotarlo en el README |
| El agente inventa datos | System Message con la regla "nunca inventes cifras" y el caso de prueba #6 |

---

## 20. Glosario

| Término | Significado |
|---|---|
| PNR | Código de reserva de 6 caracteres |
| Load factor / ocupación | % de sillas vendidas de un vuelo |
| No-show | Pasajero con tiquete pagado que no se presentó |
| Franquicia | Equipaje incluido en la tarifa |
| Bag drop | Punto de entrega de equipaje para quien hizo check-in online |
| Webhook | URL de n8n que recibe las peticiones HTTP del front |
| Production URL | URL del webhook con el workflow publicado (la que usa el front) |
| Simple Memory | Memoria de conversación de n8n, indexada por `sessionId` |
| Vibecoding | Desarrollo de software guiado por prompts a una IA |
