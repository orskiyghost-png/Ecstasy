interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  bottom_bar_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

interface TelegramInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface TelegramInitUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: TelegramInitUser };
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams;
  viewportHeight: number;
  viewportStableHeight: number;
  isExpanded: boolean;
  isFullscreen?: boolean;
  safeAreaInset?: TelegramInset;
  contentSafeAreaInset?: TelegramInset;
  ready(): void;
  expand(): void;
  requestFullscreen?(options?: { timeout?: number }): void;
  exitFullscreen?(): void;
  disableVerticalSwipes?(): void;
  enableVerticalSwipes?(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  setBottomBarColor?(color: string): void;
  openTelegramLink?(url: string): void;
  openLink?(url: string): void;
  onEvent?(event: string, callback: () => void): void;
  offEvent?(event: string, callback: () => void): void;
  isVersionAtLeast?(version: string): boolean;
  HapticFeedback?: {
    impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
    notificationOccurred(type: "error" | "success" | "warning"): void;
    selectionChanged(): void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export const telegram: TelegramWebApp | null =
  typeof window === "undefined" ? null : window.Telegram?.WebApp ?? null;

function setInset(name: string, value: number | undefined): void {
  if (typeof value !== "number") return;
  document.documentElement.style.setProperty(name, `${value}px`);
}

export function initTelegram(): void {
  const app = telegram;
  if (!app) return;

  const syncViewport = () => {
    const height = app.viewportStableHeight || app.viewportHeight;
    if (height) {
      document.documentElement.style.setProperty("--app-height", `${height}px`);
    }
    setInset("--tg-safe-top", app.safeAreaInset?.top);
    setInset("--tg-safe-bottom", app.safeAreaInset?.bottom);
    setInset("--tg-content-top", app.contentSafeAreaInset?.top);
    setInset("--tg-content-bottom", app.contentSafeAreaInset?.bottom);
  };

  app.ready();
  app.expand();
  syncViewport();

  app.onEvent?.("viewportChanged", syncViewport);
  app.onEvent?.("safeAreaChanged", syncViewport);
  app.onEvent?.("contentSafeAreaChanged", syncViewport);
  app.onEvent?.("fullscreenChanged", syncViewport);

  app.setHeaderColor?.("#0b0b0d");
  app.setBackgroundColor?.("#0b0b0d");
  app.setBottomBarColor?.("#0b0b0d");

  try {
    if (!app.isFullscreen) app.requestFullscreen?.({ timeout: 1_000 });
  } catch {
    // Older clients expand to the available viewport instead.
  }

  try {
    app.disableVerticalSwipes?.();
  } catch {
    // Not supported on older clients.
  }

  window.addEventListener(
    "pointerdown",
    () => {
      try {
        if (!app.isFullscreen) app.requestFullscreen?.({ timeout: 1_000 });
      } catch {
        // Ignore unsupported fullscreen requests.
      }
    },
    { once: true, passive: true },
  );
}

export function haptic(
  type: "selection" | "success" | "error" | "light",
): void {
  const feedback = telegram?.HapticFeedback;
  if (!feedback) return;
  if (type === "selection") feedback.selectionChanged();
  else if (type === "light") feedback.impactOccurred("light");
  else feedback.notificationOccurred(type);
}

export function openTelegramUrl(url: string): void {
  if (telegram?.openTelegramLink) {
    telegram.openTelegramLink(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
