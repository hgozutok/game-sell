\echo === once ===
select key, value::text from store_setting where key = 'store.logo_url';

update store_setting
set value = to_jsonb('https://api.hupiplay.uk/static/logo-1794910511968.png'::text),
    updated_at = now()
where key = 'store.logo_url';

\echo === sonra ===
select key, value::text from store_setting where key = 'store.logo_url';
