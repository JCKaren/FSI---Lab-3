# AeroNova CRM — Laboratorio 3

Aplicación React + Vite + Recharts para los procesos de venta de tiquetes y check-in.
Proyecto monorepo del laboratorio: dashboard React + Vite y workflow exportable de n8n.
El frontend usa datos simulados locales; el workflow de Nova vive en `backend/`.

## Abrir en Antigravity

1. Instalar **Google Antigravity IDE** desde https://antigravity.google/download.
2. Elegir **Open Folder** y abrir esta carpeta `aeronova-crm`.
3. Abrir una terminal dentro del IDE y ejecutar:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Abrir la URL que imprime Vite, normalmente `http://127.0.0.1:5173`.
En esta máquina Node.js y npm ya estaban instalados. Se requiere Node >=22.12.
En macOS/Linux se puede usar `npm` en lugar de `npm.cmd`.

## Qué incluye

- Dashboard con ingresos, conversión, tiquetes vendidos, promedio, curva de ventas y valor por etapa.
- Filtros globales por fecha, ruta, canal, vuelo y agente.
- Ventas: búsqueda por PNR o pasajero, detalles, pago y cancelación simulados.
- Pasajeros: datos de contacto ficticios, fidelización e historial completo de reservas/check-in.
- Vuelos: rutas, estado, salida, ocupación y pendientes; detalle con pasajeros pagados.
- Check-in: tiempos por canal, rechazos, equipaje, no-show y formulario para registrar intentos.
- Equipo: metas mensuales, cumplimiento y actividad de agentes de aeropuerto.
- Nova: widget en todas las vistas, Markdown seguro, contexto del registro, estado de carga y reintento.
- Exportación CSV con filtros globales, paginación, estados vacíos y diseño adaptable.
- Persistencia local de los cambios y opción de restablecer la demo.

## Datos y reglas

`frontend/src/data/mockData.js` genera de manera determinista 8 agentes, 10 rutas,
30 vuelos, 180 pasajeros, 1.500 reservas y más de 100 intentos de check-in.
Los registros son ficticios; correos `.example`/`example.com` y documentos `DEMO`.
El `schema.json` aportado se conserva como ejemplo simplificado; la implementación
usa las siete entidades detalladas en `estructura_datos.md` y el contrato v1.0.

El reloj de evaluación está fijado en **2026-10-28T17:00:00Z** (12:00 Bogotá).
Esto mantiene reproducibles la demo, las ventanas de check-in y los vencimientos.
No representa una operación en tiempo real. Para cambiar el escenario, ajustar
`DEMO_NOW`, las fechas iniciales y los textos de la demo; luego restablecer los datos.

Los cambios se guardan en `localStorage` (`aeronova-data-v1`) y son independientes
en cada navegador/origen. No hay pagos, correos, reservas ni cobros reales.
No se permite pagar reservas expiradas, modificar vuelos pasados o cancelar un
tiquete con check-in completado. Los intentos rechazados se conservan con su motivo.
Se validan asiento único, capacidad, documentos declarados, ventanas por canal y
pesos individuales de maletas. Exceso: $150.000 por maleta adicional y $90.000 por
maleta con sobrepeso, máximo 32 kg. Los cobros requieren confirmación simulada.

## Interpretación de filtros y KPIs

- Ventas: fecha de pago para `paid`; fecha de creación para los demás estados.
- Check-in: fecha del intento; canal y agente corresponden al check-in, no a la compra.
- Vuelos, pendientes y no-show: fecha de salida. Ocupación muestra el segmento de
  ventas seleccionado por canal/agente sobre la capacidad total. El detalle del vuelo
  muestra explícitamente su ocupación total.
- Pendientes: reservas pagadas sin check-in completado, vuelo `scheduled`, dentro de
  la ventana online de 48 h a 1 h. No-show: vuelo `departed` y sin check-in/abordaje.
- Comparativa: mes calendario anterior al mes inicial del filtro (octubre si no hay
  fecha inicial), conservando las dimensiones. Para comparar meses completos usar
  un mes completo. Un rango parcial no se presenta como comparación equivalente.
- Meta del equipo: ventas del mes inicial, intersectadas con el rango y filtros,
  divididas por la meta mensual; el mes de referencia se conserva en los agregados.
- Ratios sin denominador son cero. Importes enviados al backend son COP enteros.
- La búsqueda de texto solo filtra la tabla; CSV, KPIs y Nova usan filtros globales.
- Historial de pasajero y detalle de vuelo muestran el historial completo, rotulado.

## Backend n8n

El workflow del equipo está en `backend/n8n/workflows/aeronova-chat.json`. Incluye
Webhook POST, validación del request, AI Agent, Gemini Chat Model, Simple Memory y
respuestas JSON de éxito, error y validación. Se importó y publicó en la instancia
n8n local, y una ejecución desde el front terminó correctamente. El export actualizado
incluye el origen CORS local; la API key sigue guardada como credencial en n8n y no se
incluye en el proyecto. Para usarlo en otra instancia hay que asignar allí una credencial
Gemini propia. Consulta [backend/README.md](backend/README.md).

## Conectar frontend y n8n

El frontend ya implementa el contrato v1.0 de la sección 12 del contexto original.
Consulta [docs/INTEGRACION_FRONTEND.md](docs/INTEGRACION_FRONTEND.md).

La conexión local de esta máquina está configurada en el archivo ignorado
`frontend/.env` con `http://localhost:5678/webhook/aeronova-chat`. Ese archivo no se
incluye en el repositorio ni en el ZIP de entrega. En otra máquina, configura en
`frontend/.env` la Production URL de su instancia n8n y reinicia Vite. Hasta configurar
una URL, el chat muestra un **resumen local sin IA**, identificado en la interfaz.
El backend debe permitir CORS para el origen exacto del frontend.

No poner la API key de Gemini en el frontend. Guárdala en las credenciales de n8n.

## Verificación

```powershell
cd frontend
npm.cmd test
npm.cmd run build
```

Las pruebas cubren integridad del mock, fórmulas, filtros, cambios de reserva,
ventanas y validaciones de check-in, contrato y límites del chat, errores HTTP,
timeout, sesión y CSV. `dist/` contiene el frontend compilado.
Se verificó una conversación de extremo a extremo: el front recibió respuesta y n8n
registró una ejecución exitosa. Para una revisión adicional, seguir los recorridos de
filtros, registro seleccionado, cambio de módulo y reintento descritos en
`docs/INTEGRACION_FRONTEND.md`.

## Entrega y coordinación

Compartir el monorepo completo sin `frontend/node_modules`, `.env` ni `frontend/dist`.
Incluir `package-lock.json`, el workflow exportado, `backend/README.md` y `docs/`.
Los archivos del equipo se conservan; la configuración de Gemini se añade en la
cuenta de n8n y no se guarda en el repositorio.

Diseño aplicado: referencia de estilo de la guía (crema, blanco, coral, verde suave).
No se recibió una captura externa de Dribbble. Si el profesor pide esa evidencia,
adjuntar una referencia visual elegida por el equipo y documentar su procedencia.
