import { RISK_LABELS } from '../theme/riskColors';

function pct(value) {
  return value === null || value === undefined ? 'not enough data' : `${value}%`;
}

// Builds a standalone Markdown document from the same live numbers the page
// shows, plus the AI narrative — readable in any editor, pasteable into an
// email to an advisor.
export function buildReportMarkdown({ studentName, term, generatedAt, results, narrative }) {
  const lines = [];
  lines.push(`# Semester report: ${term}`, '');
  lines.push(`Student: ${studentName}`);
  lines.push(`Data as of: ${new Date().toLocaleString()}`);
  if (generatedAt) lines.push(`Narrative generated: ${new Date(generatedAt).toLocaleString()}`);
  lines.push('', '## Standing at a glance', '');
  lines.push('| Course | Status | Risk score | Grade trajectory | Attendance | Target |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const r of results) {
    lines.push(
      `| ${r.course.courseName} (${r.course.courseCode}) | ${RISK_LABELS[r.riskLevel]} | ${r.riskScore}/100 | ${pct(r.trajectoryGrade)} | ${pct(r.attendanceRate)} | ${r.course.targetGrade ? `${r.course.targetGrade}%` : '-'} |`
    );
  }

  for (const r of results) {
    lines.push('', `## ${r.course.courseName} (${r.course.courseCode})`, '');
    lines.push(`- Status: ${RISK_LABELS[r.riskLevel]}, risk score ${r.riskScore}/100`);
    lines.push(`- Recommendation: ${r.recommendation}`);
    if (r.factors.length > 0) {
      lines.push('', 'Factors:');
      for (const f of r.factors) {
        lines.push(`- ${f.name}: ${f.contribution}${f.informational ? ' (informational, not part of the score)' : ''}`);
      }
    }
    if (r.categoryBreakdown?.length > 0) {
      lines.push('', 'Grade categories:', '', '| Category | Weight | Average |', '| --- | --- | --- |');
      for (const c of r.categoryBreakdown) {
        lines.push(`| ${c.category} | ${c.weight}% | ${c.averagePercent === null ? 'not graded yet' : `${c.averagePercent}%`} |`);
      }
    }
  }

  if (narrative) {
    lines.push('', '## Written summary', '', narrative);
  }
  return `${lines.join('\n')}\n`;
}

export function downloadTextFile(filename, text, mime = 'text/markdown') {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function safeFilename(...parts) {
  return parts.join(' ').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}
