// Game State
let currentUser = null;
let currentLevel = 1;
let currentStreak = 0;
let correctIndex = 0;
let levelCompleted = {};
let validationsPending = 0;
let isAdmin = false;

const ADMIN_PASSWORD = '1772';

// Initialize stock in localStorage if not exists
if (!localStorage.getItem('rewardStock')) {
    const initialStock = {
        'paypal_050': { quantity: 0, codes: [] },
        'paypal_100': { quantity: 0, codes: [] },
        'robux_15': { quantity: 0, codes: [] },
        'robux_40': { quantity: 0, codes: [] }
    };
    localStorage.setItem('rewardStock', JSON.stringify(initialStock));
}

// Initialize custom rewards
if (!localStorage.getItem('customRewards')) {
    localStorage.setItem('customRewards', JSON.stringify([]));
}

// Initialize deleted rewards
if (!localStorage.getItem('deletedRewardIds')) {
    localStorage.setItem('deletedRewardIds', JSON.stringify([]));
}

// Initialize withdrawal history
if (!localStorage.getItem('withdrawalHistory')) {
    localStorage.setItem('withdrawalHistory', JSON.stringify([]));
}

// Generate random key
function generateKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'KEY-';
    for (let i = 0; i < 8; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

// Show forms
function showCreateAccount() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('createAccountForm').classList.remove('hidden');
    document.getElementById('keyDisplay').classList.add('hidden');
}

function showLogin() {
    document.getElementById('createAccountForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('keyDisplay').classList.add('hidden');
}

// Create account
function createAccount() {
    const key = generateKey();
    const user = {
        key: key,
        points: 0,
        maxLevel: 0,
        completedLevels: {},
        createdAt: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(user));
    document.getElementById('generatedKey').textContent = key;
    document.getElementById('createAccountForm').classList.add('hidden');
    document.getElementById('keyDisplay').classList.remove('hidden');
}

function continueToGame() {
    const key = document.getElementById('generatedKey').textContent;
    loadUser(key);
}

// Login
function login() {
    const input = document.getElementById('keyInput').value.trim();
    if (!input) return alert('Entrez une clé !');
    
    if (input === ADMIN_PASSWORD) {
        isAdmin = true;
        showAdminPanel();
        return;
    }
    
    const key = input.toUpperCase();
    const userData = localStorage.getItem(key);
    if (!userData) return alert('Clé invalide !');
    
    isAdmin = false;
    loadUser(key);
}

function loadUser(key) {
    const userData = localStorage.getItem(key);
    currentUser = JSON.parse(userData);
    levelCompleted = currentUser.completedLevels || {};
    checkAdblock();
}

function checkAdblock() {
    const testAd = document.createElement('div');
    testAd.className = 'adsbox';
    testAd.style.position = 'absolute';
    testAd.style.left = '-1000px';
    document.body.appendChild(testAd);
    
    setTimeout(() => {
        const isBlocked = testAd.offsetHeight === 0;
        document.body.removeChild(testAd);
        if (isBlocked) {
            document.getElementById('adblockWarning').classList.remove('hidden');
        } else {
            document.getElementById('adblockWarning').classList.add('hidden');
            showGameScreen();
        }
    }, 100);
}

function showGameScreen() {
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    document.getElementById('adminPanel').classList.remove('active');
    document.getElementById('userKeyDisplay').textContent = currentUser.key;
    updatePointsDisplay();
    startLevel(1);
}

// ADMIN PANEL
function showAdminPanel() {
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('adminPanel').classList.add('active');
    loadAdminData();
}

function loadAdminData() {
    let totalUsers = 0, totalPoints = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('KEY-')) {
            totalUsers++;
            totalPoints += JSON.parse(localStorage.getItem(key)).points || 0;
        }
    }
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalPoints').textContent = totalPoints.toLocaleString();
    loadUsersList();
    loadStockList();
}

function loadUsersList() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    const users = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('KEY-')) users.push(JSON.parse(localStorage.getItem(key)));
    }
    users.sort((a, b) => b.points - a.points);
    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.innerHTML = `<strong>${user.key}</strong> - ${user.points} pts 
                        <button onclick="deleteUser('${user.key}')">🗑️</button>`;
        usersList.appendChild(div);
    });
}

// --- MODIFIÉ : LOAD STOCK LIST (PAYPAL & ROBUX EXEMPLES) ---
function loadStockList() {
    const stockList = document.getElementById('stockList');
    stockList.innerHTML = '';
    const stock = JSON.parse(localStorage.getItem('rewardStock'));
    const deletedIds = JSON.parse(localStorage.getItem('deletedRewardIds')) || [];

    const defaultRewards = [
        { id: 'paypal_050', name: 'PayPal 0.50€ (5000 Coins)' },
        { id: 'paypal_100', name: 'PayPal 1.00€ (10000 Coins)' },
        { id: 'robux_15', name: '15 Robux (15000 Coins)' },
        { id: 'robux_40', name: '40 Robux (40000 Coins)' }
    ];

    const customRewards = JSON.parse(localStorage.getItem('customRewards'));
    const allRewards = [...defaultRewards, ...customRewards].filter(r => !deletedIds.includes(r.id));

    allRewards.forEach(reward => {
        const rStock = stock[reward.id] || { codes: [] };
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.innerHTML = `
            <div class="admin-item-header">
                <strong>${reward.name}</strong>
                <button class="btn btn-small" style="background:#ff4d4d; color:white;" onclick="deleteReward('${reward.id}')">❌ Retirer</button>
            </div>
            <div class="admin-item-info">
                Stock: ${rStock.codes.length} | <button onclick="viewCodes('${reward.id}')">👁️ Voir</button><br>
                <textarea id="codes_${reward.id}" placeholder="Ajouter un code/lien par ligne..."></textarea>
                <button onclick="addCodesToStock('${reward.id}')">➕ Ajouter</button>
            </div>`;
        stockList.appendChild(div);
    });
}

function addCodesToStock(rewardId) {
    const textarea = document.getElementById(`codes_${rewardId}`);
    const newCodes = textarea.value.trim().split('\n').filter(c => c.trim() !== '');
    if (newCodes.length === 0) return alert('Entrez des codes !');
    
    const stock = JSON.parse(localStorage.getItem('rewardStock'));
    if (!stock[rewardId]) stock[rewardId] = { codes: [] };
    stock[rewardId].codes.push(...newCodes);
    stock[rewardId].quantity = stock[rewardId].codes.length;
    
    localStorage.setItem('rewardStock', JSON.stringify(stock));
    textarea.value = '';
    loadStockList();
}

function deleteReward(rewardId) {
    if (!confirm('Retirer cette offre ?')) return;
    const deletedIds = JSON.parse(localStorage.getItem('deletedRewardIds')) || [];
    deletedIds.push(rewardId);
    localStorage.setItem('deletedRewardIds', JSON.stringify(deletedIds));
    loadStockList();
}

function deleteUser(key) {
    if (confirm(`Supprimer ${key} ?`)) {
        localStorage.removeItem(key);
        loadAdminData();
    }
}

// GAMEPLAY
function updatePointsDisplay() {
    document.getElementById('userPoints').textContent = currentUser.points;
}

function startLevel(level) {
    currentLevel = level;
    document.getElementById('currentLevel').textContent = level;
    document.getElementById('currentStreak').textContent = currentStreak;
    generateColorGrid(level);
}

function generateColorGrid(level) {
    const grid = document.getElementById('gameGrid');
    grid.innerHTML = '';
    const difficulty = Math.max(1, 51 - (level * 5));
    const baseColor = { r: Math.floor(Math.random() * 256), g: Math.floor(Math.random() * 256), b: Math.floor(Math.random() * 256) };
    correctIndex = Math.floor(Math.random() * 9);

    for (let i = 0; i < 9; i++) {
        const box = document.createElement('div');
        box.className = 'color-box';
        if (i === correctIndex) {
            box.style.backgroundColor = `rgb(${Math.min(255, baseColor.r + difficulty)}, ${Math.min(255, baseColor.g + difficulty)}, ${Math.min(255, baseColor.b + difficulty)})`;
        } else {
            box.style.backgroundColor = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
        }
        box.onclick = () => checkAnswer(i);
        grid.appendChild(box);
    }
}

function checkAnswer(index) {
    if (index === correctIndex) {
        currentStreak++;
        let p = levelCompleted[currentLevel] ? 2 : 5;
        levelCompleted[currentLevel] = true;
        currentUser.points += p;
        currentUser.completedLevels = levelCompleted;
        saveUser();
        updatePointsDisplay();
        if (currentStreak % 5 === 0) showRewardCheck();
        else setTimeout(() => startLevel(currentLevel + 1), 1000);
    } else {
        alert('Raté ! Retour au niveau 1.');
        currentLevel = 1; currentStreak = 0;
        startLevel(1);
    }
}

function showRewardCheck() { document.getElementById('rewardCheckModal').classList.remove('hidden'); }
function validateProgress() { document.getElementById('rewardCheckModal').classList.add('hidden'); startLevel(currentLevel + 1); }
function saveUser() { localStorage.setItem(currentUser.key, JSON.stringify(currentUser)); }

// REWARDS SYSTEM
function showRewards() {
    const modal = document.getElementById('rewardsModal');
    const list = document.getElementById('rewardsList');
    const deletedIds = JSON.parse(localStorage.getItem('deletedRewardIds')) || [];
    const stock = JSON.parse(localStorage.getItem('rewardStock'));

    const defaultRewards = [
        { id: 'paypal_050', name: 'PayPal 0.50€', points: 5000, desc: 'Argent direct' },
        { id: 'paypal_100', name: 'PayPal 1.00€', points: 10000, desc: 'Argent direct' },
        { id: 'robux_15', name: '15 Robux', points: 15000, desc: 'Via Game Pass' },
        { id: 'robux_40', name: '40 Robux', points: 40000, desc: 'Via Game Pass' }
    ];

    const customRewards = JSON.parse(localStorage.getItem('customRewards'));
    const all = [...defaultRewards, ...customRewards].filter(r => !deletedIds.includes(r.id));

    list.innerHTML = '';
    all.forEach(reward => {
        const rStock = stock[reward.id] || { codes: [] };
        const qty = rStock.codes.length;
        const div = document.createElement('div');
        div.className = `reward-card ${qty === 0 || currentUser.points < reward.points ? 'unavailable' : ''}`;
        div.innerHTML = `<strong>${reward.name}</strong><br>${reward.points} pts<br>Stock: ${qty}`;
        if (qty > 0 && currentUser.points >= reward.points) div.onclick = () => selectReward(reward);
        list.appendChild(div);
    });
    modal.classList.remove('hidden');
}

// --- MODIFIÉ : SELECT REWARD (DEMANDE MAIL OU GAME PASS) ---
let selectedReward = null;
function selectReward(reward) {
    selectedReward = reward;
    document.getElementById('selectedRewardName').value = reward.name;
    document.getElementById('withdrawPoints').value = reward.points + ' points';
    
    const emailInput = document.getElementById('withdrawEmail');
    if (reward.id.includes('paypal')) {
        emailInput.placeholder = "Votre Email PayPal";
    } else if (reward.id.includes('robux')) {
        emailInput.placeholder = "Lien de votre Game Pass Roblox";
    }
    
    document.getElementById('withdrawFormCard').style.display = 'block';
}

// --- MODIFIÉ : SUBMIT WITHDRAW (VERIFIE MAIL OU LIEN) ---
function submitWithdraw() {
    if (!selectedReward) return;
    const input = document.getElementById('withdrawEmail').value.trim();
    
    if (selectedReward.id.includes('paypal') && !input.includes('@')) {
        return alert('Veuillez entrer un Email PayPal valide !');
    }
    if (selectedReward.id.includes('robux') && !input.includes('roblox.com')) {
        return alert('Veuillez créer un Game Pass et coller le LIEN Roblox !');
    }

    const stock = JSON.parse(localStorage.getItem('rewardStock'));
    const rStock = stock[selectedReward.id];
    
    if (!rStock || rStock.codes.length === 0) return alert('Plus de stock !');

    const code = rStock.codes.shift();
    localStorage.setItem('rewardStock', JSON.stringify(stock));

    const history = JSON.parse(localStorage.getItem('withdrawalHistory'));
    history.push({
        userKey: currentUser.key,
        reward: selectedReward.name,
        info: input,
        code: code,
        date: Date.now()
    });
    localStorage.setItem('withdrawalHistory', JSON.stringify(history));

    alert(`✅ SUCCÈS !\n\nRécompense : ${selectedReward.name}\n${selectedReward.id.includes('robux') ? 'Game Pass' : 'Email'} : ${input}\nCode/Lien : ${code}`);
    showRewards();
}

function showAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    if(tabName === 'users') document.getElementById('usersTab').classList.add('active');
    if(tabName === 'stock') {
        document.getElementById('stockTab').classList.add('active');
        loadStockList();
    }
}

function closeRewards() { document.getElementById('rewardsModal').classList.add('hidden'); }

function logout() {
    if (confirm('Déconnexion ?')) location.reload();
}

window.onload = function() {
    document.getElementById('authScreen').classList.add('active');
};