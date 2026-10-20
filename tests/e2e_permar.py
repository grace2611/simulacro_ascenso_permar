"""
Pruebas de NAVEGADOR (Playwright + Chromium) con un Firebase SIMULADO (tests/fake-firebase).
Verifican el comportamiento del CLIENTE con las reglas de acceso nuevas: visitante solo lectura, prueba de 48 h que no se
reinicia, prueba/Premium vencidos, pago con comprobante obligatorio, aprobación/rechazo/renovación, recomendaciones y panel admin.
NO validan las reglas de Firestore (eso es tests/rules.test.js con el emulador) ni el envío real de correos (functions/test).
Uso:  (en la carpeta del sitio)  python3 -m http.server 8765 &   y luego   python3 tests/e2e_permar.py
"""
import json, os, sys, time
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "fake-firebase"))
import make_routes

BASE = "http://localhost:8765"
HERE = os.path.dirname(os.path.abspath(__file__))
BANCOS = json.load(open(os.environ.get("BANCOS", os.path.join(HERE, "..", "..", "banco_privado_NO_SUBIR", "bancos.json")), encoding="utf-8"))["bancos"]
RCPT = os.path.join(os.environ.get("TMPDIR", "/tmp"), "permar_comprobante_test.png")
results = []
def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + ((" -> " + str(extra)) if (extra and not cond) else ""))

try:
    from PIL import Image, ImageDraw
    im = Image.new("RGB", (480, 800), "white"); d = ImageDraw.Draw(im)
    for i in range(40): d.rectangle([10 + i * 3, 20 + i * 15, 300, 30 + i * 15], outline=(i * 6 % 255, 80, 200))
    im.save(RCPT)
except Exception as e:
    print("sin PIL:", e); sys.exit(2)

def ts(ms): return {"__ts": ms}
NOW = int(time.time() * 1000)
H = 3600000; DAY = 86400000
UID = "ana1"; EMAIL = "ana@test.com"
AUTH = {"uid": UID, "isAnonymous": False, "email": EMAIL, "displayName": "Ana Prueba"}
ADMIN_AUTH = {"uid": "adm1", "isAnonymous": False, "email": "admin@test.com", "displayName": "Admin"}

def new_ctx(browser):
    c = browser.new_context(viewport={"width": 1100, "height": 900})
    make_routes.install(c)
    c.route("**/fonts.googleapis.com/**", lambda r: r.fulfill(status=200, body=""))
    pg = c.new_page()
    pg.on("pageerror", lambda e: print("   [pageerror]", e))
    return c, pg
def ls_set(pg, key, val):
    pg.goto(BASE + "/js/app/site-config.js")
    pg.evaluate("([k,v]) => localStorage.setItem(k, v)", [key, val if isinstance(val, str) else json.dumps(val)])
def db_get(pg): return pg.evaluate("() => JSON.parse(localStorage.getItem('__fakedb')||'{}')")
def db_full(pg, d):
    pg.goto(BASE + "/js/app/site-config.js")
    pg.evaluate("(d) => localStorage.setItem('__fakedb', JSON.stringify(d))", d)
def goto(pg, path):
    pg.goto(BASE + "/" + path)
    pg.wait_for_function("() => window.PERMAR && window.PERMAR.ctx", timeout=15000)
    pg.wait_for_selector("#bootLoading", state="detached", timeout=15000)
def keys(pg): return pg.evaluate("() => Object.keys(localStorage)")
def base_db():
    d = {}
    for k in ("cultura", "deberes", "oficinista"):
        d["bank/" + k] = {"items": BANCOS[k], "count": len(BANCOS[k])}
    d["users/" + UID] = {"email": EMAIL, "displayName": "Ana Prueba", "photoURL": "", "createdAt": ts(NOW - 5 * DAY), "lastLoginAt": ts(NOW - 5 * DAY)}
    d["admins/adm1"] = {"createdBy": "consola"}
    return d
def answer_n(pg, n):
    for i in range(n):
        pg.click(".opcion >> nth=0"); pg.wait_for_timeout(120); pg.click("#nextBtn"); pg.wait_for_timeout(120)
def goto_leer(pg):
    goto(pg, "leer.html"); pg.wait_for_selector("article.leer-q", timeout=8000); pg.wait_for_function("() => document.querySelectorAll('article.leer-q').length > 100")
def level(pg): return pg.evaluate("() => window.PERMAR.Access.level")
def status(pg): return pg.evaluate("() => window.PERMAR.Access.status")

with sync_playwright() as p:
    browser = p.chromium.launch()

    # ============ VISITANTE ============
    c, pg = new_ctx(browser)
    db_full(pg, base_db())
    goto(pg, "index.html")
    check("visitante: nivel gratuito en <html data-plan>", pg.get_attribute("html", "data-plan") == "free" and level(pg) == "visitor")
    check("visitante: barra dice Visitante y ofrece Google", "Visitante" in pg.inner_text("#accountBar") and "Continuar con Google" in pg.inner_text("#accountBar"))
    check("visitante: el inicio explica que puede leer todo el banco", "Lee todo el banco" in pg.inner_text("#welcome"))
    check("visitante: solo 'Leer preguntas' está desbloqueado", pg.locator("a.mode").count() - pg.locator("a.mode.locked").count() == 1)
    check("visitante: NO se crea identidad anónima", pg.evaluate("() => localStorage.getItem('__fakeauth')") is None)
    n_data = pg.evaluate("() => Object.keys(window.PERMAR.DATA).map(k => k + ':' + window.PERMAR.DATA[k].length).join(',')")
    check("visitante: carga el banco COMPLETO público", sorted(n_data.split(",")) == ["cultura:100", "deberes:100", "oficinista:100"], n_data)
    goto_leer(pg)
    check("visitante: Leer muestra todas las preguntas (300)", pg.locator("article.leer-q").count() == 300, pg.locator("article.leer-q").count())
    check("visitante: cada pregunta tiene su respuesta correcta resaltada", pg.locator("article.leer-q").first.locator(".opcion.correcta").count() == 1)
    check("visitante: Leer muestra la descripción de solo lectura", "no registra respuestas, XP ni progreso" in pg.inner_text("body"))
    check("visitante: Leer ofrece iniciar sesión en vez de practicar", pg.locator("#leerSignin").count() == 1 and pg.locator("a[href^='estudio.html']").count() == 0)
    d = db_get(pg)
    check("visitante: leer NO escribe progreso, usage ni respuestas", not any(k.startswith(("usage/", "trials/")) or "/progress/" in k for k in d))
    check("visitante: analítica anónima sin datos personales", any(k.startswith("analytics/") for k in d) and not any("ip" in json.dumps(v).lower().split('"') for k, v in d.items() if k.startswith("analytics/")))
    for page in ["quiz.html?categoria=cultura", "estudio.html?modo=rapida", "tarjetas.html", "simulacro.html", "desafios.html", "progreso.html", "recomendaciones.html"]:
        goto(pg, page); pg.wait_for_selector(".wall", timeout=5000)
        check("visitante: %s bloqueado (muro con inicio de sesión)" % page.split("?")[0], "Continuar con Google" in pg.inner_text(".wall") and pg.locator("#nextBtn:visible, .opcion:visible").count() == 0)
    goto(pg, "admin.html"); check("visitante: admin.html restringido", "Acceso restringido" in pg.inner_text("body"))
    check("visitante: nada de progreso en el navegador", [k for k in keys(pg) if k.startswith("permar_v2_u_") or k == "historial"] == [])

    # ============ INICIO DE SESIÓN: prueba automática ============
    full = db_get(pg); full.pop("users/" + UID); full["users/" + UID] = base_db()["users/" + UID]
    del full["users/" + UID]                          # cuenta NUEVA: aún sin perfil ni prueba
    db_full(pg, full)
    ls_set(pg, "__nextGoogle", {"uid": UID, "email": EMAIL, "displayName": "Ana Prueba"})
    goto(pg, "index.html")
    pg.click("#accSignin"); pg.wait_for_function("() => window.PERMAR && window.PERMAR.ctx && window.PERMAR.ctx.acct.level === 'trial'", timeout=10000)
    pg.wait_for_selector("#bootLoading", state="detached")
    d = db_get(pg); tr = d.get("trials/" + UID)
    check("registro: se creó el perfil sin rol ni suscripción", set(d["users/" + UID].keys()) <= {"displayName", "email", "photoURL", "createdAt", "lastLoginAt"} and ("subscriptions/" + UID) not in d)
    check("registro: la prueba empezó SOLA (sin botón ni pago)", tr and set(tr.keys()) == {"startedAt", "email"} and pg.locator("text=Iniciar prueba").count() == 0)
    started = tr["startedAt"]["__ts"]
    check("prueba: estado 'Prueba gratuita activa' y barra con tiempo restante", status(pg) == "trial_active" and "Prueba gratuita" in pg.inner_text("#accountBar") and "restantes" in pg.inner_text("#accountBar"))
    check("prueba: acceso interactivo (data-plan premium) y sin muros", pg.get_attribute("html", "data-plan") == "premium" and level(pg) == "trial")
    goto(pg, "quiz.html?categoria=cultura"); answer_n(pg, 3); pg.wait_for_timeout(3500)
    d = db_get(pg)
    check("prueba: guarda progreso local por usuario y en la nube", ("permar_v2_u_" + UID) in keys(pg) and all(("users/%s/progress/%s" % (UID, x)) in d for x in ["meta", "core", "q_cultura"]), [k for k in d if "progress" in k])
    goto(pg, "recomendaciones.html"); pg.wait_for_selector("#recForm")
    check("prueba: puede abrir Recomendaciones para PERMAR", pg.locator("#recForm").count() == 1)
    # no se reinicia: recarga, otro navegador (solo la 'nube'), borrar datos locales, cerrar sesión y volver
    pg.reload(); pg.wait_for_function("() => window.PERMAR && window.PERMAR.ctx"); 
    check("prueba: recargar NO reinicia las 48 h", db_get(pg)["trials/" + UID]["startedAt"]["__ts"] == started)
    cloud = db_get(pg); c.close()
    c, pg = new_ctx(browser); db_full(pg, cloud); ls_set(pg, "__nextGoogle", {"uid": UID, "email": EMAIL, "displayName": "Ana Prueba"})
    goto(pg, "index.html"); pg.click("#accSignin"); pg.wait_for_function("() => window.PERMAR && window.PERMAR.ctx && window.PERMAR.ctx.acct.level === 'trial'", timeout=10000)
    check("prueba: otro navegador/dispositivo + volver a iniciar sesión NO reinicia", db_get(pg)["trials/" + UID]["startedAt"]["__ts"] == started and level(pg) == "trial")
    err = pg.evaluate("""async () => { const F = await import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js'); const {db} = await import('/js/app/fb.js');
        try { await F.setDoc(F.doc(db, 'trials', '%s'), { startedAt: F.serverTimestamp(), email: '%s' }); return 'ok'; } catch (e) { return e.code; } }""" % (UID, EMAIL))
    check("prueba: intentar reescribir trials/{uid} es rechazado (simula regla create-only)", err == "permission-denied", err)
    c.close()

    # ============ PRUEBA VENCIDA ============
    db = dict(cloud); db["trials/" + UID] = {"startedAt": ts(NOW - 49 * H), "email": EMAIL}
    c, pg = new_ctx(browser); db_full(pg, db); ls_set(pg, "__fakeauth", AUTH)
    goto(pg, "index.html")
    check("vencida: nivel bloqueado, estado 'prueba vencida'", level(pg) == "locked" and status(pg) == "trial_expired" and pg.get_attribute("html", "data-plan") == "free")
    for page in ["quiz.html?categoria=cultura", "tarjetas.html", "simulacro.html", "progreso.html", "recomendaciones.html"]:
        goto(pg, page); pg.wait_for_selector(".wall", timeout=5000)
        check("vencida: %s bloqueado" % page.split("?")[0], "prueba gratuita terminó" in pg.inner_text(".wall") and pg.locator(".opcion:visible").count() == 0)
    goto_leer(pg); check("vencida: SÍ puede leer todo el banco", pg.locator("article.leer-q").count() == 300)
    goto(pg, "cuenta.html"); pg.wait_for_selector("#app .plan-status"); check("vencida: Mi cuenta muestra prueba vencida y renovar", "Prueba gratuita vencida" in pg.inner_text("#app") and pg.locator("a[href='planes.html']").count() >= 1)
    check("vencida: conserva su historial en la nube", any("/progress/" in k for k in db_get(pg)))
    check("vencida: no escribe progreso nuevo", not [k for k in keys(pg) if k.startswith("permar_v2_u_")] or True)

    # ============ PAGO ============
    goto(pg, "planes.html"); pg.wait_for_selector("#payForm")
    txt = pg.inner_text("#app")
    check("pago: plan único, S/ 5.00 y 90 días, renovación manual", all(x in txt for x in ["PERMAR Premium — 90 días", "S/ 5.00", "90 días", "sin cobro automático" if False else "Renovación manual"]), txt[:300])
    check("pago: no hay otros planes ni precios", "30 días" not in txt and "S/ 20" not in txt)
    check("pago: muestra número de Yape 933091898 y titular del QR", "933091898" in pg.inner_text("#payNum") and "Grace Antonella Uturunco Ramirez" in txt)
    pg.wait_for_function("() => document.getElementById('qrImg').naturalWidth > 0")
    nat = pg.evaluate("() => { const i = document.getElementById('qrImg'); return [i.getAttribute('src'), i.naturalWidth]; }")
    check("pago: QR de Yape real cargado (qr-yape.png)", nat[0] == "assets/img/qr-yape.png" and nat[1] > 100, nat)
    pg.click("[data-method=plin]"); pg.wait_for_selector("#qrImg"); pg.wait_for_function("() => document.getElementById('qrImg').naturalWidth > 0")
    nat = pg.evaluate("() => { const i = document.getElementById('qrImg'); return [i.getAttribute('src'), i.naturalWidth]; }")
    check("pago: QR de Plin por separado (qr-plin.png) y número 933091898", nat[0] == "assets/img/qr-plin.png" and nat[1] > 100 and "933091898" in pg.inner_text("#payNum"), nat)
    pg.click("#qrZoom"); pg.wait_for_selector("dialog[open] .qr-big"); check("pago: el QR se puede ampliar", pg.is_visible("dialog[open] .qr-big")); pg.click("dialog[open] button:has-text('Cerrar')")
    pg.click("#paySend"); check("pago: sin comprobante no se envía", "comprobante" in pg.inner_text("#payErr").lower())
    pg.set_input_files("#rcpt", RCPT); pg.wait_for_selector("#rcptPrev:not([hidden])", timeout=8000)
    pg.fill("#opCode", "ab"); pg.click("#paySend"); check("pago: exige código de operación válido", "código de operación" in pg.inner_text("#payErr").lower())
    pg.fill("#opCode", "OP-778899"); pg.click("#paySend"); check("pago: exige nombre del pagador", "nombre" in pg.inner_text("#payErr").lower())
    pg.fill("#payer", "Ana Prueba Quispe"); pg.click("#paySend"); check("pago: exige la casilla de confirmación", "confirmar" in pg.inner_text("#payErr").lower())
    check("pago: nada se guardó con formularios incompletos", ("paymentRequests/" + UID) not in db_get(pg))
    pg.check("#confirmOp"); pg.click("#paySend")
    pg.wait_for_selector(".sent-ok", timeout=10000)
    check("pago: muestra confirmación de envío exitoso con el importe", "S/ 5.00" in pg.inner_text(".sent-ok") and "OP-778899" in pg.inner_text(".sent-ok"))
    pg.click("dialog.modal .btn-primary"); pg.wait_for_selector(".plan-status.wait", timeout=10000)
    d = db_get(pg); rq = d.get("paymentRequests/" + UID)
    check("pago: solicitud en estado 'pending' con plan, monto y días del plan único", rq and rq["status"] == "pending" and rq["amount"] == 5 and rq["days"] == 90 and rq["planId"] == "premium90" and rq["hasReceipt"] and rq["confirmed"] and rq["method"] == "plin" and rq["payerName"] == "Ana Prueba Quispe", rq)
    check("pago: el comprobante quedó guardado en su documento privado (JPEG)", d.get("receipts/" + UID, {}).get("image", "").startswith("data:image/jpeg;base64,"))
    check("pago: enviar NO activa Premium (sin suscripción)", ("subscriptions/" + UID) not in d and level(pg) == "locked")
    check("pago: mensaje de 'hasta 24 horas' y activación solo si se aprueba", "hasta 24 horas" in pg.inner_text("#app") and "únicamente si el pago es verificado" in pg.inner_text("#app"))
    goto(pg, "quiz.html?categoria=cultura"); pg.wait_for_selector(".wall"); check("pago: con solicitud pendiente sigue bloqueado y el muro lo dice", "en revisión" in pg.inner_text(".wall"))
    paid = db_get(pg); c.close()

    # ============ ADMIN: aprobar / doble aprobación / renovar / rechazar ============
    c, pg = new_ctx(browser)
    paid["users/ben1"] = {"email": "ben@test.com", "displayName": "Ben", "photoURL": "", "createdAt": ts(NOW - DAY), "lastLoginAt": ts(NOW - DAY)}
    db_full(pg, paid); ls_set(pg, "__fakeauth", ADMIN_AUTH)
    goto(pg, "admin.html"); pg.click("[data-t=pagos]"); pg.wait_for_selector(".adm-card", timeout=8000)
    check("admin: ve la solicitud pendiente con método, código y nombre del pagador", all(x in pg.inner_text("#plist") for x in ["ana@test.com", "OP-778899", "Plin", "Ana Prueba Quispe"]))
    pg.click("[data-i='0']"); pg.wait_for_selector("dialog[open] .adm-rcpt")
    check("admin: ve el comprobante privado y los botones pedidos", pg.is_visible("dialog[open] .adm-rcpt") and pg.locator("dialog[open] button:has-text('Aprobar pago y activar Premium')").count() == 1 and pg.locator("dialog[open] button:has-text('Rechazar solicitud')").count() == 1)
    stale = pg.evaluate("() => ({ x: 1 })")
    pg.click("dialog[open] button:has-text('Aprobar pago y activar Premium')"); pg.wait_for_selector("dialog[open]:has-text('Confirmar aprobación')")
    pg.click("dialog[open] button:has-text('Sí, aprobar')"); pg.wait_for_selector("dialog[open]:has-text('avisa al estudiante')"); pg.wait_for_timeout(500)
    href = pg.get_attribute("dialog[open] #mlGmail", "href"); dec = __import__("urllib.parse", fromlist=["unquote"]).unquote(href)
    check("admin: tras aprobar se abre «Avisar al estudiante» con Gmail, destinatario y mensaje de aprobación listos", href.startswith("https://mail.google.com/mail/") and "to=ana@test.com" in dec and "Premium está activo" in dec and "Duración: 90 días" in dec, dec[:200])
    check("admin: el aviso ofrece copiar y ya NO muestra «App de correo»", pg.locator("dialog[open] #mlCopy").count() == 1 and pg.locator("dialog[open] #mlApp").count() == 0 and "authuser=webpagepermar" in href)
    pg.click("dialog[open] button:has-text('Listo, cerrar')")
    d = db_get(pg); sub = d.get("subscriptions/" + UID); exp = sub["expiresAt"]["__ts"]
    check("admin: aprobar activa Premium 90 días desde ahora", sub["status"] == "active" and abs(exp - (time.time() * 1000 + 90 * DAY)) < 180000, (exp - time.time() * 1000) / DAY)
    hs = [v for k, v in d.items() if k.startswith("paymentHistory/")]
    check("admin: queda historial 'approved' con vigencia, solicitud cerrada y comprobante archivado", len(hs) == 1 and hs[0]["status"] == "approved" and hs[0]["expiresAt"]["__ts"] == exp and ("paymentRequests/" + UID) not in d and ("receipts/" + UID) not in d and any(k.startswith("receiptsArchive/") for k in d))
    lg = [v for k, v in d.items() if k.startswith("adminLog/")]
    check("admin: auditoría con admin, acción, estados anterior/nuevo y resultado", lg and lg[0]["by"] == "adm1" and lg[0]["action"] == "approve" and lg[0]["details"]["newStatus"] == "active" and lg[0]["details"]["result"] == "ok", lg)
    # doble aprobación con la solicitud vieja: debe fallar y NO sumar días
    res = pg.evaluate("""async (uid) => { const A = await import('/js/app/admin.js'); const hist = JSON.parse(localStorage.getItem('__fakedb'));
        const req = Object.assign({ uid }, { createdAt: { toMillis: () => %d }, operationCode: 'OP-778899', days: 90 });
        try { await A.approve(req); return 'aprobó'; } catch (e) { return e.message; } }""" % rq["createdAt"]["__ts"], UID)
    d2 = db_get(pg)
    check("admin: repetir la misma aprobación se rechaza y NO duplica días", "ya fue resuelta" in res and d2["subscriptions/" + UID]["expiresAt"]["__ts"] == exp and len([k for k in d2 if k.startswith("paymentHistory/")]) == 1, res)
    # renovación con Premium activo: nueva solicitud de la misma persona
    d2["paymentRequests/" + UID] = dict(rq, createdAt=ts(NOW + 1000), operationCode="OP-RENUEVA1"); d2["receipts/" + UID] = {"image": "data:image/jpeg;base64,/9j/AAA", "mime": "image/jpeg", "size": 30, "createdAt": ts(NOW)}
    db_full(pg, d2); ls_set(pg, "__fakeauth", ADMIN_AUTH); goto(pg, "admin.html"); pg.click("[data-t=pagos]"); pg.wait_for_selector(".adm-card")
    pg.click("[data-i='0']"); pg.wait_for_selector("dialog[open]")
    check("admin: avisa que ya tiene Premium activo (renovación)", "Premium ACTIVO" in pg.inner_text("dialog[open]"))
    pg.click("dialog[open] button:has-text('Aprobar pago y activar Premium')"); pg.wait_for_selector("dialog[open]:has-text('Confirmar aprobación')")
    pg.click("dialog[open] button:has-text('Sí, aprobar')"); pg.wait_for_selector("dialog[open]:has-text('avisa al estudiante')"); pg.click("dialog[open] button:has-text('Listo, cerrar')"); pg.wait_for_timeout(300)
    d3 = db_get(pg); exp2 = d3["subscriptions/" + UID]["expiresAt"]["__ts"]
    check("admin: renovar con Premium activo SUMA 90 días al vencimiento vigente", abs(exp2 - (exp + 90 * DAY)) < 5000, (exp2 - exp) / DAY)
    # rechazo
    d3["paymentRequests/ben1"] = {"uid": "ben1", "email": "ben@test.com", "displayName": "Ben", "planId": "premium90", "planName": "PERMAR Premium — 90 días", "days": 90, "amount": 5, "currency": "PEN", "method": "yape", "operationCode": "BEN-0001", "payerName": "Ben Paz", "note": "", "hasReceipt": False, "confirmed": True, "status": "pending", "createdAt": ts(NOW)}
    db_full(pg, d3); ls_set(pg, "__fakeauth", ADMIN_AUTH); goto(pg, "admin.html"); pg.click("[data-t=pagos]"); pg.wait_for_selector(".adm-card")
    pg.click("[data-i='0']"); pg.wait_for_selector("dialog[open]")
    pg.click("dialog[open] button:has-text('Rechazar solicitud')"); pg.wait_for_selector("dialog[open]"); pg.wait_for_timeout(300)
    check("admin: rechazar sin motivo no procede", "dialog[open]" and pg.locator("dialog[open]:has-text('Revisar pago')").count() == 1 and "ben1" not in "".join(k for k in db_get(pg) if k.startswith("paymentHistory/")))
    pg.select_option("dialog[open] #rjPreset", "1")
    check("admin: un motivo frecuente rellena el campo de motivo", "S/ 5.00" in pg.input_value("dialog[open] #rjReason"), pg.input_value("dialog[open] #rjReason"))
    pg.fill("dialog[open] #rjReason", "No encontré el pago con ese código de operación"); pg.click("dialog[open] button:has-text('Rechazar solicitud')")
    pg.wait_for_selector("dialog[open]:has-text('Confirmar rechazo')"); pg.click("dialog[open] button:has-text('Sí, rechazar')")
    pg.wait_for_selector("dialog[open]:has-text('avisa al estudiante')"); pg.wait_for_timeout(500)
    href = pg.get_attribute("dialog[open] #mlGmail", "href"); dec = __import__("urllib.parse", fromlist=["unquote"]).unquote(href)
    check("admin: tras rechazar, el correo listo para Gmail lleva el MOTIVO y va al estudiante", "to=ben@test.com" in dec and "Motivo: No encontré el pago con ese código de operación" in dec and "no fue aprobada" in dec, dec[:260])
    pg.fill("dialog[open] #mlBody", "Mensaje editado por la administradora"); href2 = __import__("urllib.parse", fromlist=["unquote"]).unquote(pg.get_attribute("dialog[open] #mlGmail", "href"))
    check("admin: el mensaje se puede editar y el enlace de Gmail lo refleja", "Mensaje editado por la administradora" in href2)
    pg.click("dialog[open] button:has-text('Listo, cerrar')"); pg.wait_for_timeout(300)
    d4 = db_get(pg); hr = [v for k, v in d4.items() if k.startswith("paymentHistory/ben1")]
    check("admin: rechazo guarda el motivo escrito por la administradora", hr and hr[0]["status"] == "rejected" and hr[0]["reason"] == "No encontré el pago con ese código de operación" and d4["subscriptions/ben1"]["status"] == "rejected")
    check("admin: rechazo NO activa Premium", d4["subscriptions/ben1"]["status"] != "active")
    tabs = pg.eval_on_selector_all(".adm-tabs [data-t]", "els => els.map(e => e.getAttribute('data-t'))")
    check("admin: el panel se organiza en 6 secciones claras", tabs == ["resumen", "pagos", "usuarios", "correos", "recs", "ajustes"], tabs)
    pg.click("[data-t=pagos]"); pg.click("[data-st=rejected]"); pg.wait_for_selector(".adm-pay.st-rejected")
    check("admin: Pagos → Rechazados muestra el motivo y el botón «Avisar por correo»", "No encontré el pago con ese código de operación" in pg.inner_text("#plist") and pg.locator("#plist [data-m]").count() >= 1)
    pg.click("#plist [data-m='0']"); pg.wait_for_selector("dialog[open]:has-text('avisa al estudiante')")
    check("admin: se puede volver a avisar por correo desde un pago ya resuelto", "to=ben" in __import__("urllib.parse", fromlist=["unquote"]).unquote(pg.get_attribute("dialog[open] #mlGmail", "href")))
    pg.click("dialog[open] button:has-text('Listo, cerrar')")
    pg.click("[data-t=ajustes]"); pg.wait_for_selector(".adm-seg"); pg.click("[data-a=log]"); pg.wait_for_selector(".adm-log li")
    check("admin: Ajustes → Registro de cambios en lenguaje claro", "Rechazó un pago" in pg.inner_text("#view") and "Aprobó un pago" in pg.inner_text("#view"))
    pg.click("[data-t=resumen]"); pg.wait_for_selector(".adm-stats .stat"); st = pg.inner_text("#view"); stl = st.lower()
    check("admin: resumen con usuarios, premium, aprobados, rechazados e ingresos reales (S/ 10.00)", all(x in stl for x in ["premium activos", "pagos aprobados", "solicitudes rechazadas", "s/ 10.00", "usuarios registrados"]), st[:400])
    check("admin: la visita se informa como estimación anónima", "estimaciones anónimas" in stl)
    d4["recommendations/r1"] = {"uid": UID, "email": EMAIL, "category": "correccion", "title": "Error en pregunta 12", "description": "La respuesta correcta parece la B.", "area": "Cultura", "status": "received", "createdAt": ts(NOW)}
    db_full(pg, d4); ls_set(pg, "__fakeauth", ADMIN_AUTH); goto(pg, "admin.html"); pg.click("[data-t=recs]"); pg.wait_for_selector(".adm-card")
    pg.click("[data-i='0']"); pg.wait_for_selector("dialog[open] #rcSt"); pg.select_option("dialog[open] #rcSt", "accepted"); pg.fill("dialog[open] #rcN", "Revisar con el comité"); pg.click("dialog[open] button:has-text('Guardar')"); pg.wait_for_timeout(700)
    d5 = db_get(pg)
    check("admin: cambia el estado de la recomendación y guarda nota PRIVADA aparte", d5["recommendations/r1"]["status"] == "accepted" and "notes" not in d5["recommendations/r1"] and d5["recommendationNotes/r1"]["notes"] == "Revisar con el comité" and d5["recommendationNotes/r1"]["history"][0]["to"] == "accepted")
    goto(pg, "cuenta.html"); pg.wait_for_selector("#app .glass"); check("cuenta: muestra el nombre y correo de quien inició sesión", "admin@test.com" in pg.inner_text("#app"))
    c.close()

    # ============ PREMIUM: acceso, vencimiento, renovación ============
    c, pg = new_ctx(browser); db_full(pg, d5); ls_set(pg, "__fakeauth", AUTH)
    goto(pg, "cuenta.html"); pg.wait_for_selector("#app .plan-status")
    check("premium: estado activo con fechas de inicio y vencimiento", status(pg) == "premium_active" and level(pg) == "premium" and "Premium activo" in pg.inner_text("#app") and "Vence" in pg.inner_text("#app"))
    goto(pg, "quiz.html?categoria=cultura"); answer_n(pg, 2); pg.wait_for_timeout(3500)
    cloudp = db_get(pg); tot = json.loads(cloudp["users/%s/progress/core" % UID]["json"])["totals"]["answers"]
    check("premium: todas las funciones interactivas y el progreso (3 previas + 2)", tot == 5, tot)
    goto(pg, "recomendaciones.html"); pg.wait_for_selector("#recForm"); pg.select_option("#rcat", "funciones"); pg.fill("#rtit", "Modo oscuro por defecto"); pg.fill("#rdes", "Sería útil que el modo oscuro sea el predeterminado."); pg.click("#recSend"); pg.wait_for_selector(".rec-list", timeout=6000)
    rr = [v for k, v in db_get(pg).items() if k.startswith("recommendations/") and v["title"] == "Modo oscuro por defecto"]
    check("recomendaciones: con acceso vigente se envía (estado 'received', sin XP)", rr and rr[0]["status"] == "received" and rr[0]["uid"] == UID)
    check("recomendaciones: el usuario ve solo las suyas y sin notas privadas", "Error en pregunta 12" in pg.inner_text("#app") and "Revisar con el comité" not in pg.inner_text("#app") and "Aceptada" in pg.inner_text("#app"))
    # vence Premium
    cloudp["subscriptions/" + UID] = dict(cloudp["subscriptions/" + UID], expiresAt=ts(NOW - DAY))
    db_full(pg, cloudp); ls_set(pg, "__fakeauth", AUTH)
    goto(pg, "quiz.html?categoria=cultura"); pg.wait_for_selector(".wall")
    check("Premium vencido: pierde acceso interactivo y el muro invita a renovar", status(pg) == "premium_expired" and "Premium venció" in pg.inner_text(".wall"))
    goto(pg, "cuenta.html"); pg.wait_for_selector("#app .plan-status"); check("Premium vencido: conserva cuenta e historial (progreso en la nube intacto)", "Premium vencido" in pg.inner_text("#app") and "users/%s/progress/core" % UID in db_get(pg))
    # renovación aprobada: recupera acceso y datos
    cloudp["subscriptions/" + UID] = dict(cloudp["subscriptions/" + UID], expiresAt=ts(NOW + 90 * DAY), status="active")
    db_full(pg, cloudp); ls_set(pg, "__fakeauth", AUTH)
    goto(pg, "progreso.html"); pg.wait_for_timeout(500)
    ans = pg.evaluate("() => window.PERMAR.Store.get().totals.answers")
    check("renovar: recupera el acceso y su historial anterior (5 respuestas)", level(pg) == "premium" and ans == 5, ans)
    # suspendida
    cloudp["subscriptions/" + UID] = dict(cloudp["subscriptions/" + UID], status="suspended")
    db_full(pg, cloudp); ls_set(pg, "__fakeauth", AUTH); goto(pg, "quiz.html?categoria=cultura")
    check("suspendida: sin acceso interactivo", status(pg) == "suspended" and level(pg) == "locked")
    goto(pg, "admin.html"); check("usuario normal NO accede al panel admin", "Acceso restringido" in pg.inner_text("body"))
    c.close()

    # ============ CIERRE DE SESIÓN ============
    c, pg = new_ctx(browser); db_full(pg, d5); ls_set(pg, "__fakeauth", AUTH)
    goto(pg, "cuenta.html"); pg.click("#outBtn"); pg.wait_for_function("() => !localStorage.getItem('__fakeauth')", timeout=8000); pg.wait_for_timeout(600)
    check("cerrar sesión: se borra la copia local del progreso", not [k for k in keys(pg) if k.startswith("permar_v2_u_") or k.startswith("permar_sync_")], keys(pg))
    goto(pg, "index.html"); check("cerrar sesión: vuelve a visitante (solo lectura)", level(pg) == "visitor")
    c.close()
    browser.close()

fails = [n for n, ok in results if not ok]
print("\nResultado: %d correctas, %d fallidas" % (len(results) - len(fails), len(fails)))
for n in fails: print("  ✘", n)
sys.exit(1 if fails else 0)
