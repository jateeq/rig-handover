import { describe, expect, it } from 'vitest';
import { digest, parseLine, readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads 2026-10-28: 5 jobs, 1 bad line', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night).not.toBeNull();
    expect(night!.badLines).toBe(1);
    expect(night!.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
    expect(night!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('folds retries, last status and last error per job', () => {
    const rows = readNight('runs', '2026-10-28')!.rows;
    const refresh = rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(refresh).toMatchObject({
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(rows.find((r) => r.job === 'notes/backup')).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('keeps a row whose owner is null', () => {
    const row = readNight('runs', '2026-10-28')!.rows.find((r) => r.job === 'digest/render');
    expect(row).toMatchObject({ owner: null, runs: 1 });
  });

  it('returns null for a night with no file and for a name that is not a night', () => {
    expect(readNight('runs', '2001-01-01')).toBeNull();
    expect(readNight('runs', '../package')).toBeNull();
  });

  it('renders an empty night as no rows', () => {
    expect(digest('2026-10-30', '')).toEqual({ night: '2026-10-30', rows: [], counts: { ok: 0, retry: 0, fail: 0 }, badLines: 0 });
  });
});

describe('parseLine', () => {
  it('rejects lines that parse as JSON but are not run lines', () => {
    expect(parseLine('[]')).toBeNull();
    expect(parseLine('{"at":"x","job":"j","status":"maybe","owner":null}')).toBeNull();
    expect(parseLine('{"at":"x","job":"j","status":"ok"}')).toBeNull();
  });
});
