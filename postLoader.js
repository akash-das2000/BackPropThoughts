// postLoader.js
const params = new URLSearchParams(window.location.search);
const postId = params.get("postId");

const postContainer = document.getElementById("post-content");

if (!postId || !postContainer) {
  if (postContainer) {
    postContainer.innerHTML = "<p>Post not found.</p>";
  }
} else {
  // Load blog content from posts/{postId}/index.html
  fetch(`posts/${postId}/index.html`)
    .then(res => {
      if (!res.ok) throw new Error("Post not found");
      return res.text();
    })
    .then(html => {
      postContainer.innerHTML = html;
    })
    .catch(err => {
      postContainer.innerHTML = "<p>Post not found.</p>";
      console.error(err);
    });

  // Load blog metadata from posts/{postId}/meta.json
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
