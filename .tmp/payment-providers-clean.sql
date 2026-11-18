\echo === once ===
select id, is_enabled from payment_provider order by id;

update payment_provider
set is_enabled = false, updated_at = now()
where id not in (
  'pp_system_default',
  'pp_bank-transfer_bank-transfer',
  'pp_stripe_stripe',
  'pp_paypal_paypal'
);

\echo === sonra ===
select id, is_enabled from payment_provider order by id;
