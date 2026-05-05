import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/queries/useProfile';

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito';

export interface Sale {
  id: string;
  userId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  paymentMethod: PaymentMethod;
  soldAt: string;
  createdAt: string;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
};

export function getPaymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method] || method;
}

function mapSale(row: any): Sale {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    total: Number(row.total),
    paymentMethod: row.payment_method as PaymentMethod,
    soldAt: row.sold_at,
    createdAt: row.created_at,
  };
}

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
      return (data || []).map(mapSale);
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
      const total = sale.quantity * sale.unitPrice;
      const businessType = profile?.business_type || 'sport_school';
      const { error } = await supabase.from('sales').insert({
        user_id: user.id,
        business_type: businessType,
        product_id: sale.productId || null,
        product_name: sale.productName,
        quantity: sale.quantity,
        unit_price: sale.unitPrice,
        total,
        payment_method: sale.paymentMethod || 'dinheiro',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', user?.id] });
      toast.success('Venda registrada com sucesso!');
    },
    onError: () => toast.error('Erro ao registrar venda.'),
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', user?.id] });
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
