export function Logo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-xl bg-secondary"
      style={{ width: size, height: size }}
    >
      <span className="font-extrabold text-primary" style={{ fontSize: size * 0.42 }}>R+</span>
    </div>
  );
}
