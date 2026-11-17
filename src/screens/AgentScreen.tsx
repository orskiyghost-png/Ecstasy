import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  CircleAlert,
  Download,
  Save,
  Upload,
  Wand2,
} from "lucide-react";
import {
  describeError,
  fetchAgent,
  saveAgent,
  type AgentData,
} from "../lib/api";
import { haptic } from "../lib/telegram";

interface AgentScreenProps {
  onToast: (message: string, tone: "success" | "error") => void;
}

type AgentTab = "prompt" | "knowledge";
type LoadState = "loading" | "ready" | "error";

const PROMPT_LIMIT = 4_000;
const KNOWLEDGE_LIMIT = 20_000;

const templates = [
  {
    id: "friendly",
    title: "Дружелюбный",
    description: "Тёплый тон, простые формулировки, без канцелярита.",
    prompt:
      "Общайся тепло, дружелюбно и естественно. Пиши короткими живыми фразами, как внимательный собеседник. Избегай канцелярита, штампов и чрезмерной вежливости. Сначала отвечай по существу, затем при необходимости уточняй детали.",
  },
  {
    id: "business",
    title: "Деловой",
    description: "Спокойно, чётко и по делу. Уважительный тон.",
    prompt:
      "Общайся вежливо, спокойно и по делу. Держи ответы структурными и конкретными, без лишних вступлений. Если информации недостаточно, задай один точный уточняющий вопрос. Не используй сленг и фамильярность.",
  },
  {
    id: "brief",
    title: "Краткий",
    description: "Минимум слов. Только суть и следующий шаг.",
    prompt:
      "Отвечай максимально кратко. Одна-две фразы, только суть и конкретный следующий шаг. Не здоровайся повторно, не пересказывай вопрос и не добавляй пояснений, если о них не просят.",
  },
  {
    id: "casual",
    title: "Неформальный",
    description: "Живой разговорный стиль без официоза.",
    prompt:
      "Общайся свободно и по-человечески, как хороший знакомый. Допускай разговорные конструкции и лёгкую иронию, но сохраняй уважение и ясность. Не используй официоз и длинные вступления.",
  },
  {
    id: "support",
    title: "Поддержка",
    description: "Спокойно разбери проблему и предложи решение.",
    prompt:
      "Помогай человеку спокойно и последовательно. Сначала коротко подтверди, что понял проблему, затем предложи конкретное решение или следующий шаг. Если данных не хватает, задай один вопрос. Не обещай того, что не можешь выполнить.",
  },
] as const;

function formatSavedAt(value: string | null): string | null {
  if (!value) return null;
  const iso = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function AgentScreen({ onToast }: AgentScreenProps) {
  const [tab, setTab] = useState<AgentTab>("prompt");
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [knowledge, setKnowledge] = useState("");
  const [savedPrompt, setSavedPrompt] = useState("");
  const [savedKnowledge, setSavedKnowledge] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setState("loading");
    setError("");
    try {
      const data = await fetchAgent();
      setPrompt(data.prompt);
      setKnowledge(data.knowledge);
      setSavedPrompt(data.prompt);
      setSavedKnowledge(data.knowledge);
      setUpdatedAt(data.updatedAt);
      setState("ready");
    } catch (cause) {
      setError(describeError(cause));
      setState("error");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const dirty = prompt !== savedPrompt || knowledge !== savedKnowledge;
  const selectedTemplate = templates.find((item) => item.prompt === prompt);

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const data: AgentData = await saveAgent(prompt, knowledge);
      setSavedPrompt(data.prompt);
      setSavedKnowledge(data.knowledge);
      setUpdatedAt(data.updatedAt);
      haptic("success");
      onToast("Настройки агента сохранены", "success");
    } catch (cause) {
      haptic("error");
      onToast(describeError(cause), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > KNOWLEDGE_LIMIT) {
      haptic("error");
      onToast("Файл больше 20 000 символов", "error");
      return;
    }
    const text = await file.text();
    if (text.length > KNOWLEDGE_LIMIT) {
      haptic("error");
      onToast("Файл больше 20 000 символов", "error");
      return;
    }
    setKnowledge(text);
    haptic("selection");
    onToast("Файл загружен в редактор. Сохраните изменения.", "success");
  };

  const handleDownload = () => {
    const blob = new Blob([knowledge], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "knowledge.md";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (state === "loading") {
    return (
      <section className="screen-section" aria-label="Загрузка настроек агента">
        <div className="skeleton skeleton-line skeleton-line-sm" />
        <div className="skeleton skeleton-line skeleton-line-lg" />
        <div className="skeleton skeleton-editor" />
        <div className="skeleton skeleton-editor skeleton-editor-short" />
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="screen-section">
        <div className="state-card">
          <CircleAlert size={22} aria-hidden="true" />
          <h2>Не удалось загрузить агента</h2>
          <p>{error}</p>
          <button type="button" className="btn btn-secondary" onClick={() => void load()}>
            Повторить
          </button>
        </div>
      </section>
    );
  }

  const savedLabel = formatSavedAt(updatedAt);

  return (
    <section className="screen-section" aria-labelledby="agent-title">
      <header className="page-heading">
        <h2 id="agent-title">Агент</h2>
        <p>Задайте стиль общения и знания, на которые он опирается.</p>
      </header>

      <div className="segmented" role="tablist" aria-label="Разделы агента">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "prompt"}
          className={tab === "prompt" ? "is-active" : ""}
          onClick={() => {
            setTab("prompt");
            haptic("selection");
          }}
        >
          <Wand2 size={16} aria-hidden="true" />
          Промпт
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "knowledge"}
          className={tab === "knowledge" ? "is-active" : ""}
          onClick={() => {
            setTab("knowledge");
            haptic("selection");
          }}
        >
          <BookOpen size={16} aria-hidden="true" />
          База знаний
        </button>
      </div>

      {tab === "prompt" ? (
        <div className="panel-stack">
          <div className="template-grid" aria-label="Готовые шаблоны">
            {templates.map((template) => {
              const selected = selectedTemplate?.id === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  className={`template-card${selected ? " is-selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => {
                    setPrompt(template.prompt);
                    haptic("selection");
                  }}
                >
                  <span className="template-head">
                    <span className="template-title">{template.title}</span>
                    {selected ? (
                      <span className="template-check" aria-hidden="true">
                        <Check size={14} />
                      </span>
                    ) : null}
                  </span>
                  <span className="template-description">{template.description}</span>
                </button>
              );
            })}
          </div>

          <div className="field-group">
            <div className="field-head">
              <label htmlFor="prompt-editor">Инструкция для агента</label>
              <span className="field-count">
                {prompt.length.toLocaleString("ru-RU")} /{" "}
                {PROMPT_LIMIT.toLocaleString("ru-RU")}
              </span>
            </div>
            <textarea
              id="prompt-editor"
              value={prompt}
              maxLength={PROMPT_LIMIT}
              onChange={(event) => setPrompt(event.target.value)}
              rows={9}
              placeholder="Опишите, как агент должен общаться: тон, длина ответов, что важно и чего избегать."
            />
            <p className="field-hint">
              Шаблон заполняет редактор. Вы можете изменить текст под себя.
            </p>
          </div>
        </div>
      ) : (
        <div className="panel-stack">
          <div className="field-group">
            <div className="field-head">
              <label htmlFor="knowledge-editor">Что агент должен знать</label>
              <span className="field-count">
                {knowledge.length.toLocaleString("ru-RU")} /{" "}
                {KNOWLEDGE_LIMIT.toLocaleString("ru-RU")}
              </span>
            </div>
            <textarea
              id="knowledge-editor"
              value={knowledge}
              maxLength={KNOWLEDGE_LIMIT}
              onChange={(event) => setKnowledge(event.target.value)}
              rows={12}
              placeholder={
                "Например:\n— как к вам обращаться;\n— чем вы занимаетесь;\n— услуги, цены и условия;\n— частые вопросы и важные ограничения."
              }
            />
            <p className="field-hint">
              Это справочные данные для ответов. Инструкции по стилю хранятся
              отдельно, во вкладке «Промпт».
            </p>
          </div>

          <div className="file-actions">
            <input
              ref={fileInput}
              type="file"
              accept=".md,.txt,text/markdown,text/plain"
              className="visually-hidden"
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={16} aria-hidden="true" />
              Загрузить файл
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleDownload}
              disabled={!knowledge}
            >
              <Download size={16} aria-hidden="true" />
              Скачать .md
            </button>
          </div>
        </div>
      )}

      <div className="editor-footer">
        <span className={`save-state${dirty ? " is-dirty" : ""}`}>
          {saving
            ? "Сохраняем…"
            : dirty
              ? "Есть несохранённые изменения"
              : savedLabel
                ? `Сохранено ${savedLabel}`
                : "Изменения ещё не сохранены"}
        </span>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
        >
          <Save size={16} aria-hidden="true" />
          {saving ? "Сохранение" : "Сохранить"}
        </button>
      </div>
    </section>
  );
}
