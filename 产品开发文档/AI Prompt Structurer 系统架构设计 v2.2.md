# AI Prompt Structurer
## 系统架构设计

---

# 1 系统架构

Browser
↓
Next.js Frontend
↓
Next.js API Routes
↓
LLM Adapter
↓
External LLM
↓
Supabase

---

# 2 系统模块

Frontend

- Extract Page
- Model Settings
- Template Settings
- History Page

Backend

- Extraction Service
- Template Service
- Model Config Service
- LLM Adapter

---

# 3 LLM Adapter

接口：

extractStructuredData()

Provider：

- OpenAIAdapter
- AnthropicAdapter
- GeminiAdapter

---

# 4 JSON 修复模块

工具：

jsonrepair

流程：

模型输出  
↓  
尝试 JSON.parse  
↓  
失败 → jsonrepair  

---

# 5 Schema 校验

工具：

Zod

流程：

JSON  
↓  
Zod 校验  
↓  
字段缺失补空字符串  

---

# 6 模板渲染

函数：

renderTemplate()

逻辑：

{field_name} → 替换为字段值

---

# 7 加密模块

文件：

/utils/encryption.ts

算法：

AES-256-GCM

密钥：

process.env.ENCRYPTION_KEY

---

# 8 任务记录

保存：

raw_input  
template_snapshot  
raw_model_output  
final_prompt  

---

# 9 项目目录

/app
/api
/services
/utils
/database
/types