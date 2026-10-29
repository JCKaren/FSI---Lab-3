import { DEMO_NOW } from '../data/mockData.js';
import { checkinWindow } from './analytics.js';
export function updateBookingStatus(data, id, status, at = DEMO_NOW) {
  const booking = data.bookings.find((b) => b.id === id);
  if (!booking) throw new Error('No se encontró la reserva.');
  const flight = data.flights.find((f) => f.id === booking.flight_id);
  if (!['paid', 'cancelled'].includes(status)) throw new Error('Cambio de estado no permitido.');
  if (Date.parse(flight.departure_at) <= Date.parse(at)) throw new Error('El vuelo ya salió; no se puede cambiar esta reserva.');
  if (data.checkins.some((c) => c.booking_id === id && c.status === 'completed')) throw new Error('La reserva ya tiene un check-in completado.');
  if (status === 'paid' && (booking.status !== 'pending' || Date.parse(booking.expires_at) <= Date.parse(at) || flight.status === 'cancelled')) throw new Error('Solo puedes pagar una reserva pendiente, vigente y con vuelo activo.');
  if (status === 'paid' && data.bookings.filter((b) => b.flight_id === flight.id && b.status === 'paid').length >= flight.capacity) throw new Error('El vuelo no tiene sillas disponibles.');
  if (status === 'cancelled' && !['pending', 'paid'].includes(booking.status)) throw new Error('Esta reserva ya está cerrada.');
  return { ...data, bookings: data.bookings.map((b) => b.id === id ? { ...b, status, stage_id: data.sale_stages[status === 'paid' ? 3 : 4].id, paid_at: status === 'paid' ? at : null, payment_method: status === 'paid' ? 'tarjeta_credito' : null, lost_reason: status === 'cancelled' ? 'cancelada_por_cliente' : null } : b) };
}
export function registerCheckin(data, input, at = DEMO_NOW) {
  const b = data.bookings.find((b) => b.pnr === input.pnr.trim().toUpperCase());
  if (!b) throw new Error('PNR no encontrado. Revisa el código de reserva.');
  if (!['web', 'app', 'kiosk', 'counter'].includes(input.channel)) throw new Error('Canal de check-in inválido.');
  const f = data.flights.find((f) => f.id === b.flight_id);
  const r = data.routes.find((r) => r.id === f.route_id);
  if (data.checkins.some((c) => c.booking_id === b.id && c.status === 'completed')) throw new Error('Esta reserva ya tiene un check-in completado.');
  if (input.channel === 'counter' && !data.users.some((u) => u.id === input.agent_id && u.role === 'checkin_agent')) throw new Error('Selecciona un agente de aeropuerto.');
  const bags = Number(input.bags_count);
  const weight = Number(input.bags_weight_kg);
  if (!Number.isInteger(bags) || bags < 0 || bags > 6 || !Number.isFinite(weight) || weight < 0 || (bags === 0 && weight !== 0) || (bags > 0 && weight === 0)) throw new Error('Revisa la cantidad y el peso de las maletas.');
  const allowance = { basica: 0, clasica: 1, flex: 2, business: 2 }[b.fare_class];
  const kgPerBag = b.fare_class === 'business' ? 32 : 23;
  // Se registran pesos individuales para no ocultar sobrepeso detrás del promedio.
  const weights = (input.bag_weights || []).map(Number);
  if (weights.length !== bags || weights.some((kg) => !Number.isFinite(kg) || kg <= 0 || kg > 32) || Math.abs(weights.reduce((a, v) => a + v, 0) - weight) > 0.01) throw new Error('Indica un peso válido por maleta (máximo 32 kg).');
  const reason = b.status !== 'paid' ? 'pago_pendiente' : f.status === 'cancelled' ? 'vuelo_cancelado' : !checkinWindow(f, r, input.channel, at) ? 'fuera_de_ventana' : !input.documents_valid ? 'documento_invalido' : null;
  const seat = input.seat.trim().toUpperCase();
  if (!reason && !/^([1-9]|[12][0-9]|30)[A-F]$/.test(seat)) throw new Error('Usa un asiento entre 1A y 30F.');
  const seatIndex = (Number(seat.slice(0, -1)) - 1) * 6 + 'ABCDEF'.indexOf(seat.slice(-1));
  if (!reason && seatIndex >= f.capacity) throw new Error('El asiento no existe en este avión.');
  if (!reason && data.checkins.some((c) => c.flight_id === f.id && c.status === 'completed' && c.seat === seat)) throw new Error('El asiento ya está ocupado. Elige otro.');
  const fee = Math.max(0, bags - allowance) * 150000 + weights.filter((kg) => kg > kgPerBag).length * 90000;
  if (!reason && fee > 0 && !input.fee_confirmed) throw new Error(`Confirma el cobro simulado de COP ${fee.toLocaleString('es-CO')} por equipaje.`);
  const typicalDuration = input.channel === 'counter' ? 360 : input.channel === 'kiosk' ? 150 : 90;
  // El reloj de evaluación es fijo: un tiquete recién pagado puede producir
  // un intento instantáneo, pero nunca un check-in iniciado antes del pago.
  const duration = b.paid_at ? Math.max(0, Math.min(typicalDuration, Math.floor((Date.parse(at) - Date.parse(b.paid_at)) / 1000))) : typicalDuration;
  const record = { id: crypto.randomUUID(), booking_id: b.id, passenger_id: b.passenger_id, flight_id: b.flight_id, agent_id: input.channel === 'counter' ? input.agent_id : null, channel: input.channel, status: reason ? 'rejected' : 'completed', rejection_reason: reason, seat: reason ? null : seat, bags_count: reason ? 0 : bags, bags_weight_kg: reason ? 0 : weight, excess_fee: reason ? 0 : fee, started_at: new Date(Date.parse(at) - duration * 1000).toISOString(), completed_at: reason ? null : at, duration_seconds: duration, security_passed: null, boarded: false };
  return { data: { ...data, checkins: [...data.checkins, record] }, record };
}
