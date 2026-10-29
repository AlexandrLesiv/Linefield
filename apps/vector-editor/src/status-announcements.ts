/** Keep rapidly changing render counters out of the polite announcement stream. */
export function installStatusAnnouncements(status: HTMLElement): (message: string) => void {
  status.removeAttribute("role");
  status.setAttribute("aria-live", "off");
  const announcement = document.createElement("span");
  announcement.id = "editor-announcement";
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-atomic", "true");
  announcement.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
  document.body.append(announcement);
  return (message) => {
    if (announcement.textContent !== message) announcement.textContent = message;
  };
}
