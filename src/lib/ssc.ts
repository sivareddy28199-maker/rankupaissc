/**
 * Single source of truth for the SSC CGL syllabus used across the UI and the
 * AI prompts. Client-safe — no secrets, no server imports.
 */

export const EXAM_NAME = "SSC CGL";
export const EXAM_CODE = "SSC-CGL";

export const SSC_SUBJECTS = [
  "Quantitative Aptitude",
  "General Intelligence & Reasoning",
  "English Language & Comprehension",
  "General Awareness",
] as const;

export type SscSubject = (typeof SSC_SUBJECTS)[number];

export const SSC_SYLLABUS: Record<SscSubject, string[]> = {
  "Quantitative Aptitude": [
    "Number Systems",
    "Fundamental Arithmetical Operations",
    "Algebra",
    "Geometry",
    "Mensuration",
    "Trigonometry",
    "Ratio & Proportion",
    "Percentage",
    "Profit & Loss",
    "Discount",
    "Simple & Compound Interest",
    "Average",
    "Time & Work",
    "Time, Speed & Distance",
    "Partnership",
    "Mixture & Alligation",
    "Data Interpretation",
  ],
  "General Intelligence & Reasoning": [
    "Analogy",
    "Classification",
    "Series",
    "Coding-Decoding",
    "Venn Diagrams",
    "Blood Relations",
    "Direction & Distance",
    "Mathematical Operations",
    "Syllogism",
    "Statement & Conclusion",
    "Logical Reasoning",
    "Non-Verbal Reasoning",
    "Mirror & Water Images",
    "Paper Folding & Cutting",
    "Embedded Figures",
    "Missing Figures",
  ],
  "English Language & Comprehension": [
    "Vocabulary",
    "Synonyms & Antonyms",
    "One Word Substitution",
    "Idioms & Phrases",
    "Spelling",
    "Grammar",
    "Error Spotting",
    "Fill in the Blanks",
    "Sentence Improvement",
    "Active & Passive Voice",
    "Direct & Indirect Speech",
    "Cloze Test",
    "Para Jumbles",
    "Reading Comprehension",
  ],
  "General Awareness": [
    "Current Affairs",
    "History",
    "Geography",
    "Indian Polity",
    "Indian Economy",
    "General Science",
    "Physics",
    "Chemistry",
    "Biology",
    "Static GK",
    "Art & Culture",
    "Government Schemes",
    "Awards & Honours",
    "Books & Authors",
    "Sports",
    "Important Days",
    "Countries, Capitals & Currencies",
    "Organizations & Headquarters",
  ],
};

/** Short display label used where space is tight (charts, chips, mobile). */
export const SUBJECT_SHORT: Record<string, string> = {
  "Quantitative Aptitude": "Quant",
  "General Intelligence & Reasoning": "Reasoning",
  "English Language & Comprehension": "English",
  "General Awareness": "GA",
};

export function shortSubject(name: string) {
  return SUBJECT_SHORT[name] ?? name;
}

/** Compact syllabus map handed to the AI so it classifies answers correctly. */
export const SYLLABUS_BRIEF = SSC_SUBJECTS.map(
  (subject) => `${subject}: ${SSC_SYLLABUS[subject].join(", ")}`,
).join("\n");
