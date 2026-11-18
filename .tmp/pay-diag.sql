\echo === payment_provider ===
select id, is_enabled from payment_provider order by id;
\echo === region_payment_provider ===
select region_id, payment_provider_id from region_payment_provider;
\echo === payment_collection son 3 ===
select id, status, created_at from payment_collection order by created_at desc limit 3;
\echo === payment_session ===
select id, provider_id, status, created_at from payment_session order by created_at desc limit 5;
