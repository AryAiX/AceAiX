import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEMO_USERS = [
  { email: "athlete@aceaix.demo", password: "demo123456", full_name: "Demo Athlete", role: "athlete" },
  { email: "scout@aceaix.demo",   password: "demo123456", full_name: "Demo Scout",   role: "scout"   },
  { email: "admin@aceaix.demo",   password: "demo123456", full_name: "Demo Admin",   role: "admin"   },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Record<string, string> = {};

  for (const demo of DEMO_USERS) {
    // Check if user already exists
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email === demo.email);

    if (found) {
      results[demo.email] = "already exists";
      continue;
    }

    // Create via Admin API (handles all required fields correctly)
    const { data, error } = await admin.auth.admin.createUser({
      email: demo.email,
      password: demo.password,
      email_confirm: true,
      user_metadata: { full_name: demo.full_name },
    });

    if (error) {
      results[demo.email] = `error: ${error.message}`;
      continue;
    }

    // Insert profile row
    const userId = data.user.id;
    const { error: profileError } = await admin
      .from("user_profiles")
      .upsert({
        id: userId,
        role: demo.role,
        full_name: demo.full_name,
        email: demo.email,
        is_verified: true,
      });

    results[demo.email] = profileError ? `profile error: ${profileError.message}` : "created";
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
