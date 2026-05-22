import * as legacy from '../server-legacy/storage.ts';

export * from '../server-legacy/storage.ts';
export const MemStorage = legacy.MemStorage;
export const SupabaseStorage = legacy.SupabaseStorage;
export const storage = legacy.storage;

export default legacy;