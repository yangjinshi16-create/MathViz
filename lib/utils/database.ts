export async function clearDatabase() {
  try {
    if (typeof indexedDB === 'undefined') return;
    await Promise.resolve();
  } catch {
    await Promise.resolve();
  }
}
