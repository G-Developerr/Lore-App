// client.js - Client-side JavaScript με Persistent Navigation
const socket = io();
let currentUsername = `User${Math.floor(Math.random() * 1000)}`;
let registered = false;

// Navigation Elements
const homePage = document.getElementById("home-page");
const chatPage = document.getElementById("chat-page");
const homeBtn = document.getElementById("home-btn");
const chatBtn = document.getElementById("chat-btn");
const profileNavBtn = document.getElementById("profile-nav-btn");
const startChatBtn = document.getElementById("start-chat-btn");
const loginRegBtn = document.getElementById("login-reg-btn");

// Chat Elements
const messagesContainer = document.getElementById("messages-container");
const usersList = document.getElementById("users-list");
const messageInput = document.getElementById("message-input");
const chatForm = document.getElementById("chat-form");
const clearAllBtn = document.getElementById("clear-all-btn");

// Modal Elements
const profileModal = document.getElementById("profile-modal");
const loginModal = document.getElementById("login-modal");

// Chat State
let currentRoom = "general";
let currentPrivateChat = null;

const roomData = {
    general: {
        name: "General Chat",
        description: "Public room for general discussions",
        messages: document.getElementById("general-messages"),
    },
    gaming: {
        name: "Gaming",
        description: "Discuss your favorite games and find teammates",
        messages: document.getElementById("gaming-messages"),
    },
    work: {
        name: "Work",
        description: "Professional discussions and collaboration",
        messages: document.getElementById("work-messages"),
    },
    music: {
        name: "Music",
        description: "Share and discuss music",
        messages: document.getElementById("music-messages"),
    },
};

// Storage Functions
function saveCurrentPage() {
    const currentPage = document.querySelector(".page.active").id;
    localStorage.setItem("currentPage", currentPage);

    // Αποθήκευση και του current room/private chat
    if (currentPage === "chat-page") {
        if (currentPrivateChat) {
            localStorage.setItem("currentChat", `private-${currentPrivateChat}`);
        } else {
            localStorage.setItem("currentChat", `room-${currentRoom}`);
        }
    }
    console.log(
        "💾 Saved state:",
        localStorage.getItem("currentPage"),
        localStorage.getItem("currentChat")
    );
}

function loadCurrentPage() {
    const savedPage = localStorage.getItem("currentPage");
    const savedChat = localStorage.getItem("currentChat");

    console.log("📂 Loading saved state:", savedPage, savedChat);

    if (savedPage) {
        // Κλείσε όλα τα modals πρώτα
        hideAllModals();

        // Πήγαινε στην αποθηκευμένη σελίδα
        if (savedPage === "home-page") {
            navigateToHome();
        } else if (savedPage === "chat-page") {
            navigateToChat();

            // Restore το chat state μετά από μικρή καθυστέρηση
            setTimeout(() => {
                if (savedChat) {
                    if (savedChat.startsWith("private-")) {
                        const friendUsername = savedChat.replace("private-", "");
                        startPrivateChat(friendUsername);
                        console.log("🔒 Restored private chat with:", friendUsername);
                    } else if (savedChat.startsWith("room-")) {
                        const roomId = savedChat.replace("room-", "");
                        switchRoom(roomId);
                        console.log("💬 Restored room:", roomId);
                    }
                }
            }, 100);
        }
    }
}

// Navigation Functions
function showPage(page) {
    document.querySelectorAll(".page").forEach((p) => {
        p.classList.remove("active");
    });
    page.classList.add("active");
}

function navigateToHome() {
    showPage(homePage);
    saveCurrentPage();
    console.log("🏠 Navigated to Home");
}

function navigateToChat() {
    showPage(chatPage);
    saveCurrentPage();
    console.log("💬 Navigated to Chat");
}

// Modal Functions
function showProfileModal() {
    profileModal.classList.add("active");
}

function showLoginModal() {
    loginModal.classList.add("active");
}

function hideAllModals() {
    profileModal.classList.remove("active");
    loginModal.classList.remove("active");
}

// Switch Room Function
function switchRoom(roomId) {
    currentPrivateChat = null;

    document.querySelectorAll(".room-item").forEach((item) => {
        item.classList.remove("active");
    });
    document.querySelector(`[data-room="${roomId}"]`).classList.add("active");

    const room = roomData[roomId];
    document.querySelector(".chat-info h2").textContent = room.name;
    document.querySelector(".chat-description").textContent = room.description;

    document.querySelectorAll(".private-messages").forEach((messages) => {
        messages.classList.remove("active");
    });

    document.querySelectorAll(".room-messages").forEach((messages) => {
        messages.classList.remove("active");
    });
    room.messages.classList.add("active");

    currentRoom = roomId;
    room.messages.scrollTop = room.messages.scrollHeight;

    const chatHeader = document.querySelector(".chat-header");
    chatHeader.innerHTML = `
        <div class="chat-info">
            <h2>${room.name}</h2>
            <span class="chat-description">${room.description}</span>
        </div>
        <div class="chat-actions">
            <button class="action-btn clear-btn" id="clear-all-btn">🗑️ Clear</button>
        </div>
    `;

    document.getElementById("clear-all-btn").addEventListener("click", clearCurrentRoom);

    saveCurrentPage();
}

// Private Chat Functions
function startPrivateChat(friendUsername) {
    document.querySelectorAll(".room-messages").forEach((messages) => {
        messages.classList.remove("active");
    });

    document.querySelectorAll(".private-messages").forEach((messages) => {
        messages.classList.remove("active");
    });

    const chatHeader = document.querySelector(".chat-header");
    chatHeader.innerHTML = `
        <div class="private-chat-header">
            <button class="back-to-rooms" id="back-to-rooms">←</button>
            <div class="chat-info">
                <h2>${friendUsername}</h2>
                <span class="chat-description">Private conversation</span>
            </div>
        </div>
    `;

    const privateMessages = document.getElementById(`private-${friendUsername.toLowerCase()}`);
    if (privateMessages) {
        privateMessages.classList.add("active");
    }

    document.querySelectorAll(".room-item").forEach((item) => {
        item.classList.remove("active");
    });
    document.querySelectorAll(".friend-item").forEach((item) => {
        item.classList.remove("active");
    });
    document.querySelector(`[data-friend="${friendUsername}"]`).classList.add("active");

    currentPrivateChat = friendUsername;

    document.getElementById("back-to-rooms").addEventListener("click", backToRooms);

    if (privateMessages) {
        privateMessages.scrollTop = privateMessages.scrollHeight;
    }

    const unreadBadge = document.querySelector(`[data-friend="${friendUsername}"] .unread-badge`);
    if (unreadBadge) {
        unreadBadge.remove();
    }

    saveCurrentPage();
}

function backToRooms() {
    document.querySelectorAll(".private-messages").forEach((messages) => {
        messages.classList.remove("active");
    });

    const room = roomData[currentRoom];
    const chatHeader = document.querySelector(".chat-header");
    chatHeader.innerHTML = `
        <div class="chat-info">
            <h2>${room.name}</h2>
            <span class="chat-description">${room.description}</span>
        </div>
        <div class="chat-actions">
            <button class="action-btn clear-btn" id="clear-all-btn">🗑️ Clear</button>
        </div>
    `;

    document.getElementById(`${currentRoom}-messages`).classList.add("active");
    document.querySelector(`[data-room="${currentRoom}"]`).classList.add("active");

    document.querySelectorAll(".friend-item").forEach((item) => {
        item.classList.remove("active");
    });

    currentPrivateChat = null;

    document.getElementById("clear-all-btn").addEventListener("click", clearCurrentRoom);

    saveCurrentPage();
}

// Clear Current Room Messages
function clearCurrentRoom() {
    if (currentPrivateChat) {
        const privateMessages = document.getElementById(`private-${currentPrivateChat.toLowerCase()}`);
        if (privateMessages && confirm(`Clear all messages with ${currentPrivateChat}?`)) {
            const messages = privateMessages.querySelectorAll(".message");
            messages.forEach((msg) => msg.remove());
        }
    } else {
        const room = roomData[currentRoom];
        if (confirm(`Clear all messages in ${room.name}?`)) {
            const messages = room.messages.querySelectorAll(".message");
            if (messages.length > 0) {
                const firstMessage = messages[0];
                if (firstMessage.querySelector(".message-sender").textContent === "Lore Bot") {
                    for (let i = messages.length - 1; i > 0; i--) {
                        messages[i].remove();
                    }
                } else {
                    messages.forEach((msg) => msg.remove());
                }
            }
        }
    }
}

// Send Message to Current Room or Private Chat
function sendMessage() {
    const messageText = document.getElementById("message-input").value.trim();
    if (messageText) {
        if (currentPrivateChat) {
            const privateMessages = document.getElementById(
                `private-${currentPrivateChat.toLowerCase()}`
            );
            const messageElement = document.createElement("div");
            messageElement.className = "message own";
            messageElement.innerHTML = `
                <div class="message-header">
                    <span class="message-sender">You</span>
                    <span class="message-time">${getCurrentTime()}</span>
                </div>
                <div class="message-text">${messageText}</div>
            `;

            privateMessages.appendChild(messageElement);
            document.getElementById("message-input").value = "";
            document.getElementById("message-input").style.height = "auto";
            privateMessages.scrollTop = privateMessages.scrollHeight;
        } else {
            const room = roomData[currentRoom];
            const messageElement = document.createElement("div");
            messageElement.className = "message own";
            messageElement.innerHTML = `
                <div class="message-header">
                    <span class="message-sender">You</span>
                    <span class="message-time">${getCurrentTime()}</span>
                </div>
                <div class="message-text">${messageText}</div>
            `;

            room.messages.appendChild(messageElement);
            document.getElementById("message-input").value = "";
            document.getElementById("message-input").style.height = "auto";
            room.messages.scrollTop = room.messages.scrollHeight;

            const roomBadge = document.querySelector(`[data-room="${currentRoom}"] .room-badge`);
            const currentCount = parseInt(roomBadge.textContent);
            roomBadge.textContent = currentCount + 1;
        }
    }
}

// Get current time
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

// Initialize UI
function initUI() {
    const profileUsername = document.getElementById("profile-username");
    const profileStatus = document.getElementById("profile-status");

    if (profileUsername) profileUsername.value = currentUsername;
    if (profileStatus) profileStatus.value = "Online";
}

// Register user
function registerUser() {
    if (!registered) {
        socket.emit("new user", currentUsername);
        registered = true;
        console.log("✅ Registered:", currentUsername);
    }
}

// Initialize all event listeners
function initializeEventListeners() {
    console.log("🔧 Initializing event listeners...");

    // Navigation
    if (homeBtn) homeBtn.addEventListener("click", navigateToHome);
    if (chatBtn) chatBtn.addEventListener("click", navigateToChat);
    if (startChatBtn) startChatBtn.addEventListener("click", navigateToChat);

    // Modal buttons
    if (profileNavBtn) profileNavBtn.addEventListener("click", showProfileModal);
    if (loginRegBtn) loginRegBtn.addEventListener("click", showLoginModal);

    // Close Modal Buttons
    const closeProfileModal = document.getElementById("close-profile-modal");
    const closeLoginModal = document.getElementById("close-login-modal");
    const cancelProfile = document.getElementById("cancel-profile");
    const loginCancel = document.getElementById("login-cancel");
    const signupCancel = document.getElementById("signup-cancel");

    if (closeProfileModal) closeProfileModal.addEventListener("click", hideAllModals);
    if (closeLoginModal) closeLoginModal.addEventListener("click", hideAllModals);
    if (cancelProfile) cancelProfile.addEventListener("click", hideAllModals);
    if (loginCancel) loginCancel.addEventListener("click", hideAllModals);
    if (signupCancel) signupCancel.addEventListener("click", hideAllModals);

    // Close modals when clicking outside
    if (profileModal) {
        profileModal.addEventListener("click", function(e) {
            if (e.target === profileModal) hideAllModals();
        });
    }
    if (loginModal) {
        loginModal.addEventListener("click", function(e) {
            if (e.target === loginModal) hideAllModals();
        });
    }

    // Login/Register Tab Switching
    document.querySelectorAll(".tab").forEach((tab) => {
        tab.addEventListener("click", function() {
            const tabName = this.getAttribute("data-tab");

            document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
            this.classList.add("active");

            document.querySelectorAll(".form-container").forEach((form) => {
                form.classList.remove("active");
            });
            document.getElementById(`${tabName}-form`).classList.add("active");
        });
    });

    // Switch between login/signup
    const switchToSignup = document.getElementById("switch-to-signup");
    const switchToLogin = document.getElementById("switch-to-login");

    if (switchToSignup) {
        switchToSignup.addEventListener("click", function() {
            document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
            document.querySelector('[data-tab="signup"]').classList.add("active");
            document.querySelectorAll(".form-container").forEach((form) => {
                form.classList.remove("active");
            });
            document.getElementById("signup-form").classList.add("active");
        });
    }

    if (switchToLogin) {
        switchToLogin.addEventListener("click", function() {
            document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
            document.querySelector('[data-tab="login"]').classList.add("active");
            document.querySelectorAll(".form-container").forEach((form) => {
                form.classList.remove("active");
            });
            document.getElementById("login-form").classList.add("active");
        });
    }

    // Form Submissions
    const saveProfile = document.getElementById("save-profile");
    if (saveProfile) {
        saveProfile.addEventListener("click", function() {
            const username = document.getElementById("profile-username").value;
            const status = document.getElementById("profile-status").value;

            document.querySelector(".profile-name").textContent = username;
            document.querySelector(".profile-status").textContent = status;

            hideAllModals();
            alert("Profile updated successfully! 🎉");
        });
    }

    const loginSubmit = document.getElementById("login-submit");
    if (loginSubmit) {
        loginSubmit.addEventListener("click", function(e) {
            e.preventDefault();
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            if (email && password) {
                hideAllModals();
                alert("Login successful! Welcome back! 🎉");
            } else {
                alert("Please fill in all fields!");
            }
        });
    }

    const signupSubmit = document.getElementById("signup-submit");
    if (signupSubmit) {
        signupSubmit.addEventListener("click", function(e) {
            e.preventDefault();
            const email = document.getElementById("signup-email").value;
            const username = document.getElementById("signup-username").value;
            const password = document.getElementById("signup-password").value;
            const confirm = document.getElementById("signup-confirm").value;

            if (email && username && password && confirm) {
                if (password === confirm) {
                    hideAllModals();
                    alert("Account created successfully! Welcome to Lore! 🎉");
                } else {
                    alert("Passwords do not match!");
                }
            } else {
                alert("Please fill in all fields!");
            }
        });
    }

    // Room selection
    document.querySelectorAll(".room-item").forEach((item) => {
        item.addEventListener("click", function() {
            const roomId = this.getAttribute("data-room");
            switchRoom(roomId);
        });
    });

    // Private chat functionality
    document.querySelectorAll(".friend-item").forEach((item) => {
        item.addEventListener("click", function() {
            const friendUsername = this.getAttribute("data-friend");
            startPrivateChat(friendUsername);
        });
    });

    // Chat functionality
    if (chatForm && messageInput) {
        messageInput.addEventListener("input", function() {
            this.style.height = "auto";
            this.style.height = this.scrollHeight + "px";
        });

        chatForm.addEventListener("submit", function(e) {
            e.preventDefault();
            sendMessage();
        });

        messageInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Clear current room
    if (clearAllBtn) {
        clearAllBtn.addEventListener("click", clearCurrentRoom);
    }

    // Emoji buttons
    document.querySelectorAll(".input-action-btn").forEach((btn) => {
        btn.addEventListener("click", function() {
            const emojis = ["😊", "😂", "❤️", "🔥", "👍", "🎮", "💼", "🎵", "🍀"];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            if (messageInput) {
                messageInput.value += randomEmoji;
                messageInput.focus();
            }
        });
    });
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
    console.log("🚀 DOM loaded - Initializing app...");

    // Initialize UI
    initUI();

    // Initialize event listeners
    initializeEventListeners();

    // Φόρτωσε την αποθηκευμένη σελίδα
    loadCurrentPage();

    // Αν δεν υπάρχει αποθηκευμένη σελίδα, πήγαινε στο home
    if (!localStorage.getItem("currentPage")) {
        navigateToHome();
    }

    console.log("🎯 Lore Chat App with Persistent Navigation initialized successfully!");
});

// Αποθήκευση πριν το refresh/close
window.addEventListener("beforeunload", function() {
    saveCurrentPage();
});

// Αποθήκευση όταν αλλάζει tab/εφαρμογή
document.addEventListener("visibilitychange", function() {
    if (document.hidden) {
        saveCurrentPage();
    }
});

// Socket events
socket.on("connect", () => {
    console.log("🔗 Connected to server");
    registerUser();
});

socket.on("disconnect", () => {
    console.log("🔌 Disconnected from server");
    registered = false;
});

console.log("📝 Lore Chat App script loaded - waiting for DOM...");