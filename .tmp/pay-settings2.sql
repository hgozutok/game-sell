select key, left(value::text, 30) as deger_onek, length(value::text) as uzunluk
from store_setting
where key like 'payment.%'
order by key;
