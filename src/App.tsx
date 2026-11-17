import { useCallback, useEffect, useState } from "react";
import {
  CircleAlert,
  MessageCircle,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  ApiError,
  describeError,
  fetchSession,
  type SessionData,
} from "./lib/api";
import { haptic, openTelegramUrl } from "./lib/telegram";
import { Avatar, SkeletonApp, Toast } from "./components/ui";
import { ChatsScreen } from "./screens/ChatsScreen";
import { AgentScreen } from "./screens/AgentScreen";
import { ProfileScreen } from "./screens/ProfileScreen";

type Tab = "chats" | "agent" | "profile";
type AppState = "loading" | "ready" | "error" | "no-telegram";

interface NavItem {
  id: Tab;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { id: "chats", label: "Чаты", icon: MessageCircle },
  { id: "agent", label: "Агент", icon: Sparkles },
  { id: "profile", label: "Профиль", icon: UserRound },
];

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function App() {
  const [tab, setTab] = useState<Tab>("chats");
  const [session, setSession] = useState<SessionData | null>(null);
  const [state, setState] = useState<AppState>("loading");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
    id: number;
  } | null>(null);

  const notify = useCallback(
    (message: string, tone: "success" | "error") => {
      setToast({ message, tone, id: Date.now() });
    },
    [],
  );

  const loadSession = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const data = await fetchSession();
      setSession(data);
      setState("ready");
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "NO_TELEGRAM") {
        setState("no-telegram");
        return;
      }
      setError(describeError(cause));
      setState("error");
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3_200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const screen = document.getElementById("main-screen");
    screen?.scrollTo({ top: 0 });
  }, [tab]);

  const refreshSession = useCallback(async () => {
    const data = await fetchSession();
    setSession(data);
    setState("ready");
    return data;
  }, []);

  const activeTab = navItems.find((item) => item.id === tab) ?? navItems[0];

  const selectTab = (next: Tab) => {
    if (next === tab) return;
    haptic("selection");
    setTab(next);
  };

  return (
    <div className="app-frame">
      <aside className="sidebar" aria-label="Основная навигация">
        <div className="sidebar-brand">
          <BrandMark />
          <span>Ecstasy</span>
        </div>

        <nav className="side-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-button${tab === item.id ? " is-active" : ""}`}
                onClick={() => selectTab(item.id)}
                aria-current={tab === item.id ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {session?.channelUrl ? (
            <button
              type="button"
              className="sidebar-link"
              onClick={() => openTelegramUrl(session.channelUrl!)}
            >
              <span className="sidebar-link-dot" aria-hidden="true" />
              Канал Ecstasy AI
            </button>
          ) : null}

          {session ? (
            <button
              type="button"
              className="sidebar-user"
              onClick={() => selectTab("profile")}
            >
              <Avatar user={session.user} size="small" />
              <span className="sidebar-user-text">
                <span className="sidebar-user-name">{session.user.firstName}</span>
                <span className="sidebar-user-handle">
                  {session.user.username ? `@${session.user.username}` : "Telegram"}
                </span>
              </span>
            </button>
          ) : null}
        </div>
      </aside>

      <div className="workspace">
        <header className="app-header">
          <div className="header-mobile-brand">
            <BrandMark />
            <span>Ecstasy</span>
          </div>
          <div className="header-context">
            <span className="header-product">Ecstasy</span>
            <span className="header-divider" aria-hidden="true" />
            <span className="header-section">{activeTab.label}</span>
          </div>
          {session ? (
            <button
              type="button"
              className="avatar-button"
              onClick={() => selectTab("profile")}
              aria-label="Открыть профиль"
            >
              <Avatar user={session.user} size="small" />
            </button>
          ) : (
            <span className="avatar-placeholder" aria-hidden="true">
              <UserRound size={17} />
            </span>
          )}
        </header>

        <main className="screen" id="main-screen">
          {state === "loading" ? <SkeletonApp /> : null}

          {state === "no-telegram" ? (
            <div className="state-card state-card-page">
              <BrandMark />
              <h1>Откройте Ecstasy из Telegram</h1>
              <p>
                Mini App использует подпись Telegram для входа. В обычном
                браузере безопасная сессия недоступна.
              </p>
            </div>
          ) : null}

          {state === "error" ? (
            <div className="state-card state-card-page">
              <CircleAlert size={24} aria-hidden="true" />
              <h1>Не удалось подключиться</h1>
              <p>{error}</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void loadSession()}
              >
                Повторить
              </button>
            </div>
          ) : null}

          {state === "ready" && session ? (
            <>
              {tab === "chats" ? <ChatsScreen /> : null}
              {tab === "agent" ? <AgentScreen onToast={notify} /> : null}
              {tab === "profile" ? (
                <ProfileScreen
                  session={session}
                  onRefresh={refreshSession}
                  onToast={notify}
                />
              ) : null}
            </>
          ) : null}
        </main>

        <nav className="tabbar" aria-label="Разделы приложения">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`tab-button${tab === item.id ? " is-active" : ""}`}
                onClick={() => selectTab(item.id)}
                aria-current={tab === item.id ? "page" : undefined}
              >
                <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {toast ? (
        <Toast
          key={toast.id}
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}

export default App;
