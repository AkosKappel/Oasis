import { ThumbsDown, ThumbsUp, SkipForward } from 'lucide-react';
import type {
  ContentKind,
  ContentRating as Rating,
} from '@/database/content-feedback';
export function ContentRating({
  kind,
  rating,
  disabled,
  onRate,
  onNext,
}: {
  kind: ContentKind;
  rating?: Rating;
  disabled: boolean;
  onNext?: () => void;
  onRate: (value: Rating | null) => void;
}) {
  const name = kind === 'image' ? 'background' : 'quote';
  return (
    <div
      role="group"
      aria-label={`${name} preference`}
      className={`content-rating ${kind === 'quote' ? 'absolute top-full right-0' : ''}`}
    >
      {(['like', 'dislike'] as const).map((value) => {
        const Icon = value === 'like' ? ThumbsUp : ThumbsDown;
        const label = `${value === 'like' ? 'Like' : 'Dislike'} this ${name}`;
        return (
          <button
            key={value}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={rating === value}
            disabled={disabled}
            onClick={() => onRate(rating === value ? null : value)}
            className={`inline-flex ${kind === 'quote' ? 'size-8' : 'size-9'} items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40`}
          >
            <Icon
              className={`size-4 ${rating === value ? 'fill-current text-foreground' : ''}`}
              aria-hidden="true"
            />
          </button>
        );
      })}
      {onNext && (
        <button
          type="button"
          title={kind === 'image' ? 'Next image' : 'Next quote'}
          aria-label={kind === 'image' ? 'Next image' : 'Next quote'}
          disabled={disabled}
          onClick={onNext}
          className={`inline-flex ${kind === 'quote' ? 'size-8' : 'size-9'} items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40`}
        >
          <SkipForward className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
