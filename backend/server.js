
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const User = require("./models/User");
const Post = require("./models/Post");

const app = express();

app.use(cors());
app.use(express.json());

// Display uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const SECRET_KEY = "blog_secret_key";

// Connect MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/blogapp")
    .then(() => console.log("MongoDB Connected Successfully!"))
    .catch((err) => console.log("MongoDB Error:", err.message));

// Home route
app.get("/", (req, res) => {
    res.send("Blog Application Backend is Running!");
});

// Register
app.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword
        });

        await user.save();

        res.status(201).json({
            message: "Registration successful!"
        });

    } catch (error) {
        console.log("Registration Error:", error.message);
        res.status(500).json({ message: "Registration failed" });
    }
});

// Login
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            { id: user._id },
            SECRET_KEY,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful!",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.log("Login Error:", error.message);
        res.status(500).json({ message: "Login failed" });
    }
});

// Authentication middleware
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Please login first"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.userId = decoded.id;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

// Image Upload Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "uploads"));
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    }
});

// Upload Image Route
app.post("/upload", verifyToken, (req, res) => {
    upload.single("image")(req, res, (error) => {
        if (error) {
            return res.status(400).json({
                message: error.message || "Image upload failed"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message: "Please select an image"
            });
        }

        res.json({
            message: "Image uploaded successfully!",
            imageUrl: `http://localhost:5000/uploads/${req.file.filename}`
        });
    });
});

// Create Blog Post
app.post("/posts", verifyToken, async (req, res) => {
    try {
        const { title, content, image } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                message: "Title and content are required"
            });
        }

        const post = new Post({
            title,
            content,
            image: image || "",
            author: req.userId
        });

        await post.save();

        res.status(201).json({
            message: "Blog post created successfully!",
            post
        });

    } catch (error) {
        console.log("Create Post Error:", error.message);
        res.status(500).json({
            message: "Failed to create blog post"
        });
    }
});

// View All Blog Posts
app.get("/posts", async (req, res) => {
    try {
        const posts = await Post.find()
            .populate("author", "name email")
            .sort({ createdAt: -1 });

        res.json(posts);

    } catch (error) {
        console.log("View Posts Error:", error.message);
        res.status(500).json({
            message: "Failed to fetch posts"
        });
    }
});

// Edit Blog Post
app.put("/posts/:id", verifyToken, async (req, res) => {
    try {
        const { title, content, image } = req.body;

        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                message: "Blog post not found"
            });
        }

        if (post.author.toString() !== req.userId) {
            return res.status(403).json({
                message: "You can edit only your own posts"
            });
        }

        if (title !== undefined) post.title = title;
        if (content !== undefined) post.content = content;
        if (image !== undefined) post.image = image;

        await post.save();

        res.json({
            message: "Blog post updated successfully!",
            post
        });

    } catch (error) {
        console.log("Edit Post Error:", error.message);
        res.status(500).json({
            message: "Failed to update blog post"
        });
    }
});

// Delete Blog Post
app.delete("/posts/:id", verifyToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                message: "Blog post not found"
            });
        }

        if (post.author.toString() !== req.userId) {
            return res.status(403).json({
                message: "You can delete only your own posts"
            });
        }

        await post.deleteOne();

        res.json({
            message: "Blog post deleted successfully!"
        });

    } catch (error) {
        console.log("Delete Post Error:", error.message);
        res.status(500).json({
            message: "Failed to delete blog post"
        });
    }
});

// Start Server
app.listen(5000, () => {
    console.log("Server running on port 5000");
});
