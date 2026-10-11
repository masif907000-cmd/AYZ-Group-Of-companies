-- ============================================================
-- Per-tool trust badge selection — lets admin choose which of the
-- global trust_badges show on EACH tool's page (e.g. hide "Extension
-- Base Account" on tools that aren't extension-based).
-- Run once in Supabase Dashboard -> SQL Editor -> New Query.
-- ============================================================

-- NULL (the default for every existing tool) means "show all active
-- badges" — nothing changes on the live site until an admin opens a
-- tool and unticks specific badges, which then stores just those ids.
alter table tools add column if not exists badge_ids uuid[];
