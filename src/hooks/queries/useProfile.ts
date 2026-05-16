import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { OnboardingGoal } from '@/lib/authRouting';

export type BusinessType = 'sport_school' | 'arena' | 'other';

export interface NicheProfile {
  ct_name?: string | null;
  logo_url?: string | null;
  pix_key?: string | null;
  pix_receiver?: string | null;
  onboarding_goal?: OnboardingGoal | null;
  templates?: {
    mass_all_active?: string;
    mass_overdue?: string;
    mass_due_7_days?: string;
    mass_trial?: string;
    mass_without_plan?: string;
    mass_inactive?: string;
    booking_confirmation?: string;
    payment_reminder?: string;
  } | null;
}

export interface Profile {
  id: string;
  user_id: string;
  ct_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  business_type: BusinessType;
  onboarding_completed: boolean;
  sheets_spreadsheet_id?: string | null;
  sheets_webhook_active?: boolean;
  pix_key?: string | null;
  pix_receiver?: string | null;
  niche_settings?: Record<string, NicheProfile> | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          ct_name,
          logo_url,
          primary_color,
          secondary_color,
          business_type,
          onboarding_completed,
          google_calendar_id,
          sheets_spreadsheet_id,
          sheets_webhook_active,
          pix_key,
          pix_receiver,
          niche_settings,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      return data as Profile;
    },
    enabled: !!user?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data: existing, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching existing profile:', fetchError);
        throw fetchError;
      }

      let result;
      if (existing) {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating profile:', error);
          throw error;
        }
        result = data;
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error('Error inserting profile:', error);
          throw error;
        }
        result = data;
      }

      return result as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
    onError: () => {
      toast.error('Erro ao salvar as informações do perfil.');
    }
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tenant_assets')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading logo:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('tenant_assets')
        .getPublicUrl(filePath);

      return publicUrl;
    },
    onError: () => {
      toast.error('Erro ao fazer upload da logo.');
    }
  });

  const resolvedProfile = useMemo(() => {
    const profile = profileQuery.data;
    if (!profile) return null;

    const activeNicheType = profile.business_type || 'sport_school';
    const niche = profile.niche_settings?.[activeNicheType] || {};

    return {
      ...profile,
      ct_name: niche.ct_name !== undefined && niche.ct_name !== null ? niche.ct_name : profile.ct_name,
      logo_url: niche.logo_url !== undefined && niche.logo_url !== null ? niche.logo_url : profile.logo_url,
      pix_key: niche.pix_key !== undefined && niche.pix_key !== null ? niche.pix_key : profile.pix_key,
      pix_receiver: niche.pix_receiver !== undefined && niche.pix_receiver !== null ? niche.pix_receiver : profile.pix_receiver,
    } as Profile;
  }, [profileQuery.data]);

  return {
    profile: resolvedProfile,
    rawProfile: profileQuery.data,
    loadingProfile: profileQuery.isLoading,
    isErrorProfile: profileQuery.isError,
    errorProfile: profileQuery.error,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    uploadLogo: uploadLogoMutation.mutateAsync,
    isUploadingLogo: uploadLogoMutation.isPending,
  };
}
