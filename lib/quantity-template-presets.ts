import type { QuantityTemplateTier } from "@/lib/types/domain";

export const DEFAULT_QUANTITY_TEMPLATE_TIERS: QuantityTemplateTier[] = [
  {
    optionName: "Quantity",
    optionValue: "1PC",
    variantSku: "1PC",
    price: 11.99,
    compareAtPrice: 23.99,
    inventoryQty: 100,
  },
  {
    optionName: "Quantity",
    optionValue: "Buy 2 Get 1 Free(3PCS) -Hot Sale🔥",
    variantSku: "3PCS",
    price: 23.99,
    compareAtPrice: 47.99,
    inventoryQty: 100,
  },
  {
    optionName: "Quantity",
    optionValue: "Buy 3 Get 2 Free(5PCS) -Most Popular🔥",
    variantSku: "5PCS",
    price: 35.99,
    compareAtPrice: 69.99,
    inventoryQty: 100,
  },
  {
    optionName: "Quantity",
    optionValue: "Buy 4 Get 4 Free(8PCS) -Free Shipping",
    variantSku: "8PCS",
    price: 47.99,
    compareAtPrice: 89.99,
    inventoryQty: 100,
  },
  {
    optionName: "Quantity",
    optionValue: "Buy 5 Get 5 Free(10PCS)-Free Shipping",
    variantSku: "10PCS",
    price: 59.99,
    compareAtPrice: 119.99,
    inventoryQty: 100,
  },
  {
    optionName: "Quantity",
    optionValue: "Buy 10 Get 10 Free(20PCS)-Free Shipping",
    variantSku: "20PCS",
    price: 119.99,
    compareAtPrice: 199.99,
    inventoryQty: 100,
  },
  {
    optionName: "Quantity",
    optionValue: "Buy 15 Get 15 Free(30PCS)-Free Shipping",
    variantSku: "30PCS",
    price: 179.99,
    compareAtPrice: 299.99,
    inventoryQty: 100,
  },
];

export function cloneQuantityTemplateTiers(tiers: QuantityTemplateTier[]) {
  return tiers.map((item) => ({ ...item }));
}
