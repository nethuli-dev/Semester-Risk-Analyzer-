import { useState } from 'react';
import Button from '../common/Button';

export default function QuestionInput({ courses, onSubmit, isSubmitting }) {
  const [question, setQuestion] = useState('');
  const [courseId, setCourseId] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!question.trim()) return;
    onSubmit({ question: question.trim(), courseId: courseId || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <label className="mb-1 block text-sm font-medium text-slate-700">Ask a question about your data</label>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder='e.g. "What is my average score on assignments?"'
        rows={2}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-600"
        >
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.courseName}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={isSubmitting || !question.trim()}>
          {isSubmitting ? 'Thinking...' : 'Ask'}
        </Button>
      </div>
    </form>
  );
}
