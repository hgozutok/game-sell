\echo === once ===
select key, left(value::text, 12) as onek from store_setting where key like 'payment.%' order by key;

delete from store_setting where key in (
  'payment.paypal.client_secret',
  'payment.paypal.client_id',
  'payment.stripe.secret_key'
);

\echo === sonra ===
select key, left(value::text, 12) as onek from store_setting where key like 'payment.%' order by key;
