let accountId = null;
export function setStorageAccount(id) { accountId = id || null; }
export function accountStorageKey(key) { return accountId ? `${key}.account.${accountId}` : key; }