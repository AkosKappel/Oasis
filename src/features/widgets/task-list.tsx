import { useUndo, UndoNotice } from '@/features/settings/undo';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ListTodo } from 'lucide-react';
import { liveQuery } from 'dexie';
import { Button } from '@/components/ui/button';
import { useSpaceRepositories } from '@/features/spaces/space-context';
import { useStorageHealth } from '@/features/storage/use-storage-health';
import {
  reportStorageError,
  storageWriteSucceeded,
} from '@/database/storage-health';
import { taskListText, type WidgetTask } from '@/database/widget-tasks';
import type { HomeWidget } from '@/database/home-widgets';
import { downloadWidgetText } from './download-text';
function useTasks(widgetId: string) {
  const { widgetTasks } = useSpaceRepositories();
  const { retryVersion } = useStorageHealth();
  const [tasks, setTasks] = useState<WidgetTask[]>(),
    [error, setError] = useState<string>();
  useEffect(() => {
    const sub = liveQuery(() => widgetTasks.list(widgetId)).subscribe({
      next: (value) => {
        setTasks(value);
        setError(undefined);
      },
      error: (cause) => {
        reportStorageError(cause, true);
        setError('Tasks could not be loaded. Use Retry storage.');
      },
    });
    return () => sub.unsubscribe();
  }, [widgetTasks, widgetId, retryVersion]);
  return { tasks, error };
}
function TaskCheckbox({
  task,
  disabled,
  onComplete,
  muted = false,
}: {
  task: WidgetTask;
  disabled: boolean;
  onComplete: (completed: boolean) => Promise<number>;
  muted?: boolean;
}) {
  const [pending, setPending] = useState<{
    completed: boolean;
    revision: number;
  }>();
  // Keep the optimistic state until the live query observes this committed revision.
  const checked =
    pending && task.updatedAt < pending.revision
      ? pending.completed
      : task.completed;
  return (
    <label className="flex min-w-0 items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        aria-disabled={disabled}
        onChange={(event) => {
          if (disabled) return;
          const completed = event.target.checked;
          setPending({ completed, revision: Infinity });
          void onComplete(completed)
            .then((revision) => setPending({ completed, revision }))
            .catch(() => setPending(undefined));
        }}
        className="mt-1 size-4 shrink-0 accent-primary"
      />
      <span
        className={`min-w-0 break-words ${checked ? (muted ? 'line-through text-muted-foreground' : 'line-through') : ''}`}
      >
        {task.text}
      </span>
    </label>
  );
}
export function TaskListPreview({
  widget,
  onManage,
}: {
  widget: HomeWidget;
  onManage: (widget: HomeWidget) => void;
}) {
  const { widgetTasks } = useSpaceRepositories();
  const { tasks, error: loadError } = useTasks(widget.id);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  async function complete(task: WidgetTask, value: boolean) {
    if (busy || loadError) throw new Error('Wait until tasks are available.');
    setBusy(true);
    setError(undefined);
    try {
      const revision = await widgetTasks.complete(task.id, value);
      storageWriteSucceeded();
      return revision;
    } catch (cause) {
      reportStorageError(cause);
      setError('The task could not be updated. Try again.');
      throw cause;
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-2 w-64 max-w-full text-left">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {tasks
            ? `${tasks.filter((task) => task.completed).length} of ${tasks.length} done`
            : 'Loading tasks…'}
        </p>
        <button
          type="button"
          aria-label={`Manage tasks ${widget.label}`}
          title="Manage tasks"
          className="rounded p-2 hover:bg-foreground/10"
          onClick={() => onManage(widget)}
        >
          <ListTodo className="size-4" aria-hidden="true" />
        </button>
      </div>
      <ul className="mt-2 space-y-2">
        {tasks?.slice(0, 5).map((task) => (
          <li key={task.id}>
            <TaskCheckbox
              task={task}
              disabled={busy || !!loadError}
              onComplete={(value) => complete(task, value)}
            />
          </li>
        ))}
      </ul>
      {tasks?.length === 0 && (
        <p className="text-sm text-muted-foreground">No tasks yet.</p>
      )}
      {tasks && tasks.length > 5 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing the first 5 tasks. Open the list to see all.
        </p>
      )}
      {(error || loadError) && (
        <p role="alert" className="mt-2 text-sm">
          {error || loadError}
        </p>
      )}
    </div>
  );
}
export function TaskListDialog({
  widget,
  onClose,
}: {
  widget: HomeWidget;
  onClose: () => void;
}) {
  const { offer } = useUndo();
  const { widgetTasks } = useSpaceRepositories();
  const { tasks, error: loadError } = useTasks(widget.id);
  const ref = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null),
    focusInput = useRef(false);
  const [previous] = useState(document.activeElement);
  const [text, setText] = useState(''),
    [editing, setEditing] = useState<WidgetTask>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>(),
    [message, setMessage] = useState<string>();
  useEffect(() => {
    ref.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [previous]);
  useEffect(() => {
    if (!busy && focusInput.current) {
      input.current?.focus();
      focusInput.current = false;
    }
  }, [busy]);
  async function run(action: () => Promise<void>) {
    if (busy || loadError) return;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      await action();
      storageWriteSucceeded();
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'The task could not be saved. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function complete(task: WidgetTask, value: boolean) {
    if (busy || loadError) throw new Error('Wait until tasks are available.');
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const revision = await widgetTasks.complete(task.id, value);
      storageWriteSucceeded();
      return revision;
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'The task could not be updated. Try again.',
      );
      throw cause;
    } finally {
      setBusy(false);
    }
  }
  return createPortal(
    <dialog
      ref={ref}
      className="editor"
      aria-labelledby="task-list-title"
      onClose={(event) => {
        event.stopPropagation();
        onClose();
      }}
      onCancel={(event) => {
        event.stopPropagation();
        if (busy) event.preventDefault();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="task-list-title"
          className="min-w-0 break-words text-2xl font-semibold"
        >
          Tasks: {widget.label}
        </h2>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Done
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Tasks stay in this space on this device, outside bookmark backups.
        Download a copy to keep elsewhere.
      </p>
      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            await widgetTasks.save(
              widget.id,
              text,
              editing?.id,
              editing?.updatedAt,
            );
            setText('');
            setEditing(undefined);
            setMessage('Task saved.');
            focusInput.current = true;
          });
        }}
      >
        <fieldset disabled={busy} className="flex flex-col gap-3">
          <label className="field">
            Task
            <input
              ref={input}
              required
              maxLength={200}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!!loadError}>
              {editing ? 'Save task' : 'Add task'}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(undefined);
                  setText('');
                  input.current?.focus();
                }}
              >
                Cancel edit
              </Button>
            )}
          </div>
        </fieldset>
      </form>
      <ul aria-label="Tasks" className="mt-5 flex flex-col gap-3">
        {tasks?.map((task) => (
          <li
            key={task.id}
            className="min-w-0 rounded-lg border border-border p-3"
          >
            <TaskCheckbox
              task={task}
              disabled={busy || !!loadError}
              muted
              onComplete={(value) => complete(task, value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !!loadError}
                onClick={() => {
                  setEditing(task);
                  setText(task.text);
                  input.current?.focus();
                }}
                aria-label={`Edit task ${task.text}`}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !!loadError}
                onClick={() =>
                  void run(async () => {
                    await widgetTasks.remove(task.id, task.updatedAt);
                    offer([{ id: task.id, kind: 'task' }], task.text);
                    if (editing?.id === task.id) {
                      setEditing(undefined);
                      setText('');
                    }
                    setMessage('Task removed.');
                    focusInput.current = true;
                  })
                }
                aria-label={`Remove task ${task.text}`}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {tasks?.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          No tasks yet. Add one above.
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy || !tasks || !!loadError}
          onClick={() =>
            downloadWidgetText(
              taskListText(widget.label, tasks ?? []),
              'oasis-tasks.txt',
            )
          }
        >
          Download tasks
        </Button>
        <Button
          variant="outline"
          disabled={
            busy || !!loadError || !tasks?.some((task) => task.completed)
          }
          onClick={() => {
            void run(async () => {
              const removed = await widgetTasks.clearCompleted(widget.id);
              if (removed.length)
                offer(
                  removed.map((id) => ({ id, kind: 'task' })),
                  `${removed.length} tasks`,
                );
              setMessage('Completed tasks removed.');
              if (editing && removed.includes(editing.id)) {
                setEditing(undefined);
                setText('');
              }
              focusInput.current = true;
            });
          }}
        >
          Remove completed tasks
        </Button>
      </div>
      {(error || loadError) && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error || loadError}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
      )}
      <UndoNotice />
    </dialog>,
    document.body,
  );
}
