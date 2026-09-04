import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveHandle: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("../workspace", () => ({
  getActiveHandle: mocks.getActiveHandle,
}));

vi.mock("../db/indexeddb", () => ({
  getProject: mocks.getProject,
  getProjects: vi.fn(),
  createProject: mocks.createProject,
  updateProject: mocks.updateProject,
  deleteMessagesByProject: vi.fn(),
  deleteProject: vi.fn(),
}));

vi.mock("../db/fs", () => ({
  getProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));

vi.mock("../debug", () => ({
  debugLog: vi.fn(),
  debugWarn: vi.fn(),
  redact: vi.fn((value) => value),
}));

import { rotateProjectKey, saveJoinedProject } from "./manager";

describe("saveJoinedProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveHandle.mockReturnValue(null);
  });

  it("persists refreshed metadata on an existing joined project", async () => {
    const existing = {
      id: "project-id",
      name: "Loading Project...",
      role: "editor" as const,
      projectMasterKey: "old-key",
      lastOpened: 1,
    };
    mocks.getProject.mockResolvedValue(existing);

    await saveJoinedProject("project-id", "Shared project", "new-key");

    expect(mocks.updateProject).toHaveBeenCalledOnce();
    expect(mocks.updateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Shared project",
        projectMasterKey: "new-key",
        lastOpened: expect.any(Number),
      })
    );
    expect(mocks.createProject).not.toHaveBeenCalled();
  });

  it("rotates the owner's project capability", async () => {
    mocks.getProject.mockResolvedValue({
      id: "project-id",
      name: "Private project",
      role: "owner",
      projectMasterKey: "old-key",
      lastOpened: 1,
    });

    const project = await rotateProjectKey("project-id");

    expect(project.projectMasterKey).not.toBe("old-key");
    expect(atob(project.projectMasterKey || "")).toHaveLength(32);
    expect(mocks.updateProject).toHaveBeenCalledWith(project);
  });
});
