import { promises as fs } from 'node:fs';
import path from 'node:path';

export const ROOT_DIR = process.cwd();
export const CLAUDE_SKILLS_DIR = path.join(ROOT_DIR, '.claude', 'skills');
export const SHARED_SKILLS_DIR = path.join(ROOT_DIR, 'skills');
export const GENERATED_DIR = path.join(ROOT_DIR, 'generated');

export async function listSkillDirs(baseDir = SHARED_SKILLS_DIR) {
  const dirEntries = await fs.readdir(baseDir, { withFileTypes: true });
  return dirEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export async function resolveSkillSelection(requestedSkills, baseDir = SHARED_SKILLS_DIR) {
  const availableSkills = await listSkillDirs(baseDir);

  if (requestedSkills.length === 0) {
    return availableSkills;
  }

  const missingSkills = requestedSkills.filter((skillName) => !availableSkills.includes(skillName));
  if (missingSkills.length > 0) {
    throw new Error(
      `Unknown skill name(s): ${missingSkills.join(', ')}. Available skills: ${availableSkills.join(', ')}`
    );
  }

  return [...new Set(requestedSkills)];
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readUtf8(filePath) {
  return fs.readFile(filePath, 'utf8');
}

export async function writeUtf8(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}

export async function writeJson(filePath, value) {
  await writeUtf8(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

const CODEX_INCOMPATIBILITY_CHECKS = [
  {
    pattern: /~\/\.claude|CLAUDE\.md|bot-character\.md/,
    message: 'Claude 전용 설정 파일 경로를 사용합니다 (`~/.claude/...`, `CLAUDE.md`, `bot-character.md`).',
  },
  {
    pattern: /AskUserQuestion/,
    message: 'Claude 전용 질문 surface (`AskUserQuestion`)를 사용합니다.',
  },
  {
    pattern: /Agent\(|oh-my-claudecode|omc ask|\/oh-my-claudecode/,
    message: 'Claude/OMC 전용 에이전트 또는 런타임 호출을 사용합니다.',
  },
];

export async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function listVisibleAssetEntries(skillDir) {
  const dirEntries = await fs.readdir(skillDir, { withFileTypes: true });
  return dirEntries
    .filter((entry) => entry.name !== 'SKILL.md')
    .filter((entry) => !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

export async function copyPath(sourcePath, targetPath) {
  await ensureDir(path.dirname(targetPath));
  await fs.rm(targetPath, { recursive: true, force: true });
  await fs.cp(sourcePath, targetPath, {
    recursive: true,
    filter: (candidatePath) => {
      const relativePath = path.relative(sourcePath, candidatePath);
      if (!relativePath || relativePath === '') {
        return true;
      }

      return relativePath
        .split(path.sep)
        .every((segment) => segment !== '' && !segment.startsWith('.'));
    },
  });
}

export function parseSkillMarkdown(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error('SKILL.md is missing YAML-style frontmatter.');
  }

  const [, rawFrontmatter, body] = match;
  const frontmatter = {};

  for (const line of rawFrontmatter.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex === -1) {
      throw new Error(`Invalid frontmatter line: ${line}`);
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    frontmatter[key] = parseFrontmatterValue(rawValue);
  }

  return {
    frontmatter,
    body: body.trimStart(),
  };
}

function parseFrontmatterValue(value) {
  if (!value) return '';
  if (value.startsWith('[') || value.startsWith('{')) {
    return JSON.parse(value);
  }
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function renderFrontmatter(entries) {
  const lines = ['---'];

  for (const [key, value] of Object.entries(entries)) {
    lines.push(`${key}: ${renderFrontmatterValue(value)}`);
  }

  lines.push('---', '');
  return lines.join('\n');
}

function renderFrontmatterValue(value) {
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return JSON.stringify(value);
  }
  const stringValue = String(value);
  if (stringValue === '' || /[:[\]{}#,]|^\s|\s$/.test(stringValue)) {
    return JSON.stringify(stringValue);
  }
  return stringValue;
}

export function detectCodexSupport(body) {
  const findings = findCodexIncompatibilities(renderRuntimeBlocks(body, 'codex'));

  let level = 'portable';
  if (findings.some((finding) => finding.includes('설정 파일 경로'))) {
    level = 'runtime-specific';
  } else if (findings.length > 0) {
    level = 'adapter-required';
  }

  return {
    level,
    findings,
  };
}

export function findCodexIncompatibilities(body) {
  return CODEX_INCOMPATIBILITY_CHECKS
    .filter(({ pattern }) => pattern.test(body))
    .map(({ message }) => message);
}

export function buildClaudeAdapter(skillName) {
  return [
    '## Runtime Adapter',
    '',
    '- Runtime: Claude Code',
    `- Invocation: \`/${skillName}\``,
    `- Install target: \`~/.claude/skills/${skillName}\``,
    '- Support level: full',
    '- Canonical source: `skills/<name>/...`에서 생성된 Claude용 어댑터입니다.',
    '',
  ].join('\n');
}

export function buildCodexAdapter(skillName, support) {
  const lines = [
    '## Runtime Adapter',
    '',
    '- Runtime: Codex',
    `- Invocation: \`$${skillName}\``,
    `- Install target: \`$CODEX_HOME/skills/${skillName}\` (기본값: \`~/.codex/skills/${skillName}\`)`,
    `- Support level: ${support.level}`,
  ];

  if (support.findings.length === 0) {
    lines.push('- Migration notes: 특별한 런타임 차이 없이 바로 포팅 가능한 스킬로 분류됩니다.');
  } else {
    lines.push('- Migration notes: 아래 Claude 전용 전제를 Codex surface로 치환해야 합니다.');
    for (const finding of support.findings) {
      lines.push(`- ${finding}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

export function renderRuntimeBlocks(body, runtime) {
  const lines = body.split('\n');
  const rendered = [];
  const stack = [];

  for (const line of lines) {
    const startMatch = line.match(/^<!--\s*runtime:([a-z0-9_-]+):start\s*-->$/i);
    if (startMatch) {
      stack.push(startMatch[1].toLowerCase());
      continue;
    }

    if (/^<!--\s*runtime:end\s*-->$/i.test(line)) {
      if (stack.length === 0) {
        throw new Error('Encountered runtime:end without a matching runtime:start block.');
      }
      stack.pop();
      continue;
    }

    if (stack.every((entry) => entry === runtime)) {
      rendered.push(line);
    }
  }

  if (stack.length > 0) {
    throw new Error(`Unclosed runtime block(s): ${stack.join(', ')}`);
  }

  return rendered.join('\n');
}

export function adaptBodyForRuntime(body, runtime, skillName) {
  const runtimeBody = renderRuntimeBlocks(body, runtime);

  if (runtime !== 'codex') {
    return runtimeBody;
  }

  const escapedSkillName = skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const invocationPattern = new RegExp(
    `(^|[\\s(\`])\\/${escapedSkillName}(?=($|[\\s)\`.,:;!?]))`,
    'gm'
  );

  const adaptedBody = runtimeBody
    .replaceAll('Claude MUST', 'Codex MUST')
    .replace(invocationPattern, (_, prefix) => `${prefix}$${skillName}`);

  const incompatibilities = findCodexIncompatibilities(adaptedBody);
  if (incompatibilities.length > 0) {
    throw new Error(
      `Codex body for "${skillName}" still contains unsupported runtime-specific guidance:\n- ${incompatibilities.join('\n- ')}`
    );
  }

  return adaptedBody;
}

export async function renderSkillOutput(skillName, runtime, baseDir = SHARED_SKILLS_DIR) {
  const skillDir = path.join(baseDir, skillName);
  const manifest = JSON.parse(await readUtf8(path.join(skillDir, 'skill.json')));
  const commonBody = await readUtf8(path.join(skillDir, 'common.md'));
  const adapter = await readUtf8(path.join(skillDir, 'adapters', `${runtime}.md`));
  const body = adaptBodyForRuntime(commonBody, runtime, skillName);
  const content = [
    renderFrontmatter({
      name: manifest.name,
      description: manifest.description,
      triggers: manifest.triggers,
      'argument-hint': manifest.argumentHint,
      runtime,
      'support-level': manifest.runtimeSupport[runtime],
      'generated-from': `skills/${skillName}`,
    }),
    '<!-- Generated file. Edit skills/<name>/... and rebuild. -->',
    '',
    adapter.trimEnd(),
    '',
    body.trimStart(),
    '',
  ].join('\n');

  return {
    skillDir,
    manifest,
    assets: manifest.assets ?? [],
    content,
  };
}
