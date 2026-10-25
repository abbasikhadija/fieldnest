-- Fictional local development properties only. No auth users or passwords.
-- Run npm run seed:local after starting the local Supabase stack to create
-- private test users through its Admin API and assign these properties.
insert into public.inspections(id, property, address, kind, due_on) values
('10000000-0000-4000-8000-000000000001', '12 Willow Court', 'Westbrook · Apartment 2B', 'Routine condition inspection', '2026-11-02'),
('10000000-0000-4000-8000-000000000002', '8 Cedar House', 'Oakridge · Ground floor', 'Move-in inspection', '2026-11-03');
insert into public.inspection_records(inspection_id) select id from public.inspections;
