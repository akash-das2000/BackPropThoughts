const params = new URLSearchParams(window.location.search);
const postId = params.get("postId");

if (!postId) {
  document.getElementById("post-content").innerHTML = "<p>Post not found.</p>";
} else {
  // Load blog content
  fetch(`posts/${postId}/index.html`)
    .then(res => {
      if (!res.ok) throw new Error("Post not found");
      return res.text();
    })
    .then(html => {
      const contentDiv = document.getElementById("post-content");
      contentDiv.innerHTML = html;

      // === Dynamic TOC Generation ===
      const tocList = document.getElementById("toc-list");
      tocList.innerHTML = ""; // Clear placeholder
      const headings = contentDiv.querySelectorAll("h2[id], h3[id]");
      const tocLinks = [];

      headings.forEach(h => {
        const li = document.createElement("li");
        const link = document.createElement("a");
        link.href = `#${h.id}`;
        link.textContent = h.textContent;
        li.appendChild(link);
        tocList.appendChild(li);
        tocLinks.push({ link, id: h.id });
      });

      // === Active Section Highlight on Scroll ===
      const observerOptions = {
        root: null,
        rootMargin: '0px 0px -60% 0px',
        threshold: 0
      };

      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            tocLinks.forEach(({ link }) => link.classList.remove('active'));
            const active = tocLinks.find(t => t.id === entry.target.id);
            if (active) active.link.classList.add('active');
          }
        });
      }, observerOptions);

      headings.forEach(h => observer.observe(h));
    })
    .catch(err => {
      document.getElementById("post-content").innerHTML = "<p>Post not found.</p>";
      console.error(err);
    });

  // Set browser tab title
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

// === TOC Toggle on All Devices ===
document.addEventListener("DOMContentLoaded", () => {
  const tocBox = document.querySelector(".toc-box");
  const tocHeader = tocBox?.querySelector("h3");

  if (tocBox && tocHeader) {
    tocBox.classList.add("expanded"); // Default to open

    tocHeader.addEventListener("click", () => {
      tocBox.classList.toggle("expanded");
    });
  }
});
