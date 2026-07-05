/**
 * validator.js — a small, dependency-free validator for the JSON
 * Schema SUBSET that CAT OS schemas use.
 *
 * Why not a library: the no-build / no-npm / no-CDN rules
 * (TECH_STACK.md) rule out ajv and friends. Our schemas deliberately
 * restrict themselves to this subset, which covers everything the
 * content model needs. Supported keywords:
 *
 *   type (string | array of strings, incl. "null" and "integer")
 *   const · enum · required · properties · additionalProperties (bool)
 *   items · minItems · maxItems · minimum · maximum
 *   minLength · maxLength · pattern
 *
 * If a future schema needs a keyword outside this list, extend THIS
 * file (and its tests in tools/verify.mjs) — do not add a dependency.
 *
 * validate() never throws on invalid data; it returns every problem
 * found, with a JSON-pointer-ish path, so content errors are fixable
 * in one pass.
 */

export function validate(schema, data) {
  const errors = [];
  check(schema, data, '$', errors);
  return { valid: errors.length === 0, errors };
}

function check(schema, data, path, errors) {
  // const / enum
  if ('const' in schema && data !== schema.const) {
    errors.push(`${path}: expected constant ${JSON.stringify(schema.const)}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`${path}: "${String(data)}" is not one of ${schema.enum.join(' | ')}`);
    return;
  }

  // type
  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!allowed.some((t) => isType(data, t))) {
      errors.push(`${path}: expected ${allowed.join(' or ')}, got ${typeName(data)}`);
      return; // wrong shape — deeper checks would only cascade noise
    }
  }

  // strings
  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push(`${path}: shorter than minLength ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push(`${path}: longer than maxLength ${schema.maxLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
      errors.push(`${path}: does not match pattern ${schema.pattern}`);
    }
  }

  // numbers
  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push(`${path}: below minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push(`${path}: above maximum ${schema.maximum}`);
    }
  }

  // arrays
  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(`${path}: fewer than minItems ${schema.minItems}`);
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errors.push(`${path}: more than maxItems ${schema.maxItems}`);
    }
    if (schema.items) {
      data.forEach((item, i) => check(schema.items, item, `${path}[${i}]`, errors));
    }
  }

  // objects
  if (isType(data, 'object')) {
    for (const key of schema.required ?? []) {
      if (!(key in data)) errors.push(`${path}: missing required "${key}"`);
    }
    if (schema.properties) {
      for (const [key, sub] of Object.entries(schema.properties)) {
        if (key in data) check(sub, data[key], `${path}.${key}`, errors);
      }
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(data)) {
          if (!(key in schema.properties)) {
            errors.push(`${path}: unexpected property "${key}"`);
          }
        }
      }
    }
  }
}

function isType(v, t) {
  switch (t) {
    case 'null':    return v === null;
    case 'array':   return Array.isArray(v);
    case 'object':  return v !== null && typeof v === 'object' && !Array.isArray(v);
    case 'integer': return Number.isInteger(v);
    case 'number':  return typeof v === 'number' && Number.isFinite(v);
    case 'string':  return typeof v === 'string';
    case 'boolean': return typeof v === 'boolean';
    default:        return false;
  }
}

function typeName(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}
