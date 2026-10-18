import Link from "next/link";
import { AdminTitle } from "@/components/admin/AdminUi";

export const metadata = { title: "Owner's guide" };

const SECTIONS: { title: string; steps: React.ReactNode[] }[] = [
  {
    title: "Adding a guitar to the shop",
    steps: [
      <>Go to <Link className="link" href="/admin/products/new">Inventory → Add product</Link>, fill in the details and save (it starts as a Draft).</>,
      "Upload photos on the next screen. Use the arrows to choose the main photo.",
      "Describe defects honestly — they are shown in a highlighted box.",
      "Change the status to Available and save. It's now live.",
    ],
  },
  {
    title: "Handling a purchase request",
    steps: [
      "You'll see it under Purchase requests (and in Notifications).",
      "Contact the customer with the WhatsApp button. Agree payment (EFT) and collection.",
      "Set the status (e.g. Accepted → Awaiting payment) and write a message — the customer sees it in their account.",
      "Only after approval, use “+ Collection address” / “+ Bank details” to share private details.",
      "Once paid, set Completed and click “Mark these items as sold”.",
    ],
  },
  {
    title: "Reservations",
    steps: [
      "Requests are never confirmed automatically. Open the reservation and click Approve (choose the hold period) or Decline.",
      "Approving marks the item as Reserved. Holds expire automatically and the item becomes available again.",
      "If they buy it, mark the product as Sold — the reservation closes automatically.",
    ],
  },
  {
    title: "Guitars people want to sell",
    steps: [
      "Review the details and photos. Ask for more information if needed (status “More information requested”).",
      "Invite them for inspection (“Approved for inspection”).",
      "Make an offer with an amount and optional expiry date. The seller accepts or declines in their account.",
      "After buying it, set the status to Purchased and add it to your inventory.",
    ],
  },
  {
    title: "Repairs",
    steps: [
      "Review the request, then enter a quote amount and details and set “Quote provided”.",
      "The customer accepts or declines. Accepting does NOT start work — you set “Approved”, then “In progress”.",
      "Enter a confirmed appointment only once agreed. Set “Awaiting collection” when ready, then “Completed”.",
    ],
  },
  {
    title: "Reviews, messages and privacy",
    steps: [
      "Approve or reject reviews under Reviews. Nothing is published without your approval.",
      "Contact-form messages appear under Messages.",
      "Account deletion requests appear under Customers & privacy → Privacy requests.",
    ],
  },
  {
    title: "Before launch",
    steps: [
      "Remove demo data (Settings).",
      "Have the policies reviewed, then paste final versions under Website content.",
      "Add your collection address and bank details under Settings (private).",
      "Set up daily backups (docs/BACKUP_AND_RESTORE.md).",
    ],
  },
];

export default function GuidePage() {
  return (
    <div className="max-w-3xl space-y-5">
      <AdminTitle title="Owner's guide">Quick reminders for everyday tasks. The full guides are in the docs folder of the project.</AdminTitle>
      {SECTIONS.map((s) => (
        <section key={s.title} className="card p-5">
          <h2 className="text-xl">{s.title}</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
            {s.steps.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </section>
      ))}
    </div>
  );
}
