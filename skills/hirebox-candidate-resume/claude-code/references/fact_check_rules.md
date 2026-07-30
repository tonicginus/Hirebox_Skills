# HireBox Resume Fact Check Rules

Use these rules when checking a generated HireBox candidate resume against the original resume.

## Pass Standard

A generated statement is acceptable only when it is:

- Directly present in the original resume.
- A concise merge of multiple original facts without changing meaning.
- A formatting normalization, such as `2025.07` to `2025/07`.
- A cautious label for an unclear fact, such as `待核验`.

## Unsupported Additions

Flag and revise:

- Degree level not stated, such as converting `university` to `本科`.
- Years of experience calculated from dates unless the resume clearly supports the range and the wording says `约`.
- Language ability beyond the original wording, such as turning `English typing` into `English communication`.
- Job seniority, team size, revenue, management scope, systems, or achievements not stated.
- Consultant opinions, fit judgments, recommendation scores, interview advice, or onboarding suggestions.

## Omissions

Flag omitted source facts unless intentionally excluded by the workflow:

- Contact information is intentionally excluded from the PDF but included in Word.
- Low-value decorative items may be omitted only if the user asked for a client-facing concise resume and the content is not a resume fact category. Hobbies, awards, certificates, training, and languages are resume facts and should be retained in an appropriate section.

## Expression Consistency

Prefer source wording when precision matters:

- `中文、泰文双母语` should not become merely `中泰双语` if the original says 双母语.
- `Online 电商方面` should not become `线上运营管理` unless stated.
- `会计、财务、人事、销售支持` should keep all listed functions if used as a position/scope label.

## Candidate Deliverable Wording Ban

Flag and revise any candidate-facing resume DOCX/PDF text that contains:

- `原简历`
- `原始简历`
- `基于原始简历`
- `未列明`
- `待补充`
- `基于原始简历提炼，去除重复描述，突出可转化价值`

Use outward-facing wording instead:

- Use `核心经历与能力概览` or omit the subtitle instead of process notes.
- Use `/` for absent fields in tables.
- If a missing field is not essential, omit it from the resume body and mention the uncertainty only in the check report.
- Use `待核验` only when the uncertainty itself must be shown in the candidate-facing resume.

## Report Format

Use:

1. 总体结论
2. 校验范围
3. 发现问题与修订
4. 已确认一致的关键事实
5. 有意排除/版本差异
6. 残余不确定项

If no issue remains, state that clearly.
