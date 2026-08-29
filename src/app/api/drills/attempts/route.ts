import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLessonCard } from "@/lib/server/lesson-cards";

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

      // Update attempt counts
      const { data: answers } = await supabase
        .from("drill_attempt_answers")
        .select("id, correct")
        .eq("attempt_id", attemptId);

      const answeredCount = (answers || []).length;
      const correctCount = (answers || []).filter((a: any) => a.correct).length;

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
      // never depends on client-sent values.
      const [{ data: answers }, { data: attemptRow }] = await Promise.all([
        supabase.from("drill_attempt_answers").select("correct").eq("attempt_id", attemptId),
        supabase.from("drill_attempts").select("total_questions").eq("id", attemptId).maybeSingle(),
      ]);

      const answered = (answers || []).length;
      const correct = (answers || []).filter((a: any) => a.correct).length;
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

    // An attempt is mastered when the card was completed with every question correct
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
      const isLessonCard = drillCardType === "capitalization" || drillCardType === "sentence_types" || drillCardType === "sentence_combining" || drillCardType === "true_false" || drillCardType === "combine_seq";
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
      const completedAttempts = (attempts || []).filter((a: any) => a.completed);
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
        if (setCardType === "capitalization" || setCardType === "sentence_types" || setCardType === "sentence_combining" || setCardType === "true_false" || setCardType === "combine_seq") {
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
