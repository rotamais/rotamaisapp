import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const url = process.env.VITE_SUPABASE_URL || "";
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

console.log("Supabase URL:", url);

async function main() {
  const supabase = createClient(url, anonKey);

  console.log("Querying drivers...");
  const { data: drivers, error: dErr } = await supabase.from("drivers").select("*");
  if (dErr) {
    console.error("Drivers error:", dErr);
  } else {
    console.log("Drivers count:", drivers?.length);
    console.log("Drivers data:", JSON.stringify(drivers, null, 2));
  }

  console.log("Querying profiles...");
  const { data: profiles, error: pErr } = await supabase.from("profiles").select("*");
  if (pErr) {
    console.error("Profiles error:", pErr);
  } else {
    console.log("Profiles count:", profiles?.length);
    console.log("Profiles data:", JSON.stringify(profiles, null, 2));
  }
}

main().catch(console.error);
