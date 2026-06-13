-- 1. Update Profiles Table for Lawyer Website Metadata
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS office_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_phone TEXT;

-- 2. Create Bookings Table for Client Appointment Requests
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Bookings Policies
-- Lawyers can view and manage bookings submitted for them
CREATE POLICY "Lawyers can manage own bookings"
  ON public.bookings FOR ALL
  USING ( 
    auth.uid() = lawyer_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Clients (anonymous visitors) can submit bookings on a lawyer's website
CREATE POLICY "Allow public insertions for bookings"
  ON public.bookings FOR INSERT
  WITH CHECK ( true );


-- 3. Create Separate Tracked Client Cases Table (Completely independent from AI Chat cases)
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

-- Enable RLS on client_cases
ALTER TABLE public.client_cases ENABLE ROW LEVEL SECURITY;

-- client_cases Policies
-- Lawyers can view and manage their own client cases, admins manage all
CREATE POLICY "Lawyers can manage own client cases"
  ON public.client_cases FOR ALL
  USING ( 
    auth.uid() = lawyer_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Public (anonymous visitors) can select tracked client cases to search/track
CREATE POLICY "Allow public select for tracking"
  ON public.client_cases FOR SELECT
  USING ( true );
