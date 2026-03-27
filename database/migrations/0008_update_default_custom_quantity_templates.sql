update public.quantity_templates
set tiers_json = normalized.tiers_json
from (
  select
    templates.id,
    jsonb_agg(
      jsonb_build_object(
        'optionName', 'Quantity',
        'optionValue',
          case resolved.variant_sku
            when '1PC' then '1PC'
            when '3PCS' then 'Buy 2 Get 1 Free(3PCS) -Hot Sale🔥'
            when '5PCS' then 'Buy 3 Get 2 Free(5PCS) -Most Popular🔥'
            when '8PCS' then 'Buy 4 Get 4 Free(8PCS) -Free Shipping'
            when '10PCS' then 'Buy 5 Get 5 Free(10PCS)-Free Shipping'
            when '20PCS' then 'Buy 10 Get 10 Free(20PCS)-Free Shipping'
            when '30PCS' then 'Buy 15 Get 15 Free(30PCS)-Free Shipping'
            else tier.item->>'optionValue'
          end,
        'variantSku', resolved.variant_sku,
        'price', (tier.item->>'price')::numeric,
        'compareAtPrice', (tier.item->>'compareAtPrice')::numeric,
        'inventoryQty', (tier.item->>'inventoryQty')::integer
      )
      order by tier.ord
    ) as tiers_json
  from public.quantity_templates templates
  cross join lateral jsonb_array_elements(templates.tiers_json) with ordinality as tier(item, ord)
  cross join lateral (
    select coalesce(nullif(tier.item->>'variantSku', ''), tier.item->>'optionValue') as variant_sku
  ) resolved
  where templates.user_id is not null
    and templates.is_default = true
  group by templates.id
) normalized
where public.quantity_templates.id = normalized.id;
