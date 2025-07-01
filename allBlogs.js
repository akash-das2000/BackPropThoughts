const blogGrid = document.getElementById("blogGrid");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const categoryFilters = document.getElementById("categoryFilters");

let allBlogs = [];
let currentCategory = "All";
let currentSearch = "";
let currentSort = "latest";

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
    allBlogs = blogs.filter(Boolean); // Remove any nulls

    renderCategoryFilters();
    renderBlogCards();
  } catch (err) {
    console.error("Failed to load blogs:", err);
  }
});

// 🔍 Search & Sort
searchInput.addEventListener("input", (e) => {
  currentSearch = e.target.value.trim().toLowerCase();
  renderBlogCards();
});

sortSelect.addEventListener("change", (e) => {
  currentSort = e.target.value;
  renderBlogCards();
});

// 🖼️ Try to find thumbnail
async function findThumbnail(slug) {
  const exts = ["jpg", "jpeg", "png", "webp"];
  for (const ext of exts) {
    try {
      const res = await fetch(`posts/${slug}/featured.${ext}`, { method: "HEAD" });
      if (res.ok) return `posts/${slug}/featured.${ext}`;
    } catch (_) {}
  }
  return "images/featured_blog.jpg"; // default fallback
}

// 🏷️ Build unique category buttons
function renderCategoryFilters() {
  const categories = ["All", ...new Set(allBlogs.map(b => b.category))];

  categoryFilters.innerHTML = "";
  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.classList.toggle("active", cat === currentCategory);
    btn.addEventListener("click", () => {
      currentCategory = cat;
      document.querySelectorAll("#categoryFilters button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderBlogCards();
    });
    categoryFilters.appendChild(btn);
  });
}

// 🧠 Main render logic
function renderBlogCards() {
  let filtered = [...allBlogs];

  if (currentCategory !== "All") {
    filtered = filtered.filter(b => b.category === currentCategory);
  }

  if (currentSearch) {
    filtered = filtered.filter(b =>
      b.title.toLowerCase().includes(currentSearch) ||
      b.summary.toLowerCase().includes(currentSearch)
    );
  }

  if (currentSort === "latest") {
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (currentSort === "title") {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  }

  blogGrid.innerHTML = filtered.map(b => `
    <div class="blog-card">
      <img src="${b.image}" alt="${b.title}" class="blog-thumbnail" />
      <div class="blog-content">
        <h3 class="blog-title">${b.title}</h3>
        <p class="blog-summary">${b.summary}</p>
        <a href="post?postId=${b.slug}" class="read-more-link">Read More →</a>
      </div>
    </div>
  `).join("");
}
