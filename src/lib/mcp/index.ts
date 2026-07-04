import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMyRides from "./tools/list-my-rides";
import getDriverStatus from "./tools/get-driver-status";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "rotamais-mcp",
  title: "RotaMais",
  version: "0.1.0",
  instructions:
    "Tools for the RotaMais mobility app. Use `get_my_profile` for the signed-in user, `list_my_rides` for ride history, and `get_driver_status` to check driver verification and vehicles.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listMyRides, getDriverStatus],
});
