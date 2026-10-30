import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { ReviewForm } from '@/components/PublicForms';
import { getProfile, getUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';
import { REVIEW_TOPICS, label } from '@/lib/labels';

export const metadata: Metadata = {
  title: 'Customer reviews',
  description: 'Genuine, moderated reviews from Guitarz4U customers.',
  alternates: { canonical: '/reviews' },
};

export default async function ReviewsPage() {
  const supabase = await createClient();
  const [{ data }, user, profile] = await Promise.all([
    supabase.from('reviews').select('id, display_name, rating, title, body, related_to, created_at')
      .eq('status', 'approved').order('created_at', { ascending: false }).limit(100),
    getUser(), getProfile(),
  ]);
  const reviews = data ?? [];
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return (
    <>
      <PageHero title="Customer reviews" intro="Every review comes from a registered customer and is checked by the owner before it appears. We never write or buy reviews." crumb="Reviews" />
      <div className="section">
        <div className="wrap grid-main-side">
          <div className="stack">
            {reviews.length ? (
              <>
                <p><strong>{avg.toFixed(1)} out of 5</strong> from {reviews.length} review{reviews.length === 1 ? '' : 's'}.</p>
                {reviews.map((r) => (
                  <article key={r.id} className="review">
                    <div className="stars" aria-label={`${r.rating} out of 5 stars`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                    {r.title ? <h2 style={{ fontSize: '1.15rem', marginTop: 6 }}>{r.title}</h2> : null}
                    <p style={{ whiteSpace: 'pre-line' }}>{r.body}</p>
                    <p className="small muted">— {r.display_name} · {label(REVIEW_TOPICS, r.related_to)} · {formatDate(r.created_at)}</p>
                  </article>
                ))}
              </>
            ) : (
              <div className="empty-state">
                <h2>No reviews yet</h2>
                <p>Guitarz4U is a new shop, so there are no published reviews yet. If you&apos;ve bought, sold or had a guitar repaired with us, we&apos;d really appreciate your honest feedback.</p>
              </div>
            )}
          </div>
          <div>
            {user ? <ReviewForm defaultName={profile?.full_name?.split(' ')[0]} /> : (
              <div className="card">
                <h2>Write a review</h2>
                <p>Reviews can only be written by registered customers.</p>
                <div className="row"><Link href="/auth/login?next=/reviews" className="btn btn-primary">Sign in</Link><Link href="/auth/register?next=/reviews" className="btn btn-outline">Register</Link></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
