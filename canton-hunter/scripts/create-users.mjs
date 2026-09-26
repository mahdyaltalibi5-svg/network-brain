// Create the 3 team accounts (signups are disabled, so this is the only way in).
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/create-users.mjs "Mahdy:mahdy@example.com:password1" "Uncle:uncle@example.com:password2" "Shabab:shabab@example.com:password3"
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
const sb = createClient(url, key, { auth: { persistSession: false } });
const colors = ["#FF6B35", "#3DDC97", "#4EA8DE", "#F7B801", "#C77DFF"];

for (const [i, arg] of process.argv.slice(2).entries()) {
  const [name, email, password] = arg.split(":");
  if (!name || !email || !password) throw new Error(`Bad arg "${arg}". Use Name:email:password`);
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (error) { console.error(`✗ ${email}: ${error.message}`); continue; }
  // the on_auth_user_created trigger makes the profile; set a color
  await sb.from("profiles").update({ name, color: colors[i % colors.length] }).eq("id", data.user.id);
  console.log(`✓ ${name} <${email}>`);
}
