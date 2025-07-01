document.addEventListener("DOMContentLoaded", () => {
  const blogGrid     = document.getElementById("blogGrid");
  const searchInput  = document.getElementById("searchInput");
  const sortSelect   = document.getElementById("sortSelect");
  const categoryWrap = document.getElementById("categoryFilters");
  const blogCount    = document.getElementById("blogCount");

  let blogs = [];
  let activeCategory = "All";
  let visibleCount = 0;
  const LOAD_COUNT = 6;

  // Load blog index
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
  }

  // Load blog filters from categories
  function renderFilters() {
    const allTags = new Set();
    blogs.forEach(blog => {
      (blog.category || []).forEach(tag => allTags.add(tag));
    });

    categoryWrap.innerHTML = "";

    const allBtn = createFilterButton("All", true);
    categoryWrap.appendChild(allBtn);

    [...allTags].sort().forEach(tag => {
      const btn = createFilterButton(tag);
      categoryWrap.appendChild(btn);
    });
  }

  function createFilterButton(name, isActive = false) {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.className = "category-btn" + (isActive ? " active" : "");
    btn.addEventListener("click", () => {
      document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = name;
      visibleCount = 0;
      renderBlogs();
    });
    return btn;
  }

  function renderBlogs() {
    const query = searchInput.value.trim().toLowerCase();
    const sortBy = sortSelect.value;

    let filtered = blogs.filter(blog => {
      const inTitle = blog.title.toLowerCase().includes(query);
      const inSummary = blog.summary?.toLowerCase().includes(query);
      const inCategory = activeCategory === "All" || (blog.category || []).includes(activeCategory);
      return (inTitle || inSummary) && inCategory;
    });

    if (sortBy === "title") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    blogGrid.innerHTML = "";
    const blogsToShow = filtered.slice(0, visibleCount + LOAD_COUNT);
    blogsToShow.forEach(blog => blogGrid.appendChild(createBlogCard(blog)));

    visibleCount += LOAD_COUNT;
    blogCount.textContent = `${filtered.length} blog${filtered.length !== 1 ? "s" : ""}`;

    // Load more if needed
    if (visibleCount < filtered.length) {
      const btn = document.createElement("button");
      btn.className = "load-more-btn";
      btn.textContent = "Load More";
      btn.addEventListener("click", () => renderBlogs());
      blogGrid.appendChild(btn);
    }
  }

  function createBlogCard(blog) {
    const card = document.createElement("div");
    card.className = "blog-card";
    card.innerHTML = `
      <img src="${blog.image}" alt="${blog.title}" class="blog-image" />
      <div class="blog-content">
        <div class="category-tag-group">
          ${(blog.category || []).map(tag => `<span class="category-tag">${tag}</span>`).join("")}
        </div>
        <h3 class="blog-title">${blog.title}</h3>
        <p class="blog-summary">${blog.summary}</p>
        <a href="post?postId=${blog.slug}" class="read-more-link">Read More →</a>
      </div>
    `;
    return card;
  }

  async function findFeaturedImage(slug) {
    const extensions = ["jpg", "jpeg", "png", "webp"];
    for (const ext of extensions) {
      const path = `posts/${slug}/featured.${ext}`;
      try {
        const res = await fetch(path, { method: "HEAD" });
        if (res.ok) return path;
      } catch {}
    }
    return "images/featured_blog.jpg";
  }

  // Event listeners
  searchInput.addEventListener("input", () => {
    visibleCount = 0;
    renderBlogs();
  });

  sortSelect.addEventListener("change", () => {
    visibleCount = 0;
    renderBlogs();
  });

  fetchBlogs();
});
