"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuestionnaireContextValue = {
  active: number;
  count: number;
  setActive: (value: number) => void;
};
const QuestionnaireContext =
  React.createContext<QuestionnaireContextValue | null>(null);
function useQuestionnaire() {
  const value = React.useContext(QuestionnaireContext);
  if (!value)
    throw new Error(
      "Questionnaire parts must be rendered inside Questionnaire",
    );
  return value;
}

function Questionnaire({
  items = [],
  onSubmit,
  className,
  children,
  ...props
}: React.ComponentProps<"form"> & {
  items?: readonly unknown[];
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
}) {
  const [active, setActive] = React.useState(0);
  const count =
    items.length ||
    React.Children.toArray(children).filter(
      (child) =>
        React.isValidElement(child) && child.type === QuestionnaireItem,
    ).length;
  return (
    <QuestionnaireContext.Provider value={{ active, count, setActive }}>
      <form
        className={cn("flex w-full min-w-0 flex-col gap-4", className)}
        onSubmit={onSubmit}
        {...props}
      >
        {children}
      </form>
    </QuestionnaireContext.Provider>
  );
}
function QuestionnaireProgress({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { active, count } = useQuestionnaire();
  return (
    <div
      data-slot="questionnaire-progress"
      className={cn(
        "text-xs font-medium text-muted-foreground tabular-nums",
        className,
      )}
      {...props}
    >
      Question {Math.min(active + 1, Math.max(count, 1))} of{" "}
      {Math.max(count, 1)}
    </div>
  );
}
function QuestionnaireItem({
  name,
  index = 0,
  className,
  children,
  ...props
}: React.ComponentProps<"fieldset"> & { name: string; index?: number }) {
  const { active } = useQuestionnaire();
  return (
    <fieldset
      data-slot="questionnaire-item"
      data-name={name}
      data-index={index}
      hidden={index !== active}
      className={cn(
        "flex min-w-0 flex-col gap-3 border-0 p-0 outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </fieldset>
  );
}
function QuestionnaireTitle({
  className,
  ...props
}: React.ComponentProps<"legend">) {
  return (
    <legend
      data-slot="questionnaire-title"
      className={cn("text-base font-medium text-pretty", className)}
      {...props}
    />
  );
}
function QuestionnaireDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="questionnaire-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}
function QuestionnaireChoices({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="questionnaire-choices"
      className={cn("grid min-w-0 gap-2", className)}
      {...props}
    />
  );
}
function QuestionnaireChoice({
  value,
  name,
  children,
  className,
  ...props
}: React.ComponentProps<"label"> & { value: string; name?: string }) {
  return (
    <label
      data-slot="questionnaire-choice"
      className={cn(
        "group relative flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border border-input px-3 py-2.5 text-start text-sm outline-none has-[:checked]:border-primary/40 has-[:checked]:bg-muted hover:bg-muted/50",
        className,
      )}
      {...props}
    >
      <input
        type="radio"
        name={name}
        value={value}
        className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0"
      />
      <span
        aria-hidden="true"
        className="relative flex size-4 shrink-0 items-center justify-center rounded-full border border-input peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground"
      >
        <CheckIcon className="hidden size-3 peer-checked:block" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-snug">
        {children}
      </span>
    </label>
  );
}
function QuestionnaireInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="questionnaire-input"
      className={cn(
        "min-h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}
function QuestionnaireError({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="questionnaire-error"
      className={cn("text-sm text-destructive", className)}
      {...props}
    />
  );
}
function QuestionnaireActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="questionnaire-actions"
      className={cn("flex flex-wrap items-center justify-end gap-2", className)}
      {...props}
    />
  );
}
function QuestionnairePrevious({
  children = "Previous",
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { active, setActive } = useQuestionnaire();
  return (
    <button
      type="button"
      className={cn(
        buttonVariants({ size: "sm", variant: "outline" }),
        className,
      )}
      disabled={active === 0}
      onClick={() => setActive(Math.max(0, active - 1))}
      {...props}
    >
      {children}
    </button>
  );
}
function QuestionnaireSkip({
  children = "Skip",
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { active, count, setActive } = useQuestionnaire();
  return (
    <button
      type="button"
      className={cn(
        buttonVariants({ size: "sm", variant: "outline" }),
        className,
      )}
      onClick={() => setActive(Math.min(count - 1, active + 1))}
      {...props}
    >
      {children}
    </button>
  );
}
function QuestionnaireNext({
  children = "Next",
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { active, count, setActive } = useQuestionnaire();
  return (
    <button
      type="button"
      className={cn(buttonVariants({ size: "sm" }), className)}
      disabled={active >= count - 1}
      onClick={() => setActive(Math.min(count - 1, active + 1))}
      {...props}
    >
      {children}
    </button>
  );
}
function QuestionnaireSubmit({
  children = "Submit",
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { active, count } = useQuestionnaire();
  return (
    <button
      type="submit"
      className={cn(buttonVariants({ size: "sm" }), className)}
      disabled={active < count - 1}
      {...props}
    >
      {children}
    </button>
  );
}

export {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
};
