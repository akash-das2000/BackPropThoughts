// postLoader.js
const params = new URLSearchParams(window.location.search);
const postId = params.get("postId");

if (!postId) {
  document.getElementById("post-content").innerHTML = "<p>Post not found.</p>";
} else {
  fetch(`posts/${postId}.html`)
    .then((res) => {
      if (!res.ok) throw new Error("Post not found");
      return res.text();
    })
    .then((html) => {
      document.getElementById("post-content").innerHTML = html;
      document.getElementById("post-title").textContent = `Post: ${postId}`;
      document.getElementById("post-title-header").textContent = `Post: ${postId}`;
    })
    .catch((err) => {
      document.getElementById("post-content").innerHTML = "<p>Post not found.</p>";
    });
}
