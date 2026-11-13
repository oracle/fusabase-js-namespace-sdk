// Copyright (c) 2015, 2026, Oracle and/or its affiliates.
//
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

/**
 * Browser-only App Trust provider backed by Google reCAPTCHA v3. The SDK loads
 * the reCAPTCHA script on first use and requests a token for each attestation.
 *
 * @example
 * const provider = new ReCaptchaV3Provider('your-recaptcha-v3-site-key');
 * initializeAppTrust(appInstance, { provider });
 */
export class ReCaptchaV3Provider {
  /** @type {string} The reCAPTCHA v3 site key. */
  siteKey;

  /**
   * Creates a reCAPTCHA v3 provider.
   *
   * @param {string} siteKey - The reCAPTCHA v3 site key for this application.
   * @returns {ReCaptchaV3Provider} The configured provider.
   *
   * @example
   * const provider = new ReCaptchaV3Provider('your-site-key');
   */
  constructor(siteKey) {
    this.siteKey = siteKey;
  }

  /** @internal */
  async _getAttestationToken(action) {
    if (typeof document === 'undefined') {
      throw new Error('ReCaptchaV3Provider requires a browser environment');
    }

    const w = /** @type {any} */ (globalThis);
    if (!w.grecaptcha) {
      await new Promise((resolve, reject) => {
        const id = `fusabase-app-trust-v3-${this.siteKey}`;
        if (document.getElementById(id)) {
          const start = Date.now();
          const timer = setInterval(() => {
            if (w.grecaptcha) {
              clearInterval(timer);
              resolve();
            } else if (Date.now() - start > 15000) {
              clearInterval(timer);
              reject(new Error('Timed out loading v3 attestation script'));
            }
          }, 50);
          return;
        }

        const s = document.createElement('script');
        s.id = id;
        s.async = true;
        s.defer = true;
        s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(this.siteKey)}`;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load v3 attestation script'));
        document.head.appendChild(s);
      });
    }

    await new Promise((resolve) => {
      w.grecaptcha.ready(() => resolve());
    });

    return w.grecaptcha.execute(this.siteKey, { action });
  }
}

/**
 * Browser-only App Trust provider backed by Google reCAPTCHA Enterprise.
 *
 * @example
 * const provider = new ReCaptchaEnterpriseProvider('your-enterprise-site-key');
 * initializeAppTrust(appInstance, { provider });
 */
export class ReCaptchaEnterpriseProvider {
  /** @type {string} The reCAPTCHA Enterprise site key. */
  siteKey;

  /**
   * Creates a reCAPTCHA Enterprise provider.
   *
   * @param {string} siteKey - The reCAPTCHA Enterprise site key.
   * @returns {ReCaptchaEnterpriseProvider} The configured provider.
   *
   * @example
   * const provider = new ReCaptchaEnterpriseProvider('your-site-key');
   */
  constructor(siteKey) {
    this.siteKey = siteKey;
  }

  /** @internal */
  async _getAttestationToken(action) {
    if (typeof document === 'undefined') {
      throw new Error('ReCaptchaEnterpriseProvider requires a browser environment');
    }

    const w = /** @type {any} */ (globalThis);

    if (!w.grecaptcha?.enterprise) {
      await new Promise((resolve, reject) => {
        const id = `fusabase-app-trust-enterprise-${this.siteKey}`;
        if (document.getElementById(id)) {
          const start = Date.now();
          const timer = setInterval(() => {
            if (w.grecaptcha?.enterprise) {
              clearInterval(timer);
              resolve();
            } else if (Date.now() - start > 15000) {
              clearInterval(timer);
              reject(new Error('Timed out loading enterprise attestation script'));
            }
          }, 50);
          return;
        }

        const s = document.createElement('script');
        s.id = id;
        s.async = true;
        s.defer = true;
        s.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(this.siteKey)}`;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load enterprise attestation script'));
        document.head.appendChild(s);
      });
    }

    await new Promise((resolve) => {
      w.grecaptcha.enterprise.ready(() => resolve());
    });

    return w.grecaptcha.enterprise.execute(this.siteKey, { action });
  }
}

/**
 * Browser-only App Trust provider backed by Cloudflare Turnstile.
 *
 * @example
 * const provider = new TurnstileProvider('your-turnstile-site-key', {
 *   action: 'attest',
 * });
 * initializeAppTrust(appInstance, { provider });
 */
export class TurnstileProvider {
  /** @type {string} The Cloudflare Turnstile site key. */
  siteKey;
  /** @type {{action?: string, cData?: string} | undefined} Optional Turnstile configuration. */
  options;

  /** @type {Promise<string> | undefined} */
  _inFlight;

  /**
   * Creates a Cloudflare Turnstile provider.
   *
   * @param {string} siteKey - The Turnstile site key.
   * @param {{action?: string, cData?: string}} [options] - Optional action and
   * Cloudflare customer data sent to Turnstile.
   * @returns {TurnstileProvider} The configured provider.
   *
   * @example
   * const provider = new TurnstileProvider('your-site-key', { cData: 'tenant-a' });
   */
  constructor(siteKey, options) {
    this.siteKey = siteKey;
    this.options = options;
  }

  /** @internal */
  async _getAttestationToken(action) {
    if (typeof document === 'undefined') {
      throw new Error('TurnstileProvider requires a browser environment');
    }

    const w = /** @type {any} */ (globalThis);

    if (!w.turnstile) {
      await new Promise((resolve, reject) => {
        const id = `fusabase-app-trust-turnstile-${this.siteKey}`;
        if (document.getElementById(id)) {
          const start = Date.now();
          const timer = setInterval(() => {
            if (w.turnstile) {
              clearInterval(timer);
              resolve();
            } else if (Date.now() - start > 15000) {
              clearInterval(timer);
              reject(new Error('Timed out loading Turnstile attestation script'));
            }
          }, 50);
          return;
        }

        const s = document.createElement('script');
        s.id = id;
        s.async = true;
        s.defer = true;
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load Turnstile attestation script'));
        document.head.appendChild(s);
      });
    }

    if (this._inFlight) return this._inFlight;

    this._inFlight = (async () => {
      const TIMEOUT_MS = 20000;
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      let widgetId;
      try {
        const token = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Timed out waiting for Turnstile token after ${TIMEOUT_MS}ms`));
          }, TIMEOUT_MS);

          const doneResolve = (t) => {
            clearTimeout(timeout);
            resolve(t);
          };
          const doneReject = (e) => {
            clearTimeout(timeout);
            reject(e instanceof Error ? e : new Error(String(e)));
          };

          widgetId = w.turnstile.render(container, {
            sitekey: this.siteKey,
            size: 'normal',
            execution: 'render',
            action: this.options?.action ?? action,
            cData: this.options?.cData,
            callback: (t) => doneResolve(t),
            'error-callback': (code) =>
              doneReject(
                new Error(code ? `Turnstile failed to generate token (code=${code})` : 'Turnstile failed to generate token')
              ),
            'expired-callback': () => doneReject(new Error('Turnstile token expired')),
          });

          setTimeout(() => {
            const exec = () => w.turnstile.execute(widgetId);
            try {
              exec();
            } catch (e) {
              const msg = typeof e?.message === 'string' ? e.message : String(e);
              const alreadyExec = msg?.toLowerCase().includes('already executing');
              if (alreadyExec && w.turnstile?.reset) {
                try {
                  w.turnstile.reset(widgetId);
                  exec();
                  return;
                } catch (e2) {
                  doneReject(e2);
                  return;
                }
              }
              doneReject(e);
            }
          }, 0);
        });

        return token;
      } finally {
        try {
          if (widgetId != null && w.turnstile?.remove) w.turnstile.remove(widgetId);
        } catch {
          // ignore
        }
        try {
          container.remove();
        } catch {
          // ignore
        }
      }
    })().finally(() => {
      this._inFlight = undefined;
    });

    return this._inFlight;
  }
}

/**
 * Backward-compatible alias for {@link TurnstileProvider}.
 *
 * @deprecated Use {@link TurnstileProvider}.
 * @example
 * const provider = new CloudflareTurnstileProvider('your-site-key');
 */
export class CloudflareTurnstileProvider extends TurnstileProvider {}

/**
 * Browser-only App Trust provider backed by hCaptcha.
 *
 * @example
 * const provider = new HCaptchaProvider('your-hcaptcha-site-key');
 * initializeAppTrust(appInstance, { provider });
 */
export class HCaptchaProvider {
  /** @type {string} The hCaptcha site key. */
  siteKey;

  /**
   * Creates an hCaptcha provider.
   *
   * @param {string} siteKey - The hCaptcha site key.
   * @returns {HCaptchaProvider} The configured provider.
   *
   * @example
   * const provider = new HCaptchaProvider('your-site-key');
   */
  constructor(siteKey) {
    this.siteKey = siteKey;
  }

  /** @internal */
  async _getAttestationToken(action) {
    if (action) {
      // kept for signature parity; hCaptcha doesn't use action for basic tokens.
    }
    if (typeof document === 'undefined') {
      throw new Error('HCaptchaProvider requires a browser environment');
    }

    const w = /** @type {any} */ (globalThis);

    if (!w.hcaptcha) {
      await new Promise((resolve, reject) => {
        const id = `fusabase-app-trust-hcaptcha-${this.siteKey}`;
        if (document.getElementById(id)) {
          const start = Date.now();
          const timer = setInterval(() => {
            if (w.hcaptcha) {
              clearInterval(timer);
              resolve();
            } else if (Date.now() - start > 15000) {
              clearInterval(timer);
              reject(new Error('Timed out loading hCaptcha attestation script'));
            }
          }, 50);
          return;
        }

        const s = document.createElement('script');
        s.id = id;
        s.async = true;
        s.defer = true;
        s.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load hCaptcha attestation script'));
        document.head.appendChild(s);
      });
    }

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);

    try {
      const token = await new Promise((resolve, reject) => {
        const widgetId = w.hcaptcha.render(container, {
          sitekey: this.siteKey,
          size: 'invisible',
          callback: (t) => resolve(t),
          'error-callback': () => reject(new Error('hCaptcha failed to generate token')),
          'expired-callback': () => reject(new Error('hCaptcha token expired')),
        });

        try {
          w.hcaptcha.execute(widgetId, { async: true }).then(resolve).catch(reject);
        } catch {
          // Fallback for older API: wait for callback.
        }
      });

      return token;
    } finally {
      try {
        container.remove();
      } catch {
        // ignore
      }
    }
  }
}
