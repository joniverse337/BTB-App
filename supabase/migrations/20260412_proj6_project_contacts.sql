-- PROJ-6: project_contacts
-- Stores named contact persons (name + phone) per project.
-- Follows the same pattern as project_categories.

CREATE TABLE project_contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  funktion    TEXT,
  name        TEXT NOT NULL,
  phone       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_contacts_project_id ON project_contacts (project_id);

ALTER TABLE project_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_contacts: access via project ownership" ON project_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_contacts.project_id
        AND (
          (
            p.company_id IS NOT NULL
            AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
            AND EXISTS (SELECT 1 FROM companies WHERE id = p.company_id AND is_active = true)
          )
          OR
          (p.company_id IS NULL AND p.created_by = auth.uid())
        )
    )
  );
