// allBlogs.js — featured chips + "+N more" modal, selected chips, sorting, load more

document.addEventListener("DOMContentLoaded", () => {
  // DOM
  const blogGrid      = document.getElementById("blogGrid");
  const searchInput   = document.getElementById("searchInput");
  const sortSelect    = document.getElementById("sortSelect");
  const blogCountEl   = document.getElementById("blogCount");
  const loadMoreBtn   = document.getElementById("loadMoreBtn");

  const featuredTagsEl = document.getElementById("featuredTags");
  const activeTagsEl   = document.getElementById("activeTags");

  // Modal nodes
  const tagModal       = document.getElementById("tagModal");
  const tagModalClose  = document.getElementById("tagModalClose");
  const tagSearchInput = document.getElementById("tagSearch");
  const tagListEl      = document.getElementById("tagList");
  const applyTagsBtn   = document.getElementById("applyTagsBtn");
  const clearTagsBtn   = document.getElementById("clearTagsBtn");

  // State
  let blogs = [];
  let tagCounts = new Map();        // tag -> count
  let allTags = [];                 // sorted by name
  let featuredTags = [];            // top-N by count
  let selectedTags = new Set();     // current selection
  let visibleCount = 0;
  const LOAD_COUNT = 6;
  const FEATURED_COUNT = 8;

  // Boot
  fetchBlogs();

  async function fetchBlogs() {
    const res = await fetch("data/index.json");
    const index = await res.json();

    const entries = await Promise.all(
      index.map(async ({ slug, date }) => {
        try {
          const metaRes = await fetch(`posts/${slug}/meta.json`);
          if (!metaRes.ok) throw new Error();
          const meta = await metaRes.json();
          const image = await findFeaturedImage(slug);
          return { slug, date, ...meta, image };
        } catch {
          return null;
        }
      })
    );

    blogs = entries.filter(Boolean);

    // Build tag counts
    tagCounts = new Map();
    blogs.forEach(b => (b.category || []).forEach(t => {
      tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    }));

    // Featured: top-N by frequency
    featuredTags = [...tagCounts.entries()]
      .sort((a,b) => b[1] - a[1])
      .slice(0, FEATURED_COUNT)
      .map(([t]) => t);

    // All tags alphabetically for modal
    allTags = [...tagCounts.keys()].sort((a,b) => a.localeCompare(b));

    // Render UI
    renderFeaturedRow();
    renderActiveChips();
    visibleCount = LOAD_COUNT;
    renderBlogs();
  }

  /* ---------- Featured row (chips + +N more) ---------- */
  function renderFeaturedRow() {
    featuredTagsEl.innerHTML = "";

    // Featured chips
    featuredTags.forEach(tag => {
      const chip = document.createElement("button");
      chip.className = "chip" + (selectedTags.has(tag) ? " is-active" : "");
      chip.type = "button";
      chip.textContent = tag;
      chip.addEventListener("click", () => {
        toggleTag(tag);
      });
      featuredTagsEl.appendChild(chip);
    });

    // +N more
    const remaining = allTags.length - featuredTags.length;
    if (remaining > 0) {
      const more = document.createElement("button");
      more.className = "chip more";
      more.type = "button";
      more.textContent = `+${remaining} more`;
      more.addEventListener("click", openTagModal);
      featuredTagsEl.appendChild(more);
    }
  }

  function toggleTag(tag) {
    if (selectedTags.has(tag)) selectedTags.delete(tag);
    else selectedTags.add(tag);

    visibleCount = LOAD_COUNT;
    renderFeaturedRow();
    renderActiveChips();
    renderBlogs();
  }

  /* ---------- Selected chips under row ---------- */
  function renderActiveChips() {
    activeTagsEl.innerHTML = "";
    if (selectedTags.size === 0) return;

    [...selectedTags].sort((a,b)=>a.localeCompare(b)).forEach(tag => {
      const chip = document.createElement("span");
      chip.className = "active-tag";
      const btn = document.createElement("button");
      btn.setAttribute("aria-label", `Remove ${tag}`);
      btn.textContent = "×";
      btn.addEventListener("click", () => toggleTag(tag));

      chip.textContent = tag + " ";
      chip.appendChild(btn);
      activeTagsEl.appendChild(chip);
    });
  }

  /* ---------- Modal: browse all tags ---------- */
  function openTagModal() {
    tagSearchInput.value = "";
    renderModalTagList();
    tagModal.classList.remove("hidden");
    // close on backdrop click
    tagModal.querySelector(".modal-backdrop").onclick = closeTagModal;
    tagModalClose.onclick = closeTagModal;
    document.addEventListener("keydown", escToClose);
  }

  function closeTagModal() {
    tagModal.classList.add("hidden");
    document.removeEventListener("keydown", escToClose);
  }

  function escToClose(e) {
    if (e.key === "Escape") closeTagModal();
  }

  function renderModalTagList() {
    const q = tagSearchInput.value.trim().toLowerCase();
    tagListEl.innerHTML = "";

    allTags
      .filter(t => t.toLowerCase().includes(q))
      .forEach(tag => {
        const row = document.createElement("label");
        row.className = "tag-item";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = selectedTags.has(tag);
        input.dataset.tag = tag;

        const name = document.createElement("span");
        name.textContent = tag;

        const count = document.createElement("span");
        count.className = "tag-count";
        count.textContent = `· ${tagCounts.get(tag) || 0}`;

        row.appendChild(input);
        row.appendChild(name);
        row.appendChild(count);
        tagListEl.appendChild(row);
      });
  }

  tagSearchInput.addEventListener("input", renderModalTagList);

  applyTagsBtn.addEventListener("click", () => {
    // collect checks
    const checks = [...tagListEl.querySelectorAll('input[type="checkbox"]')];
    selectedTags = new Set(checks.filter(c => c.checked).map(c => c.dataset.tag));
    closeTagModal();
    visibleCount = LOAD_COUNT;
    renderFeaturedRow();
    renderActiveChips();
    renderBlogs();
  });

  clearTagsBtn.addEventListener("click", () => {
    selectedTags.clear();
    // uncheck all in UI
    tagListEl.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
  });

  /* ---------- Render blogs ---------- */
  function renderBlogs() {
    const query = (searchInput.value || "").trim().toLowerCase();
    const sortBy = sortSelect.value;

    let filtered = blogs.filter(b => {
      const inTitle   = (b.title || "").toLowerCase().includes(query);
      const inSummary = (b.summary || "").toLowerCase().includes(query);

      // tag filter: any-of selected tags; if none selected -> pass
      const tags = b.category || [];
      const tagPass = selectedTags.size === 0 ? true : tags.some(t => selectedTags.has(t));

      return (inTitle || inSummary) && tagPass;
    });

    // sort
    switch (sortBy) {
      case "oldest":
        filtered.sort((a,b) => new Date(a.date) - new Date(b.date)); break;
      case "title":
        filtered.sort((a,b) => a.title.localeCompare(b.title)); break;
      case "title-desc":
        filtered.sort((a,b) => b.title.localeCompare(a.title)); break;
      case "latest":
      default:
        filtered.sort((a,b) => new Date(b.date) - new Date(a.date)); break;
    }

    blogGrid.innerHTML = "";
    const shown = filtered.slice(0, visibleCount);
    shown.forEach(b => blogGrid.appendChild(createBlogCard(b)));

    blogCountEl.textContent = `${filtered.length} blog${filtered.length !== 1 ? "s" : ""}`;
    loadMoreBtn.style.display = visibleCount < filtered.length ? "inline-flex" : "none";

    if (shown.length === 0) {
      const empty = document.createElement("div");
      empty.className = "no-results";
      empty.textContent = "No blogs match your filters.";
      blogGrid.appendChild(empty);
    }
  }

  function createBlogCard(blog) {
    const card = document.createElement("div");
    card.className = "blog-card";

    const img = document.createElement("img");
    img.className = "blog-thumbnail";
    img.src = blog.image;
    img.alt = blog.title || "Blog thumbnail";

    const content = document.createElement("div");
    content.className = "blog-content";

    const tags = document.createElement("div");
    tags.className = "blog-tags";
    (blog.category || []).forEach(t => {
      const s = document.createElement("span");
      s.className = "tag-badge";
      s.textContent = t;
      tags.appendChild(s);
    });

    const title = document.createElement("h3");
    title.className = "blog-title";
    title.textContent = blog.title;

    const summary = document.createElement("p");
    summary.className = "blog-summary";
    summary.textContent = blog.summary;

    const link = document.createElement("a");
    link.className = "read-more-link";
    link.href = `post?postId=${blog.slug}`;
    link.textContent = "Read More →";

    content.appendChild(tags);
    content.appendChild(title);
    content.appendChild(summary);
    content.appendChild(link);

    card.appendChild(img);
    card.appendChild(content);
    return card;
  }

  async function findFeaturedImage(slug) {
    const exts = ["jpg", "jpeg", "png", "webp"];
    for (const ext of exts) {
      const path = `posts/${slug}/featured.${ext}`;
      try {
        const res = await fetch(path, { method: "HEAD" });
        if (res.ok) return path;
      } catch {}
    }
    return "images/featured_blog.jpg";
  }

  /* ---------- Events ---------- */
  const debouncedSearch = debounce(() => { visibleCount = LOAD_COUNT; renderBlogs(); }, 150);
  searchInput.addEventListener("input", debouncedSearch);
  sortSelect.addEventListener("change", () => { visibleCount = LOAD_COUNT; renderBlogs(); });
  loadMoreBtn.addEventListener("click", () => { visibleCount += LOAD_COUNT; renderBlogs(); });

  /* ---------- Utils ---------- */
  function debounce(fn, wait) {
    let t = null;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }
});
