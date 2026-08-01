import React from "react";
import { FiCheck } from "react-icons/fi";

// Shared with Signup.jsx's submit-time validation, so the checklist below
// the field and the "why did this get rejected" error can never disagree.
export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "One number", test: (pw) => /\d/.test(pw) },
  { label: "One symbol (e.g. ! @ # $)", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export const isPasswordValid = (pw) => PASSWORD_RULES.every((r) => r.test(pw));

// Live checklist shown under the password field — each rule ticks over to
// iris/checked as soon as it's met, instead of a single pass/fail strength
// message, so the user always knows exactly what's still missing.
const PasswordChecklist = ({ password }) => (
  <div className="flex flex-col gap-1.5 mt-2">
    {PASSWORD_RULES.map((rule) => {
      const met = rule.test(password);
      return (
        <div key={rule.label} className="flex items-center gap-2">
          <span
            className={`flex items-center justify-center w-4 h-4 rounded-full shrink-0 transition-colors ${
              met ? "bg-iris text-accent-ink" : "bg-line text-transparent"
            }`}
          >
            <FiCheck size={10} strokeWidth={3} />
          </span>
          <span className={`font-dm text-xs transition-colors ${met ? "text-ink/70" : "text-ink/35"}`}>
            {rule.label}
          </span>
        </div>
      );
    })}
  </div>
);

export default PasswordChecklist;
