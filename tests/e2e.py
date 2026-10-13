"""Pruebas de extremo a extremo en un navegador real (Chromium + Playwright).
Ejecutar con el servidor activo:  python3 -m http.server 8765  (dentro de simulacro_ascenso_permar)
                                  python3 tests/e2e.py
"""
import json, re, sys, time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8765"
results = []
console_errors = []


def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("  ✔ " if cond else "  ✘ ") + name + ("" if cond else f"   <-- {extra}"))


def section(t):
    print(f"\n▶ {t}")


FIND = """(cat) => { const t=document.querySelector('#pregunta').textContent;
  const banks = cat ? [cat] : ['cultura','deberes','oficinista'];
  for (const k of banks) { const q=PERMAR.DATA[k].find(x=>x.pregunta===t); if(q) return q.correcta; } return -1; }"""


def state(page):
    return page.evaluate("() => JSON.parse(localStorage.getItem('permar_v2')||'null')")


def new_page(ctx, url, clock=False):
    page = ctx.new_page()
    # inner_text aplica text-transform (mayúsculas CSS); textContent devuelve el texto real
    page.inner_text = lambda sel, _p=page: re.sub(r"\s+", " ", _p.eval_on_selector(sel, "e=>e.textContent")).strip()
    page.on("pageerror", lambda e: console_errors.append((url, "pageerror: " + str(e))))
    page.on("console", lambda m: console_errors.append((url, m.text)) if m.type == "error" and "googleapis" not in m.text and "gstatic" not in m.text and "Failed to load resource" not in m.text else None)
    if clock:
        page.clock.install()
    page.goto(BASE + "/" + url)
    return page


def answer_quiz(page, correct, cat=None):
    idx = page.evaluate(FIND, cat)
    assert idx >= 0, "pregunta no encontrada en el banco"
    pick = idx if correct else (idx + 1) % 4
    page.click(f'.opcion[data-i="{pick}"]')


def run_phase(page, n, n_correct, cat):
    for i in range(n):
        answer_quiz(page, i < n_correct, cat)
        page.click("#nextBtn")


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})

    # ------------------------------------------------------------------ hub vacío
    section("Centro de estudio · estado inicial")
    page = new_page(ctx, "index.html")
    check("muestra bienvenida (sin estadísticas ficticias)", page.is_visible("#welcome") and not page.is_visible("#today"))
    check("7 modalidades", page.locator("#modes .mode").count() == 7)
    check("3 categorías conservadas", page.locator("#cats a.card").count() == 3)
    check("enlaces de categoría correctos", page.get_attribute("#cats a.card >> nth=2", "href") == "quiz.html?categoria=oficinista")
    page.close()

    # ------------------------------------------------------------------ práctica clásica
    section("Práctica clásica · fases y guardado")
    page = new_page(ctx, "quiz.html?categoria=cultura")
    check("título de categoría", page.inner_text("#titulo") == "CULTURA GENERAL")
    check("no se puede avanzar sin responder", page.is_disabled("#nextBtn"))
    run_phase(page, 25, 20, "cultura")
    txt = page.inner_text("#summaryView")
    check("fase 1: 20 / 25 y nota 16.00", "20 / 25" in txt and "16.00 / 20" in txt, txt[:200])
    st = state(page)
    check("intento guardado automáticamente (1 registro)", st and len(st["attempts"]) == 1)
    page.click("#goOn")
    check("fase 2 empieza en pregunta 26 de 50", "Pregunta 26 de 50" in page.inner_text("#progreso"))
    run_phase(page, 25, 10, "cultura")
    txt = page.inner_text("#summaryView")
    check("fase 2 se califica SOLO con sus 25: 10 / 25 = 8.00", "10 / 25" in txt and "8.00 / 20" in txt, txt[:300])
    check("acumulado aparte: 30 / 50 = 12.00", "30 / 50" in txt and "12.00 / 20" in txt, txt[:300])
    check("sigue habiendo 1 solo registro al pasar de fase", len(state(page)["attempts"]) == 1)
    page.click("#goEnd")
    page.click("#goEnd", timeout=500) if page.locator("#goEnd").count() else None
    att = state(page)["attempts"]
    check("terminar no duplica: 1 registro con 30/50 y nota 12", len(att) == 1 and att[0]["correct"] == 30 and att[0]["total"] == 50 and abs(att[0]["grade"] - 12) < 1e-9, att)
    check("pantalla final sin NaN", "NaN" not in page.inner_text("#summaryView") and "Fase alcanzada" in page.inner_text("#summaryView"))
    check("2 fases registradas con notas independientes", [round(p["grade"], 2) for p in att[0]["phases"]] == [16.0, 8.0])
    st = state(page)
    check("cada respuesta alimenta el sistema (50 preguntas únicas)", len(st["q"]) == 50 and st["totals"]["answers"] == 50)
    check("errores registrados con su categoría", sum(1 for q in st["q"].values() if q["lapses"] > 0) == 20 and all(q["cat"] == "cultura" for q in st["q"].values()))
    page.close()

    # 100 preguntas completas
    page = new_page(ctx, "quiz.html?categoria=deberes")
    for ph in range(4):
        run_phase(page, 25 if ph < 3 else 24, 18, "deberes")
        if ph < 3:
            check(f"fase {ph+1} resumen visible", page.is_visible("#summaryView"))
            page.click("#goOn")
    answer_quiz(page, True, "deberes"); page.click("#nextBtn")      # pregunta 100 (última de la fase 4)
    check("al acabar la 100 se muestra resumen de la fase 4", page.is_visible("#summaryView") and "Fase 4 completada" in page.inner_text("#summaryView"))
    page.click("#goFinal")
    txt = page.inner_text("#summaryView")
    att = [a for a in state(page)["attempts"] if a["cat"] == "deberes"]
    check("intento de 100 guardado una sola vez", len(att) == 1 and att[0]["total"] == 100 and att[0]["status"] == "completo", att)
    check("resultado final sin NaN y con las 4 fases", "NaN" not in txt and "Fase 4" in txt and "undefined" not in txt, txt[:300])
    check("nota acumulada coherente (73/100 → 14.60)", att[0]["correct"] == 18 * 3 + 18 + 1 and abs(att[0]["grade"] - (att[0]["correct"] / 100 * 20)) < 1e-9, att[0])
    page.close()

    # salir con guardado parcial
    page = new_page(ctx, "quiz.html?categoria=oficinista")
    for i in range(7):
        answer_quiz(page, i % 2 == 0, "oficinista"); page.click("#nextBtn") if i < 6 else None
    page.click("#exitBtn")
    check("salir ofrece guardar intento parcial", page.is_visible("dialog[open]") and "Terminar y guardar" in page.inner_text("dialog[open]"))
    page.click("dialog[open] button:has-text('Terminar y guardar')")
    att = [a for a in state(page)["attempts"] if a["cat"] == "oficinista"]
    check("intento parcial guardado una vez (7 respondidas, 4 aciertos)", len(att) == 1 and att[0]["total"] == 7 and att[0]["correct"] == 4 and att[0]["status"] == "parcial", att)
    page.close()

    # ------------------------------------------------------------------ errores
    section("Repasar mis errores · estado y persistencia")
    page = new_page(ctx, "estudio.html?modo=errores")
    body = page.inner_text("#setupView")
    check("lista los errores por filtro", "Todas las falladas" in body and "Pendientes de dominar" in body, body[:200])
    page.click("#goBtn")
    first_id = None
    q0 = state(page)
    errs_before = sum(1 for q in q0["q"].values() if q["lapses"] > 0 and not q["mastered"])
    answer_quiz(page, True)
    page.wait_for_selector("#expBtn:not([hidden])")
    s2 = state(page)
    changed = [k for k in s2["q"] if s2["q"][k]["n"] != q0["q"].get(k, {}).get("n")]
    check("responder un error actualiza su estado", len(changed) == 1)
    k = changed[0]
    check("acertar el mismo día de un fallo NO lo da por dominado ni avanza", s2["q"][k]["streak"] == 0 and not s2["q"][k]["mastered"], s2["q"][k])
    page.reload()
    check("al recargar se ofrece continuar la sesión", page.is_visible("dialog[open]") and "sin terminar" in page.inner_text("dialog[open]"))
    page.click("dialog[open] button:has-text('Continuar')")
    check("continúa con la siguiente pregunta (sin repetir la respondida)", page.inner_text("#pregunta") != "" and page.is_visible("#sessionView"))
    page.click("#finishBtn"); page.click("dialog[open] button:has-text('Finalizar')")
    check("resumen de sesión con aciertos/errores/tiempo", all(w in page.inner_text("#summaryView") for w in ["respondidas", "aciertos", "errores", "tiempo"]))
    s3 = state(page)
    check("sesión guardada una sola vez y sin restos activos", len([s for s in s3["sessions"] if s["type"] == "errores"]) == 1 and page.evaluate("() => localStorage.getItem('permar_v2_active_estudio')") is None)
    check("con <5 respuestas no cuenta como completada", s3["sessions"][-1]["counted"] is False)
    page.close()

    # ------------------------------------------------------------------ sesión por tiempo
    section("Práctica rápida · por tiempo y por preguntas")
    page = new_page(ctx, "estudio.html?modo=rapida&min=5", clock=True)
    page.click("#goBtn")
    check("temporizador visible", page.is_visible("#timer") and "⏱" in page.inner_text("#timer"))
    for i in range(6):
        answer_quiz(page, i % 3 != 0); page.click("#nextBtn")
    page.clock.fast_forward(5 * 60 * 1000 + 2000)
    page.wait_for_timeout(700)
    check("al agotarse el tiempo avisa sin cortar la pregunta en curso", page.is_visible("#banner") and "Se acabó el tiempo" in page.inner_text("#banner") and page.is_visible("#sessionView"))
    answer_quiz(page, True)
    check("tras contestarla el botón pasa a «Ver resumen»", page.inner_text("#nextBtn") == "Ver resumen")
    page.click("#nextBtn")
    txt = page.inner_text("#summaryView")
    check("resumen conserva las 7 respondidas", "7" in txt and "respondidas" in txt)
    ses = [s for s in state(page)["sessions"] if s["type"] == "rapida"]
    check("sesión por tiempo registrada completada y contada", len(ses) == 1 and ses[0]["answered"] == 7 and ses[0]["status"] == "completada" and ses[0]["counted"], ses)
    page.close()

    page = new_page(ctx, "estudio.html?modo=rapida")
    page.check("input[value='n10']", force=True)
    page.click("#goBtn")
    seen = set()
    for i in range(10):
        seen.add(page.inner_text("#pregunta")); answer_quiz(page, True); page.click("#nextBtn")
    check("sesión de 10 preguntas: sin repetidas y termina sola", len(seen) == 10 and page.is_visible("#summaryView"))
    page.close()

    # ------------------------------------------------------------------ tarjetas
    section("Tarjetas de memoria")
    page = new_page(ctx, "tarjetas.html")
    page.click("#goBtn")
    check("no se puede evaluar antes de revelar", all(page.is_disabled(f'.rate[data-r="{r}"]') for r in "rdn"))
    qtxt = page.inner_text("#fq")
    page.click("#flash")
    check("revelar activa la evaluación", all(not page.is_disabled(f'.rate[data-r="{r}"]') for r in "rdn"))
    ans = page.inner_text("#fa")
    real = page.evaluate("(t) => { for (const k of ['cultura','deberes','oficinista']) { const q=PERMAR.DATA[k].find(x=>x.pregunta===t); if (q) return q.opciones[q.correcta]; } return null; }", qtxt)
    check("la respuesta es exactamente la opción correcta del banco", ans == real, (ans, real))
    page.click('.rate[data-r="r"]')
    check("avanza y cuenta estudiadas/pendientes", "Estudiadas: 1" in page.inner_text("#contador") and "Pendientes: 9" in page.inner_text("#contador"))
    page.click("#prevBtn")
    check("se puede volver a la tarjeta anterior (solo lectura)", "Lo recordé" in page.inner_text("#fstate") and all(page.is_disabled(f'.rate[data-r="{r}"]') for r in "rdn"))
    page.click("#revealBtn")
    for r in "dnrdnrdnr":
        page.click("#flash"); page.click(f'.rate[data-r="{r}"]')
    check("al evaluar todas aparece el resumen", page.is_visible("#summaryView") and "estudiadas" in page.inner_text("#summaryView").lower())
    stt = state(page)
    check("evaluaciones alimentan el repaso (dudas→mañana, no recordé→errores)", stt["totals"]["cards"] == 10 and any(q["last"] == "d" for q in stt["q"].values()))
    check("las tarjetas respetan 'movimiento reducido' (regla CSS presente)", "prefers-reduced-motion" in page.evaluate("() => [...document.styleSheets].map(s=>{try{return [...s.cssRules].map(r=>r.cssText).join('')}catch(e){return ''}}).join('')"))
    page.close()

    # ------------------------------------------------------------------ simulacro
    section("Simulacro cronometrado")
    page = new_page(ctx, "simulacro.html", clock=True)
    page.check("input[name='cat'][value='cultura']", force=True)
    page.check("input[name='n'][value='25']", force=True)
    check("tiempo sugerido se ajusta a la cantidad", page.input_value("#mins") == "25")
    page.fill("#mins", "5")
    page.click("#goBtn")
    check("examen iniciado con 25 preguntas", "de 25" in page.inner_text("#qnum"))
    correct_n = 0
    for i in range(25):
        if i < 10:
            ok = i < 7
            idx = page.evaluate(FIND, "cultura")
            page.click(f'.opcion[data-i="{idx if ok else (idx + 1) % 4}"]')
            correct_n += 1 if ok else 0
        if i in (3, 8):
            page.check("#markChk")
        page.keyboard.press("ArrowRight") if i < 24 else None
    page.wait_for_timeout(200)
    check("durante el examen NO se revela acierto ni explicación", page.locator(".opcion.correcta, .opcion.incorrecta, #expText, .feedback").count() == 0)
    check("contador de sin responder (15)", "15" in page.inner_text("#counts") and "10" in page.inner_text("#counts"))
    check("preguntas marcadas en el navegador (2)", page.locator(".qn.marked").count() == 2)
    page.click("#finishBtn")
    check("pide confirmación con resumen", "Marcadas para revisar: 2" in page.inner_text("dialog[open]") and "Sin responder: 15" in page.inner_text("dialog[open]"))
    page.click("dialog[open] button:has-text('Volver')")
    check("se puede volver al examen", page.is_visible("#examView"))
    page.click("#finishBtn")
    btn = page.locator("dialog[open] button:has-text('Finalizar ahora')")
    btn.dblclick()
    page.wait_for_selector("#resultView:not([hidden])")
    ex = state(page)["exams"]
    check("el simulacro se guarda UNA vez aunque se pulse dos veces", len(ex) == 1, len(ex))
    e = ex[0]
    exp_grade = correct_n / 25 * 20
    check("nota correcta = aciertos/total×20", e["correct"] == correct_n and abs(e["grade"] - exp_grade) < 1e-9 and e["unanswered"] == 15 and e["wrong"] == 10 - correct_n, e)
    check("estado: finalizado voluntariamente", e["status"] == "finalizado voluntariamente")
    rt = page.inner_text("#resultView")
    check("resultado muestra nota, %, correctas, incorrectas, sin responder, tiempo", all(w in rt for w in ["nota sobre 20", "de aciertos", "correctas", "incorrectas", "sin responder", "de 5 min"]))
    check("revisión con explicación/fuente solo ahora", page.locator(".rv-item").count() == 25 and page.locator(".rv-exp").count() >= 1)
    page.check("input[value='mal']", force=True)
    check("filtro de revisión (incorrectas)", page.locator(".rv-item:visible").count() == 10 - correct_n)
    check("hay recomendación de estudio", page.locator(".recs li").count() >= 1)
    sq = state(page)
    check("solo las contestadas pasan al aprendizaje (10 nuevas)", len([k for k in sq["q"]]) >= 10)
    page.close()

    # tiempo agotado
    page = new_page(ctx, "simulacro.html", clock=True)
    page.check("input[name='n'][value='25']", force=True)
    page.fill("#mins", "5")
    page.click("#goBtn")
    idx = page.evaluate(FIND, None)
    page.click(f'.opcion[data-i="{idx}"]')
    page.clock.fast_forward(5 * 60 * 1000 + 3000)
    page.wait_for_selector("#resultView:not([hidden])", timeout=5000)
    ex = state(page)["exams"]
    check("al agotarse el tiempo finaliza automáticamente (tiempo agotado)", len(ex) == 2 and ex[-1]["status"] == "tiempo agotado" and ex[-1]["answered"] == 1, ex[-1] if ex else None)
    page.close()

    # restaurar / interrumpir
    page = new_page(ctx, "simulacro.html")
    page.check("input[name='n'][value='25']", force=True)
    page.click("#goBtn")
    idx = page.evaluate(FIND, None)
    page.click(f'.opcion[data-i="{idx}"]')
    n_exams = len(state(page)["exams"])
    q_before = len(state(page)["q"])
    page.reload()
    check("recargar ofrece continuar el simulacro", "simulacro en curso" in page.inner_text("dialog[open]"))
    page.click("dialog[open] button:has-text('Continuar')")
    check("se conservan las respuestas", page.locator(".qn.answered").count() == 1)
    page.reload()
    page.click("dialog[open] button:has-text('Descartar')")
    ex = state(page)["exams"]
    check("descartar lo registra como interrumpido, sin nota ni respuestas al aprendizaje", len(ex) == n_exams + 1 and ex[-1]["status"] == "interrumpido" and not ex[-1]["counted"] and len(state(page)["q"]) == q_before)
    page.close()

    # ------------------------------------------------------------------ hub con datos + ajustes
    section("Centro de estudio con datos · ajustes")
    page = new_page(ctx, "index.html")
    check("panel de hoy visible con datos reales", page.is_visible("#today") and page.locator("#today .stat").count() >= 5)
    today_txt = page.inner_text("#today")
    check("muestra objetivo, racha, nivel, repasos", all(w in today_txt for w in ["Objetivo diario", "Racha", "Nivel", "Repasos de hoy", "Acierto reciente", "Última actividad"]))
    page.click("#settingsBtn")
    page.select_option("#setType", "sesion")
    page.select_option("#setTarget", "2")
    check("cambiar objetivo persiste", state(page)["goal"] == {"type": "sesion", "target": 2})
    page.check("#setMotion")
    check("reducir animaciones persiste y se aplica", state(page)["prefs"]["reduceMotion"] and page.get_attribute("html", "data-motion") == "reduce")
    page.click("dialog[open] button:has-text('Cerrar')")
    page.close()

    # ------------------------------------------------------------------ desafíos
    section("Desafíos y medallas")
    page = new_page(ctx, "desafios.html")
    check("3 desafíos semanales", page.locator(".challenge").count() == 3)
    unlocked = page.locator(".badge-card:not(.locked)").count()
    st = state(page)
    check("las medallas desbloqueadas coinciden con las guardadas", unlocked == len(st["badges"]), (unlocked, st["badges"]))
    check("las bloqueadas muestran su requisito real", page.locator(".badge-card.locked .cond").count() == 9 - unlocked)
    page.close()

    # ------------------------------------------------------------------ progreso
    section("Mi progreso")
    page = new_page(ctx, "progreso.html")
    check("resumen y categorías", page.locator("#summary .tile").count() == 8 and page.locator(".catcard").count() == 3)
    check("gráfico de evolución (SVG con título accesible)", page.locator("#evo svg[role=img]").count() == 1)
    check("gráfico por fase", page.locator("#phases svg[role=img]").count() == 1)
    check("historial lista práctica, simulacros y sesiones", page.locator("#hist li").count() >= 6)
    page.locator("#hist button").first.click()
    check("detalle de un registro", page.locator("#hist .detail:visible").count() == 1)
    exam_btn = page.locator("#hist button:has-text('Simulacro · finalizado')").first
    exam_btn.click()
    check("detalle de simulacro con revisión", page.locator("#hist .rv-item").count() > 0)
    check("distingue únicas vs totales vs dominio", all(w in page.inner_text("#summary") for w in ["respuestas totales", "preguntas únicas", "dominadas"]))
    page.close()

    # ------------------------------------------------------------------ migración del historial viejo
    section("Compatibilidad con el historial anterior")
    ctx2 = browser.new_context(viewport={"width": 1280, "height": 900})
    old = [{"categoria": "cultura", "puntaje": 20, "total": 25, "nota": "16.00", "fase": 1, "fecha": "1/9/2026, 10:00:00"},
           {"categoria": "deberes", "puntaje": 10, "total": 50, "nota": "4.00", "fase": 2, "fecha": "2/9/2026, 10:00:00"}]
    ctx2.add_init_script("if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1'); localStorage.setItem('historial', %s)}" % json.dumps(json.dumps(old)))
    page = new_page(ctx2, "progreso.html")
    check("el historial viejo aparece en Mi progreso", page.locator("#hist li").count() == 2 and "importado" in page.inner_text("#hist"))
    page.reload()
    check("no se duplica al recargar", page.locator("#hist li").count() == 2)
    check("el historial original no se borró", page.evaluate("() => JSON.parse(localStorage.getItem('historial')).length") == 2)
    page.click("#resetBtn")
    check("borrar progreso explica qué se elimina y pide confirmación", "No se borran" in page.inner_text("dialog[open]"))
    page.click("dialog[open] button:has-text('Sí, borrar todo')")
    page.wait_for_selector("#empty:not([hidden])", timeout=5000)
    check("tras borrar queda vacío (estado inicial)", page.is_visible("#empty") and page.evaluate("() => localStorage.getItem('historial')") is None)
    page.close(); ctx2.close()

    # ------------------------------------------------------------------ vistas: móvil / oscuro / desbordamiento
    section("Diseño adaptable y modo oscuro")
    mob = browser.new_context(viewport={"width": 375, "height": 740}, has_touch=True, is_mobile=True)
    mob.add_init_script("localStorage.setItem('simulacro_theme','dark')")
    pages = ["index.html", "quiz.html?categoria=cultura", "estudio.html?modo=rapida", "estudio.html?modo=errores", "estudio.html?modo=hoy",
             "tarjetas.html", "simulacro.html", "desafios.html", "progreso.html"]
    for u in pages:
        pg = new_page(mob, u)
        pg.wait_for_timeout(250)
        ov = pg.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
        check(f"sin desbordamiento horizontal en móvil · {u}", ov <= 1, ov)
        check(f"modo oscuro aplicado · {u}", pg.get_attribute("html", "data-theme") == "dark")
        small = pg.evaluate("() => [...document.querySelectorAll('button:not([hidden]), a.btn, .mode, select, input:not([type=radio]):not([type=checkbox])')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.height<38||r.width<38)&&getComputedStyle(e).visibility!=='hidden'}).map(e=>e.tagName+'#'+e.id+'.'+e.className).slice(0,5)")
        check(f"botones táctiles ≥ 38 px · {u}", not small, small)
        pg.close()
    pg = new_page(mob, "index.html"); pg.screenshot(path="/tmp/shot_hub_mobile_dark.png", full_page=True); pg.close()
    mob.close()

    browser.close()

section("Errores de consola")
check("sin errores de JavaScript ni de consola en ninguna pantalla", not console_errors, console_errors[:5])

ok = sum(1 for _, c in results if c)
print(f"\nResultado: {ok} correctas, {len(results) - ok} fallidas de {len(results)}")
sys.exit(0 if ok == len(results) else 1)
