import { badRequest, notFound } from "@infra/errors";
import { asyncRoute, fail, ok } from "@infra/http";
import * as recommendedTermsRepo from "@server/repositories/recommended-terms";
import { Router } from "express";

export const recommendedTermsRouter = Router();

/**
 * GET /api/recommended-terms?status=pending
 * List recommended terms, optionally filtered by status.
 */
recommendedTermsRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const status = req.query.status as string | undefined;
    if (
      status &&
      status !== "pending" &&
      status !== "accepted" &&
      status !== "dismissed"
    ) {
      return fail(
        res,
        badRequest("Invalid status. Must be pending, accepted, or dismissed."),
      );
    }

    const terms = await recommendedTermsRepo.getAll(
      status as recommendedTermsRepo.RecommendedTermStatus | undefined,
    );
    ok(res, { terms, count: terms.length });
  }),
);

/**
 * PATCH /api/recommended-terms/:id
 * Accept or dismiss a single term.
 */
recommendedTermsRouter.patch(
  "/:id",
  asyncRoute(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body as { status?: string };

    if (!status || (status !== "accepted" && status !== "dismissed")) {
      return fail(
        res,
        badRequest("status must be 'accepted' or 'dismissed'"),
      );
    }

    const existing = await recommendedTermsRepo.getById(id);
    if (!existing) {
      return fail(res, notFound("Recommended term not found"));
    }

    const updated = await recommendedTermsRepo.updateStatus(
      id,
      status as "accepted" | "dismissed",
    );
    ok(res, { term: updated });
  }),
);

/**
 * POST /api/recommended-terms/batch
 * Batch accept or dismiss multiple terms.
 */
recommendedTermsRouter.post(
  "/batch",
  asyncRoute(async (req, res) => {
    const { ids, status } = req.body as { ids?: string[]; status?: string };

    if (!Array.isArray(ids) || ids.length === 0) {
      return fail(res, badRequest("ids must be a non-empty array"));
    }

    if (!status || (status !== "accepted" && status !== "dismissed")) {
      return fail(
        res,
        badRequest("status must be 'accepted' or 'dismissed'"),
      );
    }

    const updated = await recommendedTermsRepo.batchUpdateStatus(
      ids,
      status as "accepted" | "dismissed",
    );
    ok(res, { updated });
  }),
);

/**
 * DELETE /api/recommended-terms/:id
 * Permanently remove a recommended term.
 */
recommendedTermsRouter.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    const { id } = req.params;

    const deleted = await recommendedTermsRepo.deleteById(id);
    if (!deleted) {
      return fail(res, notFound("Recommended term not found"));
    }

    ok(res, { deleted: true });
  }),
);
