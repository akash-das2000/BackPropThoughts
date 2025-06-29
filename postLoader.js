// postLoader.js
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
      document.getElementById("post-content").innerHTML = html;
    })
    .catch(err => {
      document.getElementById("post-content").innerHTML = "<p>Post not found.</p>";
      console.error(err);
    });

  // Load blog metadata
  fetch(`posts/${postId}/meta.json`)
    .then(res => {
      if (!res.ok) throw new Error("Meta not found");
      return res.json();
    })
    .then(meta => {
      const title = meta.title || postId;
      document.getElementById("post-title").textContent = title;
      document.getElementById("post-title-header").textContent = title;
      document.title = title;
    })
    .catch(err => {
      console.warn("Could not load blog metadata:", err);
    });
}
