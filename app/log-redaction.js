// Copyright (c) 2015, 2026, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

const REDACTED_VALUE = "***REDACTED***";
const CIRCULAR_VALUE = "[Circular]";
const MAX_REDACTION_DEPTH = 8;

const SENSITIVE_KEYS = new Set([
  "accesstoken",
  "access_token",
  "apikey",
  "api_key",
  "apptrusttoken",
  "assertion",
  "authorization",
  "authorizationcode",
  "authtoken",
  "authntoken",
  "bearertoken",
  "clientsecret",
  "client_secret",
  "code",
  "codechallenge",
  "code_challenge",
  "codeverifier",
  "code_verifier",
  "credential",
  "credentials",
  "email",
  "encodedsecret",
  "idtoken",
  "id_token",
  "newpassword",
  "new_password",
  "oldpassword",
  "old_password",
  "password",
  "proxyauthorization",
  "proxy_authorization",
  "refreshtoken",
  "refresh_token",
  "requeststate",
  "request_state",
  "secret",
  "setcookie",
  "set_cookie",
  "token",
  "tokens",
  "user",
  "usercred",
  "usercredential",
  "username",
  "user_name",
]);

const TOKEN_REGEX = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const AUTH_HEADER_REGEX = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+\b/gi;

function normalizeKey(key) {
  return String(key ?? "").replace(/[\s-]/g, "_").toLowerCase();
}

function isSensitiveKey(key) {
  const normalized = normalizeKey(key);
  const compact = normalized.replace(/_/g, "");
  return SENSITIVE_KEYS.has(normalized) || SENSITIVE_KEYS.has(compact);
}

function isObjectLike(value) {
  return typeof value === "object" && value !== null;
}

function isResponseLike(value) {
  return isObjectLike(value) &&
    typeof value.status === "number" &&
    "ok" in value &&
    "statusText" in value &&
    "headers" in value;
}

function isRequestLike(value) {
  return isObjectLike(value) &&
    typeof value.url === "string" &&
    "headers" in value &&
    "method" in value;
}

function isHeadersLike(value) {
  return isObjectLike(value) &&
    typeof value.forEach === "function" &&
    typeof value.get === "function";
}

function isUrlSearchParamsLike(value) {
  return isObjectLike(value) &&
    typeof value.forEach === "function" &&
    typeof value.toString === "function" &&
    value.constructor &&
    value.constructor.name === "URLSearchParams";
}

function isFormDataLike(value) {
  return isObjectLike(value) &&
    typeof value.forEach === "function" &&
    value.constructor &&
    value.constructor.name === "FormData";
}

function isBinaryLike(value) {
  return value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    (typeof Blob !== "undefined" && value instanceof Blob);
}

function redactUrl(value) {
  if (typeof value !== "string" || !value.includes("?")) {
    return value;
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  const base = "http://redaction.local";

  try {
    const url = hasScheme ? new URL(value) : new URL(value, base);
    let changed = false;

    for (const key of Array.from(url.searchParams.keys())) {
      if (isSensitiveKey(key)) {
        url.searchParams.set(key, REDACTED_VALUE);
        changed = true;
      }
    }

    if (!changed) {
      return value;
    }

    if (hasScheme) {
      return url.toString();
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value;
  }
}

function redactStructuredString(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.stringify(redactValue(JSON.parse(value), new WeakSet(), 0));
    } catch {
      return value;
    }
  }

  if (!trimmed.includes("=")) {
    return value;
  }

  try {
    const params = new URLSearchParams(trimmed);
    let changed = false;

    for (const key of Array.from(params.keys())) {
      if (isSensitiveKey(key)) {
        params.set(key, REDACTED_VALUE);
        changed = true;
      }
    }

    return changed ? params.toString() : value;
  } catch {
    return value;
  }
}

function redactString(value) {
  return redactStructuredString(redactUrl(value))
    .replace(AUTH_HEADER_REGEX, "$1 " + REDACTED_VALUE)
    .replace(TOKEN_REGEX, REDACTED_VALUE);
}

function redactError(value, seen, depth) {
  const error = {
    name: redactValue(value.name, seen, depth + 1, "name"),
    message: redactValue(value.message, seen, depth + 1, "message"),
  };

  if ("status" in value) {
    error.status = redactValue(value.status, seen, depth + 1, "status");
  }
  if ("code" in value) {
    error.code = redactValue(value.code, seen, depth + 1, "code");
  }
  if (value.stack) {
    error.stack = redactValue(value.stack, seen, depth + 1, "stack");
  }

  for (const key of Object.keys(value)) {
    if (!(key in error)) {
      error[key] = redactValue(value[key], seen, depth + 1, key);
    }
  }

  return error;
}

function redactEntries(value, seen, depth) {
  const redacted = {};
  value.forEach((entryValue, entryKey) => {
    redacted[entryKey] = redactValue(entryValue, seen, depth + 1, entryKey);
  });
  return redacted;
}

function redactResponse(value) {
  const response = {
    status: value.status,
    ok: value.ok,
    statusText: redactString(String(value.statusText ?? "")),
  };

  if (value.url) {
    response.url = redactString(value.url);
  }
  if ("type" in value) {
    response.type = value.type;
  }
  if ("redirected" in value) {
    response.redirected = value.redirected;
  }

  return response;
}

function redactRequest(value, seen, depth) {
  return {
    method: value.method,
    url: redactString(value.url),
    headers: redactValue(value.headers, seen, depth + 1, "headers"),
  };
}

function redactObject(value, seen, depth) {
  if (seen.has(value)) {
    return CIRCULAR_VALUE;
  }

  if (depth >= MAX_REDACTION_DEPTH) {
    return "[Object]";
  }

  seen.add(value);

  if (value instanceof Error) {
    return redactError(value, seen, depth);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (isBinaryLike(value)) {
    return "[Binary data redacted]";
  }
  if (isResponseLike(value)) {
    return redactResponse(value);
  }
  if (isRequestLike(value)) {
    return redactRequest(value, seen, depth);
  }
  if (isHeadersLike(value) || isUrlSearchParamsLike(value) || isFormDataLike(value)) {
    return redactEntries(value, seen, depth);
  }
  if (Array.isArray(value)) {
    return value.map(item => redactValue(item, seen, depth + 1));
  }

  const redacted = {};
  for (const key of Object.keys(value)) {
    redacted[key] = redactValue(value[key], seen, depth + 1, key);
  }

  return redacted;
}

function redactValue(value, seen, depth, key) {
  if (isSensitiveKey(key)) {
    return REDACTED_VALUE;
  }

  if (typeof value === "string") {
    return redactString(value);
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (!isObjectLike(value)) {
    return value;
  }

  return redactObject(value, seen, depth);
}

export function redactLogData(data) {
  return data.map(item => redactValue(item, new WeakSet(), 0));
}

export { REDACTED_VALUE };
