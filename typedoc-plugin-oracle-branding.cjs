/* eslint-disable */
// TypeDoc plugin to inject required Oracle header and bottom/footer on every HTML page.
// Works by hooking into the renderer's endPage event and wrapping the generated HTML.

const HEADER_HTML =
  '<b> Oracle&reg; Backend For Firebase JavaScript Namespace SDK Reference <br>Release 26.1.0</b><br>G48197-02<br>';
const BOTTOM_HTML = 'Copyright &copy; 2026, Oracle and/or its affiliates.';

module.exports.load = function (app) {
  // Use string event names to avoid ESM/CJS interop issues with typedoc enums.
  app.renderer.on('endPage', (page) => {
    try {
      if (typeof page.contents === 'string' && page.contents.length > 0) {
        const STYLE_TAG = `<style id="oracle-branding-style">
  .oracle-footer { text-align: center; width: 100%; padding: 8px 0; }
  .oracle-header { margin: 8px 0 16px; }
  .tsd-generator { display: none !important; }
</style>`;

        const injectBrandingStyle = (html) => {
          if (html.includes('id="oracle-branding-style"')) return html;
          const headClose = html.indexOf('</head>');
          if (headClose !== -1) {
            return html.slice(0, headClose) + STYLE_TAG + html.slice(headClose);
          }
          const bodyOpen = html.indexOf('<body');
          if (bodyOpen !== -1) {
            const afterOpen = html.indexOf('>', bodyOpen);
            if (afterOpen !== -1) {
              return html.slice(0, afterOpen + 1) + STYLE_TAG + html.slice(afterOpen + 1);
            }
          }
          return STYLE_TAG + html;
        };

        const footerDiv = `<div class="oracle-footer" style="text-align:center;width:100%;padding:8px 0">
  ${BOTTOM_HTML}
</div>`;

        const insertHeaderAndFooter = (html) => {
          try {
            let out = injectBrandingStyle(html);
            // Remove default "Generated using TypeDoc" paragraph
            const genStart = out.indexOf('<p class="tsd-generator"');
            if (genStart !== -1) {
              const genEnd = out.indexOf('</p>', genStart);
              if (genEnd !== -1) {
                out = out.slice(0, genStart) + out.slice(genEnd + 4);
              }
            }
            // Insert header inside the main content column
            const headerDiv = `<div class="oracle-header">${HEADER_HTML}</div>`;
            let colIdx = out.indexOf('<div class="col-content"');
            if (colIdx !== -1) {
              const afterColOpen = out.indexOf('>', colIdx);
              if (afterColOpen !== -1) {
                out = out.slice(0, afterColOpen + 1) + `\n${headerDiv}\n` + out.slice(afterColOpen + 1);
              }
            } else {
              // Fallback: insert after the main container opening
              const contIdx = out.indexOf('<div class="container container-main"');
              if (contIdx !== -1) {
                const afterContOpen = out.indexOf('>', contIdx);
                if (afterContOpen !== -1) {
                  out = out.slice(0, afterContOpen + 1) + `\n${headerDiv}\n` + out.slice(afterContOpen + 1);
                }
              }
            }
            // Insert footer just before the closing </body> tag
            const bodyClose = out.lastIndexOf('</body>');
            if (bodyClose !== -1) {
              out = out.slice(0, bodyClose) + `\n${footerDiv}\n` + out.slice(bodyClose);
            }
            return out;
          } catch {
            return html;
          }
        };
        page.contents = insertHeaderAndFooter(page.contents);
      }
    } catch (e) {
      // Fail safe: do not break documentation build if something goes wrong.
      // eslint-disable-next-line no-console
      console.warn('[typedoc-plugin-oracle-branding] Failed to inject header/footer:', e);
    }
  });
}
