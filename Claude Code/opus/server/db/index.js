// Picks a storage adapter. Both expose the same repository interface.
export async function openStore({ dataDir, store = 'auto' }) {
  if (store === 'json') return (await import('./jsonstore.js')).openJsonStore(dataDir);
  try {
    return await (await import('./sqlite.js')).openSqlite(dataDir);
  } catch (err) {
    if (store === 'sqlite') throw err;
    if (err.code !== 'ERR_UNKNOWN_BUILTIN_MODULE' && !/node:sqlite/.test(String(err.message))) throw err;
    console.warn('[db] node:sqlite unavailable on this Node version — falling back to JSON file store.');
    return (await import('./jsonstore.js')).openJsonStore(dataDir);
  }
}
