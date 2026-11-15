import { db } from './schema';
import { createBookmarkRepository } from './bookmarks';
import { createOrganizationRepository } from './organization';

export function getPersonalLibrary(spaceId = 'default') {
  return db.transaction(
    'r',
    db.spaces,
    db.bookmarks,
    db.folders,
    db.tags,
    async () => {
      const [bookmarks, organization] = await Promise.all([
        createBookmarkRepository(spaceId).list(),
        createOrganizationRepository(spaceId).list(),
      ]);
      return { bookmarks, ...organization };
    },
  );
}
