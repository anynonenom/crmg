-- Run this in your Supabase SQL Editor

-- Use TEXT for all IDs to support legacy Firebase slug strings (like "lunja")

-- Drop existing tables just to be safe if you want to cleanly restart:
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.guests CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- 1. Create Organizations Table
CREATE TABLE public.organizations (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    email TEXT,
    password TEXT,
    branding JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create Clients Table (Kanban)
CREATE TABLE public.clients (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    org_id TEXT,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    amount NUMERIC DEFAULT 0,
    date_time TIMESTAMP WITH TIME ZONE,
    stage TEXT DEFAULT 'Check-in',
    done BOOLEAN DEFAULT false,
    order_index NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create Guests Table
CREATE TABLE public.guests (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    "orgId" TEXT,
    name TEXT NOT NULL,
    email TEXT,
    type TEXT DEFAULT 'Regular',
    stays NUMERIC DEFAULT 0,
    "lastVisit" TEXT,
    spend NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Past',
    initials TEXT,
    phone TEXT,
    company TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Create Bookings Table
CREATE TABLE public.bookings (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    "orgId" TEXT,
    ref TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    type TEXT DEFAULT 'Stay',
    "checkIn" TEXT,
    "checkOut" TEXT,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Create Tasks Table
CREATE TABLE public.tasks (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    "orgId" TEXT,
    name TEXT NOT NULL,
    department TEXT DEFAULT 'Housekeeping',
    due TEXT,
    date TEXT,
    assignee TEXT,
    done BOOLEAN DEFAULT false,
    urgent BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Create Users Table
CREATE TABLE public.users (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    "orgId" TEXT,
    uid TEXT UNIQUE,
    email TEXT,
    "displayName" TEXT,
    "photoURL" TEXT,
    role TEXT DEFAULT 'client',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Create Activities Table
CREATE TABLE public.activities (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    "orgId" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    action TEXT,
    "targetType" TEXT,
    "targetName" TEXT,
    timestamp TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Create Leads Table
CREATE TABLE public.leads (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    "orgId" TEXT,
    name TEXT NOT NULL,
    source TEXT,
    status TEXT DEFAULT 'New',
    stage TEXT,
    value NUMERIC DEFAULT 0,
    date TEXT,
    location TEXT,
    decision_maker TEXT,
    email TEXT,
    mobile TEXT,
    pain_point TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow absolutely all access for this migration environment (Quick bypass)
CREATE POLICY "Enable all for all" ON public.organizations FOR ALL USING (true) WITH CHECK(true);
CREATE POLICY "Enable all for all clients" ON public.clients FOR ALL USING (true) WITH CHECK(true);
CREATE POLICY "Enable all for all guests" ON public.guests FOR ALL USING (true) WITH CHECK(true);
CREATE POLICY "Enable all for all bookings" ON public.bookings FOR ALL USING (true) WITH CHECK(true);
CREATE POLICY "Enable all for all tasks" ON public.tasks FOR ALL USING (true) WITH CHECK(true);
CREATE POLICY "Enable all for all users" ON public.users FOR ALL USING (true) WITH CHECK(true);
CREATE POLICY "Enable all for all activities" ON public.activities FOR ALL USING (true) WITH CHECK(true);
CREATE POLICY "Enable all for all leads" ON public.leads FOR ALL USING (true) WITH CHECK(true);
