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

      // === TOC Generation ===
      const tocList = document.getElementById("toc-list");
      tocList.innerHTML = "";
      const headings = contentDiv.querySelectorAll("h2[id], h3[id]");

      headings.forEach(h => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="#${h.id}">${h.textContent}</a>`;
        tocList.appendChild(li);
      });

      // === Highlight Active TOC Link on Scroll ===
      const tocLinks = tocList.querySelectorAll("a");
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const id = entry.target.id;
          const link = tocList.querySelector(`a[href="#${id}"]`);
          if (link) {
            if (entry.isIntersecting) {
              tocLinks.forEach(a => a.classList.remove("active"));
              link.classList.add("active");
            }
          }
        });
      }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 });

      headings.forEach(h => observer.observe(h));

      // === TOC Collapse Toggle (All Devices) ===
      const tocBox = document.querySelector(".toc-box");
      const tocHeader = document.createElement("div");
      tocHeader.className = "toc-header";
      tocHeader.innerHTML = `
        <span>Table of Contents</span>
        <span class="toggle-icon" id="toc-toggle-icon">▲</span>
      `;

      const existingTitle = tocBox.querySelector("h3");
      if (existingTitle) existingTitle.remove();
      tocBox.prepend(tocHeader);

      const toggleIcon = tocHeader.querySelector("#toc-toggle-icon");
      tocHeader.addEventListener("click", () => {
        tocBox.classList.toggle("collapsed");
        toggleIcon.textContent = tocBox.classList.contains("collapsed") ? "▼" : "▲";
      });

      // === Mobile: Move TOC after Introduction section ===
      if (window.innerWidth <= 768) {
        const rightTocSlot = document.querySelector(".right-toc-slot");

        // Try by ID
        let introHeading = contentDiv.querySelector("h2#introduction");

        // Fallback: search for h2 whose textContent includes "introduction"
        if (!introHeading) {
          introHeading = Array.from(contentDiv.querySelectorAll("h2")).find(h =>
            h.textContent.trim().toLowerCase().includes("introduction")
          );
        }

        if (rightTocSlot && introHeading) {
          const wrapper = document.createElement("div");
          wrapper.className = "mobile-toc-wrapper";
          wrapper.appendChild(rightTocSlot);
          introHeading.insertAdjacentElement("afterend", wrapper);
        }
      }

      // === Trigger MathJax rendering after content injection ===
      if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([contentDiv]).catch(err =>
          console.warn("MathJax render failed:", err)
        );
      }
    })
    .catch(err => {
      document.getElementById("post-content").innerHTML = "<p>Post not found.</p>";
      console.error(err);
    });

  // Load metadata for browser tab title
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
