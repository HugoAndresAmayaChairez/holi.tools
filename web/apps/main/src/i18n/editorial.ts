import type { LanguageCode } from "@holi/configs/i18n";

type ProductCreatureName = "hummingbird" | "chameleon" | "owl" | "moth" | "lynx" | "axolotl";

export type ToolSlug = "image" | "typst" | "qr" | "metadata" | "labs";

type Detail = { title: string; body: string };
type ToolStory = {
  headline: string;
  intro: string;
  details: [Detail, Detail, Detail];
  privacy: string;
};

type EditorialCopy = {
  eyebrow: string;
  heroLine: string;
  heroIntro: string;
  localLabel: string;
  explore: string;
  landingsLabel: string;
  openTool: string;
  learnMore: string;
  back: string;
  whatItDoes: string;
  privacyTitle: string;
  privacyNote: string;
  startNow: string;
  noAccount: string;
  tools: Record<ToolSlug, ToolStory>;
};

export const toolIdentity: Record<ToolSlug, {
  name: string;
  creature: ProductCreatureName;
  color: string;
  href: string;
  category: "create" | "transform" | "inspect" | "learn";
}> = {
  image: { name: "Holi Image", creature: "chameleon", color: "#c65431", href: "https://image-holi.pages.dev", category: "transform" },
  typst: { name: "Holi Typst", creature: "owl", color: "#0284c7", href: "https://typst.holi.tools", category: "create" },
  qr: { name: "Holi QR", creature: "moth", color: "#7467e8", href: "https://qr.holi.tools", category: "create" },
  metadata: { name: "Holi Metadata", creature: "lynx", color: "#159463", href: "https://metadata.holi.tools", category: "inspect" },
  labs: { name: "Holi Labs", creature: "axolotl", color: "#087443", href: "https://labs.holi.tools", category: "learn" },
};

const en: EditorialCopy = {
  eyebrow: "Five products · one clear start",
  heroLine: "work here, not somewhere else.",
  heroIntro: "Open a file, finish the job, and leave without an account. Core workflows run in your browser; connected behavior is labeled before you use it.",
  localLabel: "Local by default",
  explore: "Explore the tools",
  landingsLabel: "Product guide",
  openTool: "Open tool",
  learnMore: "How it works",
  back: "Back to all tools",
  whatItDoes: "What it does",
  privacyTitle: "Privacy, in plain language",
  privacyNote: "Cloudflare can process connection metadata such as IP address, request time, and routing information while serving these pages.",
  startNow: "Start now",
  noAccount: "No account required",
  tools: {
    image: { headline: "Shape images without handing them over.", intro: "One local workspace for the image operations that usually get scattered across several sites.", details: [{ title: "Optimize and compare", body: "Tune quality while seeing the resulting size before download." }, { title: "Resize and crop", body: "Keep proportions or use centered presets for common formats." }, { title: "Convert and clean", body: "Export JPEG, PNG, or WebP without copying source metadata blocks." }], privacy: "Selected images, previews, and exports remain in volatile tab memory. Downloads happen only when you ask." },
    typst: { headline: "Write, preview, and export in one local workspace.", intro: "A focused Typst editor with projects, images, PDF preview, and browser or folder-backed storage.", details: [{ title: "Start immediately", body: "A browser workspace is ready even when no folder has been selected." }, { title: "See the PDF", body: "Compile locally, zoom the output, and jump toward source from the preview." }, { title: "Keep your structure", body: "Use several projects with their own documents and image folders." }], privacy: "Document contents and compilation stay on the device. A chosen folder is accessed only after explicit permission." },
    qr: { headline: "Design a QR code that still knows its job.", intro: "Create, style, verify, and export QR codes without sending their contents or selected images to Holi.", details: [{ title: "Choose the content", body: "Build common QR payloads with clear, focused inputs." }, { title: "Shape the result", body: "Adjust modules, eyes, colors, layers, logos, and visual effects." }, { title: "Verify before export", body: "Check scannability and download raster, vector, or document formats." }], privacy: "QR contents and selected images are processed locally. Exporting is an explicit browser download." },
    metadata: { headline: "See what a file says before you share it.", intro: "Inspect privacy-sensitive metadata from images, documents, audio, and video in the browser.", details: [{ title: "Reveal hidden fields", body: "Find GPS, author, timestamps, software, and document properties." }, { title: "Understand the risk", body: "Group signals by privacy impact instead of showing an undifferentiated dump." }, { title: "Keep a report", body: "Export normalized findings as JSON or CSV when you need a record." }], privacy: "Selected files are parsed locally and are not uploaded to Holi. Map links open only after an explicit action." },
    labs: { headline: "Read the decisions behind useful local-first tools.", intro: "Tutorials, field notes, experiments, and reviewed papers in one practical publication.", details: [{ title: "Tutorials", body: "Repeatable steps for building and using local-first workflows." }, { title: "Field notes and experiments", body: "Short lessons and measured work that is still being tested." }, { title: "Papers", body: "Longer, stable technical explanations that have been reviewed." }], privacy: "Reading requires no account. Search and export actions run in the browser; article pages do not receive your files." },
  },
};

const es: EditorialCopy = {
  eyebrow: "Cinco productos · un inicio claro",
  heroLine: "trabajan aquí, no lejos de ti.",
  heroIntro: "Abre un archivo, termina el trabajo y vete sin crear una cuenta. Los flujos principales corren en tu navegador y lo conectado se etiqueta antes de usarlo.",
  localLabel: "Local por defecto",
  explore: "Explorar herramientas",
  landingsLabel: "Guía del producto",
  openTool: "Abrir herramienta",
  learnMore: "Cómo funciona",
  back: "Volver a las herramientas",
  whatItDoes: "Qué hace",
  privacyTitle: "Privacidad, en lenguaje claro",
  privacyNote: "Cloudflare puede procesar metadata de conexión como dirección IP, horario de solicitud e información de enrutamiento al servir estas páginas.",
  startNow: "Empezar ahora",
  noAccount: "Sin cuenta",
  tools: {
    image: { headline: "Transforma imágenes sin entregarlas.", intro: "Un workspace local para las operaciones de imagen que normalmente están repartidas entre varios sitios.", details: [{ title: "Optimiza y compara", body: "Ajusta la calidad viendo el tamaño final antes de descargar." }, { title: "Redimensiona y recorta", body: "Conserva proporciones o usa recortes centrados para formatos comunes." }, { title: "Convierte y limpia", body: "Exporta JPEG, PNG o WebP sin copiar bloques de metadata del archivo original." }], privacy: "Las imágenes, previews y exportaciones permanecen en la memoria temporal de la pestaña. Solo se descargan cuando tú lo pides." },
    typst: { headline: "Escribe, previsualiza y exporta en un workspace local.", intro: "Un editor Typst enfocado, con proyectos, imágenes, preview PDF y almacenamiento del navegador o de una carpeta.", details: [{ title: "Empieza de inmediato", body: "Siempre hay un workspace del navegador aunque no hayas elegido una carpeta." }, { title: "Mira el PDF", body: "Compila localmente, ajusta el zoom y navega del preview hacia el código." }, { title: "Conserva tu estructura", body: "Trabaja con varios proyectos y sus propias carpetas de imágenes." }], privacy: "El contenido y la compilación permanecen en el dispositivo. Una carpeta elegida se abre solo con permiso explícito." },
    qr: { headline: "Diseña un QR que no olvide su trabajo.", intro: "Crea, diseña, verifica y exporta códigos QR sin enviar su contenido ni tus imágenes a Holi.", details: [{ title: "Elige el contenido", body: "Construye formatos QR comunes con entradas claras y enfocadas." }, { title: "Dale forma", body: "Ajusta módulos, ojos, colores, capas, logos y efectos visuales." }, { title: "Verifica y exporta", body: "Comprueba que se escanee y descarga formatos raster, vectoriales o PDF." }], privacy: "El contenido del QR y las imágenes elegidas se procesan localmente. Exportar siempre requiere una acción explícita." },
    metadata: { headline: "Mira lo que dice un archivo antes de compartirlo.", intro: "Inspecciona en el navegador metadata sensible de imágenes, documentos, audio y video.", details: [{ title: "Revela campos ocultos", body: "Encuentra GPS, autor, horarios, software y propiedades de documentos." }, { title: "Entiende el riesgo", body: "Agrupa las señales por impacto de privacidad, no como una lista interminable." }, { title: "Guarda un reporte", body: "Exporta hallazgos normalizados como JSON o CSV." }], privacy: "Los archivos se analizan localmente y no se suben a Holi. Los enlaces de mapas solo se abren mediante una acción explícita." },
    labs: { headline: "Lee las decisiones detrás de herramientas local-first útiles.", intro: "Tutoriales, notas de campo, experimentos y papers revisados dentro de una sola publicación práctica.", details: [{ title: "Tutoriales", body: "Pasos repetibles para construir y usar flujos local-first." }, { title: "Notas y experimentos", body: "Aprendizajes cortos y trabajo medido que todavía se está probando." }, { title: "Papers", body: "Explicaciones técnicas extensas, estables y revisadas." }], privacy: "Leer no requiere cuenta. La búsqueda y exportación ocurren en el navegador; los artículos no reciben tus archivos." },
  },
};

const zh: EditorialCopy = {
  eyebrow: "五个产品 · 一个清晰入口", heroLine: "在这里工作，而不是把工作交出去。", heroIntro: "打开文件、完成任务，无需创建账户。核心流程在浏览器中运行；联网行为会在使用前明确标注。", localLabel: "默认本地处理", explore: "浏览工具", landingsLabel: "产品指南", openTool: "打开工具", learnMore: "工作方式", back: "返回全部工具", whatItDoes: "它能做什么", privacyTitle: "清楚易懂的隐私说明", privacyNote: "Cloudflare 在提供页面时可能处理 IP 地址、请求时间和路由信息等连接元数据。", startNow: "立即开始", noAccount: "无需账户",
  tools: {
    image: { headline: "无需交出图片，也能完成处理。", intro: "把通常分散在多个网站的图片操作集中到一个本地工作区。", details: [{ title: "优化并比较", body: "下载前调整质量并查看最终大小。" }, { title: "缩放与裁剪", body: "保留比例，或使用常见格式的居中预设。" }, { title: "转换并清理", body: "导出 JPEG、PNG 或 WebP，不复制源文件的元数据块。" }], privacy: "图片、预览和导出结果只存在于标签页的临时内存中，下载由你明确触发。" },
    typst: { headline: "在一个本地工作区中写作、预览并导出。", intro: "专注的 Typst 编辑器，包含项目、图片、PDF 预览以及浏览器或文件夹存储。", details: [{ title: "立即开始", body: "即使未选择文件夹，也会准备好浏览器工作区。" }, { title: "查看 PDF", body: "本地编译、缩放输出，并从预览跳向源码。" }, { title: "保持结构", body: "管理多个项目及其各自的文档和图片文件夹。" }], privacy: "文档内容与编译留在设备上；选择的文件夹只会在明确授权后访问。" },
    qr: { headline: "设计美观且仍能可靠工作的 QR。", intro: "创建、设计、验证并导出 QR 码，无需把内容或图片发送给 Holi。", details: [{ title: "选择内容", body: "用清晰输入创建常见 QR 内容。" }, { title: "塑造外观", body: "调整模块、定位点、颜色、图层、标志与效果。" }, { title: "验证后导出", body: "检查可扫描性并下载位图、矢量或文档格式。" }], privacy: "QR 内容和所选图片在本地处理，导出始终由浏览器明确下载。" },
    metadata: { headline: "分享前，先看看文件暴露了什么。", intro: "在浏览器中检查图片、文档、音频与视频中的敏感元数据。", details: [{ title: "显示隐藏字段", body: "找到 GPS、作者、时间、软件和文档属性。" }, { title: "理解风险", body: "按隐私影响组织信息，而不是展示杂乱清单。" }, { title: "保存报告", body: "需要记录时可导出标准化 JSON 或 CSV。" }], privacy: "文件在本地解析，不会上传到 Holi；地图链接仅在你明确操作后打开。" },
    labs: { headline: "阅读实用本地优先工具背后的决定。", intro: "把教程、现场笔记、实验与审阅过的论文放在同一份实用出版物中。", details: [{ title: "教程", body: "可重复的本地优先构建与使用步骤。" }, { title: "笔记与实验", body: "短篇经验和仍在验证的测量工作。" }, { title: "论文", body: "更长、更稳定且经过审阅的技术说明。" }], privacy: "阅读无需账户；搜索与导出在浏览器中进行，文章页面不会接收你的文件。" },
  },
};

const hi: EditorialCopy = {
  eyebrow: "पाँच उत्पाद · एक साफ़ शुरुआत", heroLine: "यहीं काम करते हैं, कहीं और नहीं।", heroIntro: "फ़ाइल खोलें, काम पूरा करें और बिना खाते के निकल जाएँ। मुख्य प्रवाह ब्राउज़र में चलते हैं; कनेक्टेड व्यवहार इस्तेमाल से पहले बताया जाता है।", localLabel: "डिफ़ॉल्ट रूप से लोकल", explore: "टूल देखें", landingsLabel: "उत्पाद गाइड", openTool: "टूल खोलें", learnMore: "कैसे काम करता है", back: "सभी टूल पर वापस", whatItDoes: "यह क्या करता है", privacyTitle: "साफ़ भाषा में प्राइवेसी", privacyNote: "पेज देते समय Cloudflare IP पता, अनुरोध समय और रूटिंग जानकारी जैसी कनेक्शन मेटाडेटा प्रोसेस कर सकता है।", startNow: "अभी शुरू करें", noAccount: "खाता आवश्यक नहीं",
  tools: {
    image: { headline: "इमेज सौंपे बिना उन्हें आकार दें।", intro: "कई साइटों में बिखरे इमेज कामों के लिए एक लोकल वर्कस्पेस।", details: [{ title: "ऑप्टिमाइज़ और तुलना", body: "डाउनलोड से पहले गुणवत्ता और अंतिम आकार देखें।" }, { title: "रीसाइज़ और क्रॉप", body: "अनुपात रखें या सामान्य फॉर्मैट के केंद्रित प्रीसेट चुनें।" }, { title: "कन्वर्ट और क्लीन", body: "सोर्स मेटाडेटा कॉपी किए बिना JPEG, PNG या WebP बनाएँ।" }], privacy: "इमेज, प्रीव्यू और आउटपुट टैब की अस्थायी मेमोरी में रहते हैं; डाउनलोड केवल आपके कहने पर होता है।" },
    typst: { headline: "एक लोकल वर्कस्पेस में लिखें, देखें और एक्सपोर्ट करें।", intro: "प्रोजेक्ट, इमेज, PDF प्रीव्यू और ब्राउज़र या फ़ोल्डर स्टोरेज वाला केंद्रित Typst एडिटर।", details: [{ title: "तुरंत शुरू करें", body: "फ़ोल्डर न चुनने पर भी ब्राउज़र वर्कस्पेस तैयार रहता है।" }, { title: "PDF देखें", body: "लोकल कम्पाइल, ज़ूम और प्रीव्यू से सोर्स की ओर जाएँ।" }, { title: "संरचना रखें", body: "कई प्रोजेक्ट और उनकी अपनी इमेज फ़ोल्डर सँभालें।" }], privacy: "डॉक्यूमेंट और कम्पाइलिंग डिवाइस पर रहते हैं; चुना फ़ोल्डर स्पष्ट अनुमति के बाद ही खुलता है।" },
    qr: { headline: "ऐसा QR डिज़ाइन करें जो अपना काम न भूले।", intro: "कंटेंट या इमेज Holi को भेजे बिना QR बनाएँ, सजाएँ, जाँचें और एक्सपोर्ट करें।", details: [{ title: "कंटेंट चुनें", body: "स्पष्ट इनपुट से सामान्य QR payload बनाएँ।" }, { title: "रूप दें", body: "मॉड्यूल, आँखें, रंग, लेयर, लोगो और इफ़ेक्ट बदलें।" }, { title: "जाँचकर एक्सपोर्ट", body: "स्कैनिंग जाँचें और raster, vector या PDF डाउनलोड करें।" }], privacy: "QR कंटेंट और चुनी इमेज लोकल प्रोसेस होती हैं; एक्सपोर्ट हमेशा स्पष्ट डाउनलोड है।" },
    metadata: { headline: "शेयर करने से पहले देखें कि फ़ाइल क्या बताती है।", intro: "इमेज, डॉक्यूमेंट, ऑडियो और वीडियो की संवेदनशील मेटाडेटा ब्राउज़र में जाँचें।", details: [{ title: "छिपे फ़ील्ड देखें", body: "GPS, लेखक, समय, सॉफ़्टवेयर और डॉक्यूमेंट गुण खोजें।" }, { title: "जोखिम समझें", body: "लंबी सूची के बजाय प्राइवेसी प्रभाव के अनुसार संकेत देखें।" }, { title: "रिपोर्ट रखें", body: "नतीजे JSON या CSV में एक्सपोर्ट करें।" }], privacy: "फ़ाइलें लोकल पढ़ी जाती हैं और Holi पर अपलोड नहीं होतीं; नक्शा लिंक केवल आपके स्पष्ट कदम पर खुलते हैं।" },
    labs: { headline: "उपयोगी लोकल‑फर्स्ट टूल्स के पीछे के निर्णय पढ़ें।", intro: "ट्यूटोरियल, फ़ील्ड नोट, प्रयोग और समीक्षा किए papers एक ही व्यावहारिक प्रकाशन में।", details: [{ title: "ट्यूटोरियल", body: "लोकल‑फर्स्ट प्रवाह बनाने और उपयोग करने के दोहराने योग्य कदम।" }, { title: "नोट और प्रयोग", body: "छोटी सीख और अभी जाँचा जा रहा मापा काम।" }, { title: "पेपर्स", body: "लंबी, स्थिर और समीक्षा की गई तकनीकी व्याख्याएँ।" }], privacy: "पढ़ने के लिए खाता नहीं चाहिए; खोज और एक्सपोर्ट ब्राउज़र में होते हैं और लेख आपकी फ़ाइलें नहीं लेते।" },
  },
};

const ar: EditorialCopy = {
  eyebrow: "خمسة منتجات · بداية واضحة", heroLine: "تعمل هنا، لا في مكان آخر.", heroIntro: "افتح ملفًا وأنهِ المهمة وغادر بلا حساب. تعمل التدفقات الأساسية في المتصفح وتُشرح الوظائف المتصلة قبل استخدامها.", localLabel: "محلي افتراضيًا", explore: "استكشف الأدوات", landingsLabel: "دليل المنتج", openTool: "افتح الأداة", learnMore: "كيف تعمل", back: "العودة إلى كل الأدوات", whatItDoes: "ماذا تفعل", privacyTitle: "الخصوصية بلغة واضحة", privacyNote: "قد تعالج Cloudflare بيانات الاتصال مثل عنوان IP ووقت الطلب ومعلومات التوجيه أثناء تقديم الصفحات.", startNow: "ابدأ الآن", noAccount: "لا يحتاج إلى حساب",
  tools: {
    image: { headline: "شكّل الصور دون تسليمها.", intro: "مساحة محلية واحدة لعمليات الصور التي تتوزع عادة على عدة مواقع.", details: [{ title: "حسّن وقارن", body: "اضبط الجودة وشاهد الحجم النهائي قبل التنزيل." }, { title: "غيّر الحجم واقتص", body: "حافظ على النسب أو استخدم قوالب قص مركزية." }, { title: "حوّل ونظّف", body: "صدّر JPEG أو PNG أو WebP دون نسخ كتل بيانات المصدر." }], privacy: "تبقى الصور والمعاينات والنتائج في ذاكرة التبويب المؤقتة، ولا يبدأ التنزيل إلا بطلبك." },
    typst: { headline: "اكتب وعاين وصدّر في مساحة محلية واحدة.", intro: "محرر Typst مركّز مع مشاريع وصور ومعاينة PDF وتخزين المتصفح أو المجلد.", details: [{ title: "ابدأ فورًا", body: "توجد مساحة متصفح جاهزة حتى دون اختيار مجلد." }, { title: "شاهد PDF", body: "ترجمة محلية وتكبير وانتقال من المعاينة نحو المصدر." }, { title: "حافظ على البنية", body: "أدر عدة مشاريع ومجلدات الصور الخاصة بها." }], privacy: "يبقى المستند والترجمة على الجهاز، ولا يُفتح المجلد المختار إلا بعد إذن صريح." },
    qr: { headline: "صمّم QR لا ينسى مهمته.", intro: "أنشئ ونسّق وتحقق وصدّر QR دون إرسال المحتوى أو الصور إلى Holi.", details: [{ title: "اختر المحتوى", body: "أنشئ حمولات QR الشائعة بمدخلات واضحة." }, { title: "شكّل النتيجة", body: "عدّل الوحدات والعيون والألوان والطبقات والشعارات والتأثيرات." }, { title: "تحقق ثم صدّر", body: "اختبر قابلية المسح ونزّل صيغًا نقطية أو متجهة أو PDF." }], privacy: "تُعالج محتويات QR والصور محليًا، والتصدير تنزيل صريح من المتصفح." },
    metadata: { headline: "اعرف ما يقوله الملف قبل مشاركته.", intro: "افحص بيانات حساسة في الصور والمستندات والصوت والفيديو داخل المتصفح.", details: [{ title: "اكشف الحقول المخفية", body: "اعثر على GPS والمؤلف والتوقيت والبرنامج وخصائص المستند." }, { title: "افهم الخطر", body: "شاهد الإشارات حسب أثرها على الخصوصية بدل قائمة مبهمة." }, { title: "احتفظ بتقرير", body: "صدّر النتائج المنظمة بصيغة JSON أو CSV." }], privacy: "تُحلل الملفات محليًا ولا تُرفع إلى Holi، ولا تفتح روابط الخرائط إلا بفعل صريح." },
    labs: { headline: "اقرأ القرارات وراء أدوات محلية مفيدة.", intro: "دروس وملاحظات ميدانية وتجارب وأوراق مراجعة في منشور عملي واحد.", details: [{ title: "دروس", body: "خطوات قابلة للتكرار لبناء التدفقات المحلية واستخدامها." }, { title: "ملاحظات وتجارب", body: "دروس قصيرة وعمل مقاس ما زال قيد الاختبار." }, { title: "أوراق", body: "شروح تقنية أطول ومستقرة وخاضعة للمراجعة." }], privacy: "لا تحتاج القراءة إلى حساب؛ البحث والتصدير يعملان في المتصفح ولا تستقبل المقالات ملفاتك." },
  },
};

const bn: EditorialCopy = {
  eyebrow: "পাঁচটি পণ্য · একটি পরিষ্কার শুরু", heroLine: "এখানেই কাজ করে, অন্য কোথাও নয়।", heroIntro: "ফাইল খুলুন, কাজ শেষ করুন, অ্যাকাউন্ট ছাড়াই চলে যান। মূল কাজ ব্রাউজারে চলে; সংযুক্ত আচরণ ব্যবহারের আগেই জানানো হয়।", localLabel: "ডিফল্টভাবে লোকাল", explore: "টুল দেখুন", landingsLabel: "পণ্য গাইড", openTool: "টুল খুলুন", learnMore: "কীভাবে কাজ করে", back: "সব টুলে ফিরুন", whatItDoes: "এটি যা করে", privacyTitle: "সহজ ভাষায় গোপনীয়তা", privacyNote: "পেজ পরিবেশনের সময় Cloudflare IP, request time ও routing information-এর মতো connection metadata process করতে পারে।", startNow: "এখনই শুরু করুন", noAccount: "অ্যাকাউন্ট লাগে না",
  tools: {
    image: { headline: "ছবি হস্তান্তর না করেই বদলান।", intro: "যে image কাজগুলো সাধারণত অনেক সাইটে ছড়ানো থাকে, সেগুলোর জন্য এক local workspace।", details: [{ title: "Optimize ও compare", body: "Download-এর আগে quality বদলে final size দেখুন।" }, { title: "Resize ও crop", body: "Ratio রাখুন বা common format-এর centered preset নিন।" }, { title: "Convert ও clean", body: "Source metadata block না কপি করে JPEG, PNG বা WebP export করুন।" }], privacy: "ছবি, preview ও output tab-এর temporary memory-তে থাকে; আপনি বললেই শুধু download হয়।" },
    typst: { headline: "এক local workspace-এ লিখুন, preview করুন ও export করুন।", intro: "Project, image, PDF preview এবং browser বা folder storage-সহ focused Typst editor।", details: [{ title: "সঙ্গে সঙ্গে শুরু", body: "Folder না বাছলেও browser workspace প্রস্তুত থাকে।" }, { title: "PDF দেখুন", body: "Local compile, zoom এবং preview থেকে source-এর দিকে যান।" }, { title: "Structure রাখুন", body: "একাধিক project ও তাদের নিজস্ব image folder পরিচালনা করুন।" }], privacy: "Document ও compilation device-এ থাকে; বাছা folder স্পষ্ট permission-এর পরেই খোলে।" },
    qr: { headline: "এমন QR বানান যা নিজের কাজ ভুলবে না।", intro: "Content বা image Holi-তে না পাঠিয়ে QR তৈরি, style, verify ও export করুন।", details: [{ title: "Content বাছুন", body: "পরিষ্কার input দিয়ে common QR payload বানান।" }, { title: "রূপ দিন", body: "Module, eye, color, layer, logo ও effect বদলান।" }, { title: "Verify করে export", body: "Scan হওয়া যাচাই করে raster, vector বা PDF নিন।" }], privacy: "QR content ও নির্বাচিত image local process হয়; export সবসময় স্পষ্ট browser download।" },
    metadata: { headline: "Share করার আগে দেখুন file কী বলে।", intro: "Image, document, audio ও video-র privacy-sensitive metadata browser-এ inspect করুন।", details: [{ title: "Hidden field দেখুন", body: "GPS, author, time, software ও document property খুঁজুন।" }, { title: "ঝুঁকি বুঝুন", body: "এলোমেলো তালিকার বদলে privacy impact অনুযায়ী signal দেখুন।" }, { title: "Report রাখুন", body: "Normalized result JSON বা CSV হিসেবে export করুন।" }], privacy: "File local parse হয় এবং Holi-তে upload হয় না; map link শুধু স্পষ্ট action-এ খোলে।" },
    labs: { headline: "কাজের local-first tool-এর পেছনের সিদ্ধান্ত পড়ুন।", intro: "Tutorial, field note, experiment ও reviewed paper—একটি practical publication-এ।", details: [{ title: "Tutorial", body: "Local-first flow বানানো ও ব্যবহারের পুনরাবৃত্ত ধাপ।" }, { title: "Note ও experiment", body: "ছোট শিক্ষা এবং এখনও পরীক্ষা চলা measured work।" }, { title: "Paper", body: "দীর্ঘ, স্থিতিশীল ও review করা technical explanation।" }], privacy: "পড়তে account লাগে না; search ও export browser-এ চলে, article আপনার file নেয় না।" },
  },
};

const pt: EditorialCopy = {
  eyebrow: "Cinco produtos · um início claro", heroLine: "trabalham aqui, não em outro lugar.", heroIntro: "Abra um arquivo, termine o trabalho e saia sem criar conta. Os fluxos principais rodam no navegador; conexões são explicadas antes do uso.", localLabel: "Local por padrão", explore: "Explorar ferramentas", landingsLabel: "Guia do produto", openTool: "Abrir ferramenta", learnMore: "Como funciona", back: "Voltar às ferramentas", whatItDoes: "O que faz", privacyTitle: "Privacidade em linguagem clara", privacyNote: "A Cloudflare pode processar metadados de conexão como endereço IP, horário da solicitação e informações de roteamento ao servir estas páginas.", startNow: "Começar agora", noAccount: "Sem conta",
  tools: {
    image: { headline: "Transforme imagens sem entregá-las.", intro: "Um workspace local para operações de imagem que normalmente ficam espalhadas por vários sites.", details: [{ title: "Otimize e compare", body: "Ajuste a qualidade e veja o tamanho final antes do download." }, { title: "Redimensione e recorte", body: "Preserve proporções ou use presets centralizados." }, { title: "Converta e limpe", body: "Exporte JPEG, PNG ou WebP sem copiar blocos de metadados da origem." }], privacy: "Imagens, previews e resultados ficam na memória temporária da aba; o download só acontece quando você pede." },
    typst: { headline: "Escreva, visualize e exporte em um workspace local.", intro: "Editor Typst focado com projetos, imagens, preview PDF e armazenamento do navegador ou pasta.", details: [{ title: "Comece imediatamente", body: "Um workspace do navegador fica pronto mesmo sem pasta selecionada." }, { title: "Veja o PDF", body: "Compile localmente, ajuste o zoom e vá do preview ao código." }, { title: "Mantenha a estrutura", body: "Use vários projetos e suas próprias pastas de imagens." }], privacy: "Documento e compilação ficam no dispositivo; a pasta escolhida só é acessada após permissão explícita." },
    qr: { headline: "Crie um QR que não esquece sua função.", intro: "Crie, estilize, verifique e exporte QR codes sem enviar conteúdo ou imagens à Holi.", details: [{ title: "Escolha o conteúdo", body: "Monte formatos QR comuns com entradas claras." }, { title: "Dê forma", body: "Ajuste módulos, olhos, cores, camadas, logos e efeitos." }, { title: "Verifique e exporte", body: "Teste a leitura e baixe formatos raster, vetoriais ou PDF." }], privacy: "Conteúdo QR e imagens são processados localmente; exportar é sempre um download explícito." },
    metadata: { headline: "Veja o que um arquivo revela antes de compartilhar.", intro: "Inspecione metadados sensíveis de imagens, documentos, áudio e vídeo no navegador.", details: [{ title: "Revele campos ocultos", body: "Encontre GPS, autor, horários, software e propriedades de documentos." }, { title: "Entenda o risco", body: "Agrupe sinais pelo impacto na privacidade em vez de mostrar uma lista solta." }, { title: "Guarde um relatório", body: "Exporte resultados normalizados como JSON ou CSV." }], privacy: "Os arquivos são analisados localmente e não são enviados à Holi; links de mapas só abrem por ação explícita." },
    labs: { headline: "Leia as decisões por trás de ferramentas local-first úteis.", intro: "Tutoriais, notas de campo, experimentos e papers revisados em uma publicação prática.", details: [{ title: "Tutoriais", body: "Passos repetíveis para criar e usar fluxos local-first." }, { title: "Notas e experimentos", body: "Aprendizados curtos e trabalho medido ainda em teste." }, { title: "Papers", body: "Explicações técnicas longas, estáveis e revisadas." }], privacy: "Ler não exige conta; busca e exportação rodam no navegador e os artigos não recebem seus arquivos." },
  },
};

export const editorialCopy: Record<LanguageCode, EditorialCopy> = { en, es, zh, hi, ar, bn, pt };

export function getEditorialCopy(lang: string) {
  return editorialCopy[lang as LanguageCode] ?? editorialCopy.en;
}

export const toolSlugs = Object.keys(toolIdentity) as ToolSlug[];
