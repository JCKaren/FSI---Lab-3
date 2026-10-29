// Escapar comillas y neutralizar fórmulas al abrir los CSV en Excel.
export function toCsv(rows) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const quote = (value) => { const text = String(value ?? ''); return `"${(/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`; };
  return '\uFEFF' + [keys, ...rows.map((r) => keys.map((k) => r[k]))].map((row) => row.map(quote).join(';')).join('\r\n');
}
export function downloadCsv(rows, name) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
