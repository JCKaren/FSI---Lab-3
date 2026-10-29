import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send, RotateCcw, ArrowUpRight } from 'lucide-react';
import Markdown from 'react-markdown';
import { sendMessage, webhookUrl } from '../services/chatService.js';
export default function ChatWidget({ context, openSignal = 0 }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(null);
  const bottom = useRef(null);
  const input = useRef(null);
  const launcher = useRef(null);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { if (openSignal) setOpen(true); }, [openSignal]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, busy]);
  const close = () => { setOpen(false); launcher.current?.focus(); };
  async function submit(text = draft, retry = false) {
    if (busy || !text.trim()) return;
    const snapshot = retry ? failed.context : context;
    if (!retry) setMessages((prev) => [...prev, { role: 'user', text }]);
    setDraft(''); setFailed(null); setBusy(true);
    try { const result = await sendMessage(text, snapshot); setMessages((prev) => [...prev, { role: 'assistant', text: result.response }]); }
    catch (error) { setFailed({ text, context: snapshot, error: error.message }); }
    finally { setBusy(false); input.current?.focus(); }
  }
  return <>
    <button ref={launcher} className="chat-launcher" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Abrir asistente Nova"><Sparkles size={19}/><span>Habla con Nova</span></button>
    {open && <section className="chat-panel" aria-label="Asistente Nova" onKeyDown={(e) => { if (e.key === 'Escape') close(); }}>
      <header className="chat-header"><div className="nova-icon"><Sparkles size={22}/></div><div><strong>Nova, tu copiloto</strong><small><i className="status-dot"/>{webhookUrl ? 'Conexión n8n configurada' : 'Demostración local · Sin IA'}</small></div><button className="icon-button" onClick={close} aria-label="Cerrar asistente"><X size={19}/></button></header>
      <div className="chat-context">Viendo: <strong>{context.view}</strong> · {context.selected ? 'Registro seleccionado' : 'Filtros actuales'}</div>
      <div className="chat-messages" role="log" aria-live="polite">
        {!messages.length && <div className="chat-welcome"><Sparkles size={32}/><h3>Una mirada más clara<br/>a tu operación.</h3><p>{webhookUrl ? 'Pregúntame por tus ventas, vuelos o check-ins. Usaré los datos de esta vista.' : 'Explora un resumen calculado de tus datos. La conversación con IA estará disponible al conectar n8n.'}</p>{['¿Cómo van las ventas?', '¿Qué vuelos necesitan atención?', '¿Por qué se rechazan check-ins?'].map((q) => <button key={q} onClick={() => submit(q)}>{q}<ArrowUpRight size={15}/></button>)}</div>}
        {messages.map((m, i) => <div key={i} className={`message ${m.role}`}><Markdown skipHtml components={{ a: ({ children }) => <span>{children}</span>, img: () => null }}>{m.text}</Markdown></div>)}
        {busy && <div className="message assistant">Nova está preparando la respuesta…</div>}
        {failed && <div className="chat-error" role="alert"><p>{failed.error}</p><button className="text-button" onClick={() => submit(failed.text, true)}><RotateCcw size={14}/> Reintentar</button></div>}<div ref={bottom}/>
      </div>
      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); submit(); }}><label className="sr-only" htmlFor="chat-input">Mensaje para Nova</label><textarea id="chat-input" ref={input} rows="2" placeholder="Pregunta sobre tu operación…" value={draft} maxLength={1000} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}/><button className="send-button" disabled={busy || !draft.trim()} aria-label="Enviar mensaje"><Send size={17}/></button><small>{draft.length}/1000 · {webhookUrl ? 'Análisis sobre datos simulados' : 'Sin conexión al backend'}</small></form>
    </section>}
  </>;
}
