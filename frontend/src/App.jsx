import { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { Plane, LayoutDashboard, Ticket, Users, PlaneTakeoff, ClipboardCheck, ContactRound, ChevronRight, Download, Plus, Search, RotateCcw, Menu, X, ArrowUpRight, CircleHelp } from 'lucide-react';
import { freshData } from './data/mockData.js';
import { analyze, defaultFilters, makeContext } from './lib/analytics.js';
import { updateBookingStatus } from './lib/operations.js';
import { downloadCsv } from './lib/export.js';
import { label } from './lib/format.js';
import { Avatar, Modal, Table } from './components/UI.jsx';
import Filters from './components/Filters.jsx';
const Dashboard = lazy(() => import('./components/Dashboard.jsx'));
import { Records, Detail, bookingColumns } from './components/Records.jsx';
import CheckinForm from './components/CheckinForm.jsx';
const ChatWidget = lazy(() => import('./components/ChatWidget.jsx'));
const STORAGE = 'aeronova-data-v1';
const modules = [
  ['dashboard', 'Vista general', LayoutDashboard, 'Una mirada a toda tu operación.', 'Tus ventas y pasajeros, en el mismo rumbo.'],
  ['ventas', 'Ventas y reservas', Ticket, 'Cada reserva, una nueva historia.', 'Consulta tus ventas y acompaña el siguiente viaje.'],
  ['pasajeros', 'Pasajeros', Users, 'Personas, no solo pasajeros.', 'Conoce su historia y haz que quieran volver.'],
  ['vuelos', 'Vuelos', PlaneTakeoff, 'Conecta destinos. Acerca personas.', 'Tu red de vuelos y su ocupación, en un solo lugar.'],
  ['checkin', 'Check-in', ClipboardCheck, 'Un buen viaje empieza aquí.', 'Supervisa la atención antes de cada despegue.'],
  ['equipo', 'Equipo', ContactRound, 'El talento que nos mueve.', 'Acompaña a tus agentes y sus objetivos.'],
];
function loadData() {
  try { const saved = JSON.parse(localStorage.getItem(STORAGE)); if (saved && ['users', 'routes', 'flights', 'passengers', 'sale_stages', 'bookings', 'checkins'].every((key) => Array.isArray(saved[key]))) return saved; } catch { /* Datos ausentes o almacenamiento no disponible. */ }
  return freshData();
}
export default function App() {
  const [data, setData] = useState(loadData);
  const [view, setView] = useState('dashboard');
  const [filters, setFilters] = useState(defaultFilters);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(true);
  const [chatSignal, setChatSignal] = useState(0);
  const [checkinPnr, setCheckinPnr] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [toast, setToast] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [reset, setReset] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => { try { localStorage.setItem(STORAGE, JSON.stringify(data)); setStorageError(false); } catch { setStorageError(true); } }, [data]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer); } }, [toast]);
  const analysis = useMemo(() => analyze(data, filters), [data, filters]);
  const current = modules.find((m) => m[0] === view);
  const currentSelection = selected ? { ...selected, data: data[{ booking: 'bookings', passenger: 'passengers', flight: 'flights', checkin: 'checkins', user: 'users' }[selected.type]].find((r) => r.id === selected.data.id) } : null;
  const context = makeContext(view, filters, analysis, currentSelection);
  const select = (type, record) => { setDetailOpen(true); setDetailError(''); setSelected({ type, data: record }); };
  const navigate = (next, flight) => { setView(next); setSearch(''); setSelected(null); setMenuOpen(false); if (flight) setFilters({ ...filters, flight }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const updateFilters = (next) => { setFilters(next); setSelected(null); };
  const changeStatus = (id, status) => {
    try { setData(updateBookingStatus(data, id, status)); setDetailError(''); setToast(`Reserva ${status === 'paid' ? 'pagada' : 'cancelada'}. Indicadores actualizados.`); }
    catch (e) { setDetailError(e.message); }
  };
  const beginCheckin = (pnr = '') => { setSelected(null); setCheckinPnr(pnr); };
  const exportReport = () => {
    const rows = view === 'dashboard' ? Object.entries(analysis.kpis).flatMap(([group, values]) => Object.entries(values).map(([indicator, value]) => ({ grupo: group, indicador: indicator, valor: value }))) : view === 'ventas' ? analysis.bookings : view === 'checkin' ? analysis.checkins : view === 'vuelos' ? analysis.flights : view === 'equipo' ? analysis.breakdowns.agentPerformance : data.passengers.filter((p) => analysis.bookings.some((b) => b.passenger_id === p.id) || analysis.checkins.some((c) => c.passenger_id === p.id));
    if (!rows.length) return setToast('No hay datos para exportar con estos filtros.');
    downloadCsv(rows, `aeronova-${view}.csv`); setToast('Reporte CSV exportado con los filtros globales actuales.');
  };
  const recentBookings = useMemo(() => [...analysis.bookings].sort((a, b) => (b.paid_at || b.created_at).localeCompare(a.paid_at || a.created_at)).slice(0, 5), [analysis]);
  return <div className="app-shell">
    <a className="skip-link" href="#main">Ir al contenido</a>
    {menuOpen && <button className="sidebar-scrim" aria-label="Cerrar navegación" onClick={() => setMenuOpen(false)}/>}
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`} aria-label="Navegación principal"><a className="brand" href="#dashboard" onClick={(e) => { e.preventDefault(); navigate('dashboard'); }}><span className="brand-mark"><Plane size={24}/></span><span>AeroNova<span className="brand-dot">.</span><small>UN NUEVO HORIZONTE</small></span></a><button className="mobile-close icon-button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><X/></button>
      <div className="workspace-label"><span className="workspace-symbol">AN</span><span>AeroNova CRM<small>Espacio de trabajo</small></span><ChevronRight size={15}/></div>
      <span className="nav-caption">PRINCIPAL</span><nav>{modules.map(([key, text, Icon]) => <button key={key} className={`nav-item ${view === key ? 'active' : ''}`} aria-current={view === key ? 'page' : undefined} onClick={() => navigate(key)}><Icon size={19}/>{text}{key === 'checkin' && analysis.kpis.checkin.pendingCheckins > 0 && <span className="nav-count">{analysis.kpis.checkin.pendingCheckins}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="demo-card"><span className="demo-orbit"><Plane size={23}/></span><strong>Listos para despegar.</strong><p>Explora la operación con datos de demostración.</p><button onClick={() => setHelp(true)}>Conoce este espacio <ArrowUpRight size={14}/></button></div><button className="nav-item" onClick={() => setHelp(true)}><CircleHelp size={18}/>Guía del espacio</button><button className="nav-item" onClick={() => setReset(true)}><RotateCcw size={17}/>Restablecer demo</button><div className="profile"><Avatar name="Equipo AeroNova" small/><div><strong>Equipo AeroNova</strong><small>Gestión comercial</small></div><span className="status-dot"/></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumbs"><button className="icon-button mobile-menu" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}><Menu size={21}/></button><span>Espacio de trabajo</span><ChevronRight size={14}/><strong>{current[1]}</strong></div><div className="topbar-right"><span className="demo-badge"><i/>Datos simulados</span><Avatar name="Equipo AeroNova" small/></div></header>
      <main id="main"><div className="page-heading"><div><span className="eyebrow">CENTRO DE OPERACIONES</span><h1>{current[3]}</h1><p>{current[4]}</p></div><div className="heading-actions"><button className="secondary-button" onClick={exportReport}><Download size={16}/>Exportar</button>{view === 'checkin' && <button className="primary-button" onClick={() => beginCheckin()}><Plus size={17}/>Registrar check-in</button>}</div></div>
        <Filters filters={filters} onChange={updateFilters} data={data}/>
        <div className="section-intro"><div><span className="live-dot"/><span>Escenario: 28 oct 2026 · 12:00 Bogotá</span></div><button className="text-button" onClick={() => updateFilters(defaultFilters)}>Ver octubre</button></div>
        {storageError && <p className="form-error" role="alert">El navegador no permite guardar los cambios. Se conservarán solo mientras esta página esté abierta.</p>}
        {currentSelection && !detailOpen && <div className="selected-context">Nova tiene el contexto del registro seleccionado.<button className="text-button" onClick={() => setDetailOpen(true)}>Ver detalle</button><button className="icon-button" aria-label="Quitar contexto del registro" onClick={() => setSelected(null)}><X size={15}/></button></div>}
        {view === 'dashboard' ? <Suspense fallback={<p className="inline-empty" role="status">Preparando tu dashboard…</p>}><Dashboard analysis={analysis} onView={navigate} bookingTable={<Table rows={recentBookings} columns={bookingColumns(data, select, true)}/>}/></Suspense> : <><div className="module-toolbar"><h2>{current[1]}</h2><label className="search-input"><Search size={17}/><input aria-label={`Buscar en ${current[1]}`} placeholder={view === 'ventas' || view === 'checkin' ? 'Buscar PNR, pasajero…' : 'Buscar en esta vista…'} value={search} onChange={(e) => setSearch(e.target.value)}/>{search && <button className="icon-button" aria-label="Limpiar búsqueda" onClick={() => setSearch('')}><X size={14}/></button>}</label></div><Records view={view} data={data} analysis={analysis} search={search} onSelect={select}/></>}
        <footer className="page-footer"><span>AeroNova CRM <span>·</span> Cada dato, un mejor viaje.</span><span>Laboratorio 3 · FSI · 2026</span></footer>
      </main>
    </div>
    <Suspense fallback={null}><ChatWidget context={context} openSignal={chatSignal}/></Suspense>
    {currentSelection && detailOpen && <Modal title={{ booking: 'Detalle de reserva', passenger: 'Ficha del pasajero', flight: 'Detalle del vuelo', checkin: 'Detalle de check-in', user: 'Perfil del agente' }[currentSelection.type]} onClose={() => setSelected(null)}><Detail selected={currentSelection} data={data} onSelect={select} onStatus={changeStatus} onCheckin={beginCheckin} error={detailError}/><button className="text-button" onClick={() => { setDetailOpen(false); setChatSignal((n) => n + 1); }}>Consultar este registro con Nova →</button></Modal>}
    {checkinPnr !== null && <Modal title="Registrar check-in" onClose={() => setCheckinPnr(null)}><CheckinForm data={data} initialPnr={checkinPnr} onComplete={({ data: next, record }) => { setData(next); setCheckinPnr(null); setView('checkin'); setSearch(''); select('checkin', record); setToast(record.status === 'completed' ? 'Check-in completado. Asiento asignado.' : `Intento rechazado: ${label(record.rejection_reason)}.`); }}/></Modal>}
    {help && <Modal title="Bienvenido a AeroNova" onClose={() => setHelp(false)}><div className="help-content"><p>Este CRM reúne ventas y check-in de una aerolínea virtual. Todos los datos son ficticios y los cambios se guardan en tu navegador.</p><h3>Explora tu operación</h3><p>Filtra por fecha, ruta, canal, vuelo y agente. Abre los registros para revisar sus detalles. En reservas puedes simular pagos o cancelaciones; en check-in puedes registrar un intento.</p><h3>Cómo se interpretan los filtros</h3><p>Ventas usa fecha de pago (o creación si no está pagada); check-in usa la fecha del intento; vuelos usa su salida. Canal y agente corresponden a cada proceso. Por eso un agente de aeropuerto no tiene ventas.</p><h3>Fechas y comparaciones</h3><p>El reloj de la demostración es el 28 de octubre de 2026 a las 12:00 en Bogotá. La comparación de ingresos usa el mes calendario anterior al inicio del filtro. Las metas son mensuales; el cumplimiento considera el mes de inicio dentro del rango seleccionado.</p><h3>Tu copiloto Nova</h3><p>Sin webhook, Nova muestra un resumen local sin IA. Al configurar n8n enviará los indicadores, filtros y el registro que elijas consultar. Las búsquedas de texto solo afectan la lista, no los indicadores ni las exportaciones.</p></div></Modal>}
    {reset && <Modal title="Restablecer datos de demostración" onClose={() => setReset(false)}><p>Se eliminarán los pagos, cancelaciones y check-ins que hayas simulado en este navegador. Volverás al escenario inicial.</p><div className="detail-actions"><button className="secondary-button" onClick={() => setReset(false)}>Conservar cambios</button><button className="primary-button" onClick={() => { setData(freshData()); setFilters(defaultFilters); setSelected(null); setReset(false); setToast('Datos de demostración restablecidos.'); }}>Restablecer demo</button></div></Modal>}
    {toast && <div className="toast" role="status">{toast}<button className="icon-button" onClick={() => setToast('')} aria-label="Cerrar notificación"><X size={15}/></button></div>}
  </div>;
}
