const params = new URLSearchParams(window.location.search);
const postId = params.get("postId");

if (!postId) {
  document.getElementById("post-content").innerHTML = "<p>Post not found.</p>";
} else {
  // === Load Blog Content ===
  fetch(`posts/${postId}/index.html`)
    .then(res => {
      if (!res.ok) throw new Error("Post not found");
      return res.text();
    })
    .then(html => {
      const contentDiv = document.getElementById("post-content");
      contentDiv.innerHTML = html;

      // === Generate TOC from headings ===
      const tocList = document.getElementById("toc-list");
      tocList.innerHTML = "";
      const headings = contentDiv.querySelectorAll("h2[id], h3[id]");
      headings.forEach(h => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="#${h.id}">${h.textContent}</a>`;
        tocList.appendChild(li);
      });

      // === Highlight active section in TOC ===
      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            const id = entry.target.getAttribute("id");
            const tocLink = document.querySelector(`.toc-box a[href="#${id}"]`);
            if (tocLink) {
              if (entry.isIntersecting) {
                document.querySelectorAll(".toc-box a").forEach(el => el.classList.remove("active"));
                tocLink.classList.add("active");
              }
            }
          });
        },
        { threshold: 0.4 }
      );

      headings.forEach(h => observer.observe(h));
    })
    .catch(err => {
      document.getElementById("post-content").innerHTML = "<p>Post not found.</p>";
      console.error(err);
    });

  // === Set Browser Tab Title from Meta ===
  fetch(`posts/${postId}/meta.json`)
    .then(res => {
      if (!res.ok) throw new Error("Meta not found");
      return res.json();
    })
    .then(meta => {
      const title = meta.title || postId;
      document.title = title;
    })
    .catch(err => {
      console.warn("Could not load blog metadata:", err);
    });
}

// === Collapsible TOC for Mobile ===
document.addEventListener("DOMContentLoaded", () => {
  const tocBox = document.querySelector(".toc-box");
  const tocHeader = tocBox?.querySelector("h3");
  if (tocHeader) {
    tocHeader.addEventListener("click", () => {
      tocBox.classList.toggle("expanded");
    });
  }
});
