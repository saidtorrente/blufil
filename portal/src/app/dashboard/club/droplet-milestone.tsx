const FORMA_GOTA = "M12 2C12 2 5 11 5 15.5C5 19.09 8.13 22 12 22C15.87 22 19 19.09 19 15.5C19 11 12 2 12 2Z";

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
    <div className="group relative flex flex-col items-center">
      <span
        className={`pointer-events-none absolute -top-7 whitespace-nowrap rounded-md bg-[#123C5B] px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100`}
      >
        {nivel}%
      </span>
      <div className={`relative ${esActual ? "animate-pulse" : ""}`}>
        {esActual && (
          <span className="absolute inset-0 -m-1 rounded-full ring-2 ring-[#1EBBEB]/50" />
        )}
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7 transition-transform duration-200 group-hover:-translate-y-1 group-hover:scale-125"
        >
          <path
            d={FORMA_GOTA}
            fill={alcanzado ? "#1EBBEB" : "#eaf7fb"}
            stroke={alcanzado ? "#123C5B" : "#d4dfe3"}
            strokeWidth="1.2"
          />
          {alcanzado && <ellipse cx="9.5" cy="12.5" rx="1.6" ry="2.2" fill="white" opacity="0.55" />}
        </svg>
      </div>
    </div>
  );
}
