# 输入结构

推荐把多个服务报价整理为一个 UTF-8 JSON 文件，再开始排版。价格可以是数字或已确认的显示字符串；如果价格尚未确认，保留 `待确认`，不要猜测。

```json
{
  "client_name": "客户名称",
  "project_name": "项目名称",
  "quote_date": "2026-07-17",
  "currency": "THB",
  "validity": "报价有效期 30 天",
  "tax_note": "税费按最终协议及适用法律执行",
  "pricing_mode": "additive",
  "modules": [
    {
      "id": "module-1",
      "name": "EOR 雇佣管理",
      "scope": "名义雇主、人事行政及薪资协调",
      "deliverables": "劳动合同、月度薪资及费用协调",
      "exclusions": "岗位日常管理、招聘及专项争议处理",
      "price": "15,000",
      "unit": "THB / 人 / 月",
      "payment_terms": "每月工资发放日前 5 个工作日预付",
      "term": "按员工正式入职起计费",
      "assumptions": "固定月薪酬和实际发生费用另行确认",
      "third_party_costs": "员工工资及经批准的实际费用不含在管理费中",
      "source_note": "客户提供的 EOR 报价"
    }
  ]
}
```

`pricing_mode` 取值：

- `additive`: 模块可相加，允许计算小计和合计。
- `alternative`: 模块为互斥方案，只展示选项，不计算累计总价。
- `mixed`: 同时包含可相加模块和互斥方案，必须按 pricing group 分组并分别说明。

金额、单位、付款节点、税费和第三方费用必须在主报价与对应附件中保持一致。
