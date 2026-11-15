import { Button } from '@/components/ui/button';
import type {
  ContentKind,
  ContentRating as Rating,
} from '@/database/content-feedback';
export function ContentRating({
  kind,
  rating,
  disabled,
  onRate,
}: {
  kind: ContentKind;
  rating?: Rating;
  disabled: boolean;
  onRate: (value: Rating | null) => void;
}) {
  const name = kind === 'image' ? 'background' : 'quote';
  return (
    <div
      role="group"
      aria-label={`${name} preference`}
      className="mt-3 flex flex-wrap justify-center gap-2"
    >
      <Button
        variant={rating === 'like' ? 'default' : 'outline'}
        size="sm"
        disabled={disabled}
        aria-pressed={rating === 'like'}
        onClick={() => onRate(rating === 'like' ? null : 'like')}
      >
        Like this {name}
      </Button>
      <Button
        variant={rating === 'dislike' ? 'default' : 'outline'}
        size="sm"
        disabled={disabled}
        aria-pressed={rating === 'dislike'}
        onClick={() => onRate(rating === 'dislike' ? null : 'dislike')}
      >
        Dislike this {name}
      </Button>
    </div>
  );
}
