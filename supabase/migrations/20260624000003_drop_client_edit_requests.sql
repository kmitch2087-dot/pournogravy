-- Removed the client edit requests / floating notes system.
-- Tables already dropped via execute_sql; IF EXISTS makes this idempotent.
DROP TABLE IF EXISTS edit_request_replies;
DROP TABLE IF EXISTS client_edit_requests;
