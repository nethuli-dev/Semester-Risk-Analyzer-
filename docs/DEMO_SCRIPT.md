# Demo video script (about 7 minutes)

You play a student who has just signed up. Everything you show is real: nothing is mocked or pre-loaded except the CSV files you prepared.

## Before you record

- [ ] `npm run dev` is running; open **http://localhost:5173** in a clean browser window at 100% zoom.
- [ ] Use an email that has **never** been registered (add a number if you retake: `you+take2@gmail.com`). A fresh account is what makes the empty-state and first import look right.
- [ ] Your own CSV files are ready, one grades file and one attendance file per course. See `sample-data/README.md` for the format. Have **2 or 3 courses** so the Dashboard has something to compare, ideally in different states (one struggling, one fine).
- [ ] Add **one deliberately bad row** to one grades file (for example a category that doesn't exist in the scheme) to show the error handling. Keep a clean copy too.
- [ ] `backend/.env` has a working `GEMINI_API_KEY`. Do one throwaway Ask AI question a few minutes before, so the first take isn't slow. The limit is **20 questions per 15 minutes**, so don't burn them on rehearsals.
- [ ] A terminal open in the repo root, ready for `npm run demo:validator`.
- [ ] Close notifications. Hide bookmarks. Turn on Do Not Disturb.

## The script

### 1. Intro (20 s)
Say: *"Students usually find out a course is going badly after the final. RiskLens shows it while there's still time. You log grades and attendance, it scores the risk per course, answers questions in plain English, and writes a report you can take to an advisor. The interesting part is that an AI can query the database safely."*

### 2. Create your account (30 s)
- Open the app and click the **Create account** tab (top of the card). Fill in your name, email and password, and submit. Use *Show* to reveal the password while typing if you want the viewer to see it's a normal field.
- You land on **Home** with nothing tracked yet. Point at the "Start with one course" card.
- Say: *"Passwords are hashed with bcrypt. My session is a short-lived token in memory plus a refresh cookie the browser can't read from JavaScript."*

### 3. Add your courses (1 min)
- **Courses → Add course.** Enter name, code, term, credits, **target grade**, and the **grading scheme** (for example Assignments 30, Quizzes 20, Midterm 20, Final 30).
- Try weights that don't total 100 first and show the error. Then fix it.
- Say: *"The weights are validated on the server, not just in the form."*
- Add the other courses.

### 4. Import your CSVs (1 min 30 s)
- Open a course → **Grades**. Click **Download template** to show the format, then **Import CSV** and choose your grades file (the one with the bad row).
- Point at the result: *"Imported 7, failed 1"* with the row number and reason.
- Say: *"Every row is checked separately. A bad row never breaks the file and is never silently dropped."*
- Import the same file again to show duplicates are skipped, not double-counted.
- **Attendance** tab → **Import CSV** with your attendance file.
- Repeat quickly for your other courses (or add them by hand: **+ Add grade entry** shows the category dropdown, which only offers this course's categories).
- Add **one more grade by hand** now. This gives the risk trend a second point to draw later.

### 5. Home (45 s)
- Go to **Home**. Read the focus card: it names the course that needs attention first, with the reasons.
- Show the "Where you stand" bars: the tick is your target grade.
- Under **Class today?** tap *Present* for a course.
- Say: *"Nothing on this card is AI. It's computed from your data by a plain function I can unit-test."*

### 6. Dashboard (45 s)
- Open **Dashboard**. Walk through the donut, the gauge, and the attendance vs. grade scatter (hover a dot).
- Say the formula: *"Risk = 100 minus my current grade, plus a penalty when attendance falls below 75%. Only categories that have been graded count, so an empty Final doesn't drag me toward zero."*
- If one of your courses has good grades but poor attendance, point out it's still flagged.

### 7. Ask AI (1 min 45 s)
- Open **Ask AI**. Tap *Which course has my lowest average score?*
- Open the **Data** tab, then the **Pipeline** tab. Point at the green box: *"Stage 0 was added by the server, not the AI. Whatever the AI writes, every query is limited to my own records."*
- Type your own question, for example `How many classes have I missed in each course?`, and switch the chart type.
- Now type `Delete all of my grades` and show the refusal with its reason.
- Switch to the terminal and run `npm run demo:validator`. Say: *"Even if the AI does produce something hostile, like writing data out or reading another table, the validator rejects it. Here it is on hand-written attacks, with no AI involved."*
- Say: *"The AI's refusal is a courtesy. The validator is the actual security boundary."*

### 8. Reports (1 min)
- Open **Reports**, choose the term, click **Generate report**.
- Read one sentence of the written summary and match a number to the Dashboard.
- Expand a course card: category bars, factors ("not in score" marks the target gap), risk trend.
- Click **Download Markdown**. Then **Download PDF** and choose *Save as PDF* in the dialog.
- Say: *"The AI only writes the prose. Every figure comes from the risk engine."*

### 9. Profile and security (45 s)
- Open **Profile**. Edit your university and program, save.
- **Change password.** Say: *"This re-checks my current password and signs out every other device."*
- Optionally click **Sign out everywhere**.

### 10. Wrap-up (20 s)
Say: *"74 automated tests pass, including tests where a mocked AI tries to write data out and the server refuses. The code is on GitHub: nethuli-dev/Semester-Risk-Analyzer-."* Show the repo page or the README.

## If something goes wrong

| Problem | Fix |
| --- | --- |
| Ask AI is slow or errors | Wait 20 seconds and retry. If it says too many questions, you hit the 20 per 15 minutes limit. Wait or use the Pipeline demo instead. |
| CSV row rejected unexpectedly | Check the category spelling against the course's scheme and that the header is exactly `category,title,score,maxScore,date`. |
| Numbers look stale | Refresh the page. Changes normally refresh everything automatically. |
| Risk trend says "appears after a few checks" | The score has to change at least once. Add or delete one grade or attendance record, then reopen Reports. |
| Want a clean start | Register with a new email, or run `npm run seed:demo` for a ready-made student. |
