import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ComandaItem {
  id: string;
  comandaId: string;
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt: string;
}

export interface Comanda {
  id: string;
  userId: string;
  name: string;
  status: 'open' | 'closed';
  createdAt: string;
  closedAt?: string | null;
  items: ComandaItem[];
  totalAmount: number;
}

export function useComandas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query to fetch all comandas for this tenant, including nested items
  const comandasQuery = useQuery({
    queryKey: ['comandas', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('comandas')
        .select('*, comanda_items(*)')
        .eq('user_id', user.id)
        .eq('business_type', 'arena') // Strict isolation and synchrony!
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => {
        const items = (row.comanda_items || []).map((item: any) => ({
          id: item.id,
          comandaId: item.comanda_id,
          productId: item.product_id,
          productName: item.product_name,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
          total: Number(item.total),
          createdAt: item.created_at,
        })) as ComandaItem[];

        const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

        return {
          id: row.id,
          userId: row.user_id,
          name: row.name,
          status: row.status,
          createdAt: row.created_at,
          closedAt: row.closed_at,
          items,
          totalAmount,
        } as Comanda;
      });
    },
    enabled: !!user?.id,
  });

  // Mutation to open a new comanda
  const openComandaMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comandas')
        .insert({
          user_id: user.id,
          business_type: 'arena', // Definido explicitamente por segurança e isolamento!
          name: name.trim(),
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      toast.success('Comanda aberta com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao abrir comanda: ' + error.message);
    },
  });

  // Mutation to add product to a comanda (increments qty if exists)
  const addComandaItemMutation = useMutation({
    mutationFn: async ({
      comandaId,
      productId,
      productName,
      unitPrice,
      quantity = 1,
    }: {
      comandaId: string;
      productId: string | null;
      productName: string;
      unitPrice: number;
      quantity?: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if item already exists in this comanda
      const { data: existingItems, error: fetchErr } = await supabase
        .from('comanda_items')
        .select('*')
        .eq('comanda_id', comandaId)
        .eq('product_name', productName);

      if (fetchErr) throw fetchErr;

      if (existingItems && existingItems.length > 0) {
        const existing = existingItems[0];
        const newQty = existing.quantity + quantity;
        const newTotal = Number((newQty * existing.unit_price).toFixed(2));

        const { error: updateErr } = await supabase
          .from('comanda_items')
          .update({
            quantity: newQty,
            total: newTotal,
          })
          .eq('id', existing.id);

        if (updateErr) throw updateErr;
      } else {
        const total = Number((quantity * unitPrice).toFixed(2));

        const { error: insertErr } = await supabase
          .from('comanda_items')
          .insert({
            user_id: user.id,
            comanda_id: comandaId,
            product_id: productId,
            product_name: productName,
            quantity,
            unit_price: unitPrice,
            total,
          });

        if (insertErr) throw insertErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar item: ' + error.message);
    },
  });

  // Mutation to update quantity of an item
  const updateItemQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (!user?.id) throw new Error('Not authenticated');

      if (quantity <= 0) {
        const { error } = await supabase
          .from('comanda_items')
          .delete()
          .eq('id', itemId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { data: item, error: fetchErr } = await supabase
          .from('comanda_items')
          .select('*')
          .eq('id', itemId)
          .eq('user_id', user.id)
          .single();

        if (fetchErr) throw fetchErr;

        const total = Number((quantity * Number(item.unit_price)).toFixed(2));

        const { error: updateErr } = await supabase
          .from('comanda_items')
          .update({
            quantity,
            total,
          })
          .eq('id', itemId)
          .eq('user_id', user.id);

        if (updateErr) throw updateErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar quantidade: ' + error.message);
    },
  });

  // Mutation to delete a comanda item directly
  const deleteComandaItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('comanda_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      toast.success('Item removido da comanda.');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover item: ' + error.message);
    },
  });

  // Mutation to close comanda & trigger dynamic financial sales registration
  const closeComandaMutation = useMutation({
    mutationFn: async ({
      comandaId,
      paymentMethod,
    }: {
      comandaId: string;
      paymentMethod: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito';
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // 1. Fetch current items of this comanda
      const { data: items, error: fetchErr } = await supabase
        .from('comanda_items')
        .select('*')
        .eq('comanda_id', comandaId)
        .eq('user_id', user.id);

      if (fetchErr) throw fetchErr;

      // 2. Insert items into 'sales' table for automatic cash flow integration
      if (items && items.length > 0) {
        const salesToInsert = items.map((item) => ({
          user_id: user.id,
          business_type: 'arena', // Sincronia perfeita com o tipo de negócio Arena!
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          payment_method: paymentMethod,
          sold_at: new Date().toISOString(),
          comanda_id: comandaId, // Relate this sale to the comanda!
        }));

        const { error: salesErr } = await supabase
          .from('sales')
          .insert(salesToInsert);

        if (salesErr) throw salesErr;

        // 2.5. Decrement stock for tracked products
        for (const item of items) {
          if (item.product_id) {
            const { data: prod, error: prodErr } = await supabase
              .from('products')
              .select('track_stock, stock_quantity')
              .eq('id', item.product_id)
              .maybeSingle();

            if (!prodErr && prod && prod.track_stock) {
              const newQty = Math.max(0, Number(prod.stock_quantity || 0) - Number(item.quantity));
              await supabase
                .from('products')
                .update({ stock_quantity: newQty })
                .eq('id', item.product_id);
            }
          }
        }
      }

      // 3. Mark comanda as closed
      const { error: closeErr } = await supabase
        .from('comandas')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
        })
        .eq('id', comandaId)
        .eq('user_id', user.id);

      if (closeErr) throw closeErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Comanda fechada e venda registrada no caixa com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao fechar comanda: ' + error.message);
    },
  });

  // Mutation to reopen a closed comanda (cancels financial registration from sales)
  const reopenComandaMutation = useMutation({
    mutationFn: async (comandaId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // 1. Fetch sales associated with this comanda before deleting them
      const { data: sales, error: salesFetchErr } = await supabase
        .from('sales')
        .select('product_id, quantity')
        .eq('comanda_id', comandaId)
        .eq('user_id', user.id);

      if (!salesFetchErr && sales && sales.length > 0) {
        // Restore stock for tracked products before deleting the sales records
        for (const sale of sales) {
          if (sale.product_id) {
            const { data: prod, error: prodErr } = await supabase
              .from('products')
              .select('track_stock, stock_quantity')
              .eq('id', sale.product_id)
              .maybeSingle();

            if (!prodErr && prod && prod.track_stock) {
              const newQty = Number(prod.stock_quantity || 0) + Number(sale.quantity);
              await supabase
                .from('products')
                .update({ stock_quantity: newQty })
                .eq('id', sale.product_id);
            }
          }
        }
      }

      // 2. Delete associated sales records so we don't double report revenue
      const { error: salesErr } = await supabase
        .from('sales')
        .delete()
        .eq('comanda_id', comandaId)
        .eq('user_id', user.id);

      if (salesErr) throw salesErr;

      // 3. Update comanda status back to open and reset closed_at
      const { error: comandaErr } = await supabase
        .from('comandas')
        .update({
          status: 'open',
          closed_at: null,
        })
        .eq('id', comandaId)
        .eq('user_id', user.id);

      if (comandaErr) throw comandaErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Comanda reaberta! O faturamento anterior foi estornado com sucesso.');
    },
    onError: (error: any) => {
      toast.error('Erro ao reabrir comanda: ' + error.message);
    },
  });

  // Mutation to cancel/delete a comanda completely
  const deleteComandaMutation = useMutation({
    mutationFn: async (comandaId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('comandas')
        .delete()
        .eq('id', comandaId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      toast.success('Comanda cancelada com sucesso.');
    },
    onError: (error: any) => {
      toast.error('Erro ao cancelar comanda: ' + error.message);
    },
  });

  return {
    comandas: comandasQuery.data || [],
    loadingComandas: comandasQuery.isLoading,
    openComanda: openComandaMutation.mutateAsync,
    addComandaItem: addComandaItemMutation.mutateAsync,
    updateItemQuantity: updateItemQuantityMutation.mutateAsync,
    deleteComandaItem: deleteComandaItemMutation.mutateAsync,
    closeComanda: closeComandaMutation.mutateAsync,
    reopenComanda: reopenComandaMutation.mutateAsync,
    deleteComanda: deleteComandaMutation.mutateAsync,
  };
}
