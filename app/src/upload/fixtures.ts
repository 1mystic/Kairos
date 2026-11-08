/** Realistic prompt-v2 reply for tests and the dev harness: chatty wrapper, 5 questions, one figure with a bbox. */
const reply = {
  prompt_version: 2,
  meta: {
    title: 'JEE Main 2024 Shift 1 (sample)',
    language: 'en',
    source: { exam: 'JEE Main', year: 2024, session: '1', paper: null },
    has_answer_key: true,
    has_solutions: false,
  },
  passages: [],
  questions: [
    {
      n: 1, type: 'SCQ', passage_id: null,
      stem: 'A uniform disc of mass $M$ and radius $R$ rotates about its rim axis. Its moment of inertia is',
      options: [
        { key: 'A', text: '$\\frac{1}{2}MR^2$' }, { key: 'B', text: '$\\frac{3}{2}MR^2$' },
        { key: 'C', text: '$MR^2$' }, { key: 'D', text: '$2MR^2$' },
      ],
      answer: { keys: ['B'] }, solution: 'Parallel axis theorem: $I=\\frac12MR^2+MR^2$.',
      chapter: 'PHY.ROT', figures: [], confidence: 'high', note: null,
    },
    {
      n: 2, type: 'SCQ', passage_id: null,
      stem: 'The block on the incline shown below is at rest. The friction force is\n\n{{fig:1}}',
      options: [
        { key: 'A', text: '$mg\\sin\\theta$' }, { key: 'B', text: '$mg\\cos\\theta$' },
        { key: 'C', text: '$0$' }, { key: 'D', text: '$\\mu mg$' },
      ],
      answer: { keys: ['A'] }, solution: null, chapter: 'PHY.LOM',
      figures: [{ id: 1, where: 'stem', page: 1, bbox: [0.1, 0.3, 0.6, 0.55], alt: 'block on a 30 degree incline with friction arrow' }],
      confidence: 'high', note: null,
    },
    {
      n: 3, type: 'INT', passage_id: null,
      stem: 'The number of moles in $36\\,\\text{g}$ of $\\ce{H2O}$ is',
      options: null, answer: null, solution: null, chapter: 'CHE.MOLE', figures: [], confidence: 'high', note: null,
    },
    {
      n: 4, type: 'SCQ', passage_id: null,
      stem: 'Which law states that $\\vec{F}=m\\vec{a}$?',
      options: [{ key: 'A', text: 'First' }, { key: 'B', text: 'Second' }],
      answer: { keys: ['B'] }, solution: null, chapter: 'NOT.A.CHAPTER', figures: [], confidence: 'low', note: null,
    },
    {
      n: 5, type: 'NVQ', passage_id: null,
      stem: 'The value of $\\frac{1}{2}\\times 5$ is',
      options: null, answer: { value: 2.5, tol: 0.01 }, solution: null, chapter: 'PHY.WEP', figures: [], confidence: 'high', note: null,
    },
  ],
  continue_from: null,
};

export const REPLY_JSON = JSON.stringify(reply, null, 2);
export const REPLY = `Here is the JSON for your paper:\n\n\`\`\`json\n${REPLY_JSON}\n\`\`\`\n\nLet me know if you want the next batch!`;
/** the same reply cut off mid-string, as a chat does when it hits its length limit */
export const REPLY_TRUNCATED = REPLY.slice(0, Math.floor(REPLY.indexOf('"n": 3')));

export function chunk(from: number, to: number, withContinue: number | null) {
  return `\`\`\`json\n${JSON.stringify({ ...reply, questions: reply.questions.filter((q) => q.n >= from && q.n <= to), continue_from: withContinue })}\n\`\`\``;
}
