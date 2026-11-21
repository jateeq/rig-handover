import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// runs/ is read-only: every route test reads from its own temp runs dir.
let runsDir: string;
let app: ReturnType<typeof createApp>;

const ok = (at: string, job: string, owner: string | null = 'rook') => JSON.stringify({ at, job, status: 'ok', owner });

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(
    join(runsDir, '2026-11-01.jsonl'),
    [
      ok('2026-11-01T23:00:00+01:00', 'b/job'),
      JSON.stringify({ at: '2026-11-01T23:01:00+01:00', job: 'a/job', status: 'fail', owner: null, error: 'boom' }),
      '',
    ].join('\n'),
  );
  writeFileSync(join(runsDir, '2026-11-02.jsonl'), '');
  writeFileSync(join(runsDir, '2026-11-03.jsonl'), `${ok('2026-11-03T23:00:00+01:00', 'a/job')}\n{"at":"2026-11-03T23:0`);
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });
});

afterAll(() => rmSync(runsDir, { recursive: true, force: true }));

describe('GET /digest/:night', () => {
  it('200: one row per job, sorted by job, fail marked, null owner as —', async () => {
    const res = await app.request('/digest/2026-11-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html.indexOf('a/job')).toBeLessThan(html.indexOf('b/job'));
    expect(html).toContain('<tr class="warn"><td>! a/job</td><td>—</td>');
  });

  it('404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-11-09');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('no run log for this night');
  });

  it('404 for a name that is not a night', async () => {
    expect((await app.request('/digest/..%2F..%2Fpackage')).status).toBe(404);
  });

  it('an empty night renders "nothing ran"', async () => {
    const res = await app.request('/digest/2026-11-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('a night with a bad line still renders and counts it', async () => {
    const res = await app.request('/digest/2026-11-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('a/job');
    expect(html).toContain('1 line could not be read');
  });
});

describe('GET /api/digest/:night', () => {
  it('200: the same jobs in the same order as the page', async () => {
    const json = (await (await app.request('/api/digest/2026-11-01')).json()) as { rows: { job: string }[] };
    const html = await (await app.request('/digest/2026-11-01')).text();
    const pageJobs = [...html.matchAll(/<tr(?: class="warn")?><td>(?:! )?([^<]+)<\/td>/g)].map((m) => m[1]);
    expect(json.rows.map((r) => r.job)).toEqual(['a/job', 'b/job']);
    expect(json.rows.map((r) => r.job)).toEqual(pageJobs);
  });

  it('404 for a night with no file', async () => {
    expect((await app.request('/api/digest/2026-11-09')).status).toBe(404);
  });

  it('an empty night returns no rows', async () => {
    const res = await app.request('/api/digest/2026-11-02');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ rows: [], badLines: 0 });
  });

  it('a night with a bad line returns the good rows and the count', async () => {
    const res = await app.request('/api/digest/2026-11-03');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ rows: [{ job: 'a/job' }], badLines: 1 });
  });
});

describe('status board', () => {
  it('links each night to its digest with its counts', async () => {
    const html = await (await app.request('/')).text();
    expect(html).toContain('<a href="/digest/2026-11-01">2026-11-01</a> <span class="mute">ok 1 · retry 0 · fail 1</span>');
    expect(html).toContain('<a href="/digest/2026-11-02">');
  });
});
