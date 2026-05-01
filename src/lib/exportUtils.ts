export function exportToCSV(data: any[], filename: string) {
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
          let value = row[fieldName];
          
          // Tratamento para valores nulos/indefinidos
          if (value === null || value === undefined) {
            return '""';
          }
          
          // Formatação de string (escapando vírgulas e aspas)
          value = String(value);
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          
          return value;
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
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
