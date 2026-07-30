# Report Builder Schema

Use this reference only when creating a JSON payload for `scripts/report_builder.py`.

## Top-Level Shape

```json
{
  "output_path": "C:/path/report.docx",
  "pdf_output_path": "C:/path/report.pdf",
  "logo_path": "C:/optional/custom/logo.png",
  "cover": {
    "title": "人才推荐报告",
    "subtitle": "Candidate Recommendation Report",
    "role": "推荐岗位：高级业务合伙人（财税/审计/咨询方向）",
    "candidate": "候选人：鲜力鸿 | 推荐方：海钡人力 HIREBOX CO., LTD.",
    "rows": [
      ["客户公司", "中鑫财税集团"],
      ["报告日期", "2026-06-04"]
    ]
  },
  "score_cards": [
    ["综合推荐度", "88/100"],
    ["审计/税务", "高"]
  ],
  "sections": [
    {
      "title": "一、顾问推荐结论",
      "subtitle": "可选副标题",
      "paragraphs": [
        {"text": "正文", "bold": false},
        {"text": "重点判断", "bold": true, "color": "1B114C"}
      ]
    },
    {
      "title": "二、候选人概览",
      "table": {
        "type": "kv",
        "rows": [["姓名/性别", "鲜力鸿 / 女"]]
      }
    },
    {
      "title": "四、岗位匹配度矩阵",
      "table": {
        "type": "matrix",
        "headers": ["岗位关键要求", "匹配判断", "事实依据与顾问判断"],
        "rows": [
          ["8年以上经验", "高度匹配", "约20年相关经验。"]
        ]
      }
    },
    {
      "title": "五、核心推荐理由",
      "bullets": ["岗位需要X；候选人在Y场景中做过Z。"]
    }
  ],
  "footer": "Hirebox 海钡人力 | Confidential Candidate Recommendation Report"
}
```

If `pdf_output_path` is omitted, the builder exports a PDF beside `output_path` using the same basename. If `logo_path` is omitted, the builder uses the fixed skill asset `assets/HIREBOX_LOGO_PNG.png`.

The fixed Hirebox logo is placed only in the page header. It is not rendered as a large cover/body logo.

Do not include candidate contact information in any payload field. Candidate phone, email, WeChat, Line, address, and other direct contact fields are sanitized by the builder, but the payload should avoid them at source.

## Section Fields

Each section can contain any combination of:

- `paragraphs`: list of paragraph objects or plain strings.
- `bullets`: list of bullet strings.
- `table`: one table object.

Supported table types:

- `kv`: two-column key/value table.
- `matrix`: multi-column table with colored match judgments.

## Paragraph Object

```json
{"text": "paragraph text", "bold": true, "color": "1B114C"}
```

`color` is optional and must be a six-character RGB hex string without `#`.
