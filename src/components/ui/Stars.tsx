import { Star } from "lucide-react";

export function Stars({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= rating ? "fill-gold text-gold" : "text-gold/40"}`} aria-hidden />
      ))}
    </span>
  );
}
