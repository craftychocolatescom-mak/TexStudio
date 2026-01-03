-- Enable RLS on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Users can only read/update their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- 2. Projects: Users can only see projects they created
CREATE POLICY "Users can view own projects" 
ON projects FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" 
ON projects FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
ON projects FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
ON projects FOR DELETE 
USING (auth.uid() = user_id);

-- 3. Artifacts: Users can only see artifacts from their projects
CREATE POLICY "Users can view own artifacts" 
ON artifacts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own artifacts" 
ON artifacts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own artifacts" 
ON artifacts FOR DELETE 
USING (auth.uid() = user_id);

-- Storage Policies (Run this in Storage > Policies dashboard or via SQL if enabled)
-- Bucket: project-assets
-- Policy: "Give users access to own folder 1qgz20s_0"
-- (folder name usually maps to user_id in our structure: {user_id}/{project_id}/...)
-- CREATE POLICY "Allow authenticated uploads"
-- ON storage.objects FOR INSERT
-- WITH CHECK ( bucket_id = 'project-assets' AND auth.role() = 'authenticated' );

-- CREATE POLICY "Allow users to view their own files"
-- ON storage.objects FOR SELECT
-- USING ( bucket_id = 'project-assets' AND auth.uid()::text = (storage.foldername(name))[1] );
