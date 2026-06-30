const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(process.cwd(), '.env');
const envText = fs.readFileSync(envPath, 'utf8');
const parse = (text) => Object.fromEntries(text.split(/\r?\n/).filter(Boolean).map((line) => {
  const i = line.indexOf('=');
  if (i < 0) return null;
  const k = line.slice(0, i).trim();
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return [k, v];
}).filter(Boolean));

const env = parse(envText);
const supabase = createClient(env.SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

(async () => {
  const email = 'rotamais@rotamais.app';
  const password = '12345678@';
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: 'rotamais', phone: '00000000000' } },
  });

  console.log(JSON.stringify({
    user: data?.user ? { id: data.user.id, email: data.user.email, confirmed_at: data.user.confirmed_at } : null,
    session: data?.session ? true : false,
    error,
  }, null, 2));

  if (!error) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    console.log(JSON.stringify({ signIn: signInData?.user ? { id: signInData.user.id, email: signInData.user.email } : null, signInError }, null, 2));
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
