import { describe, expect, it, vi } from "vitest";
import {
  runSimplifyJobs,
  type SimplifyJobsListing,
} from "../src/run";

function makeListing(
  overrides: Partial<SimplifyJobsListing> = {},
): SimplifyJobsListing {
  return {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    source: "Simplify",
    category: "Software",
    company_name: "Acme Corp",
    company_url: "https://simplify.jobs/c/Acme",
    title: "Software Engineer Intern",
    url: "https://acme.com/jobs/123",
    locations: ["San Francisco, CA"],
    terms: ["Summer 2026"],
    active: true,
    is_visible: true,
    date_posted: 1700000000,
    date_updated: 1700000000,
    sponsorship: "Offers Sponsorship",
    ...overrides,
  };
}

function createFetchResponse(listings: SimplifyJobsListing[]): Response {
  return {
    ok: true,
    status: 200,
    json: async () => listings,
  } as Response;
}

describe("runSimplifyJobs", () => {
  it("maps active visible listings to CreateJobInput", async () => {
    const listing = makeListing();
    const fetchMock = vi.fn().mockResolvedValue(createFetchResponse([listing]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runSimplifyJobs({
      repos: ["Summer2026-Internships"],
      searchTerms: [],
      maxJobs: 100,
    });

    expect(result.success).toBe(true);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toEqual(
      expect.objectContaining({
        source: "simplifyjobs",
        title: "Software Engineer Intern",
        employer: "Acme Corp",
        employerUrl: "https://simplify.jobs/c/Acme",
        jobUrl: "https://acme.com/jobs/123",
        location: "San Francisco, CA",
        sourceJobId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        disciplines: "Software",
      }),
    );

    vi.unstubAllGlobals();
  });

  it("filters out inactive listings", async () => {
    const listings = [
      makeListing({ active: true }),
      makeListing({ id: "inactive-1", active: false }),
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createFetchResponse(listings)));

    const result = await runSimplifyJobs({
      repos: ["Summer2026-Internships"],
      searchTerms: [],
      maxJobs: 100,
    });

    expect(result.jobs).toHaveLength(1);
    vi.unstubAllGlobals();
  });

  it("filters out non-visible listings", async () => {
    const listings = [
      makeListing({ is_visible: false }),
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createFetchResponse(listings)));

    const result = await runSimplifyJobs({
      repos: ["Summer2026-Internships"],
      searchTerms: [],
      maxJobs: 100,
    });

    expect(result.jobs).toHaveLength(0);
    vi.unstubAllGlobals();
  });

  it("filters by search terms matching title", async () => {
    const listings = [
      makeListing({ title: "ML Engineer Intern" }),
      makeListing({ id: "no-match", title: "Sales Associate" }),
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createFetchResponse(listings)));

    const result = await runSimplifyJobs({
      repos: ["Summer2026-Internships"],
      searchTerms: ["engineer"],
      maxJobs: 100,
    });

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].title).toBe("ML Engineer Intern");
    vi.unstubAllGlobals();
  });

  it("filters by search terms matching company name", async () => {
    const listings = [
      makeListing({ company_name: "Google", title: "SWE Intern" }),
      makeListing({ id: "other", company_name: "Bakery", title: "Baker" }),
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createFetchResponse(listings)));

    const result = await runSimplifyJobs({
      repos: ["Summer2026-Internships"],
      searchTerms: ["google"],
      maxJobs: 100,
    });

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].employer).toBe("Google");
    vi.unstubAllGlobals();
  });

  it("respects maxJobs limit", async () => {
    const listings = Array.from({ length: 10 }, (_, i) =>
      makeListing({ id: `id-${i}`, title: `Job ${i}` }),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createFetchResponse(listings)));

    const result = await runSimplifyJobs({
      repos: ["Summer2026-Internships"],
      searchTerms: [],
      maxJobs: 3,
    });

    expect(result.jobs).toHaveLength(3);
    vi.unstubAllGlobals();
  });

  it("handles fetch errors gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response),
    );

    const result = await runSimplifyJobs({
      repos: ["Summer2026-Internships"],
      searchTerms: [],
      maxJobs: 100,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("404");
    vi.unstubAllGlobals();
  });

  it("respects cancellation", async () => {
    const result = await runSimplifyJobs({
      repos: ["Summer2026-Internships"],
      searchTerms: [],
      maxJobs: 100,
      shouldCancel: () => true,
    });

    expect(result.success).toBe(true);
    expect(result.jobs).toHaveLength(0);
  });

  it("joins multiple locations into a single string", async () => {
    const listing = makeListing({
      locations: ["New York, NY", "San Francisco, CA", "Remote"],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createFetchResponse([listing])));

    const result = await runSimplifyJobs({
      repos: ["Summer2026-Internships"],
      searchTerms: [],
      maxJobs: 100,
    });

    expect(result.jobs[0].location).toBe(
      "New York, NY, San Francisco, CA, Remote",
    );
    vi.unstubAllGlobals();
  });

  it("includes sponsorship in job description", async () => {
    const listing = makeListing({ sponsorship: "Offers Sponsorship" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createFetchResponse([listing])));

    const result = await runSimplifyJobs({
      repos: ["Summer2026-Internships"],
      searchTerms: [],
      maxJobs: 100,
    });

    expect(result.jobs[0].jobDescription).toContain("Offers Sponsorship");
    vi.unstubAllGlobals();
  });
});
