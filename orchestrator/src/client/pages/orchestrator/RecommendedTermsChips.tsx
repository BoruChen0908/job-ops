import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRecommendedTerms, useUpdateRecommendedTermMutation } from "@client/hooks/queries/useRecommendedTerms";

const COLLAPSED_LIMIT = 5;

interface RecommendedTermsChipsProps {
  onTermAccepted?: (term: string) => void;
}

export function RecommendedTermsChips({
  onTermAccepted,
}: RecommendedTermsChipsProps) {
  const { data, isLoading } = useRecommendedTerms("pending");
  const updateMutation = useUpdateRecommendedTermMutation();
  const [expanded, setExpanded] = useState(false);

  if (isLoading || !data || data.terms.length === 0) {
    return null;
  }

  const sortedTerms = [...data.terms].sort(
    (a, b) => b.confidence - a.confidence,
  );
  const visibleTerms = expanded
    ? sortedTerms
    : sortedTerms.slice(0, COLLAPSED_LIMIT);
  const hasMore = sortedTerms.length > COLLAPSED_LIMIT;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-muted-foreground">
        Suggested terms from recent job descriptions:
      </p>
      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence mode="popLayout">
          {visibleTerms.map((term) => (
            <motion.div
              key={term.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-0.5"
            >
              <Button
                type="button"
                variant="outline"
                className="h-auto rounded-full px-2 py-1 text-xs text-muted-foreground"
                disabled={updateMutation.isPending}
                onClick={() => {
                  updateMutation.mutate({
                    id: term.id,
                    status: "accepted",
                  });
                  onTermAccepted?.(term.term);
                }}
                aria-label={`Accept "${term.term}"`}
              >
                <Check className="mr-0.5 h-3 w-3 text-green-500" />
                {term.term}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-auto rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                disabled={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    id: term.id,
                    status: "dismissed",
                  })
                }
                aria-label={`Dismiss "${term.term}"`}
              >
                <X className="h-3 w-3" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
        {hasMore && (
          <Button
            type="button"
            variant="ghost"
            className="h-auto px-2 py-1 text-xs text-muted-foreground"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? (
              <>
                <ChevronUp className="mr-0.5 h-3 w-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="mr-0.5 h-3 w-3" />
                {sortedTerms.length - COLLAPSED_LIMIT} more
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
