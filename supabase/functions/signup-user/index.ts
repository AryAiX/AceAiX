import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SELF_ASSIGNABLE_ROLES = new Set(["athlete", "scout", "club", "medical_partner"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Signup service is not configured" }, 500);

  let payload: { email?: string; password?: string; role?: string; fullName?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password ?? "";
  const role = payload.role ?? "athlete";
  const fullName = payload.fullName?.trim() ?? "";

  if (!email || !email.includes("@")) return json({ error: "Enter a valid email address" }, 400);
  if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
  if (!fullName) return json({ error: "Full name is required" }, 400);
  if (!SELF_ASSIGNABLE_ROLES.has(role)) return json({ error: "Unsupported signup role" }, 400);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (error) {
    const alreadyExists = /already|registered|exists/i.test(error.message);
    return json(
      { error: alreadyExists ? "An account with this email already exists. Sign in instead." : error.message },
      alreadyExists ? 409 : 400,
    );
  }

  if (!data.user) return json({ error: "Unable to create account" }, 500);

  // The auth trigger provisions this too, but upsert keeps the function idempotent
  // if trigger execution is delayed.
  const { error: profileError } = await admin
    .from("user_profiles")
    .upsert({ id: data.user.id, role, full_name: fullName }, { onConflict: "id" });

  if (profileError) return json({ error: profileError.message }, 500);

  return json({ userId: data.user.id });
});
