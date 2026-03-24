
---

```md
# AI Prompt Structurer
# Image Editing 模块 PRD 补充稿（V1）

版本：v1.0  
模块：Image Editing  
适用系统：AI Prompt Structurer  
技术栈：Next.js + Supabase + Photoroom API

---

# 1 模块目标

Image Editing 模块用于对 **Image Generation 模块生成的纪念币白底图**进行自动后处理，并生成商品展示图。

系统自动生成：

- Front Edited Image
- Back Edited Image

每次任务最终生成 **2 张商品图**。

---

# 2 模块架构位置

系统模块关系：

```

Text Extraction
↓
Prompt
↓
Image Generation
↓
Image Editing

```

Image Editing 是 **独立模块**。

系统页面：

```

/extract
/generate-image
/edit-image
/history
/settings

```

Image Editing 不修改 Text Extraction 与 Image Generation 的核心逻辑。

---

# 3 页面设计

页面路径：

```

/edit-image

```

页面入口：

## 入口1

从 `/generate-image` 页面点击：

```

Edit Image

```

跳转：

```

/edit-image?source=<image_generation_result_id>

```

---

## 入口2

用户直接访问：

```

/edit-image

```

页面默认展示：

最近生成成功的 `/generate-image` 结果列表。

并标注：

```

Edited
Not Edited

```

---

# 4 页面操作流程

用户流程：

```

1 打开 /edit-image
2 选择 source image
3 点击 Generate

```

系统执行：

```

split image
↓
trim white border
↓
validate image
↓
create edit task
↓
call photoroom
↓
generate front image
↓
generate back image
↓
upload storage
↓
save results

```

---

# 5 输入数据

来源：

```

image_generation_results

```

输入图片特征：

```

single image
white background
left = front
right = back

```

---

# 6 输出数据

生成：

```

Front Edited Image
Back Edited Image

```

规格：

```

ratio: 1:1
resolution: 1024x1024
format: PNG

```

---

# 7 图片前处理流程

## 7.1 Split Image

使用 **固定中线切分**。

```

width / 2

```

生成：

```

front_half
back_half

```

---

## 7.2 White Border Trim

对每个 half image：

执行白底检测。

白色判定：

```

R > 245
G > 245
B > 245

```

识别非白区域 bounding box。

裁剪：

```

bounding_box + 5% padding

```

生成：

```

front_source.png
back_source.png

```

---

## 7.3 质量校验

每个 source image 执行：

校验规则：

```

bounding box > min_size
object not empty
object not touching edges

```

失败则返回错误码。

---

# 8 错误码设计

## 预处理类

```

SPLIT_FAILED
TRIM_EMPTY
BOUNDING_BOX_TOO_SMALL
OBJECT_TOO_CLOSE_TO_EDGE
SOURCE_NOT_FOUND

```

---

## Provider 类

```

PHOTOROOM_REQUEST_FAILED
PHOTOROOM_TIMEOUT
PHOTOROOM_INVALID_RESPONSE

```

---

## 存储类

```

UPLOAD_FAILED
DB_WRITE_FAILED

```

前端展示：

```

error_code
human_readable_message

```

---

# 9 风格池

固定风格池：

```

luxury_wood
premium_giftbox
dark_luxury_stage
soft_studio_light
elegant_pedestal
premium_velvet

```

风格选择策略：

```

random

```

Front / Back：

```

随机抽取
允许相同

```

---

# 10 背景生成

使用：

**Photoroom Image Editing API**

能力：

- subject detection
- background generation
- subject reposition
- shadow generation
- resize

Photoroom API 可以自动识别主体并替换背景，适用于电商商品图生成。

---

# 11 构图规范

主体规则：

```

centered
no rotation
preserve coin design

```

尺寸控制：

```

subject fits target area
padding around subject

```

---

# 12 任务模型

任务结构：

```

edit_task
├─ front_job
└─ back_job

```

---

## 主任务

```

edit_tasks

```

表示一次编辑任务。

---

## 子任务

```

edit_jobs

```

两种：

```

front
back

```

---

# 13 状态设计

前端状态：

```

Processing
Partial Success
Completed
Failed

```

---

后端状态：

```

splitting
trimming
validating
editing_front
editing_back
uploading
partial_success
completed
failed

```

---

# 14 重试策略

支持：

```

retry front
retry back

```

重试方式：

```

same parameters
rerun provider call

```

---

# 15 Storage 结构

统一 storage path：

```

edit-tasks/{task_id}/

```

文件：

```

original.png
front_source.png
back_source.png
front_final.png
back_final.png

```

可选：

```

front_provider_raw.png
back_provider_raw.png

```

---

# 16 历史记录展示

`/history`

默认只展示：

```

Front Edited Image
Back Edited Image

```

中间产物只在：

```

admin
task detail

```

页面展示。

---

# 17 数据库表设计

## edit_tasks

```

id
source_image_id
status
created_at
updated_at

```

---

## edit_jobs

```

id
task_id
side (front/back)
style
status
error_code
image_url
created_at

```

---

# 18 API 设计

## 创建任务

```

POST /api/edit-image

```

body

```

{
source_image_id
}

```

返回

```

task_id

```

---

## 查询任务

```

GET /api/edit-image/{task_id}

```

返回

```

task_status
front_status
back_status
front_image
back_image

```

---

## 重试任务

```

POST /api/edit-image/{job_id}/retry

```

---

# 19 Next.js 目录结构

```

/app/edit-image/page.tsx

/app/api/edit-image/route.ts
/app/api/edit-image/[task_id]/route.ts
/app/api/edit-image/[job_id]/retry/route.ts

/lib/image-editing
split.ts
trim.ts
validate.ts
styles.ts

/lib/photoroom
client.ts
generate.ts

```

---

# 20 核心实现模块

需要实现：

```

split image
white trim
validation
style picker
photoroom adapter
task orchestration
retry logic

```

---

# 21 非目标

V1 不支持：

```

用户上传图片
主题背景生成
多图组合
双币合成图
风格自定义
provider切换

```

---

# 22 V1 成功标准

系统可以：

```

选择 source image
点击 generate
自动生成 front/back 商品图
支持单面失败重试

```

---

# 23 Codex 开发约束

开发时注意：

```

不要修改 Text Extraction
不要修改 Image Generation
Image Editing 是独立模块

```

---
```

---


