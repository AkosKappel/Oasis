import { db, type OasisDatabase } from './schema';
import { requireSpace } from './records';
import type { RecordMetadata } from '@/types/entities';
export interface FocusSession extends RecordMetadata {
  spaceId: string;
  state: 'running' | 'paused' | 'ended';
  endsAt: number;
  remaining: number;
}
export function focusRemaining(session: FocusSession, now: number) {
  return session.state === 'ended'
    ? 0
    : session.state === 'paused'
      ? session.remaining
      : Math.max(0, session.endsAt - now);
}
export function timerText(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function createFocusSessionRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  const id = `${spaceId}:focus-session`;
  async function current() {
    const existing = await database.focusSessions.get(id);
    if (
      existing &&
      (existing.spaceId !== spaceId || existing.deletedAt !== undefined)
    )
      throw new Error('This focus session is unavailable.');
    return existing;
  }
  return {
    async get() {
      return database.transaction(
        'r',
        database.spaces,
        database.focusSessions,
        async () => {
          await requireSpace(database, spaceId);
          return current();
        },
      );
    },
    async start(minutes: number) {
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120)
        throw new Error('Choose a focus session from 1 to 120 minutes.');
      await database.transaction(
        'rw',
        database.spaces,
        database.focusSessions,
        async () => {
          await requireSpace(database, spaceId);
          const existing = await current();
          const now = Date.now();
          if (
            existing &&
            existing.state !== 'ended' &&
            focusRemaining(existing, now) > 0
          )
            throw new Error('End the current session before starting another.');
          await database.focusSessions.put({
            id,
            spaceId,
            state: 'running',
            endsAt: now + minutes * 60_000,
            remaining: minutes * 60_000,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          });
        },
      );
    },
    async change(action: 'pause' | 'resume' | 'end') {
      if (!['pause', 'resume', 'end'].includes(action))
        throw new Error('Choose a valid timer action.');
      await database.transaction(
        'rw',
        database.spaces,
        database.focusSessions,
        async () => {
          await requireSpace(database, spaceId);
          const existing = await current();
          if (!existing) throw new Error('Start a focus session first.');
          const now = Date.now(),
            remaining = focusRemaining(existing, now);
          if (
            action === 'pause' &&
            existing.state === 'running' &&
            remaining > 0
          )
            await database.focusSessions.update(id, {
              state: 'paused',
              remaining,
              updatedAt: now,
            });
          else if (
            action === 'resume' &&
            existing.state === 'paused' &&
            remaining > 0
          )
            await database.focusSessions.update(id, {
              state: 'running',
              endsAt: now + remaining,
              updatedAt: now,
            });
          else if (action === 'end')
            await database.focusSessions.update(id, {
              state: 'ended',
              remaining: 0,
              updatedAt: now,
            });
        },
      );
    },
  };
}
export const personalFocusSession = createFocusSessionRepository('default');
