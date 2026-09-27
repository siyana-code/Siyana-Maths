"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { CloseIcon, CopyIcon, DeleteIcon, FunctionIcon, ShapeIcon } from "@/components/ui/Icons";
import { Math } from "@/components/ui/math/Math";
import { EQUATION_LAYOUTS, SHAPE_TOOLS } from "@/components/ui/math/layouts";
import { MATH_GROUPS, renderSymbol, type MathSymbol } from "@/components/ui/math/palette";

type MathEditorProps = {
  /** The textarea the snippets are inserted into. */
  target: HTMLTextAreaElement | null;
  /** Current LaTeX, shown in the live preview. */
  value: string;
  onChange: (next: string) => void;
  open: boolean;
  onClose: () => void;
};

type Tab = "symbols" | "layouts" | "shapes";

export function MathEditor({ target, value, onChange, open, onClose }: MathEditorProps) {
  const [tab, setTab] = useState<Tab>("symbols");
  const [activeGroup, setActiveGroup] = useState(MATH_GROUPS[0].id);
  const [copied, setCopied] = useState(false);
  const liveRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(() => liveRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
      target?.focus();
    };
  }, [open, onClose, target]);

  if (!open) return null;

  const group = MATH_GROUPS.find((item) => item.id === activeGroup) ?? MATH_GROUPS[0];

  /** Inserts text at the caret of the bound textarea, then restores the caret after it. */
  function insert(text: string) {
    if (!target) {
      onChange(`${value}${text}`);
      return;
    }
    const start = target.selectionStart ?? value.length;
    const end = target.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const next = `${before}${text}${after}`;
    onChange(next);

    window.requestAnimationFrame(() => {
      target.focus();
      const caret = before.length + text.length;
      target.setSelectionRange(caret, caret);
    });
  }

  function insertSymbol(symbol: MathSymbol) {
    insert(renderSymbol(symbol));
  }

  async function copyLatex() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="dialog-scrim math-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="math-panel" role="dialog" aria-modal="true" aria-label="Math helper">
        <header className="math-panel__head">
          <div className="row" style={{ gap: 10 }}>
            <FunctionIcon size={20} />
            <strong className="t-title-medium">Math helper</strong>
          </div>
          <Button variant="text" className="btn--icon" onClick={onClose} aria-label="Close math helper">
            <CloseIcon size={20} />
          </Button>
        </header>

        <div className="math-panel__body">
          <nav className="math-tabs" aria-label="Math helper sections">
            {(
              [
                { id: "symbols" as Tab, label: "Symbols", icon: <FunctionIcon size={16} /> },
                { id: "layouts" as Tab, label: "Layouts", icon: <FunctionIcon size={16} /> },
                { id: "shapes" as Tab, label: "Shapes", icon: <ShapeIcon size={16} /> },
              ]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`math-tab${tab === item.id ? " math-tab--active" : ""}`}
                onClick={() => setTab(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="math-panel__content">
            {tab === "symbols" ? (
              <div className="stack-md">
                <div className="row" style={{ gap: 6 }}>
                  {MATH_GROUPS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`chip${activeGroup === item.id ? " chip--accent" : ""}`}
                      onClick={() => setActiveGroup(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <p className="muted t-body-small" style={{ margin: 0 }}>{group.hint}</p>
                <div className="math-grid">
                  {group.symbols.map((symbol, index) => (
                    <button
                      key={`${symbol.latex}-${index}`}
                      type="button"
                      className="math-key"
                      title={symbol.name ?? symbol.latex}
                      onClick={() => insertSymbol(symbol)}
                    >
                      {symbol.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {tab === "layouts" ? <LayoutPanel onInsert={insert} /> : null}
            {tab === "shapes" ? <ShapePanel onInsert={insert} /> : null}
          </div>
        </div>

        <footer className="math-panel__foot">
          <div className="stack-sm" style={{ minWidth: 0, flex: 1 }}>
            <span className="field-label">LaTeX preview</span>
            <div className="math-preview">
              {value.trim() ? <Math tex={value} display /> : <span className="muted">Nothing to preview yet.</span>}
            </div>
            <textarea
              ref={liveRef}
              className="math-source"
              value={value}
              spellCheck={false}
              aria-label="LaTeX source"
              onChange={(event) => onChange(event.target.value)}
            />
          </div>
          <div className="stack-sm" style={{ alignSelf: "flex-end" }}>
            <Button variant="outlined" size="sm" icon={<CopyIcon size={15} />} onClick={() => void copyLatex()}>
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="text"
              size="sm"
              icon={<DeleteIcon size={15} />}
              onClick={() => onChange("")}
              disabled={!value.trim()}
            >
              Clear
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ layouts */

function LayoutPanel({ onInsert }: { onInsert: (text: string) => void }) {
  const [selected, setSelected] = useState(EQUATION_LAYOUTS[0].id);
  const [values, setValues] = useState<Record<string, string>>({});
  const layout = EQUATION_LAYOUTS.find((item) => item.id === selected) ?? EQUATION_LAYOUTS[0];

  const preview = layout.build(values);

  return (
    <div className="stack-md">
      <div className="row" style={{ gap: 6 }}>
        {EQUATION_LAYOUTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`chip${selected === item.id ? " chip--accent" : ""}`}
            onClick={() => {
              setSelected(item.id);
              setValues({});
            }}
          >
            {item.glyph} <span className="muted">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="form-grid">
        {layout.fields.map((field) => (
          <TextInput
            key={field.key}
            label={field.label}
            type={field.kind === "number" ? "number" : "text"}
            value={values[field.key] ?? ""}
            placeholder={field.placeholder}
            onChange={(event) =>
              setValues((current) => ({ ...current, [field.key]: event.target.value }))
            }
          />
        ))}
      </div>

      <div className="math-preview math-preview--boxed">
        <Math tex={preview} display />
      </div>

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <Button variant="filled" size="sm" onClick={() => onInsert(`$$${preview}$$`)}>
          Insert into text
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- shapes */

function ShapePanel({ onInsert }: { onInsert: (text: string) => void }) {
  return (
    <div className="stack-md">
      <p className="muted t-body-small" style={{ margin: 0 }}>
        Pick a figure to describe the question. The sketch is generated for reference — upload the
        real figure from the question screen when the diagram matters.
      </p>
      {SHAPE_TOOLS.map((tool) => (
        <div className="stack-sm" key={tool.id}>
          <div className="row" style={{ gap: 8 }}>
            <ShapeIcon size={16} />
            <strong className="t-label-large">{tool.label}</strong>
            <span className="muted t-body-small">{tool.description}</span>
          </div>
          <div className="row" style={{ gap: 8, alignItems: "stretch" }}>
            {tool.options.map((option) => (
              <button
                key={option.caption}
                type="button"
                className="shape-card"
                onClick={() => onInsert(option.caption)}
                title={`Insert: ${option.caption}`}
              >
                <span className="shape-card__preview">
                  {/* Static markup authored in layouts.ts, not user input. */}
                  <svg
                    viewBox="0 0 120 90"
                    width={option.width}
                    height={option.height}
                    role="presentation"
                    dangerouslySetInnerHTML={{ __html: option.svg }}
                  />
                </span>
                <span className="shape-card__label">{option.caption}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
