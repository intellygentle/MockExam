import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLessonCard } from "@/lib/server/lesson-cards";

/**
 * Vocabulary card variants tracked as interactive runs (per-word answers,
 * wrong picks, restarts, stage runs) rather than plain completion markers.
 */
const VOCAB_TRACKED_SLUGS = ["flash", "matching", "blanks", "spelling"];

/** Distinct-correct count: a word counts once even when answered again
 *  after a restart, and repeat wrong picks don't dilute correctness. */
const distinctCorrect = (answers: any[]) =>
  new Set((answers || []).filter((a: any) => a.correct).map((a: any) => a.question_id)).size;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action } = body;

    if (action === "start") {
      // Start a new drill attempt
      const { studentName, schoolName, drillSetId, totalQuestions } = body;
      if (!studentName || !drillSetId) {
        return NextResponse.json({ error: "studentName and drillSetId required" }, { status: 400 });
      }

      const { data: attempt, error } = await supabase
        .from("drill_attempts")
        .insert({
          student_name: studentName,
          school_name: schoolName || "",
          drill_set_id: drillSetId,
          total_questions: totalQuestions,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ attempt });
    }

    if (action === "answer") {
      // Save a single answer (batched is fine)
      const { attemptId, questionId, selectedOption, correct, timeTakenSeconds } = body;
      if (!attemptId || !questionId) {
        return NextResponse.json({ error: "attemptId and questionId required" }, { status: 400 });
      }

      const { error } = await supabase
        .from("drill_attempt_answers")
        .insert({
          attempt_id: attemptId,
          question_id: questionId,
          selected_option: selectedOption || "",
          correct: correct || false,
          time_taken_seconds: timeTakenSeconds || 0,
          answered_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update attempt counts (correct = distinct words answered correctly,
      // so restarts and repeated wrong picks don't skew the numbers)
      const { data: answers } = await supabase
        .from("drill_attempt_answers")
        .select("question_id, correct")
        .eq("attempt_id", attemptId);

      const answeredCount = (answers || []).length;
      const correctCount = distinctCorrect(answers || []);

      await supabase
        .from("drill_attempts")
        .update({
          answered_questions: answeredCount,
          correct_answers: correctCount,
        })
        .eq("id", attemptId);

      return NextResponse.json({ success: true, answeredCount, correctCount });
    }

    if (action === "complete") {
      // Complete a drill attempt
      const { attemptId, timeSpentSeconds, timeWarningsCount } = body;
      if (!attemptId) {
        return NextResponse.json({ error: "attemptId required" }, { status: 400 });
      }

      // Recompute authoritative counts from the recorded answers so mastery
      // never depends on client-sent values. Correct = distinct words with a
      // correct answer (restarts re-answer words; each word counts once).
      const [{ data: answers }, { data: attemptRow }] = await Promise.all([
        supabase.from("drill_attempt_answers").select("question_id, correct").eq("attempt_id", attemptId),
        supabase.from("drill_attempts").select("total_questions").eq("id", attemptId).maybeSingle(),
      ]);

      const answered = (answers || []).length;
      const correct = distinctCorrect(answers || []);
      const totalQuestions = attemptRow?.total_questions || 0;
      // Mastered = answered every question in the card correctly
      const mastered = totalQuestions > 0 && correct >= totalQuestions;

      const { error } = await supabase
        .from("drill_attempts")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          time_spent_seconds: timeSpentSeconds || 0,
          time_warnings_count: timeWarningsCount || 0,
          answered_questions: answered,
          correct_answers: correct,
          mastered,
        })
        .eq("id", attemptId);

      if (error) throw error;
      return NextResponse.json({ success: true, mastered });
    }

    if (action === "complete_stage") {
      // Complete a run within a multi-stage card (e.g. one Spelling Bee
      // stage). Same accounting as "complete", but the run never marks the
      // CARD mastered — card mastery comes from the separate all-stages
      // completion marker (complete_reading).
      const { attemptId, timeSpentSeconds } = body;
      if (!attemptId) {
        return NextResponse.json({ error: "attemptId required" }, { status: 400 });
      }

      const { data: answers } = await supabase
        .from("drill_attempt_answers")
        .select("question_id, correct")
        .eq("attempt_id", attemptId);

      const answered = (answers || []).length;
      const correct = distinctCorrect(answers || []);

      const { error } = await supabase
        .from("drill_attempts")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          time_spent_seconds: timeSpentSeconds || 0,
          answered_questions: answered,
          correct_answers: correct,
          mastered: false,
        })
        .eq("id", attemptId);

      if (error) throw error;
      return NextResponse.json({ success: true, mastered: false });
    }

    if (action === "complete_reading") {
      const { studentName, drillSetId, totalQuestions } = body;
      if (!studentName || !drillSetId) {
        return NextResponse.json({ error: "studentName and drillSetId required" }, { status: 400 });
      }
      const { data: attempt, error } = await supabase
        .from("drill_attempts")
        .insert({
          student_name: studentName,
          drill_set_id: drillSetId,
          total_questions: totalQuestions || 1,
          answered_questions: totalQuestions || 1,
          correct_answers: totalQuestions || 1,
          completed: true,
          mastered: true,
          completed_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, mastered: true, attempt });
    }

    if (action === "warned") {
      // Increment warning count (sent from client-local counter)
      const { attemptId, warningCount } = body;
      if (!attemptId) {
        return NextResponse.json({ error: "attemptId required" }, { status: 400 });
      }

      await supabase
        .from("drill_attempts")
        .update({ time_warnings_count: warningCount || 1 })
        .eq("id", attemptId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Drill attempts API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process drill attempt" },
      { status: 500 }
    );
  }
}

// GET analytics for a drill set
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const drillSetId = url.searchParams.get("drill_set_id");

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // A completed try is a perfect run. In-progress work is not counted as a try.
    const isMastered = (a: any) =>
      !!a.completed && (a.total_questions ?? 0) > 0 && (a.correct_answers ?? 0) >= (a.total_questions ?? 0);

    if (drillSetId) {
      // Detailed analytics for one drill set
      const setIdNum = parseInt(drillSetId);
      const { data: drillSet } = await supabase
        .from("drill_sets")
        .select("*")
        .eq("id", setIdNum)
        .single();

      // ── Lesson cards: analytics from capitalization_attempts ──
      const drillCardType = drillSet?.card_type || "quiz";
      const isLessonCard = drillCardType === "capitalization" || drillCardType === "sentence_types" || drillCardType === "sentence_combining" || drillCardType === "true_false" || drillCardType === "combine_seq" || drillCardType === "error_correction" || drillCardType === "para_gapfill" || drillCardType === "sentence_expansion" || drillCardType === "sentence_expansion_mcq" || drillCardType === "word_table" || drillCardType === "study" || drillCardType === "definition_recall";
      if (drillSet && isLessonCard) {
        const cardDef = getLessonCard(drillCardType, drillSet.capitalization_slug);
        const lineCount = cardDef ? cardDef.questions.length : drillSet.question_count || 1;

        const { data: attempts } = await supabase
          .from("capitalization_attempts")
          .select("*")
          .eq("drill_set_id", setIdNum)
          .order("started_at", { ascending: false });

        const capAttempts = attempts || [];

        // Try numbering: each student's attempts, oldest → newest = try 1, 2, 3…
        const byStudent = new Map<string, any[]>();
        for (const a of capAttempts) {
          const list = byStudent.get(a.student_name) || [];
          list.push(a);
          byStudent.set(a.student_name, list);
        }
        const tryNumberById = new Map<number, number>();
        for (const list of byStudent.values()) {
          list.sort((x: any, y: any) => new Date(x.started_at).getTime() - new Date(y.started_at).getTime());
          list.forEach((a: any, i: number) => tryNumberById.set(a.id, i + 1));
        }

        // Last activity per attempt (from the submissions log) for quit durations
        const attemptIds = capAttempts.map((a: any) => a.id);
        const { data: allSubs } = await supabase
          .from("capitalization_submissions")
          .select("attempt_id, submitted_at")
          .in("attempt_id", attemptIds.length > 0 ? attemptIds : [0]);

        const lastActivityByAttempt = new Map<number, string>();
        for (const s of allSubs || []) {
          const current = lastActivityByAttempt.get(s.attempt_id);
          if (!current || new Date(s.submitted_at) > new Date(current)) {
            lastActivityByAttempt.set(s.attempt_id, s.submitted_at);
          }
        }

        const enrichedAttempts = capAttempts.map((a: any) => {
          const start = new Date(a.started_at);
          const end = a.completed_at
            ? new Date(a.completed_at)
            : lastActivityByAttempt.get(a.id)
              ? new Date(lastActivityByAttempt.get(a.id)!)
              : start;
          const durationSeconds = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
          return {
            ...a,
            mastered: a.status === "mastered",
            completed: a.status === "mastered",
            tryNumber: tryNumberById.get(a.id) || 1,
            startTime: a.started_at,
            endTime: end.toISOString(),
            durationSeconds,
            quit: a.status !== "mastered",
            submissions: a.submissions_count,
            lines_correct: a.lines_correct,
            total_questions: lineCount,
          };
        });

        // ── Per-student aggregated stats + full try-by-try history ──
        const studentMap = new Map<string, any>();
        for (const a of capAttempts) {
          const name = a.student_name;
          if (!studentMap.has(name)) {
            studentMap.set(name, {
              studentName: name,
              attempts: 0,
              submissions: 0,
              bestScore: 0,
              bestTime: 0,
              completed: 0,
              mastered: false,
              masteredAtTry: null,
              retriesBeforeStop: 0,
              attemptHistory: [],
            });
          }
          const stats = studentMap.get(name)!;
          stats.attempts++;
          stats.submissions += a.submissions_count || 0;
          const pct = (a.lines_correct / Math.max(lineCount, 1)) * 100;
          if (a.status === "mastered") {
            stats.completed++;
            if (pct > stats.bestScore) {
              stats.bestScore = Math.round(pct);
              if (a.completed_at) {
                stats.bestTime = Math.round((new Date(a.completed_at).getTime() - new Date(a.started_at).getTime()) / 1000);
              }
            }
          } else {
            stats.bestScore = Math.max(stats.bestScore, Math.round(pct));
          }
        }

        for (const [name, stats] of studentMap.entries()) {
          const list = byStudent.get(name) || [];
          list.sort((x: any, y: any) => new Date(x.started_at).getTime() - new Date(y.started_at).getTime());
          stats.attemptHistory = list.map((a: any, i: number) => {
            const isMastered = a.status === "mastered";
            const duration = a.completed_at
              ? Math.round((new Date(a.completed_at).getTime() - new Date(a.started_at).getTime()) / 1000)
              : 0;
            return {
              tryNumber: i + 1,
              completed: isMastered,
              quit: !isMastered,
              correctAnswers: a.lines_correct,
              totalQuestions: lineCount,
              scorePercent: Math.round((a.lines_correct / Math.max(lineCount, 1)) * 100),
              timeSpentSeconds: duration,
              mastered: isMastered,
              submissions: a.submissions_count,
              startedAt: a.started_at,
              completedAt: a.completed_at,
            };
          });
          const masteredIdx = stats.attemptHistory.findIndex((h: any) => h.mastered);
          stats.mastered = masteredIdx >= 0;
          stats.masteredAtTry = masteredIdx >= 0 ? masteredIdx + 1 : null;
          // Retries before success = submissions on the mastering try minus the successful one
          stats.retriesBeforeStop = masteredIdx >= 0
            ? Math.max(0, (stats.attemptHistory[masteredIdx].submissions || 1) - 1)
            : stats.submissions;
        }

        const students = Array.from(studentMap.values()).sort((a, b) => b.attempts - a.attempts);
        const masteredAttempts = capAttempts.filter((a: any) => a.status === "mastered");
        const masteredStudents = students.filter((s) => s.mastered).length;
        const totalSubmissions = capAttempts.reduce((sum, a) => sum + (a.submissions_count || 0), 0);
        const avgTime = masteredAttempts.length > 0
          ? Math.round(masteredAttempts.reduce((sum, a) => sum + (a.completed_at ? Math.round((new Date(a.completed_at).getTime() - new Date(a.started_at).getTime()) / 1000) : 0), 0) / masteredAttempts.length)
          : 0;
        const quitEnriched = enrichedAttempts.filter((a: any) => !a.mastered);
        const avgQuitTime = quitEnriched.length > 0
          ? Math.round(quitEnriched.reduce((sum, a) => sum + (a.durationSeconds || 0), 0) / quitEnriched.length)
          : 0;

        return NextResponse.json({
          drillSet: { ...drillSet, question_count: lineCount, cardType: drillCardType },
          summary: {
            totalAttempts: capAttempts.length,
            completedAttempts: masteredAttempts.length,
            quitAttempts: capAttempts.length - masteredAttempts.length,
            masteredAttempts: masteredAttempts.length,
            masteredStudents,
            masteryRate: students.length > 0 ? Math.round((masteredStudents / students.length) * 100) : 0,
            avgTimeSeconds: avgTime,
            avgScorePercent: capAttempts.length > 0
              ? Math.round(capAttempts.reduce((sum, a) => sum + ((a.lines_correct / Math.max(lineCount, 1)) * 100), 0) / capAttempts.length)
              : 0,
            avgQuitTimeSeconds: avgQuitTime,
            avgSubmissions: capAttempts.length > 0 ? Math.round(totalSubmissions / capAttempts.length) : 0,
          },
          students,
          attempts: enrichedAttempts,
        });
      }

      // ── Tracked vocabulary cards (flash / matching / blanks / spelling) ──
      // These cards record interactive runs: a start row, one answer row per
      // graded event (wrong picks and misspellings included), and a complete
      // row. Spelling Bee stage runs complete via "complete_stage" and never
      // mark the card mastered — the all-stages marker (complete_reading)
      // does. Markers are answer-less and excluded from run history.
      const isTrackedVocabCard =
        drillCardType === "vocabulary" && VOCAB_TRACKED_SLUGS.includes((drillSet as any)?.capitalization_slug || "");
      if (drillSet && isTrackedVocabCard) {
        const vocabMode = (drillSet as any).capitalization_slug as string;

        const [{ data: vocabAttempts }, { data: links }] = await Promise.all([
          supabase
            .from("drill_attempts")
            .select("*")
            .eq("drill_set_id", setIdNum)
            .order("created_at", { ascending: false }),
          supabase
            .from("drill_set_questions")
            .select("question_id, question_number")
            .eq("drill_set_id", setIdNum),
        ]);

        const attemptIds = (vocabAttempts || []).map((a: any) => a.id);
        const { data: allAnswers } = await supabase
          .from("drill_attempt_answers")
          .select("attempt_id, question_id, selected_option, correct, answered_at")
          .in("attempt_id", attemptIds.length > 0 ? attemptIds : [0]);

        // Stage lookup (spelling): question_id → 0-based stage index
        const stageByQuestion = new Map<number, number>();
        for (const l of links || []) {
          stageByQuestion.set(l.question_id, Math.floor(((l.question_number || 1) - 1) / 20));
        }

        const answersByAttempt = new Map<number, any[]>();
        for (const ans of allAnswers || []) {
          const list = answersByAttempt.get(ans.attempt_id) || [];
          list.push(ans);
          answersByAttempt.set(ans.attempt_id, list);
        }
        const hasAnswers = (id: number) => (answersByAttempt.get(id) || []).length > 0;

        // Markers = card-level completion rows with no recorded answers
        const isMarker = (a: any) => !!a.completed && !!a.mastered && !hasAnswers(a.id);
        const markers = (vocabAttempts || []).filter(isMarker);
        const runs = (vocabAttempts || []).filter((a: any) => !isMarker(a));

        // Question labels (word + transcription) for missed-word reporting
        const labelIds = Array.from(new Set((allAnswers || []).map((a: any) => a.question_id)));
        const { data: labelQuestions } = await supabase
          .from("questions")
          .select("id, question, explanation")
          .in("id", labelIds.length > 0 ? labelIds : [0]);
        const labelById = new Map<number, any>();
        for (const q of labelQuestions || []) labelById.set(q.id, q);

        // Stage/category names (spelling)
        let categories: any[] = [];
        try {
          if ((drillSet as any).lesson_content) {
            const parsed = JSON.parse((drillSet as any).lesson_content);
            if (parsed && Array.isArray(parsed.categories)) categories = parsed.categories;
          }
        } catch { /* ignore */ }

        // Chronological try numbering per student
        const vocabByStudent = new Map<string, any[]>();
        for (const a of runs) {
          const list = vocabByStudent.get(a.student_name) || [];
          list.push(a);
          vocabByStudent.set(a.student_name, list);
        }
        for (const list of vocabByStudent.values()) {
          list.sort((x: any, y: any) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime());
        }

        const lastAnswerByAttempt = new Map<number, string>();
        for (const [id, list] of answersByAttempt.entries()) {
          for (const ans of list) {
            const cur = lastAnswerByAttempt.get(id);
            if (!cur || new Date(ans.answered_at) > new Date(cur)) lastAnswerByAttempt.set(id, ans.answered_at);
          }
        }

        // Per-run enrichment
        const enrichedRuns = runs.map((a: any) => {
          const ans = answersByAttempt.get(a.id) || [];
          const correctIds = new Set(ans.filter((x: any) => x.correct).map((x: any) => x.question_id));
          const wrongPicks = ans.filter((x: any) => !x.correct).length;
          const stageNums = ans.map((x: any) => stageByQuestion.get(x.question_id)).filter((s: any) => s !== undefined);
          const stage = vocabMode === "spelling" && stageNums.length > 0 ? Math.min(...(stageNums as number[])) : null;
          const start = new Date(a.started_at);
          const end = a.completed_at
            ? new Date(a.completed_at)
            : lastAnswerByAttempt.get(a.id)
              ? new Date(lastAnswerByAttempt.get(a.id)!)
              : start;
          const durationSeconds = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
          const total = a.total_questions || ans.length;
          const scorePercent = Math.round((correctIds.size / Math.max(total, 1)) * 100);
          return {
            ...a,
            correct_answers: correctIds.size,
            answered_questions: ans.length,
            wrongPicks,
            stage,
            stageLabel: stage !== null ? categories[stage]?.name || `Stage ${stage + 1}` : null,
            scorePercent,
            startTime: a.started_at,
            endTime: end.toISOString(),
            durationSeconds,
            mastered: !!a.mastered,
            quit: !a.completed,
          };
        });

        // Most-missed words: wrong picks grouped by word, with samples of
        // what the student actually typed/picked.
        const missMap = new Map<number, { count: number; examples: string[] }>();
        for (const ans of allAnswers || []) {
          if (ans.correct) continue;
          const entry = missMap.get(ans.question_id) || { count: 0, examples: [] };
          entry.count += 1;
          if (ans.selected_option && ans.selected_option.trim() && entry.examples.length < 3) {
            entry.examples.push(ans.selected_option.trim());
          }
          missMap.set(ans.question_id, entry);
        }
        const mostMissed = Array.from(missMap.entries())
          .map(([qid, e]) => ({
            questionId: qid,
            label: labelById.get(qid)?.question || `Question ${qid}`,
            transcription: labelById.get(qid)?.explanation || "",
            timesMissed: e.count,
            examples: e.examples,
          }))
          .sort((a, b) => b.timesMissed - a.timesMissed)
          .slice(0, 10);

        // Per-stage stats (spelling only)
        let stages: any[] = [];
        if (vocabMode === "spelling") {
          const stageGroups = new Map<number, any[]>();
          for (const run of enrichedRuns) {
            if (run.stage === null || run.stage === undefined) continue;
            const list = stageGroups.get(run.stage) || [];
            list.push(run);
            stageGroups.set(run.stage, list);
          }
          stages = Array.from(stageGroups.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([stageIdx, list]) => {
              const completedRuns = list.filter((r: any) => r.completed);
              // A stage is only "passed" on a perfect run — the client only
              // unlocks the next stage after a faultless attempt.
              const perfectRuns = completedRuns.filter((r: any) => r.scorePercent === 100);
              const avgScore = completedRuns.length > 0
                ? Math.round(completedRuns.reduce((s: number, r: any) => s + r.scorePercent, 0) / completedRuns.length)
                : 0;
              const avgTime = completedRuns.length > 0
                ? Math.round(completedRuns.reduce((s: number, r: any) => s + (r.durationSeconds || 0), 0) / completedRuns.length)
                : 0;
              return {
                stage: stageIdx + 1,
                name: categories[stageIdx]?.name || `Stage ${stageIdx + 1}`,
                attempts: list.length,
                completedAttempts: completedRuns.length,
                perfectRuns: perfectRuns.length,
                avgScorePercent: avgScore,
                avgTimeSeconds: avgTime,
                wrongPicks: list.reduce((s: number, r: any) => s + (r.wrongPicks || 0), 0),
                studentsCompleted: new Set(perfectRuns.map((r: any) => r.student_name)).size,
                students: new Set(list.map((r: any) => r.student_name)).size,
              };
            });
        }

        // Per-student stats
        const studentMap = new Map<string, any>();
        for (const a of enrichedRuns) {
          const name = a.student_name;
          if (!studentMap.has(name)) {
            studentMap.set(name, {
              studentName: name,
              attempts: 0,
              bestScore: 0,
              bestTime: 0,
              completed: 0,
              totalWarnings: 0,
              wrongPicks: 0,
              stagesCompleted: new Set<number>(),
              stagesCompletedCount: 0,
              mastered: false,
              masteredAtTry: null,
              retriesBeforeStop: 0,
              attemptHistory: [],
            });
          }
          const stats = studentMap.get(name)!;
          stats.attempts += 1;
          if (a.completed) {
            stats.completed += 1;
            if (a.scorePercent > stats.bestScore) {
              stats.bestScore = a.scorePercent;
              stats.bestTime = a.durationSeconds || 0;
            }
          } else {
            stats.bestScore = Math.max(stats.bestScore, a.scorePercent);
          }
          stats.wrongPicks += a.wrongPicks || 0;
          // Only perfect runs pass a stage (client unlocks progressively)
          if (a.stage !== null && a.stage !== undefined && a.completed && a.scorePercent === 100) {
            stats.stagesCompleted.add(a.stage);
          }
        }

        for (const [name, stats] of studentMap.entries()) {
          const chronoRuns = enrichedRuns
            .filter((r: any) => r.student_name === name)
            .sort((x: any, y: any) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime());
          stats.attemptHistory = chronoRuns.map((r: any, i: number) => ({
            tryNumber: i + 1,
            completed: !!r.completed,
            quit: !r.completed,
            correctAnswers: r.correct_answers,
            totalQuestions: r.total_questions,
            scorePercent: r.scorePercent,
            timeSpentSeconds: r.durationSeconds || 0,
            mastered: !!r.mastered,
            wrongPicks: r.wrongPicks,
            stage: r.stage !== null && r.stage !== undefined ? r.stage + 1 : null,
            stageLabel: r.stageLabel,
            startedAt: r.started_at,
            completedAt: r.completed_at,
          }));
          const masteredIdx = stats.attemptHistory.findIndex((h: any) => h.mastered);
          const hasMarker = markers.some((m: any) => m.student_name === name);
          stats.mastered = masteredIdx >= 0 || hasMarker;
          stats.masteredAtTry = masteredIdx >= 0 ? masteredIdx + 1 : null;
          stats.retriesBeforeStop = masteredIdx >= 0 ? masteredIdx : stats.attemptHistory.length;
          stats.stagesCompletedCount = stats.stagesCompleted.size;
        }

        const students = Array.from(studentMap.values()).sort((a: any, b: any) => b.attempts - a.attempts);

        // Summary
        const completedRuns = enrichedRuns.filter((a: any) => a.completed);
        const quitRuns = enrichedRuns.filter((a: any) => !a.completed);
        const wrongPicksTotal = enrichedRuns.reduce((s: number, a: any) => s + (a.wrongPicks || 0), 0);
        const masteredStudents = students.filter((s: any) => s.mastered).length;
        const avgTime = completedRuns.length > 0
          ? Math.round(completedRuns.reduce((s: number, a: any) => s + (a.durationSeconds || 0), 0) / completedRuns.length)
          : 0;
        const avgScore = completedRuns.length > 0
          ? Math.round(completedRuns.reduce((s: number, a: any) => s + a.scorePercent, 0) / completedRuns.length)
          : 0;
        const avgQuitTime = quitRuns.length > 0
          ? Math.round(quitRuns.reduce((s: number, a: any) => s + (a.durationSeconds || 0), 0) / quitRuns.length)
          : 0;

        return NextResponse.json({
          drillSet: { ...drillSet, cardType: "vocabulary", vocabMode },
          summary: {
            totalAttempts: enrichedRuns.length,
            completedAttempts: completedRuns.length,
            quitAttempts: quitRuns.length,
            masteredAttempts: enrichedRuns.filter((a: any) => a.mastered).length,
            masteredStudents,
            masteryRate: students.length > 0 ? Math.round((masteredStudents / students.length) * 100) : 0,
            avgTimeSeconds: avgTime,
            avgScorePercent: avgScore,
            avgQuitTimeSeconds: avgQuitTime,
            wrongPicksTotal,
            avgWrongPicks: enrichedRuns.length > 0 ? Math.round((wrongPicksTotal / enrichedRuns.length) * 10) / 10 : 0,
            // flash: every wrong recall forces a restart from word 1
            restartsTotal: vocabMode === "flash" ? wrongPicksTotal : undefined,
          },
          students,
          attempts: enrichedRuns,
          vocabDetail: { mode: vocabMode, categories, mostMissed, stages },
        });
      }

      const { data: attempts, error } = await supabase
        .from("drill_attempts")
        .select("*")
        .eq("drill_set_id", setIdNum)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // ── Try numbering: each student's attempts, oldest → newest = try 1, 2, 3… ──
      const byStudent = new Map<string, any[]>();
      for (const a of attempts || []) {
        const list = byStudent.get(a.student_name) || [];
        list.push(a);
        byStudent.set(a.student_name, list);
      }
      const tryNumberById = new Map<number, number>();
      for (const list of byStudent.values()) {
        list.sort((x: any, y: any) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime());
        list.forEach((a: any, i: number) => tryNumberById.set(a.id, i + 1));
      }

      // Get last activity time per attempt (for quit/incomplete attempts)
      const attemptIds = (attempts || []).map((a: any) => a.id);
      const { data: allAnswers } = await supabase
        .from("drill_attempt_answers")
        .select("attempt_id, answered_at")
        .in("attempt_id", attemptIds.length > 0 ? attemptIds : [0]);

      const lastActivityByAttempt = new Map<number, string>();
      for (const ans of allAnswers || []) {
        const current = lastActivityByAttempt.get(ans.attempt_id);
        if (!current || new Date(ans.answered_at) > new Date(current)) {
          lastActivityByAttempt.set(ans.attempt_id, ans.answered_at);
        }
      }

      // Enrich each attempt with time window info, try number and mastery flag
      const enrichedAttempts = (attempts || []).map((a: any) => {
        const start = new Date(a.started_at);
        const end = a.completed_at
          ? new Date(a.completed_at)
          : lastActivityByAttempt.get(a.id)
            ? new Date(lastActivityByAttempt.get(a.id)!)
            : start;
        const durationSeconds = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
        return {
          ...a,
          mastered: isMastered(a),
          tryNumber: tryNumberById.get(a.id) || 1,
          startTime: a.started_at,
          endTime: end.toISOString(),
          durationSeconds,
          quit: !a.completed,
        };
      });

      // ── Per-student aggregated stats + full try-by-try history ──
      const studentMap = new Map<string, any>();
      for (const a of attempts || []) {
        const name = a.student_name;
        if (!studentMap.has(name)) {
          studentMap.set(name, {
            studentName: name,
            attempts: 0,
            bestScore: 0,
            bestTime: 0,
            completed: 0,
            totalWarnings: 0,
            mastered: false,
            masteredAtTry: null,
            retriesBeforeStop: 0,
            attemptHistory: [],
          });
        }
        const stats = studentMap.get(name)!;
        stats.attempts++;
        stats.totalWarnings += a.time_warnings_count || 0;
        if (a.completed) {
          stats.completed++;
          const pct = (a.correct_answers / Math.max(a.total_questions, 1)) * 100;
          if (pct > stats.bestScore) {
            stats.bestScore = Math.round(pct);
            stats.bestTime = a.time_spent_seconds || 0;
          }
        }
      }

      // Build chronological history per student (try 1 → try N)
      for (const [name, stats] of studentMap.entries()) {
        const list = byStudent.get(name) || [];
        list.sort((x: any, y: any) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime());
        stats.attemptHistory = list.map((a: any, i: number) => ({
          tryNumber: i + 1,
          completed: !!a.completed,
          quit: !a.completed,
          correctAnswers: a.correct_answers,
          totalQuestions: a.total_questions,
          scorePercent: Math.round((a.correct_answers / Math.max(a.total_questions, 1)) * 100),
          timeSpentSeconds: a.time_spent_seconds || 0,
          mastered: isMastered(a),
          startedAt: a.started_at,
          completedAt: a.completed_at,
        }));
        const masteredIdx = stats.attemptHistory.findIndex((h: any) => h.mastered);
        stats.mastered = masteredIdx >= 0;
        stats.masteredAtTry = masteredIdx >= 0 ? masteredIdx + 1 : null;
        // Tries before success (or before stopping) — the retry count in succession
        stats.retriesBeforeStop = masteredIdx >= 0 ? masteredIdx : stats.attemptHistory.length;
      }

      const students = Array.from(studentMap.values())
        .sort((a, b) => b.attempts - a.attempts);

      // Summary stats
       const completedAttempts = (attempts || []).filter((a: any) => isMastered(a));
      const quitAttempts = (attempts || []).filter((a: any) => !a.completed);
      const masteredAttempts = (attempts || []).filter((a: any) => isMastered(a));
      const masteredStudents = students.filter((s) => s.mastered).length;
      const avgTime = completedAttempts.length > 0
        ? Math.round(completedAttempts.reduce((sum: number, a: any) => sum + (a.time_spent_seconds || 0), 0) / completedAttempts.length)
        : 0;
      const avgScore = completedAttempts.length > 0
        ? Math.round(completedAttempts.reduce((sum: number, a: any) => sum + ((a.correct_answers / Math.max(a.total_questions, 1)) * 100), 0) / completedAttempts.length)
        : 0;
      // Average time spent before quitting (incomplete attempts)
      const quitEnriched = enrichedAttempts.filter((a: any) => !a.completed);
      const avgQuitTime = quitEnriched.length > 0
        ? Math.round(quitEnriched.reduce((sum: number, a: any) => sum + (a.durationSeconds || 0), 0) / quitEnriched.length)
        : 0;

      return NextResponse.json({
        drillSet: drillSet || null,
        summary: {
          totalAttempts: (attempts || []).length,
          completedAttempts: completedAttempts.length,
          quitAttempts: quitAttempts.length,
          masteredAttempts: masteredAttempts.length,
          masteredStudents,
          masteryRate: students.length > 0 ? Math.round((masteredStudents / students.length) * 100) : 0,
          avgTimeSeconds: avgTime,
          avgScorePercent: avgScore,
          avgQuitTimeSeconds: avgQuitTime,
        },
        students,
        attempts: enrichedAttempts,
      });
    }

    // Overall analytics across all drill sets
    const { data: allSets } = await supabase
      .from("drill_sets")
      .select("*")
      .order("created_at", { ascending: false });

    const setsWithStats = await Promise.all(
      (allSets || []).map(async (set: any) => {
        const setCardType = set.card_type || "quiz";
        // Lesson cards track attempts + retries in their own tables
        if (setCardType === "capitalization" || setCardType === "sentence_types" || setCardType === "sentence_combining" || setCardType === "true_false" || setCardType === "combine_seq" || setCardType === "error_correction" || setCardType === "para_gapfill" || setCardType === "sentence_expansion" || setCardType === "sentence_expansion_mcq" || setCardType === "word_table" || setCardType === "study" || setCardType === "definition_recall") {
          const cardDef = getLessonCard(setCardType, set.capitalization_slug);
          const lineCount = cardDef ? cardDef.questions.length : set.question_count || 1;
          const { data: attempts } = await supabase
            .from("capitalization_attempts")
            .select("student_name, status, submissions_count, lines_correct")
            .eq("drill_set_id", set.id);
          const list = attempts || [];
          const masteredList = list.filter((a: any) => a.status === "mastered");
          const totalAttempts = list.length;
          const masteredStudents = new Set(masteredList.map((a: any) => a.student_name)).size;
          const totalStudents = new Set(list.map((a: any) => a.student_name)).size;
          const avgScore = list.length > 0
            ? Math.round(list.reduce((sum, a) => sum + ((a.lines_correct / Math.max(lineCount, 1)) * 100), 0) / list.length)
            : 0;
          const totalSubmissions = list.reduce((sum, a) => sum + (a.submissions_count || 0), 0);
          return {
            ...set,
            question_count: lineCount,
            totalAttempts,
            completedAttempts: masteredList.length,
            completionRate: totalAttempts > 0 ? Math.round((masteredList.length / totalAttempts) * 100) : 0,
            avgScore,
            avgTimeSeconds: 0,
            totalWarnings: 0,
            masteredStudents,
            totalStudents,
            masteryRate: totalStudents > 0 ? Math.round((masteredStudents / totalStudents) * 100) : 0,
            avgSubmissions: totalAttempts > 0 ? Math.round(totalSubmissions / totalAttempts) : 0,
          };
        }

        // Tracked vocabulary cards: stats from interactive runs (markers
        // excluded so card-completion rows don't skew averages)
        if (setCardType === "vocabulary" && VOCAB_TRACKED_SLUGS.includes(set.capitalization_slug || "")) {
          const { data: vocabSetsAttempts } = await supabase
            .from("drill_attempts")
            .select("id, student_name, completed, mastered, total_questions, correct_answers, time_spent_seconds, answered_questions")
            .eq("drill_set_id", set.id);
          const ids = (vocabSetsAttempts || []).map((a: any) => a.id);
          const { data: vocabAnswers } = await supabase
            .from("drill_attempt_answers")
            .select("attempt_id, correct")
            .in("attempt_id", ids.length > 0 ? ids : [0]);
          const answerCountByAttempt = new Map<number, number>();
          for (const ans of vocabAnswers || []) {
            answerCountByAttempt.set(ans.attempt_id, (answerCountByAttempt.get(ans.attempt_id) || 0) + 1);
          }
          const isMarkerRow = (a: any) =>
            !!a.completed && !!a.mastered && !((answerCountByAttempt.get(a.id) ?? 0) > 0);
          const allRows = vocabSetsAttempts || [];
          const markers = allRows.filter(isMarkerRow);
          const runs = allRows.filter((a: any) => !isMarkerRow(a));
          const completedRuns = runs.filter((a: any) => a.completed);
          const totalRuns = runs.length;
          const completionRate = totalRuns > 0 ? Math.round((completedRuns.length / totalRuns) * 100) : 0;
          const avgScore = completedRuns.length > 0
            ? Math.round(completedRuns.reduce((sum: number, a: any) => sum + ((a.correct_answers / Math.max(a.total_questions, 1)) * 100), 0) / completedRuns.length)
            : 0;
          const avgTime = completedRuns.length > 0
            ? Math.round(completedRuns.reduce((sum: number, a: any) => sum + (a.time_spent_seconds || 0), 0) / completedRuns.length)
            : 0;
          const wrongPicks = (vocabAnswers || []).filter((a: any) => !a.correct).length;
          const masteredStudents = new Set([
            ...markers.map((m: any) => m.student_name),
            ...runs.filter((r: any) => r.mastered).map((r: any) => r.student_name),
          ]).size;
          const totalStudents = new Set(runs.map((r: any) => r.student_name)).size;
          return {
            ...set,
            totalAttempts: totalRuns,
            completedAttempts: completedRuns.length,
            completionRate,
            avgScore,
            avgTimeSeconds: avgTime,
            totalWarnings: 0,
            masteredStudents,
            totalStudents,
            masteryRate: totalStudents > 0 ? Math.round((masteredStudents / totalStudents) * 100) : 0,
            wrongPicks,
          };
        }

        const { data: attempts } = await supabase
          .from("drill_attempts")
          .select("completed, correct_answers, total_questions, time_spent_seconds, time_warnings_count, student_name")
          .eq("drill_set_id", set.id);

        const totalAttempts = (attempts || []).length;
        const completed = (attempts || []).filter((a: any) => a.completed);
        const completionRate = totalAttempts > 0 ? Math.round((completed.length / totalAttempts) * 100) : 0;
        const avgScore = completed.length > 0
          ? Math.round(completed.reduce((sum: number, a: any) => sum + ((a.correct_answers / Math.max(a.total_questions, 1)) * 100), 0) / completed.length)
          : 0;
        const avgTime = completed.length > 0
          ? Math.round(completed.reduce((sum: number, a: any) => sum + (a.time_spent_seconds || 0), 0) / completed.length)
          : 0;
        const totalWarnings = (attempts || []).reduce((sum: number, a: any) => sum + (a.time_warnings_count || 0), 0);

        // Mastery stats: distinct students who mastered the card
        const masteredStudents = new Set(
          (attempts || [])
            .filter((a: any) => isMastered(a))
            .map((a: any) => a.student_name)
        ).size;
        const totalStudents = new Set((attempts || []).map((a: any) => a.student_name)).size;

        return {
          ...set,
          totalAttempts,
          completedAttempts: completed.length,
          completionRate,
          avgScore,
          avgTimeSeconds: avgTime,
          totalWarnings,
          masteredStudents,
          totalStudents,
          masteryRate: totalStudents > 0 ? Math.round((masteredStudents / totalStudents) * 100) : 0,
        };
      })
    );

    return NextResponse.json(setsWithStats);
  } catch (error: any) {
    console.error("Drill analytics API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load analytics" },
      { status: 500 }
    );
  }
}
