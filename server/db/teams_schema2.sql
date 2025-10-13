
-- Step 1: Add new columns to teams table (safe for existing data)
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS project_repo_url TEXT,
ADD COLUMN IF NOT EXISTS project_identifier VARCHAR(32) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS project_name VARCHAR(255);

-- Step 2: Update existing teams that have empty project_identifier FIRST (before adding constraints)
-- This generates temporary hashes for existing teams - they should be updated properly when admins use the extension
UPDATE teams 
SET project_identifier = SUBSTRING(MD5(id::TEXT || lobby_name), 1, 16)
WHERE project_identifier = '' OR project_identifier IS NULL;

-- Step 3: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_teams_project_identifier ON teams(project_identifier);

-- Step 4: Add validation function
CREATE OR REPLACE FUNCTION is_valid_project_identifier(identifier TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the identifier is a valid hexadecimal string of length 16
    RETURN identifier ~ '^[a-fA-F0-9]{16}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 5: Add constraints (AFTER updating existing data)
DO $$
BEGIN
    -- Only add constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_project_identifier_not_empty'
        AND conrelid = 'teams'::regclass
    ) THEN
        ALTER TABLE teams 
        ADD CONSTRAINT check_project_identifier_not_empty 
        CHECK (project_identifier != '');
    END IF;
END $$;

DO $$
BEGIN
    -- Only add constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_valid_project_identifier'
        AND conrelid = 'teams'::regclass
    ) THEN
        ALTER TABLE teams 
        ADD CONSTRAINT check_valid_project_identifier 
        CHECK (is_valid_project_identifier(project_identifier));
    END IF;
END $$;


COMMENT ON COLUMN teams.project_repo_url IS 'The Git repository URL for the team project (nullable for local projects)';
COMMENT ON COLUMN teams.project_identifier IS 'A unique hash identifying the project (16-char hex string)';
COMMENT ON COLUMN teams.project_name IS 'User-friendly name of the project';
