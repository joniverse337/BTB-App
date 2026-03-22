-- PROJ-5: Add adr, logo_url, logo_x, logo_y columns to companies table
-- These fields are used for the BTB header (address) and watermark logo.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS adr TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_x FLOAT DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS logo_y FLOAT DEFAULT 0.5;
