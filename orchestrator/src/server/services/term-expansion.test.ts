import { describe, expect, it } from "vitest";
import {
  deduplicateTerms,
  type ExtractedTerm,
  filterJobsByScope,
} from "./term-expansion";

function makeScoredJob(overrides: {
  id: string;
  score: number;
  jd?: string | null;
}) {
  return {
    id: overrides.id,
    title: `Job ${overrides.id}`,
    employer: "TestCo",
    jobUrl: "",
    source: "test" as const,
    sourceJobId: null,
    jobUrlDirect: null,
    datePosted: null,
    employerUrl: null,
    applicationLink: null,
    disciplines: null,
    degreeRequired: null,
    location: null,
    salary: null,
    jobDescription: overrides.jd !== undefined ? overrides.jd : `Description for ${overrides.id}`,
    status: "discovered" as const,
    suitabilityScore: overrides.score,
    suitabilityReason: "test",
    createdAt: "",
    updatedAt: "",
    pdfPath: null,
    tailoredSummary: null,
    tailoredHeadline: null,
    tailoredSkills: null,
    selectedProjectIds: null,
    sponsorMatchScore: 0,
    sponsorMatchNames: null,
    tracerLinksEnabled: false,
  };
}

describe("filterJobsByScope", () => {
  const jobs = [
    makeScoredJob({ id: "a", score: 90 }),
    makeScoredJob({ id: "b", score: 70 }),
    makeScoredJob({ id: "c", score: 50 }),
    makeScoredJob({ id: "d", score: 85 }),
    makeScoredJob({ id: "e", score: 60, jd: null }),
    makeScoredJob({ id: "f", score: 95, jd: "" }),
    makeScoredJob({ id: "g", score: 80, jd: "   " }),
  ];

  it("top_n returns top N jobs with descriptions, sorted desc", () => {
    const result = filterJobsByScope(jobs, { mode: "top_n", n: 3 });
    expect(result.map((j) => j.id)).toEqual(["a", "d", "b"]);
  });

  it("top_n excludes jobs with null/empty/whitespace descriptions", () => {
    const result = filterJobsByScope(jobs, { mode: "top_n", n: 10 });
    const ids = result.map((j) => j.id);
    expect(ids).not.toContain("e"); // null
    expect(ids).not.toContain("f"); // empty string
    expect(ids).not.toContain("g"); // whitespace only
  });

  it("above_score returns jobs scoring at or above threshold", () => {
    const result = filterJobsByScope(jobs, {
      mode: "above_score",
      threshold: 80,
    });
    expect(result.map((j) => j.id)).toEqual(["a", "d"]);
  });

  it("all returns all jobs with descriptions, sorted desc", () => {
    const result = filterJobsByScope(jobs, { mode: "all" });
    expect(result).toHaveLength(4); // e, f, g excluded
    expect(result[0].suitabilityScore).toBeGreaterThanOrEqual(
      result[1].suitabilityScore,
    );
  });

  it("returns empty array when no jobs have descriptions", () => {
    const emptyJobs = [
      makeScoredJob({ id: "x", score: 90, jd: null }),
      makeScoredJob({ id: "y", score: 80, jd: "" }),
    ];
    const result = filterJobsByScope(emptyJobs, { mode: "all" });
    expect(result).toEqual([]);
  });
});

describe("deduplicateTerms", () => {
  it("removes terms that exist in search terms (case-insensitive)", () => {
    const terms: ExtractedTerm[] = [
      { term: "Machine Learning", confidence: 0.9, sourceJobIds: ["j1"] },
      { term: "web developer", confidence: 0.8, sourceJobIds: ["j2"] },
    ];
    const result = deduplicateTerms(terms, ["Web Developer"]);
    expect(result).toHaveLength(1);
    expect(result[0].term).toBe("Machine Learning");
  });

  it("keeps highest confidence when terms duplicate (case-insensitive)", () => {
    const terms: ExtractedTerm[] = [
      { term: "MLOps", confidence: 0.7, sourceJobIds: ["j1"] },
      { term: "mlops", confidence: 0.9, sourceJobIds: ["j2"] },
      { term: "MLOPS", confidence: 0.5, sourceJobIds: ["j3"] },
    ];
    const result = deduplicateTerms(terms, []);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.9);
    expect(result[0].term).toBe("mlops"); // from the highest confidence entry
  });

  it("merges sourceJobIds across duplicates", () => {
    const terms: ExtractedTerm[] = [
      { term: "SDE", confidence: 0.8, sourceJobIds: ["j1", "j2"] },
      { term: "sde", confidence: 0.6, sourceJobIds: ["j2", "j3"] },
    ];
    const result = deduplicateTerms(terms, []);
    expect(result).toHaveLength(1);
    expect(result[0].sourceJobIds).toEqual(
      expect.arrayContaining(["j1", "j2", "j3"]),
    );
    expect(result[0].sourceJobIds).toHaveLength(3);
  });

  it("returns empty array when all terms are existing", () => {
    const terms: ExtractedTerm[] = [
      { term: "react", confidence: 0.9, sourceJobIds: ["j1"] },
      { term: "node", confidence: 0.8, sourceJobIds: ["j2"] },
    ];
    const result = deduplicateTerms(terms, ["React", "Node"]);
    expect(result).toEqual([]);
  });

  it("handles empty inputs", () => {
    expect(deduplicateTerms([], [])).toEqual([]);
    expect(deduplicateTerms([], ["existing"])).toEqual([]);
  });
});
