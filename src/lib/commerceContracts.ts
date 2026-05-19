import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type CommercePaymentMethod = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito';
export type ComandaStatus = 'open' | 'closed';
export type StockStatus = 'not_tracked' | 'out' | 'low' | 'ok';

export interface CommerceProduct {
  id: string;
  userId: string;
  name: string;
  price: number;
  category: string;
  active: boolean;
  createdAt: string;
  trackStock: boolean;
  stockQuantity: number;
  minStock: number;
}

export interface CommerceSale {
  id: string;
  userId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  paymentMethod: CommercePaymentMethod;
  soldAt: string;
  createdAt: string;
}

export interface CommerceComandaItem {
  id: string;
  comandaId: string;
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt: string;
}

export interface CommerceComanda {
  id: string;
  userId: string;
  name: string;
  status: ComandaStatus;
  createdAt: string;
  closedAt?: string | null;
  items: CommerceComandaItem[];
  totalAmount: number;
}

export type ComandaRowWithItems = Tables<'comandas'> & {
  comanda_items?: Tables<'comanda_items'>[] | null;
};

const paymentMethodLabels: Record<CommercePaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cart\u00e3o de Cr\u00e9dito',
  cartao_debito: 'Cart\u00e3o de D\u00e9bito',
};

const paymentMethods = new Set<string>(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito']);

export function normalizeMoney(value: number | string | null | undefined): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount * 100) / 100);
}

export function normalizeQuantity(value: number | string | null | undefined): number {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return 0;
  return Math.max(0, Math.floor(quantity));
}

export function calculateLineTotal(quantity: number | string | null | undefined, unitPrice: number | string | null | undefined): number {
  return normalizeMoney(normalizeQuantity(quantity) * normalizeMoney(unitPrice));
}

export function normalizePaymentMethod(value: string | null | undefined): CommercePaymentMethod {
  return paymentMethods.has(String(value)) ? (value as CommercePaymentMethod) : 'dinheiro';
}

export function getPaymentMethodLabel(method: CommercePaymentMethod): string {
  return paymentMethodLabels[method] || method;
}

export function mapProductRow(row: Tables<'products'>): CommerceProduct {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name.trim(),
    price: normalizeMoney(row.price),
    category: row.category || 'geral',
    active: row.active,
    createdAt: row.created_at,
    trackStock: row.track_stock,
    stockQuantity: normalizeQuantity(row.stock_quantity),
    minStock: normalizeQuantity(row.min_stock),
  };
}

export function getStockStatus(product: Pick<CommerceProduct, 'trackStock' | 'stockQuantity' | 'minStock'>): StockStatus {
  if (!product.trackStock) return 'not_tracked';
  if (product.stockQuantity <= 0) return 'out';
  if (product.stockQuantity <= product.minStock) return 'low';
  return 'ok';
}

export function getInventoryStats(products: ReadonlyArray<CommerceProduct>) {
  return products
    .filter((product) => product.active && product.trackStock)
    .reduce(
      (stats, product) => ({
        totalItems: stats.totalItems + product.stockQuantity,
        totalValue: normalizeMoney(stats.totalValue + product.stockQuantity * product.price),
        alertCount: stats.alertCount + (getStockStatus(product) === 'low' || getStockStatus(product) === 'out' ? 1 : 0),
      }),
      { totalItems: 0, totalValue: 0, alertCount: 0 }
    );
}

export function buildProductInsertPayload(
  product: {
    name: string;
    price: number;
    category?: string;
    trackStock?: boolean;
    stockQuantity?: number;
    minStock?: number;
  },
  userId: string,
  businessType: string
): TablesInsert<'products'> {
  const trackStock = product.trackStock ?? false;

  return {
    user_id: userId,
    business_type: businessType,
    name: product.name.trim(),
    price: normalizeMoney(product.price),
    category: product.category || 'geral',
    track_stock: trackStock,
    stock_quantity: trackStock ? normalizeQuantity(product.stockQuantity) : 0,
    min_stock: trackStock ? normalizeQuantity(product.minStock) : 0,
  };
}

export function buildProductUpdatePayload(updates: Partial<CommerceProduct>): TablesUpdate<'products'> {
  const dbUpdates: TablesUpdate<'products'> = {};

  if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
  if (updates.price !== undefined) dbUpdates.price = normalizeMoney(updates.price);
  if (updates.category !== undefined) dbUpdates.category = updates.category || 'geral';
  if (updates.active !== undefined) dbUpdates.active = updates.active;
  if (updates.trackStock !== undefined) dbUpdates.track_stock = updates.trackStock;
  if (updates.stockQuantity !== undefined) dbUpdates.stock_quantity = normalizeQuantity(updates.stockQuantity);
  if (updates.minStock !== undefined) dbUpdates.min_stock = normalizeQuantity(updates.minStock);

  return dbUpdates;
}

export function mapSaleRow(row: Tables<'sales'>): CommerceSale {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: normalizeQuantity(row.quantity),
    unitPrice: normalizeMoney(row.unit_price),
    total: normalizeMoney(row.total),
    paymentMethod: normalizePaymentMethod(row.payment_method),
    soldAt: row.sold_at,
    createdAt: row.created_at,
  };
}

export function mapComandaItem(row: Tables<'comanda_items'>, fallbackComandaId: string): CommerceComandaItem {
  const quantity = normalizeQuantity(row.quantity);
  const unitPrice = normalizeMoney(row.unit_price);

  return {
    id: row.id,
    comandaId: row.comanda_id || fallbackComandaId,
    productId: row.product_id,
    productName: row.product_name,
    quantity,
    unitPrice,
    total: normalizeMoney(row.total || calculateLineTotal(quantity, unitPrice)),
    createdAt: row.created_at,
  };
}

export function mapComandaRow(row: ComandaRowWithItems): CommerceComanda {
  const items = (row.comanda_items || []).map((item) => mapComandaItem(item, row.id));

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name.trim(),
    status: row.status === 'closed' ? 'closed' : 'open',
    createdAt: row.created_at,
    closedAt: row.closed_at,
    items,
    totalAmount: normalizeMoney(items.reduce((sum, item) => sum + item.total, 0)),
  };
}

export function calculateComandaItemUpdate(existingQuantity: number, quantityDelta: number, unitPrice: number) {
  const quantity = normalizeQuantity(existingQuantity) + normalizeQuantity(quantityDelta);

  return {
    quantity,
    total: calculateLineTotal(quantity, unitPrice),
  };
}

export function buildComandaItemInsert(params: {
  userId: string;
  comandaId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
}): TablesInsert<'comanda_items'> {
  const quantity = normalizeQuantity(params.quantity);
  const unitPrice = normalizeMoney(params.unitPrice);

  return {
    user_id: params.userId,
    comanda_id: params.comandaId,
    product_id: params.productId,
    product_name: params.productName,
    quantity,
    unit_price: unitPrice,
    total: calculateLineTotal(quantity, unitPrice),
  };
}
