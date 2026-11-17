function App() {
  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Ecstasy — главная">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>ecstasy</span>
        </a>
        <span className="topbar-label">TELEGRAM MINI APP</span>
      </header>

      <section className="empty-state" aria-labelledby="page-title">
        <div className="state-symbol" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path d="M8 13.5A5.5 5.5 0 0 1 13.5 8h21a5.5 5.5 0 0 1 5.5 5.5v14a5.5 5.5 0 0 1-5.5 5.5H22l-9 7v-7.5a5.5 5.5 0 0 1-5-5.5v-13.5Z" />
            <path d="M17 20h14M17 26h9" />
          </svg>
        </div>

        <p className="eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</p>
        <h1 id="page-title">Основа готова.<br />Подключение впереди.</h1>
        <p className="state-copy">
          Здесь появится управление AI-агентом. Сейчас Telegram-бот и канал ещё не подключены.
        </p>

        <div className="connection-status" role="status">
          <span className="status-indicator" aria-hidden="true" />
          <span>Telegram</span>
          <span className="status-value">Не подключён</span>
        </div>

        <p className="state-note">Это стартовый экран Mini App. Данные и действия появятся после настройки интеграции.</p>
      </section>

      <footer className="footer">
        <span>Ecstasy</span>
        <span>Интерфейсный каркас</span>
      </footer>
    </main>
  );
}

export default App;
