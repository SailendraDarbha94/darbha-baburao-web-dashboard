export interface Poem {
  id: string;
  title: string;       // Telugu title, e.g. "నా కవిత"
  year: string;
  excerpt: string;     // Telugu excerpt (first few lines)
  content: string[];   // Each string is one stanza in Telugu
}

// Replace these placeholders with actual Telugu poems.
// Example:
// {
//   id: "naa-kavita",
//   title: "నా కవిత",
//   year: "1985",
//   excerpt: "మొదటి రెండు పంక్తులు ఇక్కడ...",
//   content: [
//     "మొదటి చరణం ఇక్కడ...",
//     "రెండవ చరణం ఇక్కడ...",
//   ],
// },
export const poems: Poem[] = [
  {
    id: "placeholder-poem-1",
    title: "కవిత — 1",
    year: "",
    excerpt: "ఈ కవిత త్వరలో అందుబాటులో ఉంటుంది.",
    content: [
      "ఈ కవిత యొక్క పూర్తి పాఠ్యం త్వరలో జోడించబడుతుంది.",
    ],
  },
  {
    id: "placeholder-poem-2",
    title: "కవిత — 2",
    year: "",
    excerpt: "ఈ కవిత త్వరలో అందుబాటులో ఉంటుంది.",
    content: [
      "ఈ కవిత యొక్క పూర్తి పాఠ్యం త్వరలో జోడించబడుతుంది.",
    ],
  },
  {
    id: "placeholder-poem-3",
    title: "కవిత — 3",
    year: "",
    excerpt: "ఈ కవిత త్వరలో అందుబాటులో ఉంటుంది.",
    content: [
      "ఈ కవిత యొక్క పూర్తి పాఠ్యం త్వరలో జోడించబడుతుంది.",
    ],
  },
];
