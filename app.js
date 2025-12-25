// ============================================
// Quản Lý Nề Nếp Học Sinh Lớp 12A5
// ============================================

// Create particles animation
function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 25; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (10 + Math.random() * 10) + 's';
        container.appendChild(particle);
    }
}
createParticles();

// ============================================
// Firebase Configuration
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyCC8PahtPoiJvg3v-J10JsIVpfaLdI1O-w",
    authDomain: "quanlihocsinh12a5.firebaseapp.com",
    databaseURL: "https://quanlihocsinh12a5-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "quanlihocsinh12a5",
    storageBucket: "quanlihocsinh12a5.firebasestorage.app",
    messagingSenderId: "948083760446",
    appId: "1:948083760446:web:3dda6451bfdf39b847e06f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Firebase data loading state
let firebaseDataLoaded = false;
let cachedData = {
    accounts: null,
    groups: null,
    violationCategories: null,
    rewardCategories: null,
    students: {},
    records: {}
};

// Initialize Firebase data and listeners
function initFirebaseData() {
    return new Promise((resolve) => {
        let loadedCount = 0;
        const totalToLoad = 4; // accounts, groups, violationCategories, rewardCategories
        
        function checkLoaded() {
            loadedCount++;
            if (loadedCount >= totalToLoad) {
                firebaseDataLoaded = true;
                resolve();
            }
        }
        
        // Listen to accounts
        database.ref('accounts').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                cachedData.accounts = data;
            } else {
                // Initialize with default admin
                const defaultAccounts = [{ id: 'admin', username: 'admin', password: 'admin', role: 'teacher', name: 'GVCN', groupId: null }];
                database.ref('accounts').set(defaultAccounts);
                cachedData.accounts = defaultAccounts;
            }
            if (!firebaseDataLoaded) checkLoaded();
            else if (typeof renderAccountsList === 'function') renderAccountsList();
        });
        
        // Listen to groups
        database.ref('groups').on('value', (snapshot) => {
            cachedData.groups = snapshot.val() || [];
            if (!firebaseDataLoaded) checkLoaded();
            else if (typeof renderGroupsList === 'function') {
                renderGroupsList();
                renderAccountGroupDropdown();
                renderStudentGroupDropdowns();
            }
        });
        
        // Listen to violation categories
        database.ref('violationCategories').on('value', (snapshot) => {
            cachedData.violationCategories = snapshot.val() || null;
            if (!firebaseDataLoaded) checkLoaded();
            else if (typeof renderViolationCatList === 'function') {
                renderViolationCatList();
                updateCategoryDropdown(document.querySelector('input[name="recordType"]:checked')?.value || 'violation');
            }
        });
        
        // Listen to reward categories
        database.ref('rewardCategories').on('value', (snapshot) => {
            cachedData.rewardCategories = snapshot.val() || null;
            if (!firebaseDataLoaded) checkLoaded();
            else if (typeof renderRewardCatList === 'function') {
                renderRewardCatList();
            }
        });
    });
}

// Setup year-specific data listeners
function setupYearDataListeners(year) {
    // Listen to students for this year
    database.ref(`years/${year}/students`).on('value', (snapshot) => {
        cachedData.students[year] = snapshot.val() || [];
        if (firebaseDataLoaded && typeof renderStudentsTable === 'function') {
            renderStudentsTable();
            renderStudentsDropdown();
            updateStats();
        }
    });
    
    // Listen to records for this year
    database.ref(`years/${year}/records`).on('value', (snapshot) => {
        cachedData.records[year] = snapshot.val() || [];
        if (firebaseDataLoaded && typeof renderTodayRecords === 'function') {
            renderTodayRecords();
            renderHistory();
            updateStats();
            renderStatsTab();
        }
    });
}

// ============================================
// Authentication & Session Management
// ============================================

// Current user session
let currentUser = null;

// Get accounts (from Firebase cache)
function getAccounts() {
    if (cachedData.accounts) {
        return cachedData.accounts;
    }
    // Return default if not loaded yet
    return [{ id: 'admin', username: 'admin', password: 'admin', role: 'teacher', name: 'GVCN', groupId: null }];
}

function saveAccounts(accounts) {
    cachedData.accounts = accounts;
    database.ref('accounts').set(accounts);
}

// Get groups (from Firebase cache)
function getGroups() {
    return cachedData.groups || [];
}

function saveGroups(groups) {
    cachedData.groups = groups;
    database.ref('groups').set(groups);
}

// Login function
function login(username, password) {
    const accounts = getAccounts();
    const account = accounts.find(a => a.username === username && a.password === password);
    if (account) {
        currentUser = account;
        sessionStorage.setItem('currentUser', JSON.stringify(account));
        return true;
    }
    return false;
}

// Logout function
function logout() {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    showLoginOverlay();
}

// Check session on load
function checkSession() {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        hideLoginOverlay();
        return true;
    }
    return false;
}

// Check if current user is teacher (admin)
function isTeacher() {
    return currentUser && currentUser.role === 'teacher';
}

// Get current user's group (for group leaders)
function getCurrentUserGroup() {
    return currentUser ? currentUser.groupId : null;
}

// UI: Show/hide login overlay with AnimeJS
function showLoginOverlay() {
    const overlay = document.getElementById('loginOverlay');
    const card = overlay.querySelector('.login-card');
    overlay.classList.remove('hidden');
    document.getElementById('userInfo').style.display = 'none';
    
    // Animate with AnimeJS
    anime({
        targets: card,
        scale: [0.8, 1],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutBack'
    });
}

function hideLoginOverlay() {
    const overlay = document.getElementById('loginOverlay');
    const card = overlay.querySelector('.login-card');
    
    // Animate out with AnimeJS
    anime({
        targets: card,
        scale: [1, 0.8],
        opacity: [1, 0],
        duration: 300,
        easing: 'easeInBack',
        complete: () => {
            overlay.classList.add('hidden');
            document.getElementById('userInfo').style.display = 'flex';
            updateUserDisplay();
            updateAdminTabVisibility();
            
            // Animate stats cards entrance
            anime({
                targets: '.stat-card',
                translateY: [30, 0],
                opacity: [0, 1],
                delay: anime.stagger(100),
                duration: 500,
                easing: 'easeOutQuad'
            });
        }
    });
}

// Update user display in header
function updateUserDisplay() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        const roleEl = document.getElementById('userRole');
        roleEl.textContent = currentUser.role === 'teacher' ? 'GVCN' : 'Tổ trưởng';
        roleEl.className = 'user-role ' + (currentUser.role === 'teacher' ? 'teacher' : 'leader');
    }
}

// Show/hide admin tab based on role
function updateAdminTabVisibility() {
    const adminTab = document.getElementById('adminTab');
    if (adminTab) {
        if (isTeacher()) {
            adminTab.classList.add('visible');
        } else {
            adminTab.classList.remove('visible');
        }
    }
}

// ============================================
// Groups Management (Admin only)
// ============================================

let editingGroupId = null;

function handleGroupSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('groupName').value.trim();
    
    if (!name) return;
    
    const groups = getGroups();
    
    if (editingGroupId) {
        const index = groups.findIndex(g => g.id === editingGroupId);
        if (index !== -1) {
            groups[index].name = name;
            saveGroups(groups);
            showToast('Đã cập nhật tổ!', 'success');
        }
        editingGroupId = null;
        document.getElementById('groupSubmitBtn').innerHTML = '<i class="fas fa-plus"></i> Thêm Tổ';
    } else {
        const group = {
            id: Date.now().toString(),
            name: name
        };
        groups.push(group);
        saveGroups(groups);
        showToast('Đã thêm tổ ' + name + '!', 'success');
    }
    
    document.getElementById('groupName').value = '';
    renderGroupsList();
    renderAccountGroupDropdown();
    renderStudentGroupDropdowns();
}

function editGroup(groupId) {
    const groups = getGroups();
    const group = groups.find(g => g.id === groupId);
    if (group) {
        editingGroupId = groupId;
        document.getElementById('groupName').value = group.name;
        document.getElementById('groupSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Cập nhật';
    }
}

function deleteGroup(groupId) {
    deleteModalText.textContent = 'Bạn có chắc muốn xóa tổ này? Các học sinh và tài khoản liên quan sẽ bị bỏ gán tổ.';
    deleteCallback = () => {
        let groups = getGroups();
        groups = groups.filter(g => g.id !== groupId);
        saveGroups(groups);
        
        // Unassign students from this group
        const students = getStudents();
        students.forEach(s => {
            if (s.groupId === groupId) s.groupId = null;
        });
        saveStudents(students);
        
        // Unassign accounts from this group
        const accounts = getAccounts();
        accounts.forEach(a => {
            if (a.groupId === groupId) a.groupId = null;
        });
        saveAccounts(accounts);
        
        renderGroupsList();
        renderAccountGroupDropdown();
        renderStudentGroupDropdowns();
        showToast('Đã xóa tổ!', 'success');
    };
    deleteModal.classList.add('show');
}

function renderGroupsList() {
    const groups = getGroups();
    const container = document.getElementById('groupsList');
    
    if (!container) return;
    
    if (groups.length === 0) {
        container.innerHTML = '<p class="empty-text">Chưa có tổ nào</p>';
        return;
    }
    
    const students = getStudents();
    
    container.innerHTML = groups.map(group => {
        const memberCount = students.filter(s => s.groupId === group.id).length;
        return `
            <div class="admin-list-item">
                <div class="item-info">
                    <div class="item-icon group">
                        <i class="fas fa-layer-group"></i>
                    </div>
                    <div class="item-details">
                        <span class="item-name">${group.name}</span>
                        <span class="item-meta">${memberCount} học sinh</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="action-btn edit" onclick="editGroup('${group.id}')" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteGroup('${group.id}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// Accounts Management (Admin only)
// ============================================

let editingAccountId = null;

function handleAccountSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('accountName').value.trim();
    const username = document.getElementById('accountUsername').value.trim();
    const password = document.getElementById('accountPassword').value;
    const groupId = document.getElementById('accountGroup').value;
    
    if (!name || !username || !groupId) return;
    
    const accounts = getAccounts();
    
    if (editingAccountId) {
        const index = accounts.findIndex(a => a.id === editingAccountId);
        if (index !== -1) {
            accounts[index].name = name;
            accounts[index].username = username;
            if (password) accounts[index].password = password;
            accounts[index].groupId = groupId;
            saveAccounts(accounts);
            showToast('Đã cập nhật tài khoản!', 'success');
        }
        resetAccountForm();
    } else {
        // Check duplicate username
        if (accounts.some(a => a.username === username)) {
            showToast('Tên đăng nhập đã tồn tại!', 'error');
            return;
        }
        
        if (!password) {
            showToast('Vui lòng nhập mật khẩu!', 'error');
            return;
        }
        
        const account = {
            id: Date.now().toString(),
            username: username,
            password: password,
            name: name,
            role: 'leader',
            groupId: groupId
        };
        accounts.push(account);
        saveAccounts(accounts);
        showToast('Đã thêm tài khoản ' + name + '!', 'success');
        resetAccountForm();
    }
    
    renderAccountsList();
}

function resetAccountForm() {
    editingAccountId = null;
    document.getElementById('accountName').value = '';
    document.getElementById('accountUsername').value = '';
    document.getElementById('accountPassword').value = '';
    document.getElementById('accountGroup').value = '';
    document.getElementById('accountPassword').required = true;
    document.getElementById('accountSubmitBtn').innerHTML = '<i class="fas fa-plus"></i> Thêm tài khoản';
}

function editAccount(accountId) {
    const accounts = getAccounts();
    const account = accounts.find(a => a.id === accountId);
    if (account && account.role !== 'teacher') {
        editingAccountId = accountId;
        document.getElementById('accountName').value = account.name;
        document.getElementById('accountUsername').value = account.username;
        document.getElementById('accountPassword').value = '';
        document.getElementById('accountPassword').required = false;
        document.getElementById('accountPassword').placeholder = 'Để trống nếu không đổi';
        document.getElementById('accountGroup').value = account.groupId || '';
        document.getElementById('accountSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Cập nhật';
    }
}

function deleteAccount(accountId) {
    const accounts = getAccounts();
    const account = accounts.find(a => a.id === accountId);
    
    if (account && account.role === 'teacher') {
        showToast('Không thể xóa tài khoản GVCN!', 'error');
        return;
    }
    
    deleteModalText.textContent = 'Bạn có chắc muốn xóa tài khoản này?';
    deleteCallback = () => {
        let newAccounts = accounts.filter(a => a.id !== accountId);
        saveAccounts(newAccounts);
        renderAccountsList();
        showToast('Đã xóa tài khoản!', 'success');
    };
    deleteModal.classList.add('show');
}

function renderAccountsList() {
    const accounts = getAccounts();
    const groups = getGroups();
    const container = document.getElementById('accountsList');
    
    if (!container) return;
    
    // Filter out teacher account for display
    const leaderAccounts = accounts.filter(a => a.role === 'leader');
    
    if (leaderAccounts.length === 0) {
        container.innerHTML = '<p class="empty-text">Chưa có tài khoản tổ trưởng</p>';
        return;
    }
    
    container.innerHTML = leaderAccounts.map(account => {
        const group = groups.find(g => g.id === account.groupId);
        return `
            <div class="admin-list-item">
                <div class="item-info">
                    <div class="item-icon account">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="item-details">
                        <span class="item-name">${account.name}</span>
                        <span class="item-meta">@${account.username} • ${group ? group.name : 'Chưa gán tổ'}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="action-btn edit" onclick="editAccount('${account.id}')" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteAccount('${account.id}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderAccountGroupDropdown() {
    const groups = getGroups();
    const select = document.getElementById('accountGroup');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Chọn Tổ --</option>';
    groups.forEach(g => {
        const option = document.createElement('option');
        option.value = g.id;
        option.textContent = g.name;
        select.appendChild(option);
    });
}

// Render group dropdowns on student form
function renderStudentGroupDropdowns() {
    const groups = getGroups();
    const select = document.getElementById('studentGroup');
    const field = document.getElementById('studentGroupField');
    
    if (!select || !field) return;
    
    // Show/hide field based on role
    if (isTeacher()) {
        field.style.display = 'block';
    } else {
        field.style.display = 'none';
        return;
    }
    
    select.innerHTML = '<option value="">-- Không gán tổ --</option>';
    groups.forEach(g => {
        const option = document.createElement('option');
        option.value = g.id;
        option.textContent = g.name;
        select.appendChild(option);
    });
}

// ============================================
// Data Management
// ============================================

// Default violation/reward categories (used for initialization)
const DEFAULT_VIOLATION_CATEGORIES = [
    { id: 'late', name: 'Đi học muộn', points: -5 },
    { id: 'no_uniform', name: 'Không mặc đồng phục', points: -5 },
    { id: 'no_homework', name: 'Không làm bài tập', points: -3 },
    { id: 'talk_class', name: 'Nói chuyện trong lớp', points: -3 },
    { id: 'phone', name: 'Sử dụng điện thoại', points: -10 },
    { id: 'absent', name: 'Nghỉ học không phép', points: -10 },
    { id: 'fight', name: 'Đánh nhau', points: -20 },
    { id: 'cheat', name: 'Gian lận thi cử', points: -20 },
    { id: 'other_violation', name: 'Vi phạm khác', points: 0 }
];

const DEFAULT_REWARD_CATEGORIES = [
    { id: 'help_class', name: 'Giúp đỡ lớp', points: 5 },
    { id: 'good_grade', name: 'Đạt điểm cao', points: 5 },
    { id: 'competition', name: 'Tham gia cuộc thi', points: 10 },
    { id: 'win_prize', name: 'Đạt giải thưởng', points: 15 },
    { id: 'clean_class', name: 'Vệ sinh lớp tốt', points: 3 },
    { id: 'good_behavior', name: 'Có hành vi đẹp', points: 5 },
    { id: 'other_reward', name: 'Khen thưởng khác', points: 0 }
];

// Get violation categories (from Firebase cache or defaults)
function getViolationCategories() {
    if (cachedData.violationCategories) {
        return cachedData.violationCategories;
    }
    return DEFAULT_VIOLATION_CATEGORIES;
}

function saveViolationCategories(categories) {
    cachedData.violationCategories = categories;
    database.ref('violationCategories').set(categories);
}

// Get reward categories (from Firebase cache or defaults)
function getRewardCategories() {
    if (cachedData.rewardCategories) {
        return cachedData.rewardCategories;
    }
    return DEFAULT_REWARD_CATEGORIES;
}

function saveRewardCategories(categories) {
    cachedData.rewardCategories = categories;
    database.ref('rewardCategories').set(categories);
}

// Category management functions
function handleViolationCatSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('violationCatName').value.trim();
    const points = parseInt(document.getElementById('violationCatPoints').value) || 0;
    
    if (!name) return;
    
    const categories = getViolationCategories();
    const newCat = {
        id: Date.now().toString(),
        name: name,
        points: points > 0 ? -points : points // Ensure negative
    };
    categories.push(newCat);
    saveViolationCategories(categories);
    
    document.getElementById('violationCatName').value = '';
    document.getElementById('violationCatPoints').value = '';
    renderViolationCatList();
    updateCategoryDropdown(document.querySelector('input[name="recordType"]:checked')?.value || 'violation');
    showToast('Đã thêm vi phạm: ' + name, 'success');
}

function handleRewardCatSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('rewardCatName').value.trim();
    const points = parseInt(document.getElementById('rewardCatPoints').value) || 0;
    
    if (!name) return;
    
    const categories = getRewardCategories();
    const newCat = {
        id: Date.now().toString(),
        name: name,
        points: Math.abs(points) // Ensure positive
    };
    categories.push(newCat);
    saveRewardCategories(categories);
    
    document.getElementById('rewardCatName').value = '';
    document.getElementById('rewardCatPoints').value = '';
    renderRewardCatList();
    updateCategoryDropdown(document.querySelector('input[name="recordType"]:checked')?.value || 'violation');
    showToast('Đã thêm khen thưởng: ' + name, 'success');
}

function deleteViolationCat(catId) {
    let categories = getViolationCategories();
    categories = categories.filter(c => c.id !== catId);
    saveViolationCategories(categories);
    renderViolationCatList();
    updateCategoryDropdown('violation');
    showToast('Đã xóa vi phạm!', 'success');
}

function deleteRewardCat(catId) {
    let categories = getRewardCategories();
    categories = categories.filter(c => c.id !== catId);
    saveRewardCategories(categories);
    renderRewardCatList();
    updateCategoryDropdown('reward');
    showToast('Đã xóa khen thưởng!', 'success');
}

function renderViolationCatList() {
    const categories = getViolationCategories();
    const container = document.getElementById('violationCatList');
    if (!container) return;
    
    container.innerHTML = categories.map(cat => `
        <div class="admin-list-item">
            <div class="item-info">
                <div class="item-icon" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">
                    <i class="fas fa-minus"></i>
                </div>
                <div class="item-details">
                    <span class="item-name">${cat.name}</span>
                    <span class="item-meta">${cat.points} điểm</span>
                </div>
            </div>
            <div class="item-actions">
                <button class="action-btn delete" onclick="deleteViolationCat('${cat.id}')" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderRewardCatList() {
    const categories = getRewardCategories();
    const container = document.getElementById('rewardCatList');
    if (!container) return;
    
    container.innerHTML = categories.map(cat => `
        <div class="admin-list-item">
            <div class="item-info">
                <div class="item-icon" style="background: rgba(34, 197, 94, 0.2); color: #4ade80;">
                    <i class="fas fa-plus"></i>
                </div>
                <div class="item-details">
                    <span class="item-name">${cat.name}</span>
                    <span class="item-meta">+${cat.points} điểm</span>
                </div>
            </div>
            <div class="item-actions">
                <button class="action-btn delete" onclick="deleteRewardCat('${cat.id}')" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Get storage key based on school year
function getStorageKey(key) {
    const yearSelect = document.getElementById('schoolYear');
    const year = yearSelect ? yearSelect.value : '2024-2025';
    return `years/${year}/${key}`;
}

// Load data from Firebase cache
function loadData(key) {
    const yearSelect = document.getElementById('schoolYear');
    const year = yearSelect ? yearSelect.value : '2024-2025';
    
    if (key === 'students') {
        return cachedData.students[year] || [];
    } else if (key === 'records') {
        return cachedData.records[year] || [];
    }
    return null;
}

// Save data to Firebase
function saveData(key, data) {
    const yearSelect = document.getElementById('schoolYear');
    const year = yearSelect ? yearSelect.value : '2024-2025';
    
    if (key === 'students') {
        cachedData.students[year] = data;
    } else if (key === 'records') {
        cachedData.records[year] = data;
    }
    
    database.ref(getStorageKey(key)).set(data);
}

// Get students (filtered by group for leaders)
function getStudents() {
    let students = loadData('students') || [];
    
    // If current user is a group leader, filter students by their group
    if (currentUser && currentUser.role === 'leader' && currentUser.groupId) {
        students = students.filter(s => s.groupId === currentUser.groupId);
    }
    
    return students;
}

// Get all students (for admin operations)
function getAllStudents() {
    return loadData('students') || [];
}

// Save students
function saveStudents(students) {
    saveData('students', students);
}

// Get records (filtered by group for leaders)
function getRecords() {
    let records = loadData('records') || [];
    
    // If current user is a group leader, filter records by students in their group
    if (currentUser && currentUser.role === 'leader' && currentUser.groupId) {
        const allStudents = loadData('students') || [];
        const groupStudentIds = allStudents.filter(s => s.groupId === currentUser.groupId).map(s => s.id);
        records = records.filter(r => groupStudentIds.includes(r.studentId));
    }
    
    return records;
}

// Save records
function saveRecords(records) {
    saveData('records', records);
}

// ============================================
// DOM Elements
// ============================================

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const schoolYearSelect = document.getElementById('schoolYear');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const deleteModal = document.getElementById('deleteModal');
const deleteModalText = document.getElementById('deleteModalText');

// Record form elements
const recordForm = document.getElementById('recordForm');
const recordDate = document.getElementById('recordDate');
const recordStudent = document.getElementById('recordStudent');
const recordCategory = document.getElementById('recordCategory');
const recordPoints = document.getElementById('recordPoints');
const recordNote = document.getElementById('recordNote');
const todayRecordsList = document.getElementById('todayRecordsList');
const todayDateDisplay = document.getElementById('todayDateDisplay');

// Student form elements
const studentForm = document.getElementById('studentForm');
const studentName = document.getElementById('studentName');
const studentGender = document.getElementById('studentGender');
const studentSubmitBtn = document.getElementById('studentSubmitBtn');
const studentResetBtn = document.getElementById('studentResetBtn');
const studentsTableBody = document.getElementById('studentsTableBody');
const emptyStudents = document.getElementById('emptyStudents');

// History elements
const historyFromDate = document.getElementById('historyFromDate');
const historyToDate = document.getElementById('historyToDate');
const historyStudent = document.getElementById('historyStudent');
const historyType = document.getElementById('historyType');
const applyHistoryFilter = document.getElementById('applyHistoryFilter');
const exportHistoryBtn = document.getElementById('exportHistoryBtn');
const historyTableBody = document.getElementById('historyTableBody');
const emptyHistory = document.getElementById('emptyHistory');

// Delete handling
let deleteCallback = null;

// Edit handling
let editingStudentId = null;

// ============================================
// Initialization
// ============================================

function init() {
    // Always setup auth event listeners first
    setupAuthEventListeners();
    
    // Load Firebase data first
    initFirebaseData().then(() => {
        // Check authentication after data loaded
        if (!checkSession()) {
            showLoginOverlay();
            return; // Don't initialize app until logged in
        }
        
        initializeApp();
    });
}

function initializeApp() {
    // Setup year data listeners
    const year = document.getElementById('schoolYear').value;
    setupYearDataListeners(year);
    
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    recordDate.value = today;
    todayDateDisplay.textContent = formatDateVN(today);
    
    // Set history date range (current month)
    const firstDay = new Date();
    firstDay.setDate(1);
    historyFromDate.value = firstDay.toISOString().split('T')[0];
    historyToDate.value = today;
    
    // Populate category dropdown
    updateCategoryDropdown('violation');
    
    // Render all
    renderStudentsDropdown();
    renderStudentsTable();
    renderTodayRecords();
    renderHistory();
    updateStats();
    renderStatsTab();
    renderStudentGroupDropdowns();
    
    // Render admin panel if teacher
    if (isTeacher()) {
        renderGroupsList();
        renderAccountsList();
        renderAccountGroupDropdown();
        renderViolationCatList();
        renderRewardCatList();
    }
    
    // Setup event listeners
    setupEventListeners();
}

function setupAuthEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            const errorEl = document.getElementById('loginError');
            
            if (login(username, password)) {
                errorEl.textContent = '';
                hideLoginOverlay();
                initializeApp();
            } else {
                errorEl.textContent = 'Sai tên đăng nhập hoặc mật khẩu!';
            }
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Group form (admin only)
    const groupForm = document.getElementById('groupForm');
    if (groupForm) {
        groupForm.addEventListener('submit', handleGroupSubmit);
    }
    
    // Account form (admin only)
    const accountForm = document.getElementById('accountForm');
    if (accountForm) {
        accountForm.addEventListener('submit', handleAccountSubmit);
    }
    
    const accountResetBtn = document.getElementById('accountResetBtn');
    if (accountResetBtn) {
        accountResetBtn.addEventListener('click', resetAccountForm);
    }
    
    // Category forms (admin only)
    const violationCatForm = document.getElementById('violationCatForm');
    if (violationCatForm) {
        violationCatForm.addEventListener('submit', handleViolationCatSubmit);
    }
    
    const rewardCatForm = document.getElementById('rewardCatForm');
    if (rewardCatForm) {
        rewardCatForm.addEventListener('submit', handleRewardCatSubmit);
    }
}

function setupEventListeners() {
    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + tab).classList.add('active');
        });
    });
    
    // School year change
    schoolYearSelect.addEventListener('change', () => {
        // Setup listeners for new year
        setupYearDataListeners(schoolYearSelect.value);
        
        renderStudentsDropdown();
        renderStudentsTable();
        renderTodayRecords();
        renderHistory();
        updateStats();
        renderStatsTab();
        showToast('Đã chuyển sang năm học ' + schoolYearSelect.value, 'success');
    });
    
    // Record type change
    document.querySelectorAll('input[name="recordType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateCategoryDropdown(e.target.value);
        });
    });
    
    // Category change - auto fill points
    recordCategory.addEventListener('change', () => {
        const type = document.querySelector('input[name="recordType"]:checked').value;
        const categories = type === 'violation' ? getViolationCategories() : getRewardCategories();
        const category = categories.find(c => c.id === recordCategory.value);
        if (category && category.points !== 0) {
            recordPoints.value = category.points;
        }
    });
    
    // Record form submit
    recordForm.addEventListener('submit', handleRecordSubmit);
    
    // Student form submit
    studentForm.addEventListener('submit', handleStudentSubmit);
    studentResetBtn.addEventListener('click', resetStudentForm);
    
    // History filter
    applyHistoryFilter.addEventListener('click', renderHistory);
    exportHistoryBtn.addEventListener('click', exportHistory);
    
    // Export students
    document.getElementById('exportStudentsBtn').addEventListener('click', exportStudents);
    document.getElementById('importStudentsBtn').addEventListener('click', () => {
        showToast('Tính năng import đang phát triển!', 'warning');
    });
    
    // Delete modal
    document.getElementById('cancelDelete').addEventListener('click', () => {
        deleteModal.classList.remove('show');
        deleteCallback = null;
    });
    
    document.getElementById('confirmDelete').addEventListener('click', () => {
        if (deleteCallback) {
            deleteCallback();
            deleteCallback = null;
        }
        deleteModal.classList.remove('show');
    });
    
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            deleteModal.classList.remove('show');
            deleteCallback = null;
        }
    });
}

// ============================================
// Category Management
// ============================================

function updateCategoryDropdown(type) {
    const categories = type === 'violation' ? getViolationCategories() : getRewardCategories();
    recordCategory.innerHTML = '<option value="">-- Chọn nội dung --</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = `${cat.name} (${cat.points > 0 ? '+' : ''}${cat.points})`;
        recordCategory.appendChild(option);
    });
    recordPoints.value = '';
}

function getCategoryName(type, categoryId) {
    const categories = type === 'violation' ? getViolationCategories() : getRewardCategories();
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
}

// ============================================
// Record Management
// ============================================

function handleRecordSubmit(e) {
    e.preventDefault();
    
    const studentId = recordStudent.value;
    const students = getStudents();
    const student = students.find(s => s.id === studentId);
    
    if (!student) {
        showToast('Vui lòng chọn học sinh!', 'error');
        return;
    }
    
    const type = document.querySelector('input[name="recordType"]:checked').value;
    const record = {
        id: Date.now().toString(),
        studentId: studentId,
        studentName: student.name,
        date: recordDate.value,
        type: type,
        category: recordCategory.value,
        points: parseInt(recordPoints.value) || 0,
        note: recordNote.value.trim(),
        createdAt: new Date().toISOString()
    };
    
    const records = getRecords();
    records.push(record);
    saveRecords(records);
    
    // Reset form (keep date and student)
    recordCategory.value = '';
    recordPoints.value = '';
    recordNote.value = '';
    
    renderTodayRecords();
    renderHistory();
    updateStats();
    renderStatsTab();
    
    const actionText = type === 'violation' ? 'Đã ghi nhận vi phạm' : 'Đã ghi nhận khen thưởng';
    showToast(`${actionText} cho ${student.name}!`, 'success');
}

function renderTodayRecords() {
    const today = new Date().toISOString().split('T')[0];
    const records = getRecords().filter(r => r.date === today);
    
    if (records.length === 0) {
        todayRecordsList.innerHTML = `
            <div class="empty-records">
                <i class="fas fa-clipboard"></i>
                <p>Chưa có ghi nhận nào hôm nay</p>
            </div>
        `;
        return;
    }
    
    // Sort by newest first
    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    todayRecordsList.innerHTML = records.map(record => `
        <div class="record-item ${record.type}">
            <div class="record-icon">
                <i class="fas ${record.type === 'violation' ? 'fa-times-circle' : 'fa-check-circle'}"></i>
            </div>
            <div class="record-info">
                <div class="student-name">${record.studentName}</div>
                <div class="record-category">${getCategoryName(record.type, record.category)}</div>
            </div>
            <div class="record-points">${record.points > 0 ? '+' : ''}${record.points}</div>
            <button class="record-delete" onclick="deleteRecord('${record.id}')" title="Xóa">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function deleteRecord(recordId) {
    deleteModalText.textContent = 'Bạn có chắc muốn xóa ghi nhận này?';
    deleteCallback = () => {
        let records = getRecords();
        records = records.filter(r => r.id !== recordId);
        saveRecords(records);
        renderTodayRecords();
        renderHistory();
        updateStats();
        renderStatsTab();
        showToast('Đã xóa ghi nhận!', 'success');
    };
    deleteModal.classList.add('show');
}

// ============================================
// Student Management
// ============================================

function handleStudentSubmit(e) {
    e.preventDefault();
    
    const students = getStudents();
    const name = studentName.value.trim();
    const gender = studentGender.value;
    
    if (editingStudentId) {
        // Update existing student
        const allStudents = getAllStudents();
        const index = allStudents.findIndex(s => s.id === editingStudentId);
        if (index !== -1) {
            allStudents[index].name = name;
            allStudents[index].gender = gender;
            if (isTeacher()) {
                const groupId = document.getElementById('studentGroup')?.value;
                allStudents[index].groupId = groupId || null;
            }
            saveStudents(allStudents);
            showToast('Đã cập nhật thông tin học sinh!', 'success');
        }
        resetStudentForm();
    } else {
        // Get all students for saving
        const allStudents = getAllStudents();
        
        // Auto-generate STT based on current user's students
        const stt = students.length > 0 ? Math.max(...students.map(s => s.stt || 0)) + 1 : 1;
        
        // Add new student
        // If teacher, use selected group; if leader, auto-assign leader's group
        let groupId = null;
        if (isTeacher()) {
            groupId = document.getElementById('studentGroup')?.value || null;
        } else if (currentUser && currentUser.groupId) {
            // Group leader: auto-assign to their group
            groupId = currentUser.groupId;
        }
        
        const student = {
            id: Date.now().toString(),
            stt: stt,
            name: name,
            gender: gender,
            groupId: groupId,
            basePoints: 0
        };
        allStudents.push(student);
        saveStudents(allStudents);
        showToast('Đã thêm học sinh ' + name + '!', 'success');
        
        // Reset form
        studentName.value = '';
        studentName.focus();
    }
    
    renderStudentsTable();
    renderStudentsDropdown();
    updateStats();
}

function resetStudentForm() {
    editingStudentId = null;
    studentName.value = '';
    studentGender.value = 'Nam';
    studentSubmitBtn.innerHTML = '<i class="fas fa-plus"></i> Thêm';
    
    // Reset group field
    const studentGroupSelect = document.getElementById('studentGroup');
    if (studentGroupSelect) {
        studentGroupSelect.value = '';
    }
}

function editStudent(studentId) {
    const allStudents = getAllStudents();
    const student = allStudents.find(s => s.id === studentId);
    
    if (student) {
        editingStudentId = studentId;
        studentStt.value = student.stt;
        studentName.value = student.name;
        studentGender.value = student.gender;
        
        // Set group if teacher
        const studentGroupSelect = document.getElementById('studentGroup');
        if (studentGroupSelect && isTeacher()) {
            studentGroupSelect.value = student.groupId || '';
        }
        
        studentSubmitBtn.innerHTML = '<i class="fas fa-save"></i> Cập nhật';
        
        // Switch to students tab if not already
        document.querySelector('[data-tab="students"]').click();
    }
}

function deleteStudent(studentId) {
    const students = getStudents();
    const student = students.find(s => s.id === studentId);
    
    deleteModalText.textContent = `Bạn có chắc muốn xóa học sinh "${student?.name}"? Tất cả ghi nhận liên quan cũng sẽ bị xóa.`;
    deleteCallback = () => {
        // Remove student
        let newStudents = students.filter(s => s.id !== studentId);
        saveStudents(newStudents);
        
        // Remove related records
        let records = getRecords();
        records = records.filter(r => r.studentId !== studentId);
        saveRecords(records);
        
        renderStudentsTable();
        renderStudentsDropdown();
        renderTodayRecords();
        renderHistory();
        updateStats();
        renderStatsTab();
        showToast('Đã xóa học sinh!', 'success');
    };
    deleteModal.classList.add('show');
}

function getStudentPoints(studentId) {
    const students = getStudents();
    const student = students.find(s => s.id === studentId);
    const basePoints = student?.basePoints || 0;
    
    const records = getRecords().filter(r => r.studentId === studentId);
    const totalChange = records.reduce((sum, r) => sum + r.points, 0);
    
    return basePoints + totalChange;
}

function getPointsBadgeClass(points) {
    if (points >= 0) return 'good';
    if (points >= -10) return 'warning';
    return 'danger';
}

function renderStudentsTable() {
    const students = getStudents();
    const tableWrapper = document.querySelector('#tab-students .table-wrapper');
    const table = document.getElementById('studentsTable');
    
    if (students.length === 0) {
        tableWrapper.style.display = 'none';
        emptyStudents.style.display = 'block';
        return;
    }
    
    tableWrapper.style.display = 'block';
    emptyStudents.style.display = 'none';
    
    // Update table header for teacher (add Group column)
    const thead = table.querySelector('thead tr');
    if (isTeacher()) {
        thead.innerHTML = '<th>STT</th><th>Họ và tên</th><th>Giới tính</th><th>Tổ</th><th>Điểm hiện tại</th><th>Thao tác</th>';
    } else {
        thead.innerHTML = '<th>STT</th><th>Họ và tên</th><th>Giới tính</th><th>Điểm hiện tại</th><th>Thao tác</th>';
    }
    
    // Sort by first name (last word of full name in Vietnamese) alphabetically
    students.sort((a, b) => {
        const getFirstName = (fullName) => {
            const parts = fullName.trim().split(' ');
            return parts[parts.length - 1]; // Last word = first name in Vietnamese
        };
        return getFirstName(a.name).localeCompare(getFirstName(b.name), 'vi');
    });
    
    studentsTableBody.innerHTML = students.map(student => {
        const points = getStudentPoints(student.id);
        const badgeClass = getPointsBadgeClass(points);
        
        // Get group name for teacher view
        let groupCell = '';
        if (isTeacher()) {
            const groups = getGroups();
            const group = groups.find(g => g.id === student.groupId);
            const groupName = group ? group.name : '<span class="text-muted">Chưa gán</span>';
            groupCell = `<td>${groupName}</td>`;
        }
        
        return `
            <tr>
                <td>${student.stt}</td>
                <td><strong>${student.name}</strong></td>
                <td>${student.gender}</td>
                ${groupCell}
                <td><span class="points-badge ${badgeClass}">${points} điểm</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" onclick="editStudent('${student.id}')" title="Sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteStudent('${student.id}')" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderStudentsDropdown() {
    const students = getStudents();
    students.sort((a, b) => a.stt - b.stt);
    
    // Record form dropdown
    recordStudent.innerHTML = '<option value="">-- Chọn học sinh --</option>';
    students.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = `${s.stt}. ${s.name}`;
        recordStudent.appendChild(option);
    });
    
    // History filter dropdown
    historyStudent.innerHTML = '<option value="">Tất cả</option>';
    students.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = `${s.stt}. ${s.name}`;
        historyStudent.appendChild(option);
    });
}

// ============================================
// History
// ============================================

function renderHistory() {
    const fromDate = historyFromDate.value;
    const toDate = historyToDate.value;
    const studentId = historyStudent.value;
    const type = historyType.value;
    
    let records = getRecords();
    
    // Apply filters
    if (fromDate) {
        records = records.filter(r => r.date >= fromDate);
    }
    if (toDate) {
        records = records.filter(r => r.date <= toDate);
    }
    if (studentId) {
        records = records.filter(r => r.studentId === studentId);
    }
    if (type) {
        records = records.filter(r => r.type === type);
    }
    
    // Sort by date (newest first)
    records.sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.createdAt) - new Date(a.createdAt));
    
    const tableWrapper = document.querySelector('.history-table-wrapper');
    
    if (records.length === 0) {
        tableWrapper.style.display = 'none';
        emptyHistory.style.display = 'block';
        return;
    }
    
    tableWrapper.style.display = 'block';
    emptyHistory.style.display = 'none';
    
    historyTableBody.innerHTML = records.map(record => `
        <tr>
            <td>${formatDateVN(record.date)}</td>
            <td><strong>${record.studentName}</strong></td>
            <td>
                <span class="points-badge ${record.type === 'violation' ? 'danger' : 'good'}">
                    ${record.type === 'violation' ? 'Vi phạm' : 'Khen thưởng'}
                </span>
            </td>
            <td>${getCategoryName(record.type, record.category)}</td>
            <td>
                <span class="points-badge ${record.points < 0 ? 'danger' : 'good'}">
                    ${record.points > 0 ? '+' : ''}${record.points}
                </span>
            </td>
            <td>${record.note || '-'}</td>
            <td>
                <button class="action-btn delete" onclick="deleteRecord('${record.id}')" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function exportHistory() {
    const records = getRecords();
    
    if (records.length === 0) {
        showToast('Không có dữ liệu để xuất!', 'error');
        return;
    }
    
    const exportData = records.map((r, index) => ({
        'STT': index + 1,
        'Ngày': formatDateVN(r.date),
        'Học sinh': r.studentName,
        'Loại': r.type === 'violation' ? 'Vi phạm' : 'Khen thưởng',
        'Nội dung': getCategoryName(r.type, r.category),
        'Điểm': r.points,
        'Ghi chú': r.note || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch sử');
    
    ws['!cols'] = [
        { wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 12 },
        { wch: 25 }, { wch: 8 }, { wch: 30 }
    ];
    
    const year = schoolYearSelect.value;
    XLSX.writeFile(wb, `NenNep_12A5_${year}_LichSu.xlsx`);
    showToast('Đã xuất file Excel!', 'success');
}

function exportStudents() {
    const students = getStudents();
    
    if (students.length === 0) {
        showToast('Không có dữ liệu để xuất!', 'error');
        return;
    }
    
    students.sort((a, b) => a.stt - b.stt);
    
    const exportData = students.map(s => ({
        'STT': s.stt,
        'Họ và tên': s.name,
        'Giới tính': s.gender,
        'Điểm hiện tại': getStudentPoints(s.id)
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách');
    
    ws['!cols'] = [
        { wch: 5 }, { wch: 30 }, { wch: 10 }, { wch: 15 }
    ];
    
    const year = schoolYearSelect.value;
    XLSX.writeFile(wb, `DanhSach_12A5_${year}.xlsx`);
    showToast('Đã xuất file Excel!', 'success');
}

// ============================================
// Statistics
// ============================================

function updateStats() {
    const students = getStudents();
    const records = getRecords();
    const today = new Date().toISOString().split('T')[0];
    
    // Total students
    animateNumber('totalStudents', students.length);
    
    // Today's violations
    const todayViolations = records.filter(r => r.date === today && r.type === 'violation').length;
    animateNumber('todayViolations', todayViolations);
    
    // Today's rewards
    const todayRewards = records.filter(r => r.date === today && r.type === 'reward').length;
    animateNumber('todayRewards', todayRewards);
    
    // Average points
    if (students.length > 0) {
        const totalPoints = students.reduce((sum, s) => sum + getStudentPoints(s.id), 0);
        const avgPoints = Math.round(totalPoints / students.length);
        animateNumber('averagePoints', avgPoints);
    } else {
        document.getElementById('averagePoints').textContent = '0';
    }
}

function animateNumber(elementId, target) {
    const el = document.getElementById(elementId);
    const current = parseInt(el.textContent) || 0;
    const diff = target - current;
    const duration = 300;
    const steps = 20;
    const increment = diff / steps;
    let step = 0;

    const timer = setInterval(() => {
        step++;
        el.textContent = Math.round(current + increment * step);
        if (step >= steps) {
            el.textContent = target;
            clearInterval(timer);
        }
    }, duration / steps);
}

function renderStatsTab() {
    renderWeeklySummary();
    renderTopViolators();
    renderTopPerformers();
    renderViolationCategories();
    renderMonthlySummary();
}

function renderTopViolators() {
    const students = getStudents();
    const records = getRecords();
    
    // Count violations per student
    const violationCounts = {};
    records.filter(r => r.type === 'violation').forEach(r => {
        violationCounts[r.studentId] = (violationCounts[r.studentId] || 0) + 1;
    });
    
    // Sort and get top 5
    const sorted = Object.entries(violationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const container = document.getElementById('topViolators');
    
    if (sorted.length === 0) {
        container.innerHTML = '<p class="empty-text">Chưa có dữ liệu</p>';
        return;
    }
    
    container.innerHTML = sorted.map(([studentId, count], index) => {
        const student = students.find(s => s.id === studentId);
        const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
        
        return `
            <div class="stats-list-item">
                <span class="rank ${rankClass}">${index + 1}</span>
                <span class="name">${student?.name || 'Không rõ'}</span>
                <span class="value" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">${count} lần</span>
            </div>
        `;
    }).join('');
}

function renderTopPerformers() {
    const students = getStudents();
    
    if (students.length === 0) {
        document.getElementById('topPerformers').innerHTML = '<p class="empty-text">Chưa có dữ liệu</p>';
        return;
    }
    
    // Sort by current points
    const sorted = students
        .map(s => ({ ...s, points: getStudentPoints(s.id) }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);
    
    const container = document.getElementById('topPerformers');
    
    container.innerHTML = sorted.map((student, index) => {
        const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
        
        return `
            <div class="stats-list-item">
                <span class="rank ${rankClass}">${index + 1}</span>
                <span class="name">${student.name}</span>
                <span class="value" style="background: rgba(34, 197, 94, 0.2); color: #4ade80;">${student.points} điểm</span>
            </div>
        `;
    }).join('');
}

function renderViolationCategories() {
    const records = getRecords().filter(r => r.type === 'violation');
    
    if (records.length === 0) {
        document.getElementById('violationCategories').innerHTML = '<p class="empty-text">Chưa có dữ liệu</p>';
        return;
    }
    
    // Count by category
    const categoryCounts = {};
    records.forEach(r => {
        const catName = getCategoryName('violation', r.category);
        categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });
    
    // Sort by count
    const sorted = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    
    const container = document.getElementById('violationCategories');
    container.innerHTML = sorted.map(([name, count]) => `
        <div class="category-item">
            <span>${name}</span>
            <span class="count">${count}</span>
        </div>
    `).join('');
}

function renderMonthlySummary() {
    const records = getRecords();
    
    if (records.length === 0) {
        document.getElementById('monthlySummary').innerHTML = '<p class="empty-text">Chưa có dữ liệu</p>';
        return;
    }
    
    // Group by month
    const months = {};
    records.forEach(r => {
        const month = r.date.substring(0, 7); // YYYY-MM
        if (!months[month]) {
            months[month] = { violations: 0, rewards: 0 };
        }
        if (r.type === 'violation') {
            months[month].violations++;
        } else {
            months[month].rewards++;
        }
    });
    
    // Sort by month (newest first)
    const sorted = Object.entries(months).sort((a, b) => b[0].localeCompare(a[0]));
    
    const container = document.getElementById('monthlySummary');
    container.innerHTML = sorted.map(([month, data]) => {
        const [year, m] = month.split('-');
        const monthNames = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
                           'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
        const monthName = monthNames[parseInt(m)] + ' ' + year;
        
        return `
            <div class="month-item">
                <div class="month-name">${monthName}</div>
                <div class="month-stats">
                    <div class="month-stat violations">
                        <span class="value">${data.violations}</span>
                        <span class="label">Vi phạm</span>
                    </div>
                    <div class="month-stat rewards">
                        <span class="value">${data.rewards}</span>
                        <span class="label">Khen</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// Weekly Summary Functions
// ============================================

// Get week number and date range
function getWeekInfo(date) {
    const d = new Date(date);
    // Get Monday of current week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    // Calculate week number
    const startOfYear = new Date(monday.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((monday - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
    
    return {
        weekNumber,
        monday: monday.toISOString().split('T')[0],
        sunday: sunday.toISOString().split('T')[0],
        label: `Tuần ${weekNumber} (${formatDateVN(monday.toISOString().split('T')[0])} - ${formatDateVN(sunday.toISOString().split('T')[0])})`
    };
}

// Get student points for a specific week
function getStudentWeeklyPoints(studentId, monday, sunday) {
    const records = getRecords().filter(r => 
        r.studentId === studentId && 
        r.date >= monday && 
        r.date <= sunday
    );
    return records.reduce((sum, r) => sum + r.points, 0);
}

// Get all weeks with data
function getWeeksWithData() {
    const records = getRecords();
    const weeksMap = {};
    
    records.forEach(r => {
        const weekInfo = getWeekInfo(r.date);
        const key = weekInfo.monday;
        if (!weeksMap[key]) {
            weeksMap[key] = weekInfo;
        }
    });
    
    return Object.values(weeksMap).sort((a, b) => b.monday.localeCompare(a.monday));
}

// Render weekly summary card
function renderWeeklySummary() {
    const container = document.getElementById('weeklySummary');
    if (!container) return;
    
    const weeks = getWeeksWithData();
    const students = getStudents();
    
    if (weeks.length === 0 || students.length === 0) {
        container.innerHTML = '<p class="empty-text">Chưa có dữ liệu</p>';
        return;
    }
    
    // Current week
    const currentWeek = getWeekInfo(new Date().toISOString().split('T')[0]);
    
    container.innerHTML = `
        <div class="week-selector">
            <label>Chọn tuần:</label>
            <select id="weekSelect" onchange="renderWeeklyDetails()">
                ${weeks.map(w => `
                    <option value="${w.monday}" ${w.monday === currentWeek.monday ? 'selected' : ''}>
                        ${w.label}
                    </option>
                `).join('')}
            </select>
            <button class="btn btn-secondary" onclick="exportWeeklyReport()">
                <i class="fas fa-file-excel"></i> Xuất báo cáo tuần
            </button>
        </div>
        <div id="weeklyDetails"></div>
    `;
    
    renderWeeklyDetails();
}

// Render details for selected week
function renderWeeklyDetails() {
    const weekSelect = document.getElementById('weekSelect');
    if (!weekSelect) return;
    
    const monday = weekSelect.value;
    const weekInfo = getWeekInfo(monday);
    const students = getStudents();
    const container = document.getElementById('weeklyDetails');
    
    // Calculate points for each student this week
    const weeklyData = students.map(s => ({
        ...s,
        weeklyPoints: getStudentWeeklyPoints(s.id, weekInfo.monday, weekInfo.sunday),
        totalPoints: getStudentPoints(s.id)
    })).sort((a, b) => a.stt - b.stt);
    
    // Summary stats
    const totalViolations = weeklyData.filter(s => s.weeklyPoints < 0).length;
    const totalRewards = weeklyData.filter(s => s.weeklyPoints > 0).length;
    const avgWeeklyPoints = weeklyData.length > 0 
        ? Math.round(weeklyData.reduce((sum, s) => sum + s.weeklyPoints, 0) / weeklyData.length)
        : 0;
    
    container.innerHTML = `
        <div class="weekly-stats-summary">
            <div class="weekly-stat-item">
                <span class="label">HS có vi phạm:</span>
                <span class="value danger">${totalViolations}</span>
            </div>
            <div class="weekly-stat-item">
                <span class="label">HS được khen:</span>
                <span class="value good">${totalRewards}</span>
            </div>
            <div class="weekly-stat-item">
                <span class="label">Điểm TB tuần:</span>
                <span class="value ${avgWeeklyPoints >= 0 ? 'good' : 'danger'}">${avgWeeklyPoints >= 0 ? '+' : ''}${avgWeeklyPoints}</span>
            </div>
        </div>
        <div class="weekly-table-wrapper">
            <table class="weekly-table">
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Họ và tên</th>
                        <th>Điểm tuần này</th>
                        <th>Tổng điểm</th>
                    </tr>
                </thead>
                <tbody>
                    ${weeklyData.map(s => `
                        <tr>
                            <td>${s.stt}</td>
                            <td><strong>${s.name}</strong></td>
                            <td>
                                <span class="points-badge ${s.weeklyPoints >= 0 ? 'good' : 'danger'}">
                                    ${s.weeklyPoints >= 0 ? '+' : ''}${s.weeklyPoints}
                                </span>
                            </td>
                            <td>
                                <span class="points-badge ${getPointsBadgeClass(s.totalPoints)}">
                                    ${s.totalPoints}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Export weekly report
function exportWeeklyReport() {
    const weekSelect = document.getElementById('weekSelect');
    if (!weekSelect) {
        showToast('Không có dữ liệu để xuất!', 'error');
        return;
    }
    
    const monday = weekSelect.value;
    const weekInfo = getWeekInfo(monday);
    const students = getStudents();
    
    students.sort((a, b) => a.stt - b.stt);
    
    const exportData = students.map(s => ({
        'STT': s.stt,
        'Họ và tên': s.name,
        'Giới tính': s.gender,
        'Điểm tuần này': getStudentWeeklyPoints(s.id, weekInfo.monday, weekInfo.sunday),
        'Tổng điểm': getStudentPoints(s.id)
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Tuần ${weekInfo.weekNumber}`);
    
    ws['!cols'] = [
        { wch: 5 }, { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 15 }
    ];
    
    const year = schoolYearSelect.value;
    XLSX.writeFile(wb, `NenNep_12A5_${year}_Tuan${weekInfo.weekNumber}.xlsx`);
    showToast(`Đã xuất báo cáo ${weekInfo.label}!`, 'success');
}

// ============================================
// Utilities
// ============================================

function formatDateVN(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
}

function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    
    const icon = toast.querySelector('i');
    if (type === 'success') {
        icon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
        icon.className = 'fas fa-times-circle';
    } else if (type === 'warning') {
        icon.className = 'fas fa-exclamation-circle';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// Initialize App
// ============================================

document.addEventListener('DOMContentLoaded', init);
