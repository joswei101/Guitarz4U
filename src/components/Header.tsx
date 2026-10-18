import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { queryOne } from "@/lib/db";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  let unread = 0;
  if (user) {
    const row = await queryOne<{ n: number }>(
      user.role === "admin"
        ? "select count(*)::int as n from notifications where audience='admin' and read_at is null"
        : "select count(*)::int as n from notifications where audience='user' and user_id=$1 and read_at is null",
      user.role === "admin" ? [] : [user.id],
    );
    unread = row?.n ?? 0;
  }
  return (
    <>
      {settings.announcement && <div className="announcement" role="note">{settings.announcement}</div>}
      <HeaderClient
        user={user ? { name: user.name, role: user.role } : null}
        unread={unread}
      />
    </>
  );
}
