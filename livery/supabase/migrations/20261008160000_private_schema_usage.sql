-- The build functions (start_combined_build, start_combined_version,
-- start_owner_version) run as the server's service_role and call
-- private.new_private_key. Resolving a name in a schema needs USAGE on it,
-- which service_role didn't have, so private builds failed with
-- "permission denied for schema private". Only the server gets it; anon and
-- authenticated still can't see into private.
grant usage on schema private to service_role;
grant execute on function private.new_private_key(text) to service_role;
