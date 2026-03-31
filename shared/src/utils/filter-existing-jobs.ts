import type { CreateJobInput } from "../types/jobs";

export interface FilterExistingJobsResult {
  jobs: CreateJobInput[];
  filteredCount: number;
}

/**
 * Filter out jobs whose URL already exists in the database.
 * Used by extractors to avoid wasting budget on known listings.
 */
export function filterExistingJobs(
  jobs: CreateJobInput[],
  existingUrls: string[] | undefined,
  extractorName: string,
): FilterExistingJobsResult {
  if (!existingUrls || existingUrls.length === 0) {
    return { jobs, filteredCount: 0 };
  }

  const existingUrlSet = new Set(existingUrls);
  const filtered = jobs.filter((job) => !existingUrlSet.has(job.jobUrl));
  const filteredCount = jobs.length - filtered.length;

  if (filteredCount > 0) {
    console.log(
      `[${extractorName}] Skipped ${filteredCount} already-known job(s), returning ${filtered.length} new`,
    );
  }

  return { jobs: filtered, filteredCount };
}
