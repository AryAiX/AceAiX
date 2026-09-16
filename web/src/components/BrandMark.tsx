/**
 * The AceAiX mark.
 *
 * The console used to draw a lightning bolt in an azure square in four
 * places — a placeholder from before there was a logo, which meant the web
 * console and the app did not look like the same product. This is the real
 * mark, from `web/public/aceaix-mark.png`, written by
 * `tools/brand/build-brand-assets.py` out of the same file the app icon and
 * the splash come from.
 *
 * It carries its own colour and needs no light or dark variant.
 */
export function BrandMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/aceaix-mark.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`flex-shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Mark and name together, as the header and the sign-in pages use it. */
export function BrandLockup({
  size = 32,
  textClass = 'text-[15px]',
  showText = true,
}: {
  size?: number;
  textClass?: string;
  showText?: boolean;
}) {
  return (
    <>
      <BrandMark size={size} />
      {showText && (
        <span className={`font-display font-bold text-white ${textClass}`}>
          AceAi<span className="text-azure">X</span>
        </span>
      )}
    </>
  );
}
