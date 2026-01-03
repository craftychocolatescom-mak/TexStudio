-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Users)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  stripe_customer_id text,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'pro')),
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PROJECTS
create table projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  description text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ARTIFACTS (Studio Outputs)
create table artifacts (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('visualizer', 'pattern', 'cutting', 'costing', 'social')),
  title text,
  data jsonb,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ROW LEVEL SECURITY (RLS)
alter table profiles enable row level security;
alter table projects enable row level security;
alter table artifacts enable row level security;

-- POLICIES

-- Profiles: Users can see and update their own profile
create policy "Public profiles are viewable by everyone" on profiles for select using ( true );
create policy "Users can insert their own profile" on profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile" on profiles for update using ( auth.uid() = id );

-- Projects: Users can only see/edit their own projects
create policy "Users can view own projects" on projects for select using ( auth.uid() = user_id );
create policy "Users can insert own projects" on projects for insert with check ( auth.uid() = user_id );
create policy "Users can update own projects" on projects for update using ( auth.uid() = user_id );
create policy "Users can delete own projects" on projects for delete using ( auth.uid() = user_id );

-- Artifacts: Users can only see/edit artifacts in their projects (redundant check on user_id for simplicity)
create policy "Users can view own artifacts" on artifacts for select using ( auth.uid() = user_id );
create policy "Users can insert own artifacts" on artifacts for insert with check ( auth.uid() = user_id );
create policy "Users can update own artifacts" on artifacts for update using ( auth.uid() = user_id );
create policy "Users can delete own artifacts" on artifacts for delete using ( auth.uid() = user_id );

-- STORAGE BUCKET SETUP (Run this in Storage -> Policies if needed, or via SQL if enabled)
insert into storage.buckets (id, name, public) values ('project-assets', 'project-assets', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload project assets"
on storage.objects for insert to authenticated with check (
  bucket_id = 'project-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users can update project assets"
on storage.objects for update to authenticated with check (
  bucket_id = 'project-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can view project assets"
on storage.objects for select to authenticated using (
  bucket_id = 'project-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: The folder structure is enforced to start with the user's UUID
