/*
  # Create Packaging Test System Tables

  ## Overview
  This migration creates the database schema for the Packaging Integrity Test System v6.0.
  It replaces the localStorage implementation with a proper Supabase database structure.

  ## New Tables

  ### 1. `tests`
  Stores main test records with metadata and conclusions.
  
  **Columns:**
  - `id` (bigint, primary key) - Unique test identifier
  - `test_type` (text) - Type of test: 'transport' or 'handling'
  - `date_of_test` (date) - When the test was conducted
  - `tester_name` (text) - Name of the person conducting the test
  - `brand_name` (text) - Brand name of the product
  - `product_name` (text) - Name of the product being tested
  - `product_sku` (text) - SKU identifier for the product
  - `test_notes` (text) - General notes about the test
  - `overall_conclusion` (text) - Overall conclusion from the test
  - `recommendations` (text) - Recommendations for improvements
  - `transport_method` (text, nullable) - Transportation method for transport tests
  - `origin_location` (text, nullable) - Origin location for transport tests
  - `destination_location` (text, nullable) - Destination location for transport tests
  - `transport_duration` (text, nullable) - Duration of transport
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ### 2. `test_cases`
  Stores individual case inspections within each test.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique case identifier
  - `test_id` (bigint, foreign key) - References tests.id
  - `position` (text) - Case position: 'top', 'middle', or 'bottom'
  - `total_units_inspected` (integer) - Total units inspected in this case
  - `case_damage_type` (text) - Type of case damage
  - `case_damage_description` (text) - Description of case damage
  - `case_damage_image_url` (text, nullable) - URL to case damage image
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. `product_failures`
  Stores individual product failure records within each case.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique failure identifier
  - `case_id` (uuid, foreign key) - References test_cases.id
  - `failure_mode` (text) - Mode of failure: 'broken', 'crushed', 'chipped', 'melted'
  - `units_failed` (integer) - Number of units that failed
  - `image_url` (text, nullable) - URL to failure evidence image
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security

  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Public read access for all authenticated users
  - Insert/Update/Delete restricted to authenticated users only
  - Future enhancement: Add user_id column and restrict to owner only

  ## Indexes
  - Index on tests.brand_name for dashboard filtering
  - Index on tests.product_sku for dashboard filtering
  - Index on tests.date_of_test for reporting
  - Index on test_cases.test_id for efficient joins
  - Index on product_failures.case_id for efficient joins

  ## Notes
  - Images will be stored in Supabase Storage and referenced by URL
  - This replaces the localStorage + IndexedDB implementation
  - All timestamps use timestamptz for proper timezone handling
*/

-- Create tests table
CREATE TABLE IF NOT EXISTS tests (
  id bigint PRIMARY KEY,
  test_type text NOT NULL CHECK (test_type IN ('transport', 'handling')),
  date_of_test date NOT NULL,
  tester_name text NOT NULL,
  brand_name text NOT NULL,
  product_name text NOT NULL,
  product_sku text NOT NULL,
  test_notes text DEFAULT '',
  overall_conclusion text DEFAULT '',
  recommendations text DEFAULT '',
  transport_method text,
  origin_location text,
  destination_location text,
  transport_duration text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create test_cases table
CREATE TABLE IF NOT EXISTS test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id bigint NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  position text NOT NULL CHECK (position IN ('top', 'middle', 'bottom')),
  total_units_inspected integer NOT NULL CHECK (total_units_inspected > 0),
  case_damage_type text NOT NULL DEFAULT 'none',
  case_damage_description text DEFAULT '',
  case_damage_image_url text,
  created_at timestamptz DEFAULT now()
);

-- Create product_failures table
CREATE TABLE IF NOT EXISTS product_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  failure_mode text NOT NULL CHECK (failure_mode IN ('broken', 'crushed', 'chipped', 'melted')),
  units_failed integer NOT NULL CHECK (units_failed > 0),
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tests_brand_name ON tests(brand_name);
CREATE INDEX IF NOT EXISTS idx_tests_product_sku ON tests(product_sku);
CREATE INDEX IF NOT EXISTS idx_tests_date ON tests(date_of_test DESC);
CREATE INDEX IF NOT EXISTS idx_test_cases_test_id ON test_cases(test_id);
CREATE INDEX IF NOT EXISTS idx_product_failures_case_id ON product_failures(case_id);

-- Enable Row Level Security
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_failures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tests table
CREATE POLICY "Allow public read access to tests"
  ON tests FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to insert tests"
  ON tests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update tests"
  ON tests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete tests"
  ON tests FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for test_cases table
CREATE POLICY "Allow public read access to test_cases"
  ON test_cases FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to insert test_cases"
  ON test_cases FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update test_cases"
  ON test_cases FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete test_cases"
  ON test_cases FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for product_failures table
CREATE POLICY "Allow public read access to product_failures"
  ON product_failures FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to insert product_failures"
  ON product_failures FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update product_failures"
  ON product_failures FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete product_failures"
  ON product_failures FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to tests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_tests_updated_at'
  ) THEN
    CREATE TRIGGER update_tests_updated_at
      BEFORE UPDATE ON tests
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;