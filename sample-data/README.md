# Sample data and CSV templates

Import your own semester into the app with two CSV files **per course**: one for grades, one for attendance. Courses themselves are created in the app (Courses → Add course), because each one needs a grading scheme.

| File | What it is |
| --- | --- |
| `grades-template.csv` | Blank-ish template for grades. Replace the three example rows. |
| `attendance-template.csv` | Blank-ish template for attendance. |
| `example-database-systems-grades.csv` | A finished example (7 grades) you can import as-is. |
| `example-database-systems-attendance.csv` | A finished example (16 class days) to go with it. |

The same two templates are downloadable inside the app: open a course and click **Download template** next to *Import CSV*.

## Grades CSV

```
category,title,score,maxScore,date
Assignments,Assignment 1 - ER diagrams,82,100,2026-01-23
Quizzes,Quiz 1,90,100,2026-01-30
Midterm,Midterm exam,68,100,2026-03-06
```

| Column | Rules |
| --- | --- |
| `category` | Must be one of **that course's** grading categories (Courses → Edit shows them). Letter case doesn't matter; spelling does. A category that isn't in the scheme is rejected with a clear message, because it would never count toward the risk score. |
| `title` | Any text, e.g. `Quiz 2`. |
| `score` | Points you earned (a number, 0 or more). |
| `maxScore` | Points it was out of (a number above 0). Scores are converted to percentages, so `18` out of `20` is fine. |
| `date` | `YYYY-MM-DD`. |

## Attendance CSV

```
date,status
2026-01-13,present
2026-01-15,late
2026-01-20,absent
```

| Column | Rules |
| --- | --- |
| `date` | `YYYY-MM-DD`. One row per class day. |
| `status` | `present`, `late`, `absent` or `excused` (any letter case). `late` counts as attended. `excused` is left out of the attendance percentage entirely. |

## Rules that apply to both

- **Keep the header row exactly as shown** (`maxScore` has a capital S).
- Save as **CSV UTF-8** from Excel, Numbers or Google Sheets. Maximum file size 2 MB.
- Every row is checked on its own. Good rows import and bad rows are listed on screen with the row number and the reason, so a typo never breaks the whole file and is never silently dropped.
- **Re-importing the same file is safe.** Grades and attendance that already exist are reported as duplicates and skipped, so nothing is counted twice.
- One record per class day for attendance. If you get one wrong, delete it in the course's Attendance tab and log it again.

## Try the example

1. Register, then Courses → **Add course**: `Database Systems`, code `CS305`, term `Spring 2026`, 4 credits, target grade `80`, grading scheme `Assignments 30`, `Quizzes 20`, `Midterm 20`, `Final 30`.
2. Open the course → Grades → **Import CSV** → `example-database-systems-grades.csv`.
3. Attendance tab → **Import CSV** → `example-database-systems-attendance.csv`.

Expected result on the Dashboard: grade trajectory **73.57%**, attendance **62.5%**, risk score **32.68**, status **At risk**. You can check it by hand: the graded categories are re-weighted to 70 of the 100 points (Final isn't graded yet), so `(76.33×30 + 75×20 + 68×20) / 70 = 73.57`, and attendance below 75% adds `0.5 × (75 − 62.5) = 6.25` to the `100 − 73.57` grade risk.
