-- ================================================================
-- EIDEN CRM — Supabase Auth + RLS Setup
-- Run this entire script once in:
--   Supabase Dashboard → SQL Editor → New Query → Run
-- ================================================================


-- ================================================================
-- STEP 1: Profiles table
-- Maps each Supabase Auth user to a role + org
-- ================================================================
create table if not exists profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  role        text        not null default 'admin'
                          check (role in ('superadmin', 'admin', 'client')),
  org_id      text        references organizations(id) on delete set null,
  display_name text,
  created_at  timestamptz default now()
);

-- Fast lookup helper (avoids repeated joins in RLS policies)
create or replace function get_my_role()
  returns text language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function get_my_org_id()
  returns text language sql security definer stable as $$
  select org_id from profiles where id = auth.uid()
$$;


-- ================================================================
-- STEP 2: Create any tables the app uses that may not exist yet
-- ================================================================

-- reminders (written by the app but never explicitly created)
create table if not exists reminders (
  id          text        primary key,
  "orgId"     text,
  "guestName" text,
  "sentBy"    text,
  timestamp   timestamptz default now()
);

-- activities log
create table if not exists activities (
  id           text        primary key,
  "orgId"      text,
  "userId"     text,
  "userName"   text,
  action       text,
  "targetType" text,
  "targetName" text,
  timestamp    timestamptz default now()
);

-- notifications
create table if not exists notifications (
  id         text        primary key,
  org_id     text,
  title      text,
  message    text,
  type       text        default 'info',
  read       boolean     default false,
  created_at timestamptz default now()
);


-- ================================================================
-- STEP 3: Enable RLS on every table
-- ================================================================
alter table profiles        enable row level security;
alter table organizations   enable row level security;
alter table guests          enable row level security;
alter table bookings        enable row level security;
alter table tasks           enable row level security;
alter table leads           enable row level security;
alter table activities      enable row level security;
alter table notifications   enable row level security;
alter table reminders       enable row level security;
alter table ez_students     enable row level security;
alter table ez_classes      enable row level security;
alter table ez_staff        enable row level security;
alter table ez_payments     enable row level security;
alter table ez_assignments  enable row level security;
alter table ez_grades       enable row level security;
alter table ez_attendance   enable row level security;


-- ================================================================
-- STEP 4: Profiles policies
-- ================================================================
drop policy if exists "profiles_select_own"        on profiles;
drop policy if exists "profiles_select_superadmin" on profiles;
drop policy if exists "profiles_update_own"        on profiles;

create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());

create policy "profiles_select_superadmin" on profiles
  for select using (get_my_role() = 'superadmin');

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());


-- ================================================================
-- STEP 5: Organizations — superadmin only
-- ================================================================
drop policy if exists "orgs_superadmin" on organizations;
drop policy if exists "orgs_admin_read" on organizations;

create policy "orgs_superadmin" on organizations
  for all using (get_my_role() = 'superadmin');

create policy "orgs_admin_read" on organizations
  for select using (id = get_my_org_id());


-- ================================================================
-- STEP 6: Lunja tables (camelCase "orgId" column)
-- ================================================================

-- guests
drop policy if exists "guests_superadmin" on guests;
drop policy if exists "guests_admin"      on guests;
create policy "guests_superadmin" on guests for all using (get_my_role() = 'superadmin');
create policy "guests_admin"      on guests for all using ("orgId" = get_my_org_id());

-- bookings
drop policy if exists "bookings_superadmin" on bookings;
drop policy if exists "bookings_admin"      on bookings;
create policy "bookings_superadmin" on bookings for all using (get_my_role() = 'superadmin');
create policy "bookings_admin"      on bookings for all using ("orgId" = get_my_org_id());

-- tasks
drop policy if exists "tasks_superadmin" on tasks;
drop policy if exists "tasks_admin"      on tasks;
create policy "tasks_superadmin" on tasks for all using (get_my_role() = 'superadmin');
create policy "tasks_admin"      on tasks for all using ("orgId" = get_my_org_id());

-- leads
drop policy if exists "leads_superadmin" on leads;
drop policy if exists "leads_admin"      on leads;
create policy "leads_superadmin" on leads for all using (get_my_role() = 'superadmin');
create policy "leads_admin"      on leads for all using ("orgId" = get_my_org_id());

-- activities
drop policy if exists "activities_superadmin" on activities;
drop policy if exists "activities_admin"      on activities;
create policy "activities_superadmin" on activities for all using (get_my_role() = 'superadmin');
create policy "activities_admin"      on activities for all using ("orgId" = get_my_org_id());

-- reminders
drop policy if exists "reminders_superadmin" on reminders;
drop policy if exists "reminders_admin"      on reminders;
create policy "reminders_superadmin" on reminders for all using (get_my_role() = 'superadmin');
create policy "reminders_admin"      on reminders for all using ("orgId" = get_my_org_id());

-- notifications (snake_case org_id)
drop policy if exists "notif_superadmin" on notifications;
drop policy if exists "notif_admin"      on notifications;
create policy "notif_superadmin" on notifications for all using (get_my_role() = 'superadmin');
create policy "notif_admin"      on notifications for all using (org_id = get_my_org_id());


-- ================================================================
-- STEP 7: EducaZen tables (snake_case org_id)
-- ================================================================

-- ez_students
drop policy if exists "ez_students_sa" on ez_students;
drop policy if exists "ez_students_ad" on ez_students;
create policy "ez_students_sa" on ez_students for all using (get_my_role() = 'superadmin');
create policy "ez_students_ad" on ez_students for all using (org_id = get_my_org_id());

-- ez_classes
drop policy if exists "ez_classes_sa" on ez_classes;
drop policy if exists "ez_classes_ad" on ez_classes;
create policy "ez_classes_sa" on ez_classes for all using (get_my_role() = 'superadmin');
create policy "ez_classes_ad" on ez_classes for all using (org_id = get_my_org_id());

-- ez_staff
drop policy if exists "ez_staff_sa" on ez_staff;
drop policy if exists "ez_staff_ad" on ez_staff;
create policy "ez_staff_sa" on ez_staff for all using (get_my_role() = 'superadmin');
create policy "ez_staff_ad" on ez_staff for all using (org_id = get_my_org_id());

-- ez_payments
drop policy if exists "ez_payments_sa" on ez_payments;
drop policy if exists "ez_payments_ad" on ez_payments;
create policy "ez_payments_sa" on ez_payments for all using (get_my_role() = 'superadmin');
create policy "ez_payments_ad" on ez_payments for all using (org_id = get_my_org_id());

-- ez_assignments
drop policy if exists "ez_assignments_sa" on ez_assignments;
drop policy if exists "ez_assignments_ad" on ez_assignments;
create policy "ez_assignments_sa" on ez_assignments for all using (get_my_role() = 'superadmin');
create policy "ez_assignments_ad" on ez_assignments for all using (org_id = get_my_org_id());

-- ez_grades
drop policy if exists "ez_grades_sa" on ez_grades;
drop policy if exists "ez_grades_ad" on ez_grades;
create policy "ez_grades_sa" on ez_grades for all using (get_my_role() = 'superadmin');
create policy "ez_grades_ad" on ez_grades for all using (org_id = get_my_org_id());

-- ez_attendance
drop policy if exists "ez_attendance_sa" on ez_attendance;
drop policy if exists "ez_attendance_ad" on ez_attendance;
create policy "ez_attendance_sa" on ez_attendance for all using (get_my_role() = 'superadmin');
create policy "ez_attendance_ad" on ez_attendance for all using (org_id = get_my_org_id());


-- ================================================================
-- STEP 8: Seed Auth users + profiles
--
-- After running this script, go to:
--   Supabase Dashboard → Authentication → Users → Add User
-- Create these 3 users (confirm email = true, set password):
--
--   1. admin@eiden-group.com   / superadmin123   → role: superadmin, org_id: NULL
--   2. admin@lunja-village.com  / <your password> → role: admin,      org_id: lunja
--   3. admin@educazenkids.com  / educazen123     → role: admin,      org_id: educazen
--
-- Then run this INSERT to create their profiles (replace the UUIDs
-- with the actual IDs shown in Authentication → Users):
-- ================================================================

-- FIRST: seed organizations (profiles FK requires these to exist)
insert into organizations (id, name, slug, email)
values
  ('lunja',    'Lunja Village',  'lunja',    'admin@lunja-village.com'),
  ('educazen', 'EducaZen Kids',  'educazen', 'admin@educazenkids.com')
on conflict (id) do nothing;

-- THEN: insert profiles (replace UUIDs with the actual IDs from Authentication → Users)
/*
insert into profiles (id, role, org_id, display_name) values
  ('<EIDEN-USER-UUID>',   'superadmin', null,        'Super Admin'),
  ('<LUNJA-USER-UUID>',   'admin',      'lunja',     'Lunja Village Admin'),
  ('<EDUCAZEN-USER-UUID>','admin',      'educazen',  'EducaZen Admin');
*/

-- ================================================================
-- Done! The app will now use Supabase Auth for login
-- and RLS will enforce data isolation per org.
-- ================================================================
