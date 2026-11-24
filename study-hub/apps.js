// Catalog of published apps. To add an app, append an entry here.
// To add a category, add it to CATEGORIES and use its id in an app entry.
const CATEGORIES = [
  {
    id: "biology",
    name: "Biology",
    tagline: "Cells, life and how living things work",
    icon: "leaf",
  },
  {
    id: "history",
    name: "History",
    tagline: "Time, dates and how we talk about the past",
    icon: "landmark",
  },
];

const APPS = [
  {
    name: "Cell Lab",
    url: "https://cell-lab.apps.grok.bot",
    category: "biology",
    topic: "Plant vs. animal cells",
    description:
      "Interactive cell diagrams, flashcards and practice quizzes for telling plant cells and animal cells apart.",
    icon: "microscope",
  },
  {
    name: "Cell City",
    url: "https://cell-city.apps.grok.bot",
    category: "biology",
    topic: "Organelles",
    description:
      "Learn what every organelle does, practice with flashcards, and take a quiz to get ready for your cell test.",
    icon: "city",
  },
  {
    name: "Nucleus or Not?",
    url: "https://nucleus-or-not.apps.grok.bot",
    category: "biology",
    topic: "Prokaryotes vs. eukaryotes",
    description:
      "A study guide, flashcards, sorting game and practice quiz for telling prokaryotic and eukaryotic cells apart.",
    icon: "nucleus",
  },
  {
    name: "Seven Signs of Life",
    url: "https://signs-of-life.apps.grok.bot",
    category: "biology",
    topic: "Characteristics of life",
    description:
      "Practice quiz, study cards and a recall challenge for the seven characteristics of life, from cells to adaptation.",
    icon: "pulse",
  },
  {
    name: "Life From Life",
    url: "https://life-from-life.apps.grok.bot",
    category: "biology",
    topic: "Cell theory",
    description:
      "A study guide, flashcards and practice quiz on spontaneous generation, biogenesis and cell theory.",
    icon: "flask",
  },
  {
    name: "Era Explorer",
    url: "https://era-explorer.apps.grok.bot",
    category: "history",
    topic: "BC, AD, BCE and CE",
    description:
      "Short lessons, flashcards and a practice quiz that make the difference between BC, AD, BCE and CE clear.",
    icon: "hourglass",
  },
];
