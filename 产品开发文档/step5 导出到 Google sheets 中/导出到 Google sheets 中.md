
---

# PRD：Export to Google Sheets（Matrixify 商品导出模块）

## 一、模块概述

本模块用于将系统中生成完成的 Shopify 商品数据导出为 **Matrixify Products 模板格式的 Google Sheets**，用于 Shopify 商品批量导入。

系统流程：

```
文本提取
↓
纪念币图片生成
↓
图片编辑
↓
营销文案生成
↓
Export to Google Sheets
↓
Matrixify 导入 Shopify
```

---

# 二、模块入口

新增页面：

```
/export-to-sheets
```

功能：

将用户选中的商品导出为 Matrixify 商品模板 Google Sheets。

---

# 三、用户操作流程

### Step 1

用户进入 Export 页面。

系统展示可导出的商品列表。

每个商品包含：

* Shopify Title
* Shopify Description
* Front Image
* Back Image
* 商品模板

用户可 **勾选多个商品**。

---

### Step 2

为商品选择 **数量模板**：

默认使用系统默认模板：

```
1PC
3PCS
5PCS
8PCS
10PCS
20PCS
30PCS
```

用户可逐个修改模板。

---

### Step 3

系统生成 **Matrixify 导出预览**。

预览内容：

* 每个商品
* 每个 Variant 行
* 完整 Matrixify 行结构

---

### Step 4

用户点击：

```
Confirm & Export
```

---

### Step 5

系统执行：

1 创建 Google Sheets
2 创建 `Products` sheet
3 写入 Matrixify 表头
4 写入商品行
5 设置 Google Sheets 公开访问权限
6 返回 Google Sheets URL

---

# 四、Google Sheets 规则

## 1 表名

```
shopify-products-YYYY-MM-DD-batch-001
```

示例：

```
shopify-products-2026-03-24-batch-001
```

同一天递增：

```
batch-001
batch-002
batch-003
```

---

## 2 权限

创建后自动设置：

```
anyone with link → viewer
```

---

## 3 返回结果

API 返回：

```
sheet_url
batch_id
exported_product_count
```

---

# 五、Google OAuth

需要用户授权：

Scopes：

```
Google Drive
Google Sheets
```

授权后系统可：

```
create spreadsheet
set sharing permission
append rows
```

---

# 六、Matrixify Products 结构

sheet 名称：

```
Products
```

每个商品写入 **多行**。

因为：

```
一个商品 = 多 Variant
```

---

# 七、Matrixify 字段

本版本导出字段：

```
Internal Product ID
Handle
Title
Body HTML
Vendor
Type
Tags
Status
Published
Option1 Name
Option1 Value
Variant SKU
Variant Price
Variant Compare At Price
Variant Inventory Tracker
Variant Inventory Qty
Image Src
Image Alt Text
```

---

# 八、字段映射规则

| Matrixify字段         | 来源                  |
| ------------------- | ------------------- |
| Internal Product ID | 系统生成随机ID            |
| Handle              | slug(shopify_title) |
| Title               | Shopify标题           |
| Body HTML           | Shopify详情           |
| Vendor              | Iconfylab           |
| Type                | 空                   |
| Tags                | 空                   |
| Status              | active              |
| Published           | TRUE                |

---

# 九、Body HTML 生成规则

系统中保存为：

```
纯文本
```

导出时转换为 HTML：

规则：

```
每段文字 → <p>
```

示例：

```
<p>Intro text</p>
```

---

## 插入图片规则

Shopify 文案中存在：

```
Front Design
Back Design
```

小标题。

系统识别：

```
Front → 插入 front image
Back → 插入 back image
```

示例：

```
<p>Front Design</p>
<img src="front_image_url">

<p>Back Design</p>
<img src="back_image_url">
```

---

# 十、图片规则

每个商品包含：

```
front image
back image
```

写入：

```
Image Src
```

格式：

```
front_url;back_url
```

---

## Image Alt Text

规则：

```
Image Alt Text = Shopify Title
```

---

# 十一、Handle 规则

Handle 来源：

```
slug(shopify_title)
```

示例：

```
Texas Independence Day Coin
↓
texas-independence-day-coin
```

---

## Handle 唯一处理

若重复：

```
slug + random suffix
```

示例：

```
texas-independence-day-coin-a3f
```

---

# 十二、Variant 规则

Option1 Name：

```
Quantity
```

---

## 默认数量模板

```
1PC
3PCS
5PCS
8PCS
10PCS
20PCS
30PCS
```

---

## SKU

SKU 不需要唯一。

示例：

```
1PC
3PCS
5PCS
```

---

# 十三、价格模板

模板包含：

| Quantity | Variant Price | Variant Compare At Price |
| -------- | ------------- | ------------------------ |
| 1PC      | 11.99         | 23.99                    |
| 3PCS     | 23.99         | 47.99                    |
| 5PCS     | 35.99         | 69.99                    |
| 8PCS     | 47.99         | 89.99                    |
| 10PCS    | 59.99         | 119.99                   |
| 20PCS    | 119.99        | 199.99                   |
| 30PCS    | 179.99        | 299.99                   |

---

# 十四、库存规则

需要库存管理。

写入字段：

```
Variant Inventory Tracker = shopify
Variant Inventory Qty
```

库存数量由模板定义。

---

# 十五、Supabase 图片要求

图片必须：

```
public url
direct access
```

示例：

```
https://cdn.example.com/images/coin_front.png
```

禁止：

```
signed url
```

---

# 十六、导出数据库结构

## 表：export_batches

```
id
user_id
sheet_id
sheet_url
batch_name
product_count
created_at
```

---

## 表：export_products

```
id
batch_id
export_product_id
handle
generate_result_id
edit_result_id
marketing_copy_id
created_at
```

---

# 十七、Internal Product ID

系统生成随机 ID：

```
uuid
```

写入：

```
Internal Product ID
```

用途：

```
系统追踪商品来源
```

---

# 十八、模板管理扩展

模板管理新增：

```
Quantity Template
```

模板包含：

```
quantity tiers
variant sku
price
compare price
inventory qty
```

系统默认模板：

```
Coin Bundle Template
```

---

# 十九、导出预览

导出前系统生成：

```
Matrixify Preview Table
```

用户可查看：

```
Products sheet
```

示例：

```
Handle | Title | Variant SKU | Price | Inventory
```

---

# 二十、API设计

## 获取导出商品

```
GET /api/export/products
```

返回：

```
product list
```

---

## 生成预览

```
POST /api/export/preview
```

输入：

```
product_ids
template_ids
```

返回：

```
matrixify rows
```

---

## 导出 Google Sheets

```
POST /api/export/google-sheets
```

输入：

```
product_ids
template_ids
```

返回：

```
sheet_url
batch_id
```

---

# 二十一、错误处理

可能错误：

```
google oauth expired
image url not public
handle duplicate
google api quota exceeded
```

系统需要返回明确错误信息。

---

# 二十二、未来扩展

后续可扩展：

```
Export CSV
Export Excel
Export Airtable
Export Shopify API
```

---

# 二十三、完成标准

模块完成需满足：

1 用户可选择多个商品
2 可选择数量模板
3 可预览 Matrixify 行
4 成功创建 Google Sheets
5 写入 Products sheet
6 返回公开 URL
7 Matrixify 可直接导入

---

