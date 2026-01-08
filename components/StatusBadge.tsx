type Status = "green" | "yellow" | "red";

interface StatusBadgeProps {
  status: Status;
  size?: "sm" | "md" | "lg";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const statusConfig = {
    green: {
      label: "Road Ready",
      classes: "bg-green-100 text-green-800 border-green-200",
    },
    yellow: {
      label: "Expiring Soon",
      classes: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    red: {
      label: "Not Road Ready",
      classes: "bg-red-100 text-red-800 border-red-200",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
