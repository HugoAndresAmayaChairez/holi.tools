import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { Compartment, EditorState, type Text } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import {
  lintGutter,
  setDiagnostics as cmSetDiagnostics,
  type Diagnostic as CmDiagnostic,
} from "@codemirror/lint";
import { tags } from "@lezer/highlight";
import { typst } from "codemirror-lang-typst";

const typstEditorHighlight = HighlightStyle.define([
  {
    tag: tags.heading,
    color: "var(--typst-syntax-heading) !important",
    fontWeight: "700",
    textDecoration: "none !important",
  },
  {
    tag: tags.comment,
    color: "var(--typst-syntax-comment) !important",
    fontStyle: "italic",
  },
  {
    tag: [
      tags.keyword,
      tags.controlKeyword,
      tags.moduleKeyword,
      tags.operatorKeyword,
      tags.definitionKeyword,
    ],
    color: "var(--typst-syntax-keyword) !important",
    fontWeight: "600",
  },
  {
    tag: [tags.variableName, tags.propertyName, tags.typeName, tags.labelName],
    color: "var(--typst-syntax-name) !important",
  },
  {
    tag: [tags.string, tags.link, tags.quote, tags.monospace],
    color: "var(--typst-syntax-string) !important",
  },
  {
    tag: [tags.number, tags.integer, tags.float, tags.bool, tags.literal],
    color: "var(--typst-syntax-number) !important",
  },
  {
    tag: [
      tags.brace,
      tags.bracket,
      tags.paren,
      tags.punctuation,
      tags.separator,
    ],
    color: "var(--typst-syntax-punctuation) !important",
  },
  {
    tag: tags.invalid,
    color: "var(--typst-syntax-invalid) !important",
    textDecoration: "underline wavy",
  },
]);

/** 1-based line and column. */
export interface EditorPosition {
  line: number;
  column: number;
}

export interface EditorDiagnostic {
  severity: "error" | "warning" | "info";
  message: string;
  from: EditorPosition;
  to?: EditorPosition;
}

export interface EditorController {
  view: EditorView;
  setWrap: (enabled: boolean) => void;
  /** Move the cursor to a line (and optional 1-based column) and scroll it into view. */
  revealLine: (lineNumber: number, column?: number) => void;
  /** Replace the compiler diagnostics shown in the gutter and as underlines. */
  setDiagnostics: (diagnostics: EditorDiagnostic[]) => void;
}

export interface EditorOptions {
  wrap?: boolean;
}

function offsetAt(doc: Text, position: EditorPosition): number {
  const lineNumber = Math.max(1, Math.min(doc.lines, Math.round(position.line)));
  const line = doc.line(lineNumber);
  const column = Math.max(0, Math.min(line.length, Math.round(position.column) - 1));
  return line.from + column;
}

export function createEditor(
  element: HTMLElement,
  initialContent: string,
  onChange?: (doc: string) => void,
  options: EditorOptions = {}
): EditorController {
  let languageExtension;
  try {
    languageExtension = typst();
  } catch {
    languageExtension = markdown();
  }

  const wrapCompartment = new Compartment();

  const selectionColor =
    "color-mix(in oklab, var(--color-accent) 28%, transparent)";
  const activeLineColor =
    "color-mix(in oklab, var(--typst-workspace-text) 6%, transparent)";
  const gutterTextColor =
    "color-mix(in oklab, var(--typst-workspace-text) 55%, transparent)";
  const subtleBorder =
    "var(--typst-workspace-border)";

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && onChange) {
      onChange(update.state.doc.toString());
    }
  });

  const state = EditorState.create({
    doc: initialContent,
    extensions: [
      basicSetup,
      languageExtension,
      syntaxHighlighting(typstEditorHighlight),
      // Tab indents like a code editor; Ctrl-m (Shift-Alt-m on macOS)
      // toggles tab-focus mode for keyboard users who need to leave the editor.
      keymap.of([...defaultKeymap, indentWithTab]),
      lintGutter(),
      updateListener,
      wrapCompartment.of(options.wrap ? EditorView.lineWrapping : []),
      EditorView.theme({
        "&": { height: "100%", width: "100%" },
        ".cm-scroller": {
          overflow: "auto",
          height: "100%",
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          lineHeight: "1.65",
        },
        ".cm-editor": { height: "100%" },
        ".cm-content": { minHeight: "100%" },
      }),
      EditorView.theme({
        "&.cm-editor": {
          backgroundColor: "transparent",
          color: "var(--typst-code-text)",
        },
        ".cm-content, .cm-line": {
          color: "var(--typst-code-text)",
        },
        ".cm-gutters": {
          backgroundColor: "transparent",
          color: gutterTextColor,
          borderRight: `1px solid ${subtleBorder}`,
        },
        ".cm-gutterElement": {
          color: gutterTextColor,
        },
        ".cm-activeLine": { backgroundColor: activeLineColor },
        ".cm-activeLineGutter": {
          backgroundColor: activeLineColor,
          color: "var(--typst-workspace-text)",
        },
        ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
          backgroundColor: selectionColor,
        },
        "&.cm-focused .cm-cursor": { borderLeftColor: "var(--color-accent)" },
        "&.cm-focused .cm-selectionMatch": { backgroundColor: selectionColor },
        "&.cm-focused .cm-matchingBracket": {
          backgroundColor: selectionColor,
          outline: `1px solid ${subtleBorder}`,
        },
        ".cm-link, .cm-url, .cm-string": {
          color: "color-mix(in oklab, var(--color-accent) 35%, #22c55e)",
        },
        ".cm-keyword, .cm-operator": {
          color: "var(--color-accent)",
        },
        ".cm-variableName, .cm-propertyName, .cm-typeName, .cm-definition": {
          color:
            "color-mix(in oklab, var(--typst-workspace-text) 88%, var(--color-accent))",
        },
        ".cm-function, .cm-className": {
          color:
            "color-mix(in oklab, var(--color-accent) 72%, var(--typst-workspace-text))",
        },
        ".cm-comment": {
          color: "color-mix(in oklab, var(--typst-workspace-text) 55%, var(--typst-editor-bg))",
        },
        ".cm-number": {
          color: "color-mix(in oklab, var(--color-accent) 55%, #f59e0b)",
        },
        ".cm-foldPlaceholder": {
          backgroundColor: selectionColor,
          border: `1px solid ${subtleBorder}`,
          color: "var(--typst-workspace-text)",
        },
        ".cm-tooltip": {
          backgroundColor: "color-mix(in oklab, var(--typst-editor-bg) 92%, black)",
          color: "var(--typst-workspace-text)",
          border: `1px solid ${subtleBorder}`,
        },
      }),
    ],
  });

  const view = new EditorView({
    state,
    parent: element,
  });

  function setWrap(enabled: boolean) {
    view.dispatch({
      effects: wrapCompartment.reconfigure(
        enabled ? EditorView.lineWrapping : []
      ),
    });
  }

  function revealLine(lineNumber: number, column = 1) {
    const anchor = offsetAt(view.state.doc, { line: lineNumber, column });
    view.dispatch({
      selection: { anchor },
      effects: EditorView.scrollIntoView(anchor, { y: "center" }),
    });
    view.focus();
  }

  function setDiagnostics(diagnostics: EditorDiagnostic[]) {
    const doc = view.state.doc;
    const mapped: CmDiagnostic[] = diagnostics.map((diagnostic) => {
      const from = offsetAt(doc, diagnostic.from);
      let to = diagnostic.to ? offsetAt(doc, diagnostic.to) : from;
      if (to < from) to = from;
      if (to === from) {
        // Give zero-length ranges one visible character where possible.
        to = Math.min(doc.lineAt(from).to, from + 1);
      }
      return { from, to, severity: diagnostic.severity, message: diagnostic.message };
    });
    view.dispatch(cmSetDiagnostics(view.state, mapped));
  }

  return { view, setWrap, revealLine, setDiagnostics };
}
