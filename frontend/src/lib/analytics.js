import { dateKey, routeCode } from './format.js';
import { DEMO_NOW } from '../data/mockData.js';
export const defaultFilters = { dateFrom: '2026-10-01', dateTo: '2026-10-31', route: null, channel: null, flight: null, agentId: null };
const sum = (rows, field) => rows.reduce((n, r) => n + r[field], 0);
const ratio = (a, b) => b ? a / b : 0;
export function inRange(value, filters) {
  const day = dateKey(value);
  return (!filters.dateFrom || day >= filters.dateFrom) && (!filters.dateTo || day <= filters.dateTo);
}
export function checkinWindow(flight, route, channel, at = DEMO_NOW) {
  const hours = (Date.parse(flight.departure_at) - Date.parse(at)) / 3600000;
  return flight.status === 'scheduled' && (channel === 'counter' ? hours <= 3 && hours >= (route.is_international ? 1.5 : 1) : hours <= 48 && hours >= 1);
}
export function analyze(data, filters = defaultFilters, at = DEMO_NOW) {
  const flightMap = new Map(data.flights.map((x) => [x.id, x]));
  const routeMap = new Map(data.routes.map((x) => [x.id, x]));
  const bookingMap = new Map(data.bookings.map((x) => [x.id, x]));
  const matchesFlight = (id) => {
    const f = flightMap.get(id);
    return f && (!filters.flight || f.flight_number === filters.flight) && (!filters.route || routeCode(routeMap.get(f.route_id)) === filters.route);
  };
  const dimensions = (row) => matchesFlight(row.flight_id) && (!filters.channel || row.channel === filters.channel) && (!filters.agentId || row.agent_id === filters.agentId);
  const bookings = data.bookings.filter((b) => dimensions(b) && inRange(b.paid_at || b.created_at, filters));
  const checkins = data.checkins.filter((c) => dimensions(c) && inRange(c.started_at, filters));
  const paid = bookings.filter((b) => b.status === 'paid');
  const completed = checkins.filter((c) => c.status === 'completed');
  const allCompleted = new Map(data.checkins.filter((c) => c.status === 'completed').map((c) => [c.booking_id, c]));
  const baseDate = filters.dateFrom || dateKey(at);
  const [year, month] = baseDate.split('-').map(Number);
  const prevFrom = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);
  const prevTo = new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10);
  const previous = data.bookings.filter((b) => b.status === 'paid' && dimensions(b) && inRange(b.paid_at, { dateFrom: prevFrom, dateTo: prevTo }));
  const pendingFor = (f, candidates) => candidates.filter((b) => b.flight_id === f.id && b.status === 'paid' && !allCompleted.has(b.id) && checkinWindow(f, routeMap.get(f.route_id), 'web', at)).length;
  const flightBookings = data.bookings.filter(dimensions);
  const flights = data.flights.filter((f) => matchesFlight(f.id) && inRange(f.departure_at, filters) && ((!filters.channel && !filters.agentId) || flightBookings.some((b) => b.flight_id === f.id)));
  const occupancy = flights.map((f) => {
    const count = flightBookings.filter((b) => b.flight_id === f.id && b.status === 'paid').length;
    return { ...f, route: routeCode(routeMap.get(f.route_id)), tickets: count, loadFactor: ratio(count, f.capacity), pendingCheckins: pendingFor(f, flightBookings) };
  });
  const noShows = flights.filter((f) => f.status === 'departed').reduce((n, f) => n + flightBookings.filter((b) => b.flight_id === f.id && b.status === 'paid' && !allCompleted.get(b.id)?.boarded).length, 0);
  const groupRevenue = (key, field) => {
    const groups = new Map();
    paid.forEach((b) => { const k = key(b); const row = groups.get(k) || { [field]: k, revenue: 0, tickets: 0 }; row.revenue += b.total_amount; row.tickets++; groups.set(k, row); });
    return [...groups.values()].sort((a, b) => b.revenue - a.revenue);
  };
  const rejections = new Map();
  checkins.filter((c) => c.status === 'rejected').forEach((c) => rejections.set(c.rejection_reason, (rejections.get(c.rejection_reason) || 0) + 1));
  const agentPerformance = data.users.filter((u) => !filters.agentId || u.id === filters.agentId).map((u) => ({ agentId: u.id, name: u.full_name, sales: sum(paid.filter((b) => b.agent_id === u.id && dateKey(b.paid_at).startsWith(baseDate.slice(0, 7))), 'total_amount'), quota: u.quota_amount })).sort((a, b) => b.sales - a.sales);
  const trendMap = new Map();
  if (filters.dateFrom && filters.dateTo) {
    let t = Date.parse(`${filters.dateFrom}T12:00:00Z`); const end = Date.parse(`${filters.dateTo}T12:00:00Z`);
    // Bounded plotting; arbitrary wide filters aggregate actual sale days below.
    if ((end - t) / 86400000 <= 370) for (; t <= end; t += 86400000) trendMap.set(dateKey(t), 0);
  }
  paid.forEach((b) => { const d = dateKey(b.paid_at); trendMap.set(d, (trendMap.get(d) || 0) + b.total_amount); });
  const kpis = { ventas: { totalRevenue: sum(paid, 'total_amount'), totalRevenuePrevMonth: sum(previous, 'total_amount'), ticketsSold: paid.length, avgTicket: Math.round(ratio(sum(paid, 'total_amount'), paid.length)), conversionRate: ratio(paid.length, bookings.filter((b) => b.status !== 'pending').length), pendingBookings: bookings.filter((b) => b.status === 'pending').length }, checkin: { completionRate: ratio(completed.length, checkins.length), digitalShare: ratio(completed.filter((c) => c.channel !== 'counter').length, completed.length), avgDurationSec: ratio(sum(checkins, 'duration_seconds'), checkins.length), excessFeesTotal: sum(checkins, 'excess_fee'), pendingCheckins: occupancy.reduce((s, f) => s + f.pendingCheckins, 0), noShows } };
  const breakdowns = { revenueByChannel: groupRevenue((b) => b.channel, 'channel'), revenueByRoute: groupRevenue((b) => routeCode(routeMap.get(flightMap.get(b.flight_id).route_id)), 'route'), occupancyByFlight: [...occupancy].sort((a, b) => b.pendingCheckins - a.pendingCheckins || a.loadFactor - b.loadFactor).map((f) => ({ flight: f.flight_number, route: f.route, departureAt: f.departure_at, loadFactor: f.loadFactor, pendingCheckins: f.pendingCheckins })), rejectionsByReason: [...rejections].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count), agentPerformance };
  return { bookings, checkins, flights: occupancy, kpis, breakdowns, previousPeriod: `${prevFrom} — ${prevTo}`, trend: [...trendMap].sort(([a], [b]) => a.localeCompare(b)).map(([date, revenue]) => ({ date, revenue })), stages: data.sale_stages.map((s) => ({ name: s.name, amount: sum(bookings.filter((b) => b.stage_id === s.id), 'total_amount') })), durations: ['web', 'app', 'kiosk', 'counter'].map((channel) => { const rows = checkins.filter((c) => c.channel === channel); return { channel, seconds: ratio(sum(rows, 'duration_seconds'), rows.length), count: rows.length }; }), bookingMap };
}
export function makeContext(view, filters, analysis, selected) {
  return { view, filters, kpis: analysis.kpis, breakdowns: Object.fromEntries(Object.entries(analysis.breakdowns).map(([k, v]) => [k, v.slice(0, 10)])), selected: selected || null, generatedAt: new Date().toISOString() };
}
