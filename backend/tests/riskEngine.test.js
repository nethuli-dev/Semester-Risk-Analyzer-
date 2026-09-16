const { assessCourseRisk } = require('../src/services/riskEngine');

// A standard scheme used across cases: Midterm 30%, Final 40%, Assignments 30%.
const gradingScheme = [
  { category: 'Midterm', weight: 30 },
  { category: 'Final', weight: 40 },
  { category: 'Assignments', weight: 30 },
];

describe('riskEngine.assessCourseRisk (hand-computed cases)', () => {
  test('on-track: solid grades so far, good attendance, final not yet graded', () => {
    // Assignments: (80 + 90) / 2 = 85%. Midterm: 70%. Final: ungraded.
    // gradedWeight = 30 + 30 = 60
    // weightedPointsEarned = 0.85*30 + 0.70*30 = 25.5 + 21 = 46.5
    // trajectoryGrade = 46.5 / 60 * 100 = 77.5
    // attendance = 8/10 = 80% (>= 75 threshold, not a risk factor)
    // riskScore = 100 - 77.5 = 22.5, riskLevel: 77.5 >= 75 -> on-track
    const result = assessCourseRisk({
      gradingScheme,
      gradeEntries: [
        { category: 'Assignments', score: 8, maxScore: 10 },
        { category: 'Assignments', score: 9, maxScore: 10 },
        { category: 'Midterm', score: 70, maxScore: 100 },
      ],
      attendanceRecords: [
        ...Array(8).fill({ status: 'present' }),
        ...Array(2).fill({ status: 'absent' }),
      ],
      targetGrade: undefined,
    });

    expect(result.trajectoryGrade).toBe(77.5);
    expect(result.attendanceRate).toBe(80);
    expect(result.riskScore).toBe(22.5);
    expect(result.riskLevel).toBe('on-track');
  });

  test('failing: low grades so far AND low attendance', () => {
    // Assignments: 50%. Midterm: 40%. Final: ungraded.
    // gradedWeight = 60, weightedPointsEarned = 0.5*30 + 0.4*30 = 15+12 = 27
    // trajectoryGrade = 27/60*100 = 45 -> below 60 -> failing
    // attendance = 5/10 = 50% -> shortfall = (75-50)*0.5 = 12.5
    // riskScore = (100-45) + 12.5 = 67.5
    const result = assessCourseRisk({
      gradingScheme,
      gradeEntries: [
        { category: 'Assignments', score: 5, maxScore: 10 },
        { category: 'Midterm', score: 40, maxScore: 100 },
      ],
      attendanceRecords: [
        ...Array(5).fill({ status: 'present' }),
        ...Array(5).fill({ status: 'absent' }),
      ],
      targetGrade: undefined,
    });

    expect(result.trajectoryGrade).toBe(45);
    expect(result.attendanceRate).toBe(50);
    expect(result.riskScore).toBe(67.5);
    expect(result.riskLevel).toBe('failing');
    expect(result.factors.some((f) => f.name === 'Low attendance')).toBe(true);
  });

  test('at-risk purely from attendance, even with a good grade trajectory', () => {
    // Assignments: 90%, Midterm: 80% -> trajectoryGrade = (0.9*30+0.8*30)/60*100 = 85
    // attendance = 6/10 = 60% -> shortfall = (75-60)*0.5 = 7.5
    // riskScore = (100-85) + 7.5 = 22.5, riskLevel: 85>=75 but attendance<75 -> at-risk
    const result = assessCourseRisk({
      gradingScheme,
      gradeEntries: [
        { category: 'Assignments', score: 9, maxScore: 10 },
        { category: 'Midterm', score: 80, maxScore: 100 },
      ],
      attendanceRecords: [
        ...Array(6).fill({ status: 'present' }),
        ...Array(4).fill({ status: 'absent' }),
      ],
      targetGrade: undefined,
    });

    expect(result.trajectoryGrade).toBe(85);
    expect(result.attendanceRate).toBe(60);
    expect(result.riskScore).toBe(22.5);
    expect(result.riskLevel).toBe('at-risk');
  });

  test('no grades logged yet: reports null trajectory and on-track (benefit of the doubt)', () => {
    const result = assessCourseRisk({
      gradingScheme,
      gradeEntries: [],
      attendanceRecords: [],
      targetGrade: undefined,
    });

    expect(result.trajectoryGrade).toBeNull();
    expect(result.attendanceRate).toBeNull();
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe('on-track');
    expect(result.factors).toEqual([{ name: 'Not enough data yet', contribution: 0 }]);
  });

  test('excused absences are removed from the attendance denominator, not counted against the student', () => {
    // 4 present, 1 excused out of 5 total -> countable = 4, attended = 4 -> 100%
    const result = assessCourseRisk({
      gradingScheme,
      gradeEntries: [{ category: 'Assignments', score: 10, maxScore: 10 }],
      attendanceRecords: [
        ...Array(4).fill({ status: 'present' }),
        { status: 'excused' },
      ],
      targetGrade: undefined,
    });

    expect(result.attendanceRate).toBe(100);
  });

  test('late counts as attended, not absent', () => {
    const result = assessCourseRisk({
      gradingScheme,
      gradeEntries: [{ category: 'Assignments', score: 10, maxScore: 10 }],
      attendanceRecords: [
        ...Array(3).fill({ status: 'present' }),
        ...Array(2).fill({ status: 'late' }),
      ],
      targetGrade: undefined,
    });

    expect(result.attendanceRate).toBe(100);
  });

  test('below target grade adds an explicit factor', () => {
    const result = assessCourseRisk({
      gradingScheme,
      gradeEntries: [
        { category: 'Assignments', score: 8, maxScore: 10 },
        { category: 'Midterm', score: 70, maxScore: 100 },
      ],
      attendanceRecords: [{ status: 'present' }],
      targetGrade: 90, // trajectoryGrade will be 75, below the 90 target
    });

    expect(result.factors.some((f) => f.name === 'Below target grade')).toBe(true);
  });
});
