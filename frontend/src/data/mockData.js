// Escenario reproducible. El reloj de la demo se mantiene fijo para poder evaluar
// ventanas de check-in, vencimientos y comparativas después de la fecha del lab.
export const DEMO_NOW = '2026-10-28T17:00:00.000Z';
const hour = 3600000;
const day = 24 * hour;
const iso = (ms) => new Date(ms).toISOString();
const now = Date.parse(DEMO_NOW);
const uuid = (kind, n) => `${String(kind).padStart(8, '0')}-0000-4000-8000-${String(n + 1).padStart(12, '0')}`;
let seed = 42;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const names = ['Laura Méndez', 'Daniel Ríos', 'Valentina López', 'Santiago Pérez', 'Camila Torres', 'Andrés Gómez', 'Lucía Castro', 'Mateo Vargas'];
const users = names.map((full_name, i) => ({ id: uuid(1, i), full_name, email: `agente${i + 1}@aeronova.example`, role: i < 6 ? 'sales_agent' : 'checkin_agent', station: ['BOG', 'MDE', 'CLO'][i % 3], avatar_url: '', quota_amount: i < 6 ? 18000000 + i * 3000000 : 0, status: 'active' }));
const sale_stages = ['Búsqueda', 'Reservada', 'Pago pendiente', 'Emitida', 'Cancelada/Expirada'].map((name, i) => ({ id: uuid(2, i), name, display_order: i + 1, conversion_probability: [10, 30, 60, 100, 0][i] }));
const routeSpecs = [
  ['BOG', 'MDE', 'Bogotá', 'Medellín', false, 239], ['BOG', 'CTG', 'Bogotá', 'Cartagena', false, 657],
  ['MDE', 'CTG', 'Medellín', 'Cartagena', false, 476], ['CLO', 'BOG', 'Cali', 'Bogotá', false, 280],
  ['BOG', 'BAQ', 'Bogotá', 'Barranquilla', false, 704], ['BOG', 'MIA', 'Bogotá', 'Miami', true, 2436],
  ['MDE', 'PTY', 'Medellín', 'Ciudad de Panamá', true, 535], ['BOG', 'MEX', 'Bogotá', 'Ciudad de México', true, 3159],
  ['BOG', 'MAD', 'Bogotá', 'Madrid', true, 8033], ['MDE', 'CLO', 'Medellín', 'Cali', false, 330],
];
const routes = routeSpecs.map(([origin, destination, origin_city, destination_city, is_international, distance_km], i) => ({ id: uuid(3, i), origin, destination, origin_city, destination_city, is_international, distance_km }));
const flights = Array.from({ length: 30 }, (_, i) => {
  const route = routes[i % 10];
  const departure = i < 24 ? now - (77 - i * 3) * day : now + [2, 2.5, 6, 18, 30, 60][i - 24] * hour;
  return { id: uuid(4, i), flight_number: `NV${214 + i * 13}`, route_id: route.id, departure_at: iso(departure), arrival_at: iso(departure + (route.is_international ? 5 : 1.3) * hour), aircraft: route.is_international ? 'Airbus A320' : 'ATR 72', capacity: route.is_international ? 180 : 72, status: i < 24 ? 'departed' : 'scheduled' };
});
const firstNames = ['Mariana', 'Andrés', 'Isabella', 'Julián', 'Gabriela', 'Nicolás', 'Sofía', 'Sebastián', 'Valeria', 'Felipe', 'Daniela', 'David', 'Paula', 'Juan', 'Sara', 'Martín', 'Catalina', 'Tomás'];
const lastNames = ['Gómez', 'Rodríguez', 'Torres', 'Restrepo', 'López', 'García', 'Herrera', 'Ramírez', 'Moreno', 'Vargas'];
const passengers = Array.from({ length: 180 }, (_, i) => ({ id: uuid(5, i), full_name: `${firstNames[i % 18]} ${lastNames[Math.floor(i / 18)]}`, document_type: 'PASAPORTE', document_number: `DEMO${String(i + 1).padStart(5, '0')}`, nationality: 'CO', email: `pasajero${i + 1}@example.com`, phone: `300000${String(i).padStart(4, '0')}`, loyalty_tier: ['none', 'silver', 'gold', 'diamond'][i % 4], created_at: '2026-07-01T15:00:00.000Z' }));
const bookings = [];
const checkins = [];
flights.forEach((flight, f) => {
  const route = routes.find((r) => r.id === flight.route_id);
  const departure = Date.parse(flight.departure_at);
  for (let j = 0; j < 50; j++) {
    const i = bookings.length;
    const channel = ['web', 'app', 'counter', 'call_center'][Math.floor(random() * 4)];
    const draw = random();
    const status = draw < 0.77 ? 'paid' : draw < 0.86 ? (f >= 24 ? 'pending' : 'expired') : draw < 0.94 ? 'expired' : 'cancelled';
    const created = status === 'pending' ? now - 6 * hour : Math.min(now - 2 * day, departure - (2 + Math.floor(random() * 12)) * day);
    const base_fare = (route.is_international ? 1100000 : 180000) + Math.floor(random() * (route.is_international ? 140 : 40)) * 10000;
    const taxes = Math.round(base_fare * 0.19);
    const booking = { id: uuid(6, i), pnr: `NV${i.toString(36).toUpperCase().padStart(4, '0')}`, passenger_id: passengers[(f * 17 + j) % 180].id, flight_id: flight.id, agent_id: ['web', 'app'].includes(channel) ? null : users[(i + f) % 6].id, stage_id: sale_stages[status === 'paid' ? 3 : status === 'pending' ? (j % 2 ? 1 : 2) : 4].id, channel, fare_class: ['basica', 'clasica', 'flex', 'business'][j % 4], base_fare, taxes, total_amount: base_fare + taxes, currency: 'COP', payment_method: status === 'paid' ? ['tarjeta_credito', 'pse', 'tarjeta_debito'][j % 3] : null, status, created_at: iso(created), expires_at: iso(created + day), paid_at: status === 'paid' ? iso(created + 2 * hour) : null, lost_reason: status === 'expired' ? 'reserva_expirada' : status === 'cancelled' ? 'cancelada_por_cliente' : null };
    bookings.push(booking);
    const canAttempt = departure - now <= 48 * hour;
    if (status !== 'paid' || !canAttempt || random() > (f < 24 ? 0.94 : 0.58)) continue;
    const channelCI = (f < 24 || departure - now < 3 * hour) ? ['web', 'app', 'kiosk', 'counter'][j % 4] : ['web', 'app', 'kiosk'][j % 3];
    const completed = random() > 0.12;
    const duration = channelCI === 'counter' ? 300 + j * 9 : channelCI === 'kiosk' ? 120 + j * 3 : 60 + j * 2;
    const started = f < 24 ? departure - (channelCI === 'counter' ? 2.5 : 12) * hour : now - (duration + 30) * 1000;
    const allowance = [0, 1, 2, 2][j % 4];
    const extra = completed && j % 9 === 0;
    checkins.push({ id: uuid(7, checkins.length), booking_id: booking.id, passenger_id: booking.passenger_id, flight_id: flight.id, agent_id: channelCI === 'counter' ? users[6 + j % 2].id : null, channel: channelCI, status: completed ? 'completed' : 'rejected', rejection_reason: completed ? null : (j % 2 ? 'documento_invalido' : 'sobreventa'), seat: completed ? `${Math.floor(j / 6) + 1}${'ABCDEF'[j % 6]}` : null, bags_count: completed ? (extra ? allowance + 1 : Math.min(allowance, 1)) : 0, bags_weight_kg: completed ? (extra ? allowance + 1 : Math.min(allowance, 1)) * 20 : 0, excess_fee: extra ? 150000 : 0, started_at: iso(started), completed_at: completed ? iso(started + duration * 1000) : null, duration_seconds: duration, security_passed: completed && f < 24 ? j % 17 !== 0 : null, boarded: completed && f < 24 && j % 17 !== 0 });
  }
});
export const mockData = { users, sale_stages, passengers, routes, flights, bookings, checkins };
export const freshData = () => structuredClone(mockData);
