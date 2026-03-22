export interface Poem {
  id: string;
  title: string;
  year: string;
  excerpt: string;
  content: string[];
}

export const poems: Poem[] = [
  {
    id: "placeholder-poem-1",
    title: "Placeholder Poem 1",
    year: "",
    excerpt: "This is a placeholder entry. Replace with an actual poem title, year, excerpt, and full content.",
    content: [
      "This is a placeholder for the full poem text.",
      "Replace this array with the actual stanzas of the poem.",
      "Each string in the array represents one stanza.",
    ],
  },
  {
    id: "placeholder-poem-2",
    title: "Placeholder Poem 2",
    year: "",
    excerpt: "This is a placeholder entry. Replace with an actual poem title, year, excerpt, and full content.",
    content: [
      "This is a placeholder for the full poem text.",
      "Replace this array with the actual stanzas of the poem.",
      "Each string in the array represents one stanza.",
    ],
  },
  {
    id: "placeholder-poem-3",
    title: "Placeholder Poem 3",
    year: "",
    excerpt: "This is a placeholder entry. Replace with an actual poem title, year, excerpt, and full content.",
    content: [
      "This is a placeholder for the full poem text.",
      "Replace this array with the actual stanzas of the poem.",
      "Each string in the array represents one stanza.",
    ],
  },
];
