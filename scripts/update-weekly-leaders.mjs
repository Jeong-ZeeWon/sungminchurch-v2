import { writeFile } from 'node:fs/promises';

const token = process.env.NOTION_TOKEN;
const pageId = process.env.NOTION_PAGE_ID || '35b5e604d8c680aea0c4d47fc08c83f7';

if (!token) throw new Error('NOTION_TOKEN secret is missing.');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const dayNames = ['월', '화', '수', '목', '금', '토'];
const dayIndex = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4, 토: 5 };

async function notion(path) {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`https://api.notion.com/v1${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28'
      }
    });

    if (res.ok) return res.json();

    const body = await res.text();
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === maxAttempts) {
      throw new Error(`Notion API ${res.status}: ${body}`);
    }

    const retryAfter = Number(res.headers.get('retry-after'));
    const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 1500 * attempt;
    console.log(`Notion API ${res.status}; retrying in ${delayMs}ms (${attempt}/${maxAttempts})`);
    await sleep(delayMs);
  }
}

function textOf(block) {
  const body = block[block.type];
  if (!body?.rich_text) return '';
  return body.rich_text.map(t => t.plain_text || '').join('');
}

async function getLines() {
  const lines = [];
  let cursor = '';
  do {
    const qs = new URLSearchParams({ page_size: '100' });
    if (cursor) qs.set('start_cursor', cursor);
    const data = await notion(`/blocks/${pageId}/children?${qs}`);
    for (const block of data.results) {
      const raw = textOf(block);
      // 한 블럭 안의 줄바꿈(\n) 또는 <br> 태그를 모두 라인 단위로 분리
      const parts = raw.split(/\r?\n|<br\s*\/?>/i);
      for (const part of parts) {
        const line = part.replace(/^\*+|\*+$/g, '').trim();
        if (line && line !== '---') lines.push(line);
      }
    }
    cursor = data.has_more ? data.next_cursor : '';
  } while (cursor);
  return lines;
}

const sectionKeys = [
  { name: '새벽기도회', words: ['새벽기도회', '새벽'] },
  { name: '수요예배', words: ['수요예배', '수요'] },
  { name: '금요성령집회', words: ['금요성령집회', '금요'] },
  { name: '주일예배', words: ['주일예배', '주일'] }
];

function compact(value) {
  return String(value || '').replace(/\s+/g, '');
}

function isSectionHeader(line, words) {
  const text = compact(line);
  const serviceMatch = words.some(word => text.includes(compact(word)));
  return serviceMatch && (text.includes('담당') || /\d{1,2}\/\d{1,2}/.test(text));
}

function section(lines, key) {
  const start = lines.findIndex(l => isSectionHeader(l, key.words));
  if (start < 0) throw new Error(`${key.name} section not found.`);
  const out = [];
  for (let i = start; i < lines.length; i++) {
    if (i > start && sectionKeys.some(other => other !== key && isSectionHeader(lines[i], other.words))) break;
    out.push(lines[i]);
  }
  return out;
}

function after(lines, key) {
  const line = lines.find(l => l.startsWith(`${key}:`));
  return line ? line.slice(line.indexOf(':') + 1).trim() : '';
}

function normalizeName(name) {
  return String(name || '')
    .replace(/담임목사님/g, '목사님')
    .replace(/\s*목사님$/g, '목사님')
    .replace(/\s*목사$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function weekLabel(header) {
  const m = header.match(/(\d{1,2})\/(\d{1,2})\s*[-–—~]\s*(?:(\d{1,2})\/)?(\d{1,2})/);
  if (!m) return '이번 주';
  return `${Number(m[1])}/${Number(m[2])} — ${Number(m[3] || m[1])}/${Number(m[4])}`;
}

function dateLabel(header) {
  const m = header.match(/(\d{1,2})\/(\d{1,2})\(([^)]+)\)/);
  return m ? `${Number(m[1])}/${Number(m[2])}(${m[3]})` : '';
}

function expandDays(spec) {
  const out = [];
  for (const raw of String(spec || '').split(',')) {
    const p = raw.trim();
    const range = p.match(/^([월화수목금토])\s*[-–—~]\s*([월화수목금토])$/);
    if (range) {
      for (let i = dayIndex[range[1]]; i <= dayIndex[range[2]]; i++) out.push(i);
    } else if (dayIndex[p] !== undefined) {
      out.push(dayIndex[p]);
    }
  }
  return out;
}

function distribute(value) {
  const arr = Array(6).fill('');
  const text = String(value || '');
  const matches = text.matchAll(/([^(),]+?)\s*\(([^)]*)\)/g);

  for (const match of matches) {
    const name = normalizeName(match[1]);
    const days = expandDays(match[2]);
    days.forEach(i => { arr[i] = name; });
  }

  return arr;
}

function prayer(value) {
  return String(value || '').split(/[ ,，]+/).map(normalizeName).filter(Boolean);
}

function worshipSection(lines, keys) {
  const out = { date: dateLabel(lines[0]) };
  for (const key of keys) {
    out[key.prop] = normalizeName(after(lines, key.label));
  }
  return out;
}

const lines = await getLines();
const [dawnKey, wedKey, friKey, sunKey] = sectionKeys;
const dawn = section(lines, dawnKey);
const wed = section(lines, wedKey);
const fri = section(lines, friKey);
const sun = section(lines, sunKey);

const leaders = {
  title: '한 주간 예배 담당자',
  subtitle: '이번 주 예배 담당자',
  icon: '👥',
  color: 'ldr',
  description: '이번 주 새벽·수요·금요·주일 예배 담당자',
  week: weekLabel(dawn[0]),
  dawn: {
    days: dayNames,
    preacher: distribute(after(dawn, '설교')),
    caption: distribute(after(dawn, '자막')),
    accomp: distribute(after(dawn, '반주'))
  },
  wednesday: {
    date: dateLabel(wed[0]),
    preacher: normalizeName(after(wed, '설교')),
    worship: normalizeName(after(wed, '찬양')),
    sound: normalizeName(after(wed, '음향')),
    pd: normalizeName(after(wed, 'PD'))
  },
  friday: {
    date: dateLabel(fri[0]),
    worship: normalizeName(after(fri, '찬양')),
    pd: normalizeName(after(fri, 'PD')),
    caption: normalizeName(after(fri, '자막')),
    prayer: prayer(after(fri, '기도용사'))
  },
  sunday: worshipSection(sun, [
    { label: '1부 사회', prop: 'firstHost' },
    { label: '2부 사회', prop: 'secondHost' },
    { label: '3부 사회', prop: 'thirdHost' },
    { label: '1부 PD', prop: 'firstPd' },
    { label: '1부 자막', prop: 'firstCaption' },
    { label: '2부 PD', prop: 'secondPd' }
  ])
};

const output = `// 노션 원자료 기준: 한 주간 예배 담당자\n// GitHub Actions가 매주 토요일 09:30(KST)에 자동 갱신합니다.\n\nif (typeof churchData !== 'undefined') {\n  churchData.leaders = ${JSON.stringify(leaders, null, 2)};\n}\n`;

await writeFile('leaders-update.js', output, 'utf8');
console.log(`Updated leaders-update.js: ${leaders.week}`);
