"use client";

import {
  useId,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

type BaseProps = {
  label: string;
  hint?: ReactNode;
  error?: string;
  wide?: boolean;
  /** Renders the label as a small static caption above the control. */
  variant?: "outlined" | "filled";
  className?: string;
};

const fieldClass = (wide?: boolean, className = "") =>
  ["field", wide ? "field--wide" : "", className].filter(Boolean).join(" ");

/* ---------------------------------------------------------------- input --- */

type TextInputProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
    value: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  };

export function TextInput({
  label,
  hint,
  error,
  wide,
  variant = "outlined",
  className = "",
  value,
  placeholder,
  ...rest
}: TextInputProps) {
  const id = useId();
  const controlId = rest.id ?? id;
  const floating = value.length > 0 || Boolean(placeholder);

  return (
    <div className={fieldClass(wide, className)}>
      <div
        className={[
          "field-control",
          variant === "filled" ? "field-control--filled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          {...rest}
          id={controlId}
          value={value}
          placeholder={placeholder ?? " "}
          className="field-input"
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? `${controlId}-help` : undefined}
        />
        <label className={`field-floating${floating ? " field-floating--active" : ""}`} htmlFor={controlId}>
          {label}
        </label>
      </div>
      {hint || error ? (
        <span id={`${controlId}-help`} className={`field-hint${error ? " field-hint--error" : ""}`}>
          {error ?? hint}
        </span>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- select --- */

type SelectProps = BaseProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value" | "placeholder"> & {
    value: string;
    onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
    placeholder?: string;
  };

export function SelectField({
  label,
  hint,
  error,
  wide,
  variant = "outlined",
  className = "",
  value,
  placeholder = " ",
  children,
  ...rest
}: SelectProps) {
  const id = useId();
  const controlId = rest.id ?? id;
  const floating = value.length > 0;

  return (
    <div className={fieldClass(wide, className)}>
      <div
        className={[
          "field-control",
          variant === "filled" ? "field-control--filled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <select
          {...rest}
          id={controlId}
          value={value}
          className="field-input"
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? `${controlId}-help` : undefined}
        >
          <option value="" disabled hidden>
            {placeholder}
          </option>
          {children}
        </select>
        <label className={`field-floating${floating ? " field-floating--active" : ""}`} htmlFor={controlId}>
          {label}
        </label>
      </div>
      {hint || error ? (
        <span id={`${controlId}-help`} className={`field-hint${error ? " field-hint--error" : ""}`}>
          {error ?? hint}
        </span>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- textarea --- */

type TextAreaProps = BaseProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
    value: string;
    onChange: (next: string) => void;
  };

export function TextAreaField({
  label,
  hint,
  error,
  wide,
  variant = "outlined",
  className = "",
  value,
  placeholder,
  rows = 4,
  onChange,
  ...rest
}: TextAreaProps) {
  const id = useId();
  const controlId = rest.id ?? id;
  const floating = value.length > 0 || Boolean(placeholder);

  return (
    <div className={fieldClass(wide, className)}>
      <div
        className={[
          "field-control",
          variant === "filled" ? "field-control--filled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <textarea
          {...rest}
          id={controlId}
          rows={rows}
          value={value}
          placeholder={placeholder ?? " "}
          className="field-input"
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? `${controlId}-help` : undefined}
        />
        <label
          className={`field-floating field-floating--textarea${floating ? " field-floating--active" : ""}`}
          htmlFor={controlId}
        >
          {label}
        </label>
      </div>
      {hint || error ? (
        <span id={`${controlId}-help`} className={`field-hint${error ? " field-hint--error" : ""}`}>
          {error ?? hint}
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- checkbox --- */

type CheckboxProps = {
  label: string;
  checked?: boolean;
  onChange?: InputHTMLAttributes<HTMLInputElement>["onChange"];
  disabled?: boolean;
};

export function Checkbox({ label, checked, onChange, disabled }: CheckboxProps) {
  return (
    <label className="checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      {label}
    </label>
  );
}

/* --------------------------------------------------------------- switch --- */

type SwitchProps = {
  label: string;
  checked?: boolean;
  onChange?: InputHTMLAttributes<HTMLInputElement>["onChange"];
  disabled?: boolean;
};

export function Switch({ label, checked, onChange, disabled }: SwitchProps) {
  return (
    <label className="switch">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="switch-track">
        <span className="switch-thumb" />
      </span>
      {label}
    </label>
  );
}

/** Label + textarea pair for compact editor rows that do not need a floating label. */
export function LabelledTextArea({
  id,
  label,
  value,
  onChange,
  rows = 6,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <textarea
        id={id}
        className="field-input"
        style={focused ? undefined : { paddingTop: 18, paddingBottom: 10 }}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
