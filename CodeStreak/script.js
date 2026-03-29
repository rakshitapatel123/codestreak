// Global Application State Data Keys
const STORAGE_KEY = 'CodeStreak_Data';

// Initial default state
const defaultState = {
    streak: 0,
    totalProblems: 0,
    points: 0,
    lastLogDate: null,
    history: []
};

// Available badges and their requirements
const BADGES_CONFIG = [
    { id: 'beginner', days: 3, title: 'Beginner', icon: '🔰', desc: 'Maintained a 3-day streak' },
    { id: 'consistent', days: 7, title: 'Consistent', icon: '🔥', desc: 'Maintained a 7-day streak' },
    { id: 'master', days: 30, title: 'Master', icon: '🏆', desc: 'Maintained a 30-day streak' }
];

// Mock Leaderboard Data
const mockLeaderboard = [
    { user: 'CodeNinja_99', avatar: '🥷', streak: 125, points: 15400 },
    { user: 'ByteHacker', avatar: '💻', streak: 42, points: 5200 },
    { user: 'DataWizard', avatar: '🧙‍♂️', streak: 28, points: 3100 },
    { user: 'ScriptKiddie', avatar: '👶', streak: 12, points: 1250 },
    { user: 'NullPointer', avatar: '🚫', streak: 5, points: 600 }
];

// Initialize application properly after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupRouting();
    setupThemeToggle();
    setupMobileMenu();
});

// App Initialization
function initApp() {
    const data = loadData();
    updateAppUI(data);

    // Check if streak is broken (missed yesterday)
    checkStreakStatus(data);

    // Set up form submission handler
    const form = document.getElementById('daily-log-form');
    if (form) {
        form.addEventListener('submit', handleLogSubmission);
    }
}

// Data Management
function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    return { ...defaultState };
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    updateAppUI(data);
}

// Logic implementations
function checkStreakStatus(data) {
    if (!data.lastLogDate || data.streak === 0) return;

    const today = new Date().setHours(0, 0, 0, 0);
    const lastLog = new Date(data.lastLogDate).setHours(0, 0, 0, 0);
    const msInDay = 1000 * 60 * 60 * 24;

    const diffDays = Math.round((today - lastLog) / msInDay);

    if (diffDays > 1) {
        // Streak is broken
        data.streak = 0;
        saveData(data);
        showToast("Oh no! You missed a day. Your streak has been reset.", "warning");
    }
}

function handleLogSubmission(e) {
    e.preventDefault();

    const inputField = document.getElementById('problems-solved');
    const problems = parseInt(inputField.value);

    if (isNaN(problems) || problems <= 0) return;

    const data = loadData();
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if already logged today
    if (data.lastLogDate === todayStr) {
        const statusBox = document.getElementById('tracker-status');
        statusBox.className = 'tracker-status warning';
        statusBox.textContent = 'You have already logged your progress today! Great job, see you tomorrow.';
        inputField.value = '';
        return;
    }

    // Update Streak logic
    if (!data.lastLogDate) {
        // First log ever
        data.streak = 1;
    } else {
        // Check if consecutive
        const today = new Date().setHours(0, 0, 0, 0);
        const lastLog = new Date(data.lastLogDate).setHours(0, 0, 0, 0);
        const diffDays = Math.round((today - lastLog) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            data.streak += 1; // Consecutive day
        } else if (diffDays > 1) {
            data.streak = 1; // Broken streak, restart
        } else {
            // Same day edge case, should be caught above but handled safely here
        }
    }

    // Update stats
    data.lastLogDate = todayStr;
    data.totalProblems += problems;
    data.points += (problems * 10);

    // Add to history
    data.history.unshift({
        date: todayStr,
        problems: problems,
        pointsEarned: problems * 10
    });

    // Cap history length (e.g. keep last 50 entries)
    if (data.history.length > 50) data.history.pop();

    // Save state
    saveData(data);

    // UI Updates
    const statusBox = document.getElementById('tracker-status');
    statusBox.className = 'tracker-status success';
    statusBox.innerHTML = `Successfully logged <strong>${problems}</strong> problems! Earned <strong>${problems * 10}</strong> points.`;
    inputField.value = '';

    showToast(`Logged ${problems} problems successfully! +${problems * 10} Points`, 'success');

    // Check for newly unlocked badges visually
    checkForNewBadgeUnlocks(data.streak);
}

// UI Updaters
function updateAppUI(data) {
    // 1. Dashboard Stats
    const streakEl = document.getElementById('dash-streak');
    const probEl = document.getElementById('dash-problems');
    const pointsEl = document.getElementById('dash-points');

    if (streakEl) streakEl.textContent = `${data.streak} Day${data.streak !== 1 ? 's' : ''}`;
    if (probEl) probEl.textContent = data.totalProblems;
    if (pointsEl) pointsEl.textContent = `${data.points} Pts`;

    // 2. Render Badges
    const badgesList = document.getElementById('badges-list');
    if (badgesList) {
        badgesList.innerHTML = '';
        const earnedBadges = BADGES_CONFIG.filter(b => data.streak >= b.days);

        if (earnedBadges.length === 0) {
            badgesList.innerHTML = '<div class="empty-state">No badges earned yet. Start a 3-day streak!</div>';
        } else {
            earnedBadges.forEach(badge => {
                const badgeHtml = `
                    <div class="badge-item">
                        <div class="badge-icon">${badge.icon}</div>
                        <div class="badge-title">${badge.title}</div>
                        <div class="badge-desc">${badge.desc}</div>
                    </div>
                `;
                badgesList.insertAdjacentHTML('beforeend', badgeHtml);
            });
        }
    }

    // 3. Render History
    const historyList = document.getElementById('history-list');
    if (historyList) {
        historyList.innerHTML = '';
        if (data.history.length === 0) {
            historyList.innerHTML = '<div class="empty-state">No recent activity. Check the Tracker page!</div>';
        } else {
            // Show top 10 recent
            data.history.slice(0, 10).forEach(log => {
                const formattedDate = new Date(log.date).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric'
                });
                const histHtml = `
                    <div class="history-item">
                        <span class="history-date">${formattedDate}</span>
                        <span class="history-details">Solved ${log.problems} • +${log.pointsEarned} pts</span>
                    </div>
                `;
                historyList.insertAdjacentHTML('beforeend', histHtml);
            });
        }
    }

    // 4. Render Leaderboard (injecting Current User into Mock Data)
    renderLeaderboard(data);
}

function renderLeaderboard(userData) {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    // Create a competitive copy including our user
    const users = [...mockLeaderboard];

    // Only add logical user if they have points over 0 to keep it clean
    if (userData.points > 0 || userData.streak > 0) {
        users.push({
            user: 'You (Current User)',
            avatar: '😎',
            streak: userData.streak,
            points: userData.points,
            isCurrent: true
        });
    }

    // Sort logic (sort primarily by points descending)
    users.sort((a, b) => b.points - a.points);

    tbody.innerHTML = '';

    users.forEach((u, index) => {
        const rank = index + 1;
        let trClass = u.isCurrent ? 'style="background-color: var(--bg-primary);"' : '';
        let rankClass = rank <= 3 ? `rank-${rank}` : '';

        const html = `
            <tr ${trClass} class="${rankClass}">
                <td><span class="rank-pill">#${rank}</span></td>
                <td>
                    <div class="leaderboard-user">
                        <span class="avatar">${u.avatar}</span>
                        ${u.user}
                    </div>
                </td>
                <td>${u.streak} 🔥</td>
                <td>${u.points} ⭐</td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', html);
    });
}

function checkForNewBadgeUnlocks(currentStreak) {
    const newlyUnlocked = BADGES_CONFIG.filter(b => b.days === currentStreak);
    if (newlyUnlocked.length > 0) {
        newlyUnlocked.forEach(b => {
            showToast(`Badge Unlocked! ${b.icon} ${b.title}`, 'success');
        });
    }
}

// Routing logic (SPA)
function setupRouting() {
    const navButtons = document.querySelectorAll('.nav-btn, .cta-btn');
    const sections = document.querySelectorAll('.page-section');
    const mobileLinks = document.querySelector('.nav-links');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            if (!targetId) return;

            // Hide all sections, remove active class
            sections.forEach(sec => sec.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

            // Show selected section
            const targetSec = document.getElementById(targetId);
            if (targetSec) targetSec.classList.add('active');

            // Set corresponding top nav button as active
            const topNavBtn = document.querySelector(`.nav-btn[data-target="${targetId}"]`);
            if (topNavBtn) topNavBtn.classList.add('active');

            // Close mobile menu if open
            if (mobileLinks) mobileLinks.classList.remove('active');
        });
    });
}

// Theming Operations
function setupThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.documentElement;

    // Check saved format
    const savedTheme = localStorage.getItem('CodeStreak_Theme');
    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme, themeBtn);
    } else {
        // Default is dark mode now
        body.setAttribute('data-theme', 'dark');
        updateThemeIcon('dark', themeBtn);
    }

    themeBtn.addEventListener('click', () => {
        let current = body.getAttribute('data-theme') || 'dark';
        let next = current === 'dark' ? 'light' : 'dark';

        body.setAttribute('data-theme', next);
        localStorage.setItem('CodeStreak_Theme', next);
        updateThemeIcon(next, themeBtn);
    });
}

function updateThemeIcon(theme, btn) {
    btn.textContent = theme === 'light' ? '🌙' : '☀️';
}

// Mobile Navbar logic
function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
}

// Simple Toast Notification system
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✅' : '⚠️';
    toast.innerHTML = `<span>${icon}</span> <div>${message}</div>`;

    container.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300); // Wait for transition
    }, 3000);
}
