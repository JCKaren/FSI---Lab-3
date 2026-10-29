import test from 'node:test';
import assert from 'node:assert/strict';
import { freshData, DEMO_NOW } from '../src/data/mockData.js';
import { analyze, defaultFilters, makeContext, checkinWindow } from '../src/lib/analytics.js';
import { registerCheckin, updateBookingStatus } from '../src/lib/operations.js';
import { buildRequest, sendMessage, getSessionId } from '../src/services/chatService.js';
import { toCsv } from '../src/lib/export.js';
const all = { dateFrom: null, dateTo: null, route: null, channel: null, flight: null, agentId: null };
test('mock: volumen, relaciones, fechas y estados coherentes', () => {
  const d = freshData();
  assert.ok(d.users.length >= 8 && d.routes.length >= 10 && d.flights.length >= 30 && d.passengers.length >= 80 && d.bookings.length >= 150 && d.checkins.length >= 100);
  const complete = new Set(), seats = new Set();
  for (const b of d.bookings) {
    assert.ok(d.passengers.some((p) => p.id === b.passenger_id));
    assert.ok(d.flights.some((f) => f.id === b.flight_id));
    assert.equal(b.total_amount, b.base_fare + b.taxes);
    assert.equal(Date.parse(b.expires_at) - Date.parse(b.created_at), 86400000);
    if (['web', 'app'].includes(b.channel)) assert.equal(b.agent_id, null);
    if (b.status === 'pending') assert.ok(Date.parse(b.expires_at) > Date.parse(DEMO_NOW));
  }
  for (const c of d.checkins) {
    const b = d.bookings.find((b) => b.id === c.booking_id);
    const f = d.flights.find((f) => f.id === c.flight_id);
    assert.equal(b.flight_id, c.flight_id); assert.equal(b.passenger_id, c.passenger_id);
    if (c.channel !== 'counter') assert.equal(c.agent_id, null);
    assert.ok(Date.parse(c.started_at) >= Date.parse(b.paid_at));
    assert.ok(Date.parse(c.completed_at || c.started_at) <= Date.parse(DEMO_NOW));
    if (c.status === 'completed') {
      assert.equal(b.status, 'paid'); assert.ok(c.seat && c.completed_at); assert.equal(c.rejection_reason, null);
      assert.ok(!complete.has(b.id)); complete.add(b.id);
      assert.ok(!seats.has(`${f.id}/${c.seat}`)); seats.add(`${f.id}/${c.seat}`);
      assert.ok(checkinWindow({ ...f, status: 'scheduled' }, d.routes.find((r) => r.id === f.route_id), c.channel, c.started_at));
    } else assert.ok(c.rejection_reason);
    if (c.excess_fee > 0) assert.ok(c.bags_count > ({ basica: 0, clasica: 1, flex: 2, business: 2 }[b.fare_class]));
  }
});
test('KPIs independientes: ingresos, conversión, digital, no-show y filtros', () => {
  const d = freshData(), a = analyze(d, all);
  const paid = d.bookings.filter((b) => b.status === 'paid');
  assert.equal(a.kpis.ventas.totalRevenue, paid.reduce((n, b) => n + b.total_amount, 0));
  assert.equal(a.kpis.ventas.conversionRate, paid.length / d.bookings.filter((b) => b.status !== 'pending').length);
  const completed = d.checkins.filter((c) => c.status === 'completed');
  assert.equal(a.kpis.checkin.digitalShare, completed.filter((c) => c.channel !== 'counter').length / completed.length);
  const noShows = paid.filter((b) => d.flights.find((f) => f.id === b.flight_id).status === 'departed' && !d.checkins.some((c) => c.booking_id === b.id && c.status === 'completed' && c.boarded));
  assert.equal(a.kpis.checkin.noShows, noShows.length);
  const filtered = analyze(d, { ...all, route: 'BOG-MDE', channel: 'web' });
  assert.ok(filtered.bookings.every((b) => b.channel === 'web' && d.flights.find((f) => f.id === b.flight_id).route_id === d.routes[0].id));
  assert.ok(filtered.checkins.every((c) => c.channel === 'web'));
  assert.equal(filtered.kpis.ventas.totalRevenue, filtered.bookings.filter((b) => b.status === 'paid').reduce((s, b) => s + b.total_amount, 0));
});
test('rango vacío: tasas finitas y comparación mensual independiente', () => {
  const a = analyze(freshData(), { ...all, dateFrom: '2030-01-01', dateTo: '2030-01-31' });
  for (const group of Object.values(a.kpis)) for (const value of Object.values(group)) assert.equal(value, 0);
  assert.equal(a.bookings.length, 0);
  assert.equal(a.previousPeriod, '2029-12-01 — 2029-12-31');
});
test('pagar una reserva actualiza ingresos; cancelar una emitida revierte el total', () => {
  let d = freshData(); const b = d.bookings.find((b) => b.status === 'pending');
  const before = analyze(d).kpis.ventas.totalRevenue;
  d = updateBookingStatus(d, b.id, 'paid');
  assert.equal(analyze(d).kpis.ventas.totalRevenue, before + b.total_amount);
  const checked = registerCheckin(d, { pnr: b.pnr, channel: 'web', seat: '12F', documents_valid: true, bags_count: 0, bags_weight_kg: 0, bag_weights: [] });
  assert.ok(Date.parse(checked.record.started_at) >= Date.parse(d.bookings.find((x) => x.id === b.id).paid_at));
  d = updateBookingStatus(d, b.id, 'cancelled');
  assert.equal(analyze(d).kpis.ventas.totalRevenue, before);
  assert.throws(() => updateBookingStatus(d, b.id, 'paid'));
});
test('check-in: ventana, pago, rechazo, asiento, duplicados y equipaje', () => {
  let d = freshData();
  const f = d.flights[24];
  const b = d.bookings.find((b) => b.flight_id === f.id && b.status === 'paid' && !d.checkins.some((c) => c.booking_id === b.id && c.status === 'completed'));
  const input = { pnr: b.pnr, channel: 'web', seat: '12F', documents_valid: true, bags_count: 0, bags_weight_kg: 0, bag_weights: [], fee_confirmed: false };
  const result = registerCheckin(d, input); d = result.data;
  assert.equal(result.record.status, 'completed'); assert.equal(result.record.seat, '12F');
  assert.throws(() => registerCheckin(d, input), /ya tiene/);
  assert.throws(() => updateBookingStatus(d, b.id, 'cancelled'), /check-in completado/);
  const pending = d.bookings.find((b) => b.status === 'pending' && b.flight_id === f.id);
  assert.equal(registerCheckin(d, { ...input, pnr: pending.pnr }).record.rejection_reason, 'pago_pendiente');
  const distant = d.bookings.find((b) => b.flight_id === d.flights[29].id && b.status === 'paid');
  assert.equal(registerCheckin(d, { ...input, pnr: distant.pnr }).record.rejection_reason, 'fuera_de_ventana');
  assert.throws(() => registerCheckin(d, { ...input, pnr: distant.pnr, bags_count: 1, bags_weight_kg: 35, bag_weights: [35] }), /32 kg/);
  const international = d.flights[25], route = d.routes.find((r) => r.id === international.route_id);
  assert.equal(checkinWindow({ ...international, departure_at: '2026-10-28T18:15:00Z' }, route, 'counter'), false);
  assert.equal(checkinWindow({ ...international, departure_at: '2026-10-28T18:15:00Z' }, route, 'web'), true);
});
test('contrato v1: selección, filtros, listas, tamaño, texto intacto y sesión', () => {
  const d = freshData(), a = analyze(d, all), selected = { type: 'passenger', data: d.passengers[0] };
  const c = makeContext('pasajeros', all, a, selected);
  const req = buildRequest('  ¿Cómo vamos?  ', c, crypto.randomUUID());
  assert.equal(req.message, '  ¿Cómo vamos?  '); assert.equal(c.selected.data.id, selected.data.id);
  assert.ok(Object.values(c.breakdowns).every((v) => v.length <= 10));
  assert.ok(new TextEncoder().encode(JSON.stringify(req)).length < 15000);
  assert.throws(() => buildRequest(' ', c, req.sessionId));
  assert.throws(() => buildRequest('x'.repeat(1001), c, req.sessionId));
  assert.throws(() => buildRequest('hola', { ...c, selected: { data: 'x'.repeat(15000) } }, req.sessionId));
  const map = new Map(), storage = { getItem: (key) => map.get(key), setItem: (key, value) => map.set(key, value) };
  assert.equal(getSessionId(storage), getSessionId(storage));
});
test('chat HTTP: POST, JSON, acciones toleradas y errores recuperables', async () => {
  const c = makeContext('dashboard', defaultFilters, analyze(freshData()), null);
  const sessionId = crypto.randomUUID();
  let sent;
  const result = await sendMessage('Hola', c, { sessionId, url: 'https://example.invalid/webhook', fetcher: async (_, options) => { sent = options; return { ok: true, json: async () => ({ response: 'Respuesta de prueba', actions: [] }) }; } });
  assert.equal(sent.method, 'POST'); assert.equal(JSON.parse(sent.body).sessionId, sessionId); assert.equal(result.response, 'Respuesta de prueba');
  for (const response of [{ ok: false, status: 500 }, { ok: true, json: async () => { throw new Error('malformed'); } }, { ok: true, json: async () => ({ response: 'Error', actions: [], error: true }) }, { ok: true, json: async () => ({ response: 45 }) }]) await assert.rejects(sendMessage('Hola', c, { sessionId, url: 'https://example.invalid', fetcher: async () => response }), /No pudimos conectar/);
  await assert.rejects(sendMessage('Hola', c, { sessionId, url: 'https://example.invalid', timeout: 5, fetcher: async (_, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))) }), /tardó/);
});
test('CSV conserva comillas y neutraliza fórmulas', () => { const csv = toCsv([{ nombre: '=1+1', nota: 'a;"b"' }]); assert.ok(csv.includes("'=1+1")); assert.ok(csv.includes('a;""b""')); });
