import React, { useEffect, useId, useMemo, useRef, useState } from "react";

const bloomsLevels = [
  "Remembering",
  "Understanding",
  "Applying",
  "Analyzing",
  "Evaluating",
  "Creating",
] as const;

type BloomsLevel = (typeof bloomsLevels)[number];

type Objective = {
  id: string;
  text: string;
};

type Theme = "dark" | "light";

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function sampleObjectives(params: {
  blooms: BloomsLevel;
  audience: string;
  count: number;
}): Objective[] {
  const audience = params.audience.trim() || "learners";
  const stems: Record<BloomsLevel, string[]> = {
    Remembering: [
      `Define key terms and concepts relevant to the course content.`,
      `Recall core facts, steps, and definitions from the material.`,
      `List the main components and their functions.`,
    ],
    Understanding: [
      `Explain the main ideas in your own words with accurate examples.`,
      `Summarize the content into clear takeaways and implications.`,
      `Interpret key relationships and describe why they matter.`,
    ],
    Applying: [
      `Use the concepts to complete a realistic task or scenario correctly.`,
      `Apply a process or method to solve a problem with appropriate steps.`,
      `Demonstrate correct use of tools/techniques in a practice activity.`,
    ],
    Analyzing: [
      `Differentiate between related concepts by comparing evidence and criteria.`,
      `Analyze a case to identify root causes, patterns, and constraints.`,
      `Break down a process into parts and describe how they interact.`,
    ],
    Evaluating: [
      `Evaluate options using explicit criteria and justify the best choice.`,
      `Critique an example by identifying strengths, risks, and improvements.`,
      `Assess outcomes against standards and recommend next steps.`,
    ],
    Creating: [
      `Design a solution that meets the stated requirements and constraints.`,
      `Create an artifact (plan, draft, model) that synthesizes the concepts.`,
      `Develop a proposal and iterate based on feedback and evidence.`,
    ],
  };

  const chosen = stems[params.blooms];
  const n = clampInt(params.count, 1, 20);
  const objectives: Objective[] = [];
  for (let i = 0; i < Math.min(n, chosen.length); i++) {
    objectives.push({
      id: `${params.blooms}-${i}`,
      text: `For ${audience}, by the end of this module, students will be able to ${chosen[i]
        .replace(/\.$/, "")
        .toLowerCase()}.`,
    });
  }

  // If user asks for more than our stems, pad with a consistent pattern.
  while (objectives.length < n) {
    const idx = objectives.length + 1;
    objectives.push({
      id: `${params.blooms}-pad-${idx}`,
      text: `For ${audience}, by the end of this module, students will be able to demonstrate ${params.blooms.toLowerCase()}-level performance on objective #${idx}.`,
    });
  }

  return objectives;
}

async function generateObjectivesViaClaude(params: {
  content: string;
  blooms: BloomsLevel;
  audience: string;
  count: number;
}): Promise<Objective[]> {
  const systemPrompt =
    "You are an expert instructional designer with deep knowledge of Bloom's Taxonomy. Your job is to write clear, measurable, Bloom's-aligned learning objectives based on content provided by the user. Each objective must: start with a strong action verb appropriate to the selected Bloom's level, be specific and measurable, be written for the stated audience, and reflect any performance goals or measurements mentioned in the content. You must reference the specific topics, skills, scenarios, and measurable goals from the content provided. Never write generic placeholder objectives. Every objective must be directly traceable to something in the user input. Return only the objectives as a numbered list with no additional commentary.";

  const userPrompt = [
    "Course content or topic overview:",
    params.content.trim(),
    "",
    `Selected Bloom's level: ${params.blooms}`,
    `Audience: ${params.audience || "Not specified"}`,
    `Number of objectives to generate: ${params.count}`,
    "",
    `Write exactly ${params.count} numbered learning objectives following the instructions.`,
  ].join("\n");

  const response = await fetch("http://localhost:3001/api/generate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[Objective Writer] API error:", response.status, errText);
    throw new Error(`API error: ${response.status}. Is the proxy running? Check the console.`);
  }

  const data: {
    content?: { type: string; text?: string }[];
  } = await response.json();

  console.log("[Objective Writer] Claude raw response data:", data);

  const text = (data.content && data.content[0] && data.content[0].text) || "";
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    throw new Error("Claude returned no objectives. Check the console for the raw response.");
  }

  return lines.map((line, index) => {
    const cleaned = line.replace(/^\d+[\).\s-]*/, "").trim();
    return {
      id: `api-${index}`,
      text: cleaned || line,
    };
  });
}

export default function App() {
  const rawId = useId();
  const bloomsId = useId();
  const audienceId = useId();
  const countId = useId();

  const [rawContent, setRawContent] = useState("");
  const [blooms, setBlooms] = useState<BloomsLevel>("Understanding");
  const [audience, setAudience] = useState("adult learners new to the topic");
  const [count, setCount] = useState<number>(3);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [status, setStatus] = useState<"idle" | "generating">("idle");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("objective-writer-theme");
    return stored === "light" || stored === "dark" ? stored : "dark";
  });

  const canGenerate = useMemo(() => {
    const trimmed = rawContent.trim();
    return trimmed.length > 0 && status !== "generating";
  }, [rawContent, status]);

  const showObjectiveCountWarning = useMemo(() => {
    const trimmed = rawContent.trim();
    if (!trimmed.length) return false;
    const n = clampInt(count, 1, 20);
    return n >= 4 && trimmed.length < n * 80;
  }, [rawContent, count]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    window.localStorage.setItem("objective-writer-theme", theme);
  }, [theme]);

  useEffect(() => () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
  }, []);

  function copyObjectivesToClipboard() {
    const list = objectives.slice(0, clampInt(count, 1, 20));
    const text = list.map((obj, i) => `${i + 1}. ${obj.text}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
        copyTimeoutRef.current = null;
      }, 2000);
    });
  }

  async function onGenerate() {
    setStatus("generating");
    setGenerateError(null);
    const trimmedContent = rawContent.trim();
    const safeCount = clampInt(count, 1, 20);
    try {
      const results = await generateObjectivesViaClaude({
        content: trimmedContent,
        blooms,
        audience,
        count: safeCount,
      });
      setObjectives(results);
      setHasGenerated(true);
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="appShell">
      <div className="topBar">
        <div className="brand">
          <div className="logoMark" aria-hidden="true" />
          <div>
            <div className="brandName">Objective Writer</div>
            <div className="brandTag">Draft Bloom-aligned learning objectives in seconds</div>
          </div>
        </div>
        <div className="topBarRight">
          <button
            type="button"
            className="modeToggle"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="Toggle light and dark mode"
          >
            <span className="modeDot" aria-hidden="true" />
            <span className="modeLabel">{theme === "dark" ? "Dark mode" : "Light mode"}</span>
          </button>
          <span className="chip">Powered by Claude</span>
        </div>
      </div>

      <main className="contentGrid">
        <section className="welcome">
          <p className="welcomeTitle">Welcome to Objective Writer.</p>
          <p className="welcomeBody">
            Paste in your course content, choose your settings, and generate polished,
            Bloom&apos;s-aligned learning objectives in seconds.
          </p>
        </section>

        <section className="panel panelForm" aria-label="Inputs">
          <div className="field">
            <label className="label" htmlFor={rawId}>
              Course Content or Topic Overview
            </label>
            <textarea
              id={rawId}
              className="textarea"
              placeholder="Include topics, skills, constraints, assessment expectations, and any specific measurements or performance goals you want learners to hit."
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              rows={10}
            />
            <div className="hintRow">
              <span className="hint">
                Tip: Richer, more detailed input will support stronger, more specific objectives.
              </span>
              <span className="counter">{rawContent.trim().length} chars</span>
            </div>
          </div>

          <div className="twoCol">
            <div className="field">
              <label className="label" htmlFor={bloomsId}>
                Select the performance level
              </label>
              <select
                id={bloomsId}
                className="select"
                value={blooms}
                onChange={(e) => setBlooms(e.target.value as BloomsLevel)}
              >
                {bloomsLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor={countId}>
                Number of objectives
              </label>
              <input
                id={countId}
                className="input"
                type="number"
                min={1}
                max={20}
                step={1}
                value={count}
                onChange={(e) => setCount(clampInt(Number(e.target.value || 1), 1, 20))}
              />
              {showObjectiveCountWarning && (
                <p className="fieldWarning">
                  Your content may be too brief to support this many objectives. Consider adding
                  more detail.
                </p>
              )}
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor={audienceId}>
              Audience description
            </label>
            <input
              id={audienceId}
              className="input"
              placeholder="e.g., first-year nursing students, new sales hires, experienced engineers…"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            />
          </div>

          <div className="actionsRow">
            <button className="button" disabled={!canGenerate} onClick={onGenerate}>
              {status === "generating" ? "Generating…" : "Generate"}
            </button>
            {!rawContent.trim() ? (
              <span className="callout">Paste course content to enable Generate.</span>
            ) : generateError ? (
              <span className="callout calloutError">{generateError}</span>
            ) : (
              <span className="callout">
                Objectives are generated by Claude via the proxy. Run <code>npm run dev</code>.
              </span>
            )}
          </div>
        </section>

        {hasGenerated && (
          <section className="panel panelOutput" aria-label="Generated objectives">
            <div className="panelHeader">
              <div>
                <div className="panelTitle">Generated objectives</div>
                <div className="panelSubtitle">
                  Review and refine before exporting to your LMS or lesson plan.
                </div>
              </div>
              <div className="meta">
                <span className="chip chipStrong">{blooms}</span>
                <span className="chip">{clampInt(count, 1, 20)} requested</span>
              </div>
            </div>

            <ol className="objectiveList">
              {objectives.slice(0, clampInt(count, 1, 20)).map((obj) => (
                <li key={obj.id} className="objectiveCard">
                  <div className="objectiveText">{obj.text}</div>
                </li>
              ))}
            </ol>

            <div className="copyRow">
              <button
                type="button"
                className="copyButton"
                onClick={copyObjectivesToClipboard}
                disabled={copied}
              >
                {copied ? (
                  <>
                    <span className="copyIcon" aria-hidden="true">✓</span>
                    Copied!
                  </>
                ) : (
                  "Copy all"
                )}
              </button>
            </div>

            <div className="footerNote">Refine wording as needed before publishing.</div>
          </section>
        )}
      </main>

      <footer className="appFooter">
        <span>Objective Writer</span>
        <span className="dot">·</span>
        <span>Prism Learning Design</span>
      </footer>
    </div>
  );
}

