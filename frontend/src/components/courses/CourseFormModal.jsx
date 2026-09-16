import { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';

const WEIGHT_SUM_TARGET = 100;
const WEIGHT_SUM_TOLERANCE = 0.01;

function emptyScheme() {
  return [{ category: '', weight: '' }];
}

export default function CourseFormModal({ initialCourse, onSubmit, onClose, isSubmitting }) {
  const [courseName, setCourseName] = useState(initialCourse?.courseName ?? '');
  const [courseCode, setCourseCode] = useState(initialCourse?.courseCode ?? '');
  const [term, setTerm] = useState(initialCourse?.term ?? '');
  const [credits, setCredits] = useState(initialCourse?.credits ?? '');
  const [targetGrade, setTargetGrade] = useState(initialCourse?.targetGrade ?? '');
  const [gradingScheme, setGradingScheme] = useState(
    initialCourse?.gradingScheme?.length ? initialCourse.gradingScheme : emptyScheme()
  );
  const [error, setError] = useState(null);

  const weightSum = gradingScheme.reduce((sum, row) => sum + (Number(row.weight) || 0), 0);
  const weightsValid = Math.abs(weightSum - WEIGHT_SUM_TARGET) <= WEIGHT_SUM_TOLERANCE;

  function updateRow(index, field, value) {
    setGradingScheme((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setGradingScheme((rows) => [...rows, { category: '', weight: '' }]);
  }

  function removeRow(index) {
    setGradingScheme((rows) => rows.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!weightsValid) {
      setError(`Grading scheme weights must sum to 100 (currently ${weightSum}).`);
      return;
    }

    try {
      await onSubmit({
        courseName,
        courseCode,
        term,
        credits: Number(credits),
        gradingScheme: gradingScheme.map((row) => ({ category: row.category, weight: Number(row.weight) })),
        ...(targetGrade !== '' ? { targetGrade: Number(targetGrade) } : {}),
      });
    } catch (err) {
      setError(err.response?.data?.error ?? 'Could not save course');
    }
  }

  return (
    <Modal title={initialCourse ? 'Edit course' : 'Add course'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Course name</label>
            <input
              required
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Course code</label>
            <input
              required
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Term</label>
            <input
              required
              placeholder="Fall 2026"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Credits</label>
            <input
              required
              type="number"
              min="0"
              step="0.5"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Target grade (optional)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={targetGrade}
            onChange={(e) => setTargetGrade(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">Grading scheme</label>
            <span className={`text-xs ${weightsValid ? 'text-emerald-600' : 'text-red-600'}`}>
              Total: {weightSum}%
            </span>
          </div>
          <div className="space-y-2">
            {gradingScheme.map((row, index) => (
              <div key={index} className="flex gap-2">
                <input
                  required
                  placeholder="Category (e.g. Midterm)"
                  value={row.category}
                  onChange={(e) => updateRow(index, 'category', e.target.value)}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Weight %"
                  value={row.weight}
                  onChange={(e) => updateRow(index, 'weight', e.target.value)}
                  className="w-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  disabled={gradingScheme.length === 1}
                  className="px-2 text-slate-400 hover:text-red-600 disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addRow} className="mt-2 text-sm text-indigo-600 hover:underline">
            + Add category
          </button>
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
