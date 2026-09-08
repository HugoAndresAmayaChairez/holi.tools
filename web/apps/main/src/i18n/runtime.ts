import type { LanguageCode } from "@holi/configs/i18n";

type RuntimeCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  webTitle: string;
  webBody: string;
  webAction: string;
  localTitle: string;
  localBody: string;
  localAction: string;
  status: string;
  bridge: string;
  privacy: string;
  setup: string;
  steps: [string, string, string];
  docs: string;
  change: string;
};

const copy: Record<LanguageCode, RuntimeCopy> = {
  en: {
    eyebrow: "In your browser · on your device",
    title: "Choose how you work.",
    intro:
      "Design and preview in the browser. Automate PDF and QR creation with Holi Local on your device. Start without an account.",
    webTitle: "Create and preview",
    webBody:
      "Use the visual editors, adjust the result, and export from the browser. The web tools process locally and work independently of Holi Local.",
    webAction: "Open the web tools",
    localTitle: "Automate with Holi Local",
    localBody:
      "Connect your AI assistant to a native Rust engine through MCP. Generate PDF documents and batches of PNG or SVG QR codes in a folder you choose. No Node installation required.",
    localAction: "Set up Holi Local",
    status: "v0.3.0 · Public downloads pending",
    bridge:
      "Today, the web tools and the native engine run independently. There is no automatic file sync or live preview of native jobs in the browser.",
    privacy:
      "Local rendering does not make a cloud assistant private: its provider may receive prompts, tool inputs and results. Typst package downloads are off by default.",
    setup: "Connect the native engine",
    steps: [
      "Get the Windows or Ubuntu installer from the project maintainer while public downloads are pending. Open it to choose folders, or use a command like this Windows example after downloading.",
      "Choose your client and folders. The installer offers per-user defaults or custom paths, creates the output folder and generates the MCP configuration. No Node or Rust installation is needed.",
      "Restart your assistant and ask it to call holi_info. Selecting Claude Code installs personal skills; Desktop skills are optional ZIP uploads. The guide includes Ubuntu commands and a five-tool test prompt.",
    ],
    docs: "Build and setup guide (English)",
    change:
      "Introduced web editing/preview and native PDF/QR automation paths, with setup guidance, release status and explicit privacy and synchronization limits.",
  },
  es: {
    eyebrow: "En el navegador · en tu equipo",
    title: "Elige cómo trabajar.",
    intro:
      "Diseña y previsualiza en el navegador. Automatiza la creación de PDF y QR con Holi Local en tu equipo. Empieza sin cuenta.",
    webTitle: "Crea y previsualiza",
    webBody:
      "Usa los editores visuales, ajusta el resultado y exporta desde el navegador. Las herramientas web procesan localmente y funcionan por sí mismas.",
    webAction: "Abrir herramientas web",
    localTitle: "Automatiza con Holi Local",
    localBody:
      "Conecta tu asistente de IA a un motor nativo en Rust mediante MCP. Genera documentos PDF y lotes de QR PNG o SVG en la carpeta que elijas. No requiere instalar Node.",
    localAction: "Configurar Holi Local",
    status: "v0.3.0 · Descargas públicas pendientes",
    bridge:
      "Hoy, las herramientas web y el motor nativo funcionan de forma independiente. No hay sincronización automática de archivos ni vista previa en vivo de los trabajos nativos en el navegador.",
    privacy:
      "El renderizado local no hace privado a un asistente en la nube: su proveedor puede recibir prompts, entradas y resultados de herramientas. Las descargas de paquetes Typst están desactivadas por defecto.",
    setup: "Conecta el motor nativo",
    steps: [
      "Obtén el instalador de Windows o Ubuntu del responsable del proyecto mientras se publica la descarga. Ábrelo para elegir carpetas, o usa un comando como este ejemplo de Windows después de descargarlo.",
      "Elige tu cliente y las carpetas. El instalador ofrece rutas por usuario o personalizadas, crea la carpeta de salida y genera la configuración MCP. No necesitas instalar Node ni Rust.",
      "Reinicia el asistente y pídele que llame holi_info. Las skills de Claude Code se instalan al elegir ese cliente; en Desktop puedes cargarlas como ZIP. La guía incluye comandos de Ubuntu y un prompt para probar las cinco herramientas.",
    ],
    docs: "Guías de instalación en español e inglés",
    change:
      "Añadidas las opciones de edición y vista previa web y automatización nativa de PDF/QR, con guía de configuración, estado de publicación y límites de privacidad y sincronización.",
  },
  zh: {
    eyebrow: "在浏览器中 · 在你的设备上",
    title: "选择工作方式。",
    intro:
      "在浏览器中设计和预览。通过设备上的 Holi Local 自动生成 PDF 和二维码，无需账户即可开始。",
    webTitle: "创作与预览",
    webBody:
      "使用可视化编辑器，调整结果并从浏览器导出。网页工具在本地处理数据，可独立于 Holi Local 使用。",
    webAction: "打开网页工具",
    localTitle: "通过 Holi Local 自动化",
    localBody:
      "通过 MCP 将 AI 助手连接到 Rust 原生引擎。在指定文件夹中生成 PDF 文档和 PNG 或 SVG 二维码批次，无需安装 Node。",
    localAction: "配置 Holi Local",
    status: "v0.3.0 · 尚未发布公开下载",
    bridge:
      "目前，网页工具和原生引擎独立运行。两者之间没有自动文件同步，也无法在浏览器中实时预览原生任务。",
    privacy:
      "本地渲染不代表云端助手具有本地隐私：其服务商可能接收提示词、工具输入和结果。默认禁止下载 Typst 包。",
    setup: "连接原生引擎",
    steps: [
      "公开下载尚未发布，请向项目维护者获取 Windows 或 Ubuntu 安装程序。打开它选择文件夹，或下载后运行下面的 Windows 示例命令。",
      "选择客户端和文件夹。安装程序提供用户默认路径和自定义路径，创建输出文件夹并生成 MCP 配置。无需安装 Node 或 Rust。",
      "重启助手并请求调用 holi_info。选择 Claude Code 时会安装个人 skills；Desktop 可选上传 ZIP。指南包含 Ubuntu 命令和五项工具的测试提示词。",
    ],
    docs: "编译与配置指南（英语）",
    change:
      "新增网页编辑与预览及原生 PDF/二维码自动化入口，并说明配置方法、发布状态、隐私与同步限制。",
  },
  hi: {
    eyebrow: "ब्राउज़र में · आपके डिवाइस पर",
    title: "काम करने का तरीका चुनें।",
    intro:
      "ब्राउज़र में डिज़ाइन और पूर्वावलोकन करें। अपने डिवाइस पर Holi Local से PDF और QR बनाना स्वचालित करें। बिना खाते के शुरू करें।",
    webTitle: "बनाएँ और पूर्वावलोकन करें",
    webBody:
      "विज़ुअल संपादकों में परिणाम बदलें और ब्राउज़र से निर्यात करें। वेब टूल स्थानीय रूप से काम करते हैं और Holi Local से स्वतंत्र हैं।",
    webAction: "वेब टूल खोलें",
    localTitle: "Holi Local से स्वचालित करें",
    localBody:
      "MCP के माध्यम से अपने AI सहायक को Rust के नेटिव इंजन से जोड़ें। चुने हुए फ़ोल्डर में PDF दस्तावेज़ और PNG या SVG QR के बैच बनाएँ। Node इंस्टॉल करना ज़रूरी नहीं है।",
    localAction: "Holi Local सेट करें",
    status: "v0.3.0 · सार्वजनिक डाउनलोड अभी उपलब्ध नहीं",
    bridge:
      "अभी वेब टूल और नेटिव इंजन स्वतंत्र रूप से चलते हैं। फ़ाइलों का स्वचालित सिंक या नेटिव कार्यों का ब्राउज़र में लाइव पूर्वावलोकन उपलब्ध नहीं है।",
    privacy:
      "स्थानीय रेंडरिंग क्लाउड सहायक को निजी नहीं बनाती: उसके प्रदाता को प्रॉम्प्ट, टूल इनपुट और परिणाम मिल सकते हैं। Typst पैकेज डाउनलोड डिफ़ॉल्ट रूप से बंद हैं।",
    setup: "नेटिव इंजन जोड़ें",
    steps: [
      "सार्वजनिक डाउनलोड आने तक परियोजना के रखरखावकर्ता से Windows या Ubuntu इंस्टॉलर लें। फ़ोल्डर चुनने के लिए उसे खोलें, या डाउनलोड के बाद यह Windows उदाहरण चलाएँ।",
      "क्लाइंट और फ़ोल्डर चुनें। इंस्टॉलर उपयोगकर्ता के डिफ़ॉल्ट या अपने पथ देता है, आउटपुट फ़ोल्डर बनाता है और MCP सेटिंग तैयार करता है। Node या Rust इंस्टॉल करने की ज़रूरत नहीं है।",
      "सहायक फिर शुरू करें और holi_info चलाने को कहें। Claude Code चुनने पर व्यक्तिगत skills इंस्टॉल होती हैं; Desktop में ZIP अपलोड वैकल्पिक है। गाइड में Ubuntu कमांड और पाँच टूल की जाँच का प्रॉम्प्ट है।",
    ],
    docs: "बिल्ड और सेटअप गाइड (अंग्रेज़ी)",
    change:
      "वेब संपादन/पूर्वावलोकन और नेटिव PDF/QR स्वचालन के विकल्प, सेटअप निर्देश, रिलीज़ स्थिति तथा गोपनीयता और सिंक की सीमाएँ जोड़ी गईं।",
  },
  ar: {
    eyebrow: "في المتصفح · على جهازك",
    title: "اختر طريقة عملك.",
    intro:
      "صمّم وعاين في المتصفح. أنشئ ملفات PDF ورموز QR تلقائيًا باستخدام Holi Local على جهازك. ابدأ دون حساب.",
    webTitle: "أنشئ وعاين",
    webBody:
      "استخدم المحررات المرئية وعدّل النتيجة وصدّرها من المتصفح. تعالج أدوات الويب البيانات محليًا وتعمل بشكل مستقل عن Holi Local.",
    webAction: "افتح أدوات الويب",
    localTitle: "أتمت العمل مع Holi Local",
    localBody:
      "اربط مساعد الذكاء الاصطناعي بمحرك Rust أصلي عبر MCP. أنشئ مستندات PDF ودفعات رموز QR بصيغة PNG أو SVG في المجلد الذي تختاره. لا يتطلب تثبيت Node.",
    localAction: "إعداد Holi Local",
    status: "v0.3.0 · التنزيل العام لم يُنشر بعد",
    bridge:
      "تعمل أدوات الويب والمحرك الأصلي حاليًا بشكل مستقل. لا توجد مزامنة تلقائية للملفات أو معاينة مباشرة للمهام الأصلية في المتصفح.",
    privacy:
      "التصيير المحلي لا يجعل المساعد السحابي خاصًا: قد يتلقى مزوده المطالبات ومدخلات الأدوات ونتائجها. تنزيل حزم Typst معطّل افتراضيًا.",
    setup: "اربط المحرك الأصلي",
    steps: [
      "احصل على مُثبّت Windows أو Ubuntu من مسؤول المشروع حتى يُنشر التنزيل العام. افتحه لاختيار المجلدات أو شغّل مثال Windows التالي بعد تنزيله.",
      "اختر العميل والمجلدات. يوفر المُثبّت مسارات افتراضية للمستخدم أو مخصصة، وينشئ مجلد الإخراج وإعدادات MCP. لا تحتاج إلى تثبيت Node أو Rust.",
      "أعد تشغيل المساعد واطلب استدعاء holi_info. اختيار Claude Code يثبّت skills الشخصية؛ ويمكن رفع ZIP اختياريًا في Desktop. يتضمن الدليل أوامر Ubuntu ومطالبة لاختبار الأدوات الخمس.",
    ],
    docs: "دليل البناء والإعداد (بالإنجليزية)",
    change:
      "أُضيفت خيارات التحرير والمعاينة عبر الويب وأتمتة PDF وQR محليًا، مع إرشادات الإعداد وحالة النشر وحدود الخصوصية والمزامنة.",
  },
  bn: {
    eyebrow: "ব্রাউজারে · আপনার ডিভাইসে",
    title: "কাজের পদ্ধতি বেছে নিন।",
    intro:
      "ব্রাউজারে ডিজাইন ও প্রিভিউ করুন। আপনার ডিভাইসে Holi Local দিয়ে PDF ও QR তৈরি স্বয়ংক্রিয় করুন। অ্যাকাউন্ট ছাড়াই শুরু করুন।",
    webTitle: "তৈরি করুন ও প্রিভিউ দেখুন",
    webBody:
      "ভিজ্যুয়াল এডিটরে ফলাফল বদলান এবং ব্রাউজার থেকে রপ্তানি করুন। ওয়েব টুল স্থানীয়ভাবে কাজ করে এবং Holi Local থেকে স্বাধীন।",
    webAction: "ওয়েব টুল খুলুন",
    localTitle: "Holi Local দিয়ে স্বয়ংক্রিয় করুন",
    localBody:
      "MCP দিয়ে আপনার AI সহকারীকে Rust-এর নেটিভ ইঞ্জিনের সঙ্গে যুক্ত করুন। বেছে নেওয়া ফোল্ডারে PDF ডকুমেন্ট এবং PNG বা SVG QR-এর ব্যাচ তৈরি করুন। Node ইনস্টল করতে হয় না।",
    localAction: "Holi Local সেট আপ করুন",
    status: "v0.3.0 · সর্বজনীন ডাউনলোড এখনও প্রকাশিত হয়নি",
    bridge:
      "এখন ওয়েব টুল ও নেটিভ ইঞ্জিন স্বাধীনভাবে চলে। স্বয়ংক্রিয় ফাইল সিঙ্ক বা নেটিভ কাজের ব্রাউজারে লাইভ প্রিভিউ নেই।",
    privacy:
      "স্থানীয় রেন্ডারিং ক্লাউড সহকারীকে ব্যক্তিগত করে না: তার সেবাদাতা প্রম্পট, টুলের ইনপুট ও ফলাফল পেতে পারে। Typst প্যাকেজ ডাউনলোড ডিফল্টভাবে বন্ধ।",
    setup: "নেটিভ ইঞ্জিন যুক্ত করুন",
    steps: [
      "সর্বজনীন ডাউনলোড প্রকাশের আগে প্রকল্পের রক্ষণাবেক্ষণকারীর কাছ থেকে Windows বা Ubuntu ইনস্টলার নিন। ফোল্ডার বাছতে এটি খুলুন, অথবা ডাউনলোডের পরে এই Windows কমান্ড চালান।",
      "ক্লায়েন্ট ও ফোল্ডার বেছে নিন। ইনস্টলার ব্যবহারকারীর ডিফল্ট বা নিজস্ব পাথ দেয়, আউটপুট ফোল্ডার ও MCP সেটিং তৈরি করে। Node বা Rust ইনস্টল করতে হয় না।",
      "সহকারী আবার চালু করে holi_info চালাতে বলুন। Claude Code বাছলে ব্যক্তিগত skills ইনস্টল হয়; Desktop-এ ZIP আপলোড ঐচ্ছিক। গাইডে Ubuntu কমান্ড ও পাঁচটি টুল পরীক্ষার প্রম্পট আছে।",
    ],
    docs: "বিল্ড ও সেটআপ নির্দেশিকা (ইংরেজি)",
    change:
      "ওয়েব সম্পাদনা/প্রিভিউ ও নেটিভ PDF/QR স্বয়ংক্রিয়তার পথ, সেটআপ নির্দেশনা, প্রকাশের অবস্থা এবং গোপনীয়তা ও সিঙ্কের সীমা যোগ করা হয়েছে।",
  },
  pt: {
    eyebrow: "No navegador · no seu dispositivo",
    title: "Escolha como trabalhar.",
    intro:
      "Crie e visualize no navegador. Automatize a criação de PDF e QR com o Holi Local no seu dispositivo. Comece sem conta.",
    webTitle: "Crie e visualize",
    webBody:
      "Use os editores visuais, ajuste o resultado e exporte pelo navegador. As ferramentas web processam localmente e funcionam de forma independente do Holi Local.",
    webAction: "Abrir ferramentas web",
    localTitle: "Automatize com Holi Local",
    localBody:
      "Conecte seu assistente de IA a um motor nativo em Rust via MCP. Gere documentos PDF e lotes de QR em PNG ou SVG na pasta escolhida. Não é preciso instalar Node.",
    localAction: "Configurar Holi Local",
    status: "v0.3.0 · Downloads públicos pendentes",
    bridge:
      "Hoje, as ferramentas web e o motor nativo funcionam de forma independente. Não há sincronização automática de arquivos nem prévia ao vivo de tarefas nativas no navegador.",
    privacy:
      "A renderização local não torna privado um assistente na nuvem: seu provedor pode receber prompts, entradas e resultados das ferramentas. Downloads de pacotes Typst ficam desativados por padrão.",
    setup: "Conecte o motor nativo",
    steps: [
      "Obtenha o instalador de Windows ou Ubuntu com o responsável pelo projeto enquanto o download público está pendente. Abra-o para escolher pastas ou execute este exemplo de Windows após baixar.",
      "Escolha o cliente e as pastas. O instalador oferece caminhos padrão por usuário ou personalizados, cria a pasta de saída e gera a configuração MCP. Não é preciso instalar Node nem Rust.",
      "Reinicie o assistente e peça para chamar holi_info. A opção Claude Code instala skills pessoais; no Desktop, o envio de ZIP é opcional. O guia inclui comandos de Ubuntu e um prompt para testar as cinco ferramentas.",
    ],
    docs: "Guia de compilação e configuração (inglês)",
    change:
      "Adicionadas opções de edição/prévia web e automação nativa de PDF/QR, com configuração, estado de publicação e limites de privacidade e sincronização.",
  },
};

export function getRuntimeCopy(lang: string): RuntimeCopy {
  return copy[lang as LanguageCode] ?? copy.en;
}
