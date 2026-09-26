-- Behavior tests for RLS, sync and jobs. Run via supabase/tests/run-local.sh
\set ON_ERROR_STOP 1
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'mahdy@x.com', '{"name":"Mahdy"}'),
  ('00000000-0000-0000-0000-00000000000b', 'shabab@x.com', '{"name":"Shabab"}');
select count(*) = 2 as profiles_created from public.profiles \gset
\if :profiles_created \else \echo 'FAIL profiles' \q \endif

-- anon sees nothing
set role anon;
select count(*) = 0 as anon_blind from public.config \gset
\if :anon_blind \else \echo 'FAIL anon can read config' \q \endif
reset role;

-- authenticated team member pushes a find + media
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.sync_push('[
  {"table":"finds","row":{"id":"11111111-1111-7111-8111-111111111111","captured_by":"00000000-0000-0000-0000-00000000000a",
   "captured_at":"2026-09-01T02:00:00Z","hall":"11.2","gut":"fire","transcript":"LED lamp two ten FOB MOQ 500",
   "tags_ai":[],"certifications":[],"updated_at":"2026-09-01T02:00:00Z","title_ai":"HACK","processing_state":"done"}},
  {"table":"media","row":{"id":"22222222-2222-7222-8222-222222222222","find_id":"11111111-1111-7111-8111-111111111111",
   "kind":"product_photo","upload_state":"pending","updated_at":"2026-09-01T02:00:00Z"}},
  {"table":"jobs","row":{"id":"33333333-3333-7333-8333-333333333333"}}
]'::jsonb) as r \gset
\echo :r
select (:'r'::jsonb->'accepted') @> '["11111111-1111-7111-8111-111111111111","22222222-2222-7222-8222-222222222222"]'
   and jsonb_array_length(:'r'::jsonb->'rejected') = 1 as push_ok \gset
\if :push_ok \else \echo 'FAIL push' \q \endif

-- protected columns ignored
select title_ai is null and processing_state = 'pending' as protected_ok from public.finds where id = '11111111-1111-7111-8111-111111111111' \gset
\if :protected_ok \else \echo 'FAIL protected columns' \q \endif

-- patches: each column applies on arrival, other columns untouched, updated_at never goes backwards
select public.sync_push('[{"table":"finds","row":{"id":"11111111-1111-7111-8111-111111111111","hall":"9.1","updated_at":"2026-09-01T03:00:00Z"}}]');
select public.sync_push('[{"table":"finds","row":{"id":"11111111-1111-7111-8111-111111111111","gut":"good","updated_at":"2026-09-01T01:00:00Z"}}]');
select hall = '9.1' and gut = 'good' and transcript like 'LED%' and updated_at = '2026-09-01T03:00:00Z' as patch_ok
  from public.finds where id = '11111111-1111-7111-8111-111111111111' \gset
\if :patch_ok \else \echo 'FAIL patch semantics' \q \endif

-- future clock clamped
select public.sync_push('[{"table":"finds","row":{"id":"11111111-1111-7111-8111-111111111111","hall":"FUTURE","updated_at":"2030-01-01T00:00:00Z"}}]');
select updated_at < now() + interval '1 hour' as clamp_ok from public.finds where id = '11111111-1111-7111-8111-111111111111' \gset
\if :clamp_ok \else \echo 'FAIL clamp' \q \endif
reset role;

-- no job yet (media pending), then upload -> process_find queued exactly once
select count(*) = 0 as nojob from public.jobs where type = 'process_find' \gset
\if :nojob \else \echo 'FAIL job too early' \q \endif
set role authenticated;
select public.sync_push('[{"table":"media","row":{"id":"22222222-2222-7222-8222-222222222222","upload_state":"uploaded","storage_path":"x.jpg","updated_at":"2026-09-01T04:00:00Z"}}]');
select public.sync_push('[{"table":"media","row":{"id":"22222222-2222-7222-8222-222222222222","upload_state":"uploaded","storage_path":"x.jpg","updated_at":"2026-09-01T05:00:00Z"}}]');
reset role;
select count(*) = 1 as onejob from public.jobs where type = 'process_find' and status = 'queued' \gset
\if :onejob \else \echo 'FAIL process job count' \q \endif

-- authenticated cannot claim jobs or read jobs
set role authenticated;
select count(*) = 0 as jobs_hidden from public.jobs \gset
\if :jobs_hidden \else \echo 'FAIL jobs visible' \q \endif
\set ON_ERROR_STOP 0
select public.claim_jobs(1);
\set ON_ERROR_STOP 1
reset role;

-- worker flow: claim, fail 3x -> error + find error state
select count(*) = 1 as claimed from public.claim_jobs(5) \gset
\if :claimed \else \echo 'FAIL claim' \q \endif
select public.finish_job(id, false, 'boom') from public.jobs where type='process_find';
update public.jobs set run_after = now() where status = 'queued';
select public.claim_jobs(5);
select public.finish_job(id, false, 'boom') from public.jobs where type='process_find';
update public.jobs set run_after = now() where status = 'queued';
select public.claim_jobs(5);
select public.finish_job(id, false, 'boom3') from public.jobs where type='process_find';
select status = 'error' as job_error from public.jobs where type='process_find' \gset
\if :job_error \else \echo 'FAIL job retries' \q \endif
select processing_state = 'error' as find_error from public.finds where id = '11111111-1111-7111-8111-111111111111' \gset
\if :find_error \else \echo 'FAIL find error state' \q \endif

-- request_job retry resets processing and requeues
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.request_job('process_find', '{"find_id":"11111111-1111-7111-8111-111111111111"}');
\set ON_ERROR_STOP 0
select public.request_job('launch_activate', '{}');
\set ON_ERROR_STOP 1
reset role;
select count(*) = 1 as requeued from public.jobs where type='process_find' and status='queued' \gset
\if :requeued \else \echo 'FAIL requeue' \q \endif

-- votes enqueue score_find (deduped)
set role authenticated;
select public.sync_push('[{"table":"votes","row":{"id":"44444444-4444-7444-8444-444444444444","find_id":"11111111-1111-7111-8111-111111111111","user_id":"00000000-0000-0000-0000-00000000000a","value":2,"updated_at":"2026-09-01T06:00:00Z"}}]');
reset role;
select count(*) = 1 as scorejob from public.jobs where type='score_find' and status='queued' \gset
\if :scorejob \else \echo 'FAIL score job' \q \endif

-- pull returns rows and cursors; paging with lim
set role authenticated;
select public.sync_pull('{}'::jsonb, 500, 0) as p \gset
select jsonb_array_length(:'p'::jsonb->'rows'->'finds') = 1 and (:'p'::jsonb->'rows'->'config') is not null
   and not ((:'p'::jsonb->'rows'->'finds'->0) ? 'search_doc') as pull_ok \gset
\if :pull_ok \else \echo 'FAIL pull' \q \endif
select public.sync_pull(:'p'::jsonb->'cursors', 500, 0) as p2 \gset
select (:'p2'::jsonb->'rows') = '{}'::jsonb as pull_empty \gset
\if :pull_empty \else \echo 'FAIL incremental pull' \q \endif
select public.sync_pull('{}'::jsonb, 1, 0)->>'more' = 'true' as more_ok \gset
\if :more_ok \else \echo 'FAIL paging' \q \endif

-- search
select count(*) = 1 as search_ok from public.search_finds('lamp') \gset
reset role;
\if :search_ok \else \echo 'FAIL search' \q \endif

-- launch state machine
insert into public.launches (id, find_id) values ('55555555-5555-7555-8555-555555555555', '11111111-1111-7111-8111-111111111111');
set role authenticated;
\set ON_ERROR_STOP 0
select public.launch_action('55555555-5555-7555-8555-555555555555', 'activate');
\set ON_ERROR_STOP 1
select public.launch_action('55555555-5555-7555-8555-555555555555', 'plan');
reset role;
select count(*) = 1 and bool_and(created_by = '00000000-0000-0000-0000-00000000000a') as plan_job from public.jobs where type='launch_plan' \gset
\if :plan_job \else \echo 'FAIL launch plan job' \q \endif
select count(*) = 0 as no_activate from public.jobs where type='launch_activate' \gset
\if :no_activate \else \echo 'FAIL activate without campaign' \q \endif

-- nightly research picks fire finds that are processed
update public.finds set processing_state = 'done';
select public.enqueue_nightly_research() = 1 as nightly_ok \gset
\if :nightly_ok \else \echo 'FAIL nightly research' \q \endif

-- a non-team authenticated user is blocked
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ff';
select count(*) = 0 as outsider_blind from public.finds \gset
\if :outsider_blind \else \echo 'FAIL outsider sees finds' \q \endif
reset role;

\echo 'ALL DB TESTS PASSED'
