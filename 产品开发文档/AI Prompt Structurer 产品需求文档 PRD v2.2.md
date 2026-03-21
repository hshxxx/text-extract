# AI Prompt Structurer
## 产品需求文档 PRD v2.2

---

# 1 产品目标

允许用户输入自然语言文本，系统调用大模型解析文本并提取结构化字段，再根据用户自定义模板生成标准化输出。

核心能力：

- 文本解析
- 模型配置
- 模板管理
- JSON 修复
- Schema 校验
- 模板渲染
- 历史记录

---

# 2 用户流程

用户输入文本  
↓  
选择模型配置  
↓  
选择模板  
↓  
点击生成  
↓  
系统调用 LLM  
↓  
JSON 修复  
↓  
Schema 校验  
↓  
模板渲染  
↓  
展示结果  
↓  
保存历史  

---

# 3 页面结构

/extract  
/settings/models  
/settings/templates  
/history  

---

# 4 文本解析页面

组件：

- 文本输入框
- 模型选择
- 模板选择
- 生成按钮
- 结构化字段展示
- 最终 Prompt 展示

输入限制：

4000 字符

---

# 5 模型配置系统

路径：

/settings/models

字段：

- name
- provider
- model
- api_key
- base_url

支持 Provider：

- OpenAI
- Anthropic
- Gemini

---

# 6 API Key 校验

保存配置前必须执行测试连接。

流程：

用户提交配置  
↓  
调用模型测试 API  
↓  
成功 → 保存  
失败 → 拒绝保存  

---

# 7 模板管理系统

路径：

/settings/templates

模板示例：

设计一款主题的纪念币  
正面元素：  
文案：

功能：

- 创建模板
- 编辑模板
- 删除模板
- 设置默认模板
- 模板预览

---

# 8 模板变量校验

保存模板时：

提取占位符  
↓  
与 schema 字段比对  
↓  
发现未知字段 → 禁止保存  

---

# 9 JSON Schema

{
 theme_cn
 theme_en
 coin_front_element
 coin_front_text
 coin_back_element
 coin_back_text
 style_requirements
}

校验工具：

Zod

---

# 10 JSON 修复机制

模型输出  
↓  
JSON.parse  
↓  
失败  
↓  
jsonrepair 修复  
↓  
再次 parse  

---

# 11 字段缺失处理

缺失字段：

统一补空字符串

---

# 12 模板快照

生成任务时保存：

template_snapshot

用于历史记录还原。

---

# 13 AI 调用策略

超时：

30 秒

重试：

3 次

间隔：

1s / 2s / 4s

---

# 14 Rate Limit

每用户：

10 请求 / 分钟

---

# 15 MVP 功能

实现：

- 模型配置
- 模板管理
- 文本解析
- JSON 修复
- Schema 校验
- 历史记录

不实现：

- 文件批量解析
- 图片生成
- RAG
- 队列系统