import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandLockup({
  page,
  className,
}: {
  page?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <h1 className="font-display text-2xl font-medium tracking-tight text-balance text-ink leading-[1.15] sm:text-3xl">
        {APP_NAME}
      </h1>
      {page ? <p className="mt-1 text-sm text-muted">{page}</p> : null}
    </div>
  );
}
