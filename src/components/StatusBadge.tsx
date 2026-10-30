import { statusTone } from '@/lib/labels';

export function StatusBadge({ status, text }: { status: string; text: string }) {
  return <span className={`badge badge-${statusTone(status)}`}>{text}</span>;
}
