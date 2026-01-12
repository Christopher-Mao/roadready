-- Migration: IRP Cab Card Document Processing
-- Run this in Supabase SQL Editor

-- 1. Add IRP_CAB_CARD to document types (doc_type is already TEXT, so no enum needed)
-- The doc_type field already supports any text value, so we can use "IRP_CAB_CARD" directly

-- 2. Add processing_status and expiration_date fields to documents table
-- Note: documents.status is for compliance (green/yellow/red), so we add processing_status for processing state
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'processing_status'
  ) THEN
    ALTER TABLE documents ADD COLUMN processing_status TEXT DEFAULT 'complete' CHECK (processing_status IN ('processing', 'complete', 'needs_review', 'failed'));
  END IF;
END $$;

-- Add expiration_date if it doesn't exist (we already have expires_on, but add expiration_date for consistency)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'expiration_date'
  ) THEN
    ALTER TABLE documents ADD COLUMN expiration_date DATE;
    -- Copy existing expires_on to expiration_date for backward compatibility
    UPDATE documents SET expiration_date = expires_on::DATE WHERE expires_on IS NOT NULL;
  END IF;
END $$;

-- 3. Create document_extractions table
CREATE TABLE IF NOT EXISTS document_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  extracted_json JSONB NOT NULL DEFAULT '{}',
  raw_text TEXT,
  confidence JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_document_extractions_document_id ON document_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_extractions_doc_type ON document_extractions(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status) WHERE status IN ('processing', 'needs_review');

-- Enable RLS
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see extractions for documents in their fleets
CREATE POLICY "Users can view extractions in their fleets"
  ON document_extractions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      JOIN fleets ON documents.fleet_id = fleets.id
      WHERE documents.id = document_extractions.document_id
      AND fleets.owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can create extractions for documents in their fleets
CREATE POLICY "Users can create extractions in their fleets"
  ON document_extractions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      JOIN fleets ON documents.fleet_id = fleets.id
      WHERE documents.id = document_extractions.document_id
      AND fleets.owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can update extractions for documents in their fleets
CREATE POLICY "Users can update extractions in their fleets"
  ON document_extractions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM documents
      JOIN fleets ON documents.fleet_id = fleets.id
      WHERE documents.id = document_extractions.document_id
      AND fleets.owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete extractions for documents in their fleets
CREATE POLICY "Users can delete extractions in their fleets"
  ON document_extractions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM documents
      JOIN fleets ON documents.fleet_id = fleets.id
      WHERE documents.id = document_extractions.document_id
      AND fleets.owner_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_extractions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS document_extractions_updated_at ON document_extractions;
CREATE TRIGGER document_extractions_updated_at
  BEFORE UPDATE ON document_extractions
  FOR EACH ROW
  EXECUTE FUNCTION update_document_extractions_updated_at();

-- Update existing documents to have status = 'complete' if status is NULL
UPDATE documents SET status = 'complete' WHERE status IS NULL;
