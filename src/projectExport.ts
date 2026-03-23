import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { jsPDF } from "jspdf";
import type { Project, SavedItem } from "./supabase";

type Activity = {
  activityType: string;
  description: string;
  whyItFits: string;
};

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

/** Full plain text for one saved item (clipboard, email body). */
export function getSavedItemFullPlainText(
  item: SavedItem,
  getItemTypeLabel: (type: string) => string,
): string {
  const header = `${getItemTypeLabel(item.type)}: ${item.title}`;
  if (item.type === "note") {
    const body = ((item.content as Record<string, unknown>).body as string) || "";
    return `${header}\n\n${body}`.trim();
  }
  const body = itemBodyLines(item).join("\n");
  return `${header}\n\n${body}`.trim();
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

function safePdfFileBase(name: string): string {
  const trimmed = name.trim() || "project";
  return (
    trimmed
      .replace(/[/\\?%*:|"<>]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "project"
  );
}

/**
 * Builds a PDF with project title, description, and all saved items (objectives, outlines, notes).
 * Downloads as `[project-name].pdf` (sanitized).
 */
export function downloadProjectAsPdf(
  project: Project,
  items: SavedItem[],
  getItemTypeLabel: (type: string) => string,
): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  /** Baseline below top margin (room for first line of text). */
  let y = margin + 18;

  function ensureSpace(needed: number): void {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin + 18;
    }
  }

  function flushLines(lines: string[], x: number, fontSize: number, lineGap: number, style: "normal" | "bold" | "italic"): void {
    doc.setFont("helvetica", style === "bold" ? "bold" : style === "italic" ? "italic" : "normal");
    doc.setFontSize(fontSize);
    for (const raw of lines) {
      const wrapped = doc.splitTextToSize(raw, contentW - (x - margin));
      for (const wline of wrapped) {
        ensureSpace(lineGap + 2);
        doc.text(wline, x, y);
        y += lineGap;
      }
    }
  }

  function addParagraph(text: string, fontSize = 11, lineGap = 14, indent = 0): void {
    flushLines([text], margin + indent, fontSize, lineGap, "normal");
  }

  function addHeading(text: string, fontSize: number, lineGap: number): void {
    flushLines([text], margin, fontSize, lineGap, "bold");
  }

  // Title — project name
  addHeading(project.name, 20, 24);
  y += 8;

  if (project.description?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    const descLines = doc.splitTextToSize(project.description.trim(), contentW);
    for (const line of descLines) {
      ensureSpace(15);
      doc.text(line, margin, y);
      y += 15;
    }
    doc.setTextColor(0, 0, 0);
    y += 16;
  } else {
    y += 12;
  }

  const sectionTopGap = 28;
  const afterHeaderGap = 10;

  for (const item of items) {
    y += sectionTopGap;
    ensureSpace(36);
    const header = `${getItemTypeLabel(item.type)} — ${item.title}`;
    addHeading(header, 13, 16);
    y += afterHeaderGap;

    if (item.type === "objective") {
      const objs = normalizeObjectives(item.content as Record<string, unknown>);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      objs.forEach((obj, i) => {
        const numbered = `${i + 1}. ${obj.text}`;
        const lines = doc.splitTextToSize(numbered, contentW - 8);
        for (const line of lines) {
          ensureSpace(15);
          doc.text(line, margin + 4, y);
          y += 15;
        }
        obj.activities.forEach((a) => {
          const actText = `• ${[a.activityType, a.description].filter(Boolean).join(" — ")}${
            a.whyItFits ? ` (${a.whyItFits})` : ""
          }`;
          const actWrapped = doc.splitTextToSize(actText, contentW - 28);
          for (const al of actWrapped) {
            ensureSpace(13);
            doc.text(al, margin + 20, y);
            y += 13;
          }
        });
        y += 4;
      });
    } else if (item.type === "note") {
      const body = ((item.content as Record<string, unknown>).body as string) || "";
      const paras = body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      paras.forEach((para, pi) => {
        const wrapped = doc.splitTextToSize(para, contentW);
        for (const line of wrapped) {
          ensureSpace(14);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
          doc.text(line, margin, y);
          y += 14;
        }
        if (pi < paras.length - 1) y += 10;
      });
    } else if (item.type === "outline") {
      const c = item.content as Record<string, unknown>;
      const courseTitle = (c.courseTitle as string) || "Untitled course";
      const targetAudience = (c.targetAudience as string) || "";
      const estimatedDuration = (c.estimatedDuration as string) || "";
      addHeading(courseTitle, 12, 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const meta = [targetAudience, estimatedDuration].filter(Boolean).join(" · ");
      if (meta) {
        const metaWrapped = doc.splitTextToSize(meta, contentW);
        for (const line of metaWrapped) {
          ensureSpace(13);
          doc.setTextColor(80, 80, 80);
          doc.text(line, margin, y);
          y += 13;
        }
        doc.setTextColor(0, 0, 0);
      }
      y += 8;

      const modules = (c.modules as {
        moduleTitle?: string;
        moduleDescription?: string;
        lessons?: { title?: string; estimatedDuration?: string }[];
        activities?: { activityType?: string; activityDescription?: string }[];
      }[]) || [];

      modules.forEach((mod, mi) => {
        y += 6;
        addHeading(mod.moduleTitle || `Module ${mi + 1}`, 12, 15);
        if (mod.moduleDescription?.trim()) {
          addParagraph(mod.moduleDescription.trim(), 10, 13, 0);
        }
        if (mod.lessons?.length) {
          ensureSpace(14);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text("Lessons", margin, y);
          y += 14;
          mod.lessons.forEach((les, li) => {
            const dur = les.estimatedDuration ? ` (${les.estimatedDuration})` : "";
            const lesLine = `${li + 1}. ${les.title || "Lesson"}${dur}`;
            const lw = doc.splitTextToSize(lesLine, contentW - 16);
            for (const line of lw) {
              ensureSpace(13);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(10);
              doc.text(line, margin + 12, y);
              y += 13;
            }
          });
        }
        if (mod.activities?.length) {
          y += 4;
          ensureSpace(14);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text("Activities", margin, y);
          y += 14;
          mod.activities.forEach((a) => {
            const line = `• ${a.activityType || ""} — ${a.activityDescription || ""}`;
            const aw = doc.splitTextToSize(line, contentW - 16);
            for (const al of aw) {
              ensureSpace(13);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(10);
              doc.text(al, margin + 12, y);
              y += 13;
            }
          });
        }
      });
    } else {
      const json = JSON.stringify(item.content, null, 2);
      const wrapped = doc.splitTextToSize(json, contentW);
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      for (const line of wrapped) {
        ensureSpace(10);
        doc.text(line, margin, y);
        y += 10;
      }
      doc.setFont("helvetica", "normal");
    }
  }

  const base = safePdfFileBase(project.name);
  doc.save(`${base}.pdf`);
}

/**
 * Downloads a single saved item as a PDF (project name optional subtitle).
 */
export function downloadSavedItemAsPdf(
  item: SavedItem,
  getItemTypeLabel: (type: string) => string,
  options?: { projectName?: string },
): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  let y = margin + 18;

  function ensureSpace(needed: number): void {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin + 18;
    }
  }

  function flushLines(lines: string[], x: number, fontSize: number, lineGap: number, style: "normal" | "bold" | "italic"): void {
    doc.setFont("helvetica", style === "bold" ? "bold" : style === "italic" ? "italic" : "normal");
    doc.setFontSize(fontSize);
    for (const raw of lines) {
      const wrapped = doc.splitTextToSize(raw, contentW - (x - margin));
      for (const wline of wrapped) {
        ensureSpace(lineGap + 2);
        doc.text(wline, x, y);
        y += lineGap;
      }
    }
  }

  function addParagraph(text: string, fontSize = 11, lineGap = 14, indent = 0): void {
    flushLines([text], margin + indent, fontSize, lineGap, "normal");
  }

  function addHeading(text: string, fontSize: number, lineGap: number): void {
    flushLines([text], margin, fontSize, lineGap, "bold");
  }

  if (options?.projectName?.trim()) {
    addHeading(options.projectName.trim(), 12, 16);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    ensureSpace(12);
    doc.text("Project", margin, y);
    y += 14;
    doc.setTextColor(0, 0, 0);
  }

  addHeading(`${getItemTypeLabel(item.type)} — ${item.title}`, 15, 20);
  y += 12;

  if (item.type === "objective") {
    const objs = normalizeObjectives(item.content as Record<string, unknown>);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    objs.forEach((obj, i) => {
      const numbered = `${i + 1}. ${obj.text}`;
      const lines = doc.splitTextToSize(numbered, contentW - 8);
      for (const line of lines) {
        ensureSpace(15);
        doc.text(line, margin + 4, y);
        y += 15;
      }
      obj.activities.forEach((a) => {
        const actText = `• ${[a.activityType, a.description].filter(Boolean).join(" — ")}${
          a.whyItFits ? ` (${a.whyItFits})` : ""
        }`;
        const actWrapped = doc.splitTextToSize(actText, contentW - 28);
        for (const al of actWrapped) {
          ensureSpace(13);
          doc.text(al, margin + 20, y);
          y += 13;
        }
      });
      y += 4;
    });
  } else if (item.type === "note") {
    const body = ((item.content as Record<string, unknown>).body as string) || "";
    const paras = body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    if (paras.length === 0 && body.trim()) {
      paras.push(body.trim());
    }
    paras.forEach((para, pi) => {
      const wrapped = doc.splitTextToSize(para, contentW);
      for (const line of wrapped) {
        ensureSpace(14);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(line, margin, y);
        y += 14;
      }
      if (pi < paras.length - 1) y += 10;
    });
  } else if (item.type === "outline") {
    const c = item.content as Record<string, unknown>;
    const courseTitle = (c.courseTitle as string) || "Untitled course";
    const targetAudience = (c.targetAudience as string) || "";
    const estimatedDuration = (c.estimatedDuration as string) || "";
    addHeading(courseTitle, 12, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const meta = [targetAudience, estimatedDuration].filter(Boolean).join(" · ");
    if (meta) {
      const metaWrapped = doc.splitTextToSize(meta, contentW);
      for (const line of metaWrapped) {
        ensureSpace(13);
        doc.setTextColor(80, 80, 80);
        doc.text(line, margin, y);
        y += 13;
      }
      doc.setTextColor(0, 0, 0);
    }
    y += 8;

    const modules = (c.modules as {
      moduleTitle?: string;
      moduleDescription?: string;
      lessons?: { title?: string; estimatedDuration?: string }[];
      activities?: { activityType?: string; activityDescription?: string }[];
    }[]) || [];

    modules.forEach((mod, mi) => {
      y += 6;
      addHeading(mod.moduleTitle || `Module ${mi + 1}`, 12, 15);
      if (mod.moduleDescription?.trim()) {
        addParagraph(mod.moduleDescription.trim(), 10, 13, 0);
      }
      if (mod.lessons?.length) {
        ensureSpace(14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Lessons", margin, y);
        y += 14;
        mod.lessons.forEach((les, li) => {
          const dur = les.estimatedDuration ? ` (${les.estimatedDuration})` : "";
          const lesLine = `${li + 1}. ${les.title || "Lesson"}${dur}`;
          const lw = doc.splitTextToSize(lesLine, contentW - 16);
          for (const line of lw) {
            ensureSpace(13);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(line, margin + 12, y);
            y += 13;
          }
        });
      }
      if (mod.activities?.length) {
        y += 4;
        ensureSpace(14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Activities", margin, y);
        y += 14;
        mod.activities.forEach((a) => {
          const line = `• ${a.activityType || ""} — ${a.activityDescription || ""}`;
          const aw = doc.splitTextToSize(line, contentW - 16);
          for (const al of aw) {
            ensureSpace(13);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(al, margin + 12, y);
            y += 13;
          }
        });
      }
    });
  } else {
    const json = JSON.stringify(item.content, null, 2);
    const wrapped = doc.splitTextToSize(json, contentW);
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    for (const line of wrapped) {
      ensureSpace(10);
      doc.text(line, margin, y);
      y += 10;
    }
    doc.setFont("helvetica", "normal");
  }

  const base = safePdfFileBase(item.title);
  doc.save(`${base}.pdf`);
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
