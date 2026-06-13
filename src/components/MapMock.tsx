import { Car, MapPin, Navigation } from "lucide-react";
import { useMemo } from "react";

type Driver = { id: string; top: string; left: string; angle?: number };

export function MapMock({
  pin,
  showDrivers = true,
  searching = false,
  className = "",
}: {
  pin?: { label?: string };
  showDrivers?: boolean;
  searching?: boolean;
  className?: string;
}) {
  const drivers = useMemo<Driver[]>(
    () => [
      { id: "1", top: "20%", left: "30%", angle: 20 },
      { id: "2", top: "55%", left: "70%", angle: -45 },
      { id: "3", top: "70%", left: "25%", angle: 120 },
      { id: "4", top: "35%", left: "60%", angle: 200 },
      { id: "5", top: "80%", left: "55%", angle: 0 },
    ],
    [],
  );

  return (
    <div className={`rm-map rm-grid relative overflow-hidden ${className}`}>
      {/* Fake roads */}
      <svg className="absolute inset-0 size-full" viewBox="0 0 400 600" preserveAspectRatio="none">
        <path d="M0,120 C150,80 250,200 400,150" stroke="oklch(0 0 0 / 0.10)" strokeWidth="14" fill="none" />
        <path d="M0,320 C120,360 280,260 400,340" stroke="oklch(0 0 0 / 0.10)" strokeWidth="14" fill="none" />
        <path d="M180,0 L220,600" stroke="oklch(0 0 0 / 0.10)" strokeWidth="14" fill="none" />
        <path d="M0,120 C150,80 250,200 400,150" stroke="oklch(1 0 0 / 0.6)" strokeWidth="2" strokeDasharray="6 8" fill="none" />
      </svg>

      {showDrivers &&
        drivers.map((d) => (
          <div
            key={d.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ top: d.top, left: d.left }}
          >
            <div
              className="grid size-8 place-items-center rounded-full bg-secondary text-primary shadow-[var(--shadow-soft)]"
              style={{ transform: `rotate(${d.angle ?? 0}deg)` }}
            >
              <Car className="size-4" />
            </div>
          </div>
        ))}

      {/* Center pin */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {searching ? (
          <div className="relative size-5">
            <span className="rm-pulse absolute inset-0 block size-5 rounded-full" />
            <span className="relative z-10 block size-5 rounded-full bg-primary ring-4 ring-background" />
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <MapPin className="size-7 fill-primary text-secondary drop-shadow" />
            {pin?.label && (
              <span className="mt-1 rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-semibold shadow">
                {pin.label}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Compass */}
      <div className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-background/90 shadow-[var(--shadow-soft)]">
        <Navigation className="size-4 text-secondary" />
      </div>
    </div>
  );
}
