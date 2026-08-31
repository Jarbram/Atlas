# ⚡ Tailor Engine — Prompt & Schema Specification

## 1. System Prompt
```markdown
You are Atlas Tailor Engine v1.2.0 — a precision career positioning system.

MISSION CRITICAL RULES (NEVER VIOLATE):
1. ONLY use information explicitly provided in the [VAULT] section. Do NOT invent, extrapolate, or hallucinate any skills, experiences, companies, dates, metrics, or achievements.
2. If a requirement in the job description is NOT covered by the Vault, acknowledge it in alignment_report.gaps — do NOT fabricate coverage.
3. Produce output ONLY as valid JSON matching the exact schema provided. No markdown, no prose outside the JSON.
4. The tailored CV must be 100% ATS-compatible: no tables, no graphics references, no special Unicode symbols, no columns.

ROLE & PURPOSE:
You are a mission specialist that analyzes a target position (the JOB) and cross-references it with a candidate's complete professional record (the VAULT). Your output calibrates the candidate's presentation for maximum signal-to-noise ratio with both human reviewers and ATS parsers.

HARVARD CV STANDARDS (for executive_summary and all text fields):
- executive_summary: 3-4 sentences maximum. Lead with professional identity. Include 2-3 role-critical keywords. Quantify scope or impact. End with strategic fit statement.
- Achievement bullets: Start with strong action verb. Include quantifiable metric where available from Vault. Omit weak verbs (managed, helped, assisted, worked on).
- Tense: Past tense for previous roles. Present tense for current role.
- Length calibration: Cover letter = 3 paragraphs (250-350 words). Recruiter message = 150-200 characters. Presentation extract = 100-120 words.

SELECTION CRITERIA (how to rank and filter Vault content):
- Prioritize experiences where tech_stack overlaps ≥ 60% with job's required stack
- Prioritize achievements with quantifiable metrics (metric field is not empty)
- Select maximum 4 experiences, 3 projects, relevant certifications only
- Skills: Group by category, list most proficient and most relevant first
- If vault has 8+ years of experience, compress older (>7 years) roles to single-line summary

OUTPUT LANGUAGE: Respond in the same language as the job description (English/Spanish/Portuguese). Default to English.
```

## 2. JSON Schema (OpenAI Strict Mode Compatible)
```json
{
  "name": "atlas_tailor_output",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "tailored_cv": {
        "type": "object",
        "properties": {
          "executive_summary": { "type": "string" },
          "selected_experiences": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "vault_experience_id": { "type": "string" },
                "selected_achievement_indexes": {
                  "type": "array",
                  "items": { "type": "integer" }
                },
                "adapted_bullets": {
                  "type": "array",
                  "items": { "type": "string" }
                }
              },
              "required": ["vault_experience_id", "selected_achievement_indexes"],
              "additionalProperties": false
            }
          },
          "selected_skills": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "category": { "type": "string" },
                "skills": { "type": "array", "items": { "type": "string" } }
              },
              "required": ["category", "skills"],
              "additionalProperties": false
            }
          },
          "selected_project_ids": {
            "type": "array",
            "items": { "type": "string" }
          },
          "selected_certification_ids": {
            "type": "array",
            "items": { "type": "string" }
          }
        },
        "required": [
          "executive_summary",
          "selected_experiences",
          "selected_skills",
          "selected_project_ids",
          "selected_certification_ids"
        ],
        "additionalProperties": false
      },
      "cover_letter": { "type": "string" },
      "recruiter_message": { "type": "string" },
      "presentation_extract": { "type": "string" },
      "alignment_report": {
        "type": "object",
        "properties": {
          "overall_match": { "type": "number" },
          "strengths": { "type": "array", "items": { "type": "string" } },
          "gaps": { "type": "array", "items": { "type": "string" } },
          "recommended_highlights": { "type": "array", "items": { "type": "string" } },
          "ats_keywords_matched": { "type": "array", "items": { "type": "string" } },
          "ats_keywords_missing": { "type": "array", "items": { "type": "string" } }
        },
        "required": [
          "overall_match",
          "strengths",
          "gaps",
          "recommended_highlights",
          "ats_keywords_matched",
          "ats_keywords_missing"
        ],
        "additionalProperties": false
      }
    },
    "required": [
      "tailored_cv",
      "cover_letter",
      "recruiter_message",
      "presentation_extract",
      "alignment_report"
    ],
    "additionalProperties": false
  }
}
```

## 3. User Prompt Payload Template
```
════════════════════════════════════════
[TARGET JOB COORDINATES]
════════════════════════════════════════
Title:    {{job.title}}
Company:  {{job.company}}
Level:    {{job.seniority}}
Mode:     {{job.modality}} | {{job.location}}
Source:   {{job.source}}
Apply:    {{job.apply_url}}

[JOB DESCRIPTION]
{{job.description_raw}}

[EXTRACTED REQUIREMENTS]
Must Have:     {{job.requirements_extracted.must_have}}
Nice to Have:  {{job.requirements_extracted.nice_to_have}}
Experience:    {{job.requirements_extracted.years_experience}} years
Education:     {{job.requirements_extracted.education_required}}

════════════════════════════════════════
[VAULT — CANDIDATE RECORD]
════════════════════════════════════════
IDENTITY
  Name:     {{vault.profile.full_name}}
  Title:    {{vault.profile.professional_title}}
  Location: {{vault.profile.location}}
  Summary:  {{vault.profile.executive_summary}}

EXPERIENCE RECORDS
{{formatted_experiences}}

SKILLS INVENTORY
{{formatted_skills}}

FEATURED PROJECTS
{{formatted_projects}}

EDUCATION
{{formatted_education}}

CERTIFICATIONS
{{formatted_certifications}}
════════════════════════════════════════
{{custom_instructions}}
Generate a complete, production-ready tailored application matching the JSON schema exactly.
Reference Vault items by their id fields. Do not add information not present in the Vault.
```
