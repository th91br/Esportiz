import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { syncAfterCourtMutation } from '@/lib/querySync';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type CourtSportType =
  | 'beach_tennis' | 'futevolei' | 'volei_praia' | 'society'
  | 'padel' | 'basquete' | 'poliesportiva' | 'outro';

export type CourtCoverage = 'covered' | 'open';

export const SPORT_LABELS: Record<CourtSportType, string> = {
  beach_tennis: 'Beach Tennis',
  futevolei: 'Futevôlei',
  volei_praia: 'Vôlei de Praia',
  society: 'Society',
  padel: 'Padel',
  basquete: 'Basquete',
  poliesportiva: 'Poliesportiva',
  outro: 'Outro',
};

export interface CourtMetadata {
  sportType: CourtSportType;
  coverage: CourtCoverage;
  capacity: number;
  pricePerHour: number;
  extraHourPrice: number;
  openingTime: string;
  closingTime: string;
  daysOfWeek: number[];
  observations: string;
  isActive: boolean;
  usePeakPricing?: boolean;
  peakPrice?: number;
  peakStart?: string;
  peakEnd?: string;
}

export interface Court {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
  sportType: CourtSportType;
  coverage: CourtCoverage;
  capacity: number;
  pricePerHour: number;
  extraHourPrice: number;
  openingTime: string;
  closingTime: string;
  daysOfWeek: number[];
  observations: string;
  isActive: boolean;
  usePeakPricing?: boolean;
  peakPrice?: number;
  peakStart?: string;
  peakEnd?: string;
}

const DEFAULT_META: CourtMetadata = {
  sportType: 'poliesportiva',
  coverage: 'open',
  capacity: 4,
  pricePerHour: 0,
  extraHourPrice: 0,
  openingTime: '07:00',
  closingTime: '22:00',
  daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
  observations: '',
  isActive: true,
  usePeakPricing: false,
  peakPrice: 0,
  peakStart: '18:00',
  peakEnd: '22:00',
};

function parseMeta(raw: unknown): CourtMetadata {
  if (!raw) return { ...DEFAULT_META };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? { ...DEFAULT_META, ...(parsed as Partial<CourtMetadata>) }
      : { ...DEFAULT_META };
  } catch {
    return { ...DEFAULT_META };
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro inesperado';
}

function toCourt(row: Tables<'modalities'>): Court {
  const meta = parseMeta(row.metadata);
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color || '#f97316',
    createdAt: row.created_at,
    ...meta,
  };
}

import { useProfile } from '@/hooks/queries/useProfile';

export function useCourts(options: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const courtsEnabled = options.enabled ?? true;

  const tenantId = profile?.owner_user_id || user?.id;

  const { data: courts = [], isLoading: loadingCourts } = useQuery({
    queryKey: ['courts', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('modalities')
        .select('*')
        .eq('user_id', tenantId)
        .eq('business_type', 'arena')
        .order('name');
      if (error) throw error;
      return (data || []).map(toCourt);
    },
    enabled: courtsEnabled && !!tenantId,
  });

  const addCourt = useMutation({
    mutationFn: async (input: { name: string; color: string; metadata: CourtMetadata }) => {
      if (!user) throw new Error('Não autenticado');
      const newCourt: TablesInsert<'modalities'> = {
        user_id: user.id,
        business_type: 'arena',
        name: input.name,
        color: input.color,
        metadata: JSON.stringify(input.metadata),
        organization_id: profile?.organization_id || null,
      };
      const { data, error } = await supabase
        .from('modalities')
        .insert(newCourt)
        .select()
        .single();
      if (error) throw error;
      return toCourt(data);
    },
    onSuccess: () => {
      syncAfterCourtMutation(queryClient);
      toast.success('Quadra criada com sucesso!');
    },
    onError: (e: unknown) => toast.error('Erro ao criar quadra: ' + getErrorMessage(e)),
  });

  const updateCourt = useMutation({
    mutationFn: async (params: { id: string; name: string; color: string; metadata: CourtMetadata }) => {
      if (!user) throw new Error('Não autenticado');
      const courtUpdates: TablesUpdate<'modalities'> = {
        name: params.name,
        color: params.color,
        metadata: JSON.stringify(params.metadata),
        organization_id: profile?.organization_id || null,
      };
      const { data, error } = await supabase
        .from('modalities')
        .update(courtUpdates)
        .eq('id', params.id)
        .eq('user_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return toCourt(data);
    },
    onSuccess: () => {
      syncAfterCourtMutation(queryClient);
      toast.success('Quadra atualizada!');
    },
    onError: (e: unknown) => toast.error('Erro ao atualizar quadra: ' + getErrorMessage(e)),
  });

  const deleteCourt = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('modalities')
        .delete()
        .eq('id', id)
        .eq('user_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      syncAfterCourtMutation(queryClient);
      toast.success('Quadra removida!');
    },
    onError: (e: unknown) => toast.error('Erro ao remover quadra: ' + getErrorMessage(e)),
  });

  return {
    courts,
    loadingCourts,
    addCourt: addCourt.mutateAsync,
    updateCourt: updateCourt.mutateAsync,
    deleteCourt: deleteCourt.mutateAsync,
  };
}
