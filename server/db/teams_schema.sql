-- Teams table: stores team information
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lobby_name VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    join_code VARCHAR(6) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team membership table: tracks which users belong to which teams
CREATE TABLE team_membership (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Indexes for better query performance
CREATE INDEX idx_teams_join_code ON teams(join_code);
CREATE INDEX idx_teams_created_by ON teams(created_by);
CREATE INDEX idx_team_membership_team_id ON team_membership(team_id);
CREATE INDEX idx_team_membership_user_id ON team_membership(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_membership ENABLE ROW LEVEL SECURITY;

-- Teams policies: users can only see teams they are members of
CREATE POLICY "Users can view teams they belong to" ON teams
    FOR SELECT USING (
        id IN (
            SELECT team_id FROM team_membership 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create teams" ON teams
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Team admins can update team details" ON teams
    FOR UPDATE USING (
        id IN (
            SELECT team_id FROM team_membership 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Team admins can delete teams" ON teams
    FOR DELETE USING (
        id IN (
            SELECT team_id FROM team_membership 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Team membership policies
CREATE POLICY "Users can view memberships for their teams" ON team_membership
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_membership 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join teams" ON team_membership
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Team admins can manage memberships" ON team_membership
    FOR UPDATE USING (
        team_id IN (
            SELECT team_id FROM team_membership 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can leave teams or admins can remove members" ON team_membership
    FOR DELETE USING (
        user_id = auth.uid() OR 
        team_id IN (
            SELECT team_id FROM team_membership 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Function to ensure join codes are unique and properly formatted
CREATE OR REPLACE FUNCTION generate_unique_join_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a 6-character alphanumeric code
        new_code := UPPER(
            SUBSTRING(
                ENCODE(gen_random_bytes(4), 'base64') 
                FROM 1 FOR 6
            )
        );
        
        -- Replace non-alphanumeric characters with random letters/numbers
        new_code := REGEXP_REPLACE(new_code, '[^A-Z0-9]', 
            SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 
                (RANDOM() * 35)::INT + 1, 1), 'g');
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM teams WHERE join_code = new_code) INTO code_exists;
        
        -- Exit loop if code is unique
        IF NOT code_exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate join codes if not provided
CREATE OR REPLACE FUNCTION set_join_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.join_code IS NULL OR NEW.join_code = '' THEN
        NEW.join_code := generate_unique_join_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teams_set_join_code
    BEFORE INSERT ON teams
    FOR EACH ROW
    EXECUTE FUNCTION set_join_code();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON teams TO authenticated;
GRANT ALL ON team_membership TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;