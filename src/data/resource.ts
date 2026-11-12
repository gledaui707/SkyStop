export type Resource<T> =
  | { status: 'loading' } | { status: 'ready'; data: T } | { status: 'empty' } | { status: 'error'; error: string };

/** Run a database read and classify it for the UI: ready / empty / error (never success-shaped fallback data). */
export async function loadResource<T>(fn: () => Promise<T>, isEmpty: (d: T) => boolean = (d) => Array.isArray(d) && d.length === 0): Promise<Resource<T>> {
  try {
    const data = await fn();
    return isEmpty(data) ? { status: 'empty' } : { status: 'ready', data };
  } catch (e) {
    return { status: 'error', error: e instanceof Error ? e.message : String(e) };
  }
}
