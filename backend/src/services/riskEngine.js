const {
  RISK_FAILING_THRESHOLD,
  RISK_AT_RISK_THRESHOLD,
  RISK_LOW_ATTENDANCE_THRESHOLD,
  RISK_ATTENDANCE_PENALTY_WEIGHT,
} = require('../config/constants');

// Averages every logged entry in a category as a percentage (score/maxScore),
// then averages those percentages per category. Two entries in "Assignments"
// (80%, 90%) become a single 85% figure for that category.
function averagePercentByCategory(gradeEntries) {
  const totals = new Map(); // category -> { sum, count }
  for (const entry of gradeEntries) {
    const percent = (entry.score / entry.maxScore) * 100;
    const bucket = totals.get(entry.category) || { sum: 0, count: 0 };
    bucket.sum += percent;
    bucket.count += 1;
    totals.set(entry.category, bucket);
  }
  const averages = new Map();
  for (const [category, { sum, count }] of totals) {
    averages.set(category, sum / count);
  }
  return averages;
}

// The core number: "based only on categories with grades logged so far,
// what is this course trending toward out of 100?" Categories with no
// entries yet are excluded from both the numerator and denominator, so an
// empty "Final" category doesn't drag the score toward zero before the
// final has even happened — the score is re-normalized to the weight
// that's actually been graded.
//
// Returns null if nothing has been graded yet (there's no trajectory to
// report).
function computeTrajectoryGrade(gradingScheme, gradeEntries) {
  const categoryAverages = averagePercentByCategory(gradeEntries);

  let gradedWeight = 0;
  let weightedPointsEarned = 0;
  for (const { category, weight } of gradingScheme) {
    if (!categoryAverages.has(category)) continue;
    gradedWeight += weight;
    weightedPointsEarned += (categoryAverages.get(category) / 100) * weight;
  }

  if (gradedWeight === 0) return null;
  return (weightedPointsEarned / gradedWeight) * 100;
}

// "late" counts as attended (they were there, just tardy). "excused"
// absences are removed from the denominator entirely — an excused absence
// shouldn't count against a student the way an unexplained one does.
// Returns null if there's no attendance data to judge from.
function computeAttendanceRate(attendanceRecords) {
  const countable = attendanceRecords.filter((record) => record.status !== 'excused');
  if (countable.length === 0) return null;
  const attended = countable.filter((record) => record.status === 'present' || record.status === 'late');
  return (attended.length / countable.length) * 100;
}

function computeRiskLevel(trajectoryGrade, attendanceRate) {
  if (trajectoryGrade !== null && trajectoryGrade < RISK_FAILING_THRESHOLD) {
    return 'failing';
  }
  const gradeAtRisk = trajectoryGrade !== null && trajectoryGrade < RISK_AT_RISK_THRESHOLD;
  const attendanceAtRisk = attendanceRate !== null && attendanceRate < RISK_LOW_ATTENDANCE_THRESHOLD;
  if (gradeAtRisk || attendanceAtRisk) {
    return 'at-risk';
  }
  return 'on-track';
}

// A 0-100 risk score (higher = more at risk), not just a restatement of
// the risk level — this is what powers the trend chart in §3's "risk
// score over time" feature, so it needs to move continuously, not jump
// between three fixed buckets.
function computeRiskScore(trajectoryGrade, attendanceRate) {
  const gradeRisk = trajectoryGrade === null ? 0 : 100 - trajectoryGrade;
  const attendanceShortfall =
    attendanceRate !== null && attendanceRate < RISK_LOW_ATTENDANCE_THRESHOLD
      ? (RISK_LOW_ATTENDANCE_THRESHOLD - attendanceRate) * RISK_ATTENDANCE_PENALTY_WEIGHT
      : 0;
  return Math.min(100, Math.max(0, gradeRisk + attendanceShortfall));
}

function computeFactors(trajectoryGrade, attendanceRate, targetGrade) {
  const factors = [];

  if (trajectoryGrade === null) {
    factors.push({ name: 'Not enough data yet', contribution: 0 });
    return factors;
  }

  factors.push({
    name: 'Weighted grade trajectory',
    contribution: Math.round((100 - trajectoryGrade) * 100) / 100,
  });

  if (attendanceRate !== null && attendanceRate < RISK_LOW_ATTENDANCE_THRESHOLD) {
    factors.push({
      name: 'Low attendance',
      contribution: Math.round((RISK_LOW_ATTENDANCE_THRESHOLD - attendanceRate) * RISK_ATTENDANCE_PENALTY_WEIGHT * 100) / 100,
    });
  }

  if (typeof targetGrade === 'number' && trajectoryGrade < targetGrade) {
    factors.push({
      name: 'Below target grade',
      contribution: Math.round((targetGrade - trajectoryGrade) * 100) / 100,
      // Deliberately outside computeRiskScore: falling short of a personal
      // target isn't the same as being at risk of failing. Flagged so the
      // listed contributions are never mistaken for the score's components.
      informational: true,
    });
  }

  return factors;
}

function computeRecommendation(riskLevel, trajectoryGrade, attendanceRate) {
  if (trajectoryGrade === null) {
    return 'Log some grades to get a risk assessment for this course.';
  }
  if (riskLevel === 'failing') {
    return "You're trending well below a passing grade. Consider meeting with your professor or a tutor soon.";
  }
  if (attendanceRate !== null && attendanceRate < RISK_LOW_ATTENDANCE_THRESHOLD) {
    return 'Your attendance has dropped — improving it can directly help your standing in this course.';
  }
  if (riskLevel === 'at-risk') {
    return "Your grades are below where you'd want to be — focus on upcoming assessments to improve your standing.";
  }
  return "You're on track in this course. Keep up the consistent work.";
}

// The single entry point the risk controller calls. Everything above is a
// pure function of its inputs — no DB access, no I/O — so it's directly
// unit-testable with hand-computed examples (see tests/riskEngine.test.js).
function assessCourseRisk({ gradingScheme, gradeEntries, attendanceRecords, targetGrade }) {
  const trajectoryGrade = computeTrajectoryGrade(gradingScheme, gradeEntries);
  const attendanceRate = computeAttendanceRate(attendanceRecords);
  const riskLevel = computeRiskLevel(trajectoryGrade, attendanceRate);
  const riskScore = Math.round(computeRiskScore(trajectoryGrade, attendanceRate) * 100) / 100;
  const factors = computeFactors(trajectoryGrade, attendanceRate, targetGrade);
  const recommendation = computeRecommendation(riskLevel, trajectoryGrade, attendanceRate);

  return {
    riskScore,
    riskLevel,
    factors,
    recommendation,
    trajectoryGrade: trajectoryGrade === null ? null : Math.round(trajectoryGrade * 100) / 100,
    attendanceRate: attendanceRate === null ? null : Math.round(attendanceRate * 100) / 100,
  };
}

module.exports = {
  assessCourseRisk,
  computeTrajectoryGrade,
  computeAttendanceRate,
  computeRiskLevel,
  computeRiskScore,
  computeFactors,
  computeRecommendation,
};
