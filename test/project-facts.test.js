const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  createFactsFromIntake,
  mergeFacts,
  readJson,
  runGate,
  validateFacts,
  writeJson
} = require('../scripts/project-facts-lib');

const root = path.resolve(__dirname, '..');
const gates = readJson(path.join(root, 'templates', 'config', 'fact-gates.json'));

function testCreateAndValidate() {
  const facts = createFactsFromIntake({
    brand_name: 'Demo',
    hero_sku: 'Bottle',
    category: 'Home Supplies',
    region: 'US',
    plan_horizon_days: 90,
    website_url: 'https://example.com'
  });
  const result = validateFacts(facts);
  assert.equal(result.ok, true);
  assert.equal(result.data.project.brand_name, 'Demo');
  assert.equal(result.data.inputs.urls.length, 1);
}

function testVerifiedFactRequiresEvidence() {
  const facts = createFactsFromIntake({ brand_name: 'Demo' });
  facts.facts.push({
    id: 'fact-1',
    topic: 'sales',
    metric: 'sold_30d',
    value: 100,
    unit: 'units',
    period: '30d',
    entity_ref: '',
    evidence_ids: [],
    status: 'verified',
    note: ''
  });
  const result = validateFacts(facts);
  assert.equal(result.ok, false);
  assert.match(result.errors[0].message, /evidence/);
}

function testRejectsSecrets() {
  const facts = createFactsFromIntake({ brand_name: 'Demo' });
  facts.evidence.push({
    id: 'ev-secret',
    type: 'mcp',
    source_name: 'bad source',
    source_url: 'https://example.com/mcp?api_key=sk_live_should_not_be_here',
    retrieved_at: new Date().toISOString(),
    status: 'unverified',
    entity_refs: [],
    fields: [],
    note: ''
  });
  const result = validateFacts(facts);
  assert.equal(result.ok, false);
  assert(result.errors.some(error => error.message.includes('凭证')));
}

function testGateBlocksMissingData() {
  const facts = createFactsFromIntake({
    brand_name: 'Demo',
    hero_sku: 'Bottle',
    category: 'Home Supplies',
    region: 'US',
    plan_horizon_days: 90
  });
  facts.project.objectives = ['90 day growth'];
  const result = runGate(facts, 'tts-full-case', gates);
  assert.equal(result.passed, false);
  assert(result.blockers.some(item => item.includes('competitors')));
  assert(result.blockers.some(item => item.includes('screenshots')));
}

function testGatePassesAuditWithWebsiteEvidence() {
  const facts = createFactsFromIntake({
    brand_name: 'Demo',
    website_url: 'https://example.com'
  });
  facts.evidence.push({
    id: 'ev-web-1',
    type: 'web',
    source_name: 'Example homepage',
    source_url: 'https://example.com',
    retrieved_at: new Date().toISOString(),
    status: 'verified',
    entity_refs: [],
    fields: ['title', 'copy'],
    note: ''
  });
  const result = runGate(facts, 'market-audit', gates);
  assert.equal(result.passed, true);
}

function testSeoGateRejectsNonWebsiteUrl() {
  const facts = createFactsFromIntake({
    brand_name: 'Demo',
    tiktok_shop_url: 'https://shop.tiktok.com/view/product/1'
  });
  facts.evidence.push({
    id: 'ev-shop-1',
    type: 'web',
    source_name: 'TikTok Shop',
    source_url: 'https://shop.tiktok.com/view/product/1',
    retrieved_at: new Date().toISOString(),
    status: 'verified',
    entity_refs: [],
    fields: ['title'],
    note: ''
  });
  const result = runGate(facts, 'market-seo', gates);
  assert.equal(result.passed, false);
  assert(result.blockers.some(item => item.includes('website/standalone_site')));
}

function testRoundTrip() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-facts-'));
  const filePath = path.join(tempDir, 'facts.json');
  const facts = createFactsFromIntake({ brand_name: 'Demo' });
  writeJson(filePath, facts);
  assert.equal(readJson(filePath).schema_version, '1.0');
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function testMergeUpsertsEvidenceAndFacts() {
  const facts = createFactsFromIntake({ brand_name: 'Demo' });
  const merged = mergeFacts(facts, {
    project: { objectives: ['grow'] },
    evidence: [{
      id: 'ev-1',
      type: 'mcp',
      source_name: 'chuhaijiang',
      source_url: '',
      retrieved_at: new Date().toISOString(),
      status: 'verified',
      entity_refs: [],
      fields: ['gmv'],
      note: ''
    }],
    facts: [{
      id: 'fact-1',
      topic: 'gmv',
      metric: 'gmv_30d',
      value: 1000,
      unit: 'USD',
      period: '30d',
      entity_ref: '',
      evidence_ids: ['ev-1'],
      status: 'verified',
      note: ''
    }]
  });
  const updated = mergeFacts(merged, {
    evidence: [{ id: 'ev-1', note: 'updated' }],
    project: { objectives: ['retain'] }
  });
  assert.deepEqual(updated.project.objectives, ['grow', 'retain']);
  assert.equal(updated.evidence.length, 1);
  assert.equal(updated.evidence[0].note, 'updated');
  assert.equal(validateFacts(updated).ok, true);
}

testCreateAndValidate();
testVerifiedFactRequiresEvidence();
testRejectsSecrets();
testGateBlocksMissingData();
testGatePassesAuditWithWebsiteEvidence();
testSeoGateRejectsNonWebsiteUrl();
testRoundTrip();
testMergeUpsertsEvidenceAndFacts();

console.log('✅ project-facts tests passed');
