import { db } from './schema';
import { personalBookmarks } from './bookmarks';
import { personalOrganization } from './organization';

export function getPersonalLibrary() {
  return db.transaction(
    'r',
    db.spaces,
    db.bookmarks,
    db.folders,
    db.tags,
    async () => {
      const [bookmarks, organization] = await Promise.all([
        personalBookmarks.list(),
        personalOrganization.list(),
      ]);
      return { bookmarks, ...organization };
    },
  );
}
