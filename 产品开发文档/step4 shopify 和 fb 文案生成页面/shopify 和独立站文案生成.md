

---

# AI 纪念币生成系统

## 产品需求文档（PRD）

版本：v1.0
状态：Final
用途：开发实现（Codex / 工程团队）

---

# 1 项目概述

## 1.1 项目目标

构建一套 AI 自动化商品生产系统，实现以下流程：

```
用户输入主题
→ AI 生成纪念币设计
→ AI 编辑生成商品展示图
→ AI 生成 Shopify 商品文案
→ AI 生成 Facebook 广告文案
```

系统最终自动生成完整商品资产：

* 商品设计图
* 商品展示图
* Shopify 商品 Listing
* Facebook 广告文案

---

# 2 系统模块结构

系统包含四个并列模块：

```
prompt-structurer
generate-image
edit-image
marketing-copy
```

模块说明：

| 模块   | 页面                   | 功能                       |
| ---- | -------------------- | ------------------------ |
| 文本解析 | `/prompt-structurer` | 用户输入主题文本                 |
| 图片生成 | `/generate-image`    | AI 生成纪念币设计               |
| 图片编辑 | `/edit-image`        | 生成商品展示图                  |
| 文案生成 | `/marketing-copy`    | 生成 Shopify + Facebook 文案 |

**注意：**

`marketing-copy` 是独立模块，不是 `edit-image` 子模块。

---

# 3 系统数据链路

系统数据结构：

```
source
  ↓
generate_task
  ↓
generate_results
  ↓
edit_results
  ↓
marketing_copy_versions
```

每一层的职责如下。

---

# 4 数据模型设计

---

# 4.1 source（主题源）

记录用户输入的主题信息。

例如：

```
节日名称
节日背景
纪念意义
口号
象征元素
重要人物
```

示例：

```
Veterans Day
Honor American veterans
Symbol: Eagle, US flag
Slogan: Thank you for your service
```

关系：

```
source 1 → N generate_tasks
```

---

# 4.2 generate_task（生成任务）

生成任务容器。

一个 source 可以创建多个生成任务。

例如：

```
source: Veterans Day

generate_task_A
generate_task_B
generate_task_C
```

用途：

用于尝试不同设计方向。

关系：

```
generate_task 1 → N generate_results
```

---

# 4.3 generate_results（设计版本）

具体生成结果。

每条 generate_result 表示：

```
一张 AI 生成的纪念币设计图
```

特点：

* 包含正反面
* 设计版本可能不同
* 用户可多次生成

示例：

```
generate_task_A
 ├ result_1
 ├ result_2
 └ result_3
```

字段示例：

```
id
generate_task_id
image_url
prompt
created_at
```

---

# 4.4 edit_results（展示图）

商品展示图。

基于某个 `generate_result` 生成。

编辑内容：

```
拆分正反面
裁剪 coin
替换背景
生成商品展示图
```

关系：

```
edit_results → generate_result_id
```

字段：

```
id
generate_result_id
side (front | back)
image_url
style
created_at
```

一个 generate_result 可能生成多个展示图版本：

```
generate_result_1
 ├ front_v1
 ├ back_v1
 ├ front_v2
 └ back_v2
```

---

# 5 marketing-copy 模块

模块名称：

```
marketing-copy
```

页面：

```
/marketing-copy
```

模块作用：

生成：

```
Shopify 商品文案
Facebook 广告文案
```

---

# 6 文案素材组合定义

文案生成绑定的是一组素材组合：

```
generate_result_id
+
front_edit_result_id
+
back_edit_result_id
```

这三者共同定义一个 **文案素材组合**。

---

# 7 页面进入逻辑

进入路径：

```
edit-image 页面
→ 点击 Generate Marketing Copy
→ 打开 /marketing-copy
```

进入时：

```
锁定 generate_result_id
```

---

# 7.1 进入条件

当前 `generate_result` 必须满足：

```
至少 1 张 front 图
至少 1 张 back 图
```

否则：

```
禁止进入 marketing-copy
```

并提示用户先生成缺失图片。

---

# 8 图片选择逻辑

用户需要选择：

```
front_edit_result_id
back_edit_result_id
```

规则：

```
必须来自同一个 generate_result
```

如果更换任意图片：

```
视为新的素材组合
```

需要重新生成文案。

---

# 9 AI 文案生成输入

AI 输入包括：

## 1 用户原始文本

来自：

```
source
```

仅传原始文本，不传结构化数据。

---

## 2 图片

只传两张图片：

```
front image
back image
```

不传设计阶段原图。

---

## 3 文案模板

模板控制：

```
语气
长度
强调点
```

---

## 4 用户补充要求

页面提供可选输入框。

示例：

```
强调礼品属性
强调收藏价值
偏广告风格
```

---

# 10 文案模板系统

模板存储于数据库。

固定四种：

```
庄重纪念型
情感礼品型
历史收藏型
广告转化型
```

字段：

```
id
name
tone
length
emphasis
enabled
sort_order
```

---

# 11 文案输出结构

生成内容包含：

```
Shopify
+
Facebook
```

---

# 11.1 Shopify

字段：

```
title
subtitle
selling_points
description
```

selling_points：

```
固定 4 条
```

---

# 11.2 Shopify description 结构

必须包含小标题：

```
Overview
Front Design
Back Design
Why This Coin Stands Out
```

并允许使用 emoji。

---

# 11.3 Facebook

字段：

```
primary_text
headline
description
cta_suggestion
```

CTA：

```
自由生成
```

---

# 12 多语言结构

所有文本字段结构：

```
{
  "en": "...",
  "cn": "..."
}
```

中英文分别生成。

不允许混排。

---

# 13 前端展示结构

页面分为四个区域：

```
Shopify EN
Shopify CN
Facebook EN
Facebook CN
```

每个区域内部按字段拆分编辑框。

示例：

```
Shopify EN
  title
  subtitle
  selling_points
  description
```

这样支持未来：

```
按字段导出文本
```

---

# 14 文案版本系统

表：

```
marketing_copy_versions
```

每次生成都会创建新版本。

---

# 14.1 Draft 与 Final

生成结果：

```
draft_result_json
```

用户编辑后保存：

```
final_result_json
```

---

# 15 confirmed 状态规则

confirmed 的唯一范围：

```
generate_result_id
+
front_edit_result_id
+
back_edit_result_id
```

规则：

```
同一素材组合
只能有一个 confirmed
```

---

# 15.1 confirmed 更新规则

如果确认新版本：

```
旧 confirmed 自动取消
```

---

# 15.2 confirmed 后仍可生成

confirmed 不锁定生成。

用户仍然可以继续生成新版本。

---

# 16 默认图片选择

进入页面时自动选择：

```
最近 front 图
最近 back 图
```

用户可以手动更换。

---

# 17 图片存储策略

不保存图片 URL 快照。

只存：

```
edit_result_id
```

需要时通过 id 查询图片。

---

# 18 marketing_copy_versions 表字段

建议字段：

```
id

source_id
generate_task_id
generate_result_id

front_edit_result_id
back_edit_result_id

template_id
user_instruction

draft_result_json
final_result_json

is_confirmed

created_at
updated_at
```

---

# 19 系统核心原则

1. 文案必须与具体图片版本绑定
2. 每次生成必须保存版本
3. 同一素材组合只允许一个 confirmed
4. confirmed 后仍允许生成新版本
5. 图片与文案关系必须可追溯

---

# 20 最终系统目标

系统自动生成完整商品资产：

```
主题
→ 商品设计
→ 商品展示图
→ Shopify 商品文案
→ Facebook 广告文案
```

最终用于：

```
电商商品上架
广告投放
```

---

