# Sirve el SDK simulado en las mismas URL del CDN de Google (gstatic) dentro de Playwright.
import os
HERE = os.path.dirname(os.path.abspath(__file__))
CORE = open(os.path.join(HERE, "core.js"), encoding="utf-8").read()
def install(context, version="13.0.0"):
    base = "https://www.gstatic.com/firebasejs/%s/" % version
    # un único módulo con todo; los tres "archivos" lo reexportan
    def handler(route):
        url = route.request.url
        if url.endswith("/core.js"):
            return route.fulfill(status=200, content_type="text/javascript", body=CORE)
        if url.startswith(base) and url.endswith(".js"):
            return route.fulfill(status=200, content_type="text/javascript", body='export * from "%score.js";' % base)
        return route.continue_()
    context.route(base + "*", handler)
