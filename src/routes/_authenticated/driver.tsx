import { createFileRoute } from "@tanstack/react-router";
import { DriverPremiumScreen } from "@/components/DriverPremiumScreen";

export const Route = createFileRoute("/_authenticated/driver")({
  component: DriverPremiumScreen,
});
