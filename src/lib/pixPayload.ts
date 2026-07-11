function getCRC16(payload: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let index = 0; index < payload.length; index += 1) {
    const code = payload.charCodeAt(index);
    for (let bit = 0; bit < 8; bit += 1) {
      const bitOnCrc = ((crc >> 15) & 1) === 1;
      const bitOnByte = ((code >> (7 - bit)) & 1) === 1;
      crc = (crc << 1) & 0xFFFF;
      if (bitOnCrc !== bitOnByte) crc ^= polynomial;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatEMVTag(tag: string, value: string): string {
  return `${tag}${value.length.toString().padStart(2, '0')}${value}`;
}

function normalizePixMerchantName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9 ]/gi, '')
    .toUpperCase()
    .slice(0, 25) || 'ESPORTIZ SPORT';
}

export function generatePixCopiaCola(key: string, amount: number, receiver: string): string {
  if (!key.trim()) throw new Error('A chave Pix é obrigatória.');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('O valor do Pix deve ser positivo.');

  const gui = formatEMVTag('00', 'br.gov.bcb.pix');
  const pixKey = formatEMVTag('01', key.trim());
  const merchantAccountInfo = formatEMVTag('26', `${gui}${pixKey}`);
  const payload = [
    formatEMVTag('00', '01'),
    merchantAccountInfo,
    formatEMVTag('52', '0000'),
    formatEMVTag('53', '986'),
    formatEMVTag('54', amount.toFixed(2)),
    formatEMVTag('58', 'BR'),
    formatEMVTag('59', normalizePixMerchantName(receiver)),
    formatEMVTag('60', 'BRASILIA'),
    formatEMVTag('62', formatEMVTag('05', '***')),
    '6304',
  ].join('');

  return `${payload}${getCRC16(payload)}`;
}