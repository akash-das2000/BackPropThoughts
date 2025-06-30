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

      // === Wait for DOM to update and then trigger MathJax ===
      requestAnimationFrame(() => {
        if (window.MathJax && window.MathJax.typesetPromise) {
          MathJax.typesetPromise([contentDiv]).catch((err) =>
            console.error("MathJax typeset failed:", err)
          );
        }
      });

      // === Reading Time Calculation ===
      const wordsPerMinute = 200;
      const text = contentDiv.innerText || contentDiv.textContent || "";
      const wordCount = text.trim().split(/\s+/).length;
      const minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute));

      const readingTimeDiv = document.createElement("div");
      readingTimeDiv.className = "reading-time-display";
      readingTimeDiv.innerHTML = `
        <i class="fa-solid fa-clock"></i> ${minutes} min
      `;
      readingTimeDiv.title = "Read Time";

      const firstH1 = contentDiv.querySelector("h1");
      if (firstH1) {
        firstH1.insertAdjacentElement("afterend", readingTimeDiv);
      } else {
        contentDiv.prepend(readingTimeDiv);
      }

      // === TOC Generation ===
      const tocList = document.getElementById("toc-list");
      tocList.innerHTML = "";
      const headings = contentDiv.querySelectorAll("h2[id], h3[id]");

      headings.forEach(h => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="#${h.id}">${h.textContent}</a>`;
        if (h.tagName.toLowerCase() === "h3") {
          li.classList.add("subsection");
        }
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

        let introHeading = contentDiv.querySelector("h2#introduction");

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
