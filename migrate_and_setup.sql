-- 1. Create client_cases table (if not exists)
CREATE TABLE IF NOT EXISTS public.client_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  case_number TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'قيد الانتظار',
  next_session_date DATE,
  last_update TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.client_cases ENABLE ROW LEVEL SECURITY;

-- Create policies (handling existing policies safely)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'client_cases' AND policyname = 'Lawyers can manage own client cases'
    ) THEN
        CREATE POLICY "Lawyers can manage own client cases"
          ON public.client_cases FOR ALL
          USING ( 
            auth.uid() = lawyer_id OR 
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'client_cases' AND policyname = 'Allow public select for tracking'
    ) THEN
        CREATE POLICY "Allow public select for tracking"
          ON public.client_cases FOR SELECT
          USING ( true );
    END IF;
END
$$;

-- 2. Migrate existing cases from cases table that have case_number or tracking details
INSERT INTO public.client_cases (
  lawyer_id,
  title,
  case_number,
  client_name,
  client_phone,
  status,
  next_session_date,
  last_update,
  created_at
)
SELECT 
  lawyer_id,
  title,
  case_number,
  COALESCE(NULLIF(title, ''), 'موكل مسترجع'),
  client_phone,
  COALESCE(status, 'قيد الانتظار'),
  next_session_date,
  COALESCE(last_update, ''),
  created_at
FROM public.cases
WHERE case_number IS NOT NULL AND case_number != ''
ON CONFLICT (case_number) DO NOTHING;
