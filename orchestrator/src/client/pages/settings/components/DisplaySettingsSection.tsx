import type { DisplayValues } from "@client/pages/settings/types";
import type { UpdateSettingsInput } from "@shared/settings-schema.js";
import type React from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

type DisplaySettingsSectionProps = {
  values: DisplayValues;
  isLoading: boolean;
  isSaving: boolean;
};

export const DisplaySettingsSection: React.FC<DisplaySettingsSectionProps> = ({
  values,
  isLoading,
  isSaving,
}) => {
  const { showSponsorInfo, renderMarkdownInJobDescriptions, showJobDates } =
    values;
  const { control } = useFormContext<UpdateSettingsInput>();

  return (
    <AccordionItem
      id="settings-section-display"
      value="display"
      className="rounded-xl border border-border/80 bg-card/80 px-4 shadow-sm"
    >
      <AccordionTrigger className="hover:no-underline py-4">
        <span className="text-base font-semibold">Display Settings</span>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Controller
              name="showSponsorInfo"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="showSponsorInfo"
                  checked={field.value ?? showSponsorInfo.default}
                  onCheckedChange={(checked) => {
                    field.onChange(
                      checked === "indeterminate" ? null : checked === true,
                    );
                  }}
                  disabled={isLoading || isSaving}
                />
              )}
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="showSponsorInfo"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Show visa sponsor information
              </label>
              <p className="text-xs text-muted-foreground">
                Display a badge next to the employer name showing the match
                percentage with the UK visa sponsor list. This helps identify
                employers that are licensed to sponsor work visas.
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-start space-x-3">
            <Controller
              name="renderMarkdownInJobDescriptions"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="renderMarkdownInJobDescriptions"
                  checked={
                    field.value ?? renderMarkdownInJobDescriptions.default
                  }
                  onCheckedChange={(checked) => {
                    field.onChange(
                      checked === "indeterminate" ? null : checked === true,
                    );
                  }}
                  disabled={isLoading || isSaving}
                />
              )}
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="renderMarkdownInJobDescriptions"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Render Markdown in job descriptions
              </label>
              <p className="text-xs text-muted-foreground">
                Show headings, bold text, lists, and code blocks as formatted
                content when you expand a full job description. Turn this off if
                you prefer the raw source text.
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-start space-x-3">
            <Controller
              name="showJobDates"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="showJobDates"
                  checked={field.value ?? showJobDates.default}
                  onCheckedChange={(checked) => {
                    field.onChange(
                      checked === "indeterminate" ? null : checked === true,
                    );
                  }}
                  disabled={isLoading || isSaving}
                />
              )}
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="showJobDates"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Show dates in job list
              </label>
              <p className="text-xs text-muted-foreground">
                Display the posting date and deadline below each job in the list
                panel.
              </p>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
