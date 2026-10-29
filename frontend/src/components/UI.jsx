import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { initials, label } from '../lib/format.js';
export function Avatar({ name, small = false }) { return <span className={`avatar ${small ? 'small' : ''}`} style={{ '--avatar-hue': (name.charCodeAt(0) * 13) % 360 }}>{initials(name)}</span>; }
export function Badge({ status }) { return <span className={`badge ${status}`}><i/>{label(status)}</span>; }
export function Metric({ title, value, note, icon: Icon, accent = false }) { return <article className={`metric ${accent ? 'accent' : ''}`}><div className="metric-label">{title}<span className="metric-icon"><Icon size={18}/></span></div><strong>{value}</strong><div className="metric-note">{note}</div></article>; }
export function Panel({ title, subtitle, children, action, className = '' }) { return <section className={`panel ${className}`}><header className="panel-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header>{children}</section>; }
export function Table({ columns, rows, empty = 'No hay registros con estos filtros.', pageSize = 8 }) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [rows]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages - 1);
  return <><div className="table-scroll"><table><thead><tr>{columns.map((c) => <th key={c.key} scope="col">{c.label}</th>)}</tr></thead><tbody>{rows.slice(current * pageSize, (current + 1) * pageSize).map((row) => <tr key={row.id || row.agentId}>{columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}</tr>)}</tbody></table>{!rows.length && <div className="empty-state"><Search size={28}/><strong>{empty}</strong><span>Prueba otro rango de fechas o limpia los filtros.</span></div>}</div>{rows.length > pageSize && <footer className="pagination"><span>{current * pageSize + 1}–{Math.min((current + 1) * pageSize, rows.length)} de {rows.length} registros</span><div><button className="icon-button" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Página anterior"><ChevronLeft size={17}/></button><span>{current + 1} / {pages}</span><button className="icon-button" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)} aria-label="Página siguiente"><ChevronRight size={17}/></button></div></footer>}</>;
}
export function OpenButton({ onClick, label: text = 'Ver detalle' }) { return <button className="icon-button" onClick={onClick} aria-label={text} title={text}><ArrowUpRight size={18}/></button>; }
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog className={`modal ${wide ? 'wide' : ''}`} ref={ref} onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="modal-content"><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Cerrar detalle"><X size={21}/></button></header>{children}</div></dialog>;
}
