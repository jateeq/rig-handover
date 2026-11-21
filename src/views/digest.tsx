import type { DigestRow, Night } from '../digest/types.js';

const DASH = '—';

function flagged(row: DigestRow): boolean {
  return row.retries >= 3 || row.lastStatus === 'fail';
}

export function DigestPage({ night }: { night: Night }) {
  return (
    <>
      <h1>digest · {night.night}</h1>
      {night.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {night.rows.map((r) => (
              <tr class={flagged(r) ? 'warn' : undefined}>
                <td>{flagged(r) ? `! ${r.job}` : r.job}</td>
                <td>{r.owner ?? DASH}</td>
                <td>{r.runs}</td>
                <td>{r.retries}</td>
                <td>{r.lastStatus}</td>
                <td>{r.lastError ?? DASH}</td>
                <td>{r.firstAt}</td>
                <td>{r.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {night.badLines > 0 && (
        <p class="warn">
          {night.badLines} {night.badLines === 1 ? 'line' : 'lines'} could not be read
        </p>
      )}
      <p class="mute">
        <a href="/">status board</a> · <a href={`/api/digest/${night.night}`}>json</a>
      </p>
    </>
  );
}

export function NoNight({ night }: { night: string }) {
  return (
    <>
      <h1>digest · {night}</h1>
      <p class="warn">no run log for this night</p>
      <p class="mute">
        <a href="/">status board</a>
      </p>
    </>
  );
}
