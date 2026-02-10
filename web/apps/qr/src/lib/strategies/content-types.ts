/**
 * Content Strategy Pattern for QR Data Generation
 * Decouples content extraction logic from the controller
 */

export interface InputElements {
    [key: string]: HTMLElement | null;
}

export interface ContentStrategy {
    getData(els: InputElements): string;
}

const getVal = (el: HTMLElement | null): string => (el as HTMLInputElement)?.value?.trim() || "";

export const strategies: Record<string, ContentStrategy> = {
    url: {
        getData: (els) => {
            // Special handling for url input which might be duplicated
            const urlIn = document.getElementById("input-url") as HTMLInputElement;
            return urlIn?.value.trim() || getVal(els.urlInput);
        }
    },
    text: {
        getData: (els) => getVal(els.textInput)
    },
    wifi: {
        getData: (els) => {
            const ssid = getVal(els.wifiSsid);
            const pass = getVal(els.wifiPass);
            const enc = (els.wifiEnc as HTMLInputElement)?.value || "WPA";
            return ssid ? `WIFI:S:${ssid};T:${enc};P:${pass};;` : "";
        }
    },
    vcard: {
        getData: (els) => {
            const name = getVal(els.vcardName);
            const phone = getVal(els.vcardPhone);
            const email = getVal(els.vcardEmail);
            const company = getVal(els.vcardCompany);
            return name ? `BEGIN:VCARD\nVERSION:3.0\nN:${name}\nFN:${name}\nTEL:${phone}\nEMAIL:${email}\nORG:${company}\nEND:VCARD` : "";
        }
    },
    appstore: {
        getData: (els) => getVal(els.appstoreInput)
    },
    playstore: {
        getData: (els) => getVal(els.playstoreInput)
    },
    facebook: {
        getData: (els) => getVal(els.fbInput)
    },
    twitter: {
        getData: (els) => getVal(els.twitterInput)
    },
    youtube: {
        getData: (els) => getVal(els.ytInput)
    },
    phone: {
        getData: (els) => {
            const val = getVal(els.phoneInput);
            return val ? `tel:${val}` : "";
        }
    },
    email: {
        getData: (els) => {
            const emailTo = getVal(els.emailAddr);
            if (!emailTo) return "";

            let emailUri = `mailto:${emailTo}`;
            const params: string[] = [];

            const sub = (els.emailSub as HTMLInputElement)?.value;
            if (sub) params.push(`subject=${encodeURIComponent(sub)}`);

            const body = (els.emailBody as HTMLInputElement)?.value;
            if (body) params.push(`body=${encodeURIComponent(body)}`);

            if (params.length) emailUri += `?${params.join("&")}`;
            return emailUri;
        }
    },
    sms: {
        getData: (els) => {
            const smsNum = getVal(els.smsPhone);
            const smsMsg = (els.smsMsg as HTMLInputElement)?.value;
            return smsNum ? (smsMsg ? `smsto:${smsNum}:${smsMsg}` : `smsto:${smsNum}`) : "";
        }
    },
    location: {
        getData: (els) => {
            const lat = (els.locLat as HTMLInputElement)?.value;
            const long = (els.locLong as HTMLInputElement)?.value;
            return (lat && long) ? `geo:${lat},${long}` : "";
        }
    },
    event: {
        getData: (els) => {
            const title = (els.eventTitle as HTMLInputElement)?.value;
            const start = (els.eventStart as HTMLInputElement)?.value;
            return (title && start) ?
                `BEGIN:VEVENT\nSUMMARY:${title}\nDTSTART:${start.replace(/[-:]/g, "").replace("T", "")}00\nEND:VEVENT` : "";
        }
    },
    bitcoin: {
        getData: (els) => {
            const addr = (els.btcAddr as HTMLInputElement)?.value;
            const amt = (els.btcAmount as HTMLInputElement)?.value;
            return addr ? `bitcoin:${addr}${amt ? `?amount=${amt}` : ''}` : "";
        }
    }
};
