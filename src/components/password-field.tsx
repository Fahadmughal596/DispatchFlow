"use client";

import { useState } from "react";

type PasswordFieldProps = {
  name: string;
  label: string;
  autoComplete: string;
  minLength?: number;
};

export function PasswordField({
  name,
  label,
  autoComplete,
  minLength
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>

      <div className="password-input-wrap">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          minLength={minLength}
          required
          autoComplete={autoComplete}
        />

        <button
          className="password-visibility-button"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m3 3 18 18" />
              <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
              <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5.5 0 9 5 9 5a16.3 16.3 0 0 1-3 3.6" />
              <path d="M6.6 6.6C4.4 8 3 10 3 10s3.5 5 9 5a10.8 10.8 0 0 0 3-.4" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          )}

          <span>{visible ? "Hide" : "Show"}</span>
        </button>
      </div>
    </div>
  );
}
