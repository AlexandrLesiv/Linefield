const contents = document.querySelector("aside details");
if (contents instanceof HTMLDetailsElement) {
  contents.open = !window.matchMedia("(max-width: 850px)").matches;
}

const sectionLinks = document.querySelectorAll('nav[aria-label="Report sections"] a');
const headings = document.querySelectorAll("main h2");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries.find((item) => item.isIntersecting);
      if (!entry) return;
      for (const link of sectionLinks) {
        if (link.getAttribute("href") === `#${entry.target.id}`) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      }
    },
    { rootMargin: "0px 0px -65% 0px" },
  );
  for (const heading of headings) observer.observe(heading);
}
