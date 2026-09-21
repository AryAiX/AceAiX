import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { handlePreflight, json } from "../_shared/http.ts";

const USER_BUCKETS = ["avatars", "posts", "stories"] as const;

async function removeFolder(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<void> {
  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: 100,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data?.length) return;

    const files: string[] = [];
    for (const item of data) {
      const path = `${prefix}/${item.name}`;
      if (item.id) files.push(path);
      else await removeFolder(admin, bucket, path);
    }
    if (files.length) {
      const { error: removeError } = await admin.storage.from(bucket).remove(files);
      if (removeError) throw removeError;
    }
  }
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Account deletion service is not configured" }, 500);
  }
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Authentication required" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice("Bearer ".length);
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Invalid session" }, 401);

  try {
    for (const bucket of USER_BUCKETS) {
      await removeFolder(admin, bucket, authData.user.id);
    }
    const { error } = await admin.auth.admin.deleteUser(authData.user.id);
    if (error) throw error;
    return json({ deleted: true });
  } catch (error) {
    console.error("delete-account failed", error);
    return json({ error: "Account deletion failed" }, 500);
  }
});
