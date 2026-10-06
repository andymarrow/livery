export function Button(props: React.ComponentProps<"button">) {
  return <button className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm text-primary-foreground" {...props} />;
}
