-- Supabase Database Schema for Agent Law Samar Samier

-- 1. Profiles Table (Extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'lawyer')),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') );

-- 2. Cases Table
CREATE TABLE public.cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Cases Policies (Lawyers see own cases, Admins see all)
CREATE POLICY "Lawyers can view own cases, admins view all"
  ON public.cases FOR SELECT
  USING ( 
    auth.uid() = lawyer_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Lawyers can insert own cases"
  ON public.cases FOR INSERT
  WITH CHECK ( auth.uid() = lawyer_id );

CREATE POLICY "Lawyers can update own cases"
  ON public.cases FOR UPDATE
  USING ( auth.uid() = lawyer_id );

CREATE POLICY "Lawyers can delete own cases, admins delete any"
  ON public.cases FOR DELETE
  USING ( 
    auth.uid() = lawyer_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. Messages Table
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
  content TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages Policies
CREATE POLICY "Users can view messages of their accessible cases"
  ON public.messages FOR SELECT
  USING ( 
    EXISTS (
      SELECT 1 FROM public.cases 
      WHERE cases.id = messages.case_id AND (
        cases.lawyer_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "Lawyers can insert messages to own cases"
  ON public.messages FOR INSERT
  WITH CHECK ( 
    EXISTS (
      SELECT 1 FROM public.cases 
      WHERE cases.id = case_id AND cases.lawyer_id = auth.uid()
    )
  );


-- 4. Storage Bucket for Law Files
-- Create bucket "law_files" manually in Supabase Dashboard -> Storage
-- Then run these policies:

-- Storage Policies for "law_files" bucket
-- Admins can do anything
CREATE POLICY "Admins can manage law files"
  ON storage.objects FOR ALL
  USING ( 
    bucket_id = 'law_files' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Anyone authenticated can read law files
CREATE POLICY "Authenticated users can read law files"
  ON storage.objects FOR SELECT
  USING ( 
    bucket_id = 'law_files' AND 
    auth.role() = 'authenticated'
  );

-- 5. Gemini Cache Table
CREATE TABLE public.gemini_cache (
  file_name TEXT PRIMARY KEY,
  file_uri TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: Since the API routes run on Vercel without an active user session in the server (unless we pass the token), 
-- it's easiest to allow anon read/write to this cache table if using Anon Key in API routes, 
-- or we can use Service Role key. For simplicity with Anon Key:
ALTER TABLE public.gemini_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read gemini_cache" ON public.gemini_cache FOR SELECT USING (true);
CREATE POLICY "Allow anon insert gemini_cache" ON public.gemini_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update gemini_cache" ON public.gemini_cache FOR UPDATE USING (true);

-- 6. Settings Table (For Global Admin Configurations)
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert initial empty API key
INSERT INTO public.settings (key, value) VALUES ('gemini_api_key', '') ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Admins can view and update settings
CREATE POLICY "Admins can view settings"
  ON public.settings FOR SELECT
  USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') );

CREATE POLICY "Admins can update settings"
  ON public.settings FOR UPDATE
  USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') );

CREATE POLICY "Admins can insert settings"
  ON public.settings FOR INSERT
  WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') );

-- Server API route needs to read it anonymously (using Anon Key)
CREATE POLICY "Allow anon read settings" ON public.settings FOR SELECT USING (true);
