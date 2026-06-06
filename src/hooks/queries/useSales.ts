import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/queries/useProfile';
import { syncAfterSaleMutation } from '@/lib/querySync';
import {
  buildSaleCartPayload,
  getPaymentMethodLabel,
  mapSaleRow,
  type CommerceSaleCartItem,
  type CommercePaymentMethod,
  type CommerceSale,
} from '@/lib/commerceContracts';

export type PaymentMethod = CommercePaymentMethod;
export type Sale = CommerceSale;
export type SaleCartItem = CommerceSaleCartItem;
export { getPaymentMethodLabel };

type CheckoutCartResult = {
  success?: boolean;
  checkout_id?: string;
  sales_count?: number;
  total_amount?: number;
};

export function useSales(options: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const salesEnabled = options.enabled ?? true;

  const tenantId = profile?.owner_user_id || user?.id;

  const salesQuery = useQuery({
    queryKey: ['sales', tenantId, profile?.business_type],
    queryFn: async () => {
      if (!tenantId) return [];
      const businessType = profile?.business_type || 'sport_school';
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', tenantId)
        .eq('business_type', businessType)
        .order('sold_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapSaleRow);
    },
    enabled: salesEnabled && !!tenantId,
  });

  const addSaleMutation = useMutation({
    mutationFn: async (sale: {
      productId?: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      paymentMethod?: PaymentMethod;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const businessType = profile?.business_type || 'sport_school';

      if (!sale.productId) {
        throw new Error('Produto invalido para venda.');
      }

      const payload = buildSaleCartPayload([{ productId: sale.productId, quantity: sale.quantity }]);
      if (payload.length === 0) {
        throw new Error('Quantidade invalida para venda.');
      }

      const { data, error } = await supabase.rpc('process_sale_cart_atomic', {
        p_user_id: tenantId,
        p_business_type: businessType,
        p_items: payload,
        p_payment_method: sale.paymentMethod || 'dinheiro',
      });
      if (error) throw error;

      const result = data as CheckoutCartResult | null;
      if (!result?.success) {
        throw new Error('O checkout nao confirmou a venda no banco de dados.');
      }
    },
    onSuccess: () => {
      syncAfterSaleMutation(queryClient);
      toast.success('Venda registrada com sucesso!');
    },
    onError: () => toast.error('Erro ao registrar venda.'),
  });

  const checkoutCartSaleMutation = useMutation({
    mutationFn: async ({
      items,
      paymentMethod,
    }: {
      items: SaleCartItem[];
      paymentMethod: PaymentMethod;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const payload = buildSaleCartPayload(items);
      if (payload.length === 0) {
        throw new Error('Adicione produtos ao carrinho.');
      }

      const businessType = profile?.business_type || 'sport_school';
      const { data, error } = await supabase.rpc('process_sale_cart_atomic', {
        p_user_id: tenantId,
        p_business_type: businessType,
        p_items: payload,
        p_payment_method: paymentMethod,
      });

      if (error) throw error;

      const result = data as CheckoutCartResult | null;
      if (!result?.success) {
        throw new Error('O checkout nao confirmou a venda no banco de dados.');
      }

      return result;
    },
    onSuccess: (result) => {
      syncAfterSaleMutation(queryClient);
      const count = result.sales_count || 0;
      toast.success(count > 1 ? 'Carrinho vendido com sucesso!' : 'Venda registrada com sucesso!');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao registrar venda: ' + (error instanceof Error ? error.message : 'Erro inesperado.'));
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('delete_sale_and_restore_stock', {
        p_sale_id: id,
        p_user_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      syncAfterSaleMutation(queryClient);
      toast.success('Venda removida.');
    },
    onError: () => toast.error('Erro ao remover venda.'),
  });

  return {
    sales: salesQuery.data || [],
    loadingSales: salesQuery.isLoading,
    addSale: addSaleMutation.mutateAsync,
    checkoutCartSale: checkoutCartSaleMutation.mutateAsync,
    deleteSale: deleteSaleMutation.mutateAsync,
    isAddingSale: addSaleMutation.isPending,
    isCheckingOutCart: checkoutCartSaleMutation.isPending,
  };
}
