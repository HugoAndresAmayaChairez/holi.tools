export type ToastType = 'success' | 'error' | 'info';

export interface ToastPayload {
    id: string;
    type: ToastType;
    message: string;
    duration: number;
}

export const toast = {
    activeToasts: new Set<string>(),

    show(type: ToastType, message: string, duration = 4000) {
        const id = crypto.randomUUID();
        const event = new CustomEvent<ToastPayload>('holi-toast', {
            detail: { id, type, message, duration }
        });
        window.dispatchEvent(event);
    },

    success(message: string, duration?: number) {
        this.show('success', message, duration);
    },

    error(message: string, duration?: number) {
        this.show('error', message, duration);
    },

    info(message: string, duration?: number) {
        this.show('info', message, duration);
    }
};
