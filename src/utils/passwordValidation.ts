export interface PasswordRuleItem {
  id: "length" | "uppercase" | "lowercase" | "number" | "special" | "match";
  label: string;
}

export const PASSWORD_REQUIREMENTS: PasswordRuleItem[] = [
  { id: "length", label: "Minimum 8 characters" },
  { id: "uppercase", label: "At least one uppercase letter (A–Z)" },
  { id: "lowercase", label: "At least one lowercase letter (a–z)" },
  { id: "number", label: "At least one number (0–9)" },
  { id: "special", label: "At least one special character (e.g., @, #, $, !)" },
  { id: "match", label: "Passwords must match in both fields" },
];

export interface PasswordValidationResults {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
  match: boolean;
}

export interface PasswordValidationOutput {
  results: PasswordValidationResults;
  isPasswordValid: boolean;
  isFormValid: boolean;
  failedRequirements: string[];
}

export function validatePassword(password: string = "", confirmPassword: string = ""): PasswordValidationOutput {
  const length = password.length >= 8;
  const uppercase = /[A-Z]/.test(password);
  const lowercase = /[a-z]/.test(password);
  const number = /[0-9]/.test(password);
  // Matches any non-alphanumeric character (e.g., @, #, $, !, etc.)
  const special = /[^A-Za-z0-9]/.test(password);
  const match = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  const results: PasswordValidationResults = {
    length,
    uppercase,
    lowercase,
    number,
    special,
    match,
  };

  const isPasswordValid = length && uppercase && lowercase && number && special;
  const isFormValid = isPasswordValid && match;

  const failedRequirements: string[] = [];
  if (!length) failedRequirements.push("Minimum 8 characters");
  if (!uppercase) failedRequirements.push("At least one uppercase letter (A–Z)");
  if (!lowercase) failedRequirements.push("At least one lowercase letter (a–z)");
  if (!number) failedRequirements.push("At least one number (0–9)");
  if (!special) failedRequirements.push("At least one special character (e.g., @, #, $, !)");
  if (!match) failedRequirements.push("Passwords must match in both fields");

  return {
    results,
    isPasswordValid,
    isFormValid,
    failedRequirements,
  };
}
