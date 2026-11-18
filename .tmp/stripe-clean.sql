\echo === once ===
select key, left(value::text, 7) as onek from store_setting where key like 'payment.stripe%';

update store_setting
set value = to_jsonb((select value #>> '{}' from store_setting where key = 'payment.stripe.secret_key')::text),
    updated_at = now()
where key = 'payment.stripe.publishable_key';

delete from store_setting where key = 'payment.stripe.secret_key';

\echo === sonra ===
select key, left(value::text, 7) as onek from store_setting where key like 'payment.stripe%';
