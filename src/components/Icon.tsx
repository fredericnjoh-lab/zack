type IconName =
  | 'search'
  | 'bolt'
  | 'pen'
  | 'calendar'
  | 'image'
  | 'book'
  | 'clock'
  | 'compass'
  | 'chat'
  | 'grid'

const paths: Record<IconName, string> = {
  search:
    'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-5.2-5.2',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8z',
  pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
  calendar:
    'M8 2v3M16 2v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  image:
    'M4 5h16v14H4V5zm3 10 3-4 3 3 2-2 3 3M9 9h.01',
  book: 'M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5zm0 14h12',
  clock: 'M12 7v5l3 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z',
  compass:
    'M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM14.5 9.5 10 10l-.5 4.5L14 14l.5-4.5z',
  chat: 'M5 5h14v10H9l-4 4V5z',
  grid: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z',
}

export function Icon({ name }: { name: IconName }) {
  return (
    <span className="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={paths[name]} />
      </svg>
    </span>
  )
}
