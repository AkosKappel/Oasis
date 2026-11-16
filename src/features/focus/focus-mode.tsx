import { useSpaceRepositories } from '@/features/spaces/space-context';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  focusRemaining,
  timerText,
  type FocusSession,
} from '@/database/focus-session';
import { reportStorageError } from '@/database/storage-health';
export function FocusModeDialog({ onClose }: { onClose: () => void }) {
  const { personalFocusSession } = useSpaceRepositories();
  const ref = useRef<HTMLDialogElement>(null),
    previous = useRef(document.activeElement);
  const [cycles, setCycles] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [minutes, setMinutes] = useState(25),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  useEffect(() => {
    const focused = previous.current;
    ref.current?.showModal();
    return () => {
      if (focused instanceof HTMLElement && focused.isConnected)
        focused.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="editor"
      aria-labelledby="focus-mode-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <h2 id="focus-mode-title" className="text-2xl font-semibold">
        Focus mode
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Set a timer and give one thing your attention. Home links, search and
        widgets stay hidden while it runs. Pause or end at any time.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        The timer follows the clock across tabs and reloads. There is no
        background alarm or website blocking.
      </p>
      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          setError(undefined);
          void personalFocusSession
            .start(minutes, cycles ? breakMinutes : undefined)
            .then(onClose)
            .catch((cause: unknown) => {
              reportStorageError(cause);
              setError(
                cause instanceof Error
                  ? cause.message
                  : 'The session could not start. Try again.',
              );
              setBusy(false);
            });
        }}
      >
        <label className="field">
          Session minutes
          <input
            type="number"
            min={1}
            max={120}
            step={1}
            required
            disabled={busy}
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cycles}
            disabled={busy}
            onChange={(event) => setCycles(event.target.checked)}
          />
          Alternate focus and breaks
        </label>
        {cycles && (
          <>
            <label className="field">
              Break minutes
              <input
                type="number"
                min={1}
                max={60}
                step={1}
                required
                disabled={busy}
                value={breakMinutes}
                onChange={(event) =>
                  setBreakMinutes(Number(event.target.value))
                }
              />
            </label>
            <p className="text-sm text-muted-foreground">
              Each phase waits for you to start the next. Nothing starts
              automatically.
            </p>
          </>
        )}
        <div className="flex gap-2">
          <Button disabled={busy}>Start focus</Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </dialog>
  );
}
export function FocusTimer({
  session,
  now,
}: {
  session: FocusSession;
  now: number;
}) {
  const { personalFocusSession } = useSpaceRepositories();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const remaining = focusRemaining(session, now);
  if (session.state === 'ended') return null;
  const isBreak = session.cycle?.phase === 'break';
  async function act(action: 'pause' | 'resume' | 'end' | 'next') {
    setBusy(true);
    setError(undefined);
    try {
      if (action === 'next')
        await personalFocusSession.nextPhase(session.endsAt);
      else await personalFocusSession.change(action);
    } catch (cause) {
      reportStorageError(cause);
      setError('The timer could not be updated. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Focus timer" className="mt-7 text-center">
      <h2 className="text-sm text-muted-foreground">
        {remaining === 0
          ? isBreak
            ? 'Break complete'
            : 'Session complete'
          : session.state === 'paused'
            ? isBreak
              ? 'Break paused'
              : 'Focus paused'
            : isBreak
              ? 'Take a break'
              : 'One thing at a time'}
      </h2>
      <p
        role="timer"
        aria-label="Time remaining"
        className="mt-4 text-6xl font-extralight tabular-nums sm:text-8xl"
      >
        {timerText(remaining)}
      </p>
      {remaining === 0 && (
        <p role="status" className="mt-3">
          {isBreak
            ? 'Ready when you are. Your break is complete.'
            : 'Take a breath. Your focus session is complete.'}
        </p>
      )}
      {session.cycle && (
        <p className="mt-3 text-sm text-muted-foreground">
          Focus sessions completed:{' '}
          {session.cycle.completedFocus + (!isBreak && remaining === 0 ? 1 : 0)}
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {remaining === 0 && session.cycle && (
          <Button disabled={busy} onClick={() => void act('next')}>
            {isBreak ? 'Start next focus' : 'Start break'}
          </Button>
        )}
        {remaining > 0 && (
          <Button
            disabled={busy}
            onClick={() =>
              void act(session.state === 'paused' ? 'resume' : 'pause')
            }
          >
            {session.state === 'paused'
              ? isBreak
                ? 'Resume break'
                : 'Resume focus'
              : isBreak
                ? 'Pause break'
                : 'Pause focus'}
          </Button>
        )}
        <Button
          disabled={busy}
          variant="outline"
          onClick={() => void act('end')}
        >
          {remaining === 0
            ? 'Dismiss timer'
            : session.cycle
              ? 'End cycle'
              : 'End focus'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
