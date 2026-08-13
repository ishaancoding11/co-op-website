import Link from 'next/link';

// Plain query-param links, not client state — switching views is a full
// navigation anyway (each view fetches differently), so there's no reason
// to reach for client JS just to swap an active class.
export function ViewToggle({ active, preserveParams }: { active: 'gallery' | 'list'; preserveParams: string }) {
  const suffix = preserveParams ? `&${preserveParams}` : '';
  const tab = (view: 'gallery' | 'list', label: string) => (
    <Link
      href={`/browse?view=${view}${view === 'list' ? suffix : ''}`}
      aria-current={active === view ? 'page' : undefined}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active === view ? 'bg-foreground text-background' : 'text-muted hover:text-foreground hover:bg-line/50'
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-card p-1">
      {tab('gallery', 'Gallery')}
      {tab('list', 'List')}
    </div>
  );
}
