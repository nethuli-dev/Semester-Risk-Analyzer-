// Suggestions are built from the student's own courses, so the first thing
// they see is a question that will actually return something.
export function buildSuggestions(courses) {
  const general = [
    { text: 'Which course has my lowest average score?' },
    { text: 'How many classes have I missed in each course?' },
    { text: 'What is my average score per grade category?' },
    { text: 'Show my 5 most recent grades' },
  ];
  const first = courses[0];
  if (!first) return general;
  return [
    ...general,
    { text: `Show my scores over time in ${first.courseName}`, courseId: first._id, label: `Scores over time in ${first.courseName}` },
    { text: `What is my attendance breakdown in ${first.courseName}?`, courseId: first._id, label: `Attendance in ${first.courseName}` },
  ];
}

export default function SuggestionChips({ courses, disabled, onPick }) {
  return (
    <div className="flex flex-wrap gap-2">
      {buildSuggestions(courses).map((s) => (
        <button
          key={s.text}
          type="button"
          disabled={disabled}
          onClick={() => onPick({ question: s.text, courseId: s.courseId })}
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          {s.label ?? s.text}
        </button>
      ))}
    </div>
  );
}
