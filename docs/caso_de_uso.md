# Caso de uso: Dashboard CRM de AeroNova (Fase I – Paso 1)

## 1. Problema: ¿qué KPIs se necesitan monitorear?

La aerolínea no tiene una vista unificada de sus dos procesos de cara al cliente: la **venta de tiquetes** y el **check-in**. Hoy no se sabe a tiempo qué rutas venden poco, qué canal convierte mejor, qué vuelos tienen muchos pasajeros sin check-in ni por qué se rechazan check-ins.

**KPIs de venta**
- Ingresos totales: suma de `total_amount` de las ventas con `status = 'paid'`, comparada con el mes anterior.
- Tiquetes vendidos: conteo de ventas pagadas.
- Tiquete promedio: ingresos ÷ tiquetes vendidos.
- Tasa de conversión: pagadas ÷ (pagadas + expiradas + canceladas).
- Reservas pendientes de pago: conteo de ventas con `status = 'pending'`.
- Ocupación por vuelo (load factor): tiquetes pagados del vuelo ÷ `capacity`.

**KPIs de check-in**
- Tasa de check-in completado: completados ÷ (completados + rechazados).
- % de check-in digital: (web + app + kiosko) ÷ total de check-ins completados.
- Tiempo promedio de check-in: promedio de `duration_seconds` (segmentado por canal).
- Rechazos por motivo: conteo agrupado por `rejection_reason`.
- Ingresos por exceso de equipaje: suma de `excess_fee`.
- Pendientes de check-in: tiquetes pagados de vuelos próximos sin check-in.
- No-show: tiquetes pagados de vuelos ya despegados sin check-in o sin abordar.

## 2. Usuario final

El **Gerente comercial y de servicio al pasajero** de AeroNova. Es un perfil ejecutivo, no técnico: necesita ver las cifras en segundos y filtrar por fecha, ruta, canal, vuelo y agente.

Usuarios secundarios: los supervisores de aeropuerto, que miran sobre todo los indicadores de check-in de los vuelos del día.

## 3. Acciones: ¿qué decisiones se toman con el dashboard?

| Si el dashboard muestra… | Decisión |
|---|---|
| Ruta con ocupación baja (< 60 %) a pocos días del vuelo | Lanzar una promoción o tarifa especial en esa ruta |
| Canal con conversión baja (por ejemplo, muchos pagos rechazados en la app) | Revisar la pasarela o la experiencia de pago en ese canal |
| Agente de ventas por debajo de su meta mensual | Reasignar leads o clientes y dar acompañamiento |
| Muchos pendientes de check-in en un vuelo próximo | Enviar recordatorios y abrir más counters |
| Tiempo de check-in en counter muy alto | Reasignar agentes o promover el check-in digital |
| Muchos rechazos por `documento_invalido` en rutas internacionales | Reforzar la comunicación de requisitos al momento de la venta |

## 4. Funciones del CRM (alcance de la aplicación)

1. **Dashboard**: KPIs, gráficos y filtros.
2. **Ventas / Reservas**: listado, búsqueda por PNR, detalle y cambio de estado.
3. **Pasajeros (clientes)**: ficha con historial de compras y check-ins, y nivel de fidelización.
4. **Vuelos**: listado con ocupación, estado y pendientes de check-in.
5. **Check-in**: registro y seguimiento de check-ins, con sus motivos de rechazo.
6. **Equipo**: agentes con su meta y cumplimiento.
7. **Chatbot (n8n + Gemini)**: responde preguntas sobre los datos que se están viendo.
