import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PublicReview = {
  id: string;
  reviewer_name: string;
  rating: number;
  title: string;
  body: string;
  is_verified_buyer: boolean;
  created_at: string;
};

export async function getApprovedReviews(limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, reviewer_name, rating, title, body, is_verified_buyer, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as PublicReview[];
}
