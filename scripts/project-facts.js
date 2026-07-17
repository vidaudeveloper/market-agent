#!/usr/bin/env node
const path = require('path');
const { z } = require('zod');
const {
  ProjectFactsSchema,
  createFactsFromIntake,
  mergeFacts,
  readJson,
  runGate,
  validateFacts,
  writeJson
} = require('./project-facts-lib');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_GATES = path.join(ROOT, 'templates', 'config', 'fact-gates.json');

function usage() {
  console.log(`
Project Facts CLI

用法:
  node scripts/project-facts.js init --out output/brand-project-facts.json [--intake templates/intake-tts.json]
  node scripts/project-facts.js merge --file output/brand-project-facts.json --patch output/facts-patch.json
  node scripts/project-facts.js validate --file output/brand-project-facts.json
  node scripts/project-facts.js gate --file output/brand-project-facts.json --skill market-seo
  node scripts/project-facts.js summary --file output/brand-project-facts.json
  node scripts/project-facts.js schema --out schemas/project-facts.schema.json

init 可选参数:
  --id <project-id> --name <project-name> --brand <brand> --product <product>
`);
}

function parseArgs(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      result._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      result[key] = true;
    } else {
      result[key] = next;
      index += 1;
    }
  }
  return result;
}

function resolveFromRoot(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
}

function requireArg(args, key) {
  if (!args[key] || args[key] === true) throw new Error(`缺少参数 --${key}`);
  return args[key];
}

function loadAndValidate(filePath) {
  const absolutePath = resolveFromRoot(filePath);
  const value = readJson(absolutePath);
  const result = validateFacts(value);
  if (!result.ok) {
    console.error(`❌ Project Facts 校验失败: ${absolutePath}`);
    for (const error of result.errors) console.error(`   - ${error.path || '(root)'}: ${error.message}`);
    process.exitCode = 1;
    return null;
  }
  return { absolutePath, facts: result.data };
}

function init(args) {
  const outputPath = resolveFromRoot(requireArg(args, 'out'));
  const intake = args.intake ? readJson(resolveFromRoot(args.intake)) : {};
  const facts = createFactsFromIntake(intake, {
    id: args.id,
    name: args.name,
    brand_name: args.brand,
    product_name: args.product
  });
  const result = validateFacts(facts);
  if (!result.ok) throw new Error(result.errors.map(error => `${error.path}: ${error.message}`).join('; '));
  writeJson(outputPath, result.data);
  console.log(`✅ 已创建 Project Facts: ${outputPath}`);
  console.log('下一步：补充 evidence/facts/entities/screenshots，再执行 validate 与 gate。');
}

function validate(args) {
  const loaded = loadAndValidate(requireArg(args, 'file'));
  if (!loaded) return;
  console.log(`✅ Project Facts 结构与证据引用有效: ${loaded.absolutePath}`);
}

function merge(args) {
  const filePath = resolveFromRoot(requireArg(args, 'file'));
  const patchPath = resolveFromRoot(requireArg(args, 'patch'));
  const base = readJson(filePath);
  const patch = readJson(patchPath);
  const merged = mergeFacts(base, patch);
  const result = validateFacts(merged);
  if (!result.ok) {
    console.error('❌ 合并后的 Project Facts 无效，未写入原文件：');
    for (const error of result.errors) console.error(`   - ${error.path || '(root)'}: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  writeJson(filePath, result.data);
  console.log(`✅ 已合并事实补丁: ${patchPath}`);
  console.log(`   → ${filePath}`);
}

function gate(args) {
  const loaded = loadAndValidate(requireArg(args, 'file'));
  if (!loaded) return;
  const skill = requireArg(args, 'skill');
  const configPath = resolveFromRoot(args.config || DEFAULT_GATES);
  const gatesConfig = readJson(configPath);
  const result = runGate(loaded.facts, skill, gatesConfig);

  console.log(`${result.passed ? '✅' : '❌'} ${skill} gate ${result.passed ? '通过' : '未通过'}`);
  for (const blocker of result.blockers) console.log(`   BLOCKER: ${blocker}`);
  for (const warning of result.warnings) console.log(`   WARNING: ${warning}`);

  loaded.facts.workflow.last_gate = {
    skill,
    passed: result.passed,
    checked_at: result.checked_at
  };
  loaded.facts.updated_at = result.checked_at;
  writeJson(loaded.absolutePath, loaded.facts);
  if (!result.passed) process.exitCode = 2;
}

function summary(args) {
  const loaded = loadAndValidate(requireArg(args, 'file'));
  if (!loaded) return;
  const { facts } = loaded;
  console.log(JSON.stringify({
    project: facts.project,
    counts: {
      urls: facts.inputs.urls.length,
      products: facts.entities.products.length,
      sellers: facts.entities.sellers.length,
      competitors: facts.entities.competitors.length,
      creators: facts.entities.creators.length,
      videos: facts.entities.videos.length,
      evidence: facts.evidence.length,
      facts: facts.facts.length,
      screenshots: facts.screenshots.length,
      assumptions: facts.assumptions.length,
      gaps: facts.gaps.length
    },
    workflow: facts.workflow
  }, null, 2));
}

function schema(args) {
  const outputPath = resolveFromRoot(requireArg(args, 'out'));
  const jsonSchema = z.toJSONSchema(ProjectFactsSchema, {
    target: 'draft-7',
    io: 'input'
  });
  writeJson(outputPath, {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'VidAU Project Facts',
    ...jsonSchema
  });
  console.log(`✅ 已生成 JSON Schema: ${outputPath}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (!command || ['help', '-h', '--help'].includes(command)) {
    usage();
    return;
  }
  const commands = { init, merge, validate, gate, summary, schema };
  if (!commands[command]) throw new Error(`未知命令: ${command}`);
  commands[command](args);
}

try {
  main();
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}
