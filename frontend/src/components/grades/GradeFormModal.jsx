import { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';

export default function GradeFormModal({ initialGrade, categories = [], onSubmit, onClose, isSubmitting }) {
  const [category, setCategory] = useState(initialGrade?.category ?? categories[0] ?? '');
  const [title, setTitle] = useState(initialGrade?.title ?? '');
  const [score, setScore] = useState(initialGrade?.score ?? '');
  const [maxScore, setMaxScore] = useState(initialGrade?.maxScore ?? '');
  const [date, setDate] = useState(initialGrade?.date ? initialGrade.date.slice(0, 10) : '');
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({ category, title, score: Number(score), maxScore: Number(maxScore), date });
    } catch (err) {
      setError(err.response?.data?.error ?? 'Could not save grade entry');
    }
  }

  return (
    <Modal title={initialGrade ? 'Edit grade entry' : 'Add grade entry'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
          <select
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">From this course's grading scheme, so the grade always counts toward your risk score.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
          <input
            required
            placeholder="e.g. HW1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Score</label>
            <input
              required
              type="number"
              min="0"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Max score</label>
            <input
              required
              type="number"
              min="0"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
