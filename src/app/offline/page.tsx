export const metadata = { title: "You're offline", robots: { index: false } };

export default function OfflinePage() {
  return (
    <div className="container-page py-20 text-center">
      <h1 className="text-3xl">You&apos;re offline</h1>
      <p className="mt-3">Check your internet connection and try again. You can still WhatsApp us on 064 856 7019.</p>
    </div>
  );
}
