
import { useState, useEffect } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "./App.css";

function App() {
  const [page, setPage] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [editId, setEditId] = useState(null);

  // Register and Login
  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("Please wait...");

    try {
      const response = await fetch(`http://localhost:5000/${page}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      setMessage(data.message);

      if (response.ok && page === "login") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      }

      if (response.ok && page === "register") {
        setPage("login");
        setName("");
        setPassword("");
      }
    } catch (error) {
      setMessage("Server connection failed. Please try again.");
    }
  }

  // Load all posts
  async function loadPosts() {
    try {
      const response = await fetch("http://localhost:5000/posts");
      const data = await response.json();

      if (response.ok) {
        setPosts(data);
      } else {
        setMessage(data.message || "Failed to load posts");
      }
    } catch (error) {
      setMessage("Unable to load blog posts");
    }
  }

  useEffect(() => {
    if (token) {
      loadPosts();
    }
  }, [token]);

  // Create or update post with image upload
  async function handlePostSubmit(e) {
    e.preventDefault();

    // Check whether content is empty
    if (!content || content.replace(/<[^>]*>/g, "").trim() === "") {
      setMessage("Please write blog content");
      return;
    }

    setMessage("Please wait...");

    try {
      let imageUrl = image;

      // Upload selected image
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);

        const uploadResponse = await fetch("http://localhost:5000/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          setMessage(uploadData.message || "Image upload failed");
          return;
        }

        imageUrl = uploadData.imageUrl;
      }

      // Create or update blog post
      const url = editId
        ? `http://localhost:5000/posts/${editId}`
        : "http://localhost:5000/posts";

      const response = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
          image: imageUrl,
        }),
      });

      const data = await response.json();
      setMessage(data.message);

      if (response.ok) {
        setTitle("");
        setContent("");
        setImage("");
        setImageFile(null);
        setEditId(null);

        const fileInput = document.getElementById("imageUpload");
        if (fileInput) {
          fileInput.value = "";
        }

        loadPosts();
      }
    } catch (error) {
      setMessage("Unable to save blog post");
    }
  }

  // Edit post
  function editPost(post) {
    setEditId(post._id);
    setTitle(post.title);
    setContent(post.content);
    setImage(post.image || "");
    setImageFile(null);
    window.scrollTo(0, 0);
  }

  // Delete post
  async function deletePost(id) {
    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/posts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setMessage(data.message);

      if (response.ok) {
        loadPosts();
      }
    } catch (error) {
      setMessage("Unable to delete blog post");
    }
  }

  // Logout
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setPosts([]);
    setPage("login");
    setMessage("Logged out successfully!");
  }

  // Login and Register screen
  if (!token || !user) {
    return (
      <div className="auth-container">
        <h1>MyBlog ✨</h1>
        <h2>{page === "login" ? "Welcome Back!" : "Create Account"}</h2>
        <p>Share your thoughts, ideas and stories.</p>

        <form onSubmit={handleSubmit}>
          {page === "register" && (
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">
            {page === "login" ? "Login" : "Register"}
          </button>
        </form>

        <p>{message}</p>

        <p>
          {page === "login"
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            type="button"
            className="switch-button"
            onClick={() => {
              setPage(page === "login" ? "register" : "login");
              setMessage("");
            }}
          >
            {page === "login" ? "Register" : "Login"}
          </button>
        </p>
      </div>
    );
  }

  // Blog Dashboard
  return (
    <div className="blog-container">
      <header>
        <h1>MyBlog ✨</h1>
        <p>Welcome, {user.name}!</p>
        <button onClick={logout}>Logout</button>
      </header>

      <h2>{editId ? "Edit Blog Post" : "Create a New Blog"}</h2>

      <form className="post-form" onSubmit={handlePostSubmit}>
        <input
          type="text"
          placeholder="Blog Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <label>Blog Content:</label>

        <ReactQuill
          theme="snow"
          value={content}
          onChange={setContent}
          placeholder="Write your blog content here..."
        />

        <label htmlFor="imageUpload">Choose Blog Image:</label>

        <input
          id="imageUpload"
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0] || null)}
        />

        {image && (
          <div>
            <p>Current image:</p>
            <img
              src={image}
              alt="Current blog"
              className="post-image"
            />
          </div>
        )}

        {imageFile && (
          <p>Selected image: {imageFile.name}</p>
        )}

        <button type="submit">
          {editId ? "Update Post" : "Publish Post"}
        </button>

        {editId && (
          <button
            type="button"
            onClick={() => {
              setEditId(null);
              setTitle("");
              setContent("");
              setImage("");
              setImageFile(null);

              const fileInput = document.getElementById("imageUpload");
              if (fileInput) {
                fileInput.value = "";
              }
            }}
          >
            Cancel Edit
          </button>
        )}
      </form>

      <p>{message}</p>

      <h2>Latest Blog Posts</h2>

      {posts.length === 0 && (
        <p>No blog posts yet. Create your first post!</p>
      )}

      <div className="posts-list">
        {posts.map((post) => (
          <article className="post-card" key={post._id}>
            <h3>{post.title}</h3>

            {post.image && (
              <img
                src={post.image}
                alt={post.title}
                className="post-image"
              />
            )}

            <div
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            <small>
              By {post.author?.name || "Unknown Author"}
            </small>

            {post.author?._id === user.id && (
              <div>
                <button onClick={() => editPost(post)}>Edit</button>
                <button onClick={() => deletePost(post._id)}>Delete</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

export default App;
