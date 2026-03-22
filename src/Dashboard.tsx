import React, { useEffect, useRef, useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { supabase, Project, SavedItem } from "./supabase";
import {
  downloadProjectAsDocx,
  downloadProjectAsPdf,
  downloadProjectAsText,
} from "./projectExport";

type Activity = {
  activityType: string;
  description: string;
  whyItFits: string;
}

export default function Dashboard() {
  const { isSignedIn, isLoaded } = useUser();
  const { userId } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [editTitle, setEditTitle] = useState<string>("");
  const [editObjectives, setEditObjectives] = useState<{ text: string; activities: Activity[] }[]>([]);
  const [editOutline, setEditOutline] = useState<{
    courseTitle: string;
    targetAudience: string;
    estimatedDuration: string;
    modules: {
      moduleTitle: string;
      moduleDescription: string;
      lessons: { title: string; estimatedDuration: string }[];
      activities: { activityType: string; activityDescription: string }[];
    }[];
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) navigate("/");
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    if (!userId) return;
    fetchProjects();
  }, [userId]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [exportMenuOpen]);

  async function fetchProjects() {
    setLoadingProjects(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setProjects(data as Project[]);
    setLoadingProjects(false);
  }

  async function fetchItems(projectId: string) {
    setLoadingItems(true);
    const { data, error } = await supabase
      .from("saved_items")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setItems(data as SavedItem[]);
    setLoadingItems(false);
  }

  async function createProject() {
    if (!newProjectName.trim() || !userId) return;
    setCreatingProject(true);
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || null,
      })
      .select()
      .single();
    if (error) {
      setError(error.message);
    } else {
      setProjects((prev) => [data as Project, ...prev]);
      setNewProjectName("");
      setNewProjectDesc("");
      setShowNewProjectForm(false);
      selectProject(data as Project);
    }
    setCreatingProject(false);
  }

  function selectProject(project: Project) {
    setSelectedProject(project);
    setItems([]);
    setShowNoteForm(false);
    setEditingItem(null);
    fetchItems(project.id);
  }

  async function deleteProject(projectId: string) {
    if (!confirm("Delete this project and all its saved items? This cannot be undone.")) return;
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) { setError(error.message); return; }
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
      setItems([]);
    }
  }

  async function deleteItem(itemId: string) {
    if (!confirm("Remove this item from the project?")) return;
    const { error } = await supabase.from("saved_items").delete().eq("id", itemId);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  function startEditItem(item: SavedItem) {
    setEditingItem(item.id);
    setEditTitle(item.title);
    const content = item.content as Record<string, unknown>;
    if (item.type === "objective") {
      setEditOutline(null);
      const objectives = content.objectives as { text: string; activities?: Activity[] }[] | string[] | undefined;
      const parsed: { text: string; activities: Activity[] }[] = objectives
        ? objectives.map((o) => {
            if (typeof o === "string") return { text: o, activities: [] };
            return { text: o.text, activities: o.activities || [] };
          })
        : [];
      setEditObjectives(parsed);
    } else if (item.type === "outline") {
      setEditObjectives([]);
      const modules = (content.modules as {
        moduleTitle?: string;
        moduleDescription?: string;
        lessons?: { title?: string; estimatedDuration?: string }[];
        activities?: { activityType?: string; activityDescription?: string }[];
      }[]) || [];
      setEditOutline({
        courseTitle: (content.courseTitle as string) || "",
        targetAudience: (content.targetAudience as string) || "",
        estimatedDuration: (content.estimatedDuration as string) || "",
        modules: modules.map((m) => ({
          moduleTitle: m.moduleTitle || "",
          moduleDescription: m.moduleDescription || "",
          lessons: (m.lessons || []).map((l) => ({
            title: l.title || "",
            estimatedDuration: l.estimatedDuration || "",
          })),
          activities: (m.activities || []).map((a) => ({
            activityType: a.activityType || "",
            activityDescription: a.activityDescription || "",
          })),
        })),
      });
    } else if (item.type === "note") {
      setEditOutline(null);
      setEditContent((content.body as string) || "");
    } else {
      setEditOutline(null);
      setEditContent(JSON.stringify(content, null, 2));
    }
  }

  async function saveEdit(item: SavedItem) {
    setSavingEdit(true);
    let updatedContent: Record<string, unknown> = {};
    if (item.type === "objective") {
      updatedContent = {
        ...item.content,
        objectives: editObjectives.map((obj) => ({
          text: obj.text.trim(),
          activities: obj.activities.map((a) => ({
            activityType: a.activityType.trim(),
            description: a.description.trim(),
            whyItFits: a.whyItFits.trim(),
          })),
        })),
      };
    } else if (item.type === "outline" && editOutline) {
      updatedContent = {
        courseTitle: editOutline.courseTitle.trim(),
        targetAudience: editOutline.targetAudience.trim(),
        estimatedDuration: editOutline.estimatedDuration.trim(),
        modules: editOutline.modules.map((m) => ({
          moduleTitle: m.moduleTitle.trim(),
          moduleDescription: m.moduleDescription.trim(),
          lessons: m.lessons.map((l) => ({
            title: l.title.trim(),
            estimatedDuration: l.estimatedDuration.trim(),
          })),
          activities: m.activities.map((a) => ({
            activityType: a.activityType.trim(),
            activityDescription: a.activityDescription.trim(),
          })),
        })),
      };
    } else if (item.type === "note") {
      updatedContent = { body: editContent };
    } else {
      try { updatedContent = JSON.parse(editContent); }
      catch { setError("Invalid JSON content."); setSavingEdit(false); return; }
    }
    const { error } = await supabase
      .from("saved_items")
      .update({ title: editTitle, content: updatedContent, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) { setError(error.message); }
    else {
      setItems((prev) => prev.map((i) =>
        i.id === item.id ? { ...i, title: editTitle, content: updatedContent } : i
      ));
      setEditingItem(null);
      setEditOutline(null);
    }
    setSavingEdit(false);
  }

  async function saveNote() {
    if (!noteTitle.trim() || !noteContent.trim() || !userId || !selectedProject) return;
    setSavingNote(true);
    const { data, error } = await supabase
      .from("saved_items")
      .insert({
        user_id: userId,
        project_id: selectedProject.id,
        type: "note",
        title: noteTitle.trim(),
        content: { body: noteContent.trim() },
      })
      .select()
      .single();
    if (error) { setError(error.message); }
    else {
      setItems((prev) => [data as SavedItem, ...prev]);
      setNoteTitle("");
      setNoteContent("");
      setShowNoteForm(false);
    }
    setSavingNote(false);
  }

  function getItemTypeLabel(type: string) {
    const labels: Record<string, string> = {
      objective: "Objectives",
      outline: "Course Outline",
      scoping: "Project Scoping",
      assessment: "Assessment",
      note: "Note",
    };
    return labels[type] || type;
  }

  function handleExportPdf() {
    if (!selectedProject) return;
    downloadProjectAsPdf(selectedProject, items, getItemTypeLabel);
    setExportMenuOpen(false);
  }

  function handleExportTxt() {
    if (!selectedProject) return;
    downloadProjectAsText(selectedProject, items, getItemTypeLabel);
    setExportMenuOpen(false);
  }

  async function handleExportDocx() {
    if (!selectedProject) return;
    setExportingDocx(true);
    try {
      await downloadProjectAsDocx(selectedProject, items, getItemTypeLabel);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not export Word document.");
    } finally {
      setExportingDocx(false);
      setExportMenuOpen(false);
    }
  }

  function renderItemContent(item: SavedItem) {
    const content = item.content as Record<string, unknown>;
    if (item.type === "objective") {
      const objectives = content.objectives as { text: string; activities?: Activity[] }[] | undefined;
      return (
        <div>
          {objectives?.map((obj, i) => (
            <div key={i} style={{ marginBottom: "12px" }}>
              <p style={{ margin: "4px 0", fontSize: "0.875rem" }}>
                {i + 1}. {typeof obj === "string" ? obj : obj.text}
              </p>
              {typeof obj !== "string" && obj.activities && obj.activities.length > 0 && (
                <ul style={{ margin: "4px 0 0 16px", padding: 0, listStyle: "none" }}>
                  {obj.activities.map((a, idx) => (
                    <li key={idx} style={{ fontSize: "0.8rem", opacity: 0.8, marginBottom: "6px" }}>
                      <strong>{a.activityType}</strong> -- {a.description}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      );
    }
    if (item.type === "note") {
      return <p style={{ fontSize: "0.875rem", whiteSpace: "pre-wrap" }}>{content.body as string}</p>;
    }
    if (item.type === "outline") {
      const courseTitle = content.courseTitle as string;
      const targetAudience = content.targetAudience as string;
      const estimatedDuration = content.estimatedDuration as string;
      const modules = (content.modules as {
        moduleTitle: string;
        moduleDescription: string;
        lessons: { title: string; estimatedDuration: string }[];
        activities?: { activityType: string; activityDescription: string }[];
      }[]) || [];
      return (
        <div>
          <div style={{ marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--stroke)" }}>
            <p style={{ margin: "0 0 4px 0", fontSize: "0.95rem", fontWeight: 600 }}>{courseTitle || "Untitled course"}</p>
            {(targetAudience || estimatedDuration) && (
              <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.8 }}>
                {targetAudience && <span>{targetAudience}</span>}
                {targetAudience && estimatedDuration && " · "}
                {estimatedDuration && <span>{estimatedDuration}</span>}
              </p>
            )}
          </div>
          {modules.map((mod, i) => (
            <div key={i} style={{ marginBottom: "16px" }}>
              <p style={{ margin: "0 0 4px 0", fontSize: "0.875rem", fontWeight: 600 }}>{mod.moduleTitle || `Module ${i + 1}`}</p>
              {mod.moduleDescription && (
                <p style={{ margin: "0 0 8px 0", fontSize: "0.8rem", opacity: 0.8 }}>{mod.moduleDescription}</p>
              )}
              {mod.lessons && mod.lessons.length > 0 && (
                <ol style={{ margin: "0 0 8px 0", paddingLeft: "20px", fontSize: "0.875rem" }}>
                  {mod.lessons.map((les, j) => (
                    <li key={j} style={{ marginBottom: "4px" }}>
                      {les.title}
                      {les.estimatedDuration && (
                        <span style={{ fontSize: "0.75rem", opacity: 0.7, marginLeft: "6px" }}>({les.estimatedDuration})</span>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              {mod.activities && mod.activities.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 600, opacity: 0.8 }}>Activities:</p>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.8rem" }}>
                    {mod.activities.map((a, k) => (
                      <li key={k} style={{ marginBottom: "4px" }}>
                        <strong>{a.activityType}</strong> — {a.activityDescription}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    return <pre style={{ fontSize: "0.75rem", overflow: "auto" }}>{JSON.stringify(content, null, 2)}</pre>;
  }

  if (!isLoaded) return null;

  return (
    <div style={{ display: "flex", gap: "24px", padding: "24px", minHeight: "70vh" }}>
      {/* Sidebar -- Projects */}
      <aside style={{ width: "260px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>My Projects</h2>
          <button
            className="button"
            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
            onClick={() => setShowNewProjectForm((v) => !v)}
          >
            + New
          </button>
        </div>

        {showNewProjectForm && (
          <div style={{ marginBottom: "16px", padding: "12px", background: "var(--surface2)", borderRadius: "8px" }}>
            <input
              className="input"
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              style={{ marginBottom: "8px" }}
            />
            <input
              className="input"
              placeholder="Description (optional)"
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              style={{ marginBottom: "8px" }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="button" style={{ flex: 1, fontSize: "0.8rem" }} onClick={createProject} disabled={creatingProject || !newProjectName.trim()}>
                {creatingProject ? "Creating..." : "Create"}
              </button>
              <button className="copyButton" onClick={() => setShowNewProjectForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {loadingProjects ? (
          <p style={{ fontSize: "0.875rem", opacity: 0.6 }}>Loading...</p>
        ) : projects.length === 0 ? (
          <p style={{ fontSize: "0.875rem", opacity: 0.6 }}>No projects yet. Create one to get started.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {projects.map((project) => (
              <li
                key={project.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  marginBottom: "6px",
                  cursor: "pointer",
                  background: selectedProject?.id === project.id ? "var(--accent)" : "var(--surface2)",
                  color: selectedProject?.id === project.id ? "#fff" : "inherit",
                }}
                onClick={() => selectProject(project)}
              >
                <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{project.name}</div>
                {project.description && (
                  <div style={{ fontSize: "0.75rem", opacity: 0.8, marginTop: "2px" }}>{project.description}</div>
                )}
                <button
                  style={{ fontSize: "0.7rem", opacity: 0.8, background: "none", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "4px", cursor: "pointer", padding: "2px 8px", marginTop: "6px", color: "inherit" }}
                  onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                >
                  Delete project
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Main -- Project Detail */}
      <main style={{ flex: 1 }}>
        {error && (
          <div className="callout calloutError" style={{ marginBottom: "16px" }}>
            {error}
            <button style={{ marginLeft: "12px", background: "none", border: "none", cursor: "pointer" }} onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {!selectedProject ? (
          <div style={{ opacity: 0.5, marginTop: "48px", textAlign: "center" }}>
            <p>Select a project to view its contents.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.25rem" }}>{selectedProject.name}</h1>
                {selectedProject.description && (
                  <p style={{ margin: "4px 0 0", opacity: 0.6, fontSize: "0.875rem" }}>{selectedProject.description}</p>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <button className="copyButton" onClick={() => setShowNoteForm((v) => !v)}>+ Add Note</button>
                <div ref={exportMenuRef} style={{ position: "relative" }}>
                  <button
                    type="button"
                    className="copyButton"
                    aria-expanded={exportMenuOpen}
                    aria-haspopup="menu"
                    aria-controls="dashboard-export-menu"
                    onClick={() => setExportMenuOpen((v) => !v)}
                  >
                    Export ▾
                  </button>
                  {exportMenuOpen && (
                    <div id="dashboard-export-menu" role="menu" className="dashboardExportMenu">
                      <button
                        type="button"
                        role="menuitem"
                        className="dashboardExportMenuItem"
                        onClick={handleExportPdf}
                      >
                        Export as PDF
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="dashboardExportMenuItem"
                        disabled={exportingDocx}
                        onClick={() => void handleExportDocx()}
                      >
                        {exportingDocx ? "Preparing Word…" : "Export as Word (.docx)"}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="dashboardExportMenuItem"
                        onClick={handleExportTxt}
                      >
                        Export as Text (.txt)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {showNoteForm && (
              <div style={{ marginBottom: "24px", padding: "16px", background: "var(--surface2)", borderRadius: "8px" }}>
                <input
                  className="input"
                  placeholder="Note title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  style={{ marginBottom: "8px" }}
                />
                <textarea
                  className="textarea"
                  placeholder="Paste or type your content here..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={5}
                  style={{ marginBottom: "8px" }}
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="button" onClick={saveNote} disabled={savingNote || !noteTitle.trim() || !noteContent.trim()}>
                    {savingNote ? "Saving..." : "Save Note"}
                  </button>
                  <button className="copyButton" onClick={() => setShowNoteForm(false)}>Cancel</button>
                </div>
              </div>
            )}

            {loadingItems ? (
              <p style={{ opacity: 0.6 }}>Loading items...</p>
            ) : items.length === 0 ? (
              <p style={{ opacity: 0.5 }}>No items yet. Generate content in any Prism tool and save it to this project.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {items.map((item) => (
                  <div key={item.id} style={{ padding: "16px", background: "var(--surface2)", borderRadius: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <span className="chip" style={{ marginRight: "8px", fontSize: "0.7rem" }}>{getItemTypeLabel(item.type)}</span>
                        {editingItem === item.id ? (
                          <input
                            className="input"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            style={{ fontSize: "0.875rem", padding: "4px 8px", display: "inline-block", width: "auto" }}
                          />
                        ) : (
                          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{item.title}</span>
                        )}
                        <span style={{ fontSize: "0.7rem", opacity: 0.5, marginLeft: "8px" }}>
                          {new Date(item.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {editingItem === item.id ? (
                          <>
                            <button className="button" style={{ fontSize: "0.8rem", padding: "4px 10px" }} onClick={() => saveEdit(item)} disabled={savingEdit}>
                              {savingEdit ? "Saving..." : "Save"}
                            </button>
                            <button className="copyButton" onClick={() => { setEditingItem(null); setEditOutline(null); }}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className="copyButton" onClick={() => startEditItem(item)}>Edit</button>
                            <button className="copyButton" onClick={() => deleteItem(item.id)}>Remove</button>
                          </>
                        )}
                      </div>
                    </div>

                    {editingItem === item.id ? (
                      item.type === "objective" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                          {editObjectives.map((obj, objIdx) => (
                            <div key={objIdx} style={{ padding: "12px", background: "var(--surface)", borderRadius: "8px" }}>
                              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "6px" }}>
                                Objective {objIdx + 1}
                              </label>
                              <input
                                className="input"
                                value={obj.text}
                                onChange={(e) =>
                                  setEditObjectives((prev) =>
                                    prev.map((o, i) => (i === objIdx ? { ...o, text: e.target.value } : o))
                                  )
                                }
                                placeholder="Objective text"
                                style={{ marginBottom: "12px", width: "100%" }}
                              />
                              {obj.activities.map((act, actIdx) => (
                                <div key={actIdx} style={{ marginBottom: "12px", paddingLeft: "12px", borderLeft: "2px solid var(--stroke)" }}>
                                  <label style={{ display: "block", fontSize: "0.7rem", opacity: 0.8, marginBottom: "4px" }}>
                                    Activity {actIdx + 1}
                                  </label>
                                  <input
                                    className="input"
                                    value={act.activityType}
                                    onChange={(e) =>
                                      setEditObjectives((prev) =>
                                        prev.map((o, i) =>
                                          i === objIdx
                                            ? {
                                                ...o,
                                                activities: o.activities.map((a, j) =>
                                                  j === actIdx ? { ...a, activityType: e.target.value } : a
                                                ),
                                              }
                                            : o
                                        )
                                      )
                                    }
                                    placeholder="Activity type"
                                    style={{ marginBottom: "6px", fontSize: "0.8rem" }}
                                  />
                                  <input
                                    className="input"
                                    value={act.description}
                                    onChange={(e) =>
                                      setEditObjectives((prev) =>
                                        prev.map((o, i) =>
                                          i === objIdx
                                            ? {
                                                ...o,
                                                activities: o.activities.map((a, j) =>
                                                  j === actIdx ? { ...a, description: e.target.value } : a
                                                ),
                                              }
                                            : o
                                        )
                                      )
                                    }
                                    placeholder="Description"
                                    style={{ marginBottom: "6px", fontSize: "0.8rem" }}
                                  />
                                  <input
                                    className="input"
                                    value={act.whyItFits}
                                    onChange={(e) =>
                                      setEditObjectives((prev) =>
                                        prev.map((o, i) =>
                                          i === objIdx
                                            ? {
                                                ...o,
                                                activities: o.activities.map((a, j) =>
                                                  j === actIdx ? { ...a, whyItFits: e.target.value } : a
                                                ),
                                              }
                                            : o
                                        )
                                      )
                                    }
                                    placeholder="Why it fits"
                                    style={{ fontSize: "0.8rem" }}
                                  />
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : item.type === "outline" && editOutline ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                          <div style={{ padding: "12px", background: "var(--surface)", borderRadius: "8px" }}>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "6px" }}>Course title</label>
                            <input
                              className="input"
                              value={editOutline.courseTitle}
                              onChange={(e) => setEditOutline((prev) => prev && { ...prev, courseTitle: e.target.value })}
                              placeholder="Course title"
                              style={{ marginBottom: "8px", width: "100%" }}
                            />
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "6px" }}>Target audience</label>
                            <input
                              className="input"
                              value={editOutline.targetAudience}
                              onChange={(e) => setEditOutline((prev) => prev && { ...prev, targetAudience: e.target.value })}
                              placeholder="Target audience"
                              style={{ marginBottom: "8px", width: "100%" }}
                            />
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "6px" }}>Estimated duration</label>
                            <input
                              className="input"
                              value={editOutline.estimatedDuration}
                              onChange={(e) => setEditOutline((prev) => prev && { ...prev, estimatedDuration: e.target.value })}
                              placeholder="e.g. 4 weeks"
                              style={{ width: "100%" }}
                            />
                          </div>
                          {editOutline.modules.map((mod, modIdx) => (
                            <div key={modIdx} style={{ padding: "12px", background: "var(--surface)", borderRadius: "8px" }}>
                              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "6px" }}>
                                Module {modIdx + 1}
                              </label>
                              <input
                                className="input"
                                value={mod.moduleTitle}
                                onChange={(e) =>
                                  setEditOutline((prev) =>
                                    prev ? {
                                      ...prev,
                                      modules: prev.modules.map((m, i) =>
                                        i === modIdx ? { ...m, moduleTitle: e.target.value } : m
                                      ),
                                    } : null
                                  )
                                }
                                placeholder="Module title"
                                style={{ marginBottom: "8px", width: "100%" }}
                              />
                              <input
                                className="input"
                                value={mod.moduleDescription}
                                onChange={(e) =>
                                  setEditOutline((prev) =>
                                    prev ? {
                                      ...prev,
                                      modules: prev.modules.map((m, i) =>
                                        i === modIdx ? { ...m, moduleDescription: e.target.value } : m
                                      ),
                                    } : null
                                  )
                                }
                                placeholder="Module description"
                                style={{ marginBottom: "12px", width: "100%" }}
                              />
                              {mod.lessons.map((les, lesIdx) => (
                                <div key={lesIdx} style={{ marginBottom: "12px", paddingLeft: "12px", borderLeft: "2px solid var(--stroke)" }}>
                                  <label style={{ display: "block", fontSize: "0.7rem", opacity: 0.8, marginBottom: "4px" }}>
                                    Lesson {lesIdx + 1}
                                  </label>
                                  <input
                                    className="input"
                                    value={les.title}
                                    onChange={(e) =>
                                      setEditOutline((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              modules: prev.modules.map((m, i) =>
                                                i === modIdx
                                                  ? {
                                                      ...m,
                                                      lessons: m.lessons.map((l, j) =>
                                                        j === lesIdx ? { ...l, title: e.target.value } : l
                                                      ),
                                                    }
                                                  : m
                                              ),
                                            }
                                          : null
                                      )
                                    }
                                    placeholder="Lesson title"
                                    style={{ marginBottom: "6px", fontSize: "0.8rem" }}
                                  />
                                  <input
                                    className="input"
                                    value={les.estimatedDuration}
                                    onChange={(e) =>
                                      setEditOutline((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              modules: prev.modules.map((m, i) =>
                                                i === modIdx
                                                  ? {
                                                      ...m,
                                                      lessons: m.lessons.map((l, j) =>
                                                        j === lesIdx ? { ...l, estimatedDuration: e.target.value } : l
                                                      ),
                                                    }
                                                  : m
                                              ),
                                            }
                                          : null
                                      )
                                    }
                                    placeholder="Estimated duration"
                                    style={{ fontSize: "0.8rem" }}
                                  />
                                </div>
                              ))}
                              {mod.activities.map((act, actIdx) => (
                                <div key={actIdx} style={{ marginBottom: "12px", paddingLeft: "12px", borderLeft: "2px solid var(--stroke)" }}>
                                  <label style={{ display: "block", fontSize: "0.7rem", opacity: 0.8, marginBottom: "4px" }}>
                                    Activity {actIdx + 1}
                                  </label>
                                  <input
                                    className="input"
                                    value={act.activityType}
                                    onChange={(e) =>
                                      setEditOutline((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              modules: prev.modules.map((m, i) =>
                                                i === modIdx
                                                  ? {
                                                      ...m,
                                                      activities: m.activities.map((a, j) =>
                                                        j === actIdx ? { ...a, activityType: e.target.value } : a
                                                      ),
                                                    }
                                                  : m
                                              ),
                                            }
                                          : null
                                      )
                                    }
                                    placeholder="Activity type"
                                    style={{ marginBottom: "6px", fontSize: "0.8rem" }}
                                  />
                                  <input
                                    className="input"
                                    value={act.activityDescription}
                                    onChange={(e) =>
                                      setEditOutline((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              modules: prev.modules.map((m, i) =>
                                                i === modIdx
                                                  ? {
                                                      ...m,
                                                      activities: m.activities.map((a, j) =>
                                                        j === actIdx ? { ...a, activityDescription: e.target.value } : a
                                                      ),
                                                    }
                                                  : m
                                              ),
                                            }
                                          : null
                                      )
                                    }
                                    placeholder="Activity description"
                                    style={{ fontSize: "0.8rem" }}
                                  />
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <textarea
                          className="textarea"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={6}
                        />
                      )
                    ) : (
                      renderItemContent(item)
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}