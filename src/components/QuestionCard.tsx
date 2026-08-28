import { Bookmark, BookmarkCheck, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/Markdown";

export interface QuestionShape {
  id: string;
  question_text: string;
  options: unknown;
  correct_answer: string;
  explanation: string | null;
  difficulty: string;
  topics?: { name: string } | null;
  subjects?: { name: string } | null;
}

export function optionsOf(question: { options: unknown }): string[] {
  const raw = question.options;
  if (Array.isArray(raw)) return raw.map((o) => String(o));
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map((o) => String(o)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function QuestionCard({
  question,
  index,
  total,
  selected,
  onSelect,
  revealed,
  bookmarked,
  onToggleBookmark,
  disabled,
}: {
  question: QuestionShape;
  index: number;
  total: number;
  selected: string | null;
  onSelect: (value: string) => void;
  revealed?: boolean;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
  disabled?: boolean;
}) {
  const options = optionsOf(question);

  return (
    <section className="surface p-4 sm:p-5" aria-label={`Question ${index + 1} of ${total}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            Q{index + 1}/{total}
          </Badge>
          {question.subjects?.name ? (
            <Badge variant="outline">{question.subjects.name}</Badge>
          ) : null}
          {question.topics?.name ? <Badge variant="outline">{question.topics.name}</Badge> : null}
          <Badge variant="outline" className="capitalize">
            {question.difficulty}
          </Badge>
        </div>
        {onToggleBookmark ? (
          <button
            type="button"
            onClick={onToggleBookmark}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark this question"}
            aria-pressed={bookmarked}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
          >
            {bookmarked ? (
              <BookmarkCheck className="size-5 text-primary" aria-hidden />
            ) : (
              <Bookmark className="size-5" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      <p className="text-[15px] font-medium leading-relaxed">{question.question_text}</p>

      <ul className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Answer options">
        {options.map((option) => {
          const isSelected = selected === option;
          const isCorrect = revealed && option === question.correct_answer;
          const isWrong = revealed && isSelected && option !== question.correct_answer;
          return (
            <li key={option}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => onSelect(option)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors",
                  "disabled:cursor-not-allowed",
                  isCorrect
                    ? "border-success bg-success/10 text-foreground"
                    : isWrong
                      ? "border-destructive bg-destructive/10 text-foreground"
                      : isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/60",
                )}
              >
                <span>{option}</span>
                {isCorrect ? <Check className="size-4 shrink-0 text-success" aria-hidden /> : null}
                {isWrong ? <X className="size-4 shrink-0 text-destructive" aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ul>

      {revealed && question.explanation ? (
        <div className="mt-4 rounded-xl bg-muted/70 p-3.5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Explanation
          </p>
          <Markdown content={question.explanation} />
        </div>
      ) : null}
    </section>
  );
}
