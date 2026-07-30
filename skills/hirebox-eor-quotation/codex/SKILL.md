---
name: hirebox-eor-quotation
description: "Create bilingual Hirebox EOR service quotation DOCX and PDF files from the retained reference. Use when the user requests an employment-management/EOR quotation, submits client position information, or explicitly invokes $hirebox-eor-quotation. Collect the required client and position fields, calculate 15% x F and all deposit bands, and return both Word and PDF outputs."
---

# Hirebox EOR 报价单

根据客户岗位信息生成中英双语 Hirebox 雇佣管理 EOR 服务报价单，同时交付 Word 和 PDF。保留 reference.docx 的品牌、页面、表格、页眉和页尾。

## 输入字段

必填：客户名称、岗位名称、雇佣人数、工作地点、固定月薪酬 F（THB）、报价日期（YYYY-MM-DD）。

选填：项目名称、输出文件名。未提供项目名称时，使用“岗位名称 + EOR 雇佣管理项目”。

只询问缺失的必填字段；不得虚构客户信息、岗位信息、薪酬或日期。

## 生成流程

1. 读取 `artifact-template.json`，确认保留的模板为 `assets/reference.docx`。
2. 加载工作区依赖，使用其 Python 运行时，不使用系统 Python。
3. 运行 `scripts/generate_eor_quote.py`，明确传入 `--template assets/reference.docx`、全部输入字段和输出目录。
4. 生成器自动计算：月度管理费 `15% x F`，以及 `2 / 3 / 5 / 8 / 10 / 12 / 16 x F` 保证金金额。
5. 必须同时生成同名 `.docx` 与 `.pdf`；任一失败即不得宣称完成。
6. 重新打开 DOCX，核对客户、岗位、人数、地点、固定月薪、报价日期、管理费和保证金金额；确认无 `【填写】` 占位符。
7. 渲染并检查 PDF 全部页面，确认无空白页、裁切、重叠、断裂表格或缺失页眉页尾。
8. 删除预览、LibreOffice 用户配置、测试输出和其他中间文件，仅保留用户要求的最终 Word 与 PDF。

## 版式与内容边界

- 不从空白文档重建；始终克隆保留的 reference.docx。
- 保留 HireBox Logo、公司名称、地址与邮箱页尾，不添加电话号码。
- 保留 `15% x F` 管理费、工龄保证金档位、按实结算、税费和服务边界。
- 不复用其他客户、岗位、价格、日期或旧文档元数据。
- 根据实际内容自然续页；不得留下仅有签署日期或标题的空白页。
