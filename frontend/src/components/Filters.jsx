import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { label, routeCode } from '../lib/format.js';
export default function Filters({ filters, onChange, data }) {
  const set = (key, value) => onChange({ ...filters, [key]: value || null, ...(key === 'route' ? { flight: null } : {}) });
  const flights = data.flights.filter((f) => !filters.route || routeCode(data.routes.find((r) => r.id === f.route_id)) === filters.route);
  return <section className="filters" aria-label="Filtros globales"><div className="filters-heading"><SlidersHorizontal size={16}/><strong>Tu operación, a tu medida</strong><button className="text-button" onClick={() => onChange({ dateFrom: null, dateTo: null, route: null, flight: null, channel: null, agentId: null })}><RotateCcw size={13}/> Limpiar filtros</button></div><div className="filter-grid">
    <label>Desde<input type="date" value={filters.dateFrom || ''} max={filters.dateTo || undefined} onChange={(e) => { const v = e.target.value; if (!filters.dateTo || !v || v <= filters.dateTo) set('dateFrom', v); }}/></label>
    <label>Hasta<input type="date" value={filters.dateTo || ''} min={filters.dateFrom || undefined} onChange={(e) => { const v = e.target.value; if (!filters.dateFrom || !v || v >= filters.dateFrom) set('dateTo', v); }}/></label>
    <label>Ruta<select value={filters.route || ''} onChange={(e) => set('route', e.target.value)}><option value="">Todas las rutas</option>{data.routes.map((r) => <option key={r.id} value={routeCode(r)}>{r.origin} → {r.destination}</option>)}</select></label>
    <label>Canal<select value={filters.channel || ''} onChange={(e) => set('channel', e.target.value)}><option value="">Todos los canales</option>{['web', 'app', 'counter', 'call_center', 'kiosk'].map((c) => <option key={c} value={c}>{label(c)}</option>)}</select></label>
    <label>Vuelo<select value={filters.flight || ''} onChange={(e) => set('flight', e.target.value)}><option value="">Todos los vuelos</option>{flights.map((f) => <option key={f.id}>{f.flight_number}</option>)}</select></label>
    <label>Agente<select value={filters.agentId || ''} onChange={(e) => set('agentId', e.target.value)}><option value="">Todo el equipo</option>{data.users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}</select></label>
  </div></section>;
}
