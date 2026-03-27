update public.quantity_templates
set tiers_json = normalized.tiers_json
from (
  select
    templates.id,
    jsonb_agg(
      jsonb_build_object(
        'optionName', coalesce(nullif(tier.item->>'optionName', ''), 'Quantity'),
        'optionValue', tier.item->>'optionValue',
        'variantSku', coalesce(nullif(tier.item->>'variantSku', ''), tier.item->>'optionValue'),
        'price', (tier.item->>'price')::numeric,
        'compareAtPrice', (tier.item->>'compareAtPrice')::numeric,
        'inventoryQty', (tier.item->>'inventoryQty')::integer
      )
      order by tier.ord
    ) as tiers_json
  from public.quantity_templates templates
  cross join lateral jsonb_array_elements(templates.tiers_json) with ordinality as tier(item, ord)
  group by templates.id
) normalized
where public.quantity_templates.id = normalized.id;

update public.quantity_templates
set tiers_json = '[
  {"optionName":"Quantity","optionValue":"1PC","variantSku":"1PC","price":11.99,"compareAtPrice":23.99,"inventoryQty":100},
  {"optionName":"Quantity","optionValue":"Buy 2 Get 1 Free(3PCS) -Hot Sale🔥","variantSku":"3PCS","price":23.99,"compareAtPrice":47.99,"inventoryQty":100},
  {"optionName":"Quantity","optionValue":"Buy 3 Get 2 Free(5PCS) -Most Popular🔥","variantSku":"5PCS","price":35.99,"compareAtPrice":69.99,"inventoryQty":100},
  {"optionName":"Quantity","optionValue":"Buy 4 Get 4 Free(8PCS) -Free Shipping","variantSku":"8PCS","price":47.99,"compareAtPrice":89.99,"inventoryQty":100},
  {"optionName":"Quantity","optionValue":"Buy 5 Get 5 Free(10PCS)-Free Shipping","variantSku":"10PCS","price":59.99,"compareAtPrice":119.99,"inventoryQty":100},
  {"optionName":"Quantity","optionValue":"Buy 10 Get 10 Free(20PCS)-Free Shipping","variantSku":"20PCS","price":119.99,"compareAtPrice":199.99,"inventoryQty":100},
  {"optionName":"Quantity","optionValue":"Buy 15 Get 15 Free(30PCS)-Free Shipping","variantSku":"30PCS","price":179.99,"compareAtPrice":299.99,"inventoryQty":100}
]'::jsonb
where user_id is null
  and name = 'Coin Bundle Template';
