import { describe, expect, it } from 'vitest';
import type { Tables } from '@/integrations/supabase/types';
import {
  buildComandaItemInsert,
  buildProductInsertPayload,
  buildProductUpdatePayload,
  calculateComandaItemUpdate,
  calculateLineTotal,
  getInventoryStats,
  getPaymentMethodLabel,
  getStockStatus,
  mapComandaRow,
  mapProductRow,
  mapSaleRow,
  normalizePaymentMethod,
} from './commerceContracts';

const productRow: Tables<'products'> = {
  id: 'product-1',
  user_id: 'user-1',
  business_type: 'arena',
  name: ' Agua ',
  price: 6.5,
  category: 'Bebidas',
  active: true,
  track_stock: true,
  stock_quantity: 8,
  min_stock: 3,
  created_at: '2026-05-19T10:00:00.000Z',
};

const saleRow: Tables<'sales'> = {
  id: 'sale-1',
  user_id: 'user-1',
  business_type: 'arena',
  comanda_id: null,
  product_id: 'product-1',
  product_name: 'Agua',
  quantity: 2,
  unit_price: 6.5,
  total: 13,
  payment_method: 'pix',
  sold_at: '2026-05-19T10:05:00.000Z',
  created_at: '2026-05-19T10:05:00.000Z',
};

const comandaItemRow: Tables<'comanda_items'> = {
  id: 'item-1',
  user_id: 'user-1',
  comanda_id: 'comanda-1',
  product_id: 'product-1',
  product_name: 'Agua',
  quantity: 2,
  unit_price: 6.5,
  total: 13,
  created_at: '2026-05-19T10:10:00.000Z',
};

describe('commerceContracts', () => {
  it('maps products with trimmed names and safe numeric values', () => {
    expect(mapProductRow(productRow)).toMatchObject({
      id: 'product-1',
      name: 'Agua',
      price: 6.5,
      stockQuantity: 8,
      minStock: 3,
    });

    expect(mapProductRow({ ...productRow, price: -10, stock_quantity: -4 }).price).toBe(0);
    expect(mapProductRow({ ...productRow, price: -10, stock_quantity: -4 }).stockQuantity).toBe(0);
  });

  it('builds product payloads without leaking stock when stock control is off', () => {
    expect(
      buildProductInsertPayload(
        {
          name: '  Suco  ',
          price: 8.999,
          category: '',
          trackStock: false,
          stockQuantity: 50,
          minStock: 5,
        },
        'user-1',
        'arena'
      )
    ).toMatchObject({
      user_id: 'user-1',
      business_type: 'arena',
      name: 'Suco',
      price: 9,
      category: 'geral',
      track_stock: false,
      stock_quantity: 0,
      min_stock: 0,
    });

    expect(buildProductUpdatePayload({ name: '  Agua  ', stockQuantity: 2.9 })).toEqual({
      name: 'Agua',
      stock_quantity: 2,
    });
  });

  it('classifies stock and calculates inventory stats only for active tracked products', () => {
    const okProduct = mapProductRow(productRow);
    const lowProduct = { ...okProduct, id: 'product-2', stockQuantity: 3 };
    const outProduct = { ...okProduct, id: 'product-3', stockQuantity: 0 };
    const inactiveProduct = { ...okProduct, id: 'product-4', active: false, stockQuantity: 100 };
    const untrackedProduct = { ...okProduct, id: 'product-5', trackStock: false, stockQuantity: 100 };

    expect(getStockStatus(okProduct)).toBe('ok');
    expect(getStockStatus(lowProduct)).toBe('low');
    expect(getStockStatus(outProduct)).toBe('out');
    expect(getStockStatus(untrackedProduct)).toBe('not_tracked');

    expect(getInventoryStats([okProduct, lowProduct, outProduct, inactiveProduct, untrackedProduct])).toEqual({
      totalItems: 11,
      totalValue: 71.5,
      alertCount: 2,
    });
  });

  it('normalizes payment methods and labels', () => {
    expect(normalizePaymentMethod('pix')).toBe('pix');
    expect(normalizePaymentMethod('unexpected')).toBe('dinheiro');
    expect(getPaymentMethodLabel('cartao_credito')).toBe('Cart\u00e3o de Cr\u00e9dito');
  });

  it('maps sales and calculates sale totals with cents safely', () => {
    expect(calculateLineTotal(3, 2.335)).toBe(7.02);
    expect(mapSaleRow({ ...saleRow, payment_method: 'invalid', total: -30 })).toMatchObject({
      paymentMethod: 'dinheiro',
      total: 0,
    });
  });

  it('maps comanda rows and totals consumed items', () => {
    const comanda = mapComandaRow({
      id: 'comanda-1',
      user_id: 'user-1',
      business_type: 'arena',
      name: ' Mesa 1 ',
      status: 'unknown',
      created_at: '2026-05-19T10:00:00.000Z',
      closed_at: null,
      comanda_items: [
        comandaItemRow,
        { ...comandaItemRow, id: 'item-2', product_name: 'Suco', quantity: 1, unit_price: 8, total: 8 },
      ],
    });

    expect(comanda).toMatchObject({
      name: 'Mesa 1',
      status: 'open',
      totalAmount: 21,
    });
    expect(comanda.items.map((item) => item.productName)).toEqual(['Agua', 'Suco']);
  });

  it('builds comanda item inserts and quantity updates with safe totals', () => {
    expect(calculateComandaItemUpdate(1, 2, 6.5)).toEqual({ quantity: 3, total: 19.5 });
    expect(
      buildComandaItemInsert({
        userId: 'user-1',
        comandaId: 'comanda-1',
        productId: 'product-1',
        productName: 'Agua',
        quantity: 2,
        unitPrice: 6.5,
      })
    ).toMatchObject({
      user_id: 'user-1',
      comanda_id: 'comanda-1',
      product_id: 'product-1',
      quantity: 2,
      unit_price: 6.5,
      total: 13,
    });
  });
});
