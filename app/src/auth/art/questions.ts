export type SampleQuestion = { subject: string; topic: string; text: string; options: string[]; answer: number };

/** Original, simple, factually correct warm-ups for the auth panel (plain text, no KaTeX). */
export const SAMPLE_QUESTIONS: SampleQuestion[] = [
  { subject: 'Physics', topic: 'Rotation', text: "What fraction of a rolling solid disc's kinetic energy is rotational?", options: ['1/2', '1/3', '2/5', '1/4'], answer: 1 },
  { subject: 'Chemistry', topic: 'Equilibrium', text: 'In N₂ + 3H₂ ⇌ 2NH₃, raising the pressure shifts the equilibrium towards?', options: ['Reactants', 'Products', 'No shift', 'Cannot say'], answer: 1 },
  { subject: 'Maths', topic: 'Limits', text: 'What is the limit of sin(3x) / x as x approaches 0?', options: ['1/3', '3', '0', '1'], answer: 1 },
  { subject: 'Physics', topic: 'Rotation', text: 'Angular momentum is conserved and the moment of inertia doubles. What happens to ω?', options: ['Doubles', 'Halves', 'Unchanged', 'Quadruples'], answer: 1 },
];
