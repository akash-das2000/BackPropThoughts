const blogGrid = document.getElementById("blogGrid");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const categoryFilters = document.getElementById("categoryFilters");
const blogCount = document.getElementById("blogCount");

let allBlogs = [];
let filteredBlogs = [];
let currentCategory = "All";
let currentSearch = "";
let currentSort = "latest";

const BLOGS_PER_BATCH = 6;
let visibleCount = BLOGS_PER_BATCH;

// Load blogs on page load
window.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("data/index.json");
    const index = await res.json();

    const blogPromises = index.map(async ({ slug, date }) => {
      try {
        const metaRes = await fetch(`posts/${slug}/meta.json`);
        const meta = await metaRes.json();
        const image = await findThumbnail(slug);

        return {
          slug,
          date,
          title: meta.title || "Untitled",
          summary: meta.summary || "",
          category: meta.category || "Uncategorized",
          image
        };
      } catch {
        return null;
      }
    });

    const blogs = await Promise.all(blogPromises);
    allBlogs = blogs.filter(Boolean); // Remove nulls
    renderCategoryFilters();
    applyFilters();
  } catch (err) {
    console.error("Failed to load blog data:", err);
  }
});

// 🔍 Search and sort
searchInput.addEventListener("input", (e) => {
  currentSearch = e.target.value.trim().toLowerCase();
  resetAndRender();
});

sortSelect.addEventListener("change", (e) => {
  currentSort = e.target.value;
  resetAndRender();
});

// 🖼 Try to find blog thumbnail
async function findThumbnail(slug) {
  const exts = ["jpg", "jpeg", "png", "webp"];
  for (const ext of exts) {
    try {
      const res = await fetch(`posts/${slug}/featured.${ext}`, { method: "HEAD" });
      if (res.ok) return `posts/${slug}/featured.${ext}`;
    } catch (_) {}
  }
  return "images/featured_blog.jpg";
}

// 🏷 Build filter buttons
function renderCategoryFilters() {
  const categoryCounts = {};

  // Count how often each category appears
  allBlogs.forEach(blog => {
    const category = blog.category || "Uncategorized";
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  // Sort by frequency
  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  // Show only top 4 most common (you can change this number)
  const topCategories = sortedCategories.slice(0, 5);  // ← change this to 5, 6, etc. if needed

  // Final categories to show in filter bar
  const displayCategories = ["All", ...topCategories];

  categoryFilters.innerHTML = "";
  displayCategories.forEach(cat => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.classList.toggle("active", cat === currentCategory);
    btn.addEventListener("click", () => {
      currentCategory = cat;
      document.querySelectorAll("#categoryFilters button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      resetAndRender();
    });
    categoryFilters.appendChild(btn);
  });
}

// 🔁 Reset visible count and re-render
function resetAndRender() {
  visibleCount = BLOGS_PER_BATCH;
  applyFilters();
}

// 🧠 Apply all filters
function applyFilters() {
  filteredBlogs = [...allBlogs];

  if (currentCategory !== "All") {
    filteredBlogs = filteredBlogs.filter(b => b.category === currentCategory);
  }

  if (currentSearch) {
    filteredBlogs = filteredBlogs.filter(b =>
      b.title.toLowerCase().includes(currentSearch) ||
      b.summary.toLowerCase().includes(currentSearch)
    );
  }

  if (currentSort === "latest") {
    filteredBlogs.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (currentSort === "oldest") {
    filteredBlogs.sort((a, b) => new Date(a.date) - new Date(b.date));
  } else if (currentSort === "title") {
    filteredBlogs.sort((a, b) => a.title.localeCompare(b.title));
  } else if (currentSort === "title-desc") {
    filteredBlogs.sort((a, b) => b.title.localeCompare(a.title));
  }

  blogCount.textContent = `${filteredBlogs.length} blog${filteredBlogs.length !== 1 ? "s" : ""}`;

  renderBlogCards();
}

// 📦 Render cards (limited to visibleCount)
function renderBlogCards() {
  const blogsToRender = filteredBlogs.slice(0, visibleCount);

  if (blogsToRender.length === 0) {
    blogGrid.innerHTML = `<p class="no-results">No blogs found. Try another category or search term.</p>`;
    return;
  }

  blogGrid.innerHTML = blogsToRender.map(b => `
    <div class="blog-card">
      <img src="${b.image}" alt="${b.title}" class="blog-thumbnail" />
      <div class="blog-content">
        <h3 class="blog-title">${b.title}</h3>
        <p class="blog-summary">${b.summary}</p>
        <a href="post?postId=${b.slug}" class="read-more-link">Read More →</a>
      </div>
    </div>
  `).join("");

  // Show or hide "Load More" button
  updateLoadMoreButton();
}

// ➕ Load More Button Handling
function updateLoadMoreButton() {
  let btn = document.getElementById("loadMoreBtn");

  if (!btn) {
    btn = document.createElement("button");
    btn.id = "loadMoreBtn";
    btn.textContent = "Load More";
    btn.className = "load-more-btn";
    btn.addEventListener("click", () => {
      visibleCount += BLOGS_PER_BATCH;
      renderBlogCards();
    });
    blogGrid.parentElement.appendChild(btn);
  }

  if (visibleCount >= filteredBlogs.length) {
    btn.style.display = "none";
  } else {
    btn.style.display = "block";
  }
}
