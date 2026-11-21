// Plan morning-digest, § 1. The contract every part of § 2 builds against.

export type RunStatus = 'ok' | 'retry' | 'fail';

/** One line of runs/<night>.jsonl, after it has been parsed and checked. */
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

/** One row per job for a night. Times keep the offset from the log (styleguide). */
export type DigestRow = {
  job: string;
  /** Owner on the job's last line; `null` renders as `—`. */
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  /** The most recent `error` seen for the job, even if a later run was ok. */
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  /** Sorted by job. */
  rows: DigestRow[];
  /** Runs per status across all jobs (valid lines only). The status board shows these. */
  counts: Record<RunStatus, number>;
  /** Lines that did not parse or did not match RunLine. Counted, never thrown. */
  badLines: number;
};

/** Returns `null` when the night has no file (or the name is not a YYYY-MM-DD night). */
export type ReadNight = (runsDir: string, night: string) => Night | null;
