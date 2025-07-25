/* ---------------------------------------------------------------
   postLoader.js
   ---------------------------------------------------------------
   Handles:
   📖 Loading blog content
   🧮 Rendering MathJax
   📃 Printer-friendly PDF (with TOC and dropdown fixes)
   🗂 Meta info bar (date, share icons, reading time)
   ------------------------------------------------------------- */

// ───────────────────────────────────────────────────────────────────
// 1) Redirect legacy /post?postId=slug → /posts/slug/
// ───────────────────────────────────────────────────────────────────
(() => {
  const url = new URL(window.location.href);
  const id  = url.searchParams.get("postId");
  if (id && window.location.pathname === "/post") {
    // Swap into the pretty URL and reload
    window.location.replace(`/posts/${id}/`);
    return;
  }
})();

// ───────────────────────────────────────────────────────────────────
// 2) Determine the `postId` from either query-string or pathname
// ───────────────────────────────────────────────────────────────────
const contentDiv = document.getElementById("post-content");
let postId = null;

(() => {
  const url = new URL(window.location.href);
  // Try query-string first
  const paramId = url.searchParams.get("postId");
  if (paramId) {
    postId = paramId;
    return;
  }
  // Otherwise, match /posts/<slug>/ in the path
  const match = window.location.pathname.match(/^\/posts\/([^\/]+)\/?$/);
  if (match) {
    postId = decodeURIComponent(match[1]);
  }
})();

// ───────────────────────────────────────────────────────────────────
// 3) Kick off loading or show “not found”
// ───────────────────────────────────────────────────────────────────
if (!postId) {
  contentDiv.innerHTML = "<p>Post not found.</p>";
} else {
  loadPost().catch(err => {
    console.error(err);
    contentDiv.innerHTML = "<p>Post not found.</p>";
  });
}

/* ========================== MAIN ============================ */
async function loadPost() {
  let pubDate = "";

  // 1️⃣ Load publication date from data/index.json
  try {
    const idxRes = await fetch("data/index.json");
    if (idxRes.ok) {
      const idxJson = await idxRes.json();
      const rec = idxJson.find(p => p.slug === postId);
      pubDate = rec?.date || "";
    }
  } catch (e) {
    console.warn("index.json not found:", e);
  }

  // 2️⃣ Load blog HTML content
  const htmlRes = await fetch(`posts/${postId}/index.html`);
  if (!htmlRes.ok) throw new Error("Post HTML not found");
  const html = await htmlRes.text();
  contentDiv.innerHTML = html;

  // 3️⃣ Render MathJax equations
  requestAnimationFrame(() => {
    window.MathJax?.typesetPromise?.([contentDiv])
      .catch(err => console.error("MathJax typeset failed:", err));
  });

  // 4️⃣ Build meta bar (date + icons)
  buildMetaBar(pubDate);

  // 5️⃣ Build TOC and other UI helpers
  buildTOC();
  initScrollToTop();
  relocateMobileTOC();
  loadTitleFromMeta();
}

/* ====================== Meta Bar ============================ */
function buildMetaBar(pubDateISO) {
  const wpm = 200;
  const text = contentDiv.innerText || contentDiv.textContent || "";
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / wpm));

  const bar = document.createElement("div");
  bar.className = "reading-time-display";

  const dateSpan = document.createElement("span");
  dateSpan.className = "post-date";
  if (pubDateISO) {
    dateSpan.innerHTML = `<i class="fa-regular fa-calendar"></i> ${formatDate(pubDateISO)}`;
  }
  bar.appendChild(dateSpan);

  const iconsWrap = document.createElement("div");
  iconsWrap.className = "meta-icons";

  // PDF download
  const pdfIcon = document.createElement("i");
  pdfIcon.className = "fa-solid fa-download";
  pdfIcon.title = "Download Printer-friendly PDF";
  pdfIcon.addEventListener("click", async () => {
    try {
      const details = contentDiv.querySelectorAll("details");
      details.forEach(d => d.open = true);
      await window.MathJax?.typesetPromise?.([contentDiv]);
      const h1 = contentDiv.querySelector("h1");
      const tocBox = document.querySelector(".toc-box");
      if (h1 && tocBox) h1.after(tocBox);
      await new Promise(r => setTimeout(r, 500));
      window.print();
    } catch (err) {
      console.error("Print prep failed:", err);
      alert("Failed to prepare PDF.");
    }
  });

  window.onafterprint = () => {
    const rightSlot = document.querySelector(".right-toc-slot");
    const tocBox = document.querySelector(".toc-box");
    if (rightSlot && tocBox) rightSlot.appendChild(tocBox);
    const details = contentDiv.querySelectorAll("details");
    details.forEach(d => d.open = false);
  };

  // Copy link
  const linkIcon = document.createElement("i");
  linkIcon.className = "fa-solid fa-link";
  linkIcon.title = "Copy link";
  linkIcon.addEventListener("click", () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => alert("Link copied!"))
      .catch(() => alert("Copy failed."));
  });

  // Email share
  const emailIcon = document.createElement("i");
  emailIcon.className = "fa-solid fa-envelope";
  emailIcon.title = "Share via Email";
  emailIcon.addEventListener("click", () => {
    const subj = encodeURIComponent(document.title);
    const body = encodeURIComponent(`Check out this post: ${window.location.href}`);
    window.location.href = `mailto:?subject=${subj}&body=${body}`;
  });

  // Reading time
  const clockIcon = document.createElement("i");
  clockIcon.className = "fa-solid fa-clock";
  const timeText = document.createElement("span");
  timeText.textContent = ` ${minutes} min`;

  iconsWrap.append(pdfIcon, linkIcon, emailIcon, clockIcon, timeText);
  bar.appendChild(iconsWrap);

  const firstH1 = contentDiv.querySelector("h1");
  firstH1
    ? firstH1.insertAdjacentElement("afterend", bar)
    : contentDiv.prepend(bar);
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${+d} ${months[+m - 1]} ${y}`;
}

/* =================== Table of Contents ======================= */
function buildTOC() {
  const tocList = document.getElementById("toc-list");
  tocList.innerHTML = "";

  const headings = contentDiv.querySelectorAll("h2[id], h3[id]");
  headings.forEach(h => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="#${h.id}">${h.textContent}</a>`;
    if (h.tagName.toLowerCase() === "h3") li.classList.add("subsection");
    tocList.appendChild(li);
  });

  const links = tocList.querySelectorAll("a");
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const link = tocList.querySelector(`a[href="#${e.target.id}"]`);
      if (link && e.isIntersecting) {
        links.forEach(a => a.classList.remove("active"));
        link.classList.add("active");
      }
    });
  }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 });
  headings.forEach(h => obs.observe(h));

  const tocBox = document.querySelector(".toc-box");
  const header = document.createElement("div");
  header.className = "toc-header";
  header.innerHTML = `
    <span>Table of Contents</span>
    <span class="toggle-icon" id="toc-toggle-icon">▲</span>`;
  tocBox.prepend(header);

  header.addEventListener("click", () => {
    tocBox.classList.toggle("collapsed");
    header.querySelector("#toc-toggle-icon").textContent =
      tocBox.classList.contains("collapsed") ? "▼" : "▲";
  });

  tocList.addEventListener("click", e => {
    const link = e.target.closest("a[href^='#']");
    if (link) {
      e.preventDefault();
      document.querySelector(link.hash)?.scrollIntoView({ behavior: "smooth" });
      history.pushState(null, null, link.hash);
    }
  });
}

/* ================= Scroll-to-Top Button ====================== */
function initScrollToTop() {
  const btn = document.createElement("button");
  btn.id = "scrollToTopBtn";
  btn.textContent = "▴";
  document.body.appendChild(btn);

  btn.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" }));

  window.addEventListener("scroll", () =>
    window.scrollY > 500
      ? btn.classList.add("show")
      : btn.classList.remove("show"));
}

/* ========== Relocate TOC for Mobile (below H1) =============== */
function relocateMobileTOC() {
  try {
    if (window.innerWidth > 768) return;
    const rightSlot = document.querySelector(".right-toc-slot");
    const h1 = contentDiv.querySelector("h1");
    if (rightSlot && h1) {
      const wrapper = document.createElement("div");
      wrapper.className = "mobile-toc-wrapper";
      wrapper.appendChild(rightSlot);
      h1.after(wrapper);
    }
  } catch (e) {
    console.warn("Mobile TOC placement failed:", e);
  }
}

/* ========== Load optional meta.json title ==================== */
function loadTitleFromMeta() {
  fetch(`posts/${postId}/meta.json`)
    .then(r => (r.ok ? r.json() : {}))
    .then(m => {
      if (m.title) document.title = m.title;
    })
    .catch(() => {});
}
