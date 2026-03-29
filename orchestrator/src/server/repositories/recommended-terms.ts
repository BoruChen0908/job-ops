import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "../db/index";

const { recommendedTerms } = schema;

export type RecommendedTermStatus = "pending" | "accepted" | "dismissed";

export interface UpsertTermInput {
  term: string;
  confidence: number;
  sourceJobIds: string[];
}

export interface UpsertResult {
  newCount: number;
  updatedCount: number;
}

export async function getAll(
  status?: RecommendedTermStatus,
): Promise<schema.RecommendedTermRow[]> {
  if (status) {
    return db
      .select()
      .from(recommendedTerms)
      .where(eq(recommendedTerms.status, status))
      .orderBy(desc(recommendedTerms.confidence));
  }
  return db
    .select()
    .from(recommendedTerms)
    .orderBy(desc(recommendedTerms.confidence));
}

export async function getAcceptedTerms(): Promise<schema.RecommendedTermRow[]> {
  return db
    .select()
    .from(recommendedTerms)
    .where(eq(recommendedTerms.status, "accepted"))
    .orderBy(desc(recommendedTerms.confidence));
}

export async function getByTerm(
  term: string,
): Promise<schema.RecommendedTermRow | undefined> {
  const [row] = await db
    .select()
    .from(recommendedTerms)
    .where(sql`lower(${recommendedTerms.term}) = lower(${term})`);
  return row;
}

export async function getById(
  id: string,
): Promise<schema.RecommendedTermRow | undefined> {
  const [row] = await db
    .select()
    .from(recommendedTerms)
    .where(eq(recommendedTerms.id, id));
  return row;
}

export async function upsertTerms(
  terms: UpsertTermInput[],
): Promise<UpsertResult> {
  let newCount = 0;
  let updatedCount = 0;
  const now = new Date().toISOString();

  for (const input of terms) {
    const existing = await getByTerm(input.term);

    if (!existing) {
      await db.insert(recommendedTerms).values({
        id: randomUUID(),
        term: input.term,
        status: "pending",
        confidence: input.confidence,
        occurrenceCount: 1,
        dismissCount: 0,
        sourceJobIds: JSON.stringify(input.sourceJobIds),
        createdAt: now,
        updatedAt: now,
      });
      newCount++;
      continue;
    }

    const existingJobIds: string[] = JSON.parse(existing.sourceJobIds);
    const mergedJobIds = Array.from(
      new Set([...existingJobIds, ...input.sourceJobIds]),
    );
    const newConfidence = Math.max(existing.confidence, input.confidence);
    const newOccurrenceCount = existing.occurrenceCount + 1;

    const updates: Record<string, unknown> = {
      confidence: newConfidence,
      occurrenceCount: newOccurrenceCount,
      sourceJobIds: JSON.stringify(mergedJobIds),
      updatedAt: now,
    };

    // Resurface dismissed terms when recommended enough times
    if (
      existing.status === "dismissed" &&
      newOccurrenceCount >= existing.dismissCount + 3
    ) {
      updates.status = "pending";
    }

    await db
      .update(recommendedTerms)
      .set(updates)
      .where(eq(recommendedTerms.id, existing.id));
    updatedCount++;
  }

  return { newCount, updatedCount };
}

export async function updateStatus(
  id: string,
  status: "accepted" | "dismissed",
): Promise<schema.RecommendedTermRow | undefined> {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status,
    updatedAt: now,
  };

  if (status === "dismissed") {
    updates.dismissCount = sql`${recommendedTerms.dismissCount} + 1`;
  }

  await db
    .update(recommendedTerms)
    .set(updates)
    .where(eq(recommendedTerms.id, id));

  return getById(id);
}

export async function batchUpdateStatus(
  ids: string[],
  status: "accepted" | "dismissed",
): Promise<number> {
  if (ids.length === 0) return 0;
  let updated = 0;

  for (const id of ids) {
    await updateStatus(id, status);
    updated++;
  }

  return updated;
}

export async function deleteById(id: string): Promise<boolean> {
  const result = await db
    .delete(recommendedTerms)
    .where(eq(recommendedTerms.id, id));
  return result.changes > 0;
}

export async function getPendingCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(recommendedTerms)
    .where(eq(recommendedTerms.status, "pending"));
  return row?.count ?? 0;
}
