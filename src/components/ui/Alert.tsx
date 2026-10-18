import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

const styles = {
  info: { cls: "border-info/30 bg-[#e8f0f6] text-info", Icon: Info },
  success: { cls: "border-success/30 bg-[#e6f2ea] text-success", Icon: CheckCircle2 },
  warning: { cls: "border-warning/30 bg-[#f8ecd2] text-warning", Icon: AlertTriangle },
  error: { cls: "border-danger/30 bg-[#f8e2de] text-danger", Icon: XCircle },
};

export function Alert({
  tone = "info",
  title,
  children,
  className = "",
}: {
  tone?: keyof typeof styles;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { cls, Icon } = styles[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex gap-3 rounded-lg border p-4 text-sm leading-relaxed ${cls} ${className}`}
    >
      <Icon className="mt-0.5 h-5 w-5 flex-none" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-1" : ""}>{children}</div>}
      </div>
    </div>
  );
}
