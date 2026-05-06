import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
};

function parseMeta(raw: any): CourtMetadata {
  if (!raw) return { ...DEFAULT_META };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { ...DEFAULT_META, ...parsed };
  } catch {
    return { ...DEFAULT_META };
  }
}

function toCourt(row: any): Court {
  const meta = parseMeta((row as any).metadata);
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color || '#f97316',
    createdAt: row.created_at,
    ...meta,
  };
}

export function useCourts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: courts = [], isLoading: loadingCourts } = useQuery({
    queryKey: ['courts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('modalities')
        .select('*')
        .eq('user_id', user.id)
        .eq('business_type', 'arena')
        .order('name');
      if (error) throw error;
      return (data || []).map(toCourt);
    },
    enabled: !!user,
  });

  const addCourt = useMutation({
    mutationFn: async (input: { name: string; color: string; metadata: CourtMetadata }) => {
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('modalities')
        .insert({
          user_id: user.id,
          business_type: 'arena',
          name: input.name,
          color: input.color,
          ...(({ metadata: JSON.stringify(input.metadata) }) as any),
        } as any)
        .select()
        .single();
      if (error) throw error;
      return toCourt(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
      toast.success('Quadra criada com sucesso!');
    },
    onError: (e: any) => toast.error('Erro ao criar quadra: ' + e.message),
  });

  const updateCourt = useMutation({
    mutationFn: async (params: { id: string; name: string; color: string; metadata: CourtMetadata }) => {
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('modalities')
        .update({
          name: params.name,
          color: params.color,
          ...({ metadata: JSON.stringify(params.metadata) } as any),
        } as any)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return toCourt(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
      toast.success('Quadra atualizada!');
    },
    onError: (e: any) => toast.error('Erro ao atualizar quadra: ' + e.message),
  });

  const deleteCourt = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('modalities')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
      toast.success('Quadra removida!');
    },
    onError: (e: any) => toast.error('Erro ao remover quadra: ' + e.message),
  });

  return {
    courts,
    loadingCourts,
    addCourt: addCourt.mutateAsync,
    updateCourt: updateCourt.mutateAsync,
    deleteCourt: deleteCourt.mutateAsync,
  };
}
