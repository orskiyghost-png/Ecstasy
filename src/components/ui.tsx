import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import type { SessionUser } from "../lib/api";

export function initials(user: Pick<SessionUser, "firstName" | "lastName">): string {
  const value =
    `${user.firstName.charAt(0)}${user.lastName?.charAt(0) ?? ""}`.trim();
  return value.toUpperCase() || "E";
}

interface AvatarProps {
  user: Pick<SessionUser, "firstName" | "lastName" | "photoUrl">;
  size?: "small" | "medium" | "large";
}

export function Avatar({ user, size = "medium" }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [user.photoUrl]);

  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {user.photoUrl && !failed ? (
        <img
          src={user.photoUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="avatar-initials">{initials(user)}</span>
      )}
    </span>
  );
}

interface StatusPillProps {
  tone: "success" | "warning" | "neutral";
  label: string;
}

export function StatusPill({ tone, label }: StatusPillProps) {
  return (
    <span className={`status-pill status-${tone}`}>
      <span className="status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

interface ToastProps {
  message: string;
  tone: "success" | "error";
  onClose: () => void;
}

export function Toast({ message, tone, onClose }: ToastProps) {
  return (
    <div className={`toast toast-${tone}`} role="status">
      <span className="toast-icon" aria-hidden="true">
        {tone === "success" ? <Check size={16} /> : <X size={16} />}
      </span>
      <span>{message}</span>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Закрыть">
        <X size={15} />
      </button>
    </div>
  );
}

export function SkeletonApp() {
  return (
    <div className="skeleton-app" aria-label="Загрузка" role="status">
      <div className="skeleton skeleton-user">
        <span className="skeleton skeleton-avatar" />
        <span className="skeleton-lines">
          <span className="skeleton skeleton-line skeleton-line-lg" />
          <span className="skeleton skeleton-line skeleton-line-sm" />
        </span>
      </div>
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card skeleton-card-tall" />
    </div>
  );
}
