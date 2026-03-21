import React, { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { supabase, Project, SavedItem } from "./supabase";

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
  const [savingEdit, setSavingEdit] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) navigate("/");
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    if (!userId) return;
    fetchProjects();
  }, [userId]);

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
      const objectives = content.objectives as { text: string; activities?: Activity[] }[] | string[] | undefined;
      setEditContent(
        objectives
          ? objectives.map((o) => (typeof o === "string" ? o : o.text)).join("\n")
          : ""
      );
    } else if (item.type === "note") {
      setEditContent((content.body as string) || "");
    } else {
      setEditContent(JSON.stringify(content, null, 2));
    }
  }

  async function saveEdit(item: SavedItem) {
    setSavingEdit(true);
    let updatedContent: Record<string, unknown> = {};
    if (item.type === "objective") {
      const lines = editContent.split("\n").map((l) => l.trim()).filter(Boolean);
      const existingObjectives = item.content.objectives as { text: string; activities?: Activity[] }[] | string[] | undefined;
      updatedContent = {
        ...item.content,
        objectives: lines.map((text, i) => {
          const existing = existingObjectives?.[i];
          return {
            text,
            activities: existing && typeof existing !== "string" ? existing.activities : [],
          };
        }),
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

  function exportProject() {
    if (!selectedProject) return;
    const exportData = {
      project: selectedProject,
      items: items,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedProject.name.replace(/\s+/g, "-").toLowerCase()}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
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
                  style={{ fontSize: "0.7rem", opacity: 0.6, background: "none", border: "none", cursor: "pointer", padding: "4px 0 0", color: "inherit" }}
                  onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                >
                  Delete
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
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="copyButton" onClick={() => setShowNoteForm((v) => !v)}>+ Add Note</button>
                <button className="copyButton" onClick={exportProject}>Export</button>
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
                            <button className="copyButton" onClick={() => setEditingItem(null)}>Cancel</button>
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
                      <textarea
                        className="textarea"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={6}
                      />
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