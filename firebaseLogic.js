// firebaseLogic.js
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

// Replace with your Firebase config
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

const params = new URLSearchParams(window.location.search);
const postId = params.get("postId");

// === Clap Functionality ===
const clapButton = document.getElementById("clap-button");
const clapCountSpan = document.getElementById("clap-count");
const clapDocRef = doc(db, "likes", postId);

getDoc(clapDocRef).then((docSnap) => {
  if (docSnap.exists()) {
    clapCountSpan.textContent = docSnap.data().claps || 0;
  } else {
    setDoc(clapDocRef, { claps: 0 });
    clapCountSpan.textContent = 0;
  }
});

clapButton.addEventListener("click", () => {
  const hasClapped = localStorage.getItem(`clapped_${postId}`);
  if (hasClapped) return; // Prevent duplicate claps

  updateDoc(clapDocRef, { claps: increment(1) });
  localStorage.setItem(`clapped_${postId}`, "true");

  // UI update
  clapButton.classList.add("clicked");
  clapCountSpan.textContent = parseInt(clapCountSpan.textContent) + 1;
});

// === Toggle Comments Section ===
const toggleCommentsButton = document.getElementById("toggle-comments");
const commentsSection = document.getElementById("comments-section");

toggleCommentsButton.addEventListener("click", () => {
  const isOpen = commentsSection.style.display !== "none";
  commentsSection.style.display = isOpen ? "none" : "block";
  toggleCommentsButton.classList.toggle("clicked", !isOpen);
});

// === Submit New Comment ===
const commentForm = document.getElementById("comment-form");
commentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const comment = document.getElementById("comment").value.trim();

  if (name && comment) {
    await addDoc(collection(db, "comments"), {
      name,
      comment,
      postId,
      timestamp: serverTimestamp(),
    });
    commentForm.reset();
  }
});

// === Load Comments in Real Time ===
const commentsList = document.getElementById("comments-list");
const q = query(
  collection(db, "comments"),
  where("postId", "==", postId),
  orderBy("timestamp", "desc")
);

onSnapshot(q, (snapshot) => {
  commentsList.innerHTML = "";
  if (snapshot.empty) {
    commentsList.innerHTML = "<p>No comments yet. Be the first!</p>";
  }
  snapshot.forEach((doc) => {
    const data = doc.data();
    let time = "Just now";
    try {
      if (data.timestamp && data.timestamp.toDate) {
        time = data.timestamp.toDate().toLocaleString();
      }
    } catch (e) {
      console.warn("Invalid timestamp:", e);
    }

    const div = document.createElement("div");
    div.classList.add("comment");
    div.innerHTML = `<strong>${data.name}</strong> <em>${time}</em><p>${data.comment}</p><hr>`;
    commentsList.appendChild(div);
  });
});
