import { Avatar, Badge, OpenButton, Panel, Table, Metric } from './UI.jsx';
import { money, percent, dateTime, label, routeCode } from '../lib/format.js';
import { CircleCheck, Timer, Luggage, UserX } from 'lucide-react';
export function bookingColumns(data, onSelect, compact = false) {
  return [
    { key: 'pnr', label: 'Reserva', render: (b) => <button className="record-link" onClick={() => onSelect('booking', b)}>{b.pnr}</button> },
    { key: 'passenger', label: 'Pasajero', render: (b) => { const p = data.passengers.find((p) => p.id === b.passenger_id); return <div className="person"><Avatar name={p.full_name} small/><span>{p.full_name}</span></div>; } },
    { key: 'flight', label: 'Vuelo', render: (b) => data.flights.find((f) => f.id === b.flight_id).flight_number },
    ...(!compact ? [{ key: 'channel', label: 'Canal', render: (b) => label(b.channel) }, { key: 'date', label: 'Fecha de venta / creación', render: (b) => dateTime(b.paid_at || b.created_at) }] : []),
    { key: 'total_amount', label: 'Total · COP', render: (b) => <strong className="amount">{money(b.total_amount)}</strong> },
    { key: 'status', label: 'Estado', render: (b) => <Badge status={b.status}/> },
    ...(!compact ? [{ key: 'open', label: '', render: (b) => <OpenButton label={`Ver reserva ${b.pnr}`} onClick={() => onSelect('booking', b)}/> }] : []),
  ];
}
export function Records({ view, data, analysis, search, onSelect }) {
  const q = search.toLocaleLowerCase('es');
  const match = (...values) => values.some((s) => String(s).toLocaleLowerCase('es').includes(q));
  if (view === 'ventas') {
    const rows = [...analysis.bookings].filter((b) => match(b.pnr, data.passengers.find((p) => p.id === b.passenger_id).full_name)).sort((a, b) => (b.paid_at || b.created_at).localeCompare(a.paid_at || a.created_at));
    return <Panel title="Todas las reservas" subtitle={`${rows.length} reservas · Busca por PNR o pasajero`}><Table rows={rows} columns={bookingColumns(data, onSelect)}/></Panel>;
  }
  if (view === 'pasajeros') {
    const ids = new Set([...analysis.bookings.map((b) => b.passenger_id), ...analysis.checkins.map((c) => c.passenger_id)]);
    const rows = data.passengers.filter((p) => ids.has(p.id) && match(p.full_name, p.document_number, p.email));
    return <Panel title="Conoce a tus pasajeros" subtitle={`${rows.length} pasajeros con actividad en los filtros actuales`}><Table rows={rows} columns={[
      { key: 'full_name', label: 'Pasajero', render: (p) => <div className="person"><Avatar name={p.full_name}/><span><strong>{p.full_name}</strong><small>{p.email}</small></span></div> },
      { key: 'document_number', label: 'Documento' }, { key: 'loyalty_tier', label: 'Fidelización', render: (p) => <span className={`loyalty ${p.loyalty_tier}`}>{label(p.loyalty_tier)}</span> },
      { key: 'bookings', label: 'Reservas del período', render: (p) => analysis.bookings.filter((b) => b.passenger_id === p.id).length },
      { key: 'open', label: '', render: (p) => <OpenButton label={`Ver pasajero ${p.full_name}`} onClick={() => onSelect('passenger', p)}/> },
    ]}/></Panel>;
  }
  if (view === 'vuelos') {
    const rows = [...analysis.flights].filter((f) => match(f.flight_number, f.route)).sort((a, b) => b.departure_at.localeCompare(a.departure_at));
    return <Panel title="Tu red de destinos" subtitle="Ocupación del segmento filtrado · Fechas por salida del vuelo"><Table rows={rows} columns={[
      { key: 'flight_number', label: 'Vuelo', render: (f) => <strong>{f.flight_number}</strong> },
      { key: 'route', label: 'Ruta', render: (f) => <span className="route-text">{f.route.replace('-', ' → ')}</span> },
      { key: 'departure_at', label: 'Salida · Bogotá', render: (f) => dateTime(f.departure_at) },
      { key: 'loadFactor', label: 'Ocupación', render: (f) => <div className="occupancy-cell"><span>{percent(f.loadFactor)} <small>({f.tickets}/{f.capacity})</small></span><span className="progress"><i style={{ width: `${Math.min(100, f.loadFactor * 100)}%` }}/></span></div> },
      { key: 'pendingCheckins', label: 'Pendientes' }, { key: 'status', label: 'Estado', render: (f) => <Badge status={f.status}/> },
      { key: 'open', label: '', render: (f) => <OpenButton label={`Ver vuelo ${f.flight_number}`} onClick={() => onSelect('flight', data.flights.find((v) => v.id === f.id))}/> },
    ]}/></Panel>;
  }
  if (view === 'checkin') {
    const c = analysis.kpis.checkin;
    const rows = [...analysis.checkins].filter((c) => match(analysis.bookingMap.get(c.booking_id).pnr, label(c.rejection_reason), data.passengers.find((p) => p.id === c.passenger_id).full_name)).sort((a, b) => b.started_at.localeCompare(a.started_at));
    return <><div className="metrics-grid"><Metric title="Check-in completado" value={percent(c.completionRate)} note={`${percent(c.digitalShare)} en canales digitales`} icon={CircleCheck} accent/><Metric title="Tiempo promedio" value={`${(c.avgDurationSec / 60).toFixed(1)} min`} note="Todos los intentos del período" icon={Timer}/><Metric title="Exceso de equipaje" value={money(c.excessFeesTotal)} note="Cargos simulados · COP" icon={Luggage}/><Metric title="No se presentaron" value={c.noShows} note="Vuelos despegados del período" icon={UserX}/></div><div className="operations-grid"><Panel title="Tiempo por canal" subtitle="Promedio de atención por intento"><div className="duration-list">{analysis.durations.map((d) => <div key={d.channel}><span>{label(d.channel)}</span><strong>{d.count ? `${(d.seconds / 60).toFixed(1)} min` : 'Sin datos'}</strong><small>{d.count} intentos</small></div>)}</div></Panel><Panel title="Motivos de rechazo" subtitle="Dónde podemos mejorar la experiencia"><div className="rejection-list">{analysis.breakdowns.rejectionsByReason.map((r) => <div key={r.reason}><span>{label(r.reason)}</span><strong>{r.count}</strong></div>)}{!analysis.breakdowns.rejectionsByReason.length && <p className="inline-empty">No hay rechazos con estos filtros.</p>}</div></Panel></div><Panel title="Registro de check-in" subtitle={`${rows.length} intentos · Busca por PNR, pasajero o motivo`}><Table rows={rows} columns={[
      { key: 'pnr', label: 'Reserva', render: (c) => <strong>{analysis.bookingMap.get(c.booking_id).pnr}</strong> },
      { key: 'passenger', label: 'Pasajero', render: (c) => data.passengers.find((p) => p.id === c.passenger_id).full_name },
      { key: 'channel', label: 'Canal', render: (c) => label(c.channel) }, { key: 'started_at', label: 'Fecha · Bogotá', render: (c) => dateTime(c.started_at) },
      { key: 'status', label: 'Estado', render: (c) => <Badge status={c.status}/> },
      { key: 'reason', label: 'Asiento / motivo', render: (c) => c.seat || label(c.rejection_reason) },
      { key: 'open', label: '', render: (c) => <OpenButton label={`Ver check-in ${analysis.bookingMap.get(c.booking_id).pnr}`} onClick={() => onSelect('checkin', c)}/> },
    ]}/></Panel></>;
  }
  const rows = data.users.filter((u) => (!analysis.breakdowns.agentPerformance.length || analysis.breakdowns.agentPerformance.some((a) => a.agentId === u.id)) && match(u.full_name, u.station));
  return <Panel title="El equipo detrás de cada viaje" subtitle="Meta mensual · Ventas del mes de inicio del filtro, dentro del rango seleccionado"><div className="team-grid">{rows.map((u) => {
    const a = analysis.breakdowns.agentPerformance.find((a) => a.agentId === u.id) || { sales: 0, quota: u.quota_amount };
    const completion = a.quota ? a.sales / a.quota : 0;
    return <article className="agent-card" key={u.id}><div className="agent-top"><Avatar name={u.full_name}/><OpenButton label={`Ver agente ${u.full_name}`} onClick={() => onSelect('user', u)}/></div><h3>{u.full_name}</h3><p>{label(u.role)} · {u.station}</p>{a.quota ? <><div className="agent-sales"><strong>{money(a.sales)}</strong><span>{percent(completion)}</span></div><span className="progress"><i style={{ width: `${Math.min(100, completion * 100)}%` }}/></span><small>Meta: {money(a.quota)} COP</small></> : <><strong className="agent-operations">{analysis.checkins.filter((c) => c.agent_id === u.id).length} check-ins atendidos</strong><small>Sin meta comercial asignada</small></>}</article>;
  })}{!rows.length && <p className="inline-empty">No hay agentes con esta búsqueda.</p>}</div></Panel>;
}
export function Detail({ selected, data, onSelect, onStatus, onCheckin, error }) {
  const { type, data: record } = selected;
  const field = (title, value) => <div key={title}><dt>{title}</dt><dd>{value}</dd></div>;
  if (type === 'booking') {
    const b = data.bookings.find((x) => x.id === record.id), p = data.passengers.find((x) => x.id === b.passenger_id), f = data.flights.find((x) => x.id === b.flight_id);
    return <><div className="detail-hero"><span className="eyebrow">RESERVA</span><h3>{b.pnr}</h3><Badge status={b.status}/></div><dl className="detail-grid">{field('Pasajero', <button className="record-link" onClick={() => onSelect('passenger', p)}>{p.full_name}</button>)}{field('Vuelo', <button className="record-link" onClick={() => onSelect('flight', f)}>{f.flight_number}</button>)}{field('Tarifa', label(b.fare_class))}{field('Canal', label(b.channel))}{field('Valor base', money(b.base_fare))}{field('Impuestos', money(b.taxes))}{field('Total COP', money(b.total_amount))}{field('Creada', dateTime(b.created_at))}{field('Vencimiento', dateTime(b.expires_at))}{field('Pagada', dateTime(b.paid_at))}</dl>{error && <p className="form-error" role="alert">{error}</p>}<div className="detail-actions">{b.status === 'pending' && <button className="primary-button" onClick={() => onStatus(b.id, 'paid')}>Simular pago</button>}{['pending', 'paid'].includes(b.status) && <button className="secondary-button danger" onClick={() => onStatus(b.id, 'cancelled')}>Cancelar reserva</button>}{b.status === 'paid' && <button className="secondary-button" onClick={() => onCheckin(b.pnr)}>Hacer check-in</button>}</div><p className="help-text">Los cambios son locales. No se procesan pagos reales.</p></>;
  }
  if (type === 'passenger') {
    const bookings = data.bookings.filter((b) => b.passenger_id === record.id);
    const checks = data.checkins.filter((c) => c.passenger_id === record.id);
    return <><div className="profile-heading"><Avatar name={record.full_name}/><div><h3>{record.full_name}</h3><span className={`loyalty ${record.loyalty_tier}`}>{label(record.loyalty_tier)}</span></div></div><dl className="detail-grid">{field('Documento', `${record.document_type} ${record.document_number}`)}{field('Correo', record.email)}{field('Teléfono', record.phone)}{field('Nacionalidad', record.nationality)}</dl><h4>Historial completo de reservas</h4><div className="history-list">{bookings.map((b) => <button key={b.id} onClick={() => onSelect('booking', b)}><strong>{b.pnr}</strong><span>{money(b.total_amount)}</span><Badge status={b.status}/></button>)}</div><h4>Historial completo de check-in</h4><div className="history-list">{checks.map((c) => <button key={c.id} onClick={() => onSelect('checkin', c)}><span>{dateTime(c.started_at)}</span><Badge status={c.status}/></button>)}{!checks.length && <p>Sin intentos registrados.</p>}</div></>;
  }
  if (type === 'flight') {
    const route = data.routes.find((r) => r.id === record.route_id);
    const bookings = data.bookings.filter((b) => b.flight_id === record.id && b.status === 'paid');
    return <><div className="detail-hero"><span className="eyebrow">{record.flight_number}</span><h3>{routeCode(route).replace('-', ' → ')}</h3><Badge status={record.status}/></div><dl className="detail-grid">{field('Origen', route.origin_city)}{field('Destino', route.destination_city)}{field('Salida', dateTime(record.departure_at))}{field('Llegada', dateTime(record.arrival_at))}{field('Avión', record.aircraft)}{field('Ocupación total', `${bookings.length} / ${record.capacity} (${percent(bookings.length / record.capacity)})`)}</dl><h4>Pasajeros con tiquete pagado · Todos los canales</h4><div className="history-list">{bookings.map((b) => <button key={b.id} onClick={() => onSelect('booking', b)}><strong>{b.pnr}</strong><span>{data.passengers.find((p) => p.id === b.passenger_id).full_name}</span></button>)}</div></>;
  }
  if (type === 'checkin') {
    const b = data.bookings.find((b) => b.id === record.booking_id);
    return <><div className="detail-hero"><span className="eyebrow">CHECK-IN · {b.pnr}</span><h3>{record.seat || 'Intento rechazado'}</h3><Badge status={record.status}/></div><dl className="detail-grid">{field('Reserva', <button className="record-link" onClick={() => onSelect('booking', b)}>{b.pnr}</button>)}{field('Canal', label(record.channel))}{field('Inicio', dateTime(record.started_at))}{field('Finalización', dateTime(record.completed_at))}{field('Duración', `${record.duration_seconds} segundos`)}{field('Motivo', label(record.rejection_reason))}{field('Equipaje', `${record.bags_count} maletas · ${record.bags_weight_kg} kg`)}{field('Exceso cobrado', money(record.excess_fee))}{field('Seguridad', record.security_passed === null ? 'Pendiente' : record.security_passed ? 'Aprobada' : 'No aprobada')}{field('Abordó', record.boarded ? 'Sí' : 'No')}</dl></>;
  }
  return <><div className="profile-heading"><Avatar name={record.full_name}/><div><h3>{record.full_name}</h3><p>{label(record.role)}</p></div></div><dl className="detail-grid">{field('Correo', record.email)}{field('Estación', record.station)}{field('Meta mensual', money(record.quota_amount))}{field('Estado', label(record.status))}</dl></>;
}
