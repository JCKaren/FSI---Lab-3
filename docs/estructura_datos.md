# Estructura de DATOS – CRM AeroNova (Venta de tiquetes y Check-in)

Moneda: COP. Fechas en ISO 8601 (UTC).

## 1. Tabla de Usuarios (Agentes y equipo)
Permite filtrar por agente y comparar las ventas de cada uno contra su meta.

{
  "id": "string (UUID - identificador único del usuario)",
  "full_name": "string (Nombre completo, ej: 'Laura Méndez')",
  "email": "string (Correo corporativo)",
  "role": "string ('admin', 'manager', 'sales_agent', 'checkin_agent')",
  "station": "string (Código IATA del aeropuerto/oficina donde trabaja, ej: 'BOG')",
  "avatar_url": "string (URL de la imagen para la interfaz)",
  "quota_amount": "decimal (Meta mensual de ventas en COP. 0 para checkin_agent)",
  "status": "string ('active', 'inactive')"
}

## 2. Tabla de Etapas de Venta (Sales Stages)
Columnas del gráfico de barras "Ingresos por etapa". Corresponden a los pasos del proceso de venta.

{
  "id": "string (UUID)",
  "name": "string ('Búsqueda', 'Reservada', 'Pago pendiente', 'Emitida', 'Cancelada/Expirada')",
  "display_order": "integer (1, 2, 3... para ordenar el gráfico de izquierda a derecha)",
  "conversion_probability": "integer (Porcentaje estimado de que termine en venta, ej: 60)"
}

## 3. Tabla de Pasajeros (Clientes)
La persona que compra y vuela.

{
  "id": "string (UUID)",
  "full_name": "string",
  "document_type": "string ('CC', 'CE', 'PASAPORTE')",
  "document_number": "string",
  "nationality": "string (ISO 3166, ej: 'CO')",
  "email": "string",
  "phone": "string",
  "loyalty_tier": "string ('none', 'silver', 'gold', 'diamond')",
  "created_at": "datetime (Fecha de registro)"
}

## 4. Tabla de Rutas
{
  "id": "string (UUID)",
  "origin": "string (IATA, ej: 'BOG')",
  "destination": "string (IATA, ej: 'MDE')",
  "origin_city": "string",
  "destination_city": "string",
  "is_international": "boolean (Define la ventana de check-in y los documentos exigidos)",
  "distance_km": "integer"
}

## 5. Tabla de Vuelos
{
  "id": "string (UUID)",
  "flight_number": "string (ej: 'NV214')",
  "route_id": "string (Foreign Key -> Rutas)",
  "departure_at": "datetime (Salida programada)",
  "arrival_at": "datetime",
  "aircraft": "string (ej: 'A320')",
  "capacity": "integer (Sillas totales. Base del % de ocupación)",
  "status": "string ('scheduled', 'boarding', 'departed', 'delayed', 'cancelled')"
}

## 6. Tabla de Ventas / Reservas (Bookings) — TABLA CENTRAL DE VENTAS
Aquí salen los KPIs de ingresos, tiquetes, conversión y ocupación. Una fila es un tiquete (un pasajero en un vuelo).

{
  "id": "string (UUID)",
  "pnr": "string (Código de reserva de 6 caracteres, ej: 'K7XQ2M')",
  "passenger_id": "string (Foreign Key -> Pasajeros)",
  "flight_id": "string (Foreign Key -> Vuelos)",
  "agent_id": "string | null (Foreign Key -> Usuarios. null si se vendió por web/app)",
  "stage_id": "string (Foreign Key -> Etapas de Venta)",
  "channel": "string ('web', 'app', 'counter', 'call_center')",
  "fare_class": "string ('basica', 'clasica', 'flex', 'business')",
  "base_fare": "decimal",
  "taxes": "decimal",
  "total_amount": "decimal (base_fare + taxes. Alimenta 'Ingresos' y 'Tiquete promedio')",
  "currency": "string ('COP')",
  "payment_method": "string | null ('tarjeta_credito', 'pse', 'efectivo', 'tarjeta_debito')",
  "status": "string ('pending', 'paid', 'expired', 'cancelled'. Vital para la conversión)",
  "created_at": "datetime (Creación de la reserva. Alimenta 'nuevas esta semana')",
  "expires_at": "datetime (created_at + 24 h)",
  "paid_at": "datetime | null (Fecha real de venta. Para las gráficas históricas)",
  "lost_reason": "string | null ('sin_disponibilidad', 'pago_rechazado', 'reserva_expirada', 'cancelada_por_cliente')"
}

## 7. Tabla de Check-ins — TABLA CENTRAL DE OPERACIÓN
Un registro por intento de check-in. Alimenta los KPIs de check-in.

{
  "id": "string (UUID)",
  "booking_id": "string (Foreign Key -> Ventas)",
  "passenger_id": "string (Foreign Key -> Pasajeros)",
  "flight_id": "string (Foreign Key -> Vuelos)",
  "agent_id": "string | null (Foreign Key -> Usuarios. Solo si fue en counter)",
  "channel": "string ('web', 'app', 'kiosk', 'counter')",
  "status": "string ('completed', 'rejected')",
  "rejection_reason": "string | null ('reserva_no_encontrada', 'pago_pendiente', 'vuelo_cancelado', 'fuera_de_ventana', 'documento_invalido', 'sobreventa')",
  "seat": "string | null (ej: '14C')",
  "bags_count": "integer",
  "bags_weight_kg": "decimal",
  "excess_fee": "decimal (Cargo por exceso cobrado; 0 si no aplica)",
  "started_at": "datetime",
  "completed_at": "datetime | null",
  "duration_seconds": "integer (Tiempo del check-in)",
  "security_passed": "boolean | null (Resultado del control de seguridad. null si aún no pasa)",
  "boarded": "boolean (Si abordó el vuelo)"
}

## Resumen de relaciones para el desarrollador
- 1 Usuario (agente) gestiona N Ventas y N Check-ins de counter.
- 1 Pasajero tiene N Ventas (historial de compras) y N Check-ins.
- 1 Ruta tiene N Vuelos.
- 1 Vuelo tiene N Ventas (para la ocupación) y N Check-ins.
- 1 Etapa contiene N Ventas (para agrupar en el gráfico de barras).
- 1 Venta pagada puede tener 0..N intentos de Check-in (rechazados) y como máximo 1 completado.

## Reglas para generar datos simulados coherentes
- Solo las ventas con `status = 'paid'` pueden tener check-in completado.
- Ventas con `channel` 'web' o 'app' llevan `agent_id = null`.
- Un check-in completado tiene `seat`, `completed_at` y `rejection_reason = null`. Un rechazado tiene `seat = null` y un motivo.
- `excess_fee > 0` solo si las maletas superan la franquicia de `fare_class` (básica 0, clásica 1×23 kg, flex 2×23 kg, business 2×32 kg).
- Vuelos con `status = 'departed'`: las ventas pagadas sin check-in completado cuentan como no-show.
- Duraciones típicas: web/app 60–180 s, kiosko 120–300 s, counter 300–900 s.
