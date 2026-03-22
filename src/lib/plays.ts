export interface Play {
  id: string;
  title: string;       // Telugu title
  year: string;
  description: string; // Telugu description/synopsis
  content: string[];   // Each string is one scene/section in Telugu
}

// Replace these placeholders with actual Telugu plays.
export const plays: Play[] = [
  {
    id: "placeholder-play-1",
    title: "నాటకం — 1",
    year: "",
    description: "ఈ నాటకం త్వరలో అందుబాటులో ఉంటుంది.",
    content: [
      "ఈ నాటకం యొక్క పూర్తి పాఠ్యం త్వరలో జోడించబడుతుంది.",
    ],
  },
  {
    id: "placeholder-play-2",
    title: "నాటకం — 2",
    year: "",
    description: "ఈ నాటకం త్వరలో అందుబాటులో ఉంటుంది.",
    content: [
      "ఈ నాటకం యొక్క పూర్తి పాఠ్యం త్వరలో జోడించబడుతుంది.",
    ],
  },
  {
    id: "placeholder-play-3",
    title: "నాటకం — 3",
    year: "",
    description: "ఈ నాటకం త్వరలో అందుబాటులో ఉంటుంది.",
    content: [
      "ఈ నాటకం యొక్క పూర్తి పాఠ్యం త్వరలో జోడించబడుతుంది.",
    ],
  },
];
