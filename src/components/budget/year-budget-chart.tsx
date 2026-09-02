import { fiscalYearLabel, formatKr, formatMonthShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export type YearBudgetMonth = {
  key: string;
  spent: number;
  cumulative: number;
};

type Props = {
  year: number;
  budget: number;
  months: YearBudgetMonth[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
};

export function YearBudgetChart({ year, budget, months, selectedMonth, onSelectMonth }: Props) {
  const used = months.reduce((sum, month) => sum + month.spent, 0);
  const left = budget - used;
  const over = budget > 0 && used > budget;
  const progress = budget <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((used / budget) * 100)));
  const monthlyShare = budget > 0 ? Math.round(budget / 12) : 0;
  const barMax = Math.max(monthlyShare, ...months.map((month) => month.spent), 1);
  const selected = months.find((month) => month.key === selectedMonth);

  return (
    <div>
      <p className="text-sm text-muted">Årsbudget {fiscalYearLabel(year)}</p>
      <p className="mt-1 text-lg font-medium text-ink">
        {budget > 0 ? `${formatKr(used)} av ${formatKr(budget)}` : "Ingen årsbudget satt"}
      </p>
      {budget > 0 ? (
        <p className={cn("mt-1 text-sm tabular-nums", over ? "text-clay" : "text-muted")}>
          {over ? `${formatKr(used - budget)} över budget` : `${formatKr(left)} kvar av året`}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">Sätt 100 000 kr, så summeras varje månad mot årsbudgeten.</p>
      )}

      {budget > 0 ? (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className={cn("h-full rounded-full", over ? "bg-clay" : "bg-pine")}
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      <div className="mt-5 flex h-36 items-end gap-1">
        {months.map((month) => {
          const height = Math.max(6, Math.round((month.spent / barMax) * 100));
          const isSelected = month.key === selectedMonth;
          const monthOver = monthlyShare > 0 && month.spent > monthlyShare;
          return (
            <button
              key={month.key}
              type="button"
              onClick={() => onSelectMonth(month.key)}
              className="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-end gap-1"
              aria-label={`${formatMonthShort(month.key)}: ${formatKr(month.spent)}`}
              aria-pressed={isSelected}
            >
              <div className="flex h-28 w-full items-end justify-center">
                <span
                  className={cn(
                    "w-full max-w-7 rounded-sm",
                    month.spent <= 0
                      ? "bg-surface-2"
                      : monthOver
                        ? isSelected
                          ? "bg-clay"
                          : "bg-clay/50"
                        : isSelected
                          ? "bg-pine"
                          : "bg-pine/40",
                  )}
                  style={{ height: month.spent <= 0 ? "6%" : `${height}%` }}
                />
              </div>
              <span className={cn("text-xs uppercase", isSelected ? "font-medium text-ink" : "text-subtle")}>
                {formatMonthShort(month.key)}
              </span>
            </button>
          );
        })}
      </div>

      {selected ? (
        <p className="mt-3 text-sm text-muted">
          {formatMonthShort(selected.key)} {formatKr(selected.spent)}
          {monthlyShare > 0 ? ` · månadsandel ${formatKr(monthlyShare)}` : null}
          {` · hittills ${formatKr(selected.cumulative)}`}
        </p>
      ) : null}
    </div>
  );
}
