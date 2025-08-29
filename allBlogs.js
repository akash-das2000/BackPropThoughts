// allBlogs.js

document.addEventListener("DOMContentLoaded", () => {
  // DOM
  const blogGrid     = document.getElementById("blogGrid");
  const searchInput  = document.getElementById("searchInput");
  const sortSelect   = document.getElementById("sortSelect");
  const blogCount    = document.getElementById("blogCount");
  const loadMoreBtn  = document.getElementById("loadMoreBtn");
  const tagSelect    = document.getElementById("tagSelect");   // <select multiple>
  const activeTagsEl = document.getElementById("activeTags");  // chips container

  // State
  let blogs = [];
  let allTags = [];
  let visibleCount = 0;
  const LOAD_COUNT = 6;

  // ------- Boot -------
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

    // Build tag universe
    const set = new Set();
    blogs.forEach(b => (b.category || []).forEach(t => set.add(t)));
    allTags = [...set].sort((a, b) => a.localeCompare(b));

    populateTagDropdown();
    // Initial page
    visibleCount = LOAD_COUNT;
    renderActiveTagChips();
    renderBlogs();
  }

  // ------- UI: Tag dropdown + chips -------
  function populateTagDropdown() {
    tagSelect.innerHTML = "";
    allTags.forEach(tag => {
      const opt = document.createElement("option");
      opt.value = tag;
      opt.textContent = tag;
      tagSelect.appendChild(opt);
    });
  }

  function getSelectedTags() {
    return [...tagSelect.selectedOptions].map(o => o.value);
  }

  function renderActiveTagChips() {
    const selected = getSelectedTags();
    activeTagsEl.innerHTML = "";
    selected.forEach(tag => {
      const chip = document.createElement("span");
      chip.className = "active-tag";
      chip.innerHTML = `${tag} <button aria-label="Remove ${tag}" title="Remove ${tag}">×</button>`;
      chip.querySelector("button").addEventListener("click", () => {
        // deselect in <select>
        [...tagSelect.options].forEach(o => {
          if (o.value === tag) o.selected = false;
        });
        visibleCount = LOAD_COUNT;
        renderActiveTagChips();
        renderBlogs();
      });
      activeTagsEl.appendChild(chip);
    });
  }

  // ------- Render -------
  function renderBlogs() {
    const query = (searchInput.value || "").trim().toLowerCase();
    const selectedTags = new Set(getSelectedTags());
    const sortBy = sortSelect.value;

    // Filter
    let filtered = blogs.filter(b => {
      const inTitle   = (b.title || "").toLowerCase().includes(query);
      const inSummary = (b.summary || "").toLowerCase().includes(query);

      // Tag logic: if no tags selected -> allow all
      const tags = b.category || [];
      const tagMatch =
        selectedTags.size === 0
          ? true
          : tags.some(t => selectedTags.has(t));

      return (inTitle || inSummary) && tagMatch;
    });

    // Sort
    switch (sortBy) {
      case "oldest":
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case "title":
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title-desc":
        filtered.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "latest":
      default:
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
    }

    // Grid
    blogGrid.innerHTML = "";
    const shown = filtered.slice(0, visibleCount);
    shown.forEach(b => blogGrid.appendChild(createBlogCard(b)));

    // Count + Load more visibility
    blogCount.textContent = `${filtered.length} blog${filtered.length !== 1 ? "s" : ""}`;
    loadMoreBtn.style.display = visibleCount < filtered.length ? "inline-flex" : "none";

    // If nothing to show
    if (shown.length === 0) {
      const empty = document.createElement("div");
      empty.className = "no-results";
      empty.textContent = "No blogs match your filters.";
      blogGrid.appendChild(empty);
    }

    // Attach handler for load more with current filtered length in scope
    loadMoreBtn.onclick = () => {
      visibleCount += LOAD_COUNT;
      renderBlogs();
    };
  }

  function createBlogCard(blog) {
    const card = document.createElement("div");
    card.className = "blog-card";

    // Thumbnail
    const img = document.createElement("img");
    img.className = "blog-thumbnail"; // matches CSS for uniform height
    img.src = blog.image;
    img.alt = blog.title || "Blog thumbnail";

    // Content
    const content = document.createElement("div");
    content.className = "blog-content";

    // Tags in card
    const tags = document.createElement("div");
    tags.className = "blog-tags";
    (blog.category || []).forEach(tagText => {
      const tag = document.createElement("span");
      tag.className = "tag-badge";
      tag.textContent = tagText;
      tags.appendChild(tag);
    });

    // Title
    const title = document.createElement("h3");
    title.className = "blog-title";
    title.textContent = blog.title;

    // Summary
    const summary = document.createElement("p");
    summary.className = "blog-summary";
    summary.textContent = blog.summary;

    // Link
    const link = document.createElement("a");
    link.className = "read-more-link";
    link.href = `post?postId=${blog.slug}`;
    link.textContent = "Read More →";

    // Assemble
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

  // ------- Events -------
  // Debounce search input for nicer UX
  const debouncedSearch = debounce(() => {
    visibleCount = LOAD_COUNT;
    renderBlogs();
  }, 150);

  searchInput.addEventListener("input", debouncedSearch);

  sortSelect.addEventListener("change", () => {
    visibleCount = LOAD_COUNT;
    renderBlogs();
  });

  tagSelect.addEventListener("change", () => {
    visibleCount = LOAD_COUNT;
    renderActiveTagChips();
    renderBlogs();
  });

  // ------- Utils -------
  function debounce(fn, wait) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }
});
