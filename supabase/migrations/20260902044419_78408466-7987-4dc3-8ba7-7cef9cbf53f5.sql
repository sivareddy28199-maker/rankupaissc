create schema if not exists private;
grant usage on schema private to authenticated, anon, service_role;
alter function public.has_role(uuid, public.app_role) set schema private;
alter function private.has_role(uuid, public.app_role) set search_path = public, private;

revoke select on public.questions from authenticated;
revoke select on public.questions from anon;
grant select (id, exam_id, subject_id, topic_id, question_text, question_type, options, difficulty, source, year, tags, is_published, created_by, created_at, updated_at) on public.questions to authenticated;
grant all on public.questions to service_role;