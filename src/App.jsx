import { useState, useEffect, useRef } from "react";

/* =========================================================================
   STUDIUM USAL · Vicerrectorado de Formación  —  Prototipo v3
   - Login institucional verde con logo USAL (mock OAuth @usal.edu.ar)
   - Roles: Estudiante · Docente · Autoridad
   - Cátedras atadas a (materia + carrera + docente); RAG por cátedra (sim.)
   - Cargados los programas REALES de Filosofía y Ética/Deontología (Veterinaria)
   ========================================================================= */

/* ----------------------------- DATOS USAL -------------------------------- */
const FACULTADES = [
  { nombre: "Facultad de Arte y Arquitectura", carreras: ["Arquitectura", "Licenciatura en Arte y Diseño Digital", "Licenciatura en Artes del Teatro (Escenografía)", "Licenciatura en Diseño Gráfico", "Licenciatura en Geomática (CCC)"] },
  { nombre: "Facultad de Ciencias Agrarias y Veterinarias", carreras: ["Agronomía", "Veterinaria"] },
  { nombre: "Facultad de Ciencias Económicas y Empresariales", carreras: ["Actuario", "Contador Público", "Licenciatura en Administración", "Licenciatura en Administración de RR.HH.", "Licenciatura en Comercialización", "Licenciatura en Comercio Internacional", "Licenciatura en Economía de Empresa", "Licenciatura en Economía Política", "Licenciatura en Gerenciamiento Económico Intercultural (LiGEI)", "Licenciatura en Inteligencia de Negocios", "Licenciatura en Turismo", "Tecnicatura en Organización de Eventos"] },
  { nombre: "Facultad de Ciencias Jurídicas", carreras: ["Abogacía (Programa Franco-Argentino)", "Abogacía (Plan Tradicional)", "Licenciatura en Criminología (CCC)", "Martillero y Corredor Universitario", "Notariado (CCC)"] },
  { nombre: "Facultad de Filosofía, Historia, Letras y Estudios Orientales", carreras: ["Corrector Literario", "Licenciatura en Estudios Orientales", "Licenciatura en Filosofía", "Licenciatura en Gestión e Historia de las Artes", "Licenciatura en Historia", "Licenciatura en Letras", "Tecnicatura en Corrección de Textos Digitales", "Tecnicatura Universitaria en Yoga"] },
  { nombre: "Facultad de Ingeniería", carreras: ["Higiene y Seguridad en el Trabajo (CCC)", "Ingeniería en Informática", "Ingeniería Industrial", "Licenciatura en Ciencias Ambientales", "Licenciatura en Higiene y Seguridad en el Trabajo", "Licenciatura en Sistemas de Información"] },
  { nombre: "Escuela de Lenguas Modernas", carreras: ["Lic. en Interpretación de Conferencias en Inglés", "Licenciatura en Lengua Inglesa", "Traductorado Científico Literario en Inglés", "Traductorado Científico Literario en Italiano", "Traductorado Público de Inglés", "Traductorado Público de Italiano", "Traductorado Público en Portugués"] },
  { nombre: "Facultad de Medicina", carreras: ["Dermatocosmiatría (Tecnicatura)", "Lic. en Actividad Física y Deportiva", "Licenciatura en Enfermería", "Licenciatura en Fonoaudiología", "Licenciatura en Musicoterapia", "Licenciatura en Nutrición", "Lic. en Tecnología para Diagnóstico por Imágenes", "Licenciatura en Terapia Física", "Licenciatura en Terapia Ocupacional", "Medicina", "Odontología"] },
  { nombre: "Facultad de Psicología y Psicopedagogía", carreras: ["Licenciatura en Arte Dramático", "Licenciatura en Educación Inicial", "Licenciatura en Psicología", "Licenciatura en Psicopedagogía"] },
  { nombre: "Facultad de Ciencias Sociales, Educación y Comunicación", carreras: ["Ciclo Pedagógico Universitario", "Ciclo Pedagógico Universitario Semipresencial", "Licenciatura en Ciencia de la Educación", "Licenciatura en Ciencia Política", "Licenciatura en Ciencias de la Comunicación", "Lic. en Educación Especial (CCC)", "Lic. en Gestión de la Educación (CCC)", "Licenciatura en Periodismo", "Licenciatura en Periodismo Deportivo", "Licenciatura en Publicidad", "Licenciatura en Relaciones Internacionales", "Licenciatura en Relaciones Públicas", "Licenciatura en Sociología", "Licenciatura en Trabajo Social"] },
];
const CARRERAS_FLAT = FACULTADES.flatMap((f) => f.carreras.map((c) => ({ facultad: f.nombre, carrera: c })));

const MATERIAS = [
  { id: "filosofia", nombre: "Filosofía", glifo: "Φ", sintesis: "Del asombro originario a las grandes preguntas sobre el ser, el conocer y el obrar." },
  { id: "teologia", nombre: "Teología", glifo: "✝", sintesis: "Revelación, Trinidad, Cristo y la Iglesia, a la luz de la tradición católica." },
  { id: "etica", nombre: "Ética", glifo: "⚖", sintesis: "Fundamentos del obrar humano: fin último, virtudes, ley natural y conciencia." },
  { id: "etica-profesional", nombre: "Ética Profesional", glifo: "§", sintesis: "La vida profesional como vocación de servicio, según el campo de cada carrera." },
  { id: "seminario", nombre: "Seminario Filosófico-Teológico", glifo: "☩", sintesis: "Integración de un problema límite entre filosofía y teología." },
];

/* defaults genéricos para crear cátedras nuevas desde el panel */
const BASE = {
  filosofia: { fundamentacion: "Iniciación al saber filosófico como fundamento de la formación humanística.", objetivos: ["Comprender la naturaleza del saber filosófico.", "Recorrer metafísica, gnoseología y antropología.", "Leer y argumentar textos filosóficos."], unidades: [{ titulo: "Unidad I — ¿Qué es la filosofía?", contenidos: ["El asombro.", "Filosofía y otros saberes."] }, { titulo: "Unidad II — El conocimiento", contenidos: ["Sentidos e intelecto.", "Verdad y certeza."] }], obligatoria: ["Aristóteles, Metafísica.", "J. Pieper, Defensa de la Filosofía."], complementaria: ["É. Gilson, El ser y los filósofos."] },
  teologia: { fundamentacion: "El acto de fe y su contenido a la luz de la tradición católica.", objetivos: ["Distinguir fe y razón.", "Conocer el núcleo de la Revelación."], unidades: [{ titulo: "Unidad I — Fe y Revelación", contenidos: ["Dei Verbum.", "Escritura y Tradición."] }, { titulo: "Unidad II — Dios Uno y Trino", contenidos: ["Creación y Trinidad."] }], obligatoria: ["Catecismo de la Iglesia Católica (selección)."], complementaria: ["J. Ratzinger, Introducción al cristianismo."] },
  etica: { fundamentacion: "Fundamentos del obrar humano: fin último, virtudes, ley y conciencia.", objetivos: ["Fundamentar la dimensión moral del obrar.", "Analizar el acto humano."], unidades: [{ titulo: "Unidad I — Fin último y felicidad", contenidos: ["Bien y fin.", "Eudaimonía y bienaventuranza."] }, { titulo: "Unidad II — El acto humano", contenidos: ["Objeto, fin y circunstancias."] }], obligatoria: ["Aristóteles, Ética a Nicómaco.", "A. Royo Marín, Teología Moral para seglares, t. I."], complementaria: ["J. Pieper, Las virtudes fundamentales."] },
  "etica-profesional": { fundamentacion: "La vida profesional como vocación de servicio al bien común.", objetivos: ["Aplicar la ética al ejercicio profesional.", "Reconocer deberes y dilemas del rol."], unidades: [{ titulo: "Unidad I — Trabajo y vocación", contenidos: ["Sentido del trabajo.", "Profesión como servicio."] }, { titulo: "Unidad II — Deontología", contenidos: ["Códigos, secreto, conflictos de interés."] }], obligatoria: ["Compendio de la Doctrina Social de la Iglesia."], complementaria: ["A. Cortina, Ética de la empresa."] },
  seminario: { fundamentacion: "Integración de un problema límite entre filosofía y teología.", objetivos: ["Integrar filosofía, ética y teología.", "Lectura analítica de fuentes."], unidades: [{ titulo: "Unidad I — Razón y fe", contenidos: ["Fides et ratio."] }, { titulo: "Unidad II — Persona y dignidad", contenidos: ["Antropología filosófica y teológica."] }], obligatoria: ["Juan Pablo II, Fides et ratio."], complementaria: ["C. S. Lewis, El problema del dolor."] },
};

/* ====== PROGRAMAS REALES (Fran · Veterinaria) ====== */
const FILOSOFIA_VET = {
  id: "filo-vet-real", materiaId: "filosofia", carrera: "Veterinaria",
  docenteNombre: "Mg. Francisco Fernández Ruiz", docenteEmail: "franciscojose.f@usal.edu.ar",
  comision: "Sede Pilar · 1° año · 2026",
  fundamentacion: "La Filosofía constituye el saber radical y arquitectónico al que está naturalmente orientado el hombre en cuanto ser racional. En una carrera como Veterinaria, donde la práctica se inserta en la relación entre el hombre, la naturaleza y la vida animal, la Filosofía aporta los fundamentos teóricos y antropológicos para comprender el sentido último de la actividad técnico-científica. Una iniciación filosófica seria provee herramientas para pensar con rigor (distinguir el ser del parecer, lo verdadero de lo falso), y sitúa el saber técnico dentro de una cosmovisión coherente, en el marco de la identidad de la Universidad Católica (prioridad de lo ético sobre lo técnico y de la persona sobre las cosas).",
  objetivos: [
    "Que el alumno conozca el origen, naturaleza, método y división de la Filosofía como saber fundante de la formación humanística universitaria.",
    "Que el alumno adquiera las herramientas básicas de la Lógica para razonar con rectitud, definir con precisión, construir argumentos válidos y reconocer las principales falacias.",
    "Que el alumno se familiarice con las grandes posturas filosóficas (clásica, moderna y contemporánea) e identifique las diferencias entre el realismo y el inmanentismo, y sus consecuencias antropológicas y prácticas.",
    "Que el alumno desarrolle capacidad crítica para sopesar las propuestas filosóficas y aplicar sus principios al horizonte de las ciencias veterinarias y de la relación del hombre con la naturaleza viva.",
  ],
  unidades: [
    { titulo: "UNIDAD I — La Filosofía", contenidos: [
      "Etimología y noción de Filosofía: amor a la sabiduría.",
      "El origen histórico: del mito al logos.",
      "El asombro, la duda y la pregunta filosófica.",
      "Objeto material y objeto formal de la Filosofía.",
      "División: especulativa (metafísica, filosofía de la naturaleza, antropología) y práctica (ética, política, estética).",
      "Las preguntas fundamentales: el ser, el conocer, el obrar.",
      "Filosofía, ciencias particulares y sabiduría. La filosofía como saber arquitectónico.",
      "Relación entre Filosofía y Veterinaria: el hombre, el animal y la vida como objeto filosófico.",
      "El método filosófico: experiencia, abstracción y demostración.",
    ] },
    { titulo: "UNIDAD II — Lógica", contenidos: [
      "Noción de Lógica. Lógica formal y material. La lógica como instrumento de las ciencias.",
      "El concepto: comprensión y extensión. Universal, particular y singular.",
      "La definición: reglas y vicios. La división lógica.",
      "La proposición: sujeto, cópula, predicado. Cantidad y cualidad. Categóricas A, E, I, O.",
      "Cuadro de oposición: contrarias, subcontrarias, contradictorias, subalternas.",
      "Conversión, obversión y contraposición.",
      "El razonamiento: deductivo, inductivo y analógico.",
      "El silogismo categórico: estructura, figuras, modos y reglas. Validez y verdad.",
      "Falacias formales e informales: ad hominem, ad verecundiam, ad populum, ad baculum, petitio principii, falsa causa, generalización apresurada, falsa analogía, hombre de paja.",
    ] },
    { titulo: "UNIDAD III — Grandes posturas filosóficas", contenidos: [
      "Clásica: presocráticos (arjé), Sócrates (mayéutica), Platón (teoría de las ideas), Aristóteles (hilemorfismo, acto y potencia, cuatro causas), Santo Tomás (esencia/existencia, cinco vías).",
      "Moderna: el giro al sujeto; Descartes y el racionalismo (duda metódica, cogito); empirismo (Locke, Berkeley, Hume); Kant y el criticismo; Hegel y el idealismo.",
      "Contemporánea: positivismo (Comte); filosofías de la sospecha (Marx, Nietzsche, Freud); fenomenología (Husserl); existencialismo (Kierkegaard, Heidegger, Sartre, Marcel); renovación del realismo (Maritain, Gilson, Fabro).",
      "Realismo vs. Inmanentismo: el conocimiento como adecuación del intelecto a la cosa vs. como construcción del sujeto. Consecuencias antropológicas y éticas, y aplicación a la concepción del hombre, la naturaleza y la vida animal.",
    ] },
  ],
  obligatoria: [
    "Aristóteles, Metafísica, Libro I (cap. 1-2), Gredos, Madrid.",
    "Maritain, J., Introducción a la Filosofía, Club de Lectores, Bs. As.",
    "Casas, M. G., Introducción a la Filosofía, Gredos, Madrid, 1963.",
    "Pieper, J., Defensa de la Filosofía, Herder, Barcelona.",
    "Aristóteles, Tratados de Lógica (Órganon), Gredos, Madrid.",
    "Alvira, T., Lógica, EUNSA, Pamplona.",
    "Maritain, J., El orden de los conceptos. Lógica menor, Club de Lectores, Bs. As.",
    "Copi, I. M., Introducción a la lógica, Eudeba, Bs. As.",
    "Reale, G. y Antiseri, D., Historia del Pensamiento Filosófico y Científico, T. I-III, Herder, 1988.",
    "Gilson, É., El realismo metódico, Rialp, Madrid.",
    "Gilson, É., La filosofía de Santo Tomás de Aquino, Desclée de Brouwer, Bs. As.",
    "Fabro, C., Introducción al ateísmo moderno, Rialp, Madrid (selección).",
    "Maritain, J., Tres reformadores: Lutero, Descartes, Rousseau, Club de Lectores, Bs. As.",
  ],
  complementaria: [
    "Aristóteles, Acerca del alma, Gredos, 1994.", "Aristóteles, Ética a Nicómaco, Gredos.",
    "Bochenski, I. M., Historia de la lógica formal, Gredos.",
    "Copleston, F., Historia de la Filosofía, Ariel (tomos selectos).",
    "Cortina, A., Ética mínima, Tecnos, 2014.",
    "Fabro, C., Percepción y pensamiento, EUNSA.",
    "Gilson, É., El ser y los filósofos, EUNSA.", "Gilson, É., La unidad de la experiencia filosófica, Rialp.",
    "González Álvarez, Á., Manual de Historia de la Filosofía, Gredos, 1964.",
    "Guardini, R., El ocaso de la Edad Moderna, Guadarrama, 1958.", "Guardini, R., Mundo y persona, Madrid, 1963.",
    "Hessen, J., Teoría del conocimiento, Losada.",
    "Jaeger, W., Aristóteles, FCE, 2001.", "Jaeger, W., Paideia, FCE, 2001.",
    "Mondolfo, R., El pensamiento antiguo, Eudeba, 1996.",
    "Platón, La República, Gredos.", "Platón, Diálogos (Apología, Fedón, Menón), Gredos.",
    "Quiles, I. (s.j.), Aristóteles, Depalma, 1969.",
    "Sellés, J. F., Antropología para inconformes, Rialp, 2006.",
    "Tomás de Aquino, Suma Teológica (selecciones), BAC.", "Tomás de Aquino, Sobre el ente y la esencia, Sarpe.",
  ],
  documentos: [
    { nombre: "Programa_Filosofia_Veterinaria_2026.pdf", estado: "indexado" },
  ],
};

const ETICA_VET = {
  id: "etica-vet-real", materiaId: "etica-profesional", carrera: "Veterinaria",
  docenteNombre: "Mg. Francisco Fernández Ruiz", docenteEmail: "franciscojose.f@usal.edu.ar",
  comision: "Sede Pilar · 3° año — “Ética y Deontología”",
  fundamentacion: "La Ética académica integra un pilar fundamental del conocimiento humano: el que proviene de la natural diferenciación entre el bien y el mal en los actos humanos y su proyección en la vida histórica de las personas. Hablar de persona, libertad, responsabilidad y bien común mientras se analizan comparativamente diversas teorías éticas aporta a los estudiantes formación integral, útil para el desempeño de su futura profesión, en el marco de la identidad de la Universidad Católica (prioridad de lo ético sobre lo técnico y de la persona sobre las cosas).",
  objetivos: [
    "Que el alumno conozca los antecedentes filosóficos de la Ética como parte de la formación humanística integral.",
    "Que a través del estudio de la Ética se profundicen las nociones de Antropología Cristiana (persona, sus facultades y su circunstancia histórica) como patrones de análisis y de valor frente a textos y autores diversos.",
    "Que el alumno desarrolle capacidad crítica frente a diversas propuestas éticas, sopesando el interjuego entre libertad, inteligencia y voluntad, bien y mal, y la fuente y finalidad de la vida humana.",
  ],
  unidades: [
    { titulo: "UNIDAD I — Fundamentos de la Ética Profesional: la ética como ciencia práctica", contenidos: ["La ética: ciencia práctica y prudencial.", "La persona humana como sujeto de la actividad profesional.", "Trabajo, profesión y vocación.", "La dimensión social y comunitaria del ejercicio profesional."] },
    { titulo: "UNIDAD II — La Ética de las Virtudes Profesionales", contenidos: ["La teoría ética de las virtudes.", "Virtudes cardinales en el ejercicio profesional.", "Virtudes profesionales específicas."] },
    { titulo: "UNIDAD III — Las Profesiones como Prácticas Sociales", contenidos: ["MacIntyre y el concepto de práctica social.", "Bienes internos y externos de las profesiones.", "La profesión como servicio al bien común."] },
    { titulo: "UNIDAD IV — La Prudencia Profesional", contenidos: ["La prudencia como virtud rectora de la vida práctica.", "Elementos de la prudencia: consejo, juicio y comando.", "La prudencia profesional y la toma de decisiones éticas.", "Casos prácticos de discernimiento por disciplina.", "La formación de la conciencia profesional."] },
    { titulo: "UNIDAD V — Las Virtudes Cardinales en el Ejercicio Profesional", contenidos: ["Justicia profesional: suum cuique, especies, virtudes anejas y vicios.", "Fortaleza profesional: apetito irascible, actos principales, virtudes anexas y vicios.", "Templanza profesional: moderación de los apetitos concupiscibles, áreas de aplicación, virtudes y vicios."] },
    { titulo: "UNIDAD VI — Desafíos Éticos Contemporáneos", contenidos: ["Globalización y ética profesional.", "Tecnología, inteligencia artificial y profesiones.", "Responsabilidad social corporativa.", "Ética ambiental y sostenibilidad.", "Corrupción y transparencia.", "La dimensión política de las profesiones."] },
    { titulo: "UNIDAD VII — Doctrina Social y Ejercicio Profesional", contenidos: ["Dignidad de la persona humana.", "Bien común y subsidiariedad.", "Solidaridad en el ejercicio profesional.", "Destino universal de los bienes.", "La profesión como colaboración en la obra creadora."] },
  ],
  obligatoria: [],
  complementaria: [
    "Agustín de Hipona, Confesiones, Colihue, 2006, libro X.", "Agustín de Hipona, La ciudad de Dios, Club de Lectores, 2007.",
    "Aristóteles, Acerca del Alma, Gredos, 1994, Libros II-III.",
    "Cortina, A., Ética Mínima, Tecnos, 2014.",
    "Fizzotti, E., El despertar ético: conciencia y responsabilidad, Fund. V. Frankl, 1998.",
    "Gilson, É., La metamorfosis de la ciudad de Dios, Troquel, 1954.",
    "González Álvarez, Á., Manual de Historia de la Filosofía, Gredos, 1964.",
    "Guardini, R., La conversión de San Agustín, Ágape, 2007.", "Guardini, R., El ocaso de la edad moderna, Guadarrama, 1958.", "Guardini, R., Mundo y persona, Madrid, 1963.",
    "Jaeger, W., Paideia, FCE, 2001.", "Jaeger, W., Aristóteles, FCE, 2001.",
    "Kierkegaard, S., El concepto de la angustia, Espasa-Calpe, 1979.",
    "León XIII, Enc. Rerum Novarum.",
    "Milano, J. J. F., La vocación humana del hombre, Lumen, 2020.",
    "Mondolfo, R., El pensamiento antiguo, Eudeba, 1996.",
    "Nietzsche, F., La Genealogía de la Moral, Madrid, 1927.",
    "Reale, G. y Antiseri, D., Historia del Pensamiento Filosófico y Científico, T. 1-2, Herder, 1988.",
    "Ricoeur, P., Aristóteles: la decisión, Trotta, 2005.",
    "Sellés, J. F., Antropología para inconformes, Rialp, 2006, cap. 1.",
    "Zupancic, A., Ética de lo real, Prometeo, 2010.",
  ],
  documentos: [
    { nombre: "Programa_Etica_Veterinaria_2026.pdf", estado: "indexado" },
  ],
};

function generica(materiaId, docenteNombre, docenteEmail, comision, carrera = null) {
  const b = BASE[materiaId];
  return {
    id: `${materiaId}-${Math.random().toString(36).slice(2, 7)}`, materiaId, carrera, docenteNombre, docenteEmail, comision,
    fundamentacion: b.fundamentacion, objetivos: [...b.objetivos],
    unidades: b.unidades.map((u) => ({ titulo: u.titulo, contenidos: [...u.contenidos] })),
    obligatoria: [...b.obligatoria], complementaria: [...b.complementaria],
    documentos: [{ nombre: "Programa oficial 2026.pdf", estado: "indexado" }],
  };
}

const NIVELES_IA = [
  { v: 0, t: "Nivel 0 · Sin IA" },
  { v: 1, t: "Nivel 1 · IA de apoyo al estudio" },
  { v: 2, t: "Nivel 2 · IA como asistente (declarada)" },
  { v: 3, t: "Nivel 3 · IA integrada (con análisis crítico)" },
];
const ACTIVIDADES_SEED = [
  {
    id: "act-1", catedraId: "filo-vet-real", titulo: "TP 1 · La pregunta filosófica en la práctica veterinaria",
    tipo: "Trabajo práctico", fechaEntrega: "2026-06-26", nivelIA: 2,
    consigna: "A partir de la Unidad I, elaborá un texto breve (600-800 palabras) que responda: ¿qué aporta la pregunta por el *sentido último* a la práctica veterinaria? Incluí al menos dos conceptos del programa (objeto material/formal, división de la filosofía) y un ejemplo de tu propia experiencia o del campo profesional.\n\n**Entrega:** PDF por esta plataforma. **Uso de IA (Nivel 2):** podés usarla para ordenar ideas o pulir redacción, declarándolo al final del trabajo.",
  },
];

const CATEDRAS_SEED = [
  FILOSOFIA_VET,
  ETICA_VET,
  generica("teologia", "Pbro. Lic. Andrés Costa", "a.costa@usal.edu.ar", "Comisión A · Tarde"),
  generica("etica", "Dra. Lucía Ferreyra", "l.ferreyra@usal.edu.ar", "Comisión A · Mañana"),
  generica("seminario", "Dra. María Elena Vidal", "me.vidal@usal.edu.ar", "Comisión A · Tarde"),
];

const ROLES = [
  { id: "estudiante", t: "Estudiante" }, { id: "docente", t: "Docente" }, { id: "autoridad", t: "Autoridad" },
];
const USAL_LOGO = "https://www.usal.edu.ar/wp-content/uploads/2024/08/logoUSAL_verde-e1722984298295.png";
const USAL_LOGO_BLANCO = "https://www.usal.edu.ar/wp-content/uploads/2023/07/Logo-Blanco.png";

/* ----------------------------- ESTILOS ----------------------------------- */
const CSS = `
.su-root{--verde:#008357;--verde-osc:#08473b;--verde-mas-osc:#01481b;--crema:#f6f1e6;--crema-claro:#fbf8f0;--tinta:#1c2a23;--oro:#b58a2e;--gris:#6c7a72;--linea:rgba(8,71,59,.14);--rojo:#a3322c;
  font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:var(--tinta);background:radial-gradient(1200px 600px at 85% -10%,rgba(0,131,87,.10),transparent 60%),radial-gradient(900px 500px at -10% 110%,rgba(181,138,46,.10),transparent 55%),var(--crema);min-height:100vh;position:relative;overflow-x:hidden;}
.su-root *{box-sizing:border-box;}
.su-disp{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;}.su-mono{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;letter-spacing:.02em;}
@keyframes su-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}.su-rise{animation:su-rise .6s cubic-bezier(.2,.7,.2,1) both;}
.su-login{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:linear-gradient(150deg,var(--verde) 0%,var(--verde-osc) 55%,var(--verde-mas-osc) 100%);position:relative;}
.su-login::before{content:"";position:absolute;inset:0;opacity:.5;background:radial-gradient(700px 350px at 80% 10%,rgba(181,138,46,.22),transparent 60%),radial-gradient(600px 400px at 10% 90%,rgba(255,255,255,.08),transparent 55%);}
.su-login-inner{position:relative;z-index:1;width:100%;max-width:430px;text-align:center;}
.su-logo{height:84px;margin:0 auto 26px;display:block;filter:drop-shadow(0 8px 20px rgba(0,0,0,.25));}
.su-logo-fallback{width:70px;height:70px;border-radius:50%;margin:0 auto 22px;display:grid;place-items:center;background:rgba(255,255,255,.16);color:#fff;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:34px;border:1px solid rgba(255,255,255,.3);}
.su-cardlogo{width:180px;max-width:100%;height:auto;display:block;margin:4px auto 18px;}
.su-cardlogo-fb{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-weight:600;font-size:26px;color:var(--verde);margin-bottom:14px;letter-spacing:.04em;}
.su-brandlogo{height:30px;display:block;flex:0 0 auto;}
.su-brandfb{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#fff;font-weight:600;font-size:16px;}
.su-asidemotto{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-style:italic;font-size:11px;color:rgba(255,255,255,.55);text-align:center;margin-top:12px;letter-spacing:.02em;line-height:1.3;}
.su-login-card{background:var(--crema-claro);border-radius:20px;padding:34px 30px;box-shadow:0 40px 90px -45px rgba(0,0,0,.6);text-align:left;}
.su-login-title{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-weight:500;font-size:25px;line-height:1.1;margin:0;}
.su-login-sub{color:var(--gris);font-size:14px;margin-top:6px;line-height:1.5;}
.su-gbtn{display:flex;align-items:center;justify-content:center;gap:11px;width:100%;padding:13px;border-radius:12px;border:1px solid var(--linea);background:#fff;cursor:pointer;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;color:var(--tinta);transition:.15s;}
.su-gbtn:hover{border-color:var(--verde);box-shadow:0 6px 18px -10px rgba(0,131,87,.5);}.su-gbtn:disabled{opacity:.5;cursor:not-allowed;}
.su-glogo{width:18px;height:18px;flex:0 0 auto;}
.su-foot{color:rgba(255,255,255,.85);font-size:11.5px;margin-top:22px;letter-spacing:.04em;}
.su-seg{display:flex;gap:6px;background:#fff;border:1px solid var(--linea);border-radius:12px;padding:5px;margin-top:6px;}
.su-seg button{flex:1;border:none;background:transparent;cursor:pointer;padding:8px 4px;border-radius:8px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:var(--gris);transition:.15s;line-height:1.2;}
.su-seg button.on{background:var(--verde);color:#fff;}
.su-center{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:28px;}
.su-card{width:100%;max-width:760px;background:var(--crema-claro);border:1px solid var(--linea);border-radius:18px;box-shadow:0 30px 70px -40px rgba(8,71,59,.55);padding:36px 32px;}
.su-eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--verde);font-weight:600;}
.su-h1{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-weight:500;font-size:28px;line-height:1.08;margin:6px 0 2px;}
.su-sub{color:var(--gris);font-size:15px;line-height:1.5;}
.su-label{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--gris);font-weight:600;}
.su-field{display:block;width:100%;margin-top:6px;padding:12px 14px;font-size:15px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#fff;border:1px solid var(--linea);border-radius:11px;color:var(--tinta);}
.su-field:focus{outline:none;border-color:var(--verde);box-shadow:0 0 0 3px rgba(0,131,87,.14);}
textarea.su-field{resize:vertical;min-height:90px;line-height:1.5;}
.su-btn{appearance:none;border:none;cursor:pointer;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;font-weight:500;padding:12px 20px;border-radius:11px;background:var(--verde);color:#fff;transition:.18s;display:inline-flex;align-items:center;justify-content:center;gap:8px;}
.su-btn:hover{background:var(--verde-osc);}.su-btn:disabled{opacity:.45;cursor:not-allowed;}
.su-btn.full{width:100%;}.su-btn.sm{padding:9px 15px;font-size:14px;}
.su-btn.ghost{background:transparent;color:var(--verde);border:1px solid var(--linea);}.su-btn.ghost:hover{background:rgba(0,131,87,.06);}
.su-pick{display:block;width:100%;text-align:left;cursor:pointer;background:#fff;border:1px solid var(--linea);border-radius:12px;padding:13px 15px;margin-top:9px;transition:.15s;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;color:var(--tinta);}
.su-pick:hover{border-color:var(--verde);transform:translateX(3px);}.su-pick.on{border-color:var(--verde);background:rgba(0,131,87,.07);box-shadow:0 0 0 3px rgba(0,131,87,.10);}
.su-pick small{display:block;color:var(--gris);font-size:12.5px;margin-top:2px;}
.su-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}@media(max-width:620px){.su-grid2{grid-template-columns:1fr;}}
.su-scroll{max-height:330px;overflow:auto;padding-right:6px;margin-top:4px;}.su-scroll::-webkit-scrollbar{width:8px;}.su-scroll::-webkit-scrollbar-thumb{background:rgba(8,71,59,.22);border-radius:8px;}
.su-steps{display:flex;gap:6px;margin:16px 0;}.su-step{flex:1;height:4px;border-radius:4px;background:var(--linea);}.su-step.on{background:var(--verde);}
.su-glifo{width:42px;height:42px;border-radius:11px;display:grid;place-items:center;flex:0 0 auto;background:linear-gradient(160deg,rgba(0,131,87,.14),rgba(181,138,46,.14));color:var(--verde-osc);font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:22px;}
.su-shell{display:flex;min-height:100vh;}
.su-aside{width:264px;background:linear-gradient(180deg,var(--verde),var(--verde-osc));color:#eaf3ef;padding:22px 18px;display:flex;flex-direction:column;gap:6px;position:fixed;top:0;left:0;height:100vh;z-index:20;overflow-y:auto;transition:width .22s ease;}
@media(max-width:860px){.su-aside{display:none;}.su-main,.su-main.collapsed{margin-left:0;}}
.su-brand{display:flex;align-items:center;gap:11px;margin-bottom:16px;}.su-brandlogo{height:34px;}
.su-brand b{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-weight:500;font-size:17px;color:#fff;line-height:1.05;display:block;}.su-brand span{font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.7);}
.su-nav{display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:11px;cursor:pointer;color:rgba(255,255,255,.82);transition:.15s;font-size:15px;border:1px solid transparent;}
.su-nav:hover{background:rgba(255,255,255,.08);color:#fff;}.su-nav.on{background:rgba(255,255,255,.16);color:#fff;border-color:rgba(255,255,255,.18);}.su-nav .ic{width:20px;text-align:center;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;}
.su-asidecard{margin-top:auto;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.16);border-radius:13px;padding:13px;}
.su-asidecard .lbl{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.65);}.su-asidecard .v{font-size:14px;color:#fff;margin-top:2px;line-height:1.3;}
.su-main{flex:1;min-width:0;display:flex;flex-direction:column;margin-left:264px;transition:margin-left .22s ease;}
.su-main.collapsed{margin-left:72px;}
.su-top{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 26px;border-bottom:1px solid var(--linea);background:rgba(251,248,240,.8);backdrop-filter:blur(6px);position:sticky;top:0;z-index:5;}
.su-top h2{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-weight:500;font-size:21px;margin:0;}.su-top .crumb{font-size:12px;color:var(--gris);}
.su-userchip{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--gris);}
.su-userchip .av{width:30px;height:30px;border-radius:50%;background:var(--verde);color:#fff;display:grid;place-items:center;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:14px;}
.su-rolepill{font-size:10px;letter-spacing:.1em;text-transform:uppercase;background:rgba(0,131,87,.12);color:var(--verde);padding:3px 9px;border-radius:20px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;}
.su-content{padding:26px;flex:1;}
.su-chatwrap{max-width:820px;margin:0 auto;display:flex;flex-direction:column;height:calc(100vh - 150px);}
.su-msgs{flex:1;overflow:auto;display:flex;flex-direction:column;gap:16px;padding:6px 2px 18px;}.su-msgs::-webkit-scrollbar{width:8px;}.su-msgs::-webkit-scrollbar-thumb{background:rgba(8,71,59,.2);border-radius:8px;}
.su-bubble{max-width:80%;padding:13px 16px;border-radius:15px;font-size:15px;line-height:1.55;}
.su-bubble.user{align-self:flex-end;background:var(--verde);color:#fff;border-bottom-right-radius:5px;white-space:pre-wrap;}
.su-bubble.bot{align-self:flex-start;background:#fff;border:1px solid var(--linea);border-bottom-left-radius:5px;}.su-bubble.bot b{color:var(--verde-osc);}
.su-empty{text-align:center;color:var(--gris);margin:auto;max-width:480px;}
.su-crest{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(160deg,var(--verde),var(--verde-osc));color:#fff;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:24px;margin:0 auto 14px;}
.su-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:16px;}
.su-chip{font-size:13px;padding:8px 13px;border-radius:20px;border:1px solid var(--linea);background:#fff;cursor:pointer;color:var(--verde-osc);transition:.15s;}.su-chip:hover{border-color:var(--verde);background:rgba(0,131,87,.06);}
.su-composer{display:flex;gap:10px;align-items:flex-end;border-top:1px solid var(--linea);padding-top:14px;}
.su-composer textarea{flex:1;resize:none;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;padding:12px 14px;border:1px solid var(--linea);border-radius:13px;background:#fff;max-height:140px;color:var(--tinta);}
.su-composer textarea:focus{outline:none;border-color:var(--verde);box-shadow:0 0 0 3px rgba(0,131,87,.14);}
.su-send{flex:0 0 auto;width:46px;height:46px;border-radius:13px;border:none;background:var(--verde);color:#fff;cursor:pointer;font-size:18px;}.su-send:disabled{opacity:.4;cursor:not-allowed;}
.su-dots span{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--verde);margin:0 2px;animation:su-blink 1.2s infinite both;}.su-dots span:nth-child(2){animation-delay:.2s;}.su-dots span:nth-child(3){animation-delay:.4s;}@keyframes su-blink{0%,80%,100%{opacity:.25}40%{opacity:1}}
.su-page{max-width:860px;margin:0 auto;}
.su-section{background:var(--crema-claro);border:1px solid var(--linea);border-radius:15px;padding:22px 24px;margin-bottom:16px;}
.su-section h3{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-weight:500;font-size:18px;margin:0 0 12px;color:var(--verde-osc);}
.su-fund{font-size:14.5px;line-height:1.6;color:#33433b;}
.su-unit{padding:14px 0;border-bottom:1px solid var(--linea);}.su-unit:last-child{border-bottom:none;}
.su-unit b{font-size:15px;color:var(--verde-osc);font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-weight:500;}
.su-bul{display:flex;gap:9px;padding:5px 0 0 4px;font-size:14px;line-height:1.5;color:#33433b;}.su-bul .mk{color:var(--oro);flex:0 0 auto;}
.su-li{display:flex;gap:10px;padding:7px 0;font-size:14.5px;line-height:1.5;}.su-li .mk{color:var(--oro);flex:0 0 auto;}
.su-tag{display:inline-block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--verde);background:rgba(0,131,87,.10);padding:3px 9px;border-radius:20px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin-bottom:10px;}
.su-tag.car{color:var(--oro);background:rgba(181,138,46,.12);}
.su-planout{font-size:14.5px;line-height:1.6;}
.su-mdp{margin:0 0 9px;line-height:1.6;}
.su-mdp:last-child{margin-bottom:0;}
.su-mdh{font-weight:600;color:var(--verde-osc);line-height:1.3;margin:13px 0 6px;}
.su-mdh1{font-size:18px;}
.su-mdh2{font-size:16px;}
.su-mdh3{font-size:15px;}
.su-mdul{margin:4px 0 10px;padding-left:20px;}
.su-mdul li{margin:3px 0;line-height:1.55;}
.su-mdli{margin:3px 0;line-height:1.55;}
.su-mdq{border-left:3px solid var(--oro);padding:5px 0 5px 13px;margin:8px 0;color:#33433b;font-style:italic;background:rgba(8,71,59,.04);border-radius:0 6px 6px 0;}
.su-code{background:rgba(8,71,59,.09);padding:1px 6px;border-radius:5px;font-size:.92em;}
.su-badge{font-size:11px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;padding:3px 9px;border-radius:20px;display:inline-flex;align-items:center;gap:5px;}
.su-badge.ok{background:rgba(0,131,87,.12);color:var(--verde);}.su-badge.proc{background:rgba(181,138,46,.16);color:var(--oro);}
.su-doc{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:#fff;border:1px solid var(--linea);border-radius:10px;margin-top:8px;font-size:14px;}
.su-doc .nm{display:flex;align-items:center;gap:9px;min-width:0;}.su-doc .nm span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.su-upload{border:1.5px dashed var(--linea);border-radius:12px;padding:18px;text-align:center;color:var(--gris);font-size:14px;margin-top:10px;cursor:pointer;transition:.15s;background:rgba(255,255,255,.5);}
.su-upload:hover{border-color:var(--verde);color:var(--verde-osc);background:rgba(0,131,87,.04);}
.su-table{width:100%;border-collapse:collapse;font-size:13.5px;}
.su-table th{text-align:left;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--gris);font-weight:600;padding:9px 10px;border-bottom:1px solid var(--linea);}
.su-table td{padding:11px 10px;border-bottom:1px solid var(--linea);vertical-align:middle;}.su-table tr:last-child td{border-bottom:none;}
.su-statgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;}@media(max-width:680px){.su-statgrid{grid-template-columns:1fr 1fr;}}
.su-stat{background:var(--crema-claro);border:1px solid var(--linea);border-radius:13px;padding:16px 18px;}.su-stat .n{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:30px;color:var(--verde-osc);line-height:1;}.su-stat .l{font-size:12px;color:var(--gris);margin-top:6px;}
.su-catcard{background:var(--crema-claro);border:1px solid var(--linea);border-radius:14px;padding:18px 20px;margin-bottom:12px;}
.su-catcard .hd{display:flex;align-items:center;justify-content:space-between;gap:12px;}.su-catcard .mt{font-size:12.5px;color:var(--gris);margin-top:3px;}
.su-divider{height:1px;background:var(--linea);margin:14px 0;}
.su-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}.su-mini{font-size:12px;color:var(--gris);}.su-x{cursor:pointer;color:var(--rojo);font-size:13px;background:none;border:none;}
.su-roleswitch{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:12.5px;border:1px solid var(--linea);border-radius:9px;padding:7px 8px;background:#fff;color:var(--verde-osc);cursor:pointer;}
.su-roleswitch:focus{outline:none;border-color:var(--verde);}
.su-mobnav{display:none;}
@media(max-width:860px){.su-mobnav{display:flex;gap:6px;overflow-x:auto;padding:10px 16px;border-bottom:1px solid var(--linea);background:rgba(251,248,240,.9);}
.su-mobnav button{flex:0 0 auto;border:1px solid var(--linea);background:#fff;border-radius:20px;padding:7px 13px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:var(--gris);cursor:pointer;white-space:nowrap;}
.su-mobnav button.on{background:var(--verde);color:#fff;border-color:var(--verde);}
.su-content{padding:18px 16px;}}
.su-cov{display:grid;gap:13px;}
.su-covrow{display:grid;grid-template-columns:230px 1fr auto;gap:14px;align-items:center;}
.su-covrow b{font-size:15px;font-weight:500;}
@media(max-width:640px){.su-covrow{grid-template-columns:1fr;gap:5px;}}
.su-bar{height:9px;border-radius:9px;background:rgba(8,71,59,.10);overflow:hidden;}
.su-bar > i{display:block;height:100%;background:linear-gradient(90deg,var(--verde),var(--oro));border-radius:9px;transition:width .6s cubic-bezier(.2,.7,.2,1);}
.su-fuentes{margin-top:10px;padding-top:9px;border-top:1px dashed var(--linea);display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
.su-fuentes-lbl{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--gris);font-weight:600;margin-right:2px;}
.su-fuente{font-size:11.5px;background:rgba(0,131,87,.08);color:var(--verde-osc);border:1px solid rgba(0,131,87,.15);border-radius:20px;padding:3px 10px;}
.su-actcard{padding:18px 20px;}
.su-acthead{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;cursor:pointer;}
.su-actchevron{color:var(--gris);font-size:15px;flex:0 0 auto;margin-top:4px;}
.su-acttags{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.su-iachip{font-size:11px;background:rgba(201,162,39,.13);color:#8a6d1c;border:1px solid rgba(201,162,39,.3);border-radius:20px;padding:2px 9px;font-weight:600;}
.su-due{font-size:12.5px;font-weight:600;border-radius:20px;padding:3px 10px;display:inline-block;margin-top:4px;}
.su-due.ok{background:rgba(0,131,87,.09);color:var(--verde-osc);}
.su-due.today{background:rgba(201,162,39,.16);color:#7a5f12;}
.su-due.late{background:rgba(176,32,32,.10);color:var(--rojo);}
.su-actbody{margin-top:6px;font-size:14.5px;line-height:1.6;}
.su-actrow{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid var(--linea);}
.su-actrow:last-child{border-bottom:none;}
.su-actrow b{display:block;color:var(--verde-osc);margin:3px 0;}
.su-actform{margin-top:6px;}
.su-temas{display:flex;flex-direction:column;gap:10px;margin-top:6px;max-height:260px;overflow-y:auto;border:1px solid var(--linea);border-radius:12px;padding:12px;background:#fff;}
.su-temaud-tit{font-size:12.5px;font-weight:700;color:var(--verde-osc);display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;}
.su-temaud-all{border:none;background:rgba(0,131,87,.08);color:var(--verde);font-size:10.5px;font-weight:600;border-radius:14px;padding:2px 9px;cursor:pointer;}
.su-tema{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--tinta);padding:4px 6px;border-radius:8px;cursor:pointer;line-height:1.4;}
.su-tema:hover{background:rgba(0,131,87,.04);}
.su-tema.on{background:rgba(0,131,87,.08);}
.su-tema input{margin-top:3px;flex:0 0 auto;accent-color:var(--verde);}
.su-temachip{font-size:10.5px;background:rgba(0,131,87,.07);color:var(--verde-osc);border:1px solid rgba(0,131,87,.14);border-radius:14px;padding:1px 8px;margin:2px 4px 0 0;display:inline-block;}
.su-asidetop{display:flex;align-items:center;gap:11px;margin-bottom:14px;}
.su-asidetop .su-brand{margin-bottom:0;}
.su-toggle{flex:0 0 auto;width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.10);color:#fff;cursor:pointer;font-size:16px;line-height:1;display:grid;place-items:center;transition:.15s;}
.su-toggle:hover{background:rgba(255,255,255,.20);}
.su-navlbl{white-space:nowrap;overflow:hidden;}
.su-aside.collapsed{width:72px;padding-left:12px;padding-right:12px;align-items:center;}
.su-aside.collapsed .su-asidetop{flex-direction:column;gap:12px;margin-bottom:16px;}
.su-aside.collapsed .su-brandtext,.su-aside.collapsed .su-navlbl,.su-aside.collapsed .su-asidecard,.su-aside.collapsed .su-asidemotto{display:none;}
.su-aside.collapsed .su-nav{justify-content:center;padding:11px 0;}
`;

/* --------------------------- MODELO IA ---------------------------------- */
async function callClaude(messages, system, catedraId) {
  // En producción llama a nuestra Pages Function /api/chat (RAG + OpenRouter).
  // Las claves viven como secret en Cloudflare, nunca en el front.
  const res = await fetch("/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ catedraId, system, messages }),
  });
  if (!res.ok) throw new Error("API error " + res.status);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return { text: data.text || "", fuentes: data.fuentes || [] };
}
function systemPrompt(cat, materia, facultad, carrera) {
  const prog = cat.unidades.map((u) => `${u.titulo}\n  - ${u.contenidos.join("\n  - ")}`).join("\n");
  const bib = [...cat.obligatoria, ...cat.complementaria].map((b) => `• ${b}`).join("\n");
  const docs = cat.documentos.filter((d) => d.estado === "indexado").map((d) => `• ${d.nombre}`).join("\n") || "(sin documentos indexados)";
  return `Sos el asistente de estudio de la cátedra de "${materia.nombre}" a cargo de ${cat.docenteNombre} (${cat.comision}) en la Universidad del Salvador. El estudiante cursa "${carrera}" en la ${facultad}.

FUNDAMENTACIÓN:
${cat.fundamentacion}

PROGRAMA (unidades y contenidos de ESTA cátedra):
${prog}

BIBLIOGRAFÍA DE ESTA CÁTEDRA:
${bib}

MATERIAL INDEXADO (fuente RAG):
${docs}

REGLAS:
- Respondé ÚNICAMENTE desde la fundamentación, el programa, la bibliografía y el material indexado de ESTA cátedra. Es tu única fuente.
- No uses material de otras cátedras ni conocimiento externo no respaldado por este programa.
- Si preguntan algo fuera de la materia, redirigí con amabilidad hacia el programa.
- Citá la unidad y/o la obra cuando corresponda.
- Relacioná con la carrera del estudiante (${carrera}) cuando ayude (este programa lo prevé explícitamente).
- Español rioplatense, claro y con rigor. Usá **negritas** en términos clave.`;
}
function inline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <b key={i}>{p.slice(2, -2)}</b>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="su-code">{p.slice(1, -1)}</code>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <i key={i}>{p.slice(1, -1)}</i>;
    return <span key={i}>{p}</span>;
  });
}
function MD({ text }) {
  const lines = String(text || "").split("\n");
  const out = []; let bullets = null;
  const flush = () => { if (bullets) { out.push(<ul key={"u" + out.length} className="su-mdul">{bullets}</ul>); bullets = null; } };
  lines.forEach((raw, idx) => {
    const t = raw.trim();
    if (!t) { flush(); return; }
    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flush(); const lvl = Math.min(h[1].length, 3); out.push(<div key={idx} className={"su-mdh su-mdh" + lvl}>{inline(h[2])}</div>); return; }
    if (/^>\s?/.test(t)) { flush(); out.push(<div key={idx} className="su-mdq">{inline(t.replace(/^>\s?/, ""))}</div>); return; }
    const b = t.match(/^[-*•]\s+(.*)$/);
    if (b) { if (!bullets) bullets = []; bullets.push(<li key={idx}>{inline(b[1])}</li>); return; }
    const n = t.match(/^(\d+)\.\s+(.*)$/);
    if (n) { flush(); out.push(<div key={idx} className="su-mdli"><b>{n[1]}.</b> {inline(n[2])}</div>); return; }
    flush(); out.push(<p key={idx} className="su-mdp">{inline(t)}</p>);
  });
  flush();
  return <>{out}</>;
}

/* ============================== APP ===================================== */
// --- Routing por hash + persistencia de sesión (demo) ---
const LS_KEY = "studium_sesion_v1";
function leerHash() {
  const h = (window.location.hash || "").replace(/^#\/?/, "");
  return h.split("/").filter(Boolean); // ej: ["docente","actividades"]
}
function escribirHash(ruta) {
  const nueva = "#/" + ruta.replace(/^\/+/, "");
  if (window.location.hash !== nueva) window.location.hash = nueva;
}

export default function StudiumUSAL() {
  const guardada = (() => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; } })();
  const [stage, setStage] = useState(guardada?.stage || "login");
  const [session, setSession] = useState(guardada?.session || null);
  const [catedras, setCatedras] = useState(CATEDRAS_SEED);
  const [ctx, setCtx] = useState(guardada?.ctx || null);
  const [chats, setChats] = useState({}); // conversaciones por cátedra: { [catedraId]: msgs[] }
  const [actividades, setActividades] = useState(ACTIVIDADES_SEED);
  useEffect(() => { if (!document.getElementById("su-style")) { const s = document.createElement("style"); s.id = "su-style"; s.textContent = CSS; document.head.appendChild(s); } }, []);
  // Persisto sesión/vista para sobrevivir al refresco
  useEffect(() => {
    try {
      if (session) localStorage.setItem(LS_KEY, JSON.stringify({ stage, session, ctx }));
      else localStorage.removeItem(LS_KEY);
    } catch {}
  }, [stage, session, ctx]);
  const logout = () => { setSession(null); setCtx(null); setChats({}); setStage("login"); try { localStorage.removeItem(LS_KEY); } catch {} escribirHash("login"); };
  const switchRole = (role) => {
    setSession((s) => ({ ...s, role }));
    setStage(role === "estudiante" ? (ctx ? "app" : "onboarding") : "panel");
  };
  return (
    <div className="su-root">
      {stage === "login" && <Login onDone={(s) => { setSession(s); setStage(s.role === "estudiante" ? "onboarding" : "panel"); }} />}
      {stage === "onboarding" && <Onboarding catedras={catedras} onDone={(c) => { setCtx(c); setStage("app"); }} onBack={ctx ? () => setStage("app") : logout} />}
      {stage === "app" && ctx && <AppShell session={session} ctx={ctx} chats={chats} setChats={setChats} actividades={actividades} onChange={() => setStage("onboarding")} onLogout={logout} onSwitchRole={switchRole} />}
      {stage === "panel" && <Panel session={session} catedras={catedras} setCatedras={setCatedras} actividades={actividades} setActividades={setActividades} onLogout={logout} onSwitchRole={switchRole} />}
    </div>
  );
}

/* ------------------------------ LOGIN ----------------------------------- */
function Login({ onDone }) {
  const [email, setEmail] = useState(""); const [role, setRole] = useState("estudiante"); const [err, setErr] = useState(""); const [logoOk, setLogoOk] = useState(true);
  const ok = /^[^\s@]+@usal\.edu\.ar$/i.test(email.trim());
  const submit = () => { if (!ok) { setErr("Usá tu cuenta institucional @usal.edu.ar"); return; } onDone({ email: email.trim().toLowerCase(), role }); };
  return (
    <div className="su-login">
      <div className="su-login-inner su-rise">
        <div className="su-login-card">
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            {logoOk ? <img className="su-cardlogo" src={USAL_LOGO} alt="Universidad del Salvador" onError={() => setLogoOk(false)} /> : <div className="su-cardlogo-fb">USAL</div>}
            <div className="su-eyebrow">Studium · Vicerrectorado de Formación</div>
            <h1 className="su-login-title" style={{ marginTop: 4 }}>Iniciá sesión</h1>
            <p className="su-login-sub" style={{ margin: "6px auto 0", maxWidth: 330 }}>Filosofía · Teología · Ética · Ética Profesional · Seminario Filosófico-Teológico</p>
          </div>
          <div>
            <label className="su-label">Cuenta institucional</label>
            <input className="su-field" type="email" placeholder="nombre.apellido@usal.edu.ar" value={email}
              onChange={(e) => { setEmail(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} />
            {err && <div style={{ color: "var(--rojo)", fontSize: 13, marginTop: 7 }}>{err}</div>}
          </div>
          <div style={{ marginTop: 16 }}>
            <label className="su-label">Ingresar como <span className="su-mini">(en producción se detecta solo)</span></label>
            <div className="su-seg">{ROLES.map((r) => <button key={r.id} className={role === r.id ? "on" : ""} onClick={() => setRole(r.id)}>{r.t}</button>)}</div>
          </div>
          <button className="su-gbtn" style={{ marginTop: 18 }} onClick={submit} disabled={!ok}>
            <svg className="su-glogo" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.9 6.1C12.2 13.3 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.7-.4-3.9H24v7.4h12.7c-.3 2-1.6 5-4.7 7l7.3 5.6c4.3-4 6.8-9.9 6.8-16.1z"/><path fill="#FBBC05" d="M10.4 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.6c-2 1.4-4.7 2.3-8.6 2.3-6.4 0-11.8-3.8-13.6-9.3l-7.9 6.1C6.4 42.6 14.6 48 24 48z"/></svg>
            Continuar con Google
          </button>
        </div>
        <p className="su-foot"><span style={{ opacity: .75 }}>Universidad del Salvador</span> · <i className="su-disp">Scientiam do menti, cordi virtutem</i></p>
      </div>
    </div>
  );
}

/* --------------------------- ONBOARDING --------------------------------- */
function Onboarding({ catedras, onDone, onBack }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState(null), [c, setC] = useState(null), [m, setM] = useState(null), [cat, setCat] = useState(null);
  const cats = m ? catedras.filter((x) => x.materiaId === m.id && (!x.carrera || x.carrera === c)) : [];
  return (
    <div className="su-center">
      <div className="su-card su-rise">
        <div className="su-eyebrow">Studium · USAL</div>
        <h1 className="su-h1">{step === 1 && "¿En qué Facultad estudiás?"}{step === 2 && "Elegí tu carrera"}{step === 3 && "¿Qué materia vas a estudiar?"}{step === 4 && "Elegí tu cátedra"}</h1>
        <p className="su-sub">{step === 1 && "Esto contextualiza las respuestas del asistente según tu campo."}{step === 2 && f?.nombre}{step === 3 && `${c} · ${f?.nombre}`}{step === 4 && `${m?.nombre} — cada cátedra trabaja con el programa y la bibliografía de su docente.`}</p>
        <div className="su-steps">{[1, 2, 3, 4].map((n) => <div key={n} className={`su-step ${step >= n ? "on" : ""}`} />)}</div>
        <div className="su-scroll">
          {step === 1 && FACULTADES.map((fa) => <button key={fa.nombre} className={`su-pick ${f?.nombre === fa.nombre ? "on" : ""}`} onClick={() => { setF(fa); setC(null); setStep(2); }}>{fa.nombre}<small>{fa.carreras.length} carreras</small></button>)}
          {step === 2 && f && <div className="su-grid2">{f.carreras.map((ca) => <button key={ca} className={`su-pick ${c === ca ? "on" : ""}`} onClick={() => { setC(ca); setStep(3); }}>{ca}</button>)}</div>}
          {step === 3 && MATERIAS.map((ma) => <button key={ma.id} className={`su-pick ${m?.id === ma.id ? "on" : ""}`} onClick={() => { setM(ma); setCat(null); setStep(4); }} style={{ display: "flex", alignItems: "center", gap: 14 }}><span className="su-glifo">{ma.glifo}</span><span>{ma.nombre}<small>{ma.sintesis}</small></span></button>)}
          {step === 4 && (cats.length ? cats.map((x) => <button key={x.id} className={`su-pick ${cat?.id === x.id ? "on" : ""}`} onClick={() => setCat(x)}>{x.docenteNombre}<small>{x.comision}{x.carrera ? ` · ${x.carrera}` : " · General"} · {x.documentos.filter((d) => d.estado === "indexado").length} docs indexados</small></button>) : <p className="su-sub" style={{ marginTop: 12 }}>Esta materia todavía no tiene cátedras para tu carrera.</p>)}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="su-btn ghost sm" onClick={() => (step > 1 ? setStep(step - 1) : onBack())}>← {step > 1 ? "Atrás" : "Salir"}</button>
          {step === 4 && <button className="su-btn full" disabled={!cat} onClick={() => onDone({ facultad: f.nombre, carrera: c, materia: m, catedra: cat })}>Entrar a la cátedra →</button>}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- APP (estudiante) --------------------------- */
function AppShell({ session, ctx, chats, setChats, actividades, onChange, onLogout, onSwitchRole }) {
  const { facultad, carrera, materia, catedra } = ctx;
  const tabsValidos = ["asistente", "actividades", "programa", "biblio", "autoeval", "plan"];
  const hashTab = (() => { const p = leerHash(); return p[0] === "catedra" && p[1] === catedra.id && tabsValidos.includes(p[2]) ? p[2] : null; })();
  const [tab, setTabRaw] = useState(hashTab || "asistente");
  const setTab = (t) => { setTabRaw(t); escribirHash(`catedra/${catedra.id}/${t}`); };
  useEffect(() => { escribirHash(`catedra/${catedra.id}/${tab}`); }, [catedra.id]);
  const [collapsed, setCollapsed] = useState(false);
  const nActs = (actividades || []).filter((a) => a.catedraId === catedra.id).length;
  const tabs = [{ id: "asistente", ic: "✺", t: "Asistente" }, { id: "actividades", ic: "✉", t: nActs ? `Actividades (${nActs})` : "Actividades" }, { id: "programa", ic: "❧", t: "Programa" }, { id: "biblio", ic: "❦", t: "Bibliografía" }, { id: "autoeval", ic: "✎", t: "Autoevaluación" }, { id: "plan", ic: "◷", t: "Planificador" }];
  const titulo = { asistente: "Asistente de estudio", actividades: "Actividades", programa: "Programa de la cátedra", biblio: "Bibliografía", autoeval: "Autoevaluación", plan: "Planificador" }[tab];
  const msgs = chats[catedra.id] || [];
  const setMsgs = (next) => setChats((prev) => ({ ...prev, [catedra.id]: typeof next === "function" ? next(prev[catedra.id] || []) : next }));
  return (
    <div className="su-shell">
      <aside className={`su-aside ${collapsed ? "collapsed" : ""}`}>
        <div className="su-asidetop"><button className="su-toggle" onClick={() => setCollapsed((c) => !c)} aria-label="Contraer menú">☰</button><Brand sub="Estudiante" /></div>
        {tabs.map((x) => <div key={x.id} className={`su-nav ${tab === x.id ? "on" : ""}`} onClick={() => setTab(x.id)}><span className="ic">{x.ic}</span><span className="su-navlbl">{x.t}</span></div>)}
        <div className="su-asidecard">
          <div className="lbl">Cátedra</div><div className="v">{materia.glifo} {materia.nombre}</div>
          <div className="v" style={{ fontSize: 12.5, opacity: .85 }}>{catedra.docenteNombre} · {catedra.comision}</div>
          <button className="su-btn ghost sm" style={{ width: "100%", marginTop: 12, color: "#fff", borderColor: "rgba(255,255,255,.25)" }} onClick={onChange}>Cambiar cátedra</button>
        </div>
        <div className="su-asidemotto">Scientiam do menti,<br />cordi virtutem</div>
      </aside>
      <div className={`su-main ${collapsed ? "collapsed" : ""}`}>
        <Top crumb={`${facultad} · ${carrera}`} titulo={titulo} session={session} onLogout={onLogout} onSwitchRole={onSwitchRole} />
        <div className="su-mobnav">{tabs.map((x) => <button key={x.id} className={tab === x.id ? "on" : ""} onClick={() => setTab(x.id)}>{x.t}</button>)}</div>
        <div className="su-content">
          {tab === "asistente" && <Asistente ctx={ctx} msgs={msgs} setMsgs={setMsgs} />}
          {tab === "actividades" && <ActividadesAlumno actividades={actividades} catedra={catedra} />}
          {tab === "programa" && <Programa cat={catedra} materia={materia} />}
          {tab === "biblio" && <Bibliografia cat={catedra} />}
          {tab === "autoeval" && <Autoevaluacion cat={catedra} materia={materia} carrera={carrera} />}
          {tab === "plan" && <Planificador cat={catedra} materia={materia} carrera={carrera} />}
        </div>
      </div>
    </div>
  );
}
function Brand({ sub }) {
  const [ok, setOk] = useState(true);
  return <div className="su-brand">
    {ok ? <img className="su-brandlogo" src={USAL_LOGO} alt="USAL" onError={() => setOk(false)} /> : <span className="su-brandfb">USAL</span>}
    <div className="su-brandtext"><b>Studium</b><span>USAL · {sub}</span></div>
  </div>;
}
function Top({ crumb, titulo, session, onLogout, onSwitchRole }) {
  return <div className="su-top"><div><div className="crumb">{crumb}</div><h2>{titulo}</h2></div>
    <div className="su-userchip">
      {onSwitchRole && (
        <select className="su-roleswitch" value={session.role} onChange={(e) => onSwitchRole(e.target.value)} title="Cambiar de vista (demo)">
          <option value="estudiante">Vista: Estudiante</option>
          <option value="docente">Vista: Docente</option>
          <option value="autoridad">Vista: Autoridad</option>
        </select>
      )}
      <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.email}</span><div className="av">{session.email.slice(0, 1).toUpperCase()}</div><button className="su-btn ghost sm" onClick={onLogout}>Salir</button></div></div>;
}

function Asistente({ ctx, msgs, setMsgs }) {
  const { materia, facultad, carrera, catedra } = ctx;
  const [input, setInput] = useState(""); const [loading, setLoading] = useState(false);
  const endRef = useRef(null); const sys = systemPrompt(catedra, materia, facultad, carrera);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);
  const u1 = catedra.unidades[0]?.titulo.replace(/^UNIDAD\s+[IVX]+\s+—\s+/i, "") || "la primera unidad";
  const sugerencias = [`Explicame el eje de ${u1}`, "Resumime los objetivos de la materia", "¿Qué leo primero de la bibliografía?", `¿Cómo se vincula esto con ${carrera}?`];
  const send = async (texto) => {
    const content = (texto ?? input).trim(); if (!content || loading) return;
    const next = [...msgs, { role: "user", content }]; setMsgs(next); setInput(""); setLoading(true);
    try { const r = await callClaude(next.map(({ role, content }) => ({ role, content })), sys, catedra.id); setMsgs([...next, { role: "assistant", content: r.text || "Sin respuesta.", fuentes: r.fuentes }]); }
    catch { setMsgs([...next, { role: "assistant", content: "Error al conectar con el asistente. Probá de nuevo." }]); } finally { setLoading(false); }
  };
  return (
    <div className="su-chatwrap">
      <div className="su-msgs">
        {msgs.length === 0 && (
          <div className="su-empty su-rise">
            <div className="su-crest">{materia.glifo}</div>
            <div className="su-disp" style={{ fontSize: 22, color: "var(--verde-osc)" }}>{materia.nombre}</div>
            <p className="su-sub" style={{ marginTop: 4 }}>Cátedra {catedra.docenteNombre} · {catedra.comision}</p>
            <p style={{ fontSize: 13, color: "var(--gris)", marginTop: 10 }}>Respondo solo desde el programa y la bibliografía de esta cátedra.</p>
            <div className="su-chips">{sugerencias.map((s) => <span key={s} className="su-chip" onClick={() => send(s)}>{s}</span>)}</div>
          </div>
        )}
        {msgs.map((m, i) => <div key={i} className={`su-bubble ${m.role === "user" ? "user" : "bot"} su-rise`}>{m.role === "assistant" ? <><MD text={m.content} />{m.fuentes && m.fuentes.length > 0 && <div className="su-fuentes"><span className="su-fuentes-lbl">Fuentes</span>{m.fuentes.map((f, k) => <span key={k} className="su-fuente">{f.titulo}{f.pagina ? ` · pág. ${f.pagina}` : ""}</span>)}</div>}</> : m.content}</div>)}
        {loading && <div className="su-bubble bot"><span className="su-dots"><span /><span /><span /></span></div>}
        <div ref={endRef} />
      </div>
      <div className="su-composer">
        <textarea rows={1} value={input} placeholder={`Preguntá sobre ${materia.nombre}…`} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button className="su-send" onClick={() => send()} disabled={loading || !input.trim()}>→</button>
      </div>
    </div>
  );
}

function Autoevaluacion({ cat, materia, carrera }) {
  const [tipo, setTipo] = useState("Preguntas a desarrollar");
  const [unidad, setUnidad] = useState("todas");
  const [cantidad, setCantidad] = useState("5");
  const [out, setOut] = useState(""); const [loading, setLoading] = useState(false);
  const generar = async () => {
    if (loading) return; setLoading(true); setOut("");
    const uds = cat.unidades.map((u) => `${u.titulo}\n  - ${u.contenidos.join("\n  - ")}`).join("\n");
    const foco = unidad === "todas" ? "todas las unidades del programa" : `la "${unidad}"`;
    const sys = `Sos un generador de autoevaluaciones de la USAL para la cátedra de ${materia.nombre} (${cat.docenteNombre}, carrera ${carrera}). Generás preguntas ÚNICAMENTE sobre el programa dado. Modalidades válidas (las de la cátedra): preguntas a desarrollar, opción múltiple y análisis de casos. Para opción múltiple, incluí 4 opciones (a-d) y al final indicá la correcta. Para desarrollar y casos, agregá una breve "clave de respuesta" con los puntos esperados. Markdown claro, numerado.\n\nPROGRAMA:\n${uds}`;
    const prompt = `Generá ${cantidad} preguntas de tipo "${tipo}" sobre ${foco}. Si es "Análisis de casos", ambientá los casos en el campo de ${carrera}.`;
    try { const r = await callClaude([{ role: "user", content: prompt }], sys); setOut(r.text); } catch { setOut("Error al generar. Probá de nuevo."); } finally { setLoading(false); }
  };
  return (
    <div className="su-page su-rise">
      <div className="su-section"><span className="su-tag">Práctica</span><h3>Autoevaluación según el programa</h3>
        <p style={{ color: "var(--gris)", fontSize: 14.5, marginTop: -4, marginBottom: 14 }}>Generá preguntas tipo parcial a partir de las unidades de tu cátedra, en las modalidades que usa el/la docente.</p>
        <div className="su-grid2">
          <div><label className="su-label">Modalidad</label><select className="su-field" value={tipo} onChange={(e) => setTipo(e.target.value)}><option>Preguntas a desarrollar</option><option>Opción múltiple</option><option>Análisis de casos</option></select></div>
          <div><label className="su-label">Cantidad</label><select className="su-field" value={cantidad} onChange={(e) => setCantidad(e.target.value)}><option>3</option><option>5</option><option>8</option></select></div>
        </div>
        <div style={{ marginTop: 10 }}><label className="su-label">Unidad</label><select className="su-field" value={unidad} onChange={(e) => setUnidad(e.target.value)}><option value="todas">Todas las unidades</option>{cat.unidades.map((u) => <option key={u.titulo} value={u.titulo}>{u.titulo}</option>)}</select></div>
        <button className="su-btn full" style={{ marginTop: 16 }} onClick={generar} disabled={loading}>{loading ? "Generando preguntas…" : "Generar autoevaluación"}</button>
      </div>
      {out && <div className="su-section su-rise"><div className="su-row" style={{ justifyContent: "space-between" }}><h3 style={{ margin: 0 }}>Tu autoevaluación</h3><button className="su-btn ghost sm" onClick={generar} disabled={loading}>↻ Otro set</button></div><div className="su-divider" /><div className="su-planout"><MD text={out} /></div></div>}
    </div>
  );
}

function Programa({ cat, materia }) {
  return (
    <div className="su-page su-rise">
      <div className="su-section">
        <span className="su-tag">Cátedra</span>{cat.carrera && <span className="su-tag car" style={{ marginLeft: 6 }}>{cat.carrera}</span>}
        <h3>{materia.glifo} {materia.nombre}</h3>
        <p className="su-mini" style={{ marginTop: -6, marginBottom: 10 }}>{cat.docenteNombre} · {cat.comision}</p>
        <p className="su-fund">{cat.fundamentacion}</p>
      </div>
      <div className="su-section"><h3>Objetivos</h3>{cat.objetivos.map((o, i) => <div className="su-li" key={i}><span className="mk">◆</span><span>{o}</span></div>)}</div>
      <div className="su-section"><h3>Unidades y contenidos</h3>{cat.unidades.map((u, i) => (
        <div className="su-unit" key={i}><b>{u.titulo}</b>{u.contenidos.map((c, j) => <div className="su-bul" key={j}><span className="mk">·</span><span>{c}</span></div>)}</div>
      ))}</div>
    </div>
  );
}
function Bibliografia({ cat }) {
  return (
    <div className="su-page su-rise">
      {cat.obligatoria.length > 0 && <div className="su-section"><span className="su-tag">Obligatoria / Básica</span><h3>Bibliografía obligatoria</h3>{cat.obligatoria.map((b, i) => <div className="su-li" key={i}><span className="mk">❦</span><span>{b}</span></div>)}</div>}
      <div className="su-section"><span className="su-tag">Complementaria</span><h3>Bibliografía complementaria</h3>{cat.complementaria.map((b, i) => <div className="su-li" key={i}><span className="mk">❧</span><span>{b}</span></div>)}</div>
      <div className="su-section"><span className="su-tag">RAG</span><h3>Material indexado de la cátedra</h3>{cat.documentos.map((d, i) => (
        <div className="su-doc" key={i}><div className="nm"><span>❦</span><span>{d.nombre}</span></div><span className={`su-badge ${d.estado === "indexado" ? "ok" : "proc"}`}>{d.estado === "indexado" ? "● indexado" : "○ procesando"}</span></div>
      ))}</div>
    </div>
  );
}
function Planificador({ cat, materia, carrera }) {
  const [fecha, setFecha] = useState(""); const [horas, setHoras] = useState("3"); const [out, setOut] = useState(""); const [loading, setLoading] = useState(false);
  const generar = async () => {
    if (loading) return; setLoading(true); setOut("");
    const prog = cat.unidades.map((u) => `${u.titulo}: ${u.contenidos.slice(0, 4).join("; ")}`).join("\n");
    const sys = `Sos un planificador de estudio de la USAL. Generás cronogramas realistas basados ÚNICAMENTE en el programa dado. Markdown con "## Semana N" y viñetas. Concreto y breve.`;
    const prompt = `Materia: ${materia.nombre} (cátedra ${cat.docenteNombre}, carrera ${carrera}).\nPrograma:\n${prog}\n\nExamen: ${fecha || "sin definir"}. Disponibilidad: ${horas} h/semana.\nArmá un plan semana por semana que cubra todas las unidades y deje una semana de repaso. Indicá unidad, qué leer y objetivo de la semana.`;
    try { const r = await callClaude([{ role: "user", content: prompt }], sys); setOut(r.text); } catch { setOut("Error al generar. Probá de nuevo."); } finally { setLoading(false); }
  };
  return (
    <div className="su-page su-rise">
      <div className="su-section"><span className="su-tag">Cronograma</span><h3>Armá tu plan de estudio</h3>
        <p style={{ color: "var(--gris)", fontSize: 14.5, marginTop: -4, marginBottom: 14 }}>Sobre el programa de la cátedra, el asistente arma un cronograma semanal hasta tu examen.</p>
        <div className="su-grid2">
          <div><label className="su-label">Fecha de examen</label><input className="su-field" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div><label className="su-label">Horas por semana</label><input className="su-field" type="number" min="1" max="40" value={horas} onChange={(e) => setHoras(e.target.value)} /></div>
        </div>
        <button className="su-btn full" style={{ marginTop: 16 }} onClick={generar} disabled={loading}>{loading ? "Generando…" : "Generar plan de estudio"}</button>
      </div>
      {out && <div className="su-section su-rise"><h3>Tu cronograma</h3><div className="su-planout"><MD text={out} /></div></div>}
    </div>
  );
}

/* --------------------------- ACTIVIDADES -------------------------------- */
function diasRestantes(fecha) {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const f = new Date(fecha + "T00:00:00");
  return Math.round((f - hoy) / 86400000);
}
function fmtFecha(fecha) {
  if (!fecha) return "";
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}
function EstadoEntrega({ fecha }) {
  const d = diasRestantes(fecha);
  if (d === null) return null;
  if (d < 0) return <span className="su-due late">Vencida · {fmtFecha(fecha)}</span>;
  if (d === 0) return <span className="su-due today">Entrega HOY · {fmtFecha(fecha)}</span>;
  return <span className="su-due ok">Entrega {fmtFecha(fecha)} · faltan {d} día{d === 1 ? "" : "s"}</span>;
}
function ActividadesAlumno({ actividades, catedra }) {
  const [abierta, setAbierta] = useState(null);
  const lista = (actividades || []).filter((a) => a.catedraId === catedra.id)
    .sort((a, b) => (a.fechaEntrega || "").localeCompare(b.fechaEntrega || ""));
  return (
    <div className="su-page su-rise">
      {lista.length === 0 && (
        <div className="su-section" style={{ textAlign: "center", color: "var(--gris)" }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>✉</div>
          Tu docente todavía no publicó actividades para esta cátedra.
        </div>
      )}
      {lista.map((a) => (
        <div key={a.id} className="su-section su-actcard">
          <div className="su-acthead" onClick={() => setAbierta(abierta === a.id ? null : a.id)}>
            <div>
              <div className="su-acttags"><span className="su-tag">{a.tipo}</span><span className="su-iachip">{NIVELES_IA.find((n) => n.v === a.nivelIA)?.t || "IA: a definir"}</span></div>
              <h3 style={{ margin: "6px 0 4px" }}>{a.titulo}</h3>
              <EstadoEntrega fecha={a.fechaEntrega} />
              {a.temas && a.temas.length > 0 && <div style={{ marginTop: 6 }}>{a.temas.map((t) => <span key={t} className="su-temachip">{t}</span>)}</div>}
            </div>
            <span className="su-actchevron">{abierta === a.id ? "▴" : "▾"}</span>
          </div>
          {abierta === a.id && (
            <div className="su-actbody">
              <div className="su-divider" />
              <MD text={a.consigna} />
              <button className="su-btn full" style={{ marginTop: 14 }} onClick={() => alert("La entrega de trabajos se habilita en la próxima etapa (requiere autenticación institucional).")}>Entregar trabajo</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
function ActividadesDocente({ catedras, actividades, setActividades }) {
  const [creando, setCreando] = useState(false);
  const [catId, setCatId] = useState(catedras[0]?.id || "");
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("Trabajo práctico");
  const [fecha, setFecha] = useState("");
  const [nivelIA, setNivelIA] = useState(2);
  const [consigna, setConsigna] = useState("");
  const [temasSel, setTemasSel] = useState([]);
  const [genLoading, setGenLoading] = useState(false);
  const [casoLoading, setCasoLoading] = useState(false);
  const idsMias = new Set(catedras.map((c) => c.id));
  const lista = (actividades || []).filter((a) => idsMias.has(a.catedraId))
    .sort((a, b) => (a.fechaEntrega || "").localeCompare(b.fechaEntrega || ""));
  const catDe = (id) => catedras.find((c) => c.id === id);
  const generarConsigna = async () => {
    const cat = catDe(catId); if (!cat || genLoading) return;
    setGenLoading(true);
    const m = MATERIAS.find((x) => x.id === cat.materiaId);
    const uds = cat.unidades.map((u) => `${u.titulo}\n  - ${u.contenidos.join("\n  - ")}`).join("\n");
    const bib = (cat.bibliografia || []).map((b) => `- ${b}`).join("\n");
    const nivel = NIVELES_IA.find((n) => n.v === Number(nivelIA))?.t || "";
    const foco = temasSel.length ? ` La actividad debe centrarse EXCLUSIVAMENTE en estos temas del programa: ${temasSel.join("; ")}.` : "";
    const sys = `Sos asistente pedagógico de la USAL para la cátedra de ${m?.nombre || ""} (${cat.docenteNombre}, ${cat.carrera || "varias carreras"}). Redactás consignas de actividades ÚNICAMENTE sobre el programa y la bibliografía dados. Escribí en español rioplatense, tono académico claro. Estructura: consigna (qué debe hacer el estudiante, con extensión sugerida), criterios de evaluación (3-4), modalidad de entrega, y una línea final sobre el uso de IA permitido según "${nivel}". Markdown, sin título general.\n\nPROGRAMA:\n${uds}\n\nBIBLIOGRAFÍA:\n${bib}`;
    const prompt = `Redactá la consigna para una actividad de tipo "${tipo}"${titulo ? ` titulada "${titulo}"` : ""}, para estudiantes de ${cat.carrera || "la carrera"}.${foco}`;
    try { const r = await callClaude([{ role: "user", content: prompt }], sys); setConsigna(r.text || ""); }
    catch { setConsigna("Error al generar la consigna. Probá de nuevo."); }
    finally { setGenLoading(false); }
  };
  const buscarCaso = async () => {
    const cat = catDe(catId); if (!cat || casoLoading || genLoading) return;
    setCasoLoading(true);
    try {
      const res = await fetch("/api/noticias");
      const data = await res.json();
      if (data.error || !data.noticias || !data.noticias.length) throw new Error(data.error || "sin noticias");
      const m = MATERIAS.find((x) => x.id === cat.materiaId);
      const uds = cat.unidades.map((u) => u.titulo).join("\n");
      const listado = data.noticias.map((n, i) => `${i + 1}. [${n.medio}] ${n.titulo}${n.resumen ? " — " + n.resumen : ""} (${n.link})`).join("\n");
      const nivel = NIVELES_IA.find((n) => n.v === Number(nivelIA))?.t || "";
      const sys = `Sos asistente pedagógico de la USAL para la cátedra de ${m?.nombre || ""} (carrera: ${cat.carrera || "varias"}). Tu tarea: elegir UNA noticia de actualidad pertinente para la materia y convertirla en un caso de análisis para trabajar en clase. Reglas estrictas: resumí la noticia EN TUS PROPIAS PALABRAS en 3-4 líneas (no copies texto del medio), nombrá el medio y al final incluí el enlace a la nota. Conectá explícitamente el caso con una o dos unidades del programa (nombralas). Después redactá la consigna de análisis: 3-4 preguntas guía, extensión sugerida, criterios de evaluación, y una línea final sobre el uso de IA según "${nivel}". Markdown, sin título general.\n\nPROGRAMA (unidades):\n${uds}`;
      const prompt = `Noticias de hoy:\n${listado}\n\nElegí la más pertinente para ${m?.nombre || "la materia"} en la carrera ${cat.carrera || ""} y armá el caso de análisis.`;
      const r = await callClaude([{ role: "user", content: prompt }], sys);
      setTipo("Análisis de caso");
      setConsigna(r.text || "");
    } catch (e) { setConsigna("No se pudieron obtener noticias en este momento. Probá de nuevo en unos minutos."); }
    finally { setCasoLoading(false); }
  };
  const publicar = () => {
    if (!catId || !titulo.trim() || !consigna.trim()) { alert("Completá cátedra, título y consigna."); return; }
    setActividades((prev) => [...prev, { id: "act-" + Date.now(), catedraId: catId, titulo: titulo.trim(), tipo, fechaEntrega: fecha, nivelIA: Number(nivelIA), consigna, temas: temasSel }]);
    setCreando(false); setTitulo(""); setFecha(""); setConsigna(""); setTemasSel([]);
  };
  const borrar = (id) => setActividades((prev) => prev.filter((a) => a.id !== id));
  return (
    <div className="su-page su-rise">
      <div className="su-section">
        <div className="su-row" style={{ justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>Actividades publicadas</h3>
          <button className="su-btn sm" onClick={() => setCreando((v) => !v)}>{creando ? "Cancelar" : "+ Nueva actividad"}</button>
        </div>
        {creando && (
          <div className="su-actform">
            <div className="su-divider" />
            <div className="su-grid2">
              <div><label className="su-label">Cátedra</label><select className="su-field" value={catId} onChange={(e) => { setCatId(e.target.value); setTemasSel([]); }}>{catedras.map((c) => { const m = MATERIAS.find((x) => x.id === c.materiaId); return <option key={c.id} value={c.id}>{m?.nombre} · {c.carrera || "General"}</option>; })}</select></div>
              <div><label className="su-label">Tipo</label><select className="su-field" value={tipo} onChange={(e) => setTipo(e.target.value)}><option>Trabajo práctico</option><option>Cuestionario</option><option>Ensayo</option><option>Análisis de caso</option><option>Exposición oral</option></select></div>
            </div>
            <div style={{ marginTop: 10 }}><label className="su-label">Título</label><input className="su-field" value={titulo} placeholder="TP 2 · El silogismo en la argumentación científica" onChange={(e) => setTitulo(e.target.value)} /></div>
            <div style={{ marginTop: 10 }}>
              <label className="su-label">Temas del programa {temasSel.length > 0 && <span className="su-mini">· {temasSel.length} seleccionado{temasSel.length === 1 ? "" : "s"}</span>}</label>
              <div className="su-temas">
                {(catDe(catId)?.unidades || []).map((u) => (
                  <div key={u.titulo} className="su-temaud">
                    <div className="su-temaud-tit">{u.titulo}
                      <button type="button" className="su-temaud-all" onClick={() => { const todos = u.contenidos; const faltan = todos.some((t) => !temasSel.includes(t)); setTemasSel((prev) => faltan ? Array.from(new Set([...prev, ...todos])) : prev.filter((t) => !todos.includes(t))); }}>{u.contenidos.every((t) => temasSel.includes(t)) ? "Quitar unidad" : "Toda la unidad"}</button>
                    </div>
                    {u.contenidos.map((t) => (
                      <label key={t} className={`su-tema ${temasSel.includes(t) ? "on" : ""}`}>
                        <input type="checkbox" checked={temasSel.includes(t)} onChange={() => setTemasSel((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])} />
                        <span>{t}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              <p className="su-mini" style={{ marginTop: 6 }}>Opcional: elegí uno o varios temas para que la actividad se enfoque solo en ellos. Si no seleccionás ninguno, la IA puede usar todo el programa.</p>
            </div>
            <div className="su-grid2" style={{ marginTop: 10 }}>
              <div><label className="su-label">Fecha de entrega</label><input className="su-field" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
              <div><label className="su-label">Uso de IA permitido</label><select className="su-field" value={nivelIA} onChange={(e) => setNivelIA(e.target.value)}>{NIVELES_IA.map((n) => <option key={n.v} value={n.v}>{n.t}</option>)}</select></div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div className="su-row" style={{ justifyContent: "space-between" }}>
                <label className="su-label" style={{ margin: 0 }}>Consigna</label>
                <div className="su-row">
                  <button className="su-btn ghost sm" onClick={buscarCaso} disabled={casoLoading || genLoading}>{casoLoading ? "Buscando noticia…" : "📰 Caso de actualidad"}</button>
                  <button className="su-btn ghost sm" onClick={generarConsigna} disabled={genLoading || casoLoading}>{genLoading ? "Generando…" : "✺ Generar desde el programa"}</button>
                </div>
              </div>
              <textarea className="su-field" rows={9} value={consigna} placeholder="Escribí la consigna, o generala con IA a partir del programa y la bibliografía de la cátedra y después editala a gusto." onChange={(e) => setConsigna(e.target.value)} style={{ marginTop: 6, resize: "vertical" }} />
            </div>
            <button className="su-btn full" style={{ marginTop: 14 }} onClick={publicar}>Publicar actividad</button>
            <p className="su-mini" style={{ marginTop: 8 }}>“Generar desde el programa” redacta solo con el programa y la bibliografía de la cátedra. “Caso de actualidad” busca los titulares del día (La Nación, Infobae, Google News), elige uno pertinente, lo resume con sus palabras y lo conecta con las unidades, citando la fuente. Revisá y editá antes de publicar: el criterio académico es tuyo.</p>
          </div>
        )}
        <div className="su-divider" />
        {lista.length === 0 && <p className="su-mini">Todavía no hay actividades. Creá la primera.</p>}
        {lista.map((a) => { const c = catDe(a.catedraId); const m = c && MATERIAS.find((x) => x.id === c.materiaId);
          return (
            <div key={a.id} className="su-actrow">
              <div>
                <div className="su-acttags"><span className="su-tag">{a.tipo}</span><span className="su-mini">{m?.nombre} · {c?.carrera || "General"}</span></div>
                <b>{a.titulo}</b>
                {a.temas && a.temas.length > 0 && <div>{a.temas.slice(0, 4).map((t) => <span key={t} className="su-temachip">{t}</span>)}{a.temas.length > 4 && <span className="su-temachip">+{a.temas.length - 4}</span>}</div>}
                <div><EstadoEntrega fecha={a.fechaEntrega} /></div>
              </div>
              <button className="su-x" onClick={() => borrar(a.id)} title="Eliminar actividad">✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MODELOS_PED = [
  { id: "tradicional", t: "Clase expositiva (tradicional)", desc: "exposición ordenada del docente con ejemplos, preguntas de comprobación intercaladas y síntesis final; los estudiantes toman apuntes y participan en momentos pautados" },
  { id: "invertida", t: "Aula invertida", desc: "los estudiantes estudian el material ANTES de la clase (indicá exactamente qué leer/ver y cómo prepararlo, con consigna previa verificable); el tiempo de clase se dedica a aplicar, discutir, resolver casos y aclarar dudas, no a exponer contenido nuevo" },
  { id: "abp", t: "ABP · Aprendizaje Basado en Problemas", desc: "se parte de un problema real o verosímil del campo profesional ANTES de la teoría; organizá grupos y seguí los pasos del ABP: análisis del problema, lluvia de ideas, formulación de objetivos de aprendizaje, estudio autónomo y puesta en común; el docente actúa como tutor que guía con preguntas, no como expositor" },
  { id: "proyectos", t: "Aprendizaje Basado en Proyectos", desc: "se define un proyecto con un producto final concreto; planificá hitos por clase, roles dentro de los equipos, entregas parciales y criterios de evaluación tanto del producto como del proceso" },
  { id: "casos", t: "Estudio de casos", desc: "se presenta un caso concreto del campo profesional o de la actualidad; incluí la narración breve del caso, preguntas de análisis individuales y grupales, discusión guiada y un cierre conceptual que conecte explícitamente con la teoría del programa" },
  { id: "socratico", t: "Seminario socrático", desc: "lectura previa obligatoria de un texto de la bibliografía; la clase se organiza como diálogo con preguntas abiertas encadenadas (incluí las preguntas guía en orden), reglas de participación explícitas y el docente como moderador que repregunta sin dar respuestas cerradas" },
  { id: "gagne", t: "Gagné · 9 eventos de instrucción", desc: "estructurá la clase siguiendo EN ORDEN y NOMBRANDO los nueve eventos de Gagné: 1) captar la atención, 2) informar los objetivos, 3) recuperar saberes previos, 4) presentar el contenido, 5) guiar el aprendizaje, 6) provocar la práctica, 7) retroalimentar, 8) evaluar el desempeño, 9) favorecer la retención y transferencia; asigná minutos a cada evento" },
  { id: "colaborativo", t: "Aprendizaje colaborativo", desc: "trabajo en grupos pequeños con roles definidos e interdependencia positiva; detallá la dinámica, los tiempos, la producción conjunta esperada y la puesta en común; la evaluación contempla el aporte individual y el grupal" },
];

function PlanificadorDocente({ catedras }) {
  const [catId, setCatId] = useState(catedras[0]?.id || "");
  const [modo, setModo] = useState("materia");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [frecuencia, setFrecuencia] = useState("1");
  const [unidad, setUnidad] = useState("");
  const [clasesUnidad, setClasesUnidad] = useState("3");
  const [tema, setTema] = useState("");
  const [duracion, setDuracion] = useState("90");
  const [notas, setNotas] = useState("");
  const [modeloPed, setModeloPed] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const MODOS = [{ id: "materia", t: "Materia (cuatrimestre)" }, { id: "unidad", t: "Unidad" }, { id: "clase", t: "Clase" }];
  const cat = catedras.find((c) => c.id === catId);
  const unidades = cat?.unidades || [];
  const generar = async () => {
    if (!cat || loading) return;
    setLoading(true); setOut("");
    const m = MATERIAS.find((x) => x.id === cat.materiaId);
    const uds = cat.unidades.map((u) => `${u.titulo}\n  - ${u.contenidos.join("\n  - ")}`).join("\n");
    const bib = (cat.bibliografia || []).map((b) => `- ${b}`).join("\n");
    const sys = `Sos asistente de planificación docente de la USAL para la cátedra de ${m?.nombre || ""} (${cat.docenteNombre}, ${cat.carrera || "varias carreras"}). Planificás ÚNICAMENTE sobre el programa y la bibliografía dados. Español rioplatense, tono académico claro. Markdown prolijo con encabezados; usá listas por clase.\n\nPROGRAMA:\n${uds}\n\nBIBLIOGRAFÍA:\n${bib}`;
    const mp = MODELOS_PED.find((x) => x.id === modeloPed);
    const modeloTxt = mp && modo !== "materia" ? ` MODELO PEDAGÓGICO: la planificación debe seguir estrictamente el modelo "${mp.t}": ${mp.desc}. Si este modelo define una estructura propia de momentos, usala en lugar de la genérica.` : "";
    let prompt = "";
    if (modo === "materia") {
      prompt = `Armá la planificación cuatrimestral completa de la materia. Fecha de inicio: ${inicio ? fmtFecha(inicio) : "(a definir)"}. Fecha de finalización: ${fin ? fmtFecha(fin) : "(a definir)"}. Frecuencia: ${frecuencia} clase(s) por semana.${notas ? " Consideraciones del docente: " + notas + "." : ""} Distribuí las unidades del programa clase por clase (con fechas concretas si las hay, salteando ninguna semana salvo que se indique), reservá clases para repaso, parcial(es), recuperatorio y cierre. Para cada clase: número y fecha, unidad, tema, bibliografía sugerida. Cerrá con observaciones para el docente.`;
    } else if (modo === "unidad") {
      prompt = `Armá la planificación de la unidad "${unidad || unidades[0]?.titulo || ""}" desarrollada en ${clasesUnidad} clase(s). Para cada clase: objetivos específicos, contenidos del programa a trabajar, bibliografía puntual, actividades sugeridas (incluí al menos una con uso pedagógico de IA, indicando el nivel de uso recomendado) y forma de seguimiento o evaluación.${modeloTxt}${notas ? " Consideraciones del docente: " + notas + "." : ""}`;
    } else {
      prompt = `Armá el plan de UNA clase de ${duracion} minutos${tema ? ` sobre: "${tema}"` : " sobre un tema central"}${unidad ? ` de la unidad "${unidad}"` : ""}. Estructurá: objetivos de la clase, momentos con minutos asignados (inicio/motivación, desarrollo, cierre), recursos, actividades de los estudiantes, bibliografía y una propuesta de evaluación formativa.${modeloTxt}${notas ? " Consideraciones del docente: " + notas + "." : ""}`;
    }
    try { const r = await callClaude([{ role: "user", content: prompt }], sys); setOut(r.text || ""); }
    catch { setOut("Error al generar. Probá de nuevo."); }
    finally { setLoading(false); }
  };
  return (
    <div className="su-page su-rise">
      <div className="su-section">
        <span className="su-tag">Planificación</span>
        <h3>Planificar con IA desde el programa</h3>
        <p style={{ color: "var(--gris)", fontSize: 14.5, marginTop: -4, marginBottom: 14 }}>Elegí el alcance: la materia completa del cuatrimestre, una unidad o una clase puntual. La IA arma la propuesta solo con el programa y la bibliografía de tu cátedra; después la ajustás a tu criterio.</p>
        <div className="su-grid2">
          <div><label className="su-label">Cátedra</label><select className="su-field" value={catId} onChange={(e) => { setCatId(e.target.value); setUnidad(""); }}>{catedras.map((c) => { const mm = MATERIAS.find((x) => x.id === c.materiaId); return <option key={c.id} value={c.id}>{mm?.nombre} · {c.carrera || "General"}</option>; })}</select></div>
          <div><label className="su-label">Alcance</label><div className="su-seg">{MODOS.map((x) => <button key={x.id} className={modo === x.id ? "on" : ""} onClick={() => setModo(x.id)}>{x.t}</button>)}</div></div>
        </div>
        {modo === "materia" && (
          <div className="su-grid2" style={{ marginTop: 10 }}>
            <div><label className="su-label">Inicio del cuatrimestre</label><input className="su-field" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
            <div><label className="su-label">Fin del cuatrimestre</label><input className="su-field" type="date" value={fin} onChange={(e) => setFin(e.target.value)} /></div>
          </div>
        )}
        {modo === "materia" && (
          <div style={{ marginTop: 10 }}><label className="su-label">Clases por semana</label><select className="su-field" value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)}><option>1</option><option>2</option><option>3</option></select></div>
        )}
        {modo === "unidad" && (
          <div className="su-grid2" style={{ marginTop: 10 }}>
            <div><label className="su-label">Unidad</label><select className="su-field" value={unidad} onChange={(e) => setUnidad(e.target.value)}>{unidades.map((u) => <option key={u.titulo} value={u.titulo}>{u.titulo}</option>)}</select></div>
            <div><label className="su-label">Cantidad de clases</label><select className="su-field" value={clasesUnidad} onChange={(e) => setClasesUnidad(e.target.value)}><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></div>
          </div>
        )}
        {modo === "clase" && (
          <div className="su-grid2" style={{ marginTop: 10 }}>
            <div><label className="su-label">Unidad (opcional)</label><select className="su-field" value={unidad} onChange={(e) => setUnidad(e.target.value)}><option value="">—</option>{unidades.map((u) => <option key={u.titulo} value={u.titulo}>{u.titulo}</option>)}</select></div>
            <div><label className="su-label">Duración (minutos)</label><select className="su-field" value={duracion} onChange={(e) => setDuracion(e.target.value)}><option>60</option><option>90</option><option>120</option><option>180</option></select></div>
          </div>
        )}
        {modo === "clase" && (
          <div style={{ marginTop: 10 }}><label className="su-label">Tema de la clase</label><input className="su-field" value={tema} placeholder="Ej.: El silogismo categórico: estructura, figuras y reglas" onChange={(e) => setTema(e.target.value)} /></div>
        )}
        {modo !== "materia" && (
          <div style={{ marginTop: 10 }}><label className="su-label">Modelo pedagógico</label><select className="su-field" value={modeloPed} onChange={(e) => setModeloPed(e.target.value)}><option value="">A criterio del docente (mixto)</option>{MODELOS_PED.map((x) => <option key={x.id} value={x.id}>{x.t}</option>)}</select>
          {modeloPed && <p className="su-mini" style={{ marginTop: 6 }}>{MODELOS_PED.find((x) => x.id === modeloPed)?.desc}</p>}</div>
        )}
        <div style={{ marginTop: 10 }}><label className="su-label">Consideraciones (opcional)</label><input className="su-field" value={notas} placeholder="Feriados, parcial en semana 8, grupo numeroso, etc." onChange={(e) => setNotas(e.target.value)} /></div>
        <button className="su-btn full" style={{ marginTop: 16 }} onClick={generar} disabled={loading}>{loading ? "Generando planificación…" : "Generar planificación"}</button>
      </div>
      {out && <div className="su-section su-rise"><div className="su-row" style={{ justifyContent: "space-between" }}><h3 style={{ margin: 0 }}>Propuesta de planificación</h3><button className="su-btn ghost sm" onClick={generar} disabled={loading}>↻ Regenerar</button></div><div className="su-divider" /><div className="su-planout"><MD text={out} /></div></div>}
    </div>
  );
}

/* --------------------- PANEL (docente / autoridad) ---------------------- */
function Panel({ session, catedras, setCatedras, actividades, setActividades, onLogout, onSwitchRole }) {
  const esAutoridad = session.role === "autoridad";
  const rolSeg = esAutoridad ? "autoridad" : "docente";
  const validos = esAutoridad ? ["general", "todas", "acts", "planif"] : ["mis", "acts", "planif"];
  const hashTab = (() => { const p = leerHash(); return p[0] === rolSeg && validos.includes(p[1]) ? p[1] : null; })();
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTabRaw] = useState(hashTab || (esAutoridad ? "general" : "mis"));
  const setTab = (t) => { setTabRaw(t); escribirHash(`${rolSeg}/${t}`); };
  useEffect(() => { escribirHash(`${rolSeg}/${tab}`); }, []);
  const [editing, setEditing] = useState(null);
  const mias = catedras.filter((c) => c.docenteEmail === session.email);
  const navs = esAutoridad ? [{ id: "general", ic: "▦", t: "Panel general" }, { id: "todas", ic: "❧", t: "Cátedras" }, { id: "acts", ic: "✉", t: "Actividades" }, { id: "planif", ic: "◷", t: "Planificación" }] : [{ id: "mis", ic: "❧", t: "Mis cátedras" }, { id: "acts", ic: "✉", t: "Actividades" }, { id: "planif", ic: "◷", t: "Planificación" }];
  const titulo = { general: "Panel general", todas: "Todas las cátedras", mis: "Mis cátedras", acts: "Actividades", planif: "Planificación de cátedra" }[tab];
  return (
    <div className="su-shell">
      <aside className={`su-aside ${collapsed ? "collapsed" : ""}`}>
        <div className="su-asidetop"><button className="su-toggle" onClick={() => setCollapsed((c) => !c)} aria-label="Contraer menú">☰</button><Brand sub={esAutoridad ? "Autoridad" : "Docente"} /></div>
        {navs.map((x) => <div key={x.id} className={`su-nav ${tab === x.id ? "on" : ""}`} onClick={() => { setTab(x.id); setEditing(null); }}><span className="ic">{x.ic}</span><span className="su-navlbl">{x.t}</span></div>)}
        <div className="su-asidecard"><div className="lbl">Sesión</div><div className="v" style={{ fontSize: 12.5 }}>{session.email}</div><div className="lbl" style={{ marginTop: 8 }}>Rol</div><div className="v">{esAutoridad ? "Vicerrectorado / Secretaría" : "Docente"}</div></div>
        <div className="su-asidemotto">Scientiam do menti,<br />cordi virtutem</div>
      </aside>
      <div className={`su-main ${collapsed ? "collapsed" : ""}`}>
        <Top crumb="Vicerrectorado de Formación" titulo={editing ? "Editar cátedra" : titulo} session={session} onLogout={onLogout} onSwitchRole={onSwitchRole} />
        {navs.length > 1 && <div className="su-mobnav">{navs.map((x) => <button key={x.id} className={tab === x.id ? "on" : ""} onClick={() => { setTab(x.id); setEditing(null); }}>{x.t}</button>)}</div>}
        <div className="su-content">
          {editing ? <CatedraForm session={session} catedras={catedras} setCatedras={setCatedras} editingId={editing} onClose={() => setEditing(null)} />
            : tab === "acts" ? <ActividadesDocente catedras={esAutoridad ? catedras : mias} actividades={actividades} setActividades={setActividades} />
            : tab === "planif" ? <PlanificadorDocente catedras={esAutoridad ? catedras : mias} />
            : tab === "general" ? <PanelGeneral catedras={catedras} onNew={() => setEditing("nueva")} onEdit={setEditing} />
              : <ListaCatedras catedras={tab === "todas" ? catedras : mias} titulo={tab === "todas" ? "Cátedras de las 5 materias" : "Cátedras a tu cargo"} onNew={() => setEditing("nueva")} onEdit={setEditing} vacio={tab === "mis" ? "Todavía no tenés cátedras. Creá la primera." : ""} />}
        </div>
      </div>
    </div>
  );
}
function PanelGeneral({ catedras, onNew, onEdit }) {
  const nDocs = catedras.reduce((a, c) => a + c.documentos.length, 0);
  const nIdx = catedras.reduce((a, c) => a + c.documentos.filter((d) => d.estado === "indexado").length, 0);
  const docentes = new Set(catedras.map((c) => c.docenteEmail)).size;
  const totalCarreras = CARRERAS_FLAT.length;
  const porMateria = MATERIAS.map((m) => {
    const cs = catedras.filter((c) => c.materiaId === m.id);
    const carrs = new Set(cs.filter((c) => c.carrera).map((c) => c.carrera)).size;
    return { m, n: cs.length, carrs };
  });
  const maxN = Math.max(1, ...porMateria.map((x) => x.n));
  return (
    <div className="su-page su-rise">
      <div className="su-statgrid">
        <div className="su-stat"><div className="n">{catedras.length}</div><div className="l">Cátedras activas</div></div>
        <div className="su-stat"><div className="n">{docentes}</div><div className="l">Docentes</div></div>
        <div className="su-stat"><div className="n">{MATERIAS.length}</div><div className="l">Materias de Formación</div></div>
        <div className="su-stat"><div className="n">{nIdx}/{nDocs}</div><div className="l">Docs indexados (RAG)</div></div>
      </div>
      <div className="su-section">
        <h3>Cobertura institucional</h3>
        <p className="su-mini" style={{ marginTop: -6, marginBottom: 14 }}>El Vicerrectorado gestiona las 5 materias de Formación en las {totalCarreras} carreras de grado de la USAL · potencial total: {MATERIAS.length * totalCarreras} cátedras.</p>
        <div className="su-cov">
          {porMateria.map(({ m, n, carrs }) => (
            <div className="su-covrow" key={m.id}>
              <div><b className="su-disp" style={{ color: "var(--verde-osc)" }}>{m.glifo} {m.nombre}</b></div>
              <div className="su-bar"><i style={{ width: `${Math.max(8, (n / maxN) * 100)}%` }} /></div>
              <div className="su-mini" style={{ whiteSpace: "nowrap" }}>{n} cátedra{n === 1 ? "" : "s"} · {carrs} carrera{carrs === 1 ? "" : "s"}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="su-section">
        <div className="su-row" style={{ justifyContent: "space-between" }}><h3 style={{ margin: 0 }}>Cátedras</h3><button className="su-btn sm" onClick={onNew}>+ Nueva cátedra</button></div>
        <div className="su-divider" />
        <table className="su-table"><thead><tr><th>Materia</th><th>Docente</th><th>Carrera</th><th>RAG</th><th></th></tr></thead>
          <tbody>{catedras.map((c) => { const m = MATERIAS.find((x) => x.id === c.materiaId); const idx = c.documentos.filter((d) => d.estado === "indexado").length;
            return <tr key={c.id}><td>{m.glifo} {m.nombre}</td><td>{c.docenteNombre}</td><td className="su-mini">{c.carrera || "General"}</td><td><span className="su-badge ok">{idx} docs</span></td><td><button className="su-btn ghost sm" onClick={() => onEdit(c.id)}>Editar</button></td></tr>;
          })}</tbody></table>
      </div>
    </div>
  );
}
function ListaCatedras({ catedras, titulo, onNew, onEdit, vacio }) {
  return (
    <div className="su-page su-rise">
      <div className="su-row" style={{ justifyContent: "space-between", marginBottom: 14 }}><h3 className="su-disp" style={{ margin: 0, fontSize: 19, color: "var(--verde-osc)" }}>{titulo}</h3><button className="su-btn sm" onClick={onNew}>+ Nueva cátedra</button></div>
      {catedras.length === 0 && <div className="su-section"><p className="su-sub">{vacio}</p></div>}
      {catedras.map((c) => { const m = MATERIAS.find((x) => x.id === c.materiaId);
        return (
          <div className="su-catcard" key={c.id}>
            <div className="hd"><div><b className="su-disp" style={{ fontSize: 17 }}>{m.glifo} {m.nombre}</b><div className="mt">{c.docenteNombre} · {c.comision} · {c.carrera || "General"}</div></div><button className="su-btn ghost sm" onClick={() => onEdit(c.id)}>Abrir</button></div>
            <div className="su-divider" />
            <div className="su-row"><span className="su-badge ok">{c.documentos.filter((d) => d.estado === "indexado").length} docs indexados</span><span className="su-mini">{c.unidades.length} unidades · {c.obligatoria.length + c.complementaria.length} títulos de bibliografía</span></div>
          </div>
        );
      })}
    </div>
  );
}

function unidadesToText(unidades) {
  return unidades.map((u) => `${u.titulo}\n${u.contenidos.map((c) => `- ${c}`).join("\n")}`).join("\n\n");
}
function textToUnidades(txt) {
  const out = []; let cur = null;
  txt.split("\n").forEach((raw) => {
    const line = raw.trim(); if (!line) return;
    if (/^[-•]/.test(line)) { if (!cur) { cur = { titulo: "Unidad", contenidos: [] }; out.push(cur); } cur.contenidos.push(line.replace(/^[-•]\s*/, "")); }
    else { cur = { titulo: line, contenidos: [] }; out.push(cur); }
  });
  return out;
}

function CatedraForm({ session, catedras, setCatedras, editingId, onClose }) {
  const existing = editingId !== "nueva" ? catedras.find((c) => c.id === editingId) : null;
  const [materiaId, setMateriaId] = useState(existing?.materiaId || MATERIAS[0].id);
  const [carrera, setCarrera] = useState(existing?.carrera || "");
  const [docente, setDocente] = useState(existing?.docenteNombre || "");
  const [comision, setComision] = useState(existing?.comision || "");
  const [fund, setFund] = useState(existing?.fundamentacion || BASE[MATERIAS[0].id].fundamentacion);
  const [objetivos, setObjetivos] = useState((existing?.objetivos || BASE[MATERIAS[0].id].objetivos).join("\n"));
  const [unidades, setUnidades] = useState(unidadesToText(existing?.unidades || BASE[MATERIAS[0].id].unidades));
  const [oblig, setOblig] = useState((existing?.obligatoria || BASE[MATERIAS[0].id].obligatoria).join("\n"));
  const [compl, setCompl] = useState((existing?.complementaria || BASE[MATERIAS[0].id].complementaria).join("\n"));
  const [docs, setDocs] = useState(existing?.documentos || []);
  const fileRef = useRef(null);

  const cambiarMateria = (id) => {
    setMateriaId(id);
    if (!existing) { const b = BASE[id]; setFund(b.fundamentacion); setObjetivos(b.objetivos.join("\n")); setUnidades(unidadesToText(b.unidades)); setOblig(b.obligatoria.join("\n")); setCompl(b.complementaria.join("\n")); }
  };
  const subir = (files) => {
    const nuevos = Array.from(files || []).map((f) => ({ nombre: f.name, estado: "procesando" })); if (!nuevos.length) return;
    setDocs((d) => [...d, ...nuevos]);
    nuevos.forEach((n) => setTimeout(() => setDocs((d) => d.map((x) => x.nombre === n.nombre && x.estado === "procesando" ? { ...x, estado: "indexado" } : x)), 1600 + Math.random() * 1400));
  };
  const guardar = () => {
    const data = {
      materiaId, carrera: carrera || null, docenteNombre: docente.trim() || session.email, docenteEmail: existing?.docenteEmail || session.email,
      comision: comision.trim() || "Comisión A",
      fundamentacion: fund.trim(),
      objetivos: objetivos.split("\n").map((s) => s.trim()).filter(Boolean),
      unidades: textToUnidades(unidades),
      obligatoria: oblig.split("\n").map((s) => s.trim()).filter(Boolean),
      complementaria: compl.split("\n").map((s) => s.trim()).filter(Boolean),
      documentos: docs,
    };
    if (existing) setCatedras((cs) => cs.map((c) => c.id === existing.id ? { ...c, ...data } : c));
    else setCatedras((cs) => [...cs, { id: `${materiaId}-${Math.random().toString(36).slice(2, 7)}`, ...data }]);
    onClose();
  };
  return (
    <div className="su-page su-rise">
      <button className="su-btn ghost sm" onClick={onClose} style={{ marginBottom: 14 }}>← Volver</button>
      <div className="su-section">
        <h3>Datos de la cátedra</h3>
        <div className="su-grid2">
          <div><label className="su-label">Materia</label><select className="su-field" value={materiaId} onChange={(e) => cambiarMateria(e.target.value)} disabled={!!existing}>{MATERIAS.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
          <div><label className="su-label">Carrera</label><select className="su-field" value={carrera} onChange={(e) => setCarrera(e.target.value)}><option value="">General (todas las carreras)</option>{FACULTADES.map((f) => <optgroup key={f.nombre} label={f.nombre}>{f.carreras.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>)}</select></div>
        </div>
        <div className="su-grid2" style={{ marginTop: 10 }}>
          <div><label className="su-label">Docente a cargo</label><input className="su-field" value={docente} placeholder="Nombre del/la docente" onChange={(e) => setDocente(e.target.value)} /></div>
          <div><label className="su-label">Comisión</label><input className="su-field" value={comision} placeholder="Comisión A · Mañana" onChange={(e) => setComision(e.target.value)} /></div>
        </div>
      </div>
      <div className="su-section"><h3>Fundamentación</h3><textarea className="su-field" value={fund} onChange={(e) => setFund(e.target.value)} /></div>
      <div className="su-section">
        <h3>Programa</h3>
        <label className="su-label">Objetivos <span className="su-mini">(uno por línea)</span></label>
        <textarea className="su-field" value={objetivos} onChange={(e) => setObjetivos(e.target.value)} />
        <label className="su-label" style={{ marginTop: 12, display: "block" }}>Unidades <span className="su-mini">(título en una línea; contenidos con “- ” debajo)</span></label>
        <textarea className="su-field" style={{ minHeight: 180 }} value={unidades} onChange={(e) => setUnidades(e.target.value)} />
      </div>
      <div className="su-section">
        <h3>Bibliografía</h3>
        <label className="su-label">Obligatoria / básica <span className="su-mini">(una por línea)</span></label>
        <textarea className="su-field" value={oblig} onChange={(e) => setOblig(e.target.value)} />
        <label className="su-label" style={{ marginTop: 12, display: "block" }}>Complementaria</label>
        <textarea className="su-field" value={compl} onChange={(e) => setCompl(e.target.value)} />
      </div>
      <div className="su-section">
        <h3>Documentos para el RAG</h3>
        <p className="su-mini" style={{ marginTop: -6 }}>Subí el programa y la bibliografía (PDF/Word). Se extraen, trocean e indexan (embeddings → pgvector) para que el asistente responda solo desde este material.</p>
        {docs.map((d, i) => (
          <div className="su-doc" key={i}><div className="nm"><span>❦</span><span>{d.nombre}</span></div>
            <div className="su-row"><span className={`su-badge ${d.estado === "indexado" ? "ok" : "proc"}`}>{d.estado === "indexado" ? "● indexado" : "○ procesando…"}</span><button className="su-x" onClick={() => setDocs((arr) => arr.filter((_, j) => j !== i))}>quitar</button></div>
          </div>
        ))}
        <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={(e) => subir(e.target.files)} />
        <div className="su-upload" onClick={() => fileRef.current?.click()}>＋ Subir documentos (PDF, DOCX) — clic para elegir</div>
      </div>
      <div className="su-row" style={{ justifyContent: "flex-end", gap: 10 }}>
        <button className="su-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="su-btn" onClick={guardar} disabled={!docente.trim() && !existing}>{existing ? "Guardar cambios" : "Crear cátedra"}</button>
      </div>
    </div>
  );
}
