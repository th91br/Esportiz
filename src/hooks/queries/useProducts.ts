import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/queries/useProfile';
import { syncAfterProductMutation } from '@/lib/querySync';
import {
  buildProductInsertPayload,
  buildProductUpdatePayload,
  mapProductRow,
  type CommerceProduct,
} from '@/lib/commerceContracts';

export type Product = CommerceProduct;

export function useProducts(options: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const productsEnabled = options.enabled ?? true;

  const tenantId = profile?.owner_user_id || user?.id;

  const productsQuery = useQuery({
    queryKey: ['products', tenantId, profile?.business_type],
    queryFn: async () => {
      if (!tenantId) return [];
      const businessType = profile?.business_type || 'sport_school';
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', tenantId)
        .eq('business_type', businessType)
        .order('name');
      if (error) throw error;
      return (data || []).map(mapProductRow);
    },
    enabled: productsEnabled && !!tenantId,
  });

  const addProductMutation = useMutation({
    mutationFn: async (product: { 
      name: string; 
      price: number; 
      category?: string;
      trackStock?: boolean;
      stockQuantity?: number;
      minStock?: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const businessType = profile?.business_type || 'sport_school';
      const payload = {
        ...buildProductInsertPayload(product, tenantId, businessType),
        organization_id: profile?.organization_id || null,
      };
      const { error } = await supabase
        .from('products')
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      syncAfterProductMutation(queryClient);
      toast.success('Produto cadastrado com sucesso!');
    },
    onError: () => toast.error('Erro ao cadastrar produto.'),
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const dbUpdates = {
        ...buildProductUpdatePayload(updates),
        organization_id: profile?.organization_id || null,
      };
      
      const { error } = await supabase
        .from('products')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      syncAfterProductMutation(queryClient);
      toast.success('Produto atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar produto.'),
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      // Soft delete — deactivate instead of removing
      const { error } = await supabase
        .from('products')
        .update({ active: false })
        .eq('id', id)
        .eq('user_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      syncAfterProductMutation(queryClient);
      toast.success('Produto desativado.');
    },
    onError: () => toast.error('Erro ao desativar produto.'),
  });

  return {
    products: productsQuery.data || [],
    activeProducts: (productsQuery.data || []).filter(p => p.active),
    loadingProducts: productsQuery.isLoading,
    addProduct: addProductMutation.mutateAsync,
    updateProduct: updateProductMutation.mutateAsync,
    deleteProduct: deleteProductMutation.mutateAsync,
    isAddingProduct: addProductMutation.isPending,
  };
}
