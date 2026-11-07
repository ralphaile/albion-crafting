import type { Region } from "./aodp.types.js";
import { snapshotPath } from "./snapshot.helpers.js";
import { snapshotSchema } from "./snapshot.schema.js";
import type { PriceSnapshot } from "./snapshot.types.js";

export type ReadSnapshot = (
  region: Region,
  marketId: string,
) => Promise<PriceSnapshot | undefined>;

// Downloads each file once, when it's first asked for. A file that's missing or
// doesn't fit counts as no snapshot.
export function snapshotReader(
  baseUrl: string,
  fetchFile: typeof fetch = fetch,
): ReadSnapshot {
  const files = new Map<string, Promise<PriceSnapshot | undefined>>();

  async function download(path: string) {
    try {
      const response = await fetchFile(`${baseUrl}${path}`);
      if (!response.ok) {
        return undefined;
      }
      const parsed = snapshotSchema.safeParse(await response.json());
      return parsed.success ? parsed.data : undefined;
    } catch {
      return undefined;
    }
  }

  return (region, marketId) => {
    const path = snapshotPath(region, marketId);
    let file = files.get(path);
    if (file === undefined) {
      file = download(path);
      files.set(path, file);
    }
    return file;
  };
}
