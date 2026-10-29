import { money, percent } from '../lib/format.js';
export const webhookUrl = import.meta.env?.VITE_N8N_WEBHOOK_URL || '';
export function getSessionId(storage = sessionStorage) {
  let id = storage.getItem('aeronova-session');
  if (!id || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(id)) {
    id = crypto.randomUUID(); storage.setItem('aeronova-session', id);
  }
  return id;
}
export function buildRequest(message, context, sessionId) {
  if (!message.trim() || message.length > 1000) throw new Error('Escribe entre 1 y 1000 caracteres.');
  const request = { message, sessionId, context };
  if (new TextEncoder().encode(JSON.stringify(request)).length >= 15000) throw new Error('El contexto supera el límite de 15 KB. Cierra el detalle del registro y vuelve a intentar.');
  return request;
}
function demoReply(context) {
  const v = context.kpis.ventas, c = context.kpis.checkin;
  const selected = context.selected ? ` Tienes abierto un registro de ${context.selected.type}.` : '';
  return `**Resumen local de la vista ${context.view}**${selected}\n\n- Ingresos: ${money(v.totalRevenue)} COP.\n- Tiquetes vendidos: ${v.ticketsSold}.\n- Conversión: ${percent(v.conversionRate)}.\n- Pendientes de check-in: ${c.pendingCheckins}.\n\nEste es un resumen automático de demostración, sin IA. Para conversar con Nova, falta conectar el webhook de n8n.`;
}
export async function sendMessage(message, context, options = {}) {
  const request = buildRequest(message, context, options.sessionId || getSessionId());
  const url = options.url ?? webhookUrl;
  if (!url) return { response: demoReply(context), actions: [] };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout ?? 30000);
  try {
    const res = await (options.fetcher || fetch)(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    if (typeof payload.response !== 'string' || !payload.response.trim() || !Array.isArray(payload.actions) || payload.error) throw new Error('Respuesta inválida o error del agente');
    // Contrato v1: actions siempre vacío. No ejecutar instrucciones de una versión distinta.
    return { response: payload.response, actions: payload.actions };
  } catch (error) {
    throw new Error(error.name === 'AbortError' ? 'El asistente tardó más de 30 segundos. Puedes reintentar.' : 'No pudimos conectar con el asistente. Revisa la conexión e inténtalo de nuevo.');
  } finally { clearTimeout(timer); }
}
