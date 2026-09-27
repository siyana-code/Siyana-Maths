/**
 * Equation layout builders and geometry shape creators.
 *
 * Layouts return LaTeX that the editor drops into a prompt or solution.
 * Shapes return an inline SVG plus a caption describing the figure, so the
 * author can compare the generated sketch against the real one and attach an
 * accurate image from the question screen.
 */

export type LayoutField = {
  key: string;
  label: string;
  placeholder: string;
  kind?: "text" | "number";
};

export type EquationLayout = {
  id: string;
  label: string;
  glyph: string;
  fields: LayoutField[];
  build: (values: Record<string, string>) => string;
};

export const EQUATION_LAYOUTS: EquationLayout[] = [
  {
    id: "fraction",
    label: "Fraction",
    glyph: "a⁄b",
    fields: [
      { key: "a", label: "Numerator", placeholder: "x + 2" },
      { key: "b", label: "Denominator", placeholder: "y - 1" },
    ],
    build: (v) => `\\frac{${v.a || " "}}{${v.b || " "}}`,
  },
  {
    id: "sqrt",
    label: "Square root",
    glyph: "√a",
    fields: [{ key: "a", label: "Radicand", placeholder: "x^2 + y^2" }],
    build: (v) => `\\sqrt{${v.a || " "}}`,
  },
  {
    id: "nth-root",
    label: "Nth root",
    glyph: "ⁿ√a",
    fields: [
      { key: "a", label: "Index", placeholder: "3", kind: "number" },
      { key: "b", label: "Radicand", placeholder: "27" },
    ],
    build: (v) => `\\sqrt[${v.a || " "}]{${v.b || " "}}`,
  },
  {
    id: "power",
    label: "Exponent",
    glyph: "aⁿ",
    fields: [
      { key: "a", label: "Base", placeholder: "2" },
      { key: "b", label: "Exponent", placeholder: "n" },
    ],
    build: (v) => `{${v.a || " "}}^{${v.b || " "}}`,
  },
  {
    id: "subscript",
    label: "Subscript",
    glyph: "aₙ",
    fields: [
      { key: "a", label: "Base", placeholder: "x" },
      { key: "b", label: "Index", placeholder: "1" },
    ],
    build: (v) => `{${v.a || " "}}_{${v.b || " "}}`,
  },
  {
    id: "mixed",
    label: "Mixed number",
    glyph: "a b⁄c",
    fields: [
      { key: "a", label: "Whole", placeholder: "2" },
      { key: "b", label: "Numerator", placeholder: "1" },
      { key: "c", label: "Denominator", placeholder: "3" },
    ],
    build: (v) => `${v.a || " "}\\frac{${v.b || " "}}{${v.c || " "}}`,
  },
  {
    id: "quadratic",
    label: "Quadratic",
    glyph: "ax²+bx+c",
    fields: [
      { key: "a", label: "a", placeholder: "1", kind: "number" },
      { key: "b", label: "b", placeholder: "-5", kind: "number" },
      { key: "c", label: "c", placeholder: "6", kind: "number" },
    ],
    build: (v) => {
      const b = Number(v.b || 0);
      const c = Number(v.c || 0);
      return `${v.a || " "}x^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}x ${c < 0 ? "-" : "+"} ${Math.abs(c)}`;
    },
  },
  {
    id: "binomial",
    label: "Combination",
    glyph: "nCr",
    fields: [
      { key: "a", label: "n", placeholder: "10", kind: "number" },
      { key: "b", label: "r", placeholder: "3", kind: "number" },
    ],
    build: (v) => `{}^{${v.a || " "}}C_{${v.b || " "}}`,
  },
  {
    id: "permutation",
    label: "Permutation",
    glyph: "nPr",
    fields: [
      { key: "a", label: "n", placeholder: "10", kind: "number" },
      { key: "b", label: "r", placeholder: "3", kind: "number" },
    ],
    build: (v) => `{}^{${v.a || " "}}P_{${v.b || " "}}`,
  },
  {
    id: "interval",
    label: "Interval",
    glyph: "[a, b]",
    fields: [
      { key: "a", label: "From", placeholder: "0", kind: "number" },
      { key: "b", label: "To", placeholder: "5", kind: "number" },
    ],
    build: (v) => `\\left[${v.a || " "}, ${v.b || " "}\\right]`,
  },
  {
    id: "system",
    label: "Simultaneous",
    glyph: "{x=…",
    fields: [
      { key: "a", label: "First equation", placeholder: "x + y = 5" },
      { key: "b", label: "Second equation", placeholder: "x - y = 1" },
    ],
    build: (v) => `\\begin{cases} ${v.a || " "} \\\\ ${v.b || " "} \\end{cases}`,
  },
  {
    id: "log",
    label: "Logarithm",
    glyph: "logₐ b",
    fields: [
      { key: "a", label: "Base", placeholder: "2" },
      { key: "b", label: "Value", placeholder: "32" },
    ],
    build: (v) => `\\log_{${v.a || " "}}{${v.b || " "}}`,
  },
  {
    id: "integral",
    label: "Definite integral",
    glyph: "∫ₐᵇ",
    fields: [
      { key: "a", label: "Integrand", placeholder: "x" },
      { key: "b", label: "Lower", placeholder: "0" },
      { key: "c", label: "Upper", placeholder: "2" },
    ],
    build: (v) => `\\int_{${v.b || " "}}^{${v.c || " "}} ${v.a || " "}\\,dx`,
  },
  {
    id: "sum",
    label: "Summation",
    glyph: "Σ",
    fields: [
      { key: "a", label: "Term", placeholder: "k^2" },
      { key: "b", label: "From", placeholder: "1" },
      { key: "c", label: "To", placeholder: "n" },
    ],
    build: (v) => `\\sum_{${v.b || " "}}^{${v.c || " "}} ${v.a || " "}`,
  },
];

/* ------------------------------------------------------------------ shapes */

const STROKE = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const DOT = 'fill="currentColor"';

export type ShapeOption = {
  /** Inserted into the question text. */
  caption: string;
  /** Inner SVG markup on a 120x90 viewBox. Authored here, never user input. */
  svg: string;
  width: number;
  height: number;
};

export type ShapeTool = {
  id: string;
  label: string;
  description: string;
  options: ShapeOption[];
};

export const SHAPE_TOOLS: ShapeTool[] = [
  {
    id: "triangle",
    label: "Triangle",
    description: "scalene, right-angled, isosceles",
    options: [
      {
        caption: "[Figure: a triangle ABC]",
        width: 120,
        height: 90,
        svg: `<polygon points="14,78 106,78 62,14" ${STROKE}/><text x="6" y="88" font-size="12">A</text><text x="108" y="88" font-size="12">B</text><text x="60" y="10" font-size="12">C</text>`,
      },
      {
        caption: "[Figure: a right-angled triangle ABC with a right angle at A]",
        width: 120,
        height: 90,
        svg: `<polygon points="14,78 106,78 14,14" ${STROKE}/><path d="M14 56 L36 56 L36 78" ${STROKE}/><text x="4" y="12" font-size="12">A</text><text x="108" y="88" font-size="12">B</text><text x="4" y="70" font-size="12">C</text>`,
      },
      {
        caption: "[Figure: an isosceles triangle ABC where AB equals AC]",
        width: 120,
        height: 90,
        svg: `<polygon points="14,78 106,78 60,16" ${STROKE}/><path d="M60 22 L60 78" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/><text x="4" y="88" font-size="12">B</text><text x="108" y="88" font-size="12">C</text><text x="58" y="12" font-size="12">A</text>`,
      },
    ],
  },
  {
    id: "circle",
    label: "Circle",
    description: "centre, radius, tangent",
    options: [
      {
        caption: "[Figure: a circle with centre O]",
        width: 120,
        height: 90,
        svg: `<circle cx="60" cy="45" r="34" ${STROKE}/><circle cx="60" cy="45" r="2.5" ${DOT}/><text x="64" y="42" font-size="12">O</text>`,
      },
      {
        caption: "[Figure: a circle with centre O and radius r]",
        width: 120,
        height: 90,
        svg: `<circle cx="60" cy="45" r="34" ${STROKE}/><line x1="60" y1="45" x2="94" y2="45" ${STROKE}/><circle cx="60" cy="45" r="2.5" ${DOT}/><text x="64" y="42" font-size="12">O</text><text x="97" y="49" font-size="12">r</text>`,
      },
      {
        caption: "[Figure: a circle with a tangent touching it at P]",
        width: 120,
        height: 90,
        svg: `<circle cx="52" cy="45" r="30" ${STROKE}/><line x1="82" y1="8" x2="82" y2="82" ${STROKE}/><circle cx="82" cy="45" r="2.5" ${DOT}/><text x="86" y="42" font-size="12">P</text><text x="14" y="20" font-size="11">tangent</text>`,
      },
    ],
  },
  {
    id: "quadrilateral",
    label: "Quadrilateral",
    description: "rectangle, square, parallelogram, trapeium",
    options: [
      {
        caption: "[Figure: rectangle ABCD]",
        width: 120,
        height: 90,
        svg: `<rect x="20" y="16" width="80" height="56" ${STROKE}/><text x="10" y="14" font-size="12">A</text><text x="102" y="14" font-size="12">B</text><text x="102" y="82" font-size="12">C</text><text x="10" y="82" font-size="12">D</text>`,
      },
      {
        caption: "[Figure: a square ABCD]",
        width: 120,
        height: 90,
        svg: `<rect x="28" y="12" width="64" height="64" ${STROKE}/><text x="18" y="11" font-size="12">A</text><text x="94" y="11" font-size="12">B</text><text x="94" y="86" font-size="12">C</text><text x="18" y="86" font-size="12">D</text>`,
      },
      {
        caption: "[Figure: a parallelogram ABCD]",
        width: 120,
        height: 90,
        svg: `<polygon points="14,74 90,74 108,16 32,16" ${STROKE}/><text x="4" y="86" font-size="12">A</text><text x="90" y="86" font-size="12">B</text><text x="106" y="14" font-size="12">C</text><text x="22" y="14" font-size="12">D</text>`,
      },
      {
        caption: "[Figure: a trapeium ABCD with AB parallel to DC]",
        width: 120,
        height: 90,
        svg: `<polygon points="14,74 106,74 88,18 34,18" ${STROKE}/><text x="4" y="86" font-size="12">A</text><text x="106" y="86" font-size="12">B</text><text x="88" y="14" font-size="12">C</text><text x="24" y="14" font-size="12">D</text>`,
      },
    ],
  },
  {
    id: "lines",
    label: "Lines and angles",
    description: "intersecting, parallel, an angle",
    options: [
      {
        caption: "[Figure: two straight lines intersecting at O]",
        width: 120,
        height: 90,
        svg: `<line x1="16" y1="74" x2="104" y2="16" ${STROKE}/><line x1="16" y1="16" x2="104" y2="74" ${STROKE}/><circle cx="60" cy="45" r="2.5" ${DOT}/><text x="64" y="42" font-size="12">O</text>`,
      },
      {
        caption: "[Figure: two parallel lines cut by a transversal]",
        width: 120,
        height: 90,
        svg: `<line x1="14" y1="28" x2="106" y2="28" ${STROKE}/><line x1="14" y1="64" x2="106" y2="64" ${STROKE}/><line x1="40" y1="10" x2="80" y2="80" ${STROKE}/>`,
      },
      {
        caption: "[Figure: an angle ABC]",
        width: 120,
        height: 90,
        svg: `<line x1="20" y1="70" x2="100" y2="70" ${STROKE}/><line x1="20" y1="70" x2="86" y2="20" ${STROKE}/><path d="M40 70 A20 20 0 0 0 36 56" ${STROKE}/><text x="54" y="82" font-size="12">B</text><text x="100" y="76" font-size="12">C</text><text x="88" y="18" font-size="12">A</text>`,
      },
    ],
  },
  {
    id: "polygon",
    label: "Polygons",
    description: "regular pentagon, hexagon",
    options: [
      {
        caption: "[Figure: a regular pentagon]",
        width: 120,
        height: 90,
        svg: `<polygon points="60,10 100,38 82,84 38,84 20,38" ${STROKE}/>`,
      },
      {
        caption: "[Figure: a regular hexagon]",
        width: 120,
        height: 90,
        svg: `<polygon points="34,10 86,10 112,45 86,80 34,80 8,45" ${STROKE}/>`,
      },
    ],
  },
  {
    id: "axes",
    label: "Graph axes",
    description: "a grid for plotting",
    options: [
      {
        caption: "[Figure: the x and y axes drawn on a coordinate grid]",
        width: 120,
        height: 90,
        svg: `<line x1="10" y1="80" x2="110" y2="80" stroke="currentColor" stroke-width="2"/><line x1="30" y1="10" x2="30" y2="86" stroke="currentColor" stroke-width="2"/><text x="108" y="76" font-size="12">x</text><text x="34" y="16" font-size="12">y</text><text x="50" y="76" font-size="11">1</text><text x="30" y="56" font-size="11">1</text>`,
      },
      {
        caption: "[Figure: a straight line drawn on the x and y axes]",
        width: 120,
        height: 90,
        svg: `<line x1="10" y1="80" x2="110" y2="80" stroke="currentColor" stroke-width="2"/><line x1="30" y1="10" x2="30" y2="86" stroke="currentColor" stroke-width="2"/><line x1="30" y1="66" x2="92" y2="26" ${STROKE}/><text x="108" y="76" font-size="12">x</text><text x="34" y="16" font-size="12">y</text>`,
      },
    ],
  },
];
