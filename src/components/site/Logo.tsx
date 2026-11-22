import Image from "next/image";

/** Original TELEFON UZB round logo, kept unmodified (only masked to its circle). */
export default function Logo({ src, size = 40, priority = false, className = "" }: { src: string; size?: number; priority?: boolean; className?: string }) {
  return (
    <span className={`relative inline-block shrink-0 overflow-hidden rounded-full ${className}`} style={{ width: size, height: size }}>
      <Image src={src} alt="TELEFON UZB" width={size * 2} height={size * 2} priority={priority} className="h-full w-full object-cover" unoptimized={src.endsWith(".webp")} />
    </span>
  );
}
