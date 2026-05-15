import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/queries/useProfile';

export interface Product {
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

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    price: Number(row.price),
    category: String(row.category || 'geral'),
    active: !!row.active,
    createdAt: String(row.created_at),
    trackStock: !!row.track_stock,
    stockQuantity: Number(row.stock_quantity || 0),
    minStock: Number(row.min_stock || 0),
  };
}

export function useProducts() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['products', user?.id, profile?.business_type],
    queryFn: async () => {
      if (!user?.id) return [];
      const businessType = profile?.business_type || 'sport_school';
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .eq('business_type', businessType)
        .order('name');
      if (error) throw error;
      return (data || []).map(mapProduct);
    },
    enabled: !!user?.id,
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
      const { error } = await supabase.from('products').insert({
        user_id: user.id,
        business_type: businessType,
        name: product.name,
        price: product.price,
        category: product.category || 'geral',
        track_stock: product.trackStock ?? false,
        stock_quantity: product.stockQuantity ?? 0,
        min_stock: product.minStock ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', user?.id] });
      toast.success('Produto cadastrado com sucesso!');
    },
    onError: () => toast.error('Erro ao cadastrar produto.'),
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.price !== undefined) dbUpdates.price = updates.price;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.active !== undefined) dbUpdates.active = updates.active;
      if (updates.trackStock !== undefined) dbUpdates.track_stock = updates.trackStock;
      if (updates.stockQuantity !== undefined) dbUpdates.stock_quantity = updates.stockQuantity;
      if (updates.minStock !== undefined) dbUpdates.min_stock = updates.minStock;
      
      const { error } = await supabase
        .from('products')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', user?.id] });
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
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', user?.id] });
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
