select 'product' as tablo, count(*) as adet from product
union all select 'kinguin_product', count(*) from kinguin_product
union all select 'medusa_user', count(*) from "user"
union all select 'store_setting', count(*) from store_setting
union all select 'api_key', count(*) from api_key
union all select 'region', count(*) from region
union all select 'sync_log', count(*) from sync_log
order by 1;
