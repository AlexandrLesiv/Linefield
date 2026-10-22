export function revealLabel(input: HTMLInputElement) {
  input.closest("label")?.scrollIntoView({ block: "nearest", inline: "nearest" });
}
