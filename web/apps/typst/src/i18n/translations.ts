import { LANGUAGES, type LanguageCode } from "@holi/configs/i18n";

export const languages = LANGUAGES;

type Tone = "local" | "connected" | "warning";

export interface TypstCopy {
  metaTitle: string;
  metaDescription: string;
  productDescription: string;
  privacyTitle: string;
  privacySummary: string;
  privacyDetails: string;
  privacyFacts: readonly (readonly [string, string, Tone])[];
  workspace: string;
  currentDocument: string;
  storage: string;
  localFiles: string;
  loading: string;
  noDocument: string;
  browserWorkspace: string;
  localFolder: string;
  connected: string;
  file: string;
  filesCount: string;
  files: string;
  folder: string;
  browser: string;
  openFiles: string;
  filesOpen: string;
  collapseFiles: string;
  image: string;
  imageAsset: string;
  addImage: string;
  workspaceActions: string;
  newFile: string;
  newProject: string;
  connectFolder: string;
  switchFolder: string;
  refreshFolder: string;
  folderUnavailable: string;
  folderUnavailableLong: string;
  rename: string;
  delete: string;
  projects: string;
  toggleView: string;
  preview: string;
  editor: string;
  saved: string;
  unsaved: string;
  saving: string;
  saveFailed: string;
  code: string;
  codeControls: string;
  wrapOn: string;
  wrapOff: string;
  toggleWrap: string;
  docs: string;
  downloadTyp: string;
  loadingEditor: string;
  dragResize: string;
  pdfControls: string;
  idle: string;
  previewZoom: string;
  zoomOut: string;
  zoomIn: string;
  resetZoom: string;
  downloadPdf: string;
  loadingPreview: string;
  locateInstruction: string;
  nearestSource: string;
  line: string;
  building: string;
  pdfReady: string;
  compiling: string;
  error: string;
  noRender: string;
  compilationFailed: string;
  renderedDocument: string;
  page: string;
  pages: string;
  newFilePrompt: string;
  projectNamePrompt: string;
  newProjectName: string;
  imageAddFailed: string;
  renamePrompt: string;
  deleteFrom: string;
  thisBrowser: string;
  folderLocation: string;
  privacyPage: {
    title: string;
    lead: string;
    back: string;
    sections: readonly (readonly [string, string])[];
    updated: string;
  };
}

const en: TypstCopy = {
  metaTitle: "Holi Typst — local document editor",
  metaDescription: "Write, preview, and export Typst documents locally in your browser.",
  productDescription: "A local-first Typst workspace for writing, previewing, and exporting technical documents in your browser.",
  privacyTitle: "Privacy summary",
  privacySummary: "Holi does not receive the contents of the documents you edit. Cloudflare can observe technical connection metadata.",
  privacyDetails: "Details",
  privacyFacts: [
    ["Processing", "Typst compilation and preview run on this device in WebAssembly.", "local"],
    ["Storage", "Projects stay in this browser by default, or in a local folder you explicitly connect. Both modes remain on this device.", "local"],
    ["Document uploads", "Opening, editing, and exporting a document do not upload its contents to Holi.", "local"],
    ["Network", "A connection is used to load or update the app and when you open external links.", "connected"],
    ["Hosting metadata", "Cloudflare can process your IP address, request time, and routing data.", "connected"],
    ["Collaboration", "Not enabled in this version; no document is shared with other people.", "local"],
  ],
  workspace: "Workspace", currentDocument: "Current document", storage: "Storage", localFiles: "Local files", loading: "Loading…", noDocument: "No document selected", browserWorkspace: "Browser workspace", localFolder: "Local folder", connected: "connected", file: "file", filesCount: "files", files: "Files", folder: "Folder", browser: "Browser", openFiles: "Open files", filesOpen: "Files open", collapseFiles: "Collapse files", image: "image", imageAsset: "image asset", addImage: "Add image to this project", workspaceActions: "Workspace actions", newFile: "New file", newProject: "New project", connectFolder: "Connect local folder", switchFolder: "Connect or switch local folder", refreshFolder: "Refresh local folder", folderUnavailable: "Folder access is unavailable in this browser", folderUnavailableLong: "This browser does not provide local folder access. The browser workspace remains available.", rename: "rename", delete: "delete", projects: "Projects", toggleView: "Toggle editor/preview", preview: "preview", editor: "editor", saved: "saved", unsaved: "unsaved", saving: "saving…", saveFailed: "save failed", code: "Code", codeControls: "Code controls", wrapOn: "wrap: on", wrapOff: "wrap: off", toggleWrap: "Toggle soft wrap", docs: "docs", downloadTyp: "download .typ", loadingEditor: "Loading editor…", dragResize: "Drag to resize", pdfControls: "PDF controls", idle: "idle", previewZoom: "Preview zoom", zoomOut: "Zoom out", zoomIn: "Zoom in", resetZoom: "Reset to actual size", downloadPdf: "download pdf", loadingPreview: "Loading preview…", locateInstruction: "Ctrl+click the preview to locate the nearest source line", nearestSource: "Nearest source", line: "line", building: "building…", pdfReady: "pdf ready", compiling: "compiling…", error: "error", noRender: "No successful render yet.", compilationFailed: "Compilation failed", renderedDocument: "Rendered document", page: "page", pages: "pages", newFilePrompt: "New Typst file", projectNamePrompt: "Project name", newProjectName: "New project", imageAddFailed: "This image could not be added to the active project.", renamePrompt: "Rename file (path)", deleteFrom: "Delete {path} from {location}?", thisBrowser: "this browser", folderLocation: "the local folder “{name}”",
  privacyPage: {
    title: "Privacy, without absolute promises",
    lead: "Your document content is processed on your device by default. The web infrastructure still handles the technical information required to deliver the application.",
    back: "Back to the editor",
    sections: [
      ["What stays on your device", "Typst source, previews, and exports are handled in your browser. Projects use browser storage by default. If you explicitly connect a local folder, Holi reads and writes project files there after the browser grants permission. Preferences and the remembered folder handle stay in browser storage on this device. Holi Typst does not currently provide cloud document storage or collaboration."],
      ["What the hosting provider can observe", "When you load or update the site, Cloudflare can process technical connection metadata such as your IP address, request time, requested resource, routing information, and approximate traffic volume. This is separate from the contents of the document you edit."],
      ["Network actions", "Loading or updating the app and opening the external Typst documentation require a connection. Once the necessary application resources are cached, the editor is designed to keep its core workflow available offline. Browser storage can be cleared and folder permission can be revoked, so important projects should still be backed up."],
      ["Planned collaboration", "Collaboration is not enabled in this release. Before it is enabled, Holi will publish and test a protocol in which content keys stay with participants and infrastructure coordinates only encrypted, expiring messages. A runtime label will distinguish direct and relay connections."],
    ],
    updated: "Last updated: September 2, 2026",
  },
};

const es: TypstCopy = {
  ...en,
  metaTitle: "Holi Typst — editor local de documentos", metaDescription: "Escribe, previsualiza y exporta documentos Typst localmente en tu navegador.", productDescription: "Un espacio Typst local-first para escribir, previsualizar y exportar documentos técnicos en el navegador.", privacyTitle: "Resumen de privacidad", privacySummary: "Holi no recibe el contenido de los documentos que editas. Cloudflare puede observar metadatos técnicos de conexión.", privacyDetails: "Detalles",
  privacyFacts: [["Procesamiento", "La compilación y vista previa de Typst se ejecutan en este dispositivo mediante WebAssembly.", "local"], ["Almacenamiento", "Los proyectos permanecen en este navegador o en una carpeta local que conectas explícitamente. Ambos modos permanecen en este dispositivo.", "local"], ["Subidas", "Abrir, editar y exportar un documento no sube su contenido a Holi.", "local"], ["Red", "Se usa conexión para cargar o actualizar la aplicación y al abrir enlaces externos.", "connected"], ["Metadatos de alojamiento", "Cloudflare puede procesar tu dirección IP, horario de solicitud y datos de enrutamiento.", "connected"], ["Colaboración", "No está habilitada en esta versión; ningún documento se comparte con otras personas.", "local"]],
  workspace: "Espacio de trabajo", currentDocument: "Documento actual", storage: "Almacenamiento", localFiles: "Archivos locales", loading: "Cargando…", noDocument: "Ningún documento seleccionado", browserWorkspace: "Espacio del navegador", localFolder: "Carpeta local", connected: "conectada", file: "archivo", filesCount: "archivos", files: "Archivos", folder: "Carpeta", browser: "Navegador", openFiles: "Abrir archivos", filesOpen: "Archivos abiertos", collapseFiles: "Contraer archivos", image: "imagen", imageAsset: "recurso de imagen", addImage: "Agregar imagen a este proyecto", workspaceActions: "Acciones del espacio", newFile: "Nuevo archivo", newProject: "Nuevo proyecto", connectFolder: "Conectar carpeta local", switchFolder: "Conectar o cambiar carpeta local", refreshFolder: "Actualizar carpeta local", folderUnavailable: "El acceso a carpetas no está disponible en este navegador", folderUnavailableLong: "Este navegador no ofrece acceso a carpetas locales. El espacio del navegador sigue disponible.", rename: "renombrar", delete: "eliminar", projects: "Proyectos", toggleView: "Cambiar editor/vista previa", preview: "vista previa", editor: "editor", saved: "guardado", unsaved: "sin guardar", saving: "guardando…", saveFailed: "falló el guardado", code: "Código", codeControls: "Controles de código", wrapOn: "ajuste: sí", wrapOff: "ajuste: no", toggleWrap: "Alternar ajuste de línea", docs: "docs", downloadTyp: "descargar .typ", loadingEditor: "Cargando editor…", dragResize: "Arrastra para cambiar el tamaño", pdfControls: "Controles de PDF", idle: "inactivo", previewZoom: "Zoom de vista previa", zoomOut: "Alejar", zoomIn: "Acercar", resetZoom: "Restablecer tamaño real", downloadPdf: "descargar PDF", loadingPreview: "Cargando vista previa…", locateInstruction: "Ctrl+clic en la vista previa para ubicar la línea de código más cercana", nearestSource: "Código más cercano", line: "línea", building: "generando…", pdfReady: "PDF listo", compiling: "compilando…", error: "error", noRender: "Aún no hay una renderización correcta.", compilationFailed: "Falló la compilación", renderedDocument: "Documento renderizado", page: "página", pages: "páginas", newFilePrompt: "Nuevo archivo Typst", projectNamePrompt: "Nombre del proyecto", newProjectName: "Nuevo proyecto", imageAddFailed: "No se pudo agregar esta imagen al proyecto activo.", renamePrompt: "Renombrar archivo (ruta)", deleteFrom: "¿Eliminar {path} de {location}?", thisBrowser: "este navegador", folderLocation: "la carpeta local «{name}»",
  privacyPage: { title: "Privacidad, sin promesas absolutas", lead: "El contenido de tus documentos se procesa en tu dispositivo por defecto. La infraestructura web todavía gestiona la información técnica necesaria para entregar la aplicación.", back: "Volver al editor", sections: [["Lo que permanece en tu dispositivo", "El código Typst, las vistas previas y las exportaciones se procesan en tu navegador. Los proyectos usan almacenamiento del navegador por defecto. Si conectas una carpeta local, Holi lee y escribe ahí después de que el navegador otorgue permiso. Las preferencias y el identificador de la carpeta permanecen en este dispositivo. Actualmente no hay almacenamiento cloud ni colaboración."], ["Lo que puede observar el proveedor", "Al cargar o actualizar el sitio, Cloudflare puede procesar metadatos técnicos como IP, horario, recurso solicitado, enrutamiento y volumen aproximado. Esto es independiente del contenido del documento."], ["Acciones de red", "Cargar o actualizar la aplicación y abrir la documentación externa requieren conexión. Con los recursos en caché, el editor mantiene su flujo principal sin conexión. El almacenamiento puede borrarse y el permiso de una carpeta puede revocarse, así que conserva respaldos."], ["Colaboración planeada", "La colaboración no está habilitada. Antes de activarla, Holi publicará y probará un protocolo donde las claves permanezcan con los participantes y la infraestructura coordine sólo mensajes cifrados y temporales, indicando conexión directa o por relay."]], updated: "Última actualización: 2 de septiembre de 2026" },
};

const zh: TypstCopy = {
  ...en,
  metaTitle: "Holi Typst — 本地文档编辑器", metaDescription: "在浏览器中本地编写、预览和导出 Typst 文档。", productDescription: "一个本地优先的 Typst 工作区，可在浏览器中编写、预览和导出技术文档。", privacyTitle: "隐私摘要", privacySummary: "Holi 不会收到你编辑的文档内容。Cloudflare 可能看到技术连接元数据。", privacyDetails: "详情",
  privacyFacts: [["处理", "Typst 编译和预览通过 WebAssembly 在此设备上运行。", "local"], ["存储", "项目默认保存在此浏览器中，或保存在你明确连接的本地文件夹中；两种方式都留在此设备。", "local"], ["文档上传", "打开、编辑和导出文档不会把内容上传到 Holi。", "local"], ["网络", "加载或更新应用以及打开外部链接时会使用网络。", "connected"], ["托管元数据", "Cloudflare 可处理你的 IP 地址、请求时间和路由数据。", "connected"], ["协作", "此版本未启用；文档不会与他人共享。", "local"]],
  workspace: "工作区", currentDocument: "当前文档", storage: "存储", localFiles: "本地文件", loading: "加载中…", noDocument: "未选择文档", browserWorkspace: "浏览器工作区", localFolder: "本地文件夹", connected: "已连接", file: "个文件", filesCount: "个文件", files: "文件", folder: "文件夹", browser: "浏览器", openFiles: "打开文件", filesOpen: "文件已打开", collapseFiles: "收起文件", image: "图像", imageAsset: "图像资源", addImage: "向此项目添加图像", workspaceActions: "工作区操作", newFile: "新建文件", newProject: "新建项目", connectFolder: "连接本地文件夹", switchFolder: "连接或切换本地文件夹", refreshFolder: "刷新本地文件夹", folderUnavailable: "此浏览器不支持文件夹访问", folderUnavailableLong: "此浏览器不提供本地文件夹访问。浏览器工作区仍可使用。", rename: "重命名", delete: "删除", projects: "项目", toggleView: "切换编辑器/预览", preview: "预览", editor: "编辑器", saved: "已保存", unsaved: "未保存", saving: "保存中…", saveFailed: "保存失败", code: "代码", codeControls: "代码控件", wrapOn: "换行：开", wrapOff: "换行：关", toggleWrap: "切换自动换行", docs: "文档", downloadTyp: "下载 .typ", loadingEditor: "正在加载编辑器…", dragResize: "拖动以调整大小", pdfControls: "PDF 控件", idle: "空闲", previewZoom: "预览缩放", zoomOut: "缩小", zoomIn: "放大", resetZoom: "恢复实际大小", downloadPdf: "下载 PDF", loadingPreview: "正在加载预览…", locateInstruction: "按住 Ctrl 点击预览以定位最近的源码行", nearestSource: "最近源码", line: "行", building: "生成中…", pdfReady: "PDF 已就绪", compiling: "编译中…", error: "错误", noRender: "还没有成功的渲染。", compilationFailed: "编译失败", renderedDocument: "已渲染文档", page: "页", pages: "页", newFilePrompt: "新建 Typst 文件", projectNamePrompt: "项目名称", newProjectName: "新项目", imageAddFailed: "无法把此图像添加到当前项目。", renamePrompt: "重命名文件（路径）", deleteFrom: "从{location}删除 {path}？", thisBrowser: "此浏览器", folderLocation: "本地文件夹“{name}”",
  privacyPage: { title: "隐私，不作绝对承诺", lead: "文档内容默认在你的设备上处理。Web 基础设施仍会处理交付应用所需的技术信息。", back: "返回编辑器", sections: [["留在设备上的内容", "Typst 源码、预览和导出都在浏览器中处理。项目默认使用浏览器存储；明确连接本地文件夹后，Holi 会在获得权限后读写其中的项目文件。偏好和文件夹句柄保留在此设备上。目前不提供云文档存储或协作。"], ["托管商可观察的信息", "加载或更新网站时，Cloudflare 可处理 IP 地址、请求时间、请求资源、路由信息和大致流量。这与文档内容相互独立。"], ["网络操作", "加载或更新应用和打开外部 Typst 文档需要网络。必要资源缓存后，核心流程可离线使用。浏览器存储可能被清除，文件夹权限也可撤销，因此重要项目仍应备份。"], ["计划中的协作", "此版本未启用协作。启用前，Holi 将发布并测试让内容密钥留在参与者手中、基础设施只协调加密临时消息的协议，并标明直连或中继模式。"]], updated: "最后更新：2026年9月2日" },
};

const hi: TypstCopy = {
  ...en,
  metaTitle: "Holi Typst — स्थानीय दस्तावेज़ संपादक", metaDescription: "ब्राउज़र में Typst दस्तावेज़ स्थानीय रूप से लिखें, देखें और निर्यात करें।", productDescription: "तकनीकी दस्तावेज़ लिखने, देखने और निर्यात करने के लिए स्थानीय-प्रथम Typst कार्यस्थान।", privacyTitle: "गोपनीयता सारांश", privacySummary: "Holi आपके दस्तावेज़ों की सामग्री प्राप्त नहीं करता। Cloudflare तकनीकी कनेक्शन मेटाडेटा देख सकता है।", privacyDetails: "विवरण",
  privacyFacts: [["प्रोसेसिंग", "Typst संकलन और पूर्वावलोकन WebAssembly के माध्यम से इसी डिवाइस पर चलते हैं।", "local"], ["स्टोरेज", "प्रोजेक्ट इस ब्राउज़र या आपके द्वारा जोड़े गए स्थानीय फ़ोल्डर में रहते हैं। दोनों इसी डिवाइस पर रहते हैं।", "local"], ["अपलोड", "दस्तावेज़ खोलना, संपादित करना या निर्यात करना उसकी सामग्री Holi पर अपलोड नहीं करता।", "local"], ["नेटवर्क", "ऐप लोड या अपडेट करने और बाहरी लिंक खोलने में नेटवर्क प्रयोग होता है।", "connected"], ["होस्टिंग मेटाडेटा", "Cloudflare आपका IP, अनुरोध समय और रूटिंग डेटा प्रोसेस कर सकता है।", "connected"], ["सहयोग", "इस संस्करण में चालू नहीं है; कोई दस्तावेज़ अन्य लोगों से साझा नहीं होता।", "local"]],
  workspace: "कार्यस्थान", currentDocument: "वर्तमान दस्तावेज़", storage: "स्टोरेज", localFiles: "स्थानीय फ़ाइलें", loading: "लोड हो रहा है…", noDocument: "कोई दस्तावेज़ चयनित नहीं", browserWorkspace: "ब्राउज़र कार्यस्थान", localFolder: "स्थानीय फ़ोल्डर", connected: "जुड़ा", file: "फ़ाइल", filesCount: "फ़ाइलें", files: "फ़ाइलें", folder: "फ़ोल्डर", browser: "ब्राउज़र", openFiles: "फ़ाइलें खोलें", filesOpen: "फ़ाइलें खुली हैं", collapseFiles: "फ़ाइलें समेटें", image: "चित्र", imageAsset: "चित्र संसाधन", addImage: "इस प्रोजेक्ट में चित्र जोड़ें", workspaceActions: "कार्यस्थान क्रियाएँ", newFile: "नई फ़ाइल", newProject: "नया प्रोजेक्ट", connectFolder: "स्थानीय फ़ोल्डर जोड़ें", switchFolder: "स्थानीय फ़ोल्डर जोड़ें या बदलें", refreshFolder: "स्थानीय फ़ोल्डर ताज़ा करें", folderUnavailable: "इस ब्राउज़र में फ़ोल्डर पहुँच उपलब्ध नहीं है", folderUnavailableLong: "यह ब्राउज़र स्थानीय फ़ोल्डर पहुँच नहीं देता। ब्राउज़र कार्यस्थान उपलब्ध रहेगा।", rename: "नाम बदलें", delete: "हटाएँ", projects: "प्रोजेक्ट", toggleView: "संपादक/पूर्वावलोकन बदलें", preview: "पूर्वावलोकन", editor: "संपादक", saved: "सहेजा गया", unsaved: "नहीं सहेजा", saving: "सहेज रहा है…", saveFailed: "सहेजना विफल", code: "कोड", codeControls: "कोड नियंत्रण", wrapOn: "रैप: चालू", wrapOff: "रैप: बंद", toggleWrap: "लाइन रैप बदलें", docs: "दस्तावेज़", downloadTyp: ".typ डाउनलोड करें", loadingEditor: "संपादक लोड हो रहा है…", dragResize: "आकार बदलने के लिए खींचें", pdfControls: "PDF नियंत्रण", idle: "निष्क्रिय", previewZoom: "पूर्वावलोकन ज़ूम", zoomOut: "ज़ूम आउट", zoomIn: "ज़ूम इन", resetZoom: "वास्तविक आकार", downloadPdf: "PDF डाउनलोड करें", loadingPreview: "पूर्वावलोकन लोड हो रहा है…", locateInstruction: "निकटतम स्रोत पंक्ति खोजने के लिए Ctrl+क्लिक करें", nearestSource: "निकटतम स्रोत", line: "पंक्ति", building: "बन रहा है…", pdfReady: "PDF तैयार", compiling: "संकलन…", error: "त्रुटि", noRender: "अभी कोई सफल रेंडर नहीं।", compilationFailed: "संकलन विफल", renderedDocument: "रेंडर किया दस्तावेज़", page: "पृष्ठ", pages: "पृष्ठ", newFilePrompt: "नई Typst फ़ाइल", projectNamePrompt: "प्रोजेक्ट नाम", newProjectName: "नया प्रोजेक्ट", imageAddFailed: "चित्र सक्रिय प्रोजेक्ट में नहीं जोड़ा जा सका।", renamePrompt: "फ़ाइल का नाम बदलें (पथ)", deleteFrom: "{location} से {path} हटाएँ?", thisBrowser: "इस ब्राउज़र", folderLocation: "स्थानीय फ़ोल्डर “{name}”",
  privacyPage: { title: "गोपनीयता, बिना पूर्ण दावों के", lead: "दस्तावेज़ सामग्री डिफ़ॉल्ट रूप से आपके डिवाइस पर प्रोसेस होती है। ऐप पहुँचाने के लिए वेब ढाँचा आवश्यक तकनीकी जानकारी संभालता है।", back: "संपादक पर लौटें", sections: [["डिवाइस पर क्या रहता है", "Typst स्रोत, पूर्वावलोकन और निर्यात ब्राउज़र में संभाले जाते हैं। प्रोजेक्ट डिफ़ॉल्ट रूप से ब्राउज़र स्टोरेज में रहते हैं। फ़ोल्डर जोड़ने पर Holi अनुमति मिलने के बाद वहीं पढ़ता और लिखता है। अभी क्लाउड स्टोरेज या सहयोग उपलब्ध नहीं है।"], ["होस्टिंग प्रदाता क्या देख सकता है", "साइट लोड या अपडेट होने पर Cloudflare IP, अनुरोध समय, संसाधन, रूटिंग और अनुमानित ट्रैफ़िक जैसे तकनीकी मेटाडेटा प्रोसेस कर सकता है। यह दस्तावेज़ सामग्री से अलग है।"], ["नेटवर्क क्रियाएँ", "ऐप लोड/अपडेट करने और बाहरी दस्तावेज़ खोलने के लिए नेटवर्क चाहिए। संसाधन कैश होने पर मुख्य प्रवाह ऑफ़लाइन चलता है। ब्राउज़र स्टोरेज मिट सकता है और फ़ोल्डर अनुमति वापस ली जा सकती है, इसलिए बैकअप रखें।"], ["नियोजित सहयोग", "इस रिलीज़ में सहयोग चालू नहीं है। चालू करने से पहले Holi ऐसा प्रोटोकॉल प्रकाशित करेगा जिसमें कुंजियाँ प्रतिभागियों के पास रहें और ढाँचा केवल एन्क्रिप्टेड अस्थायी संदेश समन्वित करे।"]], updated: "अंतिम अपडेट: 2 सितंबर 2026" },
};

const ar: TypstCopy = {
  ...en,
  metaTitle: "Holi Typst — محرر مستندات محلي", metaDescription: "اكتب مستندات Typst وعاينها وصدّرها محلياً في متصفحك.", productDescription: "مساحة Typst محلية أولاً لكتابة المستندات التقنية ومعاينتها وتصديرها في المتصفح.", privacyTitle: "ملخص الخصوصية", privacySummary: "لا تتلقى Holi محتوى المستندات التي تحررها. يمكن لـ Cloudflare رؤية بيانات الاتصال التقنية.", privacyDetails: "التفاصيل",
  privacyFacts: [["المعالجة", "يعمل تجميع Typst ومعاينته على هذا الجهاز عبر WebAssembly.", "local"], ["التخزين", "تبقى المشاريع في هذا المتصفح أو في مجلد محلي توصله صراحة. يبقى الوضعان على هذا الجهاز.", "local"], ["رفع المستندات", "فتح المستند وتحريره وتصديره لا يرفع محتواه إلى Holi.", "local"], ["الشبكة", "يُستخدم الاتصال لتحميل التطبيق أو تحديثه وعند فتح روابط خارجية.", "connected"], ["بيانات الاستضافة", "يمكن لـ Cloudflare معالجة عنوان IP ووقت الطلب وبيانات التوجيه.", "connected"], ["التعاون", "غير مفعّل في هذا الإصدار؛ لا تتم مشاركة أي مستند مع الآخرين.", "local"]],
  workspace: "مساحة العمل", currentDocument: "المستند الحالي", storage: "التخزين", localFiles: "الملفات المحلية", loading: "جارٍ التحميل…", noDocument: "لم يتم اختيار مستند", browserWorkspace: "مساحة المتصفح", localFolder: "مجلد محلي", connected: "متصل", file: "ملف", filesCount: "ملفات", files: "الملفات", folder: "المجلد", browser: "المتصفح", openFiles: "فتح الملفات", filesOpen: "الملفات مفتوحة", collapseFiles: "طي الملفات", image: "صورة", imageAsset: "مورد صورة", addImage: "إضافة صورة إلى هذا المشروع", workspaceActions: "إجراءات مساحة العمل", newFile: "ملف جديد", newProject: "مشروع جديد", connectFolder: "وصل مجلداً محلياً", switchFolder: "وصل أو بدّل المجلد المحلي", refreshFolder: "تحديث المجلد المحلي", folderUnavailable: "الوصول إلى المجلد غير متاح في هذا المتصفح", folderUnavailableLong: "لا يوفر هذا المتصفح الوصول إلى المجلدات المحلية. تبقى مساحة المتصفح متاحة.", rename: "إعادة تسمية", delete: "حذف", projects: "المشاريع", toggleView: "تبديل المحرر/المعاينة", preview: "معاينة", editor: "المحرر", saved: "محفوظ", unsaved: "غير محفوظ", saving: "جارٍ الحفظ…", saveFailed: "فشل الحفظ", code: "الشفرة", codeControls: "عناصر تحكم الشفرة", wrapOn: "الالتفاف: مفعّل", wrapOff: "الالتفاف: متوقف", toggleWrap: "تبديل التفاف السطر", docs: "التوثيق", downloadTyp: "تنزيل .typ", loadingEditor: "جارٍ تحميل المحرر…", dragResize: "اسحب لتغيير الحجم", pdfControls: "عناصر تحكم PDF", idle: "خامل", previewZoom: "تكبير المعاينة", zoomOut: "تصغير", zoomIn: "تكبير", resetZoom: "الحجم الفعلي", downloadPdf: "تنزيل PDF", loadingPreview: "جارٍ تحميل المعاينة…", locateInstruction: "اضغط Ctrl وانقر على المعاينة للوصول إلى أقرب سطر مصدر", nearestSource: "أقرب مصدر", line: "السطر", building: "جارٍ الإنشاء…", pdfReady: "PDF جاهز", compiling: "جارٍ التجميع…", error: "خطأ", noRender: "لا توجد معاينة ناجحة بعد.", compilationFailed: "فشل التجميع", renderedDocument: "المستند المعروض", page: "صفحة", pages: "صفحات", newFilePrompt: "ملف Typst جديد", projectNamePrompt: "اسم المشروع", newProjectName: "مشروع جديد", imageAddFailed: "تعذرت إضافة الصورة إلى المشروع النشط.", renamePrompt: "إعادة تسمية الملف (المسار)", deleteFrom: "حذف {path} من {location}؟", thisBrowser: "هذا المتصفح", folderLocation: "المجلد المحلي «{name}»",
  privacyPage: { title: "الخصوصية بلا وعود مطلقة", lead: "تُعالج محتويات مستندك على جهازك افتراضياً. تظل البنية التحتية للويب تتعامل مع المعلومات التقنية اللازمة لتقديم التطبيق.", back: "العودة إلى المحرر", sections: [["ما يبقى على جهازك", "تُعالج شفرة Typst والمعاينات والتصدير في المتصفح. تستخدم المشاريع تخزين المتصفح افتراضياً. إذا وصلت مجلداً محلياً، تقرأ Holi الملفات وتكتبها بعد منح الإذن. لا يتوفر حالياً تخزين سحابي أو تعاون."], ["ما يمكن لموفر الاستضافة ملاحظته", "عند تحميل الموقع أو تحديثه، يمكن لـ Cloudflare معالجة بيانات تقنية مثل IP ووقت الطلب والمورد المطلوب والتوجيه وحجم الحركة التقريبي. هذا منفصل عن محتوى المستند."], ["إجراءات الشبكة", "يتطلب تحميل التطبيق أو تحديثه وفتح توثيق Typst اتصالاً. بعد تخزين الموارد، يستمر المسار الأساسي دون اتصال. يمكن مسح التخزين أو إلغاء إذن المجلد، لذلك احتفظ بنسخ احتياطية."], ["التعاون المخطط", "التعاون غير مفعّل. قبل تفعيله ستنشر Holi وتختبر بروتوكولاً تبقى فيه المفاتيح مع المشاركين ولا تنسق البنية سوى رسائل مشفرة ومؤقتة."]], updated: "آخر تحديث: 2 سبتمبر 2026" },
};

const bn: TypstCopy = {
  ...en,
  metaTitle: "Holi Typst — স্থানীয় ডকুমেন্ট এডিটর", metaDescription: "ব্রাউজারে স্থানীয়ভাবে Typst ডকুমেন্ট লিখুন, প্রিভিউ করুন ও এক্সপোর্ট করুন।", productDescription: "প্রযুক্তিগত ডকুমেন্ট লেখা, প্রিভিউ ও এক্সপোর্টের জন্য লোকাল-ফার্স্ট Typst ওয়ার্কস্পেস।", privacyTitle: "গোপনীয়তার সারাংশ", privacySummary: "আপনার সম্পাদিত ডকুমেন্টের বিষয়বস্তু Holi পায় না। Cloudflare প্রযুক্তিগত সংযোগ মেটাডেটা দেখতে পারে।", privacyDetails: "বিস্তারিত",
  privacyFacts: [["প্রক্রিয়াকরণ", "Typst কম্পাইল ও প্রিভিউ WebAssembly দিয়ে এই ডিভাইসেই চলে।", "local"], ["স্টোরেজ", "প্রজেক্ট এই ব্রাউজারে বা আপনার যুক্ত স্থানীয় ফোল্ডারে থাকে। দুটিই এই ডিভাইসে থাকে।", "local"], ["ডকুমেন্ট আপলোড", "ডকুমেন্ট খোলা, সম্পাদনা ও এক্সপোর্ট করলে বিষয়বস্তু Holi-তে আপলোড হয় না।", "local"], ["নেটওয়ার্ক", "অ্যাপ লোড/আপডেট ও বাহ্যিক লিঙ্ক খোলার সময় সংযোগ ব্যবহৃত হয়।", "connected"], ["হোস্টিং মেটাডেটা", "Cloudflare আপনার IP, অনুরোধের সময় ও রাউটিং ডেটা প্রক্রিয়া করতে পারে।", "connected"], ["সহযোগিতা", "এই সংস্করণে চালু নয়; কোনো ডকুমেন্ট অন্যদের সঙ্গে ভাগ হয় না।", "local"]],
  workspace: "ওয়ার্কস্পেস", currentDocument: "বর্তমান ডকুমেন্ট", storage: "স্টোরেজ", localFiles: "স্থানীয় ফাইল", loading: "লোড হচ্ছে…", noDocument: "কোনো ডকুমেন্ট নির্বাচিত নয়", browserWorkspace: "ব্রাউজার ওয়ার্কস্পেস", localFolder: "স্থানীয় ফোল্ডার", connected: "সংযুক্ত", file: "ফাইল", filesCount: "ফাইল", files: "ফাইল", folder: "ফোল্ডার", browser: "ব্রাউজার", openFiles: "ফাইল খুলুন", filesOpen: "ফাইল খোলা", collapseFiles: "ফাইল সংকুচিত করুন", image: "ছবি", imageAsset: "ছবি সম্পদ", addImage: "এই প্রজেক্টে ছবি যোগ করুন", workspaceActions: "ওয়ার্কস্পেস কাজ", newFile: "নতুন ফাইল", newProject: "নতুন প্রজেক্ট", connectFolder: "স্থানীয় ফোল্ডার যুক্ত করুন", switchFolder: "স্থানীয় ফোল্ডার যুক্ত বা বদলান", refreshFolder: "স্থানীয় ফোল্ডার রিফ্রেশ", folderUnavailable: "এই ব্রাউজারে ফোল্ডার অ্যাক্সেস নেই", folderUnavailableLong: "এই ব্রাউজার স্থানীয় ফোল্ডার অ্যাক্সেস দেয় না। ব্রাউজার ওয়ার্কস্পেস ব্যবহার করা যাবে।", rename: "নাম বদলান", delete: "মুছুন", projects: "প্রজেক্ট", toggleView: "এডিটর/প্রিভিউ বদলান", preview: "প্রিভিউ", editor: "এডিটর", saved: "সংরক্ষিত", unsaved: "অসংরক্ষিত", saving: "সংরক্ষণ হচ্ছে…", saveFailed: "সংরক্ষণ ব্যর্থ", code: "কোড", codeControls: "কোড নিয়ন্ত্রণ", wrapOn: "র‍্যাপ: চালু", wrapOff: "র‍্যাপ: বন্ধ", toggleWrap: "লাইন র‍্যাপ বদলান", docs: "ডকস", downloadTyp: ".typ ডাউনলোড", loadingEditor: "এডিটর লোড হচ্ছে…", dragResize: "আকার বদলাতে টানুন", pdfControls: "PDF নিয়ন্ত্রণ", idle: "নিষ্ক্রিয়", previewZoom: "প্রিভিউ জুম", zoomOut: "জুম আউট", zoomIn: "জুম ইন", resetZoom: "আসল আকার", downloadPdf: "PDF ডাউনলোড", loadingPreview: "প্রিভিউ লোড হচ্ছে…", locateInstruction: "নিকটতম সোর্স লাইন পেতে Ctrl+ক্লিক করুন", nearestSource: "নিকটতম সোর্স", line: "লাইন", building: "তৈরি হচ্ছে…", pdfReady: "PDF প্রস্তুত", compiling: "কম্পাইল হচ্ছে…", error: "ত্রুটি", noRender: "এখনও সফল রেন্ডার নেই।", compilationFailed: "কম্পাইল ব্যর্থ", renderedDocument: "রেন্ডার করা ডকুমেন্ট", page: "পৃষ্ঠা", pages: "পৃষ্ঠা", newFilePrompt: "নতুন Typst ফাইল", projectNamePrompt: "প্রজেক্টের নাম", newProjectName: "নতুন প্রজেক্ট", imageAddFailed: "ছবিটি সক্রিয় প্রজেক্টে যোগ করা যায়নি।", renamePrompt: "ফাইলের নাম বদলান (পথ)", deleteFrom: "{location} থেকে {path} মুছবেন?", thisBrowser: "এই ব্রাউজার", folderLocation: "স্থানীয় ফোল্ডার “{name}”",
  privacyPage: { title: "গোপনীয়তা, চূড়ান্ত প্রতিশ্রুতি নয়", lead: "ডকুমেন্টের বিষয়বস্তু ডিফল্টভাবে আপনার ডিভাইসে প্রক্রিয়াকৃত হয়। অ্যাপ সরবরাহের জন্য ওয়েব অবকাঠামো প্রয়োজনীয় প্রযুক্তিগত তথ্য পরিচালনা করে।", back: "এডিটরে ফিরুন", sections: [["ডিভাইসে যা থাকে", "Typst সোর্স, প্রিভিউ ও এক্সপোর্ট ব্রাউজারে পরিচালিত হয়। প্রজেক্ট ব্রাউজার স্টোরেজ ব্যবহার করে। ফোল্ডার যুক্ত করলে অনুমতির পর Holi সেখানে পড়ে ও লেখে। এখন ক্লাউড স্টোরেজ বা সহযোগিতা নেই।"], ["হোস্টিং প্রদানকারী যা দেখতে পারে", "সাইট লোড বা আপডেট হলে Cloudflare IP, অনুরোধের সময়, সম্পদ, রাউটিং ও আনুমানিক ট্রাফিকের মতো প্রযুক্তিগত মেটাডেটা প্রক্রিয়া করতে পারে। এটি ডকুমেন্টের বিষয়বস্তু থেকে আলাদা।"], ["নেটওয়ার্ক কাজ", "অ্যাপ লোড/আপডেট ও বাহ্যিক Typst ডকস খুলতে সংযোগ লাগে। সম্পদ ক্যাশ হলে মূল কাজ অফলাইনে চলে। স্টোরেজ মুছে যেতে পারে এবং ফোল্ডার অনুমতি প্রত্যাহার করা যায়, তাই ব্যাকআপ রাখুন।"], ["পরিকল্পিত সহযোগিতা", "এই রিলিজে সহযোগিতা চালু নয়। চালুর আগে Holi এমন প্রোটোকল প্রকাশ করবে যেখানে কনটেন্ট কী অংশগ্রহণকারীদের কাছে থাকে এবং অবকাঠামো শুধু এনক্রিপ্টেড, মেয়াদী বার্তা সমন্বয় করে।"]], updated: "শেষ আপডেট: ২ সেপ্টেম্বর ২০২৬" },
};

const pt: TypstCopy = {
  ...en,
  metaTitle: "Holi Typst — editor local de documentos", metaDescription: "Escreva, visualize e exporte documentos Typst localmente no navegador.", productDescription: "Um espaço Typst local-first para escrever, visualizar e exportar documentos técnicos no navegador.", privacyTitle: "Resumo de privacidade", privacySummary: "A Holi não recebe o conteúdo dos documentos que você edita. A Cloudflare pode observar metadados técnicos da conexão.", privacyDetails: "Detalhes",
  privacyFacts: [["Processamento", "A compilação e a visualização do Typst rodam neste dispositivo via WebAssembly.", "local"], ["Armazenamento", "Os projetos ficam neste navegador ou em uma pasta local conectada explicitamente. Os dois modos permanecem neste dispositivo.", "local"], ["Uploads", "Abrir, editar e exportar um documento não envia seu conteúdo para a Holi.", "local"], ["Rede", "A conexão é usada para carregar ou atualizar o app e abrir links externos.", "connected"], ["Metadados de hospedagem", "A Cloudflare pode processar seu IP, horário da solicitação e dados de roteamento.", "connected"], ["Colaboração", "Não está ativa nesta versão; nenhum documento é compartilhado com outras pessoas.", "local"]],
  workspace: "Espaço de trabalho", currentDocument: "Documento atual", storage: "Armazenamento", localFiles: "Arquivos locais", loading: "Carregando…", noDocument: "Nenhum documento selecionado", browserWorkspace: "Espaço do navegador", localFolder: "Pasta local", connected: "conectada", file: "arquivo", filesCount: "arquivos", files: "Arquivos", folder: "Pasta", browser: "Navegador", openFiles: "Abrir arquivos", filesOpen: "Arquivos abertos", collapseFiles: "Recolher arquivos", image: "imagem", imageAsset: "recurso de imagem", addImage: "Adicionar imagem a este projeto", workspaceActions: "Ações do espaço", newFile: "Novo arquivo", newProject: "Novo projeto", connectFolder: "Conectar pasta local", switchFolder: "Conectar ou trocar pasta local", refreshFolder: "Atualizar pasta local", folderUnavailable: "O acesso a pastas não está disponível neste navegador", folderUnavailableLong: "Este navegador não oferece acesso a pastas locais. O espaço do navegador continua disponível.", rename: "renomear", delete: "excluir", projects: "Projetos", toggleView: "Alternar editor/visualização", preview: "visualização", editor: "editor", saved: "salvo", unsaved: "não salvo", saving: "salvando…", saveFailed: "falha ao salvar", code: "Código", codeControls: "Controles de código", wrapOn: "quebra: ligada", wrapOff: "quebra: desligada", toggleWrap: "Alternar quebra de linha", docs: "docs", downloadTyp: "baixar .typ", loadingEditor: "Carregando editor…", dragResize: "Arraste para redimensionar", pdfControls: "Controles de PDF", idle: "inativo", previewZoom: "Zoom da visualização", zoomOut: "Diminuir zoom", zoomIn: "Aumentar zoom", resetZoom: "Tamanho real", downloadPdf: "baixar PDF", loadingPreview: "Carregando visualização…", locateInstruction: "Ctrl+clique na visualização para localizar a linha de código mais próxima", nearestSource: "Código mais próximo", line: "linha", building: "gerando…", pdfReady: "PDF pronto", compiling: "compilando…", error: "erro", noRender: "Ainda não há renderização bem-sucedida.", compilationFailed: "Falha na compilação", renderedDocument: "Documento renderizado", page: "página", pages: "páginas", newFilePrompt: "Novo arquivo Typst", projectNamePrompt: "Nome do projeto", newProjectName: "Novo projeto", imageAddFailed: "Não foi possível adicionar esta imagem ao projeto ativo.", renamePrompt: "Renomear arquivo (caminho)", deleteFrom: "Excluir {path} de {location}?", thisBrowser: "este navegador", folderLocation: "a pasta local “{name}”",
  privacyPage: { title: "Privacidade, sem promessas absolutas", lead: "O conteúdo do documento é processado no seu dispositivo por padrão. A infraestrutura web ainda lida com as informações técnicas necessárias para entregar o aplicativo.", back: "Voltar ao editor", sections: [["O que fica no seu dispositivo", "O código Typst, as visualizações e as exportações são processados no navegador. Os projetos usam o armazenamento do navegador. Ao conectar uma pasta local, a Holi lê e grava nela após a permissão. Atualmente não há armazenamento em nuvem nem colaboração."], ["O que o provedor pode observar", "Ao carregar ou atualizar o site, a Cloudflare pode processar metadados técnicos como IP, horário, recurso solicitado, roteamento e volume aproximado. Isso é separado do conteúdo do documento."], ["Ações de rede", "Carregar ou atualizar o app e abrir a documentação externa exige conexão. Com os recursos em cache, o fluxo principal continua offline. O armazenamento pode ser apagado e a permissão da pasta revogada; mantenha backups."], ["Colaboração planejada", "A colaboração não está ativa. Antes de ativá-la, a Holi publicará e testará um protocolo em que as chaves ficam com os participantes e a infraestrutura coordena apenas mensagens criptografadas e temporárias."]], updated: "Última atualização: 2 de setembro de 2026" },
};

export const translations: Record<LanguageCode, TypstCopy> = { en, es, zh, hi, ar, bn, pt };

export function getTypstCopy(lang: string): TypstCopy {
  return translations[lang as LanguageCode] ?? en;
}
