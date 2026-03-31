import { describe, expect, it } from "vitest";
import type { CreateJobInput } from "../types/jobs";
import { filterExistingJobs } from "./filter-existing-jobs";

function makeJob(jobUrl: string): CreateJobInput {
  return {
    title: "Test Job",
    employer: "TestCo",
    jobUrl,
    source: "test" as CreateJobInput["source"],
  };
}

describe("filterExistingJobs", () => {
  it("returns all jobs when existingUrls is undefined", () => {
    const jobs = [makeJob("https://a.com"), makeJob("https://b.com")];
    const result = filterExistingJobs(jobs, undefined, "Test");
    expect(result.jobs).toEqual(jobs);
    expect(result.filteredCount).toBe(0);
  });

  it("returns all jobs when existingUrls is empty", () => {
    const jobs = [makeJob("https://a.com"), makeJob("https://b.com")];
    const result = filterExistingJobs(jobs, [], "Test");
    expect(result.jobs).toEqual(jobs);
    expect(result.filteredCount).toBe(0);
  });

  it("filters out jobs with matching URLs", () => {
    const jobs = [makeJob("https://a.com"), makeJob("https://b.com")];
    const result = filterExistingJobs(jobs, ["https://a.com"], "Test");
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].jobUrl).toBe("https://b.com");
    expect(result.filteredCount).toBe(1);
  });

  it("keeps jobs with non-matching URLs", () => {
    const jobs = [makeJob("https://a.com"), makeJob("https://b.com")];
    const result = filterExistingJobs(jobs, ["https://c.com"], "Test");
    expect(result.jobs).toHaveLength(2);
    expect(result.filteredCount).toBe(0);
  });

  it("filters all jobs when all match", () => {
    const jobs = [makeJob("https://a.com"), makeJob("https://b.com")];
    const result = filterExistingJobs(
      jobs,
      ["https://a.com", "https://b.com"],
      "Test",
    );
    expect(result.jobs).toEqual([]);
    expect(result.filteredCount).toBe(2);
  });

  it("handles empty jobs array", () => {
    const result = filterExistingJobs([], ["https://a.com"], "Test");
    expect(result.jobs).toEqual([]);
    expect(result.filteredCount).toBe(0);
  });

  it("does not do partial URL matching", () => {
    const jobs = [makeJob("https://example.com/job/123")];
    const result = filterExistingJobs(
      jobs,
      ["https://example.com/job"],
      "Test",
    );
    expect(result.jobs).toHaveLength(1);
    expect(result.filteredCount).toBe(0);
  });
});
