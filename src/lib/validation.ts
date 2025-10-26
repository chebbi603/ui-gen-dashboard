import type { UserContract } from "@/data/mockUsers";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export function parseJSONSafe(text: string): { value: unknown | null; error: string | null } {
  try {
    const v = JSON.parse(text);
    return { value: v, error: null };
  } catch (e) {
    return { value: null, error: (e as Error).message };
  }
}

export function validateContractStructure(contract: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof contract !== "object" || contract === null) {
    errors.push("Contract must be an object.");
    return { valid: false, errors };
  }
  const c = contract as Partial<UserContract>;

  // version
  if (typeof c.version !== "string" || c.version.length === 0) {
    errors.push("'version' must be a non-empty string.");
  }

  // rules
  if (!Array.isArray(c.rules)) {
    errors.push("'rules' must be an array.");
  } else {
    c.rules.forEach((r, i) => {
      if (typeof r !== "object" || r === null) {
        errors.push(`rules[${i}] must be an object.`);
      }
    });
  }

  // thresholds
  if (typeof c.thresholds !== "object" || c.thresholds === null) {
    errors.push("'thresholds' must be an object of numeric values.");
  } else {
    Object.entries(c.thresholds as Record<string, unknown>).forEach(([k, v]) => {
      if (typeof v !== "number") {
        errors.push(`thresholds['${k}'] must be a number.`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}