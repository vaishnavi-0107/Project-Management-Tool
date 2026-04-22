export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-50)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
          style={{ background: 'var(--accent)' }}>
          P
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
