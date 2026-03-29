import type { CreateJobInput } from "@shared/types/jobs.js";

const LISTINGS_URLS: Record<string, string> = {
  "Summer2026-Internships":
    "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json",
  "New-Grad-Positions":
    "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json",
};

export interface SimplifyJobsListing {
  id: string;
  source: string;
  category?: string;
  company_name: string;
  company_url: string;
  title: string;
  url: string;
  locations: string[];
  terms?: string[];
  active: boolean;
  is_visible: boolean;
  date_posted: number;
  date_updated: number;
  sponsorship?: string;
}

export interface SimplifyJobsRunOptions {
  repos: string[];
  searchTerms: string[];
  maxJobs: number;
  shouldCancel?: () => boolean;
  onProgress?: (event: SimplifyJobsProgressEvent) => void;
}

export interface SimplifyJobsProgressEvent {
  type: "repo_start" | "repo_done";
  repo: string;
  repoIndex: number;
  repoTotal: number;
  jobsFound?: number;
}

export interface SimplifyJobsRunResult {
  success: boolean;
  jobs: CreateJobInput[];
  error?: string;
}

function matchesSearchTerms(
  listing: SimplifyJobsListing,
  terms: string[],
): boolean {
  if (terms.length === 0) return true;
  const haystack =
    `${listing.title} ${listing.company_name} ${listing.category ?? ""}`.toLowerCase();
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function toCreateJobInput(listing: SimplifyJobsListing): CreateJobInput {
  return {
    source: "simplifyjobs",
    title: listing.title,
    employer: listing.company_name,
    employerUrl: listing.company_url || undefined,
    jobUrl: listing.url,
    applicationLink: listing.url,
    location: listing.locations.join(", ") || undefined,
    datePosted: new Date(listing.date_posted * 1000).toISOString().slice(0, 10),
    sourceJobId: listing.id,
    disciplines: listing.category ?? undefined,
    jobDescription: buildDescription(listing),
  };
}

function buildDescription(listing: SimplifyJobsListing): string {
  const parts: string[] = [];
  if (listing.terms && listing.terms.length > 0) {
    parts.push(`Terms: ${listing.terms.join(", ")}`);
  }
  if (listing.sponsorship && listing.sponsorship !== "Other") {
    parts.push(`Sponsorship: ${listing.sponsorship}`);
  }
  if (listing.category) {
    parts.push(`Category: ${listing.category}`);
  }
  if (listing.locations.length > 0) {
    parts.push(`Locations: ${listing.locations.join(", ")}`);
  }
  return parts.join("\n");
}

async function fetchListings(url: string): Promise<SimplifyJobsListing[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const data = (await response.json()) as SimplifyJobsListing[];
  return data;
}

export async function runSimplifyJobs(
  options: SimplifyJobsRunOptions,
): Promise<SimplifyJobsRunResult> {
  const allJobs: CreateJobInput[] = [];

  try {
    for (let i = 0; i < options.repos.length; i++) {
      if (options.shouldCancel?.()) {
        return { success: true, jobs: allJobs };
      }

      const repo = options.repos[i];
      const url = LISTINGS_URLS[repo];
      if (!url) continue;

      options.onProgress?.({
        type: "repo_start",
        repo,
        repoIndex: i + 1,
        repoTotal: options.repos.length,
      });

      const listings = await fetchListings(url);

      const filtered = listings.filter(
        (listing) =>
          listing.active &&
          listing.is_visible &&
          matchesSearchTerms(listing, options.searchTerms),
      );

      const mapped = filtered
        .slice(0, options.maxJobs - allJobs.length)
        .map(toCreateJobInput);

      allJobs.push(...mapped);

      options.onProgress?.({
        type: "repo_done",
        repo,
        repoIndex: i + 1,
        repoTotal: options.repos.length,
        jobsFound: mapped.length,
      });

      if (allJobs.length >= options.maxJobs) break;
    }

    return { success: true, jobs: allJobs };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error in SimplifyJobs extractor";
    return { success: false, jobs: allJobs, error: message };
  }
}
