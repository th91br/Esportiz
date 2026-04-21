CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ct_name TEXT,
    logo_url TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tenant_assets', 'tenant_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ BEGIN
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'tenant_assets');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can upload their own assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tenant_assets' AND auth.uid() = owner);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update their own assets" ON storage.objects FOR UPDATE USING (bucket_id = 'tenant_assets' AND auth.uid() = owner);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete their own assets" ON storage.objects FOR DELETE USING (bucket_id = 'tenant_assets' AND auth.uid() = owner);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
