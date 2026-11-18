select pv.id, pv.title, p.title from product_variant pv join product p on p.id = pv.product_id where p.status='published' and pv.deleted_at is null and p.deleted_at is null limit 1;
