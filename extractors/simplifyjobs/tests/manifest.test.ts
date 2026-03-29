import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/run", () => ({
  runSimplifyJobs: vi.fn(),
}));

describe("simplifyjobs manifest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards settings to the runner with both repos", async () => {
    const { manifest } = await import("../src/manifest");
    const { runSimplifyJobs } = await import("../src/run");
    const runMock = vi.mocked(runSimplifyJobs);
    runMock.mockResolvedValue({ success: true, jobs: [] });

    await manifest.run({
      source: "simplifyjobs",
      selectedSources: ["simplifyjobs"],
      settings: { jobspyResultsWanted: "50" },
      searchTerms: ["software engineer intern"],
      selectedCountry: "united states",
    });

    expect(runMock).toHaveBeenCalledWith(
      expect.objectContaining({
        repos: ["Summer2026-Internships", "New-Grad-Positions"],
        searchTerms: ["software engineer intern"],
        maxJobs: 50,
      }),
    );
  });

  it("uses default maxJobs when setting is not provided", async () => {
    const { manifest } = await import("../src/manifest");
    const { runSimplifyJobs } = await import("../src/run");
    const runMock = vi.mocked(runSimplifyJobs);
    runMock.mockResolvedValue({ success: true, jobs: [] });

    await manifest.run({
      source: "simplifyjobs",
      selectedSources: ["simplifyjobs"],
      settings: {},
      searchTerms: [],
      selectedCountry: "united states",
    });

    expect(runMock).toHaveBeenCalledWith(
      expect.objectContaining({ maxJobs: 200 }),
    );
  });

  it("returns early when cancelled", async () => {
    const { manifest } = await import("../src/manifest");

    const result = await manifest.run({
      source: "simplifyjobs",
      selectedSources: ["simplifyjobs"],
      settings: {},
      searchTerms: [],
      selectedCountry: "united states",
      shouldCancel: () => true,
    });

    expect(result).toEqual({ success: true, jobs: [] });
  });
});
