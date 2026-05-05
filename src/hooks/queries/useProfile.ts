import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type BusinessType = 'sport_school' | 'arena' | 'other';

export interface Profile {
  id: string;
  user_id: string;
  ct_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  business_type: BusinessType;
  onboarding_completed: boolean;
  google_access_token?: string | null;
  google_refresh_token?: string | null;
  google_calendar_id?: string | null;
  sheets_spreadsheet_id?: string | null;
  sheets_webhook_active?: boolean;
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
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist yet, return null
          return null;
        }
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

      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      return data as Profile;
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

  return {
    profile: profileQuery.data,
    loadingProfile: profileQuery.isLoading,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    uploadLogo: uploadLogoMutation.mutateAsync,
    isUploadingLogo: uploadLogoMutation.isPending,
  };
}
