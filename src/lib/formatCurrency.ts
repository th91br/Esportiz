/**
 * Formata um valor numérico como moeda brasileira (BRL).
 * Formato padronizado: R$ 1.250,00
 * 
 * Utilizar SEMPRE este utilitário em todo o sistema para garantir
 * formatação monetária consistente entre Dashboard, Pagamentos, Relatórios e Planos.
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
