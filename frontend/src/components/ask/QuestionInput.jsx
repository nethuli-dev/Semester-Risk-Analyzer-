import { useEffect, useRef, useState } from 'react';
import Button from '../common/Button';

// Enter sends, Shift+Enter adds a line — the convention every chat input
// teaches people to expect.
export default function QuestionInput({ courses, onSubmit, isSubmitting, initialText = '' }) {
  const [question, setQuestion] = useState(initialText);
  const [courseId, setCourseId] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (initialText) textareaRef.current?.focus();
  }, [initialText]);

  function send() {
    const text = question.trim();
    if (!text || isSubmitting) return;
    onSubmit({ question: text, courseId: courseId || undefined });
    setQuestion('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="rounded-xl border border-slate-200 bg-white p-3 shadow-md"
    >
      <label htmlFor="ask-input" className="sr-only">
        Ask a question about your data
      </label>
      <textarea
        id="ask-input"
        ref={textareaRef}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about your grades or attendance. Enter to send, Shift+Enter for a new line."
        rows={2}
        maxLength={500}
        className="w-full resize-none rounded-md border-0 px-2 py-1.5 text-sm focus:outline-none"
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Scope
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700"
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.courseName}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={isSubmitting || !question.trim()}>
          {isSubmitting ? 'Thinking...' : 'Ask'}
        </Button>
      </div>
    </form>
  );
}
