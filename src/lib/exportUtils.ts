import { getLocalTodayDate } from '@/lib/dateUtils';

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data || !data.length) {
    console.error('No data to export');
    return;
  }

  // Obter todos os cabeçalhos das chaves do primeiro objeto
  const headers = Object.keys(data[0]);

  // Converter os dados para formato CSV
  const csvContent = [
    headers.join(','), // Cabeçalho
    ...data.map((row) =>
      headers
        .map((fieldName) => {
          const value = row[fieldName];
          
          // Tratamento para valores nulos/indefinidos
          if (value === null || value === undefined) {
            return '""';
          }
          
          // Formatação de string (escapando vírgulas e aspas)
          let stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            stringValue = `"${stringValue.replace(/"/g, '""')}"`;
          }
          
          return stringValue;
        })
        .join(',')
    ),
  ].join('\n');

  // Adicionar BOM para compatibilidade com Excel no Windows (UTF-8)
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Criar o link de download e disparar
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${getLocalTodayDate()}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
