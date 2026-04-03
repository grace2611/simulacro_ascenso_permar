// =============================
// 🔹 OBTENER CATEGORÍA
// =============================
const params = new URLSearchParams(window.location.search);
const categoria = params.get("categoria");

// =============================
// 🔹 BANCO DE PREGUNTAS
// =============================
let banco = {


cultura: [

{ pregunta: "¿Cuál fue el primer conflicto internacional en el que participó la República Peruana?", opciones: ["La Guerra con la Gran Venezuela (1828-1829)", "La Guerra con la Gran Colombia (1828-1829)", "La Guerra con el Gran Ecuador (1828-1829)", "La Guerra con la Gran Brasilia (1828-1829)"], correcta: 1, fuente: "Basadre, J. (2014). Historia de la República del Perú. Ediciones Copé." },
{ pregunta: "¿Cuál fue el primer buque de alto bordo construido en América del Sur?", opciones: ["B.A.P. “LOBITOS”", "B.A.P. “ZORRILLOS”", "B.A.P. “UNIÓN”", "B.A.P. “ZORRITOS”"], correcta: 3, fuente: "Marina de Guerra del Perú. (2021). Reglamento de Organización y Funciones (ROF)." },
{ pregunta: "¿Cuál fue el nombre de la esposa de Miguel Grau?", opciones: ["Sandra Cabello", "Dolores Seminario", "Dolores Cabello", "Sandra Seminario"], correcta: 2, fuente: "Romero, R. (2013). Historia marítima del Perú: La República. Fondo Editorial de la Marina de Guerra del Perú." },
{ pregunta: "¿Cuáles son los órganos de línea de la Marina de Guerra del Perú?", opciones: ["Las Comandancias Generales de Operaciones\nLa Dirección General de Capitanías y Guardacostas\nLa Comandancia de Ciberdefensa", "La Comandancias General de Operaciones del Pacífico\nLa Dirección General de Capitanías y Guardacostas\nLa Comandancia de Ciberdefensa", "La Comandancia General de Operaciones de la Amazonía\nLa Dirección General de Capitanías y Guardacostas\nLa Comandancia de Ciberdefensa", "Las Comandancias Generales de Operaciones\nLa Dirección General de Capitanías y Guardacostas\nLa Dirección de Telemática de la Marina"], correcta: 0, fuente: "Marina de Guerra del Perú. (2021). Reglamento de Organización y Funciones (ROF)." },
{ pregunta: "¿Cuál fue la primera unidad naval peruana?", opciones: ["BAP UNIÓN", "El pailebote Sacramento", "El boqueron", "BAP Alm. Grau"], correcta: 1, fuente: "Romero, R. (2013). Historia marítima del Perú: La República. Fondo Editorial de la Marina de Guerra del Perú." },
{ pregunta: "¿En que lugar desembarcó el General José de San Martín, al mando de la Expedición Libertadora?", opciones: ["Bahía de Mollendo", "Bahía del Callao", "Bahía de Miraflores", "Bahía de Paracas"], correcta: 3, fuente: "Basadre, J. (2014). Historia de la República del Perú (Vol. 1). Ediciones Copé." },
{ pregunta: "¿Cuál fue el primer buque de guerra peruano en circunnavegar el mundo?", opciones: ["La fragata Amazonas", "Corbeta Traflagar", "Destructor Montero", "Crucero Ligero Misilero Almirante Grau"], correcta: 0, fuente: "Marina de Guerra del Perú. (2023). Libro Blanco de la Defensa Nacional." },
{ pregunta: "¿Qué buque chileno fue hundido por el monitor Huáscar en el Combate Naval de Iquique?", opciones: ["La Corbeta Covadonga", "La Corbeta Blanco", "La Corbeta Esmeralda", "La Corbeta Unión"], correcta: 2, fuente: "Novak, F., & Namihas, S. (2013). La Guerra del Pacífico: Campaña Naval. Fondo Editorial de la Marina de Guerra del Perú." },
{ pregunta: "¿Qué buque peruano realizó la primera Campaña Antártica?", opciones: ["BAP Carrasco", "El B.I.C. Humboldt", "La Goleta Sacramento", "Velero Unión"], correcta: 1, fuente: "Marina de Guerra del Perú. (2023). Libro Blanco de la Defensa Nacional." },
{ pregunta: "¿Cuál es el nombre de la Estación Científica Antártica?", opciones: ["Atlantis-1", "Estación MGP", "Estación Perú", "Machu Picchu"], correcta: 3, fuente: "Instituto Antártico Peruano (INANPE). (2024). Estación Científica Antártica Machu Picchu. Recuperado de https://www.inanpe.gob.pe" },
{ pregunta: "¿Cuál es el nombre del buque oceanográfico polar de la Marina?", opciones: ["El B.I.C. Humboldt", "La Goleta Sacramento", "B.A.P. CARRASCO", "Velero Unión"], correcta: 2, fuente: "Marina de Guerra del Perú. (2023). Libro Blanco de la Defensa Nacional." },
{ pregunta: "¿En qué fecha se celebra el aniversario de las Fuerzas Armadas?", opciones: ["El 24 de setiembre", "El 8 de setiembre", "El 8 de octubre", "El 24 de octubre"], correcta: 0, fuente: "Decreto Ley N° 25065. Ley que establece el 24 de septiembre como Día de las Fuerzas Armadas. (1989, septiembre 23)." },
{ pregunta: "¿En qué fecha nació el Almirante Grau?", opciones: ["8 de octubre de 1834", "27 de julio de 1834", "28 de julio de 1635", "28 de agosto de 1834"], correcta: 1, fuente: "Romero, R. (2013). Historia marítima del Perú: La República. Fondo Editorial de la Marina de Guerra del Perú." },
{ pregunta: "¿A qué se denomina empavesado?", opciones: ["Al conjunto de gallardetes del Código nacional de Señales que se tiende a bordo a lo largo de la línea de crujía, a la mayor altura posible, se emplea entre el orto y el ocaso", "Al conjunto de banderas del Código nacional de Señales que se tiende a bordo a lo largo de la línea de la quilla, a la mayor altura posible, se emplea entre el orto y el ocaso", "Al conjunto de banderas del Código Internacional de Señales que se tiende a bordo a lo largo de la línea de crujía, a la mayor altura posible, se emplea entre el orto y el ocaso", "Al conjunto de gallardetes del Código internacional de Señales que se tiende a bordo a lo largo de la línea de la quilla, a la mayor altura posible, se emplea entre el orto y 1200 horas"], correcta: 2, fuente: "Marina de Guerra del Perú. (2015). Manual de Navegación. Dirección de Instrucción y Entrenamiento." },
{ pregunta: "¿A qué se denomina guirnalda?", opciones: ["Al conjunto de banderas del Código nacional de Señales que se tiende a bordo a lo largo de la línea de la quilla, a la mayor altura posible, se emplea entre el orto y el ocaso", "Al conjunto de banderas del Código Internacional de Señales que se tiende a bordo a lo largo de la línea de crujía, a la mayor altura posible, se emplea entre el orto y el ocaso", "A la instalación de luces negras con funciones eléctricas, compuesta por una serie de lámparas incandescentes colocadas para delinear la continuidad de la quilla, bandas y codaste; así como, el contorno de la superestructura y montajes de artillería y misiles, se emplea entre el ocaso hasta las 1200", "A la instalación eléctrica compuesta por una serie de lámparas incandescentes blancas colocadas para delinear la continuidad de la roda, bandas y codaste; así como, el contorno de la superestructura y montajes de artillería y misiles, se emplea entre el ocaso y el orto"], correcta: 3, fuente: "Marina de Guerra del Perú. (2015). Manual de Navegación. Dirección de Instrucción y Entrenamiento." },
{ pregunta: "¿Cuál es la equivalencia del grado de Vicealmirante, en el Ejército del Perú, Fuerza Aérea del Perú y Policía Nacional del Perú?", opciones: ["Ejército del Perú: General de División, Fuerza Aérea del Perú: Teniente General, Policía Nacional del Perú: Teniente General PNP.", "Ejército del Perú: General de Brigada, Fuerza Aérea del Perú: Teniente Coronel, Policía Nacional del Perú: Teniente General PNP.", "Ejército del Perú: General del Aire, Fuerza Aérea del Perú: Teniente General, Policía Nacional del Perú: Teniente General PNP.", "Ejército del Perú: General de División, Fuerza Aérea del Perú: Teniente Coronel, Policía Nacional del Perú: Teniente General EP."], correcta: 0, fuente: "Decreto Legislativo N° 1138. Ley de Organización y Funciones de la Marina de Guerra del Perú. (2012, diciembre 22)." },
{ pregunta: "¿Cuál es la equivalencia del grado de Contralmirante, en el Ejército del Perú, Fuerza Aérea del Perú y Policía Nacional del Perú?", opciones: ["Ejército del Perú: General de División, Fuerza Aérea del Perú: Teniente General, Policía Nacional del Perú: Teniente General PNP.", "Ejército del Perú: General de Brigada, Fuerza Aérea del Perú: Mayor General, Policía Nacional del Perú: General PNP.", "Ejército del Perú: General del Aire, Fuerza Aérea del Perú: Teniente General, Policía Nacional del Perú: Teniente General PNP.", "Ejército del Perú: General de División, Fuerza Aérea del Perú: Teniente Coronel, Policía Nacional del Perú: Teniente General EP."], correcta: 1, fuente: "Decreto Legislativo N° 1138. Ley de Organización y Funciones de la Marina de Guerra del Perú. (2012, diciembre 22)." },
{ pregunta: "¿A qué se denomina Jack nacional?", opciones: ["Es el distintivo de unidad operativa, consiste en una bandera cuadrada de color blanco, cuyo perímetro tiene una franja roja y en cuyo centro está el Escudo de Armas.", "Representa la riqueza del reino vegetal y el patrimonio natural del Perú.", "Representa la riqueza del reino animal del Perú", "Es el distintivo de unidad inoperativa, consiste en un gallardete triangular de color blanco, cuyo perímetro tiene una franja roja y en cuyo centro está el Escudo de Armas."], correcta: 0, fuente: "Marina de Guerra del Perú. (2015). Manual de Navegación. Dirección de Instrucción y Entrenamiento." },
{ pregunta: "¿Cuáles son las unidades tipo Fragata Misilera de la Marina de Guerra del Perú?", opciones: ["B.A.P. “Almirante Grau”\nB.A.P. “Mariátegui”\nB.A.P. “Aguirre”\nB.A.P. “Palacios”\nB.A.P. “Bolognesi”\nB.A.P. “Unión”", "B.A.P. “Almirante Grau”\nB.A.P. “Mariátegui”\nB.A.P. “Aguirre”\nB.A.P. “Palacios”\nB.A.P. “Bolognesi”\nB.A.P. “Jorge Chávez”", "B.A.P. “Almirante Grau”\nB.A.P. “Mariátegui”\nB.A.P. “Aguirre”\nB.A.P. “Palacios”\nB.A.P. “Bolognesi”\nB.A.P. “Quiñones”", "B.A.P. “Almirante Grau”\nB.A.P. “Mariátegui”\nB.A.P. “Aguirre”\nB.A.P. “Palacios”\nB.A.P. “Chorrillos”\nB.A.P. “Chávez”"], correcta: 2, fuente: "Marina de Guerra del Perú. (2023). Libro Blanco de la Defensa Nacional." },
{ pregunta: "¿Cuál es la unidad Auxiliar de Reaprovisionamiento Logístico de la Marina de Guerra del Perú?", opciones: ["B.A.P. “Almirante Grau”", "B.A.P. “Unión”", "B.A.P. “Ferré”", "B.A.P. “Tacna”"], correcta: 3, fuente: "Marina de Guerra del Perú. (2023). Libro Blanco de la Defensa Nacional." },
{ pregunta: "¿Cuáles son las unidades tipo Corbeta Misilera de la Marina de Guerra del Perú?", opciones: ["B.A.P. “Santillana”\nB.A.P. “De Los Heros”\nB.A.P. “Herrera”\nB.A.P. ”Sanchez Carrión”\nB.A.P. “Guise”", "B.A.P. “Angamos”\nB.A.P. “Antofagasta”\nB.A.P. “Pisagua”\nB.A.P. “Herrera”\nB.A.P. “Islay”\nB.A.P. “Sanchez Carrión”", "B.A.P. “Pisco”\nB.A.P. “Paita”", "B.A.P. “Unión”\nB.A.P. “Tacna”"], correcta: 0, fuente: "Marina de Guerra del Perú. (2023). Libro Blanco de la Defensa Nacional." },
{ pregunta: "¿Cuál es la unidad tipo Corbeta Costera de la Marina de Guerra del Perú?", opciones: ["B.A.P. “Pisco”\nB.A.P. “Paita”", "B.A.P. “Ferré”", "B.A.P. “Unión”\nB.A.P. “Tacna”", "B.A.P. “Almirante Grau”"], correcta: 1, fuente: "Marina de Guerra del Perú. (2023). Libro Blanco de la Defensa Nacional." },
{ pregunta: "¿Cuáles son las unidades multipropósito tipo LPD de la Marina de Guerra del Perú?", opciones: ["B.A.P. “Unión”\nB.A.P. “Tacna”", "B.A.P. “Pisco”\nB.A.P. “Paita”", "B.A.P. “Almirante Grau”", "B.A.P. “Ferré”"], correcta: 1, fuente: "Marina de Guerra del Perú. (2023). Libro Blanco de la Defensa Nacional." },
{ pregunta: "¿Cuáles son los submarinos tipo 209 de la Marina de Guerra del Perú?", opciones: ["B.A.P. “Santillana”\nB.A.P. “De Los Heros”\nB.A.P. “Herrera”\nB.A.P. ”Sanchez Carrión”\nB.A.P. “Guise”", "B.A.P. “Pisco”\nB.A.P. “Paita”", "B.A.P. “Angamos”\nB.A.P. “Antofagasta”\nB.A.P. “Pisagua”\nB.A.P. “Herrera”\nB.A.P. “Islay”\nB.A.P. “Sanchez Carrión”", "B.A.P. “Angamos”\nB.A.P. “Antofagasta”\nB.A.P. “Pisagua”\nB.A.P. “Chipana”\nB.A.P. “Islay”\nB.A.P. “Arica”"], correcta: 3, fuente: "Marina de Guerra del Perú. (2023). Libro Blanco de la Defensa Nacional." },
{ pregunta: "¿Cuáles son los roles estratégicos de la Marina de Guerra del Perú?", opciones: ["Defensa de la Soberanía e Integridad Marítima\nContribución al Desarrollo Económico y Social\nApoyo a la Policia Nacional\nParticipación en Defensa Civil\nApoyo al Control Interno\nEjercicio de la Autoridad Marítima", "Defensa de la Soberanía e Integridad Marítima\nContribución al Desarrollo Económico y Social\nApoyo a la Policia Nacional\nParticipación en Defensa Ecosostenible\nApoyo al Control Interno\nEjercicio de la Autoridad Marítima", "Defensa de la Soberanía e Integridad Territorial\nContribución al Desarrollo Económico y Social\nApoyo a la Política Exterior\nParticipación en Defensa Civil\nApoyo al Control Interno\nEjercicio de la Autoridad Marítima", "Defensa de la Soberanía e Integridad Marítima\nContribución al Desarrollo Económico y Social\nApoyo a la Policia Nacional\nParticipación en Defensa Civil\nApoyo al Control Interno\nEjercicio de la Autoridad Nacional del Agua"], correcta: 2, fuente: "Marina de Guerra del Perú. (2023). Libro Blanco de la Defensa Nacional." },
{ pregunta: "¿Cuáles son principios institucionales de la Marina de Guerra del Perú?", opciones: ["Legalidad\nGestión del Conocimiento\nTransparencia\nActitud positiva y proactiva hacia la gestión del cambio\nEspíritu de Cooperación Permanente\nIdentidad", "Legalidad\nGestión del Conocimiento\nTransparencia\nActitud positiva y proactiva hacia miras personales\nEspíritu de Cooperación Permanente\nIdentidad", "Legalidad\nGestión del Conocimiento\nTransparencia\nActitud positiva y proactiva hacia la gestión del jefe\nEspíritu de Cooperación Permanente\nPersonalismo", "Legalidad\nGestión del Conocimiento\nTransparencia\nActitud positiva y proactiva hacia la gestión del cambio\nEspíritu de Cooperación Permanente personalismo"], correcta: 0, fuente: "Marina de Guerra del Perú. (2023). *Plan Estratégico Institucional 2023-2026*" },
{ pregunta: "¿Contra unidades de que país, se realizó el Combate Naval del 2 de Mayo de 1866?", opciones: ["Holanda", "España", "Chile", "Inglaterra"], correcta: 1, fuente: "Novak, F., & Namihas, S. (2013). La Guerra del Pacífico: Campaña Naval. Fondo Editorial de la Marina de Guerra del Perú." },
{ pregunta: "¿Fecha del Combate Naval de Iquique?", opciones: ["8 de octubre de 1834", "21 de octubre de 1982", "15 de setiembre de 1879", "21 de mayo de 1879"], correcta: 3, fuente: "Novak, F., & Namihas, S. (2013). La Guerra del Pacífico: Campaña Naval. Fondo Editorial de la Marina de Guerra del Perú." },
{ pregunta: "¿Contra que unidades y de que nacionalidad, se enfrentó el Monitor Huascar en el Combate de Pacocha del 29 de mayo de 1877?", opciones: ["Fragata “Shah” y Corbeta “Amelia” de nacionalidad inglesa.", "Fragata “Shah” y Corbeta “Amethyst” de nacionalidad francesa.", "Fragata “Shah” y Corbeta “unión” de nacionalidad francesa.", "Fragata “Shah” y Corbeta “Amethyst” de nacionalidad inglesa."], correcta: 3, fuente: "Novak, F., & Namihas, S. (2013). La Guerra del Pacífico: Campaña Naval. Fondo Editorial de la Marina de Guerra del Perú." },
{ pregunta: "¿Cuántos metros equivalen a una milla náutica?", opciones: ["Una milla náutica equivale a 1,852 metros.", "Una milla náutica equivale a 1,652 metros.", "Una milla náutica equivale a 1,582 metros.", "Una milla náutica equivale a 1,885 metros."], correcta: 0, fuente: "Marina de Guerra del Perú. (2015). Manual de Navegación. Dirección de Instrucción y Entrenamiento." },
{ pregunta: "¿A cuánto equivale un nudo de velocidad?", opciones: ["Una Kilómetro por hora.", "Una milla terrestre por hora.", "Una milla náutica por hora.", "1,852 Kilómetros por hora"], correcta: 2, fuente: "Marina de Guerra del Perú. (2015). Manual de Navegación. Dirección de Instrucción y Entrenamiento." },
{ pregunta: "¿En qué combate naval falleció el Marinero Pedro Pablo Unanue Carrillo?", opciones: ["En el combate naval del 2 de mayo.", "En el combate naval de Angamos.", "En el combate naval de trafalgar.", "En el combate naval del Pacífico."], correcta: 1, fuente: "Romero, R. (2013). Historia marítima del Perú: La República. Fondo Editorial de la Marina de Guerra del Perú." },
{ pregunta: "¿Qué personal de marinería sobreviviente de la dotación del Monitor Huáscar, fue reconocido como Caballero de la Orden de Ayacucho?", opciones: ["El Grumete Humberto Mendoza Medina.", "El Grumete Eduardo Estacio Medina.", "El Grumete Alberto Medina Cecilia.", "El Grumete Alberto Mendoza Medina."], correcta: 2, fuente: "Romero, R. (2013). Historia marítima del Perú: La República. Fondo Editorial de la Marina de Guerra del Perú." },
{ pregunta: "¿Qué comandancias de Zonas Navales se encuentran bajo responsabilidad de la Comandancia General de Operaciones del Pacífico?", opciones: ["COMZOCUATRO Y COMZOCINCO.", "COMZOCUATRO Y COMZOTRES.", "COMZOCUATRO, COMZOCINCO Y COMZOTRES.", "COMZOUNO, COMZODOS Y COMZOTRES."], correcta: 3, fuente: "Marina de Guerra del Perú. (2021). Reglamento de Organización y Funciones (ROF)." },
{ pregunta: "¿Qué comandancias de Zonas Navales se encuentran bajo responsabilidad de la Comandancia General de Operaciones de la Amazonía?", opciones: ["COMZOCUATRO Y COMZOCINCO.", "COMZOCUATRO Y COMZOTRES.", "COMZOCUATRO, COMZOCINCO Y COMZOTRES.", "COMZOUNO, COMZODOS Y COMZOTRES."], correcta: 0, fuente: "Marina de Guerra del Perú. (2021). Reglamento de Organización y Funciones (ROF)." },
{ pregunta: "¿A qué se denomina través en una embarcación?", opciones: ["Se refiere a la parte sumergida del casco de una embarcación", "Es la parte media en cada uno de los costados de una embarcación", "Parte del costado entre el través y la proa.", "Se refiere a la parte izquierda de una embarcación"], correcta: 1, fuente: "Autoridad Marítima Nacional - Dirección General de Capitanías y Guardacostas. (2021). Diccionario de Términos Náuticos." },
{ pregunta: "¿A qué se denomina amura en una embarcación?", opciones: ["Parte del costado entre el través y la proa.", "Se refiere a la parte sumergida del casco de una embarcación", "Se refiere a la parte izquierda de una embarcación", "Se refiere a la parte derecha de una embarcación"], correcta: 0, fuente: "Autoridad Marítima Nacional - Dirección General de Capitanías y Guardacostas. (2021). Diccionario de Términos Náuticos." },
{ pregunta: "¿A qué se denomina aleta en una embarcación?", opciones: ["Parte del costado entre el través y la proa.", "Se refiere a la parte sumergida del casco de una embarcación", "Se refiere a la parte izquierda de una embarcación", "Parte del costado entre el través y la popa."], correcta: 3, fuente: "Autoridad Marítima Nacional - Dirección General de Capitanías y Guardacostas. (2021). Diccionario de Términos Náuticos." },
{ pregunta: "¿A qué se denomina línea de crujía en una embarcación?", opciones: ["Se refiere a la parte sumergida del casco de una embarcación", "Es la parte media en cada uno de los costados de una embarcación", "Línea imaginaría que divide la embarcación en dos de forma longitudinal, dejando a un lado babor y al otro estribor.", "Se refiere a la parte izquierda de una embarcación"], correcta: 2, fuente: "Autoridad Marítima Nacional - Dirección General de Capitanías y Guardacostas. (2021). Diccionario de Términos Náuticos." },
{ pregunta: "¿A qué se denomina línea de flotación en una embarcación?", opciones: ["Línea imaginaría que divide la embarcación en dos de forma longitudinal, dejando a un lado babor y al otro estribor.", "Línea real que separa la parte sumergida de la embarcación de aquella que permanece dentro del agua y que puede variar en función de la carga de la misma.", "Línea imaginaria que separa la parte sumergida de la embarcación de aquella que permanece fuera del agua y que puede variar en función de la carga de la misma.", "Línea imaginaria que separa la parte sumergida de la embarcación de aquella que permanece dentro del agua y no puede variar en función de la carga de la misma."], correcta: 2, fuente: "Autoridad Marítima Nacional - Dirección General de Capitanías y Guardacostas. (2021). Diccionario de Términos Náuticos." },
{ pregunta: "¿Quién fue el Primer Contramaestre del Monitor Huáscar en el Combate Naval de Angamos?", opciones: ["Oficial de Mar Nicolás Dueñas Hurtado", "Miguel Grau", "Abelardo Quiñones", "Francisco Bolognesi"], correcta: 0, fuente: "Romero, R. (2013). Historia marítima del Perú: La República. Fondo Editorial de la Marina de Guerra del Perú." },
{ pregunta: "¿Quién heroe nacional, es conocido como el \"Caballero de los Mares\", por su comportamiento justo, humanitario y valeroso en combate? Título honorífico le fue concedido por su caballerosidad y acto de humanidad durante el Combate Naval de Iquique, el 21 de mayo de 1879.", opciones: ["Miguel Grau", "Abelardo Quiñones", "Francisco Bolognesi", "Simón Bolívar"], correcta: 0, fuente: "Comisión Permanente de Historia del Ejército del Perú. (2021). Miguel Grau Seminario: El Caballero de los Mares. Ministerio de Defensa del Perú." },
{ pregunta: "¿Cuáles son los algunos de los principales ríos del Perú?", opciones: ["Amazonas, Nilo, Ucayali, Sena, Támesis y Orinoco", "Amazonas, Marañón, Ucayali y Nilo", "Amazonas, Marañón, Ucayali y Sena", "Amazonas, Marañón y Ucayali"], correcta: 3, fuente: "Instituto Geográfico Nacional (IGN). (2019). Atlas nacional del Perú. Instituto Geográfico Nacional. https://www.ign.gob.pe/" },
{ pregunta: "¿Cómo se le denomina al Buque insignia de la Marina de Guerra del Perú?", opciones: ["BAP \"Independencia del Perú\"", "BAP Almirante \"Grau\"", "Buque Armada Peruana \"Independencia\"", "Buque de la Armada Peruana \"Nacional\""], correcta: 1, fuente: "Marina de Guerra del Perú. (2022). Libro blanco de la defensa nacional del Perú. Comando General de la Marina." },
{ pregunta: "¿Cuáles son los países limitrofes con el Perú?", opciones: ["Ecuador, Colombia, Brasil, Bolivia, Chile y Venezuela.", "Ecuador, Colombia, Brasil, Bolivia, Chile", "Ecuador, Paraguay, Brasil, Bolivia, Chile y Venezuela.", "Ecuador, Colombia, Brasil, Paraguay, Chile"], correcta: 1, fuente: "Instituto Geográfico Nacional (IGN). (2019). Atlas nacional del Perú. Instituto Geográfico Nacional. https://www.ign.gob.pe/" },
{ pregunta: "¿Cuál es el océano más extenso de mundo?", opciones: ["Oceano Atlántico", "Oceano Pacífico", "Oceano Índico", "Oceano Ártico"], correcta: 1, fuente: "National Geographic Society. (2022). Ocean. National Geographic." },
{ pregunta: "¿Cuáles son los 4 ases de la Marina de Guerra del Perú?", opciones: ["Miguel Grau, Lizardo Garcia y Garcia, Aurelio Montero y Manuel Ferreyros.", "Miguel Grau, Lizardo Garcia, Aurelio Montero y García y Manuel Ferreyros.", "Miguel Grau, Lizardo Montero, Aurelio García y García y Manuel Ferreyros.", "Miguel Grau, Lizardo Montero, Aurelio García y Ferreyros y Manuel Garcia."], correcta: 2, fuente: "Instituto Nacional de Estadística (INE). (2022). Atlas estadístico nacional. Instituto Nacionales de Estadística de Paraguay." },
{ pregunta: "¿Cuáles son los ocenos del mundo?", opciones: ["Océano Pacífico, Océano Atlántico, Océano Índico, Océano Antártico, Océano Ártico.", "Océano Pacífico, Océano Atlántico, Océano Índico, Océano Austral, Océano Negro.", "Océano Pacífico, Océano Atlántico, Océano Antártico, Océano Austral, Océano Negro.", "Océano Pacífico, Océano Atlántico, Océano Antártico, Océano Austral, Océano Negro."], correcta: 0, fuente: "International Hydrographic Organization (IHO). (2021). Limits of oceans and seas (Special Publication No. 28). International Hydrographic Organization." },
{ pregunta: "¿En qué fecha se independizo el Perú?", opciones: ["28 de junio de 1821.", "28 de julio de 1812.", "29 de julio de 1821.", "28 de julio de 1821."], correcta: 3, fuente: "Congreso de la República del Perú. (2018). Libro de oro de la independencia del Perú. Fondo Editorial del Congreso del Perú." },
{ pregunta: "¿Cuál es la extensión de la costa peruana?", opciones: ["3,880 kilómetros.", "3,080 kilómetros.", "3,008 kilómetros.", "3,088 kilómetros."], correcta: 1, fuente: "Instituto Geográfico Nacional (IGN). (2022). Longitud de litoral peruano. Ministerio de Defensa del Perú." },
{ pregunta: "¿En qué año llegó el hombre a la Luna por primera vez?", opciones: ["1965", "1969", "1970", "1975"], correcta: 1, fuente: "https://www.lanasa.net/noticias/reportajes-especiales/55-aniversario-de-la-llegada-del-hombre-la-luna#:~:text=Hace%2055%20a%C3%B1os%2C%20el%2020,de%20que%20finalizase%20la%20d%C3%A9cada." },
{ pregunta: "¿Cuál es el lago navegable más alto del mundo? Con 3,812 metros sobre el nivel del mar (msnm)", opciones: ["Lago Titicaca (Perú)", "Lago Poopó (Bolivia)", "Lago Ness (Escocia, Reino Unido)", "Lago Victoria (África: Tanzania, Uganda y Kenia)"], correcta: 0, fuente: "Instituto Geográfico Nacional (IGN). (2021). Atlas del Perú: Geografía y economía. Instituto Geográfico Nacional." },
{ pregunta: "¿Cuál es la isla más grande del perú? Con aproximadamente 16,48 Km². de superficie", opciones: ["Isla la Ensenada", "Isla Lobos de Afuera", "La Isla San Lorenzo", "La Isla del Fronton"], correcta: 2, fuente: "Instituto del Mar del Perú (IMARPE). (2021). Estudio oceanográfico y biológico de la Isla San Lorenzo. Ministerio de la Producción." },
{ pregunta: "¿Cuál es la superifie del territorio nacional del Perú?", opciones: ["1,885,215.60 km²", "1,285,215.60 km²", "1,885,315.60 km²", "1,285,255.80 km²"], correcta: 1, fuente: "Instituto Geográfico Nacional (IGN). (2022). Superficie del Territorio Peruano. Ministerio de Defensa del Perú." },
{ pregunta: "¿Cuáles son los símbolos patrios del Perú? De acuerdo a la Ley N° 29179.", opciones: ["La Pabellón Nacional\nEl Escudo Nacionales\nEl Himno Nacional", "La Bandera Nacional\nEl Escudo Armas Nacional\nEl Himno Nacional", "La Bandera de Guerra\nEl Escudo Nacionales\nEl Himno Nacional", "La Bandera Nacional\nEl Escudo Nacionales\nEl Himno Nacional"], correcta: 3, fuente: "Congreso de la República del Perú. (2007). *Ley N° 29179 - Ley que regula el uso de los Símbolos Patrios" },
{ pregunta: "¿Quiene conforma el Alto Mando Naval? En la Marina de Guerra del Perú", opciones: ["El consejo Superior de Marina y El Comandante General de la Marina", "El Comandante General y el Jefe del Estado Mayor General de la Marina", "El Comandante General y las Comandancias Generales", "El Comandante General y las Direcciones Generales"], correcta: 1, fuente: "Marina de Guerra del Perú. (2022). Libro blanco de la defensa nacional del Perú. Comando General de la Marina." },
{ pregunta: "¿Cuáles son las partes principales del escudo nacional del Perú?", opciones: ["La vicuña pasante, el árbol de la quina, la cornucopia", "La vicuña del desierto, el árbol de la quinua, la cornucopia", "La vicuña errante, el árbol de la quinua, la cornucopia", "La vicuña pasante, el árbol de la quina, la tornamesa"], correcta: 0, fuente: "Congreso de la República del Perú. (2007). *Ley N° 29179 - Ley que regula el uso de los Símbolos Patrios" },
{ pregunta: "¿Cuáles son los valores de la Marina de Guerra del Perú?", opciones: ["Integridad, lealtad, honestidad, patriotismo, justicia, honor, marcialidad, disciplina, compromiso y respeto.", "Integridad, lealtad, honestidad, patriotismo, justicia, honor, valentía, disciplina, destresa y respeto.", "Integridad, lealtad, honestidad, patriotismo, justicia, honor, valentía, disciplina, compromiso y respeto.", "Integridad, lealtad, honestidad, pertenencia, justicia, honor, marcialidad, disciplina, compromiso y respeto."], correcta: 2, fuente: "https://es.scribd.com/presentation/524885784/MARINA-DE-GUERRA-DEL-PERU" },
{ pregunta: "¿Cuál es la visión de la Marina de Guerra del Perú?", opciones: ["Poder naval y aereo capaz de actuar con éxito donde lo requieran los intereses nacionales.", "Poder naval capaz de actuar con éxito donde lo requieran la Organización de los Estados Americanos", "Poder naval capaz de actuar con éxito donde lo requieran intereses nacionales.", "Poder naval capaz de actuar con éxito donde lo requieran los intereses nacionales."], correcta: 3, fuente: "https://www.gob.pe/institucion/marina/institucional" },
{ pregunta: "¿Qué recurso fue explotado durante la Guerra del Pacífico?", opciones: ["Salitre", "Oro", "Gas", "Plata"], correcta: 0, fuente: "https://revistamarina.cl/es/articulo/peru-y-la-guerra-del-pacifico" },
{ pregunta: "El \"árbol de la quina\" ubicado en el cuartel superior derecho del Escudo Nacional del Perú. ¿Qué representa?", opciones: ["Representa la pobreza del reino vegetal y el patrimonio natural del Perú.", "Representa las escaladas del guerras que sustuvo el Perú.", "Representa la riqueza del reino vegetal y el patrimonio natural del Perú.", "Representa la riqueza del reino animal del Perú."], correcta: 2, fuente: "Ministerio de Relaciones Exteriores del Perú. (2021). Símbolos Patrios: Escudo Nacional." },
{ pregunta: "¿Qué buque peruano protagonizó el Combate de Angamos?", opciones: ["Monitor Huáscar", "Covadonga", "BAP Grau", "Cochrane"], correcta: 0, fuente: "https://www.infobae.com/peru/2024/10/07/el-dia-que-el-huascar-fue-arrebatado-de-la-marina-peruana-y-lo-que-significo-para-el-resto-de-la-guerra-del-pacifico/#:~:text=El%20monitor%20Hu%C3%A1scar%2C%20emblema%20de,en%20la%20Guerra%20del%20Pac%C3%ADfico." },
{ pregunta: "¿Cuál es la misión de la Marina de Guerra del Perú?", opciones: ["Ejercer la vigilancia y protección de los intereses continentales en el ámbito marítimo, fluvial y lacustre, y terrestre para apoyar a la política exterior del Estado a través del Poder Naval; asumir el control interno, coadyuvar en el desarrollo económico y social del país y participar en la defensa civil de acuerdo a ley; con el fin de contribuir a garantizar la independencia, soberanía e integridad territorial de la República y el bienestar general de la población.", "Ejercer la vigilancia y protección de los intereses nacionales en el ámbito marítimo, fluvial y lacustre, y apoyar a la política exterior del Estado a través del Poder Naval; asumir el control interno, coadyuvar en el desarrollo económico y social del país y participar en la defensa civil de acuerdo a ley; con el fin de contribuir a garantizar la independencia, soberanía e integridad territorial de la República y el bienestar general de la población.", "Ejercer la vigilancia y protección de los intereses continentales en el ámbito marítimo, fluvial y aéreo, y apoyar a la política exterior del Estado a través del Poder Naval; asumir el control interno, coadyuvar en el desarrollo económico y social del país y participar en la defensa civil de acuerdo a ley; con el fin de contribuir a garantizar la independencia, soberanía e integridad territorial de la República y el bienestar general de la población.", "Ejercer la vigilancia y protección de los intereses nacionales en el ámbito marítimo, fluvial y lacustre, y apoyar a la política exterior del Estado a través del Poder Naval; asumir el control interno, coadyuvar en el desarrollo socio-económico sudamericano y participar en la defensa civil de acuerdo a ley; con el fin de contribuir a garantizar la independencia, soberanía e integridad territorial de la República y el bienestar general de la población."], correcta: 1, fuente: "https://www.gob.pe/institucion/marina/institucional" },
{ pregunta: "¿Cuál es el buque escuela de la Marina de Guerra del Perú?", opciones: ["BAP Mantaro", "BAP Unión", "BAP Amazonas", "BAP Grau"], correcta: 1, fuente: "https://www.defensa.com/peru/marina-guerra-peru-incorpora-oficialmente-buque-escuela-vela-bap" },
{ pregunta: "El \"la vicuña\" ubicada en el cuartel superior izquierdo del Escudo Nacional del Perú. ¿Qué representa?", opciones: ["Representa la riqueza mineral del subsuelo peruano.", "Representa las escaladas del guerras que sustuvo el Perú.", "Representa la riqueza del reino vegetal y el patrimonio natural del Perú.", "Representa la riqueza del reino animal del Perú."], correcta: 3, fuente: "Ministerio de Relaciones Exteriores del Perú. (2021). Símbolos Patrios: Escudo Nacional." },
{ pregunta: "¿Qué comandante lideró el Monitor Huáscar tras la muerte de Miguel Grau, en el Combate de Angamos?", opciones: ["Elías Aguirre", "Manuel Villavicencio", "Aurelio García y García", "Juan Fanning"], correcta: 0, fuente: "https://www.gob.pe/institucion/muniaija/noticias/1035774-combate-de-angamos-08-de-octubre-de-1879" },
{ pregunta: "¿Qué significan las siglas BAP en los buques peruanos?", opciones: ["Barco Armada del Perú", "Buque Armada del Pacífico", "Buque de la Armada Peruana", "Buque de Apoyo Peruano"], correcta: 2, fuente: "https://elcomercio.pe/lima/buque-de-la-armada-peruana-union-inicia-la-vuelta-al-mundo-como-es-el-buque-por-dentro-bap-marina-de-guerra-escuela-naval-tripulacion-peruana-fotos-noticia/#:~:text=Luego%20de%20167%20a%C3%B1os%2C%20el,embarcaciones%20m%C3%A1s%20grandes%20de%20Latinoam%C3%A9rica." },
{ pregunta: "El \"la cornucopia\" ubicada en el cuartel inferior del Escudo Nacional del Perú. ¿Qué representa?", opciones: ["Representa la riqueza mineral del subsuelo peruano.", "Representa las escaladas del guerras que sustuvo el Perú.", "Representa la riqueza del reino vegetal y el patrimonio natural del Perú.", "Representa la riqueza del reino animal del Perú."], correcta: 0, fuente: "Ministerio de Relaciones Exteriores del Perú. (2021). Símbolos Patrios: Escudo Nacional." },
{ pregunta: "¿Cuál es el río más largo del mundo?", opciones: ["Río Mississippi", "Río Nilo", "Río Yangtsé", "Río Amazonas"], correcta: 3, fuente: "National Geographic Society. (2023). Amazon River. National Geographic." },
{ pregunta: "¿Qué río de extenso actua como limite natural y fronterizo entre perú y colombia?", opciones: ["Río Amazonas", "Rio Putumayo", "Rio Nilo", "Rio el Estrecho"], correcta: 1, fuente: "Instituto Geográfico Nacional (IGN). (2022). Fronteras del Perú. Ministerio de Defensa del Perú." },
{ pregunta: "¿En que fecha se promulgó la Constitución Nacional vigente del Perú?", opciones: ["29 de diciembre de 1993", "29 de diciembre de 1977", "29 de diciembre de 1990", "29 de diciembre del 2000"], correcta: 0, fuente: "Congreso Constituyente Democrático. (1993). Constitución Política del Perú." },
{ pregunta: "¿Es el órgano de la Marina de Guerra del Perú que ejerce la Autoridad Marítima Nacional, responsable de la seguridad, policía marítima, protección del medio ambiente acuático y búsqueda y rescate en las aguas bajo jurisdicción peruana?", opciones: ["Comandancia General de Operaciones de la Amazonía (COMOPERAMA)", "Comandancia General de Operaciones del Pacífico (COMOPERPAC)", "Dirección General de Capitanías y Guardacostas (DICAPI)", "Comandancia de Operaciones de Ciberdefensa (COMCIBERDEF)"], correcta: 2, fuente: "Autoridad Marítima Nacional - Dirección General de Capitanías y Guardacostas. (2023). Memoria Institucional 2023." },
{ pregunta: "¿Qué países participaron como beligerantes, en la Guerra del Pacífico (1879-1884)?", opciones: ["Perú, Colombia y Ecuador", "Perú, Bolivia y Chile", "Perú, Colombia y Chile", "Perú, Ecuador y Chile"], correcta: 1, fuente: "Guerra del Pacífico (1879-1884). (2023). Enciclopedia de la Historia Militar de Chile. Academia de Historia Militar." },
{ pregunta: "¿El mar peruano comprende una superficie aproximada de?:", opciones: ["200 millas", "370 km.", "617,500 Km2", "370 millas"], correcta: 2, fuente: "Geografía del Perú. El Mar Peruano. Sara Montenegro Agreda. Pág. 80" },
{ pregunta: "¿Cuál es el significado de las siglas \"SIMA\"?", opciones: ["Servicios Innovadores de la Marina", "Servicios de Construcción Marítima y Espacial", "Secreto Institucional de la Marina", "Servicios Industriales de la Marina"], correcta: 3, fuente: "SIMA Perú. (2023). Memoria Anual 2022. Marina de Guerra del Perú." },
{ pregunta: "En la terminología náutica, ¿Cuál es el significado de \"quilla\"?", opciones: ["Es la altura del casco de una embarcación, medida verticalmente desde la parte inferior de la quilla hasta la cubierta principal", "Pieza estructural principal del casco de una embarcación, que corre en sentido longitudinal de proa a popa en la parte más baja del barco, funcionando como su columna vertebral.", "Es la anchura máxima de una embarcación, medida en su punto más ancho, generalmente en la sección media del buque, a la otra (lado de estribor).", "Es la longitud total de una embarcación, medida desde la parte más a proa (frontal) hasta la parte más a popa (trasera) del casco."], correcta: 1, fuente: "Autoridad Marítima Nacional - Dirección General de Capitanías y Guardacostas. (2021). Diccionario de Términos Náuticos." },
{ pregunta: "En la terminología náutica, ¿Cuál es el significado de \"manga\"?", opciones: ["Es la altura del casco de una embarcación, medida verticalmente desde la parte inferior de la quilla hasta la cubierta principal", "Pieza estructural principal del casco de una embarcación, que corre en sentido longitudinal de proa a popa en la parte más baja del barco, funcionando como su columna vertebral.", "Es la anchura máxima de una embarcación, medida en su punto más ancho, generalmente en la sección media del buque, a la otra (lado de estribor).", "Es la longitud total de una embarcación, medida desde la parte más a proa (frontal) hasta la parte más a popa (trasera) del casco."], correcta: 2, fuente: "Autoridad Marítima Nacional - Dirección General de Capitanías y Guardacostas. (2021). Diccionario de Términos Náuticos." },
{ pregunta: "En la terminología náutica, ¿Cuál es el significado de \"eslora\"?", opciones: ["Es la altura del casco de una embarcación, medida verticalmente desde la parte inferior de la quilla hasta la cubierta principal", "Pieza estructural principal del casco de una embarcación, que corre en sentido longitudinal de proa a popa en la parte más baja del barco, funcionando como su columna vertebral.", "Es la anchura máxima de una embarcación, medida en su punto más ancho, generalmente en la sección media del buque, a la otra (lado de estribor).", "Es la longitud total de una embarcación, medida desde la parte más a proa (frontal) hasta la parte más a popa (trasera) del casco."], correcta: 3, fuente: "Autoridad Marítima Nacional - Dirección General de Capitanías y Guardacostas. (2021). Diccionario de Términos Náuticos." },
{ pregunta: "En la terminología náutica, ¿Cuál es el significado de \"obra muerta\"?", opciones: ["Parte del casco de una embarcación que no se encuentra sumergida", "Se refiere a la parte sumergida del casco de una embarcación", "Se refiere a la parte izquierda de una embarcación", "Se refiere a la parte derecha de una embarcación"], correcta: 0, fuente: "Autoridad Marítima Nacional - Dirección General de Capitanías y Guardacostas. (2021). Diccionario de Términos Náuticos." },
{ pregunta: "En la terminología náutica, ¿Cuál es el significado de \"obra viva\"?", opciones: ["Se refiere a la parte que sobresale en una embarcación", "Se refiere a la parte sumergida del casco de una embarcación", "Se refiere a la parte izquierda de una embarcación", "Se refiere a la parte derecha de una embarcación"], correcta: 1, fuente: "Autoridad Marítima Nacional - Dirección General de Capitanías y Guardacostas. (2021). Diccionario de Términos Náuticos." },
{ pregunta: "En la terminología náutica, ¿Qué significa babor en una embarcación?", opciones: ["Término náutico que designa el lado izquierdo del barco, mirando hacia la proa (parte delantera)", "En una embarcación, babor es el término náutico que designa la parte posterior del barco.", "En una embarcación, babor es el término náutico que designa la parte delantera del barco.", "Término náutico que designa el lado derecho del barco, mirando hacia la proa (parte delantera)"], correcta: 0, fuente: "Autoridad Marítima Nacional - Dirección General de Capitanías y Guardacostas. (2021). Diccionario de Términos Náuticos." },
{ pregunta: "En la terminología náutica, ¿Qué significa estribor en una embarcación?", opciones: ["Término náutico que designa el lado izquierdo del barco, mirando hacia la proa (parte delantera)", "En una embarcación, estribor es el término náutico que designa la parte posterior del barco.", "En una embarcación, estribor es el término náutico que designa la parte delantera del barco.", "Término náutico que designa el lado derecho del barco, mirando hacia la proa (parte delantera)"], correcta: 3, fuente: "Autoridad Marítima Nacional - Dirección General de Capitanías y Guardacostas. (2021). Diccionario de Términos Náuticos." },
{ pregunta: "¿Quien fue el primer Comandante General de la Marina de Guerra del Perú?", opciones: ["Almirante Martín Jorge Guise", "Almirante Miguel Grau Seminario", "Almirante De las Casas", "Almirante José de San Martín"], correcta: 0, fuente: "Ministerio de Defensa del Perú. (2021). Historia de la Marina de Guerra del Perú." },
{ pregunta: "¿Cuál es el nombre del santuario histórico ubicado en la cima de una montaña, construido por los Incas, que es reconocido como una de las Nuevas Siete Maravillas del Mundo Moderno?", opciones: ["Santuario Histórico de Chepen.", "Santuario Histórico de Machu Picchu.", "Santuario Histórico de la Libertad.", "Santuario Histórico del Templo de la Luna."], correcta: 1, fuente: "Instituto Geográfico Nacional (IGN). (2021). Atlas del Perú: Geografía y economía. Instituto Geográfico Nacional." },
{ pregunta: "Este grado se otorga exclusivamente al designado Comandante General de la Marina o Jefe del Comando Conjunto de las Fuerzas Armadas, solo durante el tiempo que ejerce dicho cargo. ¿Este grado es?", opciones: ["Contramilrante", "Comodoro", "Vicealmirante", "Almirante"], correcta: 3, fuente: "Marina de Guerra del Perú. (2023). Ley de la Carrera Militar - Oficiales de la Marina de Guerra del Perú. Comando General de la Marina." },
{ pregunta: "¿Cuáles son las 8 regiones naturales del Perú? De acuerdo con la Ley N° 28621.", opciones: ["Chala o Costa, Yunga, Quechua, Suni, Mar de Grau, Janca o Cordillera, Selva Alta o Rupa Rupa, Selva Baja u Omagua", "Chala o Costa, Yunga, Quechua, Suni, Puna, Janca o Cordillera, Selva Alta o Rupa Rupa y el Mar Peruano", "Chala o Costa, Yunga, Quechua, Suni, Puna, Janca o Cordillera, Selva Alta o Rupa Rupa, Selva Baja u Omagua", "Chala o Costa, Yunga, Quechua, Suni, Puna, Janca o Cordillera, Selva Alta o Rupa Rupa, Selva y el Mar de Grau"], correcta: 2, fuente: "Pulgar Vidal, J. (2014). Las ocho regiones naturales del Perú. Instituto de Investigaciones Geográficas." },
{ pregunta: "En la terminología náutica, ¿Qué significa proa en una embarcación?", opciones: ["En una embarcación, proa es el término náutico que designa la parte posterior del barco.", "En una embarcación, proa es el término náutico que designa la parte delantera del barco.", "En una embarcación, proa es el término náutico que designa la parte izquierda del barco.", "En una embarcación, proa es el término náutico que designa la parte sumergida del barco."], correcta: 1, fuente: "Autoridad Marítima Nacional - Dirección General de Capitanías y Guardacostas. (2021). Diccionario de Términos Náuticos." },
{ pregunta: "En la terminología náutica, ¿Qué significa popa en una embarcación?", opciones: ["En una embarcación, proa es el término náutico que designa la parte delantera del barco.", "En una embarcación, proa es el término náutico que designa la parte sumergida del barco.", "En una embarcación, popa es el término náutico que designa la parte posterior o trasera del barco.", "En una embarcación, popa es el término náutico que designa la parte derecha del barco."], correcta: 2, fuente: "Autoridad Marítima Nacional - Dirección General de Capitanías y Guardacostas. (2021). Diccionario de Términos Náuticos." },
{ pregunta: "¿Quien fundo e integro el grupo terrorista denominado \"Movimiento Revolucionario Túpac Amaru (MRTA)\"", opciones: ["Víctor Polay Campos (\"Camarada Rolando\").", "Ismael León Giego Polay (\"Camarada Benito\").", "Ismael León Giego Polay (\"Camarada Pianto\").", "Víctor Estacio Campos (\"Camarada Pistacho\")."], correcta: 0, fuente: "Comisión de la Verdad y Reconciliación (CVR). (2003). Informe Final: Los grupos subversivos." },
{ pregunta: "¿De qué grupo terrorista fue Abimael Guzmán?", opciones: ["Movimiento Revolucionario Túpac Amaru (MRTA)", "Sendero Luminoso", "Ejército Guerrillero Popular", "Frente Sandinista de Liberación Nacional"], correcta: 1, fuente: "Abimael Guzmán: el debate en Perú sobre qué hacer con el cadáver del líder de Sendero Luminoso - BBC News Mundo" },
{ pregunta: "¿En qué año se produjo el atentado de Tarata en Lima y a que grupo terrorista se le atribullo?", opciones: ["1985 MRTA", "1990 MRTA", "1992 Sendero Luminoso", "1995 Sendero Luminoso"], correcta: 2, fuente: "Comisión de la Verdad y Reconciliación (CVR). (2003). Informe Final: El atentado en Tarata." },
{ pregunta: "¿Qué grupo terrorista llevó a cabo la toma de la residencia del embajador de Japón en Lima en 1996?", opciones: ["Sendero Luminoso", "Movimiento Revolucionario Túpac Amaru (MRTA)", "Ejército de Liberación Nacional", "Fuerzas Armadas Revolucionarias de Colombia (FARC)"], correcta: 1, fuente: "Ministerio de Defensa del Perú. (2017). Operación Chavín de Huántar: La historia oficial." },
{ pregunta: "¿Qué ideología política seguía el grupo terrorista Sendero Luminoso?", opciones: ["Maoísmo", "Trotskismo", "Anarquismo", "Liberalismo"], correcta: 0, fuente: "Abimael Guzmán: qué es el maoísmo, la ideología en la que se inspiró el líder de Sendero Luminoso y por la que desencadenó en Perú una guerra sangrienta - BBC News Mundo" },
{ pregunta: "¿Qué evento marcó el inicio de las actividades terroristas de la agrupación terrorista Sendero Luminoso en 1980?", opciones: ["Toma de una estación de radio", "Asalto a una comisaría", "Quema de ánforas electorales en Chuschi", "Secuestro de un político local"], correcta: 2, fuente: "LA QUEMA DE ÁNFORAS EN CHUSCHI | LUM" },
{ pregunta: "¿Qué terrorista fue capturado en 1992, debilitando significativamente a Sendero Luminoso?", opciones: ["Víctor Polay Campos", "Abimael Guzmán", "Néstor Cerpa Cartolini", "Osmán Morote"], correcta: 1, fuente: "¡Cayó Abimael!: a 32 años de la captura del líder terrorista de Sendero Luminoso | LUM" },
{ pregunta: "¿Qué organización elaboró el informe final sobre el impacto del terrorismo en el Perú?", opciones: ["Defensoría del Pueblo", "Comisión de la Verdad y Reconciliación (CVR)", "Corte Interamericana de Derechos Humanos", "Congreso de la República"], correcta: 1, fuente: "Informe Final de la Comisión de la Verdad y Reconciliación" },
{ pregunta: "¿En qué ciudad fue capturado Abimael Guzmán en 1992?", opciones: ["Cusco", "Trujillo", "Lima", "Ayacucho"], correcta: 2, fuente: "¡Cayó Abimael!: a 32 años de la captura del líder terrorista de Sendero Luminoso | LUM" },
{ pregunta: "¿Cuál de estos atentado terrorista tuvo la mayor cantidad de victimas mortales?", opciones: ["Atentado en Tarata", "Toma de la Embajada de Japón", "Masacre de Lucanamarca", "Asalto a la comisaría de Pucayacu"], correcta: 2, fuente: "Recorrido, proyección de película y diálogo: 40 años de la masacre de Lucanamarca | LUM" },
{ pregunta: "¿Quién fue la sub-cabecilla de Sendero Luminoso y continuó activa tras la captura de Abimael Guzmán?", opciones: ["Florindo Eleuterio Flores", "Martha Huatay", "Nancy Madrid", "Elena Iparraguirre"], correcta: 3, fuente: "Comisión de la Verdad y Reconciliación (CVR). (2003). Informe Final: Los grupos subversivos." },
{ pregunta: "¿Cómo se llamó la operación más exitosa en liberación de rehenes y que libero a los rehenes de la Casa del Embajador de Japón en el Perú, tomada por el MRTA?", opciones: ["Operación \"Liberta\"", "Operación \"Chavín de Huantar", "Operación \"Tormenta del Desierto\"", "Operación \"Embajada Libre\""], correcta: 1, fuente: "Ministerio de Defensa del Perú. (2017). Operación Chavín de Huántar: La historia oficial." }

],

deberes: [

{ pregunta: "El personal de marinería será dado de baja por incapacidad física o psíquica que impida cumplir con el servicio, cuando se encuentre completamente incapacitado para el servicio por enfermedad o lesión producida:", opciones: ["Encontrándose con permiso", "Como consecuencia del servicio", "Por acción temeraria", "Por desconocimiento comprobado"], correcta: 1, fuente: "PERMAR-13016 Reglamento del Personal de Marinería de la Marina de Guerra del Perú." },

{ pregunta: "Es la información electrónica útil, la cual será actualizada, correspondiendo ejercer la seguridad necesaria a los jefes de personal de las unidades independientes.", opciones: ["Foja de notas y conceptos", "Escalafón", "Legajo personal", "Libreta personal electrónica"], correcta: 3, fuente: "Directivas de Administración de Personal de la Marina de Guerra del Perú." },

{ pregunta: "Con respecto a la educación técnico-productiva, a la orientación básica naval del tripulante de cubierta le corresponde la certificación técnico productiva equivalente a maniobras; entonces, a auxiliar de servicios le corresponde:", opciones: ["Servicio de mesa y atención al cliente", "Auxiliar de peluquería y sastrería", "Auxiliar de cocina y lavandería", "Auxiliar dental"], correcta: 0, fuente: "Sistema Educativo Naval - CITEN, Marina de Guerra del Perú." },

{ pregunta: "Una de las causales de baja para el personal de marinería:", opciones: ["Viajar al extranjero sin autorización", "Enfermedad incurable", "Por contraer matrimonio sin autorización", "Tiempo cumplido"], correcta: 3, fuente: "PERMAR-13016 Reglamento del Personal de Marinería de la Marina de Guerra del Perú." },

{ pregunta: "Es la disciplina científica y tecnológica que surge de la evolución y fusión de las telecomunicaciones y de la informática:", opciones: ["Seguridad de redes", "Radiocomunicaciones", "Dirección telemática", "Telemática"], correcta: 3, fuente: "Manual de Telemática Naval - Marina de Guerra del Perú." },

{ pregunta: "Está considerado como una efeméride naval:", opciones: ["Día otorgado al clima laboral", "Pase a la situación militar de retiro", "Combate naval de Abtao", "Onomásticos"], correcta: 2, fuente: "Calendario de Efemérides Navales - Marina de Guerra del Perú." },

{ pregunta: "Son obligaciones comunes a todo el personal de la institución:", opciones: ["Mantener incólume el honor y majestad de la bandera nacional", "Mantener el honor y majestad de la bandera de guerra", "Mantener incólume el honor y majestad del pabellón nacional", "Mantener intachable el honor y majestad del pabellón y bicolor"], correcta: 2, fuente: "Ley de Régimen Disciplinario de las Fuerzas Armadas del Perú." },

{ pregunta: "Otorga el grado correspondiente a los oficiales superiores, cuyo despacho es otorgado a nombre de la Nación:", opciones: ["El ministro de Defensa y refrendado por el comandante general de la Marina", "El presidente de la República y refrendado por el ministro de Defensa", "El comandante general de la Marina y refrendado por el director general del personal", "El presidente de la República y refrendado por el comandante general de la Marina"], correcta: 0, fuente: "Ley de la Carrera Militar - Fuerzas Armadas del Perú." },

{ pregunta: "La competencia __________ es propia del personal de marinería y alumnos:", opciones: ["Adaptabilidad", "Desarrollo de personas", "Dominio técnico", "Supervisión y monitoreo"], correcta: 0, fuente: "Modelo de Competencias del Personal Subalterno - Marina de Guerra del Perú." },

{ pregunta: "Son las encargadas de la redacción, transmisión, distribución y control de los mensajes navales.", opciones: ["Dirección de telemáticas", "Células telemáticas", "Estaciones telemáticas", "Oficinas telemáticas"], correcta: 2, fuente: "ISCON-13303 – Correspondencia Naval." },

{ pregunta: "Emite la política de contrainteligencia de la institución.", opciones: ["JEMGEMAR", "DINTEMAR", "COMGEMAR", "IPECAMAR"], correcta: 2, fuente: "Doctrina de Inteligencia Naval - Marina de Guerra del Perú." },

{ pregunta: "¿Qué equivalente tiene el grado de capitán de navío en el Ejército y la Fuerza Aérea?", opciones: ["Teniente general", "Capitán general", "Coronel", ""], correcta: 2, fuente: "Equivalencias de grados - Fuerzas Armadas del Perú." },

{ pregunta: "Coordinará con la __________ el desarrollo del plan integral de capacitación para la prevención de la posesión, consumo y control del tráfico ilícito de drogas:", opciones: ["Dirección de Administración de Personal de la Marina", "Dirección General del Personal de la Marina", "Dirección General de Educación de la Marina", "Inspectoría General de la Marina"], correcta: 2, fuente: "Directiva de Prevención de Drogas - Marina de Guerra del Perú." },

{ pregunta: "Los permisos, vacaciones y licencias podrán ser suspendidos si las exigencias del servicio así lo requieren, excepto por:", opciones: ["Vacaciones en el extranjero", "Licencias por estudio", "Permiso por contraer nupcias", "Licencias otorgadas por enfermedad"], correcta: 3, fuente: "PERMAR-13016 Reglamento del Personal de Marinería de la Marina de Guerra del Perú." },

{ pregunta: "¿Cuál es el periodo de tiempo que se otorgará la primera licencia por enfermedad?", opciones: ["Seis meses", "Un año", "Dos años", "Tres meses"], correcta: 3, fuente: "Reglamento de Licencias del Personal Naval - Marina de Guerra del Perú." },

{ pregunta: "Dentro de la denominación de clases de pasaporte para el personal subalterno que viaje al extranjero por asuntos de servicio usará el:", opciones: ["Pasaporte guinda", "Pasaporte especial", "Pasaporte temporal", "Pasaporte azul"], correcta: 1, fuente: "Normativa de Pasaportes Oficiales del Perú." },

{ pregunta: "Evalúa la aplicación de los procedimientos establecidos en su unidad o dependencia, es un indicador de conducta de la competencia __________:", opciones: ["Supervisión y monitoreo", "Minuciosidad", "Proactividad", "Dominio técnico"], correcta: 0, fuente: "Modelo de Competencias del Personal Naval." },

{ pregunta: "Es el indicativo del Instituto de Educación Superior Tecnológico Público Naval:", opciones: ["DIRESGRUM", "IESTPN-CITEN", "DIRESUVAL", "DIRESNA"], correcta: 1, fuente: "Centro de Instrucción Técnica Naval (CITEN) - Marina de Guerra del Perú." },

{ pregunta: "La gente tiene sus propias opiniones y, por lo tanto, acepta las diferencias individuales; es un indicativo de conducta de la competencia __________:", opciones: ["Desarrollo de personas", "Comunicación efectiva", "Adaptabilidad", "Orientación / asesoramiento"], correcta: 2, fuente: "Modelo de Competencias del Personal Naval." },

{ pregunta: "El personal naval que muere cumpliendo las funciones y deberes que le son propios o por órdenes de la superioridad:", opciones: ["Fallecimiento en acción de armas", "Fallecimiento en acto del servicio", "Fallecimiento como consecuencia del servicio", "Fallecimiento con ocasión del servicio"], correcta: 1, fuente: "Reglamento de Situación Militar del Personal Naval." },

{ pregunta: "Es una causal de pase a la situación militar de retiro del personal subalterno:", opciones: ["Renovación", "Contraer matrimonio", "Licenciamiento", "Lesión psicosomática"], correcta: 0, fuente: "Reglamento de Situación Militar del Personal Naval." },

{ pregunta: "Las formas de uso oficial se clasifican en:", opciones: ["Formas internas y externas generales", "Formas especiales, circunstanciales y externas", "Formas generales, especiales e internas", "Formas internas, especiales y dinámicas"], correcta: 2, fuente: "Reglamento de Documentación Oficial de la Marina." },

{ pregunta: "Los comandos de UU.DD del área de Lima y Callao solicitarán el examen toxicológico para su personal a:", opciones: ["DIPERADMON", "DISAMAR", "DIPERMAR", "DIMATEMAR"], correcta: 1, fuente: "Directiva de Control Antidrogas - Marina de Guerra del Perú." },

{ pregunta: "El personal subalterno de la M.G.P. está compuesto por aquellos miembros de la institución que ostentan la categoría de:", opciones: ["Asesores maestros, técnicos supervisores, oficiales de mar y marineros", "Asesores maestros, técnicos supervisores, oficiales de mar y alumnos", "Técnicos supervisores, técnicos, oficiales de mar y alumnos", "Técnicos supervisores, técnicos, oficiales de mar, alumnos y marineros"], correcta: 2, fuente: "Ley de la Marina de Guerra del Perú." },

{ pregunta: "La capacitación del personal se da en el ámbito:", opciones: ["Calificación y entrenamiento institucional", "Institucional", "Institucional y extra institucional", "Extra institucional"], correcta: 2, fuente: "Sistema Educativo Naval." },

{ pregunta: "¿Qué dirección o comandancia dictará las disposiciones necesarias a fin de prevenir la posesión, el consumo y control del tráfico ilícito de drogas en las unidades y dependencias bajo su responsabilidad?", opciones: ["Dirección de Inteligencia de la Marina", "Inspectoría General de la Marina", "Comandancia General de Operaciones del Pacífico", "Estado Mayor General de la Marina"], correcta: 2, fuente: "Directiva de Prevención de Drogas - Marina de Guerra del Perú." },

{ pregunta: "Es una medida pasiva de la contrainteligencia que tiene como actividad principal impedir o neutralizar la infiltración:", opciones: ["Infiltración", "Contrainteligencia", "Espionaje", "Contra infiltración"], correcta: 3, fuente: "Doctrina de Contrainteligencia Naval." },

{ pregunta: "En la insignia se distingue a todo buque de la Marina de Guerra del Perú al mando de un oficial nombrado como comandante, con el grado menor a capitán de navío:", opciones: ["Gallardete de comandante", "Gallardete de segundo comandante", "Escudo", "Insignia"], correcta: 0, fuente: "Reglamento de Ceremonial Naval." },

{ pregunta: "Es el reglamento de capacidad psicosomática de los servicios de salud de la Marina de Guerra del Perú:", opciones: ["RESEMAR-11107", "RECASIC-13501", "RECITEN-12408", "RECASE-13032"], correcta: 1, fuente: "Reglamentos de Salud Naval." },

{ pregunta: "Doctrina y política general de la Marina de Guerra del Perú:", opciones: ["DOCTEL-13332", "DOPSIC-11111", "DOPOLMAR-11108", "DELEMFA-11208"], correcta: 2, fuente: "Doctrina Naval del Perú." },

{ pregunta: "Se aplica en el ámbito militar y no militar:", opciones: ["Doctrina de seguridad y defensa nacional", "Nivel estratégico", "Doctrina militar", "Doctrina militar aeroespacial"], correcta: 2, fuente: "Doctrina de Defensa Nacional." },

{ pregunta: "La competencia común de Persuba para todos los grados es:", opciones: ["Proactividad", "Desarrollo de personas", "Compromiso con la Marina de Guerra del Perú", "Búsqueda de información"], correcta: 2, fuente: "Modelo de Competencias Persuba." },

{ pregunta: "La junta de exámenes de capacidad psicosomática elevará los resultados de los exámenes a la:", opciones: ["Dirección de Administración del Personal", "Dirección General del Personal", "Junta General de Ascensos", "Dirección de Salud y Centro Médico Naval"], correcta: 3, fuente: "Reglamento de Salud Naval." },

{ pregunta: "Reglamento de ceremonial naval:", opciones: ["RESERNAV-13602", "RESERNAV-13605", "RESERNAV-13601", "RESERNAV-13603"], correcta: 2, fuente: "Reglamento de Ceremonial Naval." },

{ pregunta: "Diseña sistemas o prácticas que permiten recoger información de forma habitual; es un indicador de conducta de la competencia:", opciones: ["Comunicación efectiva", "Búsqueda de información", "Minuciosidad", "Evaluación de soluciones"], correcta: 1, fuente: "Modelo de Competencias del Personal Naval." },

{ pregunta: "No será izado por buques cuando se encuentren en reparación, en dique o en faena de combustible o explosivos:", opciones: ["Pabellón nacional", "Tercer repetidor", "Segundo repetidor", "Jack nacional"], correcta: 3, fuente: "Reglamento de Ceremonial Naval." },

{ pregunta: "Son las instrucciones para el servicio de racionamiento en las unidades y dependencias:", opciones: ["ISPRIG-13010", "ISP-13301", "ISRAC-13201", "ISTOPI-13608"], correcta: 2, fuente: "Normas de Racionamiento Naval." },

{ pregunta: "Es un beneficio en el servicio activo:", opciones: ["Asignación de un sueldo", "Descuento del 30% en cualquier supermercado", "Recibir educación técnico productiva", "Viáticos cada vez que quiera viajar a su ciudad natal"], correcta: 2, fuente: "Beneficios del Personal Naval." },

{ pregunta: "¿Cuál es la abreviatura de la publicación: Ley de la Marina de Guerra del Perú?", opciones: ["LEMAR", "LESIM", "LESERMI", "LOACO"], correcta: 0, fuente: "Publicaciones Oficiales de la Marina." },

{ pregunta: "La clasificación de las inspecciones en cuanto al conocimiento por el organismo inspeccionado se clasifican en:", opciones: ["Inspección programada e inspección inopinada", "Inspección operativa e inspección general", "Inspección parcial e inspección media", "Inspección regular e inspección conjunta"], correcta: 0, fuente: "Reglamento de Inspecciones de la Marina." },

{ pregunta: "Espacio físico que pertenece a la realidad marítima (océano, ríos, lagos y espacio aéreo) en el que se realizan las actividades correspondientes a los intereses marítimos y al poder naval:", opciones: ["Alta mar", "Ámbito marítimo", "Aguas interiores o continentales", "Mar territorial"], correcta: 1, fuente: "Manual de Conceptos sobre la Realidad Marítima." },

{ pregunta: "¿Qué significa la sigla MACOMAR?", opciones: ["Manual de conceptos y terminología sobre la realidad marítima", "Manual de conceptos sobre la realidad marítima", "Manual de terminología sobre la realidad marítima", "Manual de conceptos y terminología sobre conciencia marítima"], correcta: 0, fuente: "MACOMAR - Marina de Guerra del Perú." },

{ pregunta: "Para el personal de marinería, el tiempo de servicio será:", opciones: ["Mínimo 06 meses y máximo 02 años", "Mínimo 03 meses y máximo 02 años", "Mínimo 01 año y máximo 02 años", "Mínimo 02 años y máximo 04 años"], correcta: 0, fuente: "PERMAR-13016 Reglamento del Personal de Marinería." },

{ pregunta: "La clasificación de archivo para la auditoría en general es:", opciones: ["L.802", "L.804", "L.801", "L.805"], correcta: 2, fuente: "Normas de Auditoría Institucional." },

{ pregunta: "El personal subalterno que labora en oficinas fuera del territorio nacional solo podrá estar por un máximo de:", opciones: ["1 año", "2 años", "4 años", "Seis meses"], correcta: 1, fuente: "Reglamento de Destinos del Personal Naval." },

{ pregunta: "Ejecuta la política de contrainteligencia dispuesta por el comandante general de la Marina:", opciones: ["El inspector general de la Marina", "Director de inteligencia de la Marina", "Comandante general de la Marina", "El jefe de Estado Mayor General de la Marina"], correcta: 1, fuente: "Doctrina de Inteligencia Naval." },

{ pregunta: "No es considerado puesto de alta responsabilidad:", opciones: ["Secretaría general", "Peluquería", "Estación de radio", "Oficina de seguridad"], correcta: 1, fuente: "Reglamento Interno de Dependencias." },

{ pregunta: "La clasificación general por la modalidad del servicio militar:", opciones: ["Acuartelado, no acuartelado o comités de autodefensa", "Servicio militar o reenganchado", "Por orientación o reenganchado", "Acuartelado, reenganchado o comité de autodefensa"], correcta: 0, fuente: "Ley del Servicio Militar." },

{ pregunta: "Definición de antigüedad:", opciones: ["Es el tiempo de servicio real y efectivo en un mismo grado", "A mayor grado, mayor antigüedad", "La preeminencia que tiene un grumete, marinero o cabo", "Es el tiempo de servicio que tiene hasta que pase a licencia"], correcta: 0, fuente: "Reglamento de Personal Naval." },

{ pregunta: "¿Cuál es el tiempo mínimo de servicio en dependencias?", opciones: ["Mínimo de 6 meses", "Mínimo de 5 meses", "Mínimo de 4 meses", "Mínimo de 3 meses"], correcta: 0, fuente: "Normas de Destino del Personal." },

{ pregunta: "¿Cuál es el tiempo mínimo y máximo de servicio en zonas navales fuera del área de Lima y Callao?", opciones: ["Mínimo 6 meses y máximo 12 meses", "Mínimo 12 meses y máximo 24 meses", "Mínimo 18 meses y máximo 24 meses", "Mínimo 12 meses y máximo 20 meses"], correcta: 1, fuente: "Reglamento de Destinos del Personal Naval." },

{ pregunta: "¿Quiénes son los involucrados para una comunicación de traslado?", opciones: ["DIPERADMON – unidades afectadas", "DISAMAR – unidades afectadas", "DIPERMAR – DIPERADMON", "JEMGEMAR – unidades afectadas"], correcta: 0, fuente: "Procedimientos Administrativos de Personal." },

{ pregunta: "El poder marítimo está conformado por:", opciones: ["Intereses marítimos + poder naval", "Potencial marítimo + poder marítimo", "Poder naval + poder marítimo", "Poder marítimo total"], correcta: 0, fuente: "Doctrina Marítima del Perú." },

{ pregunta: "Los permisos otorgados por el comando se clasifican en:", opciones: ["Ordinarios y especiales", "Especiales y por asuntos personales", "Especiales y por condición de franco", "Por contrato de reenganche y especiales"], correcta: 0, fuente: "PERMAR-13016 Reglamento del Personal de Marinería." },

{ pregunta: "No corresponde a un derecho común del personal de marinería de acuerdo al PERMAR-13016:", opciones: ["Recibir un trato justo del superior jerárquico", "Recibir la preparación necesaria para su desempeño en el servicio", "Gozar de permisos ordinarios y especiales", "Asumir las guardias establecidas"], correcta: 3, fuente: "PERMAR-13016 Reglamento del Personal de Marinería." },

{ pregunta: "Se clasifican las ceremonias oficiales en:", opciones: ["Navales, especiales, institucionales y nacionales", "Extranjeras, nacionales, extrainstitucionales y especiales", "Navales, extrainstitucionales, institucionales y especiales", "Nacionales, ceremoniales, especiales y extrainstitucionales"], correcta: 0, fuente: "RECERNAV-13601 Reglamento de Ceremonial Naval." },

{ pregunta: "Serán sometidos a un examen toxicológico el personal naval que acuda al centro médico naval:", opciones: ["Por tener cita médica", "A consecuencia de un accidente o un hecho fortuito", "Por recoger medicinas", "Por tratamiento ambulatorio"], correcta: 1, fuente: "Directiva de Control de Drogas." },

{ pregunta: "No es considerado parte del procedimiento de seguridad a seguir con las visitas:", opciones: ["Control", "Vigilancia", "Identificación", "Información"], correcta: 3, fuente: "Normas de Seguridad Institucional." },

{ pregunta: "Organismo autorizado para recibir a los agregados navales acreditados en el Perú:", opciones: ["COMGEMAR", "Oficina de enlace del EMGM", "Oficina de enlace de DINTEMAR", "Jefe del Estado Mayor de la Marina"], correcta: 1, fuente: "Protocolo Naval." },

{ pregunta: "La institución para la detección y determinación del consumo de drogas por parte del personal naval puede realizar los análisis toxicológicos correspondientes en forma __________ al personal naval:", opciones: ["Inopinada", "Programada", "Reservada", "Aleatoria"], correcta: 3, fuente: "Directiva de Control Antidrogas." },

{ pregunta: "Evalúa el cumplimiento de metas de la unidad o dependencia con respecto a los resultados esperados, es un indicador de conducta de la competencia:", opciones: ["Dominio técnico", "Minuciosidad", "Capacitación", "Supervisión y monitoreo"], correcta: 3 },
{ pregunta: "Es el reglamento de instrucciones sobre correspondencia naval:", opciones: ["ISCON-13303", "ISIPI-13604", "ISAN-13605", "ISRAC-13201"], correcta: 0 },
{ pregunta: "Cuando se decrete duelo oficial se izará el pabellón nacional a media asta:", opciones: ["En todos los edificios de los bancos", "En todos los edificios del Estado, en todos los edificios de las Fuerzas Armadas y Policía Nacional", "Se suspenderán las actividades laborales en el momento de la inhumación", "Solo en las plazas de armas de las provincias"], correcta: 1 },
{ pregunta: "¿Qué repercusiones ocasiona a las personas si consumen droga?", opciones: ["Pérdida de los valores y patrones de conducta", "Problemas psicológicos", "Falta de ánimo y de interés", "Pérdida de ánimo"], correcta: 0 },
{ pregunta: "Además de lo prescrito en las órdenes recibidas, las tropas podrán hacer uso de sus armas en el siguiente caso:", opciones: ["Cuando no sean atacadas", "Cuando no hayan agotado todos los medios de persuasión a su alcance para normalizar el orden alterado", "Cuando hayan agotado todos los medios de persuasión a su alcance para normalizar el orden alterado", "Cuando no se vean rodeadas o amenazadas en forma tal que peligre la misión, la vida o la seguridad"], correcta: 2 },
{ pregunta: "¿Cuál es la clasificación del REGUARNI-11309?", opciones: ["Confidencial", "Ordinario", "Reservado", "Secreto"], correcta: 2 },
{ pregunta: "Es aquella información que contiene consejos, recomendaciones u opiniones como parte del proceso deliberativo y consultivo previo a la toma de una decisión de gobierno:", opciones: ["Confidencial", "Reservada", "Secreto", "Público"], correcta: 0 },
{ pregunta: "¿Quién tomará acción para proteger y mantener la seguridad del buque?", opciones: ["El comandante", "El segundo comandante", "El jefe de armamento", "El jefe de la oficina de seguridad"], correcta: 0 },
{ pregunta: "Son inherentes a la función militar; su ejercicio hace que el militar actúe conforme a los principios y normas establecidas por las Fuerzas Armadas:", opciones: ["Virtudes militares", "Valores militares", "Espíritu militar", "Deber militar"], correcta: 0 },
{ pregunta: "¿Cuántos soles tiene la insignia de contralmirante?", opciones: ["Dos soles", "Un sol", "Tres soles", "No lleva soles"], correcta: 0 },
{ pregunta: "Atención, arrear, izar, aguantar, afirmar:", opciones: ["Toque operativo", "Toque administrativo", "Toques simples", "Toques compuestos"], correcta: 0 },
{ pregunta: "Es un documento mediante el cual el personal naval efectúa una gestión a título personal cuando se trate de asuntos de competencia solo del interesado:", opciones: ["Guía de destino", "Memorándum", "Solicitud", "Informe"], correcta: 2 },
{ pregunta: "¿Qué órgano controla, norma y dirige las actividades y material de la Marina Mercante?", opciones: ["DIHIDRONAV", "DICAPI", "DIRINTEMAR", "DIREDUMAR"], correcta: 1 },
{ pregunta: "El Estado Mayor General de la Marina es un órgano de:", opciones: ["Comando", "Planeamiento y supervisión", "Consultivo", "Control"], correcta: 1 },
{ pregunta: "¿Cuántos soles tiene la insignia de vicealmirante?", opciones: ["Dos soles", "Un sol", "Tres soles", "No lleva soles"], correcta: 2 },
{ pregunta: "\"Actúa incluso en circunstancias inciertas, cuando cuenta con información limitada\", está dentro de un indicador de conducta de la competencia:", opciones: ["Adaptabilidad", "Autocontrol", "Confianza de sí mismo", "Influencia asertiva"], correcta: 2 },
{ pregunta: "¿Qué órgano investiga las actividades de oceanografía y meteorología?", opciones: ["DICAPI", "DIHIDRONAV", "IMARPE", "DIRINTIMAR"], correcta: 1 },
{ pregunta: "Es un documento de uso externo que constituye el medio de comunicación entre la Marina de Guerra del Perú con personas naturales y jurídicas:", opciones: ["Carta", "Solicitud", "Informe", "Oficio"], correcta: 0 },
{ pregunta: "Es la atención en consultorios que se brinda al beneficiario en los centros de salud de la institución asociados al sistema de salud de la Marina:", opciones: ["Tratamiento ambulatorio", "Tratamiento médico", "Tratamiento permanente", "Tratamiento en centro de salud"], correcta: 0 },
{ pregunta: "Clases de toque de pito de contramaestre:", opciones: ["Honores", "Cánticos", "Ceremonias", "Operativos y administrativos"], correcta: 3 },
{ pregunta: "No es considerado una clase de visita a las unidades y dependencias:", opciones: ["Oficiales", "Sociales", "Recreativas", "Públicas"], correcta: 2 },
{ pregunta: "Es cuando la acción de enseñanza-aprendizaje combina las modalidades semipresencial y virtual:", opciones: ["Modalidad semipresencial", "Modalidad virtual", "Modalidad mixta", "Modalidad presencial"], correcta: 2 },
{ pregunta: "¿Cuáles son los criterios que deben regir toda ceremonia naval?", opciones: ["Uniformidad, sobriedad y destreza", "Uniformidad, seguridad y puntualidad", "Solemnidad, sobriedad y responsabilidad", "Uniformidad, solemnidad, sobriedad y seguridad"], correcta: 3 },
{ pregunta: "Una vez que el comando recibe la comunicación del cambio de empleo de algún personal subalterno bajo su mando, procederá a comunicárselo a fin de este preparar su:", opciones: ["Entrega de cargo", "Guardia de honor", "Memoria anual", "Foja de notas"], correcta: 0 },
{ pregunta: "Es la devolución de los gastos efectuados por el beneficiario de acuerdo a las reglamentaciones vigentes:", opciones: ["Reintegro", "Devolución", "Reembolso", "Pago por devolución"], correcta: 2 },
{ pregunta: "Supervisa la gestión del personal a su cargo, es un indicador de conducta de la competencia:", opciones: ["Trabajo en equipo", "Orientación/asesoramiento", "Liderazgo", "Comunicación efectiva"], correcta: 2 },
{ pregunta: "Otro nombre por el que se le conoce a la guirnalda:", opciones: ["Adorno", "Escaparate", "Engalanado eléctrico", "Empavesado"], correcta: 2 },
{ pregunta: "El desempeño de una función temporal en el país o en el extranjero se considera como:", opciones: ["Comisión o servicio especial", "Comisión del servicio", "Servicio especial en el país o en el extranjero", "Destacado temporalmente"], correcta: 0 },
{ pregunta: "Brinda sugerencias de cómo realizar el trabajo correctamente, es un indicador de conducta de la competencia:", opciones: ["Comunicación efectiva", "Supervisión y monitoreo", "Proactividad", "Dominio técnico"], correcta: 3 },
{ pregunta: "¿Qué alternativa no corresponde en el intercambio de saludo?", opciones: ["Unidades a flote de la Marina de Guerra", "Pabellón con escolta", "Embarcaciones remolcadas", "Personal de las Fuerzas Armadas"], correcta: 2 },
{ pregunta: "El comandante general de la Marina es designado por:", opciones: ["La Junta de Almirantes", "El presidente de la República", "El ministro de Defensa", "El jefe del Comando Conjunto de las FFAA"], correcta: 1 },
{ pregunta: "Una base naval es marítima cuando se encuentra ubicada en:", opciones: ["La ribera de un río", "La costa", "La orilla de un lago", "Una dependencia"], correcta: 1 },
{ pregunta: "Llevará impresa en el centro un ancla en posición horizontal ocupando 1/3 de la franja blanca, unida al tope del palo mayor con cintas rojas o driza blanca:", opciones: ["Gallardete de comandante de unidad", "Jack nacional", "Bandera de la Marina de Guerra del Perú", "Estandarte"], correcta: 0 },
{ pregunta: "Establecer las normas y disposiciones pertinentes para otorgar distintivos al personal naval es un objetivo del:", opciones: ["REDIPEN-13022", "REASPERSUB-13013", "PERSUBA-13007", "REDIPEN-13020"], correcta: 3 },
{ pregunta: "De acuerdo al REDIPEN-13020, la anulación del otorgamiento de distintivos será:", opciones: ["Por límite de edad", "A juicio del consejo de la distinción", "Por haber pasado a la situación de disponibilidad a su solicitud", "Por tener arresto de rigor dentro de los últimos tres años de servicio"], correcta: 1 },
{ pregunta: "Tendrá el control de todo el personal de guardia arrestado y que se encuentre trabajando:", opciones: ["El oficial de guardia de la dependencia", "El técnico de guardia de la prevención", "El técnico de ronda", "El jefe de servicio"], correcta: 0 },
{ pregunta: "Durante su permanencia en el país acreditado, el agregado naval estará obligado a residir en:", opciones: ["Cualquier país", "El Perú", "La localidad de la sede diplomática", "Cualquier localidad del país"], correcta: 2 },
{ pregunta: "A un vicealmirante se le otorgará la denominación distintiva de almirante cuando:", opciones: ["Sea designado ministro del sector Defensa", "Sea designado comandante general de la Marina o jefe del Comando Conjunto de las Fuerzas Armadas", "Únicamente cuando sea designado comandante general de la Marina", "Únicamente cuando sea designado presidente del Comando Conjunto"], correcta: 1 },
{ pregunta: "El proceso de formación del personal de grumetes en etapa de formación comprende dos fases, siendo una de ellas:", opciones: ["Adoctrinamiento militar", "Inserción a la vida militar", "Acondicionamiento físico", "Formación académica"], correcta: 0 },
{ pregunta: "Son aquellas cuya organización y ejecución corresponde a las Fuerzas Armadas o Policía Nacional del Perú, según el caso:", opciones: ["Las ceremonias institucionales", "Las ceremonias nacionales", "Las ceremonias navales", "Las ceremonias especiales"], correcta: 0 }


],

oficinista: [

{ pregunta: "¿En qué año fue publicada la última edición de la ISCON-13303?", opciones: ["Edición 2010", "Edición 2005", "Edición 2019", "Edición 2012"], correcta: 3, fuente: "ISCON-13303 – Correspondencia Naval." },
{ pregunta: "Información que requiere protección por seguridad nacional:", opciones: ["Información clasificada", "Información pública", "Información externa", "Información interna"], correcta: 0, fuente: "ISCON-13303 – Correspondencia Naval." },
{ pregunta: "Documentación financiada por el Estado y publicada en El Peruano:", opciones: ["Información ordinaria", "Información interna", "Información externa", "Información pública"], correcta: 3, fuente: "ISCON-13303 – Correspondencia Naval." },
{ pregunta: "Control físico de documentación:", opciones: ["Sistema Ofitrame", "Cuaderno de cargo", "Sistema Chasqui", "Cuaderno tarjador"], correcta: 1, fuente: "ISCON-13303 – Correspondencia Naval." },
{ pregunta: "Documento para agilizar trámites y anexar documentos:", opciones: ["Parte de viaje", "Informe", "Oficio", "Guía de destino"], correcta: 2, fuente: "ISCON-13303 – Correspondencia Naval." },
{ pregunta: "Documentación clasificada irá en:", opciones: ["Doble sobre", "Un solo sobre", "Sin sobre", "Sobre de manila"], correcta: 0, fuente: "ISCON-13303 – Correspondencia Naval." },
{ pregunta: "Tipo de fuente en computadora:", opciones: ["Arial 10", "Century Gothic 11", "Times New Roman 12", "Courier 12"], correcta: 1, fuente: "ISCON-13303 – Correspondencia Naval." },
{ pregunta: "Formatos impresos para simplificar trámites:", opciones: ["Directivas", "Resoluciones", "Formas de uso oficial", "Actas"], correcta: 2, fuente: "ISCON-13303 – Correspondencia Naval." },
{ pregunta: "Funcionario que certifica documentos:", opciones: ["Jefe de la secretaría", "Oficial jurídico", "Oficial de seguridad", "Fedatario"], correcta: 3, fuente: "ISCON-13303 – Correspondencia Naval." },
{ pregunta: "Documentos usados para trámites no normativos ni técnicos:", opciones: ["Técnicos", "Operacionales", "Administrativos", "Jurídicos"], correcta: 2, fuente: "ISCON-13303 – Correspondencia Naval." },
{ pregunta: "Dentro de las características de la redacción, el concepto que indica expresar las ideas de forma concreta corresponde a:", opciones: ["Objetividad", "Coherencia", "Acción", "Claridad"], correcta: 2, fuente: "ISCON-13303 – Redacción administrativa." },
{ pregunta: "Es aquella correspondencia que se emite con una periodicidad preestablecida:", opciones: ["Distribución externa", "Correspondencia interna", "Distribución interna", "Correspondencia de rutina"], correcta: 3, fuente: "ISCON-13303 – Correspondencia Naval." },
{ pregunta: "El documento oficial dirigido a autoridades extranjeras será escrito en idioma:", opciones: ["Idioma del país a donde va dirigido", "Idioma español pudiendo agregarse una traducción si fuera solicitada", "Idioma de origen solamente", "Idioma inglés"], correcta: 1, fuente: "ISCON-13303 – Correspondencia Naval." },
{ pregunta: "Por su tipo de confección, son aquellos documentos escritos a mano con las formalidades respectivas:", opciones: ["Manuscrita", "Mecanografía", "Digitalizada", "Computarizada"], correcta: 0, fuente: "ISCON-13303 – Clasificación documental." },
{ pregunta: "Las instrucciones correspondientes a los mensajes navales están establecidas en el:", opciones: ["CAFUSO-13305", "RESENA-13408", "ISCON-13303", "COMU-1602"], correcta: 3, fuente: "COMU-1602 – Comunicaciones navales." },
{ pregunta: "Medio alterno para registrar documentos recibidos clasificados y no clasificados con numeración correlativa desde el 1 de enero:", opciones: ["Cuaderno de documentos recibidos", "Cuaderno de documentos enviados", "Tarjador de dispositivos legales", "Cuaderno de control de directivas recibidas y promovidas"], correcta: 0, fuente: "ISCON-13303 – Registro documental." },
{ pregunta: "Son los documentos que cursan las autoridades navales y personal naval dentro de la institución:", opciones: ["Rutina", "Externa", "Interna", "Clasificada"], correcta: 2, fuente: "ISCON-13303 – Correspondencia Naval." },
{ pregunta: "Tipo de papel para autógrafos de leyes, decretos legislativos, decretos de urgencia y decretos supremos:", opciones: ["80 gramos", "60 gramos", "120 gramos", "70 gramos"], correcta: 2, fuente: "Normas de documentación oficial." },
{ pregunta: "Tipo de papel para resoluciones de menor jerarquía (copias):", opciones: ["80 gramos", "120 gramos", "60 gramos", "75 gramos"], correcta: 3, fuente: "Normas de documentación oficial." },
{ pregunta: "¿Cuáles son las dimensiones del sello de recepción?", opciones: ["135 mm x 45 mm", "8 mm x 5 mm", "50 mm x 30 mm", "4 mm x 3 mm"], correcta: 2, fuente: "ISCON-13303 – Control documental." },
{ pregunta: "¿Qué deberán realizar las unidades y dependencias para respaldar la información como medida de seguridad?", opciones: ["Incinerar", "Depuración", "Backup", "Proteger"], correcta: 2, fuente: "ISCON-13303 – Seguridad de la información." },
{ pregunta: "Compendio mediante el cual la Comandancia General de la Marina hace conocer leyes, decretos y disposiciones:", opciones: ["Orden General de la Marina", "Orden del día", "Orden interna", "Orden externa"], correcta: 0, fuente: "Normativa institucional de la Marina." },
{ pregunta: "La documentación por su alcance puede ser:", opciones: ["Digitalizada – técnica", "Interna – externa", "Manuscrito – formato", "Clasificada – pública"], correcta: 1, fuente: "ISCON-13303 – Clasificación documental." },
{ pregunta: "Acción de poner por escrito una idea relacionada con el servicio o gestión personal:", opciones: ["Tipificación", "Redacción", "Formulación", "Impresión"], correcta: 1, fuente: "ISCON-13303 – Redacción administrativa." },
{ pregunta: "El sobre conteniendo correspondencia con clasificación de seguridad “confidencial” será abierto en horas laborables por:", opciones: ["Jefe de servicio", "Comandante", "Técnico de cargo", "Oficial secretario"], correcta: 3, fuente: "ISCON-13303 – Manejo de documentación clasificada." },
{ pregunta: "El tratamiento, custodia y archivo de la correspondencia de clasificación de seguridad “confidencial”, será igual a lo establecido para la documentación de carácter:", opciones: ["Secreto", "Reservado", "Ordinario", "Público"], correcta: 0, fuente: "ISCON-13303 – Seguridad documental." },
{ pregunta: "El trato a usarse cuando el destinatario es de menor antigüedad es:", opciones: ["Informo", "Solicito", "Recomiendo", "Comunico"], correcta: 3, fuente: "ISCON-13303 – Redacción administrativa." },
{ pregunta: "Todo documento deberá ser dirigido al:", opciones: ["Oficial más antiguo", "A la persona", "Cargo", "Comandante"], correcta: 2, fuente: "ISCON-13303 – Redacción administrativa." },
{ pregunta: "¿Quién es el responsable de disponer que personal subalterno tome conocimiento de la correspondencia “confidencial”?", opciones: ["Técnico de cargo", "Oficial secretario", "Jefe de servicio", "Comandante"], correcta: 2, fuente: "ISCON-13303 – Seguridad documental." },
{ pregunta: "El trato a usarse cuando el destinatario es de mayor antigüedad es:", opciones: ["Comunico", "Sírvase", "Solicito", "Agradeceré"], correcta: 3, fuente: "ISCON-13303 – Redacción administrativa." },
{ pregunta: "La correspondencia interna y externa ¿a qué categorización de documentos comprende?", opciones: ["Por su empleo", "Por su carácter", "Por su alcance", "Por su confección"], correcta: 2, fuente: "ISCON-13303 – Clasificación documental." },
{ pregunta: "Los documentos administrativos ¿a qué categorización de documentos comprende?", opciones: ["Por su carácter", "Por su empleo", "Por su alcance", "Por su confección"], correcta: 1, fuente: "ISCON-13303 – Clasificación documental." },
{ pregunta: "¿Cuáles son las dimensiones del papel tamaño A4 para documentos?", opciones: ["220 × 297 mm", "290 × 210 mm", "210 × 220 mm", "210 × 297 mm"], correcta: 3, fuente: "Normas técnicas de documentación." },
{ pregunta: "Son documentos que permiten su manipulación en medios magnéticos y de transmisión de datos:", opciones: ["Backup", "Formas", "Digitalizada", "Manuscrita"], correcta: 2, fuente: "ISCON-13303 – Clasificación documental." },
{ pregunta: "Se considera documentación ______ a aquella que no contiene información clasificada y es de uso exclusivo de la institución:", opciones: ["Pública", "Reservada", "Ordinario", "Clasificada"], correcta: 2, fuente: "ISCON-13303 – Clasificación documental." },
{ pregunta: "El __________ de los diferentes legajos o archivadores permite una rápida ubicación de la documentación:", opciones: ["Archivador", "Rotulado", "Folder", "Separador"], correcta: 1, fuente: "ISCON-13303 – Archivo documental." },
{ pregunta: "Para control de legajos de documentación clasificada se deberá contar con una:", opciones: ["Registro", "Separador", "Página de inventario", "Cubierta"], correcta: 2, fuente: "ISCON-13303 – Archivo documental." },
{ pregunta: "El archivo de la documentación recibida y enviada debe efectuarse en forma:", opciones: ["Abierta", "Junta", "Cubierta", "Separada"], correcta: 3, fuente: "ISCON-13303 – Archivo documental." },
{ pregunta: "El sistema de archivo empleado para la documentación está basado en la codificación de:", opciones: ["Materias y asuntos", "Temas y códigos", "Archivo y legajos", "Carpetas y archivo"], correcta: 0, fuente: "ISCON-13303 – Archivo documental." },
{ pregunta: "¿Qué medio de remisión se utiliza cuando se emplea el sistema de tramitación electrónica (PGP)?", opciones: ["Backup", "Escrito", "Manual", "Electrónico"], correcta: 3, fuente: "ISCON-13303 – Tramitación documental." },
{ pregunta: "¿Qué medio de remisión es cuando se emplean oficinas postales, mesa de partes, carteros oficiales y servicio de correo comercial?", opciones: ["Manual", "Electrónico", "Físico", "Digitalizado"], correcta: 2, fuente: "ISCON-13303 – Tramitación documental." },
{ pregunta: "Para la redacción de un documento debe considerarse tácitamente lo siguiente:", opciones: ["Unidad, integridad y coherencia", "Hechos, desarrollo de idea y acción", "Claridad y acción", "Objetividad y coherencia"], correcta: 1, fuente: "ISCON-13303 – Redacción administrativa." },
{ pregunta: "Dentro de la redacción, ¿qué característica corresponde cuando se debe tratar un solo asunto?", opciones: ["Integridad", "Coherencia", "Unidad", "Claridad"], correcta: 2, fuente: "ISCON-13303 – Redacción administrativa." },
{ pregunta: "Desarrollo de ideas reducidas a términos claros y precisos de una orden que determina el tipo de documento:", opciones: ["Redacción de documentos", "Tramitación de documentos", "Formulación de documentos", "Recepción de documentos"], correcta: 2, fuente: "ISCON-13303 – Redacción administrativa." },
{ pregunta: "La documentación se archivará en legajos o archivadores denominados:", opciones: ["Archivo", "Carpetas", "Legajos", "Cuadernos de registro"], correcta: 1, fuente: "ISCON-13303 – Archivo documental." },
{ pregunta: "Cuando el comando deba ausentarse temporalmente para firma de documentos será reemplazado por:", opciones: ["Oficial de personal", "Oficial secretario", "Oficial fedatario", "Oficial que le sigue en antigüedad"], correcta: 3, fuente: "Normativa institucional." },
{ pregunta: "¿Qué significa TUPA?", opciones: ["Texto Único de Procedimientos Administrativos", "Texto Único Ordenado para Adquisición", "Texto Unificado de Procedimientos Adquisitivos", "Texto Unificado de Procedimientos Administrativos"], correcta: 0, fuente: "Normativa administrativa del Estado." },
{ pregunta: "Documento de uso interno entre comandos de unidades y dependencias para tratar asuntos institucionales:", opciones: ["Memorándum", "Informe", "Oficio", "Solicitud"], correcta: 0, fuente: "ISCON-13303 – Documentos administrativos." },
{ pregunta: "En redacción de documentos, el asunto o materia que motiva el documento corresponde a:", opciones: ["Desarrollo de idea", "Acción", "Toma de decisión", "Hechos"], correcta: 3, fuente: "ISCON-13303 – Redacción administrativa." },
{ pregunta: "En la redacción de documentos, es la exposición y análisis sobre el asunto tratado:", opciones: ["Acción", "Desarrollo de idea", "Conocimiento", "Justificación"], correcta: 1, fuente: "ISCON-13303 – Redacción administrativa." },
{ pregunta: "Toda documentación relacionada con inteligencia y contrainteligencia corresponde a la clasificación:", opciones: ["Secreto", "Confidencial", "Reservado", "Público"], correcta: 0, fuente: "ISCON-13303 – Clasificación de seguridad." },
{ pregunta: "Documentación relacionada con planeamiento de la defensa nacional corresponde a clasificación:", opciones: ["Secreto", "Confidencial", "Reservado", "Público"], correcta: 0, fuente: "ISCON-13303 – Clasificación de seguridad." },
{ pregunta: "El trato a usarse en la redacción de la documentación deberá ser siempre de:", opciones: ["De acuerdo mutuo", "Mutuo respeto jerárquico", "Por antigüedad", "Cortesía institucional"], correcta: 1, fuente: "ISCON-13303 – Redacción administrativa." },
{ pregunta: "Características o partes que se emplean indistintamente en documentos administrativos corresponden a:", opciones: ["Clasificación", "Características comunes", "Codificación", "Redacción"], correcta: 1, fuente: "ISCON-13303 – Documentos administrativos." },
{ pregunta: "Documento mediante el cual el comando expone a su superior aspectos relevantes de su gestión:", opciones: ["Oficio", "Guía de destino", "Directiva", "Memoria de gestión anual"], correcta: 3, fuente: "Normativa institucional." },
{ pregunta: "Las partes comunes de un oficio son:", opciones: ["Encabezamiento, cuerpo, párrafo, firma y distribución", "Encabezamiento, texto, antefirma y firma, y distribución", "Encabezamiento, antefirma y firma", "Encabezamiento, texto y firma"], correcta: 1, fuente: "ISCON-13303 – Documentos administrativos." },
{ pregunta: "Al formular todo tipo de documento, el oficial promotor deberá estampar su ______ en la parte inferior izquierda de la copia:", opciones: ["Sello y antefirma", "Sello y visación", "Antefirma", "Firma"], correcta: 1, fuente: "ISCON-13303 – Procedimientos documentales." },
{ pregunta: "Los párrafos del texto serán escritos en forma:", opciones: ["Alineada", "Centrada", "Desviada", "Justificada"], correcta: 3, fuente: "ISCON-13303 – Redacción administrativa." },
{ pregunta: "Para la documentación formulada en computadora ¿qué tipo de fuente se usará?", opciones: ["Arial", "Calibri", "Century Gothic", "Times New Roman"], correcta: 2, fuente: "ISCON-13303 – Formato de documentos." },
{ pregunta: "Para la documentación formulada en computadora ¿qué tamaño de fuente se usará?", opciones: ["10", "12", "9", "11"], correcta: 3, fuente: "ISCON-13303 – Formato de documentos." },
{ pregunta: "Para la documentación formulada en computadora ¿qué estilo de fuente se usará?", opciones: ["Normal", "Cursiva", "Negrita", "Negrita cursiva"], correcta: 0, fuente: "ISCON-13303 – Formato de documentos." },
{ pregunta: "Está ubicado debajo del membrete centrado, entre comillas y en letra mayúscula Century Gothic tamaño 9:", opciones: ["Membrete", "Lugar y fecha", "Nombre del decenio y año", "Archivo"], correcta: 2, fuente: "ISCON-13303 – Formato de documentos." },
{ pregunta: "Documento de uso oficial empleado únicamente para comunicación escrita interna entre el comando y sus órganos de línea:", opciones: ["Oficio", "Orden del día", "Memorándum", "Directiva"], correcta: 2, fuente: "ISCON-13303 – Documentos administrativos." },
{ pregunta: "Documento mediante el cual el personal naval efectúa una gestión a título personal:", opciones: ["Oficio", "Solicitud", "Memorándum", "Informe"], correcta: 1, fuente: "ISCON-13303 – Documentos administrativos." },
{ pregunta: "Se colocará en el margen izquierdo y a dos espacios simples debajo del renglón de lugar y fecha:", opciones: ["Clasificación de seguridad", "Codificación del documento", "Lugar y fecha", "Encabezamiento"], correcta: 0, fuente: "ISCON-13303 – Formato de documentos." },
{ pregunta: "Documento de uso formal en la comunicación oficial externa con autoridades, instituciones y organismos:", opciones: ["Informe", "Memorándum", "Oficio", "Oficio especial"], correcta: 2, fuente: "ISCON-13303 – Documentos administrativos." },
{ pregunta: "Documento mediante el cual el personal naval informa al superior jerárquico sobre un hecho concreto:", opciones: ["Informe", "Memorándum", "Oficio", "Carta"], correcta: 0, fuente: "ISCON-13303 – Documentos administrativos." },
{ pregunta: "En la antefirma y firma de un oficio ¿qué frase se emplea como despedida?", opciones: ["Atentamente", "Dios guarde a Ud.", "Cordialmente", "Agradeceré a Ud."], correcta: 1, fuente: "ISCON-13303 – Redacción administrativa." },
{ pregunta: "Documento cuyo propósito es simplificar el trámite administrativo utilizado por delegación al secretario de la comandancia:", opciones: ["Entrega de cargo", "Oficio", "Guía de destino", "Parte de viaje"], correcta: 2, fuente: "ISCON-13303 – Documentos administrativos." },
{ pregunta: "Es el proceso de distribución interna de la documentación dentro de las unidades o dependencias:", opciones: ["Acción inmediata", "Procedimiento", "Trámite", "Información"], correcta: 0, fuente: "ISCON-13303 – Tramitación documental." },
{ pregunta: "¿Cuáles son los tipos de memoria de una computadora?", opciones: ["Memoria ROM y RUM", "Memoria RAM y PC", "Memoria USB y PC", "Memoria ROM y RAM"], correcta: 3, fuente: "Fundamentos de computación." },
{ pregunta: "¿A qué tipo de dispositivos pertenecen el monitor y la impresora?", opciones: ["De video", "De impresión", "De entrada", "De salida"], correcta: 3, fuente: "Fundamentos de computación." },
{ pregunta: "Documento con el cual se informa un tema de carácter técnico con hechos obtenidos y verificados por el promotor:", opciones: ["Directiva", "Informe técnico", "Guía de destino", "Memorándum"], correcta: 1, fuente: "ISCON-13303 – Documentos administrativos." },
{ pregunta: "Decisiones de carácter específico rubricadas por el Presidente de la República y refrendadas por uno o más ministros:", opciones: ["Resolución suprema", "Resolución ministerial", "Resolución de la Comandancia General de la Marina", "Decreto supremo"], correcta: 1, fuente: "Normativa del Estado peruano." },
{ pregunta: "Documento que se emplea para mantener o disponer actividades específicas cuyo ámbito está limitado al interior de una unidad o dependencia:", opciones: ["Orden del día", "Orden interna", "Orden externa", "Directiva"], correcta: 0, fuente: "ISCON-13303 – Documentos administrativos." },
{ pregunta: "Para reducir costos y tiempo en la tramitación, la documentación ordinaria será tramitada por:", opciones: ["Oficina postal", "Medios electrónicos", "Mesa de partes", "Correo institucional"], correcta: 1, fuente: "ISCON-13303 – Tramitación documental." },
{ pregunta: "Documento mediante el cual el comando de una unidad imparte órdenes precisas de naturaleza general:", opciones: ["Orden del día", "Orden externa", "Orden interna", "Directiva"], correcta: 2, fuente: "ISCON-13303 – Documentos administrativos." },
{ pregunta: "Para no mostrar indicación respecto a la naturaleza de su contenido, la documentación clasificada irá en:", opciones: ["Un solo sobre", "Sin sobre", "Dos sobres", "Sobre sellado"], correcta: 2, fuente: "ISCON-13303 – Seguridad documental." },
{ pregunta: "La tinta a emplearse en la impresión de la documentación será de color:", opciones: ["Rojo", "Azul", "Blanco", "Negro"], correcta: 3, fuente: "ISCON-13303 – Formato de documentos." },
{ pregunta: "El tampón para sellos que indican clasificación de seguridad, prioridad o destinatario será de color:", opciones: ["Rojo", "Azul", "Blanco", "Negro"], correcta: 0, fuente: "ISCON-13303 – Normas de sellado." },
{ pregunta: "Sello que se estampa al lado izquierdo y en la parte central a la altura de la antefirma del promotor:", opciones: ["Sello de recepción", "Sello de acción", "Sello de prioridad", "Sello oficial"], correcta: 2, fuente: "ISCON-13303 – Normas de sellado." },
{ pregunta: "Cuando se requiera que los documentos lleguen a su destino a la brevedad y la acción sea inmediata se emplearán:", opciones: ["Invitación", "Personal", "Individual", "Prioridad"], correcta: 3, fuente: "ISCON-13303 – Tramitación documental." },
{ pregunta: "Los documentos muy urgentes, el plazo de respuesta será de:", opciones: ["Dos días", "Un día", "Tres días útiles", "El mismo día de recibido"], correcta: 3, fuente: "ISCON-13303 – Plazos de atención." },
{ pregunta: "Los documentos urgentes, el plazo de respuesta será de:", opciones: ["Seis días", "Siete días útiles", "Tres días", "El mismo día de recibido"], correcta: 1, fuente: "ISCON-13303 – Plazos de atención." },
{ pregunta: "Los documentos con atención especial, el plazo de respuesta será de:", opciones: ["Diez días calendario", "Siete días", "Quince días", "El mismo día de recibido"], correcta: 0, fuente: "ISCON-13303 – Plazos de atención." },
{ pregunta: "Son órganos destinados a la recepción y distribución de la documentación oficial a las unidades y dependencias:", opciones: ["Oficinas postales", "Correo electrónico", "Trámite documentario", "Mesa de partes"], correcta: 3, fuente: "ISCON-13303 – Organización administrativa." },
{ pregunta: "Para el transporte de la documentación deberá usarse:", opciones: ["Maleta con llave", "Bolsa de lona", "Maletín de cuero", "Sobres de manila"], correcta: 3, fuente: "ISCON-13303 – Seguridad documental." },
{ pregunta: "El cuaderno en el cual se registran los documentos enviados se llama:", opciones: ["Registro de documentos enviados", "Registro de documentos recibidos", "Cuaderno de documentos enviados", "Tarjador de documentos"], correcta: 2, fuente: "ISCON-13303 – Registro documental." },
{ pregunta: "Funcionario que ejerce el cargo de jefe de la secretaría y brinda servicios gratuitos al personal:", opciones: ["Oficial de personal", "Oficial de seguridad", "Oficial de comunicaciones", "Fedatario"], correcta: 3, fuente: "ISCON-13303 – Organización administrativa." },
{ pregunta: "Será designado en adición a sus funciones como encargado de la tramitación electrónica de documentos:", opciones: ["Jefe de la secretaría", "Oficial de seguridad", "Oficial de comunicaciones", "Técnico de cargo de la secretaría"], correcta: 3, fuente: "ISCON-13303 – Tramitación electrónica." },
{ pregunta: "¿Cuántas clases de escalafón hay para el personal subalterno?", opciones: ["Una (1)", "Dos (2)", "Tres (3)", "Cuatro (4)"], correcta: 3, fuente: "Normativa de personal naval." },
{ pregunta: "Víveres procesados de uso inmediato que se entregan en casos de emergencia:", opciones: ["Ración de combate", "Ración de mar", "Ración de emergencia", "Rancho naval"], correcta: 3, fuente: "Logística naval." },
{ pregunta: "Tipo de clasificación del personal de marinería por el servicio que presta:", opciones: ["Servicio militar voluntario", "Servicio militar obligatorio", "Personal reenganchado", "Personal mixto"], correcta: 2, fuente: "Normativa de personal naval." },
{ pregunta: "Ley que regula el sistema nacional de presupuesto:", opciones: ["Ley N° 28693", "Ley N° 28563", "Ley N° 28708", "Ley N° 28411"], correcta: 3, fuente: "Legislación peruana." },
{ pregunta: "Principios del sistema nacional de abastecimiento:", opciones: ["Economía, eficacia, eficiencia, oportunidad, predictibilidad, razonabilidad, sostenibilidad y transparencia", "Economía, eficacia, eficiencia, razonabilidad, sostenibilidad y transparencia", "Economía, eficacia, eficiencia, oportunidad y sostenibilidad", "Economía, eficacia, eficiencia y transparencia"], correcta: 0, fuente: "Normativa de abastecimiento del Estado." },
{ pregunta: "¿Qué significa OSCE?", opciones: ["Organismo Supervisor de Contrato del Estado", "Organismo Supervisor de las Contrataciones del Estado", "Organismo de Seguridad de Contrato con el Estado", "Oficina de Servicios de Contratación Estatal"], correcta: 1, fuente: "Normativa de contrataciones del Estado." },
{ pregunta: "Un pedido de víveres se hace mediante:", opciones: ["Memorándum", "Forma ML-601", "Oficio", "Forma ML-401"], correcta: 3, fuente: "Logística naval." },
{ pregunta: "¿Cuánto tiempo de vigencia tiene una directiva?", opciones: ["15 meses", "36 meses", "24 meses", "12 meses"], correcta: 3, fuente: "Normativa institucional." },
{ pregunta: "¿Mediante qué dispositivo legal se nombra al Técnico Supervisor Maestro de la Marina?", opciones: ["Resolución de la Comandancia General de la Marina", "Resolución Directoral", "Resolución Ministerial", "Resolución Suprema"], correcta: 3, fuente: "Normativa institucional." },
{ pregunta: "Tiempo máximo de permanencia en el cargo de Comandante General de la Marina:", opciones: ["2 años", "1 año y medio", "1 año", "2 años y medio"], correcta: 3, fuente: "Normativa institucional." },

]


};

// =============================
// VALIDACIÓN
// =============================
if (!categoria || !banco[categoria]) {
  alert("⚠️ Categoría no válida");
  window.location.href = "index.html";
}

// =============================
// 🔀 MEZCLAR PREGUNTAS
// =============================
function mezclar(array) {
  return array.sort(() => Math.random() - 0.5);
}

let preguntas = mezclar([...banco[categoria]]);

// =============================
// VARIABLES
// =============================
let i = 0;
let puntaje = 0;
let respondido = false;

// 🔥 FASES
let faseActual = 1;
let limitesFase = [25, 50, 75, 100];

// 🔥 EXPLICACIÓN PERSISTENTE
let modoExplicacion = false;

// =============================
// DOM
// =============================
const titulo = document.getElementById("titulo");
let expBtn = document.getElementById("expBtn");
let nextBtn = document.getElementById("nextBtn");
let expText = document.getElementById("expText");

titulo.textContent = categoria.toUpperCase();

// 🔥 GUARDAR HTML ORIGINAL
let quizOriginal = document.querySelector(".quiz-box").innerHTML;

// =============================
// OBTENER LÍMITE
// =============================
function getLimiteActual() {
  return limitesFase[faseActual - 1];
}

// =============================
// CARGAR PREGUNTA
// =============================
function cargar() {

let p = preguntas[i];

document.getElementById("pregunta").textContent = p.pregunta;

// 🔥 PROGRESO
let limite = getLimiteActual();

document.getElementById("progreso").textContent =
`Pregunta ${i + 1} de ${limite}`;

// 🔥 BARRA
let progreso = ((i + 1) / limite) * 100;
document.getElementById("barra").style.width = progreso + "%";

// 🔥 OPCIONES
let botones = document.querySelectorAll(".opcion");

botones.forEach((b, index) => {
  b.textContent = p.opciones[index];
  b.classList.remove("correcta", "incorrecta");
});

respondido = false;

nextBtn.disabled = true;
nextBtn.style.opacity = "0.5";

// 🔥 EXPLICACIÓN PERSISTENTE
if (modoExplicacion) {
  mostrarExplicacion();
  expText.classList.add("show");
  expBtn.textContent = "❌ Ocultar";
} else {
  expText.classList.remove("show");
  expBtn.textContent = "📖 Ver explicación";
}

}

// =============================
// RESPONDER
// =============================
function responder(index) {

if (respondido) return;

let correcta = preguntas[i].correcta;
let botones = document.querySelectorAll(".opcion");

if (index === correcta) {
  botones[index].classList.add("correcta");
  puntaje++;
} else {
  botones[index].classList.add("incorrecta");
  botones[correcta].classList.add("correcta");
}

// 🔥 ACTUALIZAR PUNTAJE
let puntajeHTML = document.getElementById("puntaje");
if (puntajeHTML) {
  puntajeHTML.textContent = `Puntaje: ${puntaje}`;
}

respondido = true;

nextBtn.disabled = false;
nextBtn.style.opacity = "1";

}

// =============================
// SIGUIENTE
// =============================
function siguiente() {

if (!respondido) {
  alert("⚠️ Marca una respuesta primero");
  return;
}

i++;

// 🔥 FIN DE FASE
if (i === getLimiteActual()) {
  mostrarResumenFase();
  return;
}

cargar();

}

// =============================
// RESUMEN FASE
// =============================
function mostrarResumenFase() {

let total = getLimiteActual();
let nota = (puntaje / total) * 20;

document.querySelector(".quiz-box").innerHTML = `
<h2>✅ Fase ${faseActual} completada</h2>
<p>Puntaje: ${puntaje} / ${total}</p>
<p>Nota: ${nota.toFixed(2)} / 20</p>

<button onclick="continuarFase()">➡ Continuar</button>
<button onclick="terminarIntento()">❌ Terminar</button>
`;

}

// =============================
// CONTINUAR FASE (🔥 CORREGIDO)
// =============================
function continuarFase() {

faseActual++;

if (faseActual > 4) {
  mostrarResultadoFinal();
  return;
}

// 🔥 RESTAURAR QUIZ ORIGINAL
document.querySelector(".quiz-box").innerHTML = quizOriginal;

// 🔥 REASIGNAR DOM
expBtn = document.getElementById("expBtn");
nextBtn = document.getElementById("nextBtn");
expText = document.getElementById("expText");

// 🔥 REACTIVAR EVENTOS
enlazarEventos();

cargar();

}

// =============================
// REACTIVAR EVENTOS
// =============================
function enlazarEventos() {

document.querySelectorAll(".opcion").forEach((btn, index) => {
  btn.onclick = () => responder(index);
});

nextBtn.onclick = siguiente;

expBtn.onclick = () => {

  modoExplicacion = !modoExplicacion;

  if (modoExplicacion) {
    mostrarExplicacion();
    expText.classList.add("show");
    expBtn.textContent = "❌ Ocultar";
  } else {
    expText.classList.remove("show");
    expBtn.textContent = "📖 Ver explicación";
  }

};

}

// =============================
// TERMINAR
// =============================
function terminarIntento() {

guardarIntento();
mostrarResultadoFinal();

}

// =============================
// RESULTADO FINAL
// =============================
function mostrarResultadoFinal() {

let total = getLimiteActual();
let nota = (puntaje / total) * 20;

document.querySelector(".quiz-box").innerHTML = `
<h2>🎉 Resultado final</h2>
<p>Fase alcanzada: ${faseActual}</p>
<p>Puntaje: ${puntaje} / ${total}</p>
<p>Nota: ${nota.toFixed(2)} / 20</p>

<button onclick="location.href='index.html'">Volver</button>
<button onclick="location.href='progreso.html'">📊 Ver progreso</button>
`;

}

// =============================
// GUARDAR
// =============================
function guardarIntento() {

let total = getLimiteActual();
let nota = (puntaje / total) * 20;

let intento = {
  categoria: categoria,
  puntaje: puntaje,
  total: total,
  nota: nota.toFixed(2),
  fase: faseActual,
  fecha: new Date().toLocaleString()
};

let historial = JSON.parse(localStorage.getItem("historial")) || [];

if (historial.length >= 50) {
  historial.shift();
}

historial.push(intento);

localStorage.setItem("historial", JSON.stringify(historial));

}

// =============================
// EXPLICACIÓN
// =============================
function mostrarExplicacion() {

let p = preguntas[i];

let texto = "";

if (p.explicacion) {
  texto = `<strong>📘 Explicación:</strong><br>${p.explicacion}`;

  if (p.fuente) {
    texto += `<br><br><em>📚 Fuente: ${p.fuente}</em>`;
  }

} else {
  texto = `<strong>📚 Fuente:</strong><br>${p.fuente || "No disponible"}`;
}

expText.innerHTML = texto;

}

// =============================
// INICIAR
// =============================
enlazarEventos();
cargar();

// =============================
function volverMenu(){
  window.location.href = "index.html";
}