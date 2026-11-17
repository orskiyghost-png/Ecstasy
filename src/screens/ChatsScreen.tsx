import { useState } from "react";
import { ChevronRight, MessagesSquare, Search, X } from "lucide-react";

export function ChatsScreen() {
  const [query, setQuery] = useState("");

  return (
    <section className="screen-section" aria-labelledby="chats-title">
      <header className="page-heading">
        <h2 id="chats-title">Чаты</h2>
        <p>Диалоги, в которых работает ваш агент.</p>
      </header>

      <div className="search-field">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по диалогам"
          aria-label="Поиск по диалогам"
        />
        {query ? (
          <button
            type="button"
            className="search-clear"
            onClick={() => setQuery("")}
            aria-label="Очистить поиск"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      {query ? (
        <div className="inline-empty">
          <p>По запросу «{query}» ничего нет.</p>
          <button type="button" className="text-button" onClick={() => setQuery("")}>
            Сбросить поиск
          </button>
        </div>
      ) : (
        <div className="chats-empty">
          <div className="empty-visual" aria-hidden="true">
            <span className="empty-bubble empty-bubble-back" />
            <span className="empty-bubble empty-bubble-front">
              <MessagesSquare size={26} strokeWidth={1.6} />
            </span>
            <span className="empty-line" />
            <span className="empty-line empty-line-short" />
          </div>

          <h3>Здесь появятся ваши диалоги</h3>
          <p className="empty-copy">
            Ecstasy получает только те чаты, которые Telegram Business разрешит
            боту. Старые переписки и контакты остаются закрытыми.
          </p>

          <details className="setup-details">
            <summary>
              <span>Как подключить Telegram Business</span>
              <ChevronRight size={17} className="setup-chevron" aria-hidden="true" />
            </summary>
            <ol className="setup-steps">
              <li>
                Откройте Telegram → <strong>Настройки</strong> →{" "}
                <strong>Telegram Business</strong>.
              </li>
              <li>
                В разделе <strong>Чат-боты</strong> добавьте{" "}
                <strong>@ecstasy_aibot</strong>.
              </li>
              <li>
                Разрешите боту отвечать на сообщения и управлять переписками.
              </li>
              <li>
                Вернитесь в Mini App. Новые доступные диалоги появятся
                автоматически.
              </li>
            </ol>
          </details>

          <p className="empty-footnote">
            Пока подключение не завершено, список остаётся пустым. Это не ошибка.
          </p>
        </div>
      )}
    </section>
  );
}
