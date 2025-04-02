const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 8000;

const TEST_SERVER = "http://20.244.56.144/evaluation-service";

let userPostCounts = {};
let topUsersCache = [];
let topPostsCache = { latest: [], popular: [] };
const fetchUsers = async (token) => {
    try {
        const response = await axios.get(`${TEST_SERVER}/users`, {
            headers: {
                Authorization: token,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching users:", error.message);
        return [];
    }
};

const fetchUserPosts = async (userId, token) => {
    try {
        const response = await axios.get(`${TEST_SERVER}/users/${userId}/posts`, {
            headers: {
                Authorization: token,
            },
        });
        return response.data.posts || [];
    } catch (error) {
        console.error(`Error fetching posts for user ${userId}:`, error.message);
        return [];
    }
};

const fetchPostComments = async (postId, token) => {
    try {
        const response = await axios.get(`${TEST_SERVER}/posts/${postId}/comments`, {
            headers: {
                Authorization: token,
            },
        });
        return response.data.comments || [];
    } catch (error) {
        console.error(`Error fetching comments for post ${postId}:`, error.message);
        return [];
    }
};

app.get("/users", async (req, res) => {
    try {
        if(!req.headers.authorization) {
            return res.json({ error: "Authorization header is required" });
        }
        const users = await fetchUsers(req.headers.authorization);

        const userPostPromises = users.map(async (userId) => {
            const posts = await fetchUserPosts(userId, req.headers.authorization);
            userPostCounts[userId] = posts.length;
        });

        await Promise.all(userPostPromises);

        topUsersCache = Object.entries(userPostCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([userId]) => userId);

        res.json({ top_users: topUsersCache });
    } catch (error) {
        res.status(500).json({ error: "Error fetching top users" });
    }
});

app.get("/:userId/posts", async (req, res) => {
    const { userId } = req.params;

    try {
        const posts = await fetchUserPosts(userId, req.headers.authorization);
        res.json({ posts });
    } catch (error) {
        res.status(500).json({ error: "Error fetching user posts" });
    }
});

app.get("/posts", async (req, res) => {
    const { type } = req.query;

    if (!type || (type !== "popular" && type !== "latest")) {
        return res.status(400).json({ error: "Invalid type parameter" });
    }

    try {
        const users = await fetchUsers(req.headers.authorization);
        let allPosts = [];

        for (const userId of users) {
            const posts = await fetchUserPosts(userId, req.headers.authorization);
            allPosts.push(...posts);
        }

        if (type === "popular") {
            let postCommentCounts = {};

            const commentPromises = allPosts.map(async (post) => {
                const comments = await fetchPostComments(post.id, req.headers.authorization);
                postCommentCounts[post.id] = comments.length;
            });

            await Promise.all(commentPromises);

            const maxComments = Math.max(...Object.values(postCommentCounts));
            topPostsCache.popular = allPosts.filter((post) => postCommentCounts[post.id] === maxComments);

            res.json({ popular_posts: topPostsCache.popular });
        } else if (type === "latest") {
            topPostsCache.latest = allPosts.sort((a, b) => b.id - a.id).slice(0, 5);
            res.json({ latest_posts: topPostsCache.latest });
        }
    } catch (error) {
        res.status(500).json({ error: "Error fetching posts" });
    }
});

app.get("/posts/:postId/comments", async (req, res) => {
    const { postId } = req.params;

    try {
        const comments = await fetchPostComments(postId, req.headers.authorization);    
        res.json({ comments });
    } catch (error) {
        res.status(500).json({ error: "Error fetching comments" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});