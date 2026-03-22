import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { Project, SavedItem } from "./supabase";

type Activity = {
  activityType: string;
  description: string;
  whyItFits: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeObjectives(
  content: Record<string, unknown>,
): { text: string; activities: Activity[] }[] {
  const objectives = content.objectives as
    | { text: string; activities?: Activity[] }[]
    | string[]
    | undefined;
  if (!objectives) return [];
  return objectives.map((o) => {
    if (typeof o === "string") return { text: o, activities: [] };
    return {
      text: o.text || "",
      activities: (o.activities || []).map((a) => ({
        activityType: a.activityType || "",
        description: (a as { description?: string }).description || "",
        whyItFits: a.whyItFits || "",
      })),
    };
  });
}

/** Plain lines for one item body (no title / type line). */
function itemBodyLines(item: SavedItem): string[] {
  const content = item.content as Record<string, unknown>;
  const lines: string[] = [];

  if (item.type === "objective") {
    const objs = normalizeObjectives(content);
    objs.forEach((obj, i) => {
      lines.push(`${i + 1}. ${obj.text}`);
      obj.activities.forEach((a) => {
        const parts = [a.activityType, a.description].filter(Boolean).join(" — ");
        const why = a.whyItFits ? ` (Why it fits: ${a.whyItFits})` : "";
        lines.push(`   • ${parts}${why}`);
      });
    });
    return lines;
  }

  if (item.type === "note") {
    const body = (content.body as string) || "";
    return body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  }

  if (item.type === "outline") {
    const courseTitle = (content.courseTitle as string) || "Untitled course";
    const targetAudience = (content.targetAudience as string) || "";
    const estimatedDuration = (content.estimatedDuration as string) || "";
    lines.push(`Course: ${courseTitle}`);
    const meta = [targetAudience, estimatedDuration].filter(Boolean).join(" · ");
    if (meta) lines.push(meta);
    lines.push("");

    const modules = (content.modules as {
      moduleTitle?: string;
      moduleDescription?: string;
      lessons?: { title?: string; estimatedDuration?: string }[];
      activities?: { activityType?: string; activityDescription?: string }[];
    }[]) || [];

    modules.forEach((mod, mi) => {
      lines.push(`Module ${mi + 1}: ${mod.moduleTitle || `Module ${mi + 1}`}`);
      if (mod.moduleDescription) lines.push(mod.moduleDescription);
      lines.push("");
      if (mod.lessons?.length) {
        lines.push("Lessons:");
        mod.lessons.forEach((les, li) => {
          const dur = les.estimatedDuration ? ` (${les.estimatedDuration})` : "";
          lines.push(`  ${li + 1}. ${les.title || "Lesson"}${dur}`);
        });
        lines.push("");
      }
      if (mod.activities?.length) {
        lines.push("Activities:");
        mod.activities.forEach((a) => {
          lines.push(`  • ${a.activityType || ""} — ${a.activityDescription || ""}`);
        });
        lines.push("");
      }
    });
    return lines;
  }

  lines.push(JSON.stringify(content, null, 2));
  return lines;
}

export function buildProjectPlainText(
  project: Project,
  items: SavedItem[],
  getItemTypeLabel: (type: string) => string,
): string {
  const parts: string[] = [];
  parts.push(project.name);
  if (project.description) {
    parts.push("");
    parts.push(project.description);
  }
  parts.push("");
  parts.push("—".repeat(48));
  parts.push("");

  items.forEach((item) => {
    parts.push(getItemTypeLabel(item.type));
    parts.push(item.title);
    parts.push("");
    parts.push(...itemBodyLines(item));
    parts.push("");
    parts.push("—".repeat(48));
    parts.push("");
  });

  return parts.join("\n").trimEnd() + "\n";
}

function buildItemHtmlBlock(
  item: SavedItem,
  getItemTypeLabel: (type: string) => string,
): string {
  const badge = escapeHtml(getItemTypeLabel(item.type));
  const title = escapeHtml(item.title);
  const bodyLines = itemBodyLines(item);
  const bodyHtml =
    item.type === "note"
      ? bodyLines.map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`).join("")
      : item.type === "objective"
        ? (() => {
            const content = item.content as Record<string, unknown>;
            const objs = normalizeObjectives(content);
            if (objs.length === 0) return "<p><em>(No objectives)</em></p>";
            return `<ol>${objs
              .map((obj) => {
                const acts =
                  obj.activities.length > 0
                    ? `<ul>${obj.activities
                        .map(
                          (a) =>
                            `<li><strong>${escapeHtml(a.activityType)}</strong> — ${escapeHtml(a.description)}${
                              a.whyItFits ? ` <em>(${escapeHtml(a.whyItFits)})</em>` : ""
                            }</li>`,
                        )
                        .join("")}</ul>`
                    : "";
                return `<li><p>${escapeHtml(obj.text)}</p>${acts}</li>`;
              })
              .join("")}</ol>`;
          })()
        : item.type === "outline"
          ? (() => {
              const content = item.content as Record<string, unknown>;
              const courseTitle = escapeHtml((content.courseTitle as string) || "Untitled course");
              const targetAudience = escapeHtml((content.targetAudience as string) || "");
              const estimatedDuration = escapeHtml((content.estimatedDuration as string) || "");
              const meta = [targetAudience, estimatedDuration].filter(Boolean).join(" · ");
              const modules = (content.modules as {
                moduleTitle?: string;
                moduleDescription?: string;
                lessons?: { title?: string; estimatedDuration?: string }[];
                activities?: { activityType?: string; activityDescription?: string }[];
              }[]) || [];
              let html = `<div class="outline-meta"><strong>${courseTitle}</strong>`;
              if (meta) html += `<br/><span>${escapeHtml(meta)}</span>`;
              html += `</div>`;
              modules.forEach((mod, mi) => {
                html += `<h3>${escapeHtml(mod.moduleTitle || `Module ${mi + 1}`)}</h3>`;
                if (mod.moduleDescription) html += `<p>${escapeHtml(mod.moduleDescription)}</p>`;
                if (mod.lessons?.length) {
                  html += `<p><strong>Lessons</strong></p><ol>`;
                  mod.lessons.forEach((les) => {
                    const dur = les.estimatedDuration ? ` (${escapeHtml(les.estimatedDuration)})` : "";
                    html += `<li>${escapeHtml(les.title || "")}${dur}</li>`;
                  });
                  html += `</ol>`;
                }
                if (mod.activities?.length) {
                  html += `<p><strong>Activities</strong></p><ul>`;
                  mod.activities.forEach((a) => {
                    html += `<li><strong>${escapeHtml(a.activityType || "")}</strong> — ${escapeHtml(
                      a.activityDescription || "",
                    )}</li>`;
                  });
                  html += `</ul>`;
                }
              });
              return html;
            })()
          : `<pre>${escapeHtml(bodyLines.join("\n"))}</pre>`;

  return `
    <section class="export-item">
      <div class="export-item-head">
        <span class="export-badge">${badge}</span>
        <h2 class="export-item-title">${title}</h2>
      </div>
      <div class="export-item-body">${bodyHtml}</div>
    </section>
  `;
}

export function openProjectPrintWindow(
  project: Project,
  items: SavedItem[],
  getItemTypeLabel: (type: string) => string,
): void {
  const itemsHtml = items.map((item) => buildItemHtmlBlock(item, getItemTypeLabel)).join("");
  const desc = project.description ? `<p class="project-desc">${escapeHtml(project.description)}</p>` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(project.name)} — Export</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.5; color: #111; margin: 0; padding: 24px 32px; max-width: 800px; margin-left: auto; margin-right: auto; }
    h1 { font-size: 1.75rem; margin: 0 0 8px; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; }
    .project-desc { margin: 0 0 32px; color: #444; font-size: 0.95rem; }
    .export-item { page-break-inside: avoid; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #ddd; }
    .export-item:last-child { border-bottom: none; }
    .export-item-head { margin-bottom: 12px; }
    .export-badge { display: inline-block; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; background: #1e3a8a; color: #fff; padding: 4px 10px; border-radius: 999px; margin-right: 8px; vertical-align: middle; }
    .export-item-title { display: inline; font-size: 1.15rem; font-weight: 600; margin: 0; vertical-align: middle; }
    .export-item-body { margin-top: 8px; font-size: 0.9rem; }
    .export-item-body ol, .export-item-body ul { margin: 8px 0; padding-left: 1.25rem; }
    .export-item-body li { margin-bottom: 6px; }
    .outline-meta { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #eee; }
    pre { white-space: pre-wrap; font-size: 0.8rem; background: #f5f5f5; padding: 12px; border-radius: 8px; }
    @media print {
      body { padding: 12px 20px; }
      .export-item { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(project.name)}</h1>
  ${desc}
  ${itemsHtml}
</body>
</html>`;

  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) {
    alert("Please allow pop-ups to print or save as PDF.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 250);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadProjectAsText(
  project: Project,
  items: SavedItem[],
  getItemTypeLabel: (type: string) => string,
): void {
  const text = buildProjectPlainText(project, items, getItemTypeLabel);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const safe = project.name.replace(/\s+/g, "-").toLowerCase() || "project";
  downloadBlob(blob, `${safe}-export.txt`);
}

export async function downloadProjectAsDocx(
  project: Project,
  items: SavedItem[],
  getItemTypeLabel: (type: string) => string,
): Promise<void> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
      children: [new TextRun({ text: project.name, bold: true })],
    }),
  );

  if (project.description) {
    children.push(new Paragraph({ text: project.description, spacing: { after: 240 } }));
  } else {
    children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
  }

  for (const item of items) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 80 },
        children: [
          new TextRun({ text: `${getItemTypeLabel(item.type)} — `, italics: true, color: "1e3a8a" }),
          new TextRun({ text: item.title, bold: true }),
        ],
      }),
    );

    if (item.type === "objective") {
      const objs = normalizeObjectives(item.content as Record<string, unknown>);
      objs.forEach((obj, i) => {
        children.push(
          new Paragraph({
            spacing: { before: 80, after: 40 },
            children: [new TextRun({ text: `${i + 1}. ${obj.text}` })],
          }),
        );
        obj.activities.forEach((a) => {
          children.push(
            new Paragraph({
              indent: { left: 720 },
              children: [
                new TextRun({ text: `${a.activityType}`, bold: true }),
                new TextRun({ text: ` — ${a.description}` }),
                ...(a.whyItFits
                  ? [new TextRun({ text: ` (${a.whyItFits})`, italics: true })]
                  : []),
              ],
            }),
          );
        });
      });
    } else if (item.type === "note") {
      const body = ((item.content as Record<string, unknown>).body as string) || "";
      body.split(/\n\n+/).forEach((p) => {
        if (p.trim()) children.push(new Paragraph({ text: p.trim(), spacing: { after: 120 } }));
      });
    } else if (item.type === "outline") {
      const c = item.content as Record<string, unknown>;
      const courseTitle = (c.courseTitle as string) || "Untitled course";
      const targetAudience = (c.targetAudience as string) || "";
      const estimatedDuration = (c.estimatedDuration as string) || "";
      children.push(
        new Paragraph({
          children: [new TextRun({ text: courseTitle, bold: true })],
        }),
      );
      const meta = [targetAudience, estimatedDuration].filter(Boolean).join(" · ");
      if (meta) children.push(new Paragraph({ text: meta, spacing: { after: 160 } }));

      const modules = (c.modules as {
        moduleTitle?: string;
        moduleDescription?: string;
        lessons?: { title?: string; estimatedDuration?: string }[];
        activities?: { activityType?: string; activityDescription?: string }[];
      }[]) || [];

      modules.forEach((mod, mi) => {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 160, after: 80 },
            children: [new TextRun({ text: mod.moduleTitle || `Module ${mi + 1}` })],
          }),
        );
        if (mod.moduleDescription) {
          children.push(new Paragraph({ text: mod.moduleDescription, spacing: { after: 120 } }));
        }
        if (mod.lessons?.length) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: "Lessons", bold: true })],
              spacing: { after: 80 },
            }),
          );
          mod.lessons.forEach((les, li) => {
            const dur = les.estimatedDuration ? ` (${les.estimatedDuration})` : "";
            children.push(
              new Paragraph({
                indent: { left: 360 },
                children: [new TextRun({ text: `${li + 1}. ${les.title || ""}${dur}` })],
              }),
            );
          });
        }
        if (mod.activities?.length) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: "Activities", bold: true })],
              spacing: { before: 120, after: 80 },
            }),
          );
          mod.activities.forEach((a) => {
            children.push(
              new Paragraph({
                indent: { left: 360 },
                children: [
                  new TextRun({ text: a.activityType || "", bold: true }),
                  new TextRun({ text: ` — ${a.activityDescription || ""}` }),
                ],
              }),
            );
          });
        }
      });
    } else {
      children.push(
        new Paragraph({
          text: JSON.stringify(item.content, null, 2),
          spacing: { after: 120 },
        }),
      );
    }

    children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const safe = project.name.replace(/\s+/g, "-").toLowerCase() || "project";
  downloadBlob(blob, `${safe}-export.docx`);
}
