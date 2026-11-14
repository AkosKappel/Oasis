import { db, type OasisDatabase } from './schema';
import { requireOwnedRecord, requireSpace, requireUniqueName } from './records';
import type { Quote, QuoteCollection } from '@/types/entities';
export interface QuoteInput {
  text: string;
  author: string;
}
export interface QuoteArchive {
  format: 'oasis-quotes';
  version: 1;
  collections: QuoteCollection[];
  quotes: Quote[];
}
function collectionName(name: string) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80)
    throw new Error('Keep collection names between 1 and 80 characters.');
  return name.trim();
}
export function validateQuote(input: QuoteInput): QuoteInput {
  if (
    typeof input.text !== 'string' ||
    !input.text.trim() ||
    input.text.trim().length > 500 ||
    typeof input.author !== 'string' ||
    input.author.trim().length > 120
  )
    throw new Error(
      'Enter a quote of up to 500 characters and an optional author of up to 120 characters.',
    );
  return { text: input.text.trim(), author: input.author.trim() };
}
function metadata(value: QuoteCollection | Quote) {
  if (
    !value ||
    typeof value.id !== 'string' ||
    !value.id ||
    value.id.length > 200 ||
    value.spaceId !== 'default' ||
    value.deletedAt !== undefined ||
    !Number.isSafeInteger(value.createdAt) ||
    value.createdAt < 0 ||
    !Number.isSafeInteger(value.updatedAt) ||
    value.updatedAt < 0
  )
    throw new Error('The quote backup contains invalid records.');
  return {
    id: value.id,
    spaceId: 'default',
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}
export function validateQuoteArchive(input: QuoteArchive): QuoteArchive {
  if (
    !input ||
    input.format !== 'oasis-quotes' ||
    input.version !== 1 ||
    !Array.isArray(input.collections) ||
    !Array.isArray(input.quotes) ||
    input.collections.length > 50 ||
    input.quotes.length > 2000
  )
    throw new Error(
      'Choose an Oasis quote backup with up to 50 collections and 2,000 quotes.',
    );
  const collections = input.collections.map((collection) => ({
    ...metadata(collection),
    name: collectionName(collection.name),
  }));
  const quotes = input.quotes.map((quote) => ({
    ...metadata(quote),
    ...validateQuote(quote),
    collectionId: quote.collectionId,
  }));
  const ids = new Set(collections.map((collection) => collection.id));
  if (
    ids.size !== collections.length ||
    new Set(collections.map((collection) => collection.name.toLowerCase()))
      .size !== collections.length ||
    new Set(quotes.map((quote) => quote.id)).size !== quotes.length ||
    quotes.some((quote) => !ids.has(quote.collectionId))
  )
    throw new Error(
      'The quote backup contains duplicate names, IDs or missing collections.',
    );
  return { format: 'oasis-quotes', version: 1, collections, quotes };
}
export function createQuoteRepository(
  spaceId: string,
  database: OasisDatabase = db,
) {
  const settingsId = `${spaceId}:quotes`;
  async function active() {
    const [collections, quotes] = await Promise.all([
      database.quoteCollections
        .where('spaceId')
        .equals(spaceId)
        .filter((item) => item.deletedAt === undefined)
        .sortBy('name'),
      database.quotes
        .where('spaceId')
        .equals(spaceId)
        .filter((item) => item.deletedAt === undefined)
        .sortBy('createdAt'),
    ]);
    return { collections, quotes };
  }
  async function settings() {
    const value = await database.quoteSettings.get(settingsId);
    if (value && (value.spaceId !== spaceId || value.deletedAt !== undefined))
      throw new Error('Quote settings are unavailable.');
    return value;
  }
  return {
    async list() {
      return database.transaction(
        'r',
        database.spaces,
        database.quoteCollections,
        database.quotes,
        database.quoteSettings,
        async () => {
          await requireSpace(database, spaceId);
          return { ...(await active()), settings: await settings() };
        },
      );
    },
    async saveCollection(name: string, id?: string) {
      const value = collectionName(name);
      return database.transaction(
        'rw',
        database.spaces,
        database.quoteCollections,
        async () => {
          await requireSpace(database, spaceId);
          if (id)
            await requireOwnedRecord(
              database.quoteCollections,
              id,
              spaceId,
              'collection',
            );
          await requireUniqueName(
            database.quoteCollections,
            spaceId,
            value,
            id,
            'collection',
          );
          const now = Date.now();
          if (id) {
            await database.quoteCollections.update(id, {
              name: value,
              updatedAt: now,
            });
            return id;
          }
          if (
            (await database.quoteCollections
              .where('spaceId')
              .equals(spaceId)
              .filter((item) => item.deletedAt === undefined)
              .count()) >= 50
          )
            throw new Error('Keep up to 50 quote collections.');
          const collection = {
            id: crypto.randomUUID(),
            spaceId,
            name: value,
            createdAt: now,
            updatedAt: now,
          };
          await database.quoteCollections.add(collection);
          return collection.id;
        },
      );
    },
    async saveQuote(collectionId: string, input: QuoteInput, id?: string) {
      const values = validateQuote(input);
      return database.transaction(
        'rw',
        database.spaces,
        database.quoteCollections,
        database.quotes,
        async () => {
          await requireSpace(database, spaceId);
          await requireOwnedRecord(
            database.quoteCollections,
            collectionId,
            spaceId,
            'collection',
          );
          const now = Date.now();
          if (id) {
            const existing = await requireOwnedRecord(
              database.quotes,
              id,
              spaceId,
              'quote',
            );
            if (existing.collectionId !== collectionId)
              throw new Error('This quote belongs to another collection.');
            await database.quotes.update(id, { ...values, updatedAt: now });
            return id;
          }
          if (
            (await database.quotes
              .where('spaceId')
              .equals(spaceId)
              .filter((quote) => quote.deletedAt === undefined)
              .count()) >= 2000
          )
            throw new Error('Keep up to 2,000 quotes.');
          const quote = {
            ...values,
            id: crypto.randomUUID(),
            spaceId,
            collectionId,
            createdAt: now,
            updatedAt: now,
          };
          await database.quotes.add(quote);
          return quote.id;
        },
      );
    },
    async setDisplay(collectionId: string | undefined, visible: boolean) {
      if (typeof visible !== 'boolean')
        throw new Error('Choose whether to show quotes.');
      await database.transaction(
        'rw',
        database.spaces,
        database.quoteCollections,
        database.quoteSettings,
        async () => {
          await requireSpace(database, spaceId);
          if (collectionId)
            await requireOwnedRecord(
              database.quoteCollections,
              collectionId,
              spaceId,
              'collection',
            );
          const existing = await settings();
          const now = Date.now();
          await database.quoteSettings.put({
            id: settingsId,
            spaceId,
            collectionId,
            visible,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          });
        },
      );
    },
    async remove(id: string, kind: 'quote' | 'collection') {
      await database.transaction(
        'rw',
        database.spaces,
        database.quoteCollections,
        database.quotes,
        database.quoteSettings,
        async () => {
          await requireSpace(database, spaceId);
          const now = Date.now();
          if (kind === 'quote') {
            await requireOwnedRecord(database.quotes, id, spaceId, 'quote');
            await database.quotes.update(id, {
              deletedAt: now,
              updatedAt: now,
            });
          } else {
            await requireOwnedRecord(
              database.quoteCollections,
              id,
              spaceId,
              'collection',
            );
            await database.quoteCollections.update(id, {
              deletedAt: now,
              updatedAt: now,
            });
            await database.quotes
              .where('[spaceId+collectionId]')
              .equals([spaceId, id])
              .filter((quote) => quote.deletedAt === undefined)
              .modify({ deletedAt: now, updatedAt: now });
            const display = await settings();
            if (display?.collectionId === id)
              await database.quoteSettings.update(settingsId, {
                collectionId: undefined,
                visible: false,
                updatedAt: now,
              });
          }
        },
      );
    },
    async export(): Promise<QuoteArchive> {
      const data = await this.list();
      return validateQuoteArchive({
        format: 'oasis-quotes',
        version: 1,
        ...data,
      });
    },
    async restore(input: QuoteArchive) {
      const archive = validateQuoteArchive(input);
      await database.transaction(
        'rw',
        database.spaces,
        database.quoteCollections,
        database.quotes,
        async () => {
          await requireSpace(database, spaceId);
          if (spaceId !== 'default')
            throw new Error('Quote backups restore to Personal only.');
          const current = await active();
          const collections = [...current.collections];
          const quotes = [...current.quotes];
          const addedCollections: QuoteCollection[] = [];
          const addedQuotes: Quote[] = [];
          for (const collection of archive.collections) {
            const existing = await database.quoteCollections.get(collection.id);
            if (existing) {
              if (
                existing.spaceId !== spaceId ||
                existing.deletedAt !== undefined
              )
                throw new Error('A collection backup ID is unavailable.');
            } else {
              collections.push(collection);
              addedCollections.push(collection);
            }
          }
          for (const quote of archive.quotes) {
            const existing = await database.quotes.get(quote.id);
            if (existing) {
              if (
                existing.spaceId !== spaceId ||
                existing.deletedAt !== undefined ||
                existing.collectionId !== quote.collectionId
              )
                throw new Error('A quote backup ID is unavailable.');
            } else {
              quotes.push(quote);
              addedQuotes.push(quote);
            }
          }
          validateQuoteArchive({
            format: 'oasis-quotes',
            version: 1,
            collections,
            quotes,
          });
          await database.quoteCollections.bulkAdd(addedCollections);
          await database.quotes.bulkAdd(addedQuotes);
        },
      );
    },
  };
}
export const personalQuotes = createQuoteRepository('default');
