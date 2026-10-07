import "server-only";
import { revalidatePath } from "next/cache";

/**
 * After a new version publishes, cached kit pages (including older versions,
 * which now point to the newer one) and the library are rendered again.
 */
export function refreshKitPages() {
  try {
    revalidatePath("/k/[slug]/[version]", "page");
    revalidatePath("/explore");
    revalidatePath("/");
  } catch {
    // Outside a request (scripts, tests): nothing is cached.
  }
}
