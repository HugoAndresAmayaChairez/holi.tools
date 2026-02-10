import { colorizeSvg } from './svg-utils';

// Collection of raw SVG logos from Simple Icons and other sources
// Stored as raw XML strings for maximum flexibility

const svgToDataUri = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`;

// Official Simple Icons (and generic Wifi)
export const RAW_ICONS = {
    facebook: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Facebook</title><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>`,
    
    twitter: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>X</title><path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/></svg>`,
    
    youtube: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>YouTube</title><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    
    bitcoin: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Bitcoin</title><path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084v.006z"/></svg>`,
    
    apple: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Apple</title><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>`,
    
    playstore: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Google Play</title><path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"/></svg>`,
    
    wifi: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>WiFi</title><path d="M12 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-4.24-4.24l1.41 1.41C10.07 14.29 11 14 12 14s1.93.29 2.83.88l1.41-1.41C14.9 12.52 13.5 12 12 12s-2.9.52-4.24 1.76zm-2.83-2.83l1.41 1.41C8.11 10.59 9.97 10 12 10s3.89.59 5.66 1.76l1.41-1.41C16.82 8.58 14.53 8 12 8s-4.82.58-7.07 2.93z"/></svg>`,
};

export const BRAND_COLORS = {
    facebook: '#1877F2',
    twitter: '#000000',
    youtube: '#FF0000',
    bitcoin: '#F7931A',
    appstore: '#000000',
    playstore: '#000000',
    wifi: '#000000',
};

// Helper to wrap the icon in a white circle (legacy behavior for center logos)
function createCircleIcon(rawSvg: string, color: string): string {
    const content = rawSvg.replace(/<svg[^>]*>/, '').replace('</svg>', '');
    // Scale down to ~65% and center to fit within the r=12 circle
    // 24 * 0.65 = 15.6. (24 - 15.6)/2 = 4.2.
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="12" fill="white"/>
        <g transform="translate(4.2, 4.2) scale(0.65)" fill="${color}">
            ${content}
        </g>
    </svg>`;
}

export const BRAND_LOGOS = {
    facebook: svgToDataUri(createCircleIcon(RAW_ICONS.facebook, BRAND_COLORS.facebook)),
    twitter: svgToDataUri(createCircleIcon(RAW_ICONS.twitter, BRAND_COLORS.twitter)),
    youtube: svgToDataUri(createCircleIcon(RAW_ICONS.youtube, BRAND_COLORS.youtube)),
    bitcoin: svgToDataUri(createCircleIcon(RAW_ICONS.bitcoin, BRAND_COLORS.bitcoin)),
    appstore: svgToDataUri(createCircleIcon(RAW_ICONS.apple, BRAND_COLORS.appstore)),
    playstore: svgToDataUri(createCircleIcon(RAW_ICONS.playstore, BRAND_COLORS.playstore)),
    wifi: svgToDataUri(createCircleIcon(RAW_ICONS.wifi, BRAND_COLORS.wifi)),
};

export const BRAND_ICONS = {
    facebook: svgToDataUri(colorizeSvg(RAW_ICONS.facebook, 'white')),
    twitter: svgToDataUri(colorizeSvg(RAW_ICONS.twitter, 'white')),
    youtube: svgToDataUri(colorizeSvg(RAW_ICONS.youtube, 'white')),
    bitcoin: svgToDataUri(colorizeSvg(RAW_ICONS.bitcoin, 'white')),
    appstore: svgToDataUri(colorizeSvg(RAW_ICONS.apple, 'white')),
    playstore: svgToDataUri(colorizeSvg(RAW_ICONS.playstore, 'white')),
    wifi: svgToDataUri(colorizeSvg(RAW_ICONS.wifi, 'white')),
};

export const getTypeLogo = (type: string) => {
    return (BRAND_LOGOS as any)[type] || undefined;
};

export const getTypeIcon = (type: string) => {
    return (BRAND_ICONS as any)[type] || undefined;
};

export const getColorizedTypeLogo = (type: string, color: string) => {
    const raw = (RAW_ICONS as any)[type];
    if (!raw) return undefined;

    let finalColor = color;
    if (color === 'white') finalColor = '#FFFFFF';
    if (color === 'black') finalColor = '#000000';

    return svgToDataUri(createCircleIcon(raw, finalColor));
};