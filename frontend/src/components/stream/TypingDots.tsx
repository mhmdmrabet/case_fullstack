/** Three bouncing dots shown before the first delta arrives from the model. */
export function TypingDots() {
  return (
    <div
      className="flex items-center gap-1 px-1 py-2"
      aria-label="Réflexion en cours"
    >
      <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce motion-reduce:animate-none" />
      <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms] motion-reduce:animate-none" />
      <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms] motion-reduce:animate-none" />
    </div>
  )
}
