const { getClient, MODEL } = require('./geminiClient');

// A third, separate LLM call/prompt from pipeline generation and result
// summarization (PROJECT_PLAN §4: keep these as distinct functions, don't
// conflate them). This one has a narrower job than it might sound like:
// it never computes a risk score, grade, or attendance figure — every
// number in `courseSummaries` was already computed by the deterministic
// risk engine (Phase 3) before this function is ever called. The LLM's
// only task is turning real numbers into prose a student could bring to
// an advisor, not deciding what those numbers are.
function buildPrompt(studentName, term, courseSummaries) {
  const courseLines = courseSummaries
    .map((c) => {
      const factorText =
        c.factors
          .map((f) => (f.informational ? `${f.name} (${f.contribution} points, informational only — not part of the risk score)` : `${f.name} (contributes ${f.contribution})`))
          .join('; ') || 'none';
      return `- ${c.courseName} (${c.courseCode}): risk level "${c.riskLevel}", risk score ${c.riskScore}/100, grade trajectory ${
        c.trajectoryGrade === null ? 'not enough data yet' : `${c.trajectoryGrade}%`
      }, attendance ${c.attendanceRate === null ? 'not enough data yet' : `${c.attendanceRate}%`}. Contributing factors: ${factorText}. Recommendation: ${c.recommendation}`;
    })
    .join('\n');

  return `Student: ${studentName}\nTerm: ${term}\n\nPer-course standing (already computed — do not recalculate or contradict these numbers):\n${courseLines}`;
}

const SYSTEM_INSTRUCTION = `You write a semester progress report for a student, based ONLY on the per-course data given to you. This report may be shown to an academic advisor.

Rules:
- Use ONLY the numbers and facts provided in the prompt. Never invent, estimate, or recalculate a grade, risk score, or attendance figure.
- Do not characterize courses beyond the data (no subject areas like "humanities" or "STEM", no guesses about causes, effort, or study habits).
- Write in clear, honest, supportive prose — not alarmist, not sugar-coated.
- Synthesize the contributing factors and recommendation into natural sentences of your own — do not quote factor names or "contributes N" figures verbatim, and do not restate the recommendation near-word-for-word.
- Structure as Markdown: a one-paragraph overall summary first, then a short subsection per course that is "at-risk" or "failing" (skip courses that are "on-track" unless there are only on-track courses, in which case briefly note that), then one closing paragraph with concrete next steps.
- If a course has "not enough data yet" for grades or attendance, say so plainly rather than guessing at standing.
- Output only the Markdown report — no preamble, no code fences.`;

// Returns the report's Markdown content as a plain string (not JSON) —
// unlike pipelineGenerator's calls, this output IS the final artifact
// shown to the user, not something parsed back into a structure, so there's
// no responseSchema/responseMimeType constraint here.
async function generateReport({ studentName, term, courseSummaries }) {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: buildPrompt(studentName, term, courseSummaries),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.3,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini returned an empty response for the report');
  }
  return text;
}

module.exports = { generateReport };
