/**
 * Math authoring data for the editor palette.
 *
 * Every entry is a LaTeX snippet that can be dropped straight into a prompt or
 * solution. `kind` controls how the editor wraps the snippet:
 *  - `raw`     insert as-is
 *  - `bracket` wrap in \left( \right)
 *  - `script`  superscript
 *  - `sub`     subscript
 *  - `accent`  wrap in a text-mode command
 *  - `func`    wrap in \operatorname{}
 */

export type SnippetKind = "raw" | "bracket" | "script" | "sub" | "accent" | "func";

export type MathSymbol = {
  /** Shown in the palette button. */
  label: string;
  /** Inserted LaTeX. */
  latex: string;
  /** Optional spoken name for the title attribute. */
  name?: string;
  kind?: SnippetKind;
};

export type MathGroup = {
  id: string;
  label: string;
  hint: string;
  symbols: MathSymbol[];
};

export const MATH_GROUPS: MathGroup[] = [
  {
    id: "operators",
    label: "Operations",
    hint: "Arithmetic and grouping",
    symbols: [
      { label: "+", latex: "+" },
      { label: "−", latex: "-" },
      { label: "×", latex: "\\times" },
      { label: "÷", latex: "\\div" },
      { label: "±", latex: "\\pm" },
      { label: "∓", latex: "\\mp" },
      { label: "·", latex: "\\cdot" },
      { label: "∞", latex: "\\infty" },
      { label: "( )", latex: ".", kind: "bracket" },
      { label: "[ ]", latex: ".", kind: "bracket", name: "square bracket" },
      { label: "{ }", latex: ".", kind: "bracket", name: "curly bracket" },
      { label: "|x|", latex: ".", kind: "bracket", name: "absolute value" },
      { label: "⌈x⌉", latex: "\\left\\lceil . \\right\\rceil" },
      { label: "n!", latex: "n!" },
      { label: "%", latex: "\\%" },
    ],
  },
  {
    id: "relations",
    label: "Relations",
    hint: "Comparisons and equalities",
    symbols: [
      { label: "=", latex: "=" },
      { label: "≠", latex: "\\neq" },
      { label: "≈", latex: "\\approx" },
      { label: "≡", latex: "\\equiv" },
      { label: "<", latex: "<" },
      { label: ">", latex: ">" },
      { label: "≤", latex: "\\leq" },
      { label: "≥", latex: "\\geq" },
      { label: "≪", latex: "\\ll" },
      { label: "≫", latex: "\\gg" },
      { label: "∝", latex: "\\propto" },
      { label: "∼", latex: "\\sim" },
    ],
  },
  {
    id: "greek",
    label: "Greek letters",
    hint: "Lowercase and uppercase Greek",
    symbols: [
      { label: "α", latex: "\\alpha" },
      { label: "β", latex: "\\beta" },
      { label: "γ", latex: "\\gamma" },
      { label: "δ", latex: "\\delta" },
      { label: "ε", latex: "\\varepsilon" },
      { label: "θ", latex: "\\theta" },
      { label: "λ", latex: "\\lambda" },
      { label: "μ", latex: "\\mu" },
      { label: "π", latex: "\\pi" },
      { label: "σ", latex: "\\sigma" },
      { label: "φ", latex: "\\phi" },
      { label: "ω", latex: "\\omega" },
      { label: "Δ", latex: "\\Delta" },
      { label: "Σ", latex: "\\Sigma" },
      { label: "Ω", latex: "\\Omega" },
      { label: "Θ", latex: "\\Theta" },
      { label: "Φ", latex: "\\Phi" },
      { label: "Ψ", latex: "\\Psi" },
    ],
  },
  {
    id: "sets",
    label: "Sets and logic",
    hint: "Set membership, logic, and number sets",
    symbols: [
      { label: "∈", latex: "\\in" },
      { label: "∉", latex: "\\notin" },
      { label: "⊂", latex: "\\subset" },
      { label: "⊆", latex: "\\subseteq" },
      { label: "∪", latex: "\\cup" },
      { label: "∩", latex: "\\cap" },
      { label: "∅", latex: "\\varnothing" },
      { label: "ℝ", latex: "\\mathbb{R}" },
      { label: "ℕ", latex: "\\mathbb{N}" },
      { label: "ℤ", latex: "\\mathbb{Z}" },
      { label: "ℚ", latex: "\\mathbb{Q}" },
      { label: "∀", latex: "\\forall" },
      { label: "∃", latex: "\\exists" },
      { label: "¬", latex: "\\neg" },
      { label: "∧", latex: "\\land" },
      { label: "∨", latex: "\\lor" },
    ],
  },
  {
    id: "arrows",
    label: "Arrows",
    hint: "Directions and mappings",
    symbols: [
      { label: "→", latex: "\\rightarrow" },
      { label: "←", latex: "\\leftarrow" },
      { label: "↔", latex: "\\leftrightarrow" },
      { label: "⇒", latex: "\\Rightarrow" },
      { label: "⇐", latex: "\\Leftarrow" },
      { label: "⇔", latex: "\\Leftrightarrow" },
      { label: "↦", latex: "\\mapsto" },
      { label: "⇒", latex: "\\implies", name: "implies" },
    ],
  },
  {
    id: "calculus",
    label: "Calculus",
    hint: "Limits, derivatives, integrals",
    symbols: [
      { label: "lim", latex: "\\lim_{x \\to .}", kind: "func" },
      { label: "d/dx", latex: "\\frac{d}{dx}", name: "derivative operator" },
      { label: "∂/∂x", latex: "\\frac{\\partial}{\\partial x}" },
      { label: "∫", latex: "\\int" },
      { label: "∮", latex: "\\oint" },
      { label: "∑", latex: "\\sum" },
      { label: "∏", latex: "\\prod" },
      { label: "√", latex: "\\sqrt{.}" },
      { label: "∛", latex: "\\sqrt[3]{.}" },
      { label: "ⁿ√", latex: "\\sqrt[n]{.}", name: "nth root" },
      { label: "dx", latex: "\\,dx" },
    ],
  },
  {
    id: "trig",
    label: "Trigonometry",
    hint: "Inverse, hyperbolic, and degree symbols",
    symbols: [
      { label: "sin", latex: "\\sin", kind: "func" },
      { label: "cos", latex: "\\cos", kind: "func" },
      { label: "tan", latex: "\\tan", kind: "func" },
      { label: "sec", latex: "\\sec", kind: "func" },
      { label: "cosec", latex: "\\csc", kind: "func" },
      { label: "cot", latex: "\\cot", kind: "func" },
      { label: "sin⁻¹", latex: "\\sin^{-1}" },
      { label: "°", latex: "^{\\circ}" },
      { label: "sinh", latex: "\\sinh", kind: "func" },
      { label: "cosh", latex: "\\cosh", kind: "func" },
      { label: "tanh", latex: "\\tanh", kind: "func" },
    ],
  },
  {
    id: "logs",
    label: "Logs and powers",
    hint: "Exponentials and logarithms",
    symbols: [
      { label: "log", latex: "\\log", kind: "func" },
      { label: "ln", latex: "\\ln", kind: "func" },
      { label: "log₂", latex: "\\log_{2}" },
      { label: "aⁿ", latex: "{}^{n}" },
      { label: "aⁿ⁻¹", latex: "{}^{n-1}" },
      { label: "eˣ", latex: "e^{x}" },
      { label: "2ˣ", latex: "2^{x}" },
    ],
  },
  {
    id: "matrices",
    label: "Matrices",
    hint: "Arrays and determinants",
    symbols: [
      { label: "( )", latex: "\\begin{pmatrix} . \\end{pmatrix}", name: "matrix" },
      { label: "[ ]", latex: "\\begin{bmatrix} . \\end{bmatrix}", name: "square matrix" },
      { label: "| |", latex: "\\begin{vmatrix} . \\end{vmatrix}", name: "determinant" },
      { label: "x̄", latex: "\\bar{x}" },
      { label: "x̂", latex: "\\hat{x}" },
      { label: "x⃗", latex: "\\vec{x}" },
      { label: "…", latex: "\\ldots" },
      { label: "⋮", latex: "\\vdots" },
    ],
  },
];

/** Builds the LaTeX for a symbol, leaving `.` as the caret slot. */
export function renderSymbol(symbol: MathSymbol, content = ""): string {
  const hasSlot = symbol.latex.includes(".");
  const inner = hasSlot ? symbol.latex.replaceAll(".", content || " ") : symbol.latex;

  switch (symbol.kind) {
    case "bracket": {
      const open = symbol.latex.startsWith("[") ? "[" : symbol.latex.startsWith("{") ? "\\{" : symbol.latex.startsWith("|") ? "|" : "(";
      const close = symbol.latex.startsWith("[") ? "]" : symbol.latex.startsWith("{") ? "\\}" : symbol.latex.startsWith("|") ? "|" : ")";
      return `\\left${open} ${inner} \\right${close}`;
    }
    case "script":
      return `^{${content || " "}}`;
    case "sub":
      return `_{${content || " "}}`;
    case "accent":
      return `${symbol.latex}{${content || " "}}`;
    case "func":
      return symbol.latex.includes(".") ? inner : `\\operatorname{${symbol.latex}} `;
    default:
      return inner;
  }
}
