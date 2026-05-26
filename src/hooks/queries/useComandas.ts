import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { syncAfterComandaMutation } from '@/lib/querySync';
import {
  buildComandaItemInsert,
  calculateComandaItemUpdate,
  mapComandaRow,
  type CommerceComanda,
  type CommerceComandaItem,
  type CommercePaymentMethod,
} from '@/lib/commerceContracts';

export type ComandaPaymentMethod = CommercePaymentMethod;

export type ComandaItem = CommerceComandaItem;

export type Comanda = CommerceComanda;

import { getErrorMessage } from '@/lib/errorUtils';

type CloseComandaResult = {
  success?: boolean;
  sales_count?: number;
  total_amount?: number;
  closed_at?: string;
};

import { useProfile } from '@/hooks/queries/useProfile';

export function useComandas() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const tenantId = profile?.owner_user_id || user?.id;

  const invalidateComandaState = () => syncAfterComandaMutation(queryClient);

  const comandasQuery = useQuery({
    queryKey: ['comandas', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('comandas')
        .select('*, comanda_items(*)')
        .eq('user_id', tenantId)
        .eq('business_type', 'arena')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(mapComandaRow);
    },
    enabled: !!tenantId,
  });

  const openComandaMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comandas')
        .insert({
          user_id: tenantId,
          business_type: 'arena',
          name: name.trim(),
          status: 'open',
          organization_id: profile?.organization_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      syncAfterComandaMutation(queryClient);
      toast.success('Comanda aberta com sucesso!');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao abrir comanda: ' + getErrorMessage(error));
    },
  });

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

      const { data: existingItems, error: fetchErr } = await supabase
        .from('comanda_items')
        .select('*')
        .eq('comanda_id', comandaId)
        .eq('user_id', tenantId)
        .eq('product_name', productName);

      if (fetchErr) throw fetchErr;

      if (existingItems && existingItems.length > 0) {
        const existing = existingItems[0];
        const nextItem = calculateComandaItemUpdate(
          Number(existing.quantity),
          quantity,
          Number(existing.unit_price)
        );

        const { error: updateErr } = await supabase
          .from('comanda_items')
          .update({
            quantity: nextItem.quantity,
            total: nextItem.total,
          })
          .eq('id', existing.id)
          .eq('user_id', tenantId);

        if (updateErr) throw updateErr;
        return;
      }

      const payload = {
        ...buildComandaItemInsert({
          userId: tenantId,
          comandaId,
          productId,
          productName,
          quantity,
          unitPrice,
        }),
        organization_id: profile?.organization_id || null,
      };

      const { error: insertErr } = await supabase
        .from('comanda_items')
        .insert(payload);

      if (insertErr) throw insertErr;
    },
    onSuccess: () => {
      syncAfterComandaMutation(queryClient);
    },
    onError: (error: unknown) => {
      toast.error('Erro ao adicionar item: ' + getErrorMessage(error));
    },
  });

  const updateItemQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (!user?.id) throw new Error('Not authenticated');

      if (quantity <= 0) {
        const { error } = await supabase
          .from('comanda_items')
          .delete()
          .eq('id', itemId)
          .eq('user_id', tenantId);

        if (error) throw error;
        return;
      }

      const { data: item, error: fetchErr } = await supabase
        .from('comanda_items')
        .select('*')
        .eq('id', itemId)
        .eq('user_id', tenantId)
        .single();

      if (fetchErr) throw fetchErr;

      const nextItem = calculateComandaItemUpdate(0, quantity, Number(item.unit_price));
      const { error: updateErr } = await supabase
        .from('comanda_items')
        .update({
          quantity: nextItem.quantity,
          total: nextItem.total,
        })
        .eq('id', itemId)
        .eq('user_id', tenantId);

      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      syncAfterComandaMutation(queryClient);
    },
    onError: (error: unknown) => {
      toast.error('Erro ao atualizar quantidade: ' + getErrorMessage(error));
    },
  });

  const deleteComandaItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('comanda_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      syncAfterComandaMutation(queryClient);
      toast.success('Item removido da comanda.');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao remover item: ' + getErrorMessage(error));
    },
  });

  const closeComandaMutation = useMutation({
    mutationFn: async ({
      comandaId,
      paymentMethod,
    }: {
      comandaId: string;
      paymentMethod: ComandaPaymentMethod;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('close_comanda_atomic', {
        p_user_id: tenantId,
        p_comanda_id: comandaId,
        p_payment_method: paymentMethod,
      });

      if (error) throw error;

      const result = data as CloseComandaResult | null;
      if (!result?.success) {
        throw new Error('A comanda nao confirmou o fechamento no banco de dados.');
      }

      return result;
    },
    onSuccess: async (result, variables) => {
      const closedAt = result.closed_at || new Date().toISOString();

      queryClient.setQueryData<Comanda[]>(['comandas', tenantId], (current = []) =>
        current.map((comanda) =>
          comanda.id === variables.comandaId
            ? { ...comanda, status: 'closed', closedAt }
            : comanda
        )
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['comandas'] }),
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ]);

      toast.success('Comanda fechada e venda registrada no caixa com sucesso!');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao fechar comanda: ' + getErrorMessage(error));
    },
  });

  const reopenComandaMutation = useMutation({
    mutationFn: async (comandaId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('reopen_comanda_atomic', {
        p_user_id: tenantId,
        p_comanda_id: comandaId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateComandaState();
      toast.success('Comanda reaberta! O faturamento anterior foi estornado com sucesso.');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao reabrir comanda: ' + getErrorMessage(error));
    },
  });

  const deleteComandaMutation = useMutation({
    mutationFn: async (comandaId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('comandas')
        .delete()
        .eq('id', comandaId)
        .eq('user_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      syncAfterComandaMutation(queryClient);
      toast.success('Comanda cancelada com sucesso.');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao cancelar comanda: ' + getErrorMessage(error));
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
