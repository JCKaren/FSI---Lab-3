import { useState } from 'react';
import { registerCheckin } from '../lib/operations.js';
import { label, money } from '../lib/format.js';
export default function CheckinForm({ data, initialPnr, onComplete }) {
  const [form, setForm] = useState({ pnr: initialPnr || '', channel: 'counter', agent_id: data.users.find((u) => u.role === 'checkin_agent').id, seat: '', documents_valid: false, fee_confirmed: false });
  const [weights, setWeights] = useState([]);
  const [error, setError] = useState('');
  const update = (key, value) => { setForm({ ...form, [key]: value, ...(key === 'pnr' ? { fee_confirmed: false, documents_valid: false } : {}) }); setError(''); };
  const booking = data.bookings.find((b) => b.pnr === form.pnr.trim().toUpperCase());
  const allowance = booking ? { basica: 0, clasica: 1, flex: 2, business: 2 }[booking.fare_class] : 0;
  const fee = Math.max(0, weights.length - allowance) * 150000 + weights.filter((v) => Number(v) > (booking?.fare_class === 'business' ? 32 : 23)).length * 90000;
  return <form className="checkin-form" onSubmit={(e) => { e.preventDefault(); try { const result = registerCheckin(data, { ...form, bags_count: weights.length, bags_weight_kg: weights.reduce((n, v) => n + Number(v), 0), bag_weights: weights }); onComplete(result); } catch (err) { setError(err.message); } }}>
    <p className="help-text">Simulación al 28 de octubre de 2026, 12:00 h (Bogotá). Si el pago, los documentos o la ventana no cumplen, se registra el intento rechazado.</p>
    <div className="form-grid"><label>Código de reserva (PNR)<input autoFocus required maxLength={6} value={form.pnr} placeholder="Ej. NV00XC" onChange={(e) => update('pnr', e.target.value.toUpperCase())}/></label><label>Canal<select value={form.channel} onChange={(e) => update('channel', e.target.value)}>{['web', 'app', 'kiosk', 'counter'].map((c) => <option key={c} value={c}>{label(c)}</option>)}</select></label>
    {form.channel === 'counter' && <label>Agente de aeropuerto<select value={form.agent_id} onChange={(e) => update('agent_id', e.target.value)}>{data.users.filter((u) => u.role === 'checkin_agent').map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}</select></label>}<label>Asiento<input value={form.seat} placeholder="Ej. 12C" maxLength={3} onChange={(e) => update('seat', e.target.value.toUpperCase())}/></label></div>
    {booking && <div className="booking-preview"><strong>{data.passengers.find((p) => p.id === booking.passenger_id).full_name}</strong><span>{data.flights.find((f) => f.id === booking.flight_id).flight_number} · Tarifa {label(booking.fare_class)} · {label(booking.status)}</span><small>Incluye {allowance} maletas de {booking.fare_class === 'business' ? 32 : 23} kg.</small></div>}
    <label className="checkbox-label"><input type="checkbox" checked={form.documents_valid} onChange={(e) => update('documents_valid', e.target.checked)}/><span>Verifiqué los documentos de viaje: identidad o pasaporte vigente y visa cuando corresponda.</span></label>
    <label>Maletas facturadas<select value={weights.length} onChange={(e) => { setWeights(Array.from({ length: Number(e.target.value) }, (_, i) => weights[i] || '20')); update('fee_confirmed', false); }}>{[0, 1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} maletas</option>)}</select></label>
    {!!weights.length && <div className="bag-weights">{weights.map((w, i) => <label key={i}>Maleta {i + 1} · kg<input type="number" min="0.1" max="32" step="0.1" required value={w} onChange={(e) => { setWeights(weights.map((v, j) => i === j ? e.target.value : v)); update('fee_confirmed', false); }}/></label>)}</div>}
    {fee > 0 && <label className="checkbox-label fee-confirm"><input type="checkbox" checked={form.fee_confirmed} onChange={(e) => update('fee_confirmed', e.target.checked)}/><span>Confirmo el cobro simulado de <strong>{money(fee)} COP</strong> por equipaje.</span></label>}
    {error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit">Validar y registrar check-in</button>
  </form>;
}
