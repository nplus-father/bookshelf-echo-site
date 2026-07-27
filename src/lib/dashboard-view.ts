/**
 * dashboard 的呈現層，寫成一個純函式，因為它要在兩個地方跑同一份標記：
 *
 *  - build 時（SSG）：拿 repo 裡的快照渲染一次，讓沒有 JS 的讀者、爬蟲和
 *    社群預覽都看得到內容；
 *  - 瀏覽器裡：快照已經不隨內容一起進 main（每小時一次的 metrics commit 會
 *    害整個站每小時重建一次，見 site-publish.sh），改由頁面自己去抓 data
 *    branch 上的那一份。
 *
 * 兩邊共用同一份模板是刻意的：分成兩份，遲早會有一邊少一塊而沒有人發現。
 */

type Queue = {
  name?: string;
  messages?: number;
  messages_ready?: number;
  messages_unacknowledged?: number;
  consumers?: number;
};
type Breakdown = {
  purpose?: string;
  model?: string;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  calls?: number;
};
/** 寬鬆型別：client 端拿到的是未經 zod 驗證的 JSON，每個欄位都可能缺。 */
export type SnapshotLike = {
  capturedAt?: string;
  snapshotIntervalMinutes?: number;
  queues?: Queue[];
  items?: Record<string, number>;
  llmToday?: { costUsd?: number; inputTokens?: number; outputTokens?: number; calls?: number };
  llmTodayByPurpose?: Breakdown[];
  limits?: {
    dailyBudgetUsd?: number | null;
    dailyDigestLimit?: number | null;
    shortlistMaxPerDay?: number | null;
    matchNoResonanceDistance?: number | null;
  };
  shortlist?: { pendingCount?: number };
  receivedLast24h?: number;
};

const nf = new Intl.NumberFormat('en-US');
const num = (n?: number) => nf.format(n ?? 0);
const compact = (n?: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n ?? 0);
// Spend is fractions of a cent, so it needs 4 dp to say anything; the budget is a
// round config value and reads wrong at that precision ($0.5000).
const usd = (n?: number) => '$' + (n ?? 0).toFixed((n ?? 0) >= 1 ? 2 : 4);
const usdRound = (n?: number) => '$' + (n ?? 0).toFixed(2);
const pct = (r: number) => Math.max(0, Math.min(100, r * 100));

/** 快照裡的字串（模型名、佇列名）會進 HTML，一律先跳脫。 */
const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Severity for a meter fill: accent → warning → danger. Every use is paired with
// an icon + label chip, so state never rests on colour alone.
const sev = (ratio: number | null) =>
  ratio == null ? 'accent' : ratio >= 1 ? 'critical' : ratio >= 0.8 ? 'warning' : 'accent';
// The chip speaks the status palette, where healthy is "good", not the accent.
const chipOf = (s: string) => (s === 'accent' ? 'good' : s);
const ICON: Record<string, string> = { good: '✓', warning: '!', critical: '✕' };

const STATES = ['RECEIVED', 'ENRICHED', 'DIGESTED', 'PUBLISHED', 'DUPLICATE', 'FAILED'];
const STATE_LABEL: Record<string, string> = {
  RECEIVED: '已接收',
  ENRICHED: '已擴充',
  DIGESTED: '已摘要',
  PUBLISHED: '已發布',
  DUPLICATE: '重複',
  FAILED: '失敗',
};
// Only these have consumers. The retry ladder and the DLQ are parking lots by
// design (ADR-004), so "0 consumers" there is health, not a stall.
const WORK_QUEUES = ['ingest.q', 'digest.q', 'publish.q'];
const PURPOSE_LABEL: Record<string, string> = {
  DIGEST: '逐則摘要',
  SELECT: '每日選題',
  JUDGE: '共鳴判定',
  ESSAY: '每日評析',
  WEEKLY_ROLLUP: '每週彙整',
};
const COST_TEXT: Record<string, string> = {
  good: '預算充裕',
  warning: '接近每日預算',
  critical: '已達預算，斷路器停放中',
};
const AGE_TEXT: Record<string, string> = {
  good: '資料新鮮',
  warning: '快照過期，publisher 可能落後',
  critical: '快照停滯，檢查 publisher 是否還活著',
};

/**
 * 快照有多舊。publisher 曾在 2026-07-19 靜默停寫 12 小時，而 dashboard 照樣顯示
 * 一個看似正常的時間戳——過期的快照和健康的快照長得一模一樣。
 *
 * 在瀏覽器裡算比在 build 時算更誠實：頁面現在可能是幾天前建好的。
 */
export function snapshotAge(capturedAt: string | undefined, now: Date, intervalMinutes = 60) {
  if (!capturedAt) return null;
  const ms = now.getTime() - new Date(capturedAt).getTime();
  if (Number.isNaN(ms)) return null;
  const minutes = ms / 60000;
  const severity = minutes > intervalMinutes * 4 ? 'critical' : minutes > intervalMinutes * 2 ? 'warning' : 'good';
  return { minutes, severity };
}

/** 人話的「多久以前」。 */
export function humanAge(minutes: number): string {
  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${Math.round(minutes)} 分鐘前`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} 小時前`;
  return `${Math.round(minutes / (60 * 24))} 天前`;
}

const chip = (kind: string, text: string) =>
  `<span class="chip chip-${kind}"><span class="ico" aria-hidden="true">${ICON[kind]}</span>${esc(text)}</span>`;

export function renderDashboard(snap: SnapshotLike | null, now: Date): string {
  if (!snap) {
    return `<p class="empty">尚無快照 — pipeline 首次同步 <code>metrics/latest.json</code> 後會自動出現。</p>`;
  }

  const items = snap.items ?? {};
  const stateRows = STATES.map((s) => ({ state: s, label: STATE_LABEL[s], count: items[s] ?? 0 }));
  const stateMax = Math.max(1, ...stateRows.map((r) => r.count));

  const queues = (snap.queues ?? []).slice();
  const rank = (n: string) => (WORK_QUEUES.includes(n) ? 0 : n === 'dlq.q' ? 1 : 2);
  queues.sort((a, b) => rank(a.name ?? '') - rank(b.name ?? '') || (a.name ?? '').localeCompare(b.name ?? ''));
  const queueMax = Math.max(1, ...queues.map((q) => q.messages ?? 0));
  const dlqDepth = queues.find((q) => q.name === 'dlq.q')?.messages ?? 0;

  const llm = snap.llmToday ?? {};
  const budget = snap.limits?.dailyBudgetUsd ?? null;
  const digestLimit = snap.limits?.dailyDigestLimit ?? null;
  const costRatio = budget ? (llm.costUsd ?? 0) / budget : null;
  const costSev = sev(costRatio);
  const costChip = chipOf(costSev);

  const breakdown = snap.llmTodayByPurpose ?? [];
  const breakdownMax = Math.max(1e-9, ...breakdown.map((r) => r.costUsd ?? 0));
  // 摘要配額算的是 DIGEST 呼叫，不是當天所有 LLM 呼叫；有拆帳就用拆帳的數字。
  const digestCalls = breakdown.length
    ? breakdown.filter((r) => r.purpose === 'DIGEST').reduce((s, r) => s + (r.calls ?? 0), 0)
    : (llm.calls ?? 0);
  const digestRatio = digestLimit ? digestCalls / digestLimit : null;
  const digestSev = sev(digestRatio);

  const captured = snap.capturedAt
    ? new Date(snap.capturedAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
    : null;
  const age = snapshotAge(snap.capturedAt, now, snap.snapshotIntervalMinutes ?? 60);

  return `<div class="viz">
  <p class="captured">快照時間 ${esc(captured ?? '—')} · 由 pipeline 每 ${esc(
    snap.snapshotIntervalMinutes ?? 60,
  )} 分鐘寫入${age ? chip(age.severity, `${humanAge(age.minutes)} · ${AGE_TEXT[age.severity]}`) : ''}</p>

  <section class="card hero">
    <p class="label">今日 LLM 花費</p>
    <p class="hero-value">${usd(llm.costUsd)}</p>
    ${
      budget != null
        ? `<div class="meter" style="--meter:var(--sev-${costSev});--fill:${pct(costRatio!)}%">
      <div class="meter-fill"></div>
    </div>
    <p class="sub">${chip(costChip, COST_TEXT[costChip])}<span>每日預算 ${usdRound(budget)} · 已用 ${Math.round(
      costRatio! * 100,
    )}%</span></p>`
        : ''
    }
    <p class="sub muted">${num(llm.calls)} 次呼叫 · ${compact(llm.inputTokens)} in / ${compact(
      llm.outputTokens,
    )} out tokens</p>
  </section>

  ${
    breakdown.length > 0
      ? `<h3>花費拆帳</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>用途</th><th>模型</th><th class="depth-col">占比</th><th class="n">花費</th><th class="n">呼叫</th><th class="n">tokens</th></tr></thead>
      <tbody>
        ${breakdown
          .map(
            (r) => `<tr>
          <td>${esc(PURPOSE_LABEL[r.purpose ?? ''] ?? r.purpose)}</td>
          <td><code>${esc(r.model)}</code></td>
          <td class="depth-col"><span class="qbar" style="width:${((r.costUsd ?? 0) / breakdownMax) * 100}%"></span></td>
          <td class="n">${usd(r.costUsd)}</td>
          <td class="n">${num(r.calls)}</td>
          <td class="n">${compact(r.inputTokens)} / ${compact(r.outputTokens)}</td>
        </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </div>
  <p class="foot-note">一天的帳單由誰花掉：便宜的逐則摘要跑數百次，昂貴的每日評析只跑一次，總額看不出差別。tokens 欄為 in / out。</p>`
      : ''
  }

  <div class="kpis">
    <section class="card">
      <p class="label">今日摘要</p>
      <p class="value">${num(digestCalls)}${digestLimit != null ? `<span class="of"> / ${digestLimit}</span>` : ''}</p>
      ${
        digestRatio != null
          ? `<div class="meter" style="--meter:var(--sev-${digestSev});--fill:${pct(
              digestRatio,
            )}%"><div class="meter-fill"></div></div>`
          : ''
      }
      <p class="sub muted">每日高價值上限，超出者留在佇列等下一個視窗</p>
    </section>

    <section class="card">
      <p class="label">24 小時新進</p>
      <p class="value">${num(snap.receivedLast24h)}</p>
      <p class="sub muted">producers 送入 pipeline 的項目</p>
    </section>

    <section class="card">
      <p class="label">DLQ 停放</p>
      <p class="value">${num(dlqDepth)}</p>
      <p class="sub">${chip(dlqDepth > 0 ? 'critical' : 'good', dlqDepth > 0 ? '需要 ops dlq replay' : '無停放訊息')}</p>
    </section>
  </div>

  <h3>項目狀態</h3>
  <div class="bars">
    ${stateRows
      .map(
        (r) => `<div class="bar-row">
      <span class="bar-label">${esc(r.label)}</span>
      <span class="bar-track">
        <span class="bar" style="--w:${r.count / stateMax}"></span>
        <span class="bar-value">${num(r.count)}</span>
        ${r.state === 'FAILED' && r.count > 0 ? chip('critical', '需要調查') : ''}
      </span>
    </div>`,
      )
      .join('')}
  </div>

  <h3>佇列深度</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>佇列</th><th class="depth-col">深度</th><th class="n">訊息</th><th class="n">消費者</th></tr></thead>
      <tbody>
        ${queues
          .map(
            (q) => `<tr>
          <td><code>${esc(q.name)}</code></td>
          <td class="depth-col"><span class="qbar" style="width:${
            ((q.messages ?? 0) / queueMax) * 100
          }%" title="ready ${num(q.messages_ready)} · unacked ${num(q.messages_unacknowledged)}"></span></td>
          <td class="n">${num(q.messages)}</td>
          <td class="n">${num(q.consumers)}${
            WORK_QUEUES.includes(q.name ?? '') && (q.consumers ?? 0) === 0 ? chip('warning', '無消費者') : ''
          }</td>
        </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </div>
  <p class="foot-note"><code>retry.*</code> 與 <code>dlq.q</code> 依設計就沒有消費者（ADR-004）：它們是停放區，靠 TTL 到期後自動退回原佇列。</p>
</div>`;
}
