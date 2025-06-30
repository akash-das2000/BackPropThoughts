const params = new URLSearchParams(window.location.search);
const postId = params.get("postId");

if (!postId) {
  document.getElementById("post-content").innerHTML = "<p>Post not found.</p>";
} else {
  fetch(`posts/${postId}/index.html`)
    .then(res => {
      if (!res.ok) throw new Error("Post not found");
      return res.text();
    })
    .then(html => {
      const contentDiv = document.getElementById("post-content");
      contentDiv.innerHTML = html;

      // === Trigger MathJax ===
      requestAnimationFrame(() => {
        if (window.MathJax?.typesetPromise) {
          MathJax.typesetPromise([contentDiv]).catch(err =>
            console.error("MathJax typeset failed:", err)
          );
        }
      });

      // === Reading Time + Share Icons ===
      const wordsPerMinute = 200;
      const text = contentDiv.innerText || contentDiv.textContent || "";
      const wordCount = text.trim().split(/\s+/).length;
      const minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute));

      const readingTimeDiv = document.createElement("div");
      readingTimeDiv.className = "reading-time-display";

      // Link share
      const linkIcon = document.createElement("i");
      linkIcon.className = "fa-solid fa-link";
      linkIcon.title = "Copy Link";
      linkIcon.addEventListener("click", () => {
        navigator.clipboard.writeText(window.location.href)
          .then(() => alert("Link copied to clipboard"))
          .catch(() => alert("Failed to copy link"));
      });

      // Email share
      const emailIcon = document.createElement("i");
      emailIcon.className = "fa-solid fa-envelope";
      emailIcon.title = "Share via Email";
      emailIcon.addEventListener("click", () => {
        const subject = encodeURIComponent(document.title);
        const body = encodeURIComponent(`Check out this post: ${window.location.href}`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
      });

      // Clock and text
      const clockIcon = document.createElement("i");
      clockIcon.className = "fa-solid fa-clock";
      clockIcon.title = "Estimated reading time";

      const timeText = document.createElement("span");
      timeText.textContent = ` ${minutes} min`;

      readingTimeDiv.appendChild(linkIcon);
      readingTimeDiv.appendChild(emailIcon);
      readingTimeDiv.appendChild(clockIcon);
      readingTimeDiv.appendChild(timeText);

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

      // === Highlight Active TOC Link ===
      const tocLinks = tocList.querySelectorAll("a");
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const id = entry.target.id;
          const link = tocList.querySelector(`a[href="#${id}"]`);
          if (link && entry.isIntersecting) {
            tocLinks.forEach(a => a.classList.remove("active"));
            link.classList.add("active");
          }
        });
      }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 });

      headings.forEach(h => observer.observe(h));

      // === TOC Collapse Toggle ===
      const tocBox = document.querySelector(".toc-box");
      const tocHeader = document.createElement("div");
      tocHeader.className = "toc-header";
      tocHeader.innerHTML = `
        <span>Table of Contents</span>
        <span class="toggle-icon" id="toc-toggle-icon">▲</span>
      `;
      tocBox.prepend(tocHeader);

      const toggleIcon = tocHeader.querySelector("#toc-toggle-icon");
      tocHeader.addEventListener("click", () => {
        tocBox.classList.toggle("collapsed");
        toggleIcon.textContent = tocBox.classList.contains("collapsed") ? "▼" : "▲";
      });

      // === Mobile TOC Positioning After Introduction ===
      try {
        if (window.innerWidth <= 768) {
          const rightTocSlot = document.querySelector(".right-toc-slot");
          const h2s = Array.from(contentDiv.querySelectorAll("h2"));
          const introHeading = h2s.find(h =>
            h.textContent.trim().toLowerCase().includes("introduction")
          );

          if (introHeading && rightTocSlot) {
            let walker = introHeading.nextElementSibling;
            while (walker && walker.tagName.toLowerCase() !== "h2") {
              walker = walker.nextElementSibling;
            }

            const wrapper = document.createElement("div");
            wrapper.className = "mobile-toc-wrapper";
            wrapper.appendChild(rightTocSlot);

            if (walker) {
              walker.insertAdjacentElement("beforebegin", wrapper);
            } else {
              contentDiv.appendChild(wrapper);
            }
          }
        }
      } catch (e) {
        console.warn("Mobile TOC logic failed:", e);
      }

      // === Scroll to Top Button ===
      const scrollBtn = document.createElement("button");
      scrollBtn.id = "scrollToTopBtn";
      scrollBtn.textContent = "▴";
      document.body.appendChild(scrollBtn);

      scrollBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      window.addEventListener("scroll", () => {
        if (window.scrollY > 500) {
          scrollBtn.classList.add("show");
        } else {
          scrollBtn.classList.remove("show");
        }
      });

      // === Smooth Scroll on TOC click (override default anchor jump) ===
      tocList.addEventListener("click", e => {
        const link = e.target.closest("a[href^='#']");
        if (link) {
          e.preventDefault();
          const target = document.querySelector(link.getAttribute("href"));
          if (target) {
            target.scrollIntoView({ behavior: "smooth" });
            history.pushState(null, null, link.getAttribute("href"));
          }
        }
      });
    })
    .catch(err => {
      document.getElementById("post-content").innerHTML = "<p>Post not found.</p>";
      console.error(err);
    });

  // === Load blog metadata ===
  fetch(`posts/${postId}/meta.json`)
    .then(res => {
      if (!res.ok) throw new Error("Meta not found");
      return res.json();
    })
    .then(meta => {
      document.title = meta.title || postId;
    })
    .catch(err => {
      console.warn("Could not load blog metadata:", err);
    });
}
