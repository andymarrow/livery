-- Up to 12 sources per kit (was 5). Visitors still combine 2 to 5 links;
-- an admin can grow a person's taste from kits already in the library, and
-- the browser extension adds up to 12 pages to one kit.
alter table public.kit_sources drop constraint kit_sources_position_check;
alter table public.kit_sources add constraint kit_sources_position_check check (position between 1 and 12);
