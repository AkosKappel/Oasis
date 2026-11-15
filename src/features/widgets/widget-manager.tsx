import { downloadWidgetText } from './download-text';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import { WeatherSettingsPanel } from '@/features/weather/weather-settings';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  localDateTime,
  parseDeadline,
  type HomeWidget,
} from '@/database/home-widgets';
import { reportStorageError } from '@/database/storage-health';
import { useHomeWidgets } from './use-home-widgets';
const timeZones = ['UTC', ...Intl.supportedValuesOf('timeZone')];
export function WidgetManager({ onClose }: { onClose: () => void }) {
  const { personalHomeWidgets } = useSpaceRepositories();
  const ref = useRef<HTMLDialogElement>(null),
    previous = useRef(document.activeElement);
  const { widgets, error: loadError } = useHomeWidgets();
  const [editing, setEditing] = useState<HomeWidget>();
  const [kind, setKind] = useState<HomeWidget['kind']>('clock');
  const [text, setText] = useState('');
  const [label, setLabel] = useState('');
  const [zone, setZone] = useState('UTC');
  const [deadline, setDeadline] = useState('');
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  useEffect(() => {
    const focused = previous.current;
    ref.current?.showModal();
    return () => {
      if (focused instanceof HTMLElement && focused.isConnected)
        focused.focus();
    };
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Widgets could not be saved. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    setEditing(undefined);
    setLabel('');
    setDeadline('');
    setText('');
    setVisible(kind !== 'note');
  }
  return (
    <dialog
      ref={ref}
      className="editor"
      aria-labelledby="widgets-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="widgets-title" className="text-2xl font-semibold">
          Widgets
        </h2>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Done
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Add only what you want to see on Home. Widgets work offline. Notes are
        hidden until you choose Show on Home. Download a copy to keep outside
        this browser.
      </p>
      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            await personalHomeWidgets.save(
              kind === 'note'
                ? { kind, label, text, visible }
                : kind === 'clock'
                  ? { kind, label, timeZone: zone, visible }
                  : { kind, label, deadline: parseDeadline(deadline), visible },
              editing?.id,
              editing?.updatedAt,
            );
            reset();
          });
        }}
      >
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
          <legend className="mb-3 font-semibold">
            {editing ? 'Edit widget' : 'Add a widget'}
          </legend>
          <label className="field">
            Widget type
            <select
              disabled={!!editing}
              value={kind}
              onChange={(event) => {
                const value = event.target.value as typeof kind;
                setKind(value);
                setVisible(value !== 'note');
              }}
            >
              <option value="clock">World clock</option>
              <option value="countdown">Countdown</option>
              <option value="note">Scratchpad note</option>
            </select>
          </label>
          <label className="field">
            Widget label
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              required
              maxLength={40}
              placeholder={
                kind === 'note'
                  ? 'Ideas'
                  : kind === 'clock'
                    ? 'Tokyo'
                    : 'A day to look forward to'
              }
            />
          </label>
          {kind === 'note' ? (
            <label className="field">
              Note text
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={10000}
                rows={5}
              />
              <span className="text-xs font-normal text-muted-foreground">
                Plain text. Notes stay in this space and are outside bookmark
                backups.
              </span>
            </label>
          ) : kind === 'clock' ? (
            <label className="field">
              Time zone
              <select
                value={zone}
                onChange={(event) => setZone(event.target.value)}
              >
                {timeZones.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field">
              Countdown date and time
              <input
                type="datetime-local"
                aria-label="Countdown date and time"
                aria-describedby="countdown-time-help"
                required
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
              <span
                id="countdown-time-help"
                className="text-xs text-muted-foreground"
              >
                Enter your local time. The saved instant stays the same if you
                travel.
              </span>
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={visible}
              onChange={(event) => setVisible(event.target.checked)}
            />
            Show on Home
          </label>
          <div className="flex gap-2">
            <Button disabled={busy}>
              {editing ? 'Save widget' : 'Add widget'}
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={reset}>
                Cancel edit
              </Button>
            )}
          </div>
        </fieldset>
      </form>
      <ul className="mt-6 flex flex-col gap-3">
        {widgets.map((widget) => (
          <li
            key={widget.id}
            className="min-w-0 rounded-lg border border-border p-3"
          >
            <p className="break-words font-medium">{widget.label}</p>
            <p className="mt-1 break-words text-xs text-muted-foreground">
              {widget.kind === 'note'
                ? 'Scratchpad note'
                : widget.kind === 'clock'
                  ? widget.timeZone
                  : new Date(widget.deadline).toLocaleString()}
              {!widget.visible ? ' · Hidden' : ''}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setEditing(widget);
                  setKind(widget.kind);
                  setLabel(widget.label);
                  setVisible(widget.visible);
                  if (widget.kind === 'note') setText(widget.text);
                  else if (widget.kind === 'clock') setZone(widget.timeZone);
                  else setDeadline(localDateTime(widget.deadline));
                }}
              >
                Edit {widget.label}
              </Button>
              {widget.kind === 'note' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    downloadWidgetText(widget.text, 'oasis-note.txt')
                  }
                  aria-label={`Download note ${widget.label}`}
                >
                  Download note
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    if (
                      widget.kind === 'note' &&
                      !window.confirm(
                        `Remove note “${widget.label}”? Download a copy first if you want to keep it.`,
                      )
                    )
                      return;
                    await personalHomeWidgets.remove(
                      widget.id,
                      widget.updatedAt,
                    );
                    if (editing?.id === widget.id) reset();
                  })
                }
              >
                Remove {widget.label}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <WeatherSettingsPanel />
      {(error || loadError) && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error || loadError}
        </p>
      )}
    </dialog>
  );
}
