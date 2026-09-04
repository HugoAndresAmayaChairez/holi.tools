export class HoliButton extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this.render();
    }

    render() {
        if (!this.shadowRoot) return;

        this.shadowRoot.innerHTML = `
      <style>
        button {
          background-color: var(--color-bg, #ffffff);
          color: var(--color-text, #000000);
          border: 2px solid var(--color-border, #000000);
          padding: 0.5rem 1rem;
          font-family: inherit;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 4px 4px 0px var(--color-border, #000000);
        }
        button:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0px var(--color-border, #000000);
        }
        button:active {
          transform: translate(0px, 0px);
          box-shadow: 2px 2px 0px var(--color-border, #000000);
        }
      </style>
      <button>
        <slot></slot>
      </button>
    `;
    }
}

customElements.define("holi-button", HoliButton);
