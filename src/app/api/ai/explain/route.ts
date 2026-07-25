import { NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-1.5-flash"; // Using 1.5 Flash for more generous free tier quotas

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI explanation service is not configured. Ask your teacher to set up the GEMINI_API_KEY." },
      { status: 500 }
    );
  }

  try {
    const {
      questionText,
      options,
      correctAnswer,
      explanation,
      passage,
      studentQuery,
    } = await req.json();

    const prompt = buildPrompt({
      questionText,
      options,
      correctAnswer,
      explanation,
      passage,
      studentQuery,
    });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 500, // Reduced to be kinder to free tier quotas
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", res.status, errText);

      // Check for 429 quota errors and extract retry delay
      if (res.status === 429) {
        try {
          const errBody = JSON.parse(errText);
          const retryDelay = extractRetryDelay(errBody);
          return NextResponse.json(
            {
              error: "AI rate limit reached. " + (retryDelay > 0
                ? `Please wait about ${Math.ceil(retryDelay)} seconds before trying again.`
                : "Please wait a moment before trying again."),
              retryAfter: Math.ceil(retryDelay),
              isQuota: true,
            },
            { status: 429 }
          );
        } catch {
          // If we can't parse the error, return a generic message
          return NextResponse.json(
            { error: "AI service is currently busy. Please try again in a minute.", isQuota: true, retryAfter: 30 },
            { status: 429 }
          );
        }
      }

      return NextResponse.json(
        { error: "AI service temporarily unavailable. Please try again." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const aiText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't generate an explanation right now.";

    return NextResponse.json({ explanation: aiText });
  } catch (err) {
    console.error("AI explain route error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Extract retry delay in seconds from a Gemini API 429 error response.
 * Looks for retryDelay field (e.g. "23.628138485s") and returns the numeric value.
 */
function extractRetryDelay(errBody: any): number {
  try {
    const details = errBody?.error?.details;
    if (!Array.isArray(details)) return 0;

    for (const detail of details) {
      if (detail?.["@type"] === "type.googleapis.com/google.rpc.RetryInfo") {
        const delayStr = detail?.retryDelay;
        if (typeof delayStr === "string") {
          // Parse "23.628138485s" into seconds
          const match = delayStr.match(/^([\d.]+)s$/);
          if (match) return parseFloat(match[1]);
        }
      }
    }
  } catch {}
  return 0;
}

type BuildPromptParams = {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  passage?: string;
  studentQuery?: string;
};

function buildPrompt({
  questionText,
  options,
  correctAnswer,
  explanation,
  passage,
  studentQuery,
}: BuildPromptParams): string {
  let prompt = `You are a helpful, encouraging tutor for secondary school students in Nigeria (JSS3 and SS3 levels). Your job is to explain exam questions in a clear, simple, and supportive way.

## QUESTION
${questionText}

`;

  if (passage) {
    prompt += `## PASSAGE (reading comprehension reference)
${passage}

`;
  }

  prompt += `## OPTIONS
${options.map((opt, i) => `${String.fromCharCode(97 + i)}) ${opt}`).join("\n")}

## CORRECT ANSWER
${correctAnswer}

## OFFICIAL EXPLANATION
${explanation}

`;

  if (studentQuery && studentQuery.trim()) {
    prompt += `## STUDENT'S QUESTION
${studentQuery.trim()}

Please answer the student's specific question above in a helpful, encouraging way.`;
  } else {
    prompt += `Please explain WHY the correct answer is correct and why the other options are wrong. Make it easy to understand for a secondary school student. Use simple language, avoid jargon, and keep it encouraging. Format your response with short paragraphs or bullet points for readability. Do NOT refer to yourself as an AI or mention that you are an AI. Just be a helpful tutor.`;
  }

  return prompt;
}
