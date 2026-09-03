export function DropletMilestone({
  nivel,
  alcanzado,
  esActual,
}: {
  nivel: number;
  alcanzado: boolean;
  esActual: boolean;
}) {
  return (
    <div className="group flex flex-col items-center gap-1.5">
      <div className={`relative ${esActual ? "animate-pulse" : ""}`}>
        {esActual && (
          <span className="absolute inset-0 -m-1.5 rounded-full ring-2 ring-[#1EBBEB]/50" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/gota-blufil.png"
          alt=""
          className={`h-8 w-8 transition-transform duration-200 group-hover:-translate-y-1 group-hover:scale-125 ${
            alcanzado ? "" : "opacity-30 grayscale"
          }`}
        />
      </div>
      <span
        className={`text-xs font-semibold ${alcanzado ? "text-[#123C5B]" : "text-neutral-300"}`}
      >
        {nivel}%
      </span>
    </div>
  );
}
