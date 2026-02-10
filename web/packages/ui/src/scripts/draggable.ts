/**
 * draggable.ts - Lightweight draggable behavior script
 * Apply to any element with data-draggable="true"
 * 
 * Attributes:
 * - data-draggable="true" - Enables drag
 * - data-persist-id="<key>" - Saves position to localStorage
 * - data-initial-x="<px>" - Initial X offset
 * - data-initial-y="<px>" - Initial Y offset
 */

function initDraggables() {
    const draggables = document.querySelectorAll(
        '[data-draggable="true"]'
    ) as NodeListOf<HTMLElement>;

    draggables.forEach((el) => {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;

        const persistId = el.dataset.persistId;
        const initX = parseFloat(el.dataset.initialX || "0");
        const initY = parseFloat(el.dataset.initialY || "0");

        // Load persisted or initial position
        if (persistId) {
            const saved = localStorage.getItem(`drag-pos-${persistId}`);
            if (saved) {
                const pos = JSON.parse(saved);
                currentX = pos.x;
                currentY = pos.y;
            } else {
                currentX = initX;
                currentY = initY;
            }
        } else {
            currentX = initX;
            currentY = initY;
        }

        // Apply position
        if (currentX || currentY) {
            el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }

        const onStart = (e: MouseEvent | TouchEvent) => {
            // Ignore interactive elements inside
            const target = e.target as HTMLElement;
            if (target.closest("a, button, input, textarea, select") && target !== el) {
                return;
            }

            isDragging = true;
            el.classList.add("is-dragging");

            const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
            const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
            startX = clientX;
            startY = clientY;
        };

        const onMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging) return;
            e.preventDefault();

            const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
            const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;

            const dx = clientX - startX;
            const dy = clientY - startY;

            el.style.transform = `translate3d(${currentX + dx}px, ${currentY + dy}px, 0)`;
        };

        const onEnd = (e: MouseEvent | TouchEvent) => {
            if (!isDragging) return;
            isDragging = false;
            el.classList.remove("is-dragging");

            const clientX =
                e instanceof MouseEvent ? e.clientX : (e as TouchEvent).changedTouches?.[0]?.clientX || 0;
            const clientY =
                e instanceof MouseEvent ? e.clientY : (e as TouchEvent).changedTouches?.[0]?.clientY || 0;

            currentX += clientX - startX;
            currentY += clientY - startY;

            if (persistId) {
                localStorage.setItem(`drag-pos-${persistId}`, JSON.stringify({ x: currentX, y: currentY }));
            }
        };

        el.addEventListener("mousedown", onStart);
        el.addEventListener("touchstart", onStart, { passive: false });
        window.addEventListener("mousemove", onMove);
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("mouseup", onEnd);
        window.addEventListener("touchend", onEnd);
    });
}

// Auto-init
if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initDraggables);
    } else {
        initDraggables();
    }
}

export { initDraggables };
