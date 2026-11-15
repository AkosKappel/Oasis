import { countdownText } from '@/database/home-widgets';
import { useHomeWidgets } from './use-home-widgets';
import type { Appearance } from '@/database/appearance';
export function HomeWidgets({
  now,
  clock,
}: {
  now: Date;
  clock: Appearance['clock'];
}) {
  const { widgets, error } = useHomeWidgets();
  const visible = widgets.filter((item) => item.visible);
  if (!visible.length && !error) return null;
  return (
    <section
      aria-label="Home widgets"
      className="mt-7 flex w-full flex-wrap justify-center gap-3"
    >
      {visible.map((widget) => (
        <article
          key={widget.id}
          aria-label={widget.label}
          className="min-w-0 max-w-full rounded-lg border border-current/20 bg-surface/20 px-4 py-3"
        >
          <h2 className="break-words text-xs text-muted-foreground">
            {widget.label}
          </h2>
          {widget.kind === 'note' ? (
            <p className="mt-2 max-w-sm whitespace-pre-wrap break-words text-left text-sm line-clamp-6">
              {widget.text.trim() ? widget.text : 'Your note is empty.'}
            </p>
          ) : widget.kind === 'clock' ? (
            <>
              <p className="mt-1 text-xl tabular-nums">
                {now.toLocaleTimeString(undefined, {
                  timeZone: widget.timeZone,
                  hour: '2-digit',
                  minute: '2-digit',
                  ...(clock === 'system' ? {} : { hour12: clock === '12' }),
                })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {now.toLocaleDateString(undefined, {
                  timeZone: widget.timeZone,
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-xl tabular-nums">
                {countdownText(widget.deadline, now.getTime())}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(widget.deadline).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  ...(clock === 'system' ? {} : { hour12: clock === '12' }),
                })}
              </p>
            </>
          )}
        </article>
      ))}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
