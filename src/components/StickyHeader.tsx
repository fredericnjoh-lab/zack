type StickyHeaderProps = {
  onTry: () => void
  ctaLabel?: string
}

export function StickyHeader({ onTry, ctaLabel = 'Ouvrir Zack' }: StickyHeaderProps) {
  return (
    <header className="sticky-bar sticky-clinical">
      <div className="brand">
        <strong>Zack</strong>
        <span>marques de vêtements</span>
      </div>
      <button type="button" className="cta ghost" onClick={onTry}>
        {ctaLabel}
      </button>
    </header>
  )
}
