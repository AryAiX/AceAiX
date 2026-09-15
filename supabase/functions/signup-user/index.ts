import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SELF_ASSIGNABLE_ROLES = new Set(["athlete", "scout", "club", "coach", "medical_partner"]);

function validateDateOfBirth(value: unknown, today = new Date()): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "Date of birth must use YYYY-MM-DD";
  }

  const [year, month, day] = value.split("-").map(Number);
  const dob = new Date(Date.UTC(year, month - 1, day));
  if (
    dob.getUTCFullYear() !== year ||
    dob.getUTCMonth() !== month - 1 ||
    dob.getUTCDate() !== day
  ) {
    return "Enter a real calendar date";
  }

  const todayYear = today.getUTCFullYear();
  const todayMonth = today.getUTCMonth() + 1;
  const todayDay = today.getUTCDate();
  if (
    year > todayYear ||
    (year === todayYear && (month > todayMonth || (month === todayMonth && day > todayDay)))
  ) {
    return "Date of birth cannot be in the future";
  }

  let age = todayYear - year;
  if (todayMonth < month || (todayMonth === month && todayDay < day)) age -= 1;
  return age < 13 ? "You must be at least 13 years old to create an account" : null;
}

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

  let payload: {
    email?: string;
    password?: string;
    role?: string;
    fullName?: string;
    dateOfBirth?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password ?? "";
  const role = payload.role ?? "athlete";
  const fullName = payload.fullName?.trim() ?? "";
  const dateOfBirth = payload.dateOfBirth;

  if (!email || !email.includes("@")) return json({ error: "Enter a valid email address" }, 400);
  if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
  if (!fullName) return json({ error: "Full name is required" }, 400);
  if (!SELF_ASSIGNABLE_ROLES.has(role)) return json({ error: "Unsupported signup role" }, 400);
  const dateOfBirthError = validateDateOfBirth(dateOfBirth);
  if (dateOfBirthError) return json({ error: dateOfBirthError }, 400);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
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

  try {
    // The auth trigger provisions these rows. Upserts make persistence explicit
    // and ensure age classification has completed before the account is confirmed.
    const { error: profileError } = await admin
      .from("user_profiles")
      .upsert({ id: data.user.id, role, full_name: fullName }, { onConflict: "id" });
    if (profileError) throw profileError;

    const { error: privateError } = await admin
      .from("user_private")
      .upsert(
        { user_id: data.user.id, email, date_of_birth: dateOfBirth },
        { onConflict: "user_id" },
      );
    if (privateError) throw privateError;

    const { error: confirmError } = await admin.auth.admin.updateUserById(
      data.user.id,
      { email_confirm: true },
    );
    if (confirmError) throw confirmError;

    return json({ userId: data.user.id });
  } catch (persistenceError) {
    const reportedMessage = (persistenceError as { message?: unknown } | null)?.message;
    const message = typeof reportedMessage === "string"
      ? reportedMessage
      : "Unable to finish account setup";
    const { error: cleanupError } = await admin.auth.admin.deleteUser(data.user.id);
    if (cleanupError) {
      console.error("Failed to remove incomplete signup", {
        userId: data.user.id,
        error: cleanupError.message,
      });
    }
    return json({ error: message }, 500);
  }
});
