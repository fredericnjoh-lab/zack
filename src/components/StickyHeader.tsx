type StickyHeaderProps = {
  onTry: () => void
  ctaLabel?: string
}

export function StickyHeader({ onTry, ctaLabel = 'Essayer Zack →' }: StickyHeaderProps) {
  return (
    <header className="sticky-bar">
      <div className="brand">
        <img src={`${import.meta.env.BASE_URL}zack-avatar.png`} alt="Zack" />
        <div>
          <strong>Zack</strong>
          <span>marques de vêtements</span>
        </div>
      </div>
      <button type="button" className="cta" onClick={onTry}>
        {ctaLabel}
      </button>
    </header>
  )
}
