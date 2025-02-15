/*
  # Pipeline and Referral System Schema

  1. New Tables
    - `referral_relationships`
      - Tracks connections between users (who referred whom)
      - Stores referral level (1-7) and commission rates
    - `revenue_shares`
      - Tracks revenue distribution for each transaction
      - Records commission amounts and status

  2. Security
    - Enable RLS on all tables
    - Add policies for read/write access
*/

-- Referral Relationships Table
CREATE TABLE IF NOT EXISTS referral_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id),
  referred_id uuid NOT NULL REFERENCES auth.users(id),
  level smallint NOT NULL CHECK (level BETWEEN 1 AND 7),
  commission_rate decimal NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE(referrer_id, referred_id)
);

-- Revenue Shares Table
CREATE TABLE IF NOT EXISTS revenue_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  referrer_id uuid NOT NULL REFERENCES auth.users(id),
  referred_id uuid NOT NULL REFERENCES auth.users(id),
  amount decimal NOT NULL,
  commission_amount decimal NOT NULL,
  level smallint NOT NULL CHECK (level BETWEEN 1 AND 7),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  transaction_type text NOT NULL CHECK (transaction_type IN ('deal', 'referral_bonus', 'commission'))
);

-- Enable RLS
ALTER TABLE referral_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_relationships
CREATE POLICY "Users can view their own referral relationships"
  ON referral_relationships
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = referrer_id OR 
    auth.uid() = referred_id
  );

CREATE POLICY "Users can create referral relationships"
  ON referral_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_id);

-- RLS Policies for revenue_shares
CREATE POLICY "Users can view their own revenue shares"
  ON revenue_shares
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = referrer_id OR 
    auth.uid() = referred_id
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referrer ON referral_relationships(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referred ON referral_relationships(referred_id);
CREATE INDEX IF NOT EXISTS idx_revenue_shares_referrer ON revenue_shares(referrer_id);
CREATE INDEX IF NOT EXISTS idx_revenue_shares_referred ON revenue_shares(referred_id);

-- Function to calculate commission rates based on level
CREATE OR REPLACE FUNCTION calculate_commission_rate(level smallint)
RETURNS decimal AS $$
BEGIN
  RETURN CASE
    WHEN level = 1 THEN 0.10  -- 10% for direct referrals
    WHEN level = 2 THEN 0.05  -- 5% for second level
    WHEN level = 3 THEN 0.03  -- 3% for third level
    WHEN level = 4 THEN 0.02  -- 2% for fourth level
    WHEN level = 5 THEN 0.015 -- 1.5% for fifth level
    WHEN level = 6 THEN 0.01  -- 1% for sixth level
    WHEN level = 7 THEN 0.005 -- 0.5% for seventh level
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to get all upline referrers for a user (up to 7 levels)
CREATE OR REPLACE FUNCTION get_upline_referrers(user_id uuid)
RETURNS TABLE (
  referrer_id uuid,
  level smallint,
  commission_rate decimal
) AS $$
WITH RECURSIVE upline AS (
  -- Base case: direct referrer
  SELECT 
    referrer_id,
    1::smallint as level,
    calculate_commission_rate(1) as commission_rate
  FROM referral_relationships
  WHERE referred_id = user_id
  AND status = 'active'
  
  UNION ALL
  
  -- Recursive case: get next level referrer
  SELECT
    r.referrer_id,
    (u.level + 1)::smallint,
    calculate_commission_rate(u.level + 1)
  FROM upline u
  JOIN referral_relationships r ON r.referred_id = u.referrer_id
  WHERE u.level < 7
  AND r.status = 'active'
)
SELECT * FROM upline;
$$ LANGUAGE sql;