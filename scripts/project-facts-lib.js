const fs = require('fs');
const path = require('path');
const { z } = require('zod');

const EvidenceStatus = z.enum(['verified', 'estimated', 'inferred', 'unverified']);
const NonEmptyString = z.string().trim().min(1);

const ProjectFactsSchema = z.object({
  schema_version: z.literal('1.0'),
  project: z.object({
    id: NonEmptyString,
    name: NonEmptyString,
    brand_name: z.string().default(''),
    product_name: z.string().default(''),
    hero_sku: z.string().default(''),
    category: z.string().default(''),
    market: z.string().default(''),
    country_code: z.string().default(''),
    currency: z.string().default('USD'),
    target_audience: z.array(z.string()).default([]),
    objectives: z.array(z.string()).default([]),
    channels: z.array(z.string()).default([]),
    budget: z.object({
      amount: z.number().nonnegative().nullable().default(null),
      period: z.string().default(''),
      currency: z.string().default('USD')
    }).default({ amount: null, period: '', currency: 'USD' }),
    timeline: z.object({
      start_date: z.string().default(''),
      end_date: z.string().default(''),
      horizon_days: z.number().int().positive().nullable().default(null)
    }).default({ start_date: '', end_date: '', horizon_days: null })
  }),
  inputs: z.object({
    urls: z.array(z.object({
      type: NonEmptyString,
      url: z.string().url(),
      label: z.string().default('')
    })).default([]),
    user_materials: z.array(z.object({
      path: NonEmptyString,
      label: z.string().default(''),
      received_at: z.string().default('')
    })).default([])
  }).default({ urls: [], user_materials: [] }),
  entities: z.object({
    products: z.array(z.record(z.string(), z.unknown())).default([]),
    sellers: z.array(z.record(z.string(), z.unknown())).default([]),
    competitors: z.array(z.record(z.string(), z.unknown())).default([]),
    creators: z.array(z.record(z.string(), z.unknown())).default([]),
    videos: z.array(z.record(z.string(), z.unknown())).default([])
  }).default({
    products: [],
    sellers: [],
    competitors: [],
    creators: [],
    videos: []
  }),
  evidence: z.array(z.object({
    id: NonEmptyString,
    type: NonEmptyString,
    source_name: NonEmptyString,
    source_url: z.string().default(''),
    retrieved_at: NonEmptyString,
    status: EvidenceStatus,
    entity_refs: z.array(z.string()).default([]),
    fields: z.array(z.string()).default([]),
    note: z.string().default('')
  })).default([]),
  facts: z.array(z.object({
    id: NonEmptyString,
    topic: NonEmptyString,
    metric: NonEmptyString,
    value: z.unknown(),
    unit: z.string().default(''),
    period: z.string().default(''),
    entity_ref: z.string().default(''),
    evidence_ids: z.array(z.string()).default([]),
    status: EvidenceStatus,
    note: z.string().default('')
  })).default([]),
  screenshots: z.array(z.object({
    id: NonEmptyString,
    path: NonEmptyString,
    page_url: z.string().default(''),
    captured_at: NonEmptyString,
    entity_ref: z.string().default(''),
    evidence_id: z.string().default(''),
    caption: z.string().default('')
  })).default([]),
  assumptions: z.array(z.object({
    id: NonEmptyString,
    statement: NonEmptyString,
    basis: NonEmptyString,
    impact: z.enum(['low', 'medium', 'high']).default('medium')
  })).default([]),
  gaps: z.array(z.object({
    id: NonEmptyString,
    field: NonEmptyString,
    reason: NonEmptyString,
    blocking_skills: z.array(z.string()).default([])
  })).default([]),
  workflow: z.object({
    current_stage: z.string().default('intake'),
    completed_stages: z.array(z.string()).default([]),
    last_gate: z.object({
      skill: z.string().default(''),
      passed: z.boolean().default(false),
      checked_at: z.string().default('')
    }).default({ skill: '', passed: false, checked_at: '' })
  }).default({
    current_stage: 'intake',
    completed_stages: [],
    last_gate: { skill: '', passed: false, checked_at: '' }
  }),
  generated_at: NonEmptyString,
  updated_at: NonEmptyString
}).strict();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function slugify(value) {
  const slug = String(value || 'project')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'project';
}

function compactStrings(values) {
  return [...new Set(values.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))];
}

function mergeArrays(base, patch) {
  if ([...base, ...patch].every(item => typeof item === 'string')) {
    return [...new Set([...base, ...patch])];
  }
  if ([...base, ...patch].every(item => item && typeof item === 'object' && typeof item.id === 'string')) {
    const byId = new Map(base.map(item => [item.id, item]));
    for (const item of patch) {
      byId.set(item.id, byId.has(item.id) ? deepMerge(byId.get(item.id), item) : item);
    }
    return [...byId.values()];
  }
  return [...base, ...patch];
}

function deepMerge(base, patch) {
  if (patch === undefined) return base;
  if (Array.isArray(base) && Array.isArray(patch)) return mergeArrays(base, patch);
  if (base && patch && typeof base === 'object' && typeof patch === 'object' && !Array.isArray(patch)) {
    const result = { ...base };
    for (const [key, value] of Object.entries(patch)) {
      result[key] = key in base ? deepMerge(base[key], value) : value;
    }
    return result;
  }
  return patch;
}

function mergeFacts(base, patch) {
  const merged = deepMerge(base, patch);
  merged.schema_version = base.schema_version;
  merged.generated_at = base.generated_at;
  merged.updated_at = new Date().toISOString();
  return merged;
}

function urlInputsFromIntake(intake) {
  const urlFields = [
    ['amazon_product', intake.amazon_product_url],
    ['amazon_store', intake.amazon_store_url],
    ['tiktok_shop', intake.tiktok_shop_url],
    ['standalone_site', intake.standalone_site_url],
    ['website', intake.website_url]
  ];
  return urlFields
    .filter(([, url]) => typeof url === 'string' && url.trim())
    .map(([type, url]) => ({ type, url: url.trim(), label: '' }));
}

function createFactsFromIntake(intake = {}, overrides = {}) {
  const now = new Date().toISOString();
  const brandName = overrides.brand_name || intake.brand_name || '';
  const productName = overrides.product_name || intake.product_name || intake.hero_sku || '';
  const projectName = overrides.name || [brandName, productName].filter(Boolean).join(' ') || 'Marketing Project';
  const projectId = overrides.id || slugify(projectName);
  const objectives = compactStrings([
    ...(Array.isArray(intake.objectives) ? intake.objectives : []),
    intake.annual_gmv_target_usd ? `annual_gmv_target_usd:${intake.annual_gmv_target_usd}` : ''
  ]);

  return {
    schema_version: '1.0',
    project: {
      id: projectId,
      name: projectName,
      brand_name: brandName,
      product_name: productName,
      hero_sku: intake.hero_sku || '',
      category: intake.category || '',
      market: intake.region || intake.target_market || '',
      country_code: String(intake.region || intake.target_market || '').toLowerCase(),
      currency: intake.currency || 'USD',
      target_audience: compactStrings(Array.isArray(intake.target_audience) ? intake.target_audience : []),
      objectives,
      channels: compactStrings(Array.isArray(intake.platforms) ? intake.platforms : []),
      budget: {
        amount: Number.isFinite(Number(intake.monthly_ad_budget_usd)) && intake.monthly_ad_budget_usd !== ''
          ? Number(intake.monthly_ad_budget_usd)
          : null,
        period: intake.monthly_ad_budget_usd !== '' && intake.monthly_ad_budget_usd != null ? 'monthly' : '',
        currency: intake.currency || 'USD'
      },
      timeline: {
        start_date: intake.launch_month || '',
        end_date: '',
        horizon_days: Number.isInteger(Number(intake.plan_horizon_days))
          ? Number(intake.plan_horizon_days)
          : null
      }
    },
    inputs: {
      urls: urlInputsFromIntake(intake),
      user_materials: []
    },
    entities: {
      products: [],
      sellers: [],
      competitors: [],
      creators: [],
      videos: []
    },
    evidence: [],
    facts: [],
    screenshots: [],
    assumptions: [],
    gaps: [],
    workflow: {
      current_stage: 'intake',
      completed_stages: ['intake'],
      last_gate: { skill: '', passed: false, checked_at: '' }
    },
    generated_at: now,
    updated_at: now
  };
}

function validateFacts(value) {
  const parsed = ProjectFactsSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    };
  }

  const errors = [];
  const forbiddenKey = /(^|_)(api_?key|secret|access_?token|refresh_?token|cookie|password|authorization)($|_)/i;
  const secretValue = /(sk_live_[a-z0-9_-]{8,}|[?&]api_key=[^&\s]+|bearer\s+[a-z0-9._-]{12,})/i;
  function scanSecrets(node, currentPath = '') {
    if (Array.isArray(node)) {
      node.forEach((item, index) => scanSecrets(item, `${currentPath}[${index}]`));
      return;
    }
    if (!node || typeof node !== 'object') {
      if (typeof node === 'string' && secretValue.test(node)) {
        errors.push({ path: currentPath, message: '疑似包含凭证；Project Facts 禁止保存 API Key/token' });
      }
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      const childPath = currentPath ? `${currentPath}.${key}` : key;
      if (forbiddenKey.test(key)) {
        errors.push({ path: childPath, message: '禁止的凭证字段；请仅保存在本机安全配置中' });
      }
      scanSecrets(child, childPath);
    }
  }
  scanSecrets(parsed.data);

  const evidenceIds = new Set(parsed.data.evidence.map(item => item.id));
  const duplicateEvidence = parsed.data.evidence
    .map(item => item.id)
    .filter((id, index, all) => all.indexOf(id) !== index);
  const duplicateFacts = parsed.data.facts
    .map(item => item.id)
    .filter((id, index, all) => all.indexOf(id) !== index);

  for (const id of duplicateEvidence) errors.push({ path: 'evidence', message: `重复 evidence id: ${id}` });
  for (const id of duplicateFacts) errors.push({ path: 'facts', message: `重复 fact id: ${id}` });
  for (const fact of parsed.data.facts) {
    for (const evidenceId of fact.evidence_ids) {
      if (!evidenceIds.has(evidenceId)) {
        errors.push({ path: `facts.${fact.id}.evidence_ids`, message: `引用不存在的 evidence: ${evidenceId}` });
      }
    }
    if (fact.status === 'verified' && fact.evidence_ids.length === 0) {
      errors.push({ path: `facts.${fact.id}`, message: 'verified fact 必须引用至少一条 evidence' });
    }
  }

  return { ok: errors.length === 0, errors, data: parsed.data };
}

function getValueByPath(value, fieldPath) {
  return fieldPath.split('.').reduce((current, key) => current?.[key], value);
}

function isPresent(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined;
}

function countTopicFacts(facts, topics) {
  return facts.filter(fact => topics.includes(fact.topic)).length;
}

function runGate(facts, skill, gatesConfig) {
  const gate = gatesConfig.skills[skill] || gatesConfig.skills.default;
  if (!gate) throw new Error(`未配置 skill gate: ${skill}`);

  const blockers = [];
  const warnings = [];
  for (const fieldPath of gate.required_fields || []) {
    if (!isPresent(getValueByPath(facts, fieldPath))) blockers.push(`缺少字段: ${fieldPath}`);
  }
  for (const fieldPath of gate.recommended_fields || []) {
    if (!isPresent(getValueByPath(facts, fieldPath))) warnings.push(`建议补充字段: ${fieldPath}`);
  }
  for (const requirement of gate.required_url_types || []) {
    const actual = facts.inputs.urls.filter(item => requirement.any_of.includes(item.type)).length;
    if (actual < (requirement.minimum || 1)) {
      blockers.push(`URL 类型需包含 ${requirement.any_of.join('/')}，至少 ${requirement.minimum || 1} 条`);
    }
  }
  for (const [entity, minimum] of Object.entries(gate.minimum_entities || {})) {
    const actual = facts.entities?.[entity]?.length || 0;
    if (actual < minimum) blockers.push(`${entity} 至少需要 ${minimum} 条，当前 ${actual} 条`);
  }
  for (const [entity, minimum] of Object.entries(gate.recommended_entities || {})) {
    const actual = facts.entities?.[entity]?.length || 0;
    if (actual < minimum) warnings.push(`${entity} 建议至少 ${minimum} 条，当前 ${actual} 条`);
  }
  if (gate.minimum_evidence && facts.evidence.length < gate.minimum_evidence) {
    blockers.push(`evidence 至少需要 ${gate.minimum_evidence} 条，当前 ${facts.evidence.length} 条`);
  }
  if (gate.minimum_screenshots && facts.screenshots.length < gate.minimum_screenshots) {
    blockers.push(`screenshots 至少需要 ${gate.minimum_screenshots} 张，当前 ${facts.screenshots.length} 张`);
  }
  for (const requirement of gate.required_fact_topics || []) {
    const actual = countTopicFacts(facts.facts, requirement.any_of);
    if (actual < (requirement.minimum || 1)) {
      blockers.push(`facts topic 需包含 ${requirement.any_of.join('/')}，至少 ${requirement.minimum || 1} 条`);
    }
  }

  return {
    skill,
    passed: blockers.length === 0,
    blockers,
    warnings,
    checked_at: new Date().toISOString()
  };
}

module.exports = {
  ProjectFactsSchema,
  createFactsFromIntake,
  mergeFacts,
  readJson,
  runGate,
  validateFacts,
  writeJson
};
