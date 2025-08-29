document.addEventListener("DOMContentLoaded", () => {
  const blogGrid      = document.getElementById("blogGrid");
  const searchInput   = document.getElementById("searchInput");
  const sortSelect    = document.getElementById("sortSelect");
  const categoryWrap  = document.getElementById("categoryFilters");
  const blogCount     = document.getElementById("blogCount");
  const loadMoreBtn   = document.getElementById("loadMoreBtn");
  const catLeft       = document.getElementById("catLeft");
  const catRight      = document.getElementById("catRight");

  let blogs = [];
  let activeCategory = "All";
  let visibleCount = 0;
  const LOAD_COUNT = 6;

  async function fetchBlogs() {
    const res = await fetch("data/index.json");
    const index = await res.json();

    const entries = await Promise.all(index.map(async ({ slug, date }) => {
      try {
        const metaRes = await fetch(`posts/${slug}/meta.json`);
        if (!metaRes.ok) throw new Error();
        const meta = await metaRes.json();
        const image = await findFeaturedImage(slug);
        return { slug, date, ...meta, image };
      } catch {
        return null;
      }
    }));

    blogs = entries.filter(Boolean);
    renderFilters();
    renderBlogs();
    updateTagArrows();
  }

  /* ---------- Filters ---------- */
  function renderFilters() {
    const allTags = new Set();
    blogs.forEach(b => (b.category || []).forEach(t => allTags.add(t)));

    categoryWrap.innerHTML = "";
    categoryWrap.appendChild(createFilterButton("All", true));
    [...allTags].sort((a, b) => a.localeCompare(b)).forEach(tag => {
      categoryWrap.appendChild(createFilterButton(tag));
    });

    // When tags overflow, show arrows state
    categoryWrap.addEventListener("scroll", throttle(updateTagArrows, 100));
    window.addEventListener("resize", updateTagArrows);
  }

  function createFilterButton(name, isActive = false) {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.className = "category-btn" + (isActive ? " active" : "");
    btn.addEventListener("click", () => {
      [...categoryWrap.querySelectorAll(".category-btn")].forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = name;
      visibleCount = 0;
      renderBlogs();
    });
    return btn;
  }

  /* ---------- Render ---------- */
  function renderBlogs() {
    const query = searchInput.value.trim().toLowerCase();
    const sortBy = sortSelect.value;

    let filtered = blogs.filter(b => {
      const inTitle   = b.title.toLowerCase().includes(query);
      const inSummary = (b.summary || "").toLowerCase().includes(query);
      const inCat     = activeCategory === "All" || (b.category || []).includes(activeCategory);
      return (inTitle || inSummary) && inCat;
    });

    // ✅ Correct, explicit sorting
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

    blogGrid.innerHTML = "";
    const blogsToShow = filtered.slice(0, visibleCount + LOAD_COUNT);
    blogsToShow.forEach(b => blogGrid.appendChild(createBlogCard(b)));
    visibleCount += LOAD_COUNT;

    blogCount.textContent = `${filtered.length} blog${filtered.length !== 1 ? "s" : ""}`;

    // Show/hide centered Load More
    loadMoreBtn.style.display = visibleCount < filtered.length ? "inline-flex" : "none";
  }

  function createBlogCard(blog) {
    const card = document.createElement("div");
    card.className = "blog-card";

    const img = document.createElement("img");
    img.className = "blog-thumbnail";                 // ✅ matches CSS
    img.src = blog.image;
    img.alt = blog.title;

    const content = document.createElement("div");
    content.className = "blog-content";

    const tags = document.createElement("div");
    tags.className = "blog-tags";
    (blog.category || []).forEach(t => {
      const span = document.createElement("span");
      span.className = "tag-badge";
      span.textContent = t;
      tags.appendChild(span);
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

  /* ---------- Tag scroller arrows ---------- */
  function updateTagArrows() {
    const canScrollLeft  = categoryWrap.scrollLeft > 0;
    const canScrollRight = categoryWrap.scrollLeft + categoryWrap.clientWidth < categoryWrap.scrollWidth - 1;
    catLeft.disabled  = !canScrollLeft;
    catRight.disabled = !canScrollRight;
  }
  const SCROLL_STEP = 220;
  catLeft.addEventListener("click", () => {
    categoryWrap.scrollBy({ left: -SCROLL_STEP, behavior: "smooth" });
  });
  catRight.addEventListener("click", () => {
    categoryWrap.scrollBy({ left:  SCROLL_STEP, behavior: "smooth" });
  });

  /* ---------- Events ---------- */
  searchInput.addEventListener("input", () => { visibleCount = 0; renderBlogs(); });
  sortSelect.addEventListener("change", () => { visibleCount = 0; renderBlogs(); });
  loadMoreBtn.addEventListener("click", () => renderBlogs());

  // util: cheap throttle for scroll/resize
  function throttle(fn, wait) {
    let t = 0;
    return (...args) => {
      const now = Date.now();
      if (now - t >= wait) { t = now; fn(...args); }
    };
  }

  fetchBlogs();
});
