import { z } from 'astro:content';

export const snapshotSchema = z.object({
  capturedAt: z.string().optional(),
  snapshotIntervalMinutes: z.number().default(60),
  queues: z
    .array(
      z.object({
        name: z.string(),
        messages: z.number().default(0),
        messages_ready: z.number().default(0),
        messages_unacknowledged: z.number().default(0),
        consumers: z.number().default(0),
      }),
    )
    .default([]),
  items: z.record(z.string(), z.number()).default({}),
  llmToday: z
    .object({
      costUsd: z.number().default(0),
      inputTokens: z.number().default(0),
      outputTokens: z.number().default(0),
      calls: z.number().default(0),
    })
    .default({ costUsd: 0, inputTokens: 0, outputTokens: 0, calls: 0 }),
  llmTodayByPurpose: z
    .array(
      z.object({
        purpose: z.string(),
        model: z.string(),
        costUsd: z.number().default(0),
        inputTokens: z.number().default(0),
        outputTokens: z.number().default(0),
        calls: z.number().default(0),
      }),
    )
    .default([]),
  limits: z
    .object({
      dailyBudgetUsd: z.number().nullable().default(null),
      dailyDigestLimit: z.number().nullable().default(null),
      shortlistMaxPerDay: z.number().nullable().default(null),
      matchNoResonanceDistance: z.number().nullable().default(null),
    })
    .default({
      dailyBudgetUsd: null,
      dailyDigestLimit: null,
      shortlistMaxPerDay: null,
      matchNoResonanceDistance: null,
    }),
  shortlist: z.object({ pendingCount: z.number().default(0) }).default({ pendingCount: 0 }),
  receivedLast24h: z.number().default(0),
});

export type Snapshot = z.infer<typeof snapshotSchema>;

export async function loadSnapshot(): Promise<Snapshot | null> {
  const fs = await import('node:fs');
  const path = await import('node:path');
  let raw: string;
  try {
    raw = fs.readFileSync(path.join(process.cwd(), 'public/data/metrics/latest.json'), 'utf-8');
  } catch {
    return null;
  }
  return validate(JSON.parse(raw));
}

export async function fetchSnapshot(url: string, timeoutMs = 5000): Promise<Snapshot | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) {
      console.warn(`[dashboard] 取不到 build 時快照（HTTP ${res.status}）：${url}`);
      return null;
    }
    return validate(await res.json());
  } catch (e) {
    console.warn(`[dashboard] 取不到 build 時快照：${e}`);
    return null;
  }
}

function validate(json: unknown): Snapshot | null {
  const parsed = snapshotSchema.safeParse(json);
  if (!parsed.success) {
    console.warn(
      '[dashboard] 快照不符合 schema，可能是 SnapshotJob 改了欄位：\n' +
        JSON.stringify(parsed.error.issues, null, 2),
    );
    return null;
  }
  warnOnDrift(json as Record<string, unknown>);
  return parsed.data;
}

function warnOnDrift(json: Record<string, unknown>) {
  const expected = Object.keys(snapshotSchema.shape);
  const actual = Object.keys(json);
  const missing = expected.filter((k) => !actual.includes(k) && k !== 'capturedAt');
  const unknown = actual.filter((k) => !expected.includes(k));
  if (missing.length) {
    console.warn(
      `[dashboard] 快照缺少預期欄位 ${missing.join(', ')}` +
        (unknown.length ? `，但多了 ${unknown.join(', ')}——像是改名` : '——publisher 版本可能比較舊'),
    );
  } else if (unknown.length) {
    console.warn(`[dashboard] 快照有這一版不認得的欄位 ${unknown.join(', ')}；這一頁沒有顯示它們`);
  }
}
