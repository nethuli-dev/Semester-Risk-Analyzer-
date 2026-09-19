// Creates (or resets) a demo student with realistic data so the app has
// something meaningful to show. Run: npm run seed:demo
//
// The risk history is NOT hand-typed: for each of the last 8 weeks it runs the
// real risk engine over only the grades/attendance that existed at that point,
// so the trend chart shows what the app would genuinely have reported.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/User');
const Course = require('../src/models/Course');
const GradeEntry = require('../src/models/GradeEntry');
const AttendanceRecord = require('../src/models/AttendanceRecord');
const RiskAssessment = require('../src/models/RiskAssessment');
const RefreshToken = require('../src/models/RefreshToken');
const Query = require('../src/models/Query');
const Report = require('../src/models/Report');
const { assessCourseRisk } = require('../src/services/riskEngine');
const { BCRYPT_COST_FACTOR } = require('../src/config/constants');

const DEMO = { name: 'Demo Student', email: 'demo@semester-risk.dev', password: 'DemoPass123!' };
const TERM = 'Fall 2026';
const SESSIONS = 16; // two class meetings a week for 8 weeks

// Grade weeks count from the start of the term; attendance is a string of
// P(resent) L(ate) A(bsent) X(cused), one letter per class meeting.
const COURSES = [
  {
    courseName: 'Calculus II', courseCode: 'MATH201', credits: 4, targetGrade: 80,
    gradingScheme: [{ category: 'Homework', weight: 30 }, { category: 'Midterm', weight: 30 }, { category: 'Final', weight: 40 }],
    grades: [['Homework', 'HW 1', 70, 1], ['Homework', 'HW 2', 62, 2], ['Homework', 'HW 3', 55, 3], ['Homework', 'HW 4', 50, 4], ['Homework', 'HW 5', 48, 5], ['Midterm', 'Midterm exam', 44, 6]],
    attendance: 'PPPAPAAPAAPAAAPA',
  },
  {
    courseName: 'Data Structures', courseCode: 'CS220', credits: 4, targetGrade: 85,
    gradingScheme: [{ category: 'Assignments', weight: 40 }, { category: 'Midterm', weight: 25 }, { category: 'Final', weight: 35 }],
    grades: [['Assignments', 'Lists lab', 80, 1], ['Assignments', 'Trees lab', 76, 2], ['Assignments', 'Graphs lab', 72, 4], ['Assignments', 'Hashing lab', 70, 5], ['Midterm', 'Midterm exam', 68, 6]],
    attendance: 'PPPPLPPPAPPPLPAP',
  },
  {
    courseName: 'Intro Psychology', courseCode: 'PSY101', credits: 3, targetGrade: 85,
    gradingScheme: [{ category: 'Homework', weight: 30 }, { category: 'Midterm', weight: 30 }, { category: 'Final', weight: 40 }],
    grades: [['Homework', 'Reading response 1', 92, 1], ['Homework', 'Reading response 2', 95, 2], ['Homework', 'Case study', 90, 4], ['Homework', 'Reading response 3', 94, 5], ['Midterm', 'Midterm exam', 91, 6]],
    attendance: 'PPPPPPPPPPPPPPPP',
  },
  {
    courseName: 'Technical Writing', courseCode: 'ENG210', credits: 3, targetGrade: 80,
    gradingScheme: [{ category: 'Essays', weight: 50 }, { category: 'Peer review', weight: 20 }, { category: 'Portfolio', weight: 30 }],
    grades: [['Essays', 'Essay 1', 88, 2], ['Essays', 'Essay 2', 84, 4], ['Essays', 'Essay 3', 90, 6], ['Peer review', 'Review round 1', 92, 5]],
    attendance: 'PAPAAPPAPAAPAPPA',
  },
];

const STATUS = { P: 'present', L: 'late', A: 'absent', X: 'excused' };

// A calendar day `n` days before today, as UTC midnight of that date — the
// same representation the app stores for a date the student picked.
function daysAgo(n) {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() - n));
}

async function wipeExistingDemo() {
  const existing = await User.findOne({ email: DEMO.email });
  if (!existing) return;
  const userId = existing._id;
  await Promise.all(
    [Course, GradeEntry, AttendanceRecord, RiskAssessment, RefreshToken, Query, Report].map((M) => M.deleteMany({ userId }))
  );
  await User.deleteOne({ _id: userId });
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  await wipeExistingDemo();

  const user = await User.create({
    name: DEMO.name,
    email: DEMO.email,
    passwordHash: await bcrypt.hash(DEMO.password, BCRYPT_COST_FACTOR),
    university: 'State University',
    program: 'Computer Science',
  });

  for (const spec of COURSES) {
    const course = await Course.create({
      userId: user._id, courseName: spec.courseName, courseCode: spec.courseCode, term: TERM,
      credits: spec.credits, gradingScheme: spec.gradingScheme, targetGrade: spec.targetGrade,
    });

    const grades = spec.grades.map(([category, title, score, week]) => ({
      userId: user._id, courseId: course._id, category, title, score, maxScore: 100, date: daysAgo(56 - week * 7 - 1),
    }));
    const attendance = [...spec.attendance].slice(0, SESSIONS).map((letter, i) => ({
      userId: user._id, courseId: course._id, status: STATUS[letter], date: daysAgo(56 - (Math.floor(i / 2) * 7 + (i % 2) * 2)),
    }));
    await GradeEntry.insertMany(grades);
    await AttendanceRecord.insertMany(attendance);

    // Weekly checkpoints, oldest first: what did the engine say with only the
    // data that existed then?
    let previous = null;
    for (let offset = 49; offset >= 0; offset -= 7) {
      const cutoff = daysAgo(offset);
      const assessment = assessCourseRisk({
        gradingScheme: spec.gradingScheme,
        gradeEntries: grades.filter((g) => g.date <= cutoff),
        attendanceRecords: attendance.filter((a) => a.date <= cutoff),
        targetGrade: spec.targetGrade,
      });
      const signature = `${assessment.riskScore}|${assessment.riskLevel}`;
      if (signature === previous) continue; // same rule the live app uses: only record changes
      previous = signature;
      const computedAt = new Date(cutoff.getTime() + 12 * 3600 * 1000);
      await RiskAssessment.create({
        userId: user._id, courseId: course._id, riskScore: assessment.riskScore, riskLevel: assessment.riskLevel,
        factors: assessment.factors, recommendation: assessment.recommendation, computedAt,
      });
    }
    console.log(`  ${spec.courseCode}  ${grades.length} grades, ${attendance.length} attendance records`);
  }

  console.log(`\nDemo student ready.\n  Email:    ${DEMO.email}\n  Password: ${DEMO.password}\n`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
