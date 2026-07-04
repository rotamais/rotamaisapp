import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_driver_status",
  title: "Get driver status",
  description:
    "Return the signed-in user's driver record (verification, suspension, vehicles). Empty when the user is not a driver.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const [{ data: driver, error: dErr }, { data: vehicles, error: vErr }] = await Promise.all([
      supabase.from("drivers").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("vehicles").select("*").eq("user_id", uid),
    ]);
    const error = dErr ?? vErr;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const payload = { driver, vehicles: vehicles ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
