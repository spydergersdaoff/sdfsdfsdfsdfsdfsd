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
        'microsoft': { quantity: 0, codes: [] },
        'amazon': { quantity: 0, codes: [] },
        'paypal': { quantity: 0, codes: [] },
        'steam': { quantity: 0, codes: [] },
        'googleplay': { quantity: 0, codes: [] }
    };
    localStorage.setItem('rewardStock', JSON.stringify(initialStock));
}

// Initialize custom rewards
if (!localStorage.getItem('customRewards')) {
    localStorage.setItem('customRewards', JSON.stringify([]));
}

// --- AJOUT : Initialisation des IDs supprimés ---
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

// Show create account form
function showCreateAccount() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('createAccountForm').classList.remove('hidden');
    document.getElementById('keyDisplay').classList.add('hidden');
}

// Show login form
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
    
    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(user));
    
    // Display key
    document.getElementById('generatedKey').textContent = key;
    document.getElementById('createAccountForm').classList.add('hidden');
    document.getElementById('keyDisplay').classList.remove('hidden');
}

// Continue to game after account creation
function continueToGame() {
    const key = document.getElementById('generatedKey').textContent;
    loadUser(key);
}

// Login
function login() {
    const input = document.getElementById('keyInput').value.trim();
    
    if (!input) {
        alert('Veuillez entrer votre clé ou mot de passe!');
        return;
    }
    
    // Check if admin password
    if (input === ADMIN_PASSWORD) {
        isAdmin = true;
        showAdminPanel();
        return;
    }
    
    const key = input.toUpperCase();
    
    if (!key.startsWith('KEY-')) {
        alert('Format de clé invalide! La clé doit commencer par KEY- ou utilisez le mot de passe admin.');
        return;
    }
    
    const userData = localStorage.getItem(key);
    if (!userData) {
        alert('Clé invalide! Aucun compte trouvé.');
        return;
    }
    
    isAdmin = false;
    loadUser(key);
}

// Load user
function loadUser(key) {
    const userData = localStorage.getItem(key);
    if (!userData) {
        alert('Erreur de chargement du compte');
        return;
    }
    
    currentUser = JSON.parse(userData);
    levelCompleted = currentUser.completedLevels || {};
    
    // Check for adblock before showing game
    checkAdblock();
}

// Check AdBlock
function checkAdblock() {
    const testAd = document.createElement('div');
    testAd.innerHTML = '&nbsp;';
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

// Show game screen
function showGameScreen() {
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    document.getElementById('adminPanel').classList.remove('active');
    document.getElementById('userKeyDisplay').textContent = currentUser.key;
    updatePointsDisplay();
    startLevel(1);
}

// Show admin panel
function showAdminPanel() {
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('adminPanel').classList.add('active');
    
    loadAdminData();
}

// Load admin data
function loadAdminData() {
    // Count users
    let totalUsers = 0;
    let totalPoints = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('KEY-')) {
            totalUsers++;
            const userData = JSON.parse(localStorage.getItem(key));
            totalPoints += userData.points || 0;
        }
    }
    
    // --- CORRECTION : Calcul du nombre de demandes réelles ---
    const history = JSON.parse(localStorage.getItem('withdrawalHistory')) || [];
    const totalDemandes = history.length;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalPoints').textContent = totalPoints.toLocaleString();
    
    // On met à jour le badge des demandes (assure-toi que l'ID est 'pendingRewards' ou 'totalRewards')
    const pendingEl = document.getElementById('pendingRewards');
    if (pendingEl) {
        pendingEl.textContent = totalDemandes;
    }
    
    loadUsersList();
    loadStockList();
}
// Load users list
function loadUsersList() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    
    const users = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('KEY-')) {
            const userData = JSON.parse(localStorage.getItem(key));
            users.push(userData);
        }
    }
    
    // Sort by points
    users.sort((a, b) => b.points - a.points);
    
    if (users.length === 0) {
        usersList.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">Aucun utilisateur</p>';
        return;
    }
    
    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.innerHTML = `
            <div class="admin-item-header">
                <div class="admin-item-title">${user.key}</div>
                <button class="btn btn-small btn-logout" onclick="deleteUser('${user.key}')">🗑️ Supprimer</button>
            </div>
            <div class="admin-item-info">
                Points: <strong>${user.points}</strong><br>
                Niveau Max: <strong>${user.maxLevel}</strong><br>
                Créé le: <strong>${new Date(user.createdAt).toLocaleString()}</strong>
            </div>
        `;
        usersList.appendChild(div);
    });
}

// Load stock list
function loadStockList() {
    const stockList = document.getElementById('stockList');
    stockList.innerHTML = '';
    
    const stock = JSON.parse(localStorage.getItem('rewardStock'));
    const customRewards = JSON.parse(localStorage.getItem('customRewards'));
    const deletedIds = JSON.parse(localStorage.getItem('deletedRewardIds')) || [];
    
    // Uniquement PayPal et Robux avec plusieurs montants
    const defaultRewards = [
        { id: 'paypal_050', name: 'PayPal 0.50€ (5000 Coins)' },
        { id: 'paypal_100', name: 'PayPal 1.00€ (10000 Coins)' },
        { id: 'paypal_500', name: 'PayPal 5.00€ (50000 Coins)' },
        { id: 'robux_15', name: '15 Robux (15000 Coins)' },
        { id: 'robux_40', name: '40 Robux (40000 Coins)' },
        { id: 'robux_100', name: '100 Robux (100000 Coins)' }
    ];
    
    const allRewards = [...defaultRewards, ...customRewards].filter(r => !deletedIds.includes(r.id));
    
    allRewards.forEach(reward => {
        const rewardStock = stock[reward.id] || { quantity: 0, codes: [] };
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.innerHTML = `
            <div class="admin-item-header">
                <div class="admin-item-title">${reward.name}</div>
                <button class="btn btn-small" style="background: #ff4d4d; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px;" onclick="deleteReward('${reward.id}')">❌ Retirer</button>
            </div>
            <div class="admin-item-info">
                <strong>Stock: ${rewardStock.codes.length} codes disponibles</strong><br><br>
                <textarea id="codes_${reward.id}" class="form-input" placeholder="Collez vos codes ou liens ici (un par ligne)..." rows="3" style="width:100%; margin-bottom:5px;"></textarea>
                <button class="btn btn-small btn-success" onclick="addCodesToStock('${reward.id}')">➕ Ajouter au Stock</button>
            </div>
        `;
        stockList.appendChild(div);
    });
}

// Add codes to stock
function addCodesToStock(rewardId) {
    const textarea = document.getElementById(`codes_${rewardId}`);
    const codesText = textarea.value.trim();
    
    if (!codesText) {
        alert('Veuillez entrer au moins un code ou lien!');
        return;
    }
    
    const newCodes = codesText.split('\n').filter(code => code.trim() !== '');
    
    const stock = JSON.parse(localStorage.getItem('rewardStock'));
    if (!stock[rewardId]) {
        stock[rewardId] = { quantity: 0, codes: [] };
    }
    
    stock[rewardId].codes.push(...newCodes);
    stock[rewardId].quantity = stock[rewardId].codes.length;
    
    localStorage.setItem('rewardStock', JSON.stringify(stock));
    
    alert(`✅ ${newCodes.length} code(s) ajouté(s) avec succès!`);
    textarea.value = '';
    loadStockList();
    loadAdminData();
}

// View codes
function viewCodes(rewardId) {
    const stock = JSON.parse(localStorage.getItem('rewardStock'));
    const rewardStock = stock[rewardId];
    
    if (!rewardStock || rewardStock.codes.length === 0) {
        alert('Aucun code disponible pour cette récompense.');
        return;
    }
    
    const codesList = rewardStock.codes.map((code, index) => `${index + 1}. ${code}`).join('\n');
    alert(`Codes disponibles (${rewardStock.codes.length}):\n\n${codesList}`);
}

// Create new reward
function createNewReward() {
    const name = document.getElementById('newRewardName').value.trim();
    const desc = document.getElementById('newRewardDesc').value.trim();
    const points = parseInt(document.getElementById('newRewardPoints').value);
    
    if (!name || !desc || !points) {
        alert('Veuillez remplir tous les champs!');
        return;
    }
    
    const customRewards = JSON.parse(localStorage.getItem('customRewards'));
    const id = 'custom_' + Date.now();
    
    customRewards.push({
        id: id,
        name: name,
        desc: desc,
        points: points
    });
    
    localStorage.setItem('customRewards', JSON.stringify(customRewards));
    
    // Initialize stock for this reward
    const stock = JSON.parse(localStorage.getItem('rewardStock'));
    stock[id] = { quantity: 0, codes: [] };
    localStorage.setItem('rewardStock', JSON.stringify(stock));
    
    alert('✅ Récompense créée avec succès!');
    
    // Clear form
    document.getElementById('newRewardName').value = '';
    document.getElementById('newRewardDesc').value = '';
    document.getElementById('newRewardPoints').value = '';
    
    // Switch to stock tab
    showAdminTab('stock');
}

// --- MODIFIÉ : Supprime ou Masque une récompense ---
function deleteReward(rewardId) {
    if (confirm('Voulez-vous vraiment retirer cette récompense de la boutique ?')) {
        // 1. Ajouter l'ID à la liste des éléments supprimés (pour masquer les trucs par défaut)
        const deletedIds = JSON.parse(localStorage.getItem('deletedRewardIds')) || [];
        if (!deletedIds.includes(rewardId)) {
            deletedIds.push(rewardId);
            localStorage.setItem('deletedRewardIds', JSON.stringify(deletedIds));
        }

        // 2. Si c'est un custom, on le retire aussi de la liste custom
        if (rewardId.startsWith('custom_')) {
            const customRewards = JSON.parse(localStorage.getItem('customRewards'));
            const filtered = customRewards.filter(r => r.id !== rewardId);
            localStorage.setItem('customRewards', JSON.stringify(filtered));
        }
        
        // 3. Nettoyer le stock
        const stock = JSON.parse(localStorage.getItem('rewardStock'));
        delete stock[rewardId];
        localStorage.setItem('rewardStock', JSON.stringify(stock));
        
        loadStockList();
        alert('✅ Récompense retirée !');
    }
}

// Delete user
function deleteUser(key) {
    if (confirm(`Supprimer l'utilisateur ${key}?`)) {
        localStorage.removeItem(key);
        loadAdminData();
    }
}

// Get pending rewards
function getPendingRewards() {
    return 0;
}

// Show admin tab
function showAdminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    
    if (tabName === 'users') {
        document.getElementById('usersTab').classList.add('active');
        loadUsersList();
    } else if (tabName === 'rewards') {
        document.getElementById('rewardsTab').classList.add('active');
        loadWithdrawalHistory();
    } else if (tabName === 'stock') {
        document.getElementById('stockTab').classList.add('active');
        loadStockList();
    } else if (tabName === 'create') {
        document.getElementById('createTab').classList.add('active');
    }
}

// Load withdrawal history for admin
function loadWithdrawalHistory() {
    const historyList = document.getElementById('rewardRequestsList');
    const history = JSON.parse(localStorage.getItem('withdrawalHistory'));
    
    historyList.innerHTML = '';
    
    if (!history || history.length === 0) {
        historyList.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">Aucune demande de retrait</p>';
        return;
    }
    
    history.sort((a, b) => b.date - a.date);
    
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.innerHTML = `
            <div class="admin-item-header">
                <div class="admin-item-title">${item.rewardName}</div>
                <span class="stock-badge">${item.status === 'completed' ? 'Complété' : 'En attente'}</span>
            </div>
            <div class="admin-item-info">
                Utilisateur: <strong>${item.userKey}</strong><br>
                Email: <strong>${item.email}</strong><br>
                Points: <strong>${item.points}</strong><br>
                Code donné: <strong style="color: #4caf50;">${item.code}</strong><br>
                Date: <strong>${new Date(item.date).toLocaleString()}</strong>
            </div>
        `;
        historyList.appendChild(div);
    });
}

// Update points display
function updatePointsDisplay() {
    document.getElementById('userPoints').textContent = currentUser.points;
}

// Start level
function startLevel(level) {
    currentLevel = level;
    document.getElementById('currentLevel').textContent = level;
    document.getElementById('currentStreak').textContent = currentStreak;
    document.getElementById('gameStatus').textContent = '';
    
    generateColorGrid(level);
}

// Generate color grid
function generateColorGrid(level) {
    const grid = document.getElementById('gameGrid');
    grid.innerHTML = '';
    
    const difficulty = Math.max(1, 51 - (level * 5));
    const baseColor = {
        r: Math.floor(Math.random() * 256),
        g: Math.floor(Math.random() * 256),
        b: Math.floor(Math.random() * 256)
    };
    
    correctIndex = Math.floor(Math.random() * 9);
    
    for (let i = 0; i < 9; i++) {
        const box = document.createElement('div');
        box.className = 'color-box';
        
        if (i === correctIndex) {
            const diffColor = {
                r: Math.min(255, Math.max(0, baseColor.r + difficulty)),
                g: Math.min(255, Math.max(0, baseColor.g + difficulty)),
                b: Math.min(255, Math.max(0, baseColor.b + difficulty))
            };
            box.style.backgroundColor = `rgb(${diffColor.r}, ${diffColor.g}, ${diffColor.b})`;
        } else {
            box.style.backgroundColor = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
        }
        
        box.onclick = () => checkAnswer(i);
        grid.appendChild(box);
    }
}

// Check answer
function checkAnswer(index) {
    const boxes = document.querySelectorAll('.color-box');
    const statusDiv = document.getElementById('gameStatus');
    
    if (index === correctIndex) {
        boxes[index].classList.add('correct');
        statusDiv.textContent = '✓ Correct!';
        statusDiv.className = 'game-status success';
        
        currentStreak++;
        
        let points = 0;
        if (levelCompleted[currentLevel]) {
            points = 2;
        } else {
            points = 5;
            levelCompleted[currentLevel] = true;
            currentUser.completedLevels = levelCompleted;
            if (currentLevel > currentUser.maxLevel) {
                currentUser.maxLevel = currentLevel;
            }
        }
        
        currentUser.points += points;
        updatePointsDisplay();
        saveUser();
        
        if (currentStreak > 0 && currentStreak % 5 === 0) {
            setTimeout(() => {
                showRewardCheck();
            }, 500);
        } else {
            setTimeout(() => {
                startLevel(currentLevel + 1);
            }, 1000);
        }
    } else {
        boxes[index].classList.add('wrong');
        boxes[correctIndex].classList.add('correct');
        statusDiv.textContent = '✗ Raté! Recommencez.';
        statusDiv.className = 'game-status error';
        
        setTimeout(() => {
            resetGame();
        }, 2000);
    }
}

// Show reward check
function showRewardCheck() {
    document.getElementById('rewardCheckModal').classList.remove('hidden');
}

// Validate progress
function validateProgress() {
    document.getElementById('rewardCheckModal').classList.add('hidden');
    startLevel(currentLevel + 1);
}

// Reset game
function resetGame() {
    currentLevel = 1;
    currentStreak = 0;
    startLevel(1);
}

// Save user
function saveUser() {
    localStorage.setItem(currentUser.key, JSON.stringify(currentUser));
}

// Show rewards
function showRewards() {
    const modal = document.getElementById('rewardsModal');
    const rewardsList = document.getElementById('rewardsList');
    
    document.getElementById('modalUserPoints').textContent = currentUser.points;
    
    const stock = JSON.parse(localStorage.getItem('rewardStock'));
    const customRewards = JSON.parse(localStorage.getItem('customRewards'));
    const deletedIds = JSON.parse(localStorage.getItem('deletedRewardIds')) || [];
    
	const defaultRewards = [
    { id: 'paypal_050', name: 'PayPal 0.50€', points: 5000, desc: 'Argent envoyé sur votre compte PayPal' },
    { id: 'paypal_100', name: 'PayPal 1.00€', points: 10000, desc: 'Argent envoyé sur votre compte PayPal' },
    { id: 'paypal_500', name: 'PayPal 5.00€', points: 50000, desc: 'Argent envoyé sur votre compte PayPal' },
    { id: 'robux_15', name: '15 Robux', points: 15000, desc: 'Code de recharge Robux' },
    { id: 'robux_40', name: '40 Robux', points: 40000, desc: 'Code de recharge Robux' },
    { id: 'robux_100', name: '100 Robux', points: 100000, desc: 'Code de recharge Robux' }
];
    
    // FILTRE ICI AUSSI POUR LA BOUTIQUE JOUEUR
    const allRewards = [...defaultRewards, ...customRewards].filter(r => !deletedIds.includes(r.id));
    
    rewardsList.innerHTML = '';
    
    allRewards.forEach(reward => {
        const rewardStock = stock[reward.id] || { quantity: 0, codes: [] };
        const availableStock = rewardStock.codes ? rewardStock.codes.length : rewardStock.quantity || 0;
        
        const div = document.createElement('div');
        div.className = `reward-card ${availableStock === 0 || currentUser.points < reward.points ? 'unavailable' : ''}`;
        
        if (availableStock > 0 && currentUser.points >= reward.points) {
            div.onclick = () => selectReward({...reward, stock: availableStock});
        }
        
        div.innerHTML = `
            <div class="reward-card-header">
                <div>
                    <div class="reward-name">${reward.name}</div>
                    <div class="reward-description">${reward.desc}</div>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                <div class="reward-points">${reward.points} pts</div>
                <span class="reward-stock ${availableStock === 0 ? 'out' : ''}">
                    ${availableStock > 0 ? `Stock: ${availableStock}` : 'Épuisé'}
                </span>
            </div>
        `;
        
        rewardsList.appendChild(div);
    });
    
    document.getElementById('withdrawFormCard').style.display = 'none';
    showWithdrawTab('withdraw');
    modal.classList.remove('hidden');
}

// Select reward for withdrawal
let selectedReward = null;

function selectReward(reward) {
    selectedReward = reward;
    
    document.getElementById('selectedRewardName').value = reward.name;
    document.getElementById('withdrawPoints').value = reward.points + ' points';
    document.getElementById('withdrawEmail').value = '';
    
    const commission = reward.points * 0.30;
    const willReceive = reward.points - commission;
    
    document.getElementById('commissionDisplay').textContent = `- ${commission} points (30%)`;
    document.getElementById('receiveDisplay').textContent = willReceive + ' points de valeur';
    
    document.getElementById('withdrawFormCard').style.display = 'block';
    document.getElementById('withdrawFormCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Submit withdrawal
function submitWithdraw() {
    if (!selectedReward) {
        alert('Veuillez sélectionner une récompense!');
        return;
    }
    
    const email = document.getElementById('withdrawEmail').value.trim();
    
    if (!email) {
        alert('Veuillez entrer votre email ou identifiant!');
        return;
    }
    
    if (currentUser.points < selectedReward.points) {
        alert('Points insuffisants!');
        return;
    }
    
    const stock = JSON.parse(localStorage.getItem('rewardStock'));
    const rewardStock = stock[selectedReward.id];
    
    if (!rewardStock || !rewardStock.codes || rewardStock.codes.length === 0) {
        alert('❌ Erreur: Aucun code disponible pour cette récompense. Contactez l\'administrateur.');
        return;
    }
    
    const code = rewardStock.codes.shift();
    rewardStock.quantity = rewardStock.codes.length;
    
    localStorage.setItem('rewardStock', JSON.stringify(stock));
    
    const history = JSON.parse(localStorage.getItem('withdrawalHistory'));
    history.push({
        userKey: currentUser.key,
        rewardName: selectedReward.name,
        email: email,
        code: code,
        points: selectedReward.points,
        date: Date.now(),
        status: 'completed'
    });
    localStorage.setItem('withdrawalHistory', JSON.stringify(history));
    
    alert(`✅ RETRAIT RÉUSSI!\n\n🎁 Récompense: ${selectedReward.name}\n\n🔑 Votre Code/Lien:\n${code}\n\n📧 Envoyé à: ${email}\n\n⚠️ Sauvegardez ce code immédiatement!`);
    
    selectedReward = null;
    document.getElementById('withdrawFormCard').style.display = 'none';
    document.getElementById('withdrawEmail').value = '';
    
    showRewards();
}

// Show withdraw tab
function showWithdrawTab(tabName) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.withdraw-tab').forEach(tab => tab.classList.remove('active'));
    
    if (tabName === 'withdraw') {
        document.querySelector('.nav-item:nth-child(1)').classList.add('active');
        document.getElementById('withdrawTab').classList.add('active');
    } else if (tabName === 'history') {
        document.querySelector('.nav-item:nth-child(2)').classList.add('active');
        document.getElementById('historyTab').classList.add('active');
    }
}

// Close rewards modal
function closeRewards() {
    document.getElementById('rewardsModal').classList.add('hidden');
}

// Logout
function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter?')) {
        currentUser = null;
        currentLevel = 1;
        currentStreak = 0;
        levelCompleted = {};
        isAdmin = false;
        
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('adminPanel').classList.remove('active');
        document.getElementById('authScreen').classList.add('active');
        document.getElementById('keyInput').value = '';
        document.getElementById('createAccountForm').classList.add('hidden');
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('keyDisplay').classList.add('hidden');
    }
}

// Initialize
window.onload = function() {
    document.getElementById('authScreen').classList.add('active');
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('adminPanel').classList.remove('active');
};
