import {
  createClient,
  type SupabaseClient,
  type User,
} from "jsr:@supabase/supabase-js@2";

function publishableKey(): string | null {
  const legacyKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacyKey) return legacyKey;

  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    return typeof keys.default === "string" ? keys.default : null;
  } catch {
    return null;
  }
}

function secretKey(): string | null {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;

  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    return typeof keys.default === "string" ? keys.default : null;
  } catch {
    return null;
  }
}

export function serviceClient(): SupabaseClient | null {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const key = secretKey();
  if (!supabaseUrl || !key) return null;
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function authenticatedClient(
  req: Request,
): Promise<
  { client: SupabaseClient; user: User } | { error: string; status: number }
> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const key = publishableKey();
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !key) {
    return { error: "Performance sync service is not configured", status: 503 };
  }
  if (!authorization?.startsWith("Bearer ")) {
    return { error: "Authentication required", status: 401 };
  }

  const client = createClient(supabaseUrl, key, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user)
    return { error: "Invalid or expired session", status: 401 };

  return { client, user: data.user };
}
