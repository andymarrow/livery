import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { errorText, logger } from "@/lib/logger";

/**
 * Deletes an account: private kits and the pages measured for them (rows and
 * files), then the user, which takes their profile, saved kits and extension
 * connections with it. Published versions stay in the library, ownerless.
 */
export async function deleteAccount(userId: string) {
  const db = getAdminClient();
  const { data, error } = await db.rpc("delete_account", { p_user: userId });
  if (error) throw error;
  const { kit_files, frame_folders, frame_files } = data[0] ?? { kit_files: [], frame_folders: [], frame_files: [] };

  // Files go after the rows, so nothing points at a missing file. A file that
  // can't be removed is logged, not fatal: it's unreachable without its row.
  const screenshots = db.storage.from("screenshots");
  const inFolders = await Promise.all(frame_folders.map(async (folder) => ((await screenshots.list(folder)).data ?? []).map((f) => `${folder}/${f.name}`)));
  const removals = [
    kit_files.length ? db.storage.from("kits").remove(kit_files) : null,
    [...inFolders.flat(), ...frame_files].length ? screenshots.remove([...inFolders.flat(), ...frame_files]) : null,
  ];
  for (const result of await Promise.all(removals)) {
    if (result?.error) logger.warn("account.files_left", { error: errorText(result.error) });
  }

  const deleted = await db.auth.admin.deleteUser(userId);
  if (deleted.error) throw deleted.error;
  logger.info("account.deleted", { privateVersions: frame_folders.length, capturePictures: frame_files.length });
}
