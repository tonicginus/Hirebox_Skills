# Input Schema

Provide one UTF-8 JSON object to the generator.

```json
{
  "client_name": "广西连用瑞得网络科技有限公司",
  "project_name": "仓库运营协调岗招聘",
  "position_title": "仓库运营协调员",
  "headcount": "1",
  "work_location": "Bangkok, Thailand",
  "key_requirements": "泰语沟通能力、仓储运营经验及跨团队协调能力。",
  "quotation_date": "2026-07-15",
  "salary_basis": {
    "type": "client_budget",
    "period": "monthly",
    "min_thb": 50000,
    "max_thb": 60000
  }
}
```

`salary_basis.type` must be `client_budget` or `market_research`. `period` must be `monthly` or `annual`; all values are THB.

For market pricing, add at least one source with a URL and retrieval date:

```json
"salary_basis": {
  "type": "market_research",
  "period": "annual",
  "min_thb": 720000,
  "max_thb": 900000,
  "market_sources": [
    {
      "name": "Thailand salary guide",
      "url": "https://example.com/salary-guide",
      "retrieved_date": "2026-07-15"
    }
  ]
}
```

`service_content` is optional. If omitted, the approved standard headhunting service scope is used. Do not use it to alter the quotation-standard appendix.
