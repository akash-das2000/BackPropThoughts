// ===== Firebase app init =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA3AkLphGPQy35cLP1rEt0g3hp4SQpt4XE",
  authDomain: "backpropthoughtscomments.firebaseapp.com",
  projectId: "backpropthoughtscomments",
  storageBucket: "backpropthoughtscomments.appspot.com",
  messagingSenderId: "903589800417",
  appId: "1:903589800417:web:d605b4eadde34a4dd78aa0",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ===== Resolve current postId from URL =====
const params = new URLSearchParams(window.location.search);
const postId = params.get("postId");

// -------------------------------------------------------------------------------------------------
// CLAPS (unchanged behavior)
// -------------------------------------------------------------------------------------------------
const clapButton = document.getElementById("clap-button");
const clapCountSpan = document.getElementById("clap-count");

if (clapButton && clapCountSpan && postId) {
  const clapDocRef = doc(db, "likes", postId);

  getDoc(clapDocRef).then((docSnap) => {
    if (docSnap.exists()) {
      clapCountSpan.textContent = docSnap.data().claps || 0;
    } else {
      setDoc(clapDocRef, { claps: 0 });
      clapCountSpan.textContent = 0;
    }

    const hasClapped = localStorage.getItem(`clapped_${postId}`);
    if (hasClapped) {
      clapButton.classList.add("active");
    }
  });

  clapButton.addEventListener("click", () => {
    const hasClapped = localStorage.getItem(`clapped_${postId}`);
    if (hasClapped) return;

    updateDoc(clapDocRef, { claps: increment(1) });
    localStorage.setItem(`clapped_${postId}`, "true");
    clapCountSpan.textContent = String(parseInt(clapCountSpan.textContent, 10) + 1);
    clapButton.classList.add("active");
  });
}

// -------------------------------------------------------------------------------------------------
// COMMENTS with Firebase Auth (Google / GitHub / Email link)
// -------------------------------------------------------------------------------------------------

// Elements
const userPhoto = document.getElementById("user-photo");
const userNameEl = document.getElementById("user-name");
const btnGoogle  = document.getElementById("btn-google");
const btnGithub  = document.getElementById("btn-github");
const btnEmail   = document.getElementById("btn-emaillink");
const btnSignout = document.getElementById("btn-signout");

const commentForm       = document.getElementById("comment-form");
const commentInput      = document.getElementById("comment");
const commentSubmitBtn  = document.getElementById("comment-submit");
const commentsList      = document.getElementById("comments-list");

// Providers
const google = new GoogleAuthProvider();
const github = new GithubAuthProvider();

// Sign-in button handlers
btnGoogle?.addEventListener("click", () => signInWithPopup(auth, google).catch(console.error));
btnGithub?.addEventListener("click", () => signInWithPopup(auth, github).catch(console.error));

btnEmail?.addEventListener("click", async () => {
  const email = prompt("Enter your email to receive a sign-in link:");
  if (!email) return;
  try {
    await sendSignInLinkToEmail(auth, email, {
      url: window.location.href, // return to same page
      handleCodeInApp: true,
    });
    localStorage.setItem("emailForSignIn", email);
    alert("Sign-in link sent. Check your inbox.");
  } catch (e) {
    console.error(e);
    alert("Could not send link.");
  }
});

// Complete email-link sign-in if returning via link
if (isSignInWithEmailLink(auth, window.location.href)) {
  let email = localStorage.getItem("emailForSignIn");
  if (!email) email = prompt("Confirm your email to finish sign-in:");
  if (email) {
    signInWithEmailLink(auth, email, window.location.href)
      .then(() => localStorage.removeItem("emailForSignIn"))
      .catch(console.error);
  }
}

btnSignout?.addEventListener("click", () => signOut(auth));

// Update UI on auth state change
onAuthStateChanged(auth, (user) => {
  const show = (el) => { if (el) el.style.display = "inline-flex"; };
  const hide = (el) => { if (el) el.style.display = "none"; };

  if (user) {
    userNameEl.textContent = `Commenting as ${user.displayName || "Anonymous"}`;
    if (user.photoURL) { userPhoto.src = user.photoURL; userPhoto.style.display = "inline-block"; }
    else { userPhoto.removeAttribute("src"); userPhoto.style.display = "none"; }

    // Hide providers, show sign out
    hide(btnGoogle); hide(btnGithub); hide(btnEmail);
    show(btnSignout);
  } else {
    userNameEl.textContent = "Not signed in";
    userPhoto.removeAttribute("src"); userPhoto.style.display = "none";

    // Show providers, hide sign out
    show(btnGoogle); show(btnGithub); show(btnEmail);
    hide(btnSignout);
  }
});

// --- Comments toggle (uses your existing toggle button + section) ---
const toggleCommentsButton = document.getElementById("toggle-comments");
const commentsSection = document.getElementById("comments-section");

toggleCommentsButton?.addEventListener("click", () => {
  const isHidden = commentsSection.style.display === "none" || !commentsSection.style.display;
  commentsSection.style.display = isHidden ? "block" : "none";
});

// Submit a comment (requires sign-in) — disable/enable submit to prevent rapid double-posts
commentForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) { alert("Please sign in to comment."); return; }

  const text = (commentInput.value || "").trim();
  if (!text) return;

  if (!postId) { alert("Could not resolve post id."); return; }

  commentSubmitBtn?.setAttribute("disabled", "true");

  try {
    await addDoc(collection(db, "comments"), {
      postId,
      text,
      author: {
        uid: user.uid,
        name: user.displayName || "Anonymous",
        photoURL: user.photoURL || null,
        provider: user.providerData?.[0]?.providerId || null,
      },
      createdAt: serverTimestamp(),
    });
    commentInput.value = "";
  } catch (err) {
    console.error("Failed to post comment:", err);
    alert("Failed to post comment.");
  } finally {
    commentSubmitBtn?.removeAttribute("disabled");
  }
});

// Live list (query by createdAt desc)
if (commentsList && postId) {
  const q = query(
    collection(db, "comments"),
    where("postId", "==", postId),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snapshot) => {
    commentsList.innerHTML = "";
    if (snapshot.empty) {
      const empty = document.createElement("li");
      empty.className = "comment-item";
      empty.textContent = "No comments yet. Be the first!";
      commentsList.appendChild(empty);
      return;
    }
    snapshot.forEach((d) => {
      const data = d.data();
      commentsList.appendChild(renderCommentItem(data));
    });
  });
}

// Render a single comment (XSS-safe)
function renderCommentItem(data) {
  const li = document.createElement("li");
  li.className = "comment-item";

  const head = document.createElement("div");
  head.className = "comment-head";

  if (data.author?.photoURL) {
    const av = document.createElement("img");
    av.className = "cmt-avatar";
    av.alt = "";
    av.src = data.author.photoURL;
    head.appendChild(av);
  }

  const nm = document.createElement("span");
  nm.className = "comment-name";
  nm.textContent = data.author?.name ?? "Anonymous";

  const tsSpan = document.createElement("span");
  tsSpan.className = "comment-time";
  try {
    const dt = data.createdAt?.toDate?.();
    if (dt) tsSpan.textContent = " • " + dt.toLocaleString();
  } catch (_) {}

  head.appendChild(nm);
  head.appendChild(tsSpan);

  const body = document.createElement("p");
  body.textContent = data.text ?? ""; // never innerHTML for user text

  li.appendChild(head);
  li.appendChild(body);
  return li;
}
