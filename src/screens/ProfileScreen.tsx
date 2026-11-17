import { useState } from "react";
import {
  BadgeCheck,
  Bot,
  CalendarDays,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { SessionData } from "../lib/api";
import { describeError } from "../lib/api";
import { haptic, openTelegramUrl } from "../lib/telegram";
import { Avatar, StatusPill } from "../components/ui";

interface ProfileScreenProps {
  session: SessionData;
  onRefresh: () => Promise<SessionData>;
  onToast: (message: string, tone: "success" | "error") => void;
}

function formatDate(value: string): string {
  const iso = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function ProfileScreen({
  session,
  onRefresh,
  onToast,
}: ProfileScreenProps) {
  const { user, subscription, channelUrl, botUsername } = session;
  const [refreshing, setRefreshing] = useState(false);

  const subscriptionLabel = !subscription.configured
    ? "Канал не настроен"
    : !subscription.checked
      ? "Не удалось проверить"
      : subscription.active
        ? "Активна"
        : "Не активна";

  const subscriptionTone =
    subscription.active && subscription.checked
      ? "success"
      : subscription.configured
        ? "warning"
        : "neutral";

  const checkSubscription = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      haptic("success");
      onToast("Статус подписки обновлён", "success");
    } catch (cause) {
      haptic("error");
      onToast(describeError(cause), "error");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <section className="screen-section" aria-labelledby="profile-title">
      <header className="page-heading">
        <h2 id="profile-title">Профиль</h2>
        <p>Данные из Telegram и состояние подключений.</p>
      </header>

      <div className="profile-card">
        <Avatar user={user} size="large" />
        <div className="profile-identity">
          <div className="profile-name">
            {user.firstName}
            {user.lastName ? ` ${user.lastName}` : ""}
            {user.isPremium ? (
              <span className="premium-badge" title="Telegram Premium">
                <BadgeCheck size={16} aria-hidden="true" />
                Premium
              </span>
            ) : null}
          </div>
          <div className="profile-handle">
            {user.username ? `@${user.username}` : "Без username"}
          </div>
        </div>
      </div>

      <div className="info-card">
        <div className="info-row">
          <span className="info-icon" aria-hidden="true">
            <ShieldCheck size={18} />
          </span>
          <span className="info-label">Подписка на канал</span>
          <StatusPill tone={subscriptionTone} label={subscriptionLabel} />
        </div>
        <div className="info-actions">
          {channelUrl ? (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => {
                haptic("light");
                openTelegramUrl(channelUrl);
              }}
            >
              <ExternalLink size={15} aria-hidden="true" />
              Открыть канал
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => void checkSubscription()}
            disabled={refreshing || !subscription.configured}
          >
            <RefreshCw
              size={15}
              aria-hidden="true"
              className={refreshing ? "spin" : ""}
            />
            {refreshing ? "Проверяем" : "Проверить"}
          </button>
        </div>
      </div>

      <div className="info-card">
        <div className="info-row">
          <span className="info-icon" aria-hidden="true">
            <CalendarDays size={18} />
          </span>
          <span className="info-label">Дата регистрации</span>
          <span className="info-value">{formatDate(user.registeredAt)}</span>
        </div>
        <div className="info-row">
          <span className="info-icon" aria-hidden="true">
            <Bot size={18} />
          </span>
          <span className="info-label">Бот</span>
          {botUsername ? (
            <button
              type="button"
              className="info-link"
              onClick={() => openTelegramUrl(`https://t.me/${botUsername}`)}
            >
              @{botUsername}
              <ExternalLink size={13} aria-hidden="true" />
            </button>
          ) : (
            <span className="info-value">—</span>
          )}
        </div>
      </div>

      <details className="setup-details setup-details-standalone">
        <summary>
          <span>Telegram Business</span>
          <ChevronRight size={17} className="setup-chevron" aria-hidden="true" />
        </summary>
        <div className="setup-body">
          <p>
            AI-ответы включаются только после подключения Business-бота и
            выдачи разрешений. Доступ ограничен чатами, которые разрешит
            Telegram.
          </p>
          <ol className="setup-steps">
            <li>
              Откройте Telegram → <strong>Настройки</strong> →{" "}
              <strong>Telegram Business</strong>.
            </li>
            <li>
              Добавьте <strong>@ecstasy_aibot</strong> в разделе{" "}
              <strong>Чат-боты</strong>.
            </li>
            <li>Выдайте право отвечать на сообщения и управлять переписками.</li>
          </ol>
        </div>
      </details>
    </section>
  );
}
