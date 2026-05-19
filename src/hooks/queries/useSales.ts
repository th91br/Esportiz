import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/queries/useProfile';
import { syncAfterSaleMutation } from '@/lib/querySync';
import {
  calculateLineTotal,
  getPaymentMethodLabel,
  mapSaleRow,
  type CommercePaymentMethod,
  type CommerceSale,
} from '@/lib/commerceContracts';

export type PaymentMethod = CommercePaymentMethod;
export type Sale = CommerceSale;
export { getPaymentMethodLabel };

export function useSales() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const salesQuery = useQuery({
    queryKey: ['sales', user?.id, profile?.business_type],
    queryFn: async () => {
      if (!user?.id) return [];
      const businessType = profile?.business_type || 'sport_school';
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', user.id)
        .eq('business_type', businessType)
        .order('sold_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapSaleRow);
    },
    enabled: !!user?.id,
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
      const total = calculateLineTotal(sale.quantity, sale.unitPrice);
      const businessType = profile?.business_type || 'sport_school';

      const { error } = await supabase.rpc('process_sale', {
        p_user_id: user.id,
        p_product_id: sale.productId || null,
        p_product_name: sale.productName,
        p_quantity: sale.quantity,
        p_unit_price: sale.unitPrice,
        p_total: total,
        p_payment_method: sale.paymentMethod || 'dinheiro',
        p_business_type: businessType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      syncAfterSaleMutation(queryClient);
      toast.success('Venda registrada com sucesso!');
    },
    onError: () => toast.error('Erro ao registrar venda.'),
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('delete_sale_and_restore_stock', {
        p_sale_id: id,
        p_user_id: user.id,
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
    deleteSale: deleteSaleMutation.mutateAsync,
    isAddingSale: addSaleMutation.isPending,
  };
}
