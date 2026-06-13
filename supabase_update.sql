-- 1. Update Profiles Table for Lawyer Website Metadata
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS office_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_phone TEXT;

-- 2. Update Cases Table for Client Public Case Tracking
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS case_number TEXT UNIQUE;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'قيد الانتظار';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS next_session_date DATE;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS last_update TEXT;

-- 3. Create Bookings Table for Client Appointment Requests
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
