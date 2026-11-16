import { db, type OasisDatabase } from './schema';
import { requireSpace } from './records';
import { createAppearanceRepository, type Appearance } from './appearance';
export function createOnboardingRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  return {
    finish(appearance?: Appearance) {
      return database.transaction(
        'rw',
        database.spaces,
        database.preferences,
        async () => {
          await requireSpace(database, spaceId);
          if (appearance)
            await createAppearanceRepository(spaceId, database).save(
              appearance,
            );
          await database.spaces.update(spaceId, {
            setupComplete: true,
            updatedAt: Date.now(),
          });
        },
      );
    },
  };
}
