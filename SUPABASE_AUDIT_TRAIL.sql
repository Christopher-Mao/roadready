-- Audit Trail Migration for Phase 3
-- Run this in Supabase SQL Editor after Phase 1 setup

-- Table: document_audit_log
-- Tracks all changes to documents for compliance and accountability
CREATE TABLE IF NOT EXISTS document_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  fleet_id UUID NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'reviewed')),
  changed_by UUID REFERENCES auth.users(id),
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_document_audit_log_document_id ON document_audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_log_fleet_id ON document_audit_log(fleet_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_log_created_at ON document_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_audit_log_changed_by ON document_audit_log(changed_by);

-- Enable RLS
ALTER TABLE document_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see audit logs for their fleets
CREATE POLICY "Users can view audit logs in their fleets"
  ON document_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fleets
      WHERE fleets.id = document_audit_log.fleet_id
      AND fleets.owner_id = auth.uid()
    )
  );

-- Function to automatically log document changes
CREATE OR REPLACE FUNCTION log_document_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log INSERT (document created)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO document_audit_log (
      document_id,
      fleet_id,
      action,
      changed_by,
      new_values
    ) VALUES (
      NEW.id,
      NEW.fleet_id,
      'created',
      NEW.uploaded_by,
      jsonb_build_object(
        'doc_type', NEW.doc_type,
        'expires_on', NEW.expires_on,
        'status', NEW.status,
        'needs_review', NEW.needs_review,
        'file_path', NEW.file_path
      )
    );
    RETURN NEW;
  END IF;

  -- Log UPDATE (document updated)
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO document_audit_log (
      document_id,
      fleet_id,
      action,
      changed_by,
      old_values,
      new_values
    ) VALUES (
      NEW.id,
      NEW.fleet_id,
      'updated',
      COALESCE(NEW.uploaded_by, auth.uid()),
      jsonb_build_object(
        'doc_type', OLD.doc_type,
        'expires_on', OLD.expires_on,
        'status', OLD.status,
        'needs_review', OLD.needs_review
      ),
      jsonb_build_object(
        'doc_type', NEW.doc_type,
        'expires_on', NEW.expires_on,
        'status', NEW.status,
        'needs_review', NEW.needs_review
      )
    );
    RETURN NEW;
  END IF;

  -- Log DELETE (document deleted)
  IF TG_OP = 'DELETE' THEN
    INSERT INTO document_audit_log (
      document_id,
      fleet_id,
      action,
      changed_by,
      old_values
    ) VALUES (
      OLD.id,
      OLD.fleet_id,
      'deleted',
      COALESCE(OLD.uploaded_by, auth.uid()),
      jsonb_build_object(
        'doc_type', OLD.doc_type,
        'expires_on', OLD.expires_on,
        'status', OLD.status,
        'file_path', OLD.file_path
      )
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically log document changes
DROP TRIGGER IF EXISTS document_audit_trigger ON documents;
CREATE TRIGGER document_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_change();

-- Note: Alert logs are already tracked in the `alerts` table
-- No additional migration needed for alert audit trail
