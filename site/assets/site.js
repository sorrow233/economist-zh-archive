const root = document.documentElement;
const themeToggle = document.querySelector("[data-theme-toggle]");
themeToggle?.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem("reader-theme", next);
});

const progress = document.querySelector("[data-progress]");
const backToTop = document.querySelector("[data-back-to-top]");
const hero = document.querySelector("[data-hero]");
let ticking = false;

function updateScrollState() {
  const scrollTop = window.scrollY;
  const available = document.documentElement.scrollHeight - window.innerHeight;
  if (progress) progress.style.transform = `scaleX(${available > 0 ? scrollTop / available : 0})`;
  backToTop?.classList.toggle("is-visible", scrollTop > 700);
  if (hero && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    hero.style.setProperty("--hero-shift", `${Math.min(scrollTop * 0.08, 42)}px`);
  }
  ticking = false;
}

window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(updateScrollState);
    ticking = true;
  }
}, { passive: true });
updateScrollState();

backToTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

const reader = document.querySelector("[data-reader]");
if (reader) {
  const storedScale = Number(localStorage.getItem("reader-font-scale") || "1");
  root.style.setProperty("--reader-scale", String(Math.min(1.2, Math.max(0.9, storedScale))));
  document.querySelectorAll("[data-font]").forEach((button) => {
    button.addEventListener("click", () => {
      const current = Number(getComputedStyle(root).getPropertyValue("--reader-scale")) || 1;
      const delta = button.dataset.font === "up" ? 0.05 : -0.05;
      const next = Math.min(1.2, Math.max(0.9, current + delta));
      root.style.setProperty("--reader-scale", next.toFixed(2));
      localStorage.setItem("reader-font-scale", next.toFixed(2));
    });
  });

  const tocLinks = [...document.querySelectorAll("[data-toc] a")];
  const headings = tocLinks.map((link) => document.querySelector(link.hash)).filter(Boolean);
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).at(-1);
    if (!visible) return;
    tocLinks.forEach((link) => link.classList.toggle("is-active", link.hash === `#${visible.target.id}`));
  }, { rootMargin: "-15% 0px -72%", threshold: 0 });
  headings.forEach((heading) => observer.observe(heading));
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-revealed");
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.08 });
document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
