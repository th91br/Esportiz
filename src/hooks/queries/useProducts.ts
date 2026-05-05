import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Product {
  id: string;
  userId: string;
  name: string;
  price: number;
  category: string;
  active: boolean;
  createdAt: string;
}

function mapProduct(row: any): Product {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    price: Number(row.price),
    category: row.category || 'geral',
    active: row.active,
    createdAt: row.created_at,
  };
}

export function useProducts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['products', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      if (error) throw error;
      return (data || []).map(mapProduct);
    },
    enabled: !!user?.id,
  });

  const addProductMutation = useMutation({
    mutationFn: async (product: { name: string; price: number; category?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase.from('products').insert({
        user_id: user.id,
        name: product.name,
        price: product.price,
        category: product.category || 'geral',
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
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.price !== undefined) dbUpdates.price = updates.price;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.active !== undefined) dbUpdates.active = updates.active;
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
