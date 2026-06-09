import { dismissReview, snoozeReview } from '@/lib/storage';

interface ReviewPromptProps {
  onDismiss: () => void;
}

export default function ReviewPrompt({ onDismiss }: ReviewPromptProps) {
  const handleRate = () => {
    // Opens the Chrome Web Store review page for this extension
    window.open(
      `https://chromewebstore.google.com/detail/sampler/lpfooebakgdefkbahlhbhjlhnodplpeb/reviews`,
      '_blank',
    );
    dismissReview();
    onDismiss();
  };

  const handleDismiss = () => {
    snoozeReview();
    onDismiss();
  };

  return (
    <div className="mx-5 rounded-[10px] border border-cw-primary/30 bg-cw-surface px-4 py-3">
      <p className="text-xs font-medium text-cw-text">
        Enjoying Sampler?
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-cw-text-muted">
        A quick review on the Chrome Web Store helps a lot.
      </p>
      <div className="mt-2.5 flex gap-2">
        <button
          onClick={handleRate}
          className="cw-pressable rounded-lg bg-cw-primary px-3 py-1.5 text-[11px] font-semibold text-cw-bg"
        >
          Leave a review
        </button>
        <button
          onClick={handleDismiss}
          className="cw-pressable rounded-lg border border-cw-border px-3 py-1.5 text-[11px] text-cw-text-muted"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
