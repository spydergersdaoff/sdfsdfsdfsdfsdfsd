/**
 * ==============================================================================
 * PROJET : COLOR VISION TEST - REWARDS SYSTEM
 * VERSION : 3.0.0 (FINAL STABLE)
 * SYSTÈME : PAYPAL & ROBUX EXCLUSIF
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// 1. ÉTAT GLOBAL DU JEU
// ------------------------------------------------------------------------------
let currentUser = null;
let currentLevel = 1;
let currentStreak = 0;
let correctIndex = 0;
let levelCompleted = {};
let validationsPending = 0;
let isAdmin = false;

// Sécurité
const ADMIN_PASSWORD = '1772';

// ------------------------------------------------------------------------------
// 2. INITIALISATION DE LA BASE DE DONNÉES (LOCALSTORAGE)
// ------------------------------------------------------------------------------
function initializeDatabase() {
    console.log("Initialisation du système de stockage...");

    // Initialisation du Stock (PayPal et Robux uniquement)
    if (!localStorage.getItem('rewardStock')) {
        const initialStock = {
            'paypal_050': { quantity: 0, codes: [] },
            'paypal_100': { quantity: 0, codes: [] },
            'paypal_500': { quantity: 0, codes: [] },
            'robux_15': { quantity: 0, codes: [] },
            'robux_40': { quantity: 0, codes: [] },
            'robux_100': { quantity: 0, codes: [] }
        };
        localStorage.setItem('rewardStock', JSON.stringify(initialStock));
    }

    // Récompenses personnalisées
    if (!localStorage.getItem('customRewards')) {
        localStorage.setItem('customRewards', JSON.stringify([]));
    }

    // Gestion du masquage des anciennes offres (Microsoft, Amazon, etc.)
    if (!localStorage.getItem('deletedRewardIds')) {
        const defaultDeleted = ['microsoft', 'amazon', 'steam', 'googleplay'];
        localStorage.setItem('deletedRewardIds', JSON.stringify(defaultDeleted));
    }

    // Historique des transactions
    if (!localStorage.getItem('withdrawalHistory')) {
        localStorage.setItem('withdrawalHistory', JSON.stringify([]));
    }
}

// Lancement immédiat de l'init
initializeDatabase();

// ------------------------------------------------------------------------------
// 3. SYSTÈME D'AUTHENTIFICATION ET SÉCURITÉ
// ------------------------------------------------------------------------------

function generateKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'KEY-';
    for (let i = 0; i < 8; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

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

function createAccount() {
    const key = generateKey();
    const user = {
        key: key,
        points: 0,
        maxLevel: 0,
        completedLevels: {},
        createdAt: Date.now(),
        lastLogin: Date.now()
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

function login() {
    const input = document.getElementById('keyInput').value.trim();
    
    if (!input) {
        alert('Veuillez entrer votre clé !');
        return;
    }
    
    // Accès Admin
    if (input === ADMIN_PASSWORD) {
        isAdmin = true;
        showAdminPanel();
        return;
    }
    
    const key = input.toUpperCase();
    const userData = localStorage.getItem(key);
    
    if (!userData) {
        alert('Clé introuvable !');
        return;
    }
    
    isAdmin = false;
    loadUser(key);
}

function loadUser(key) {
    const userData = localStorage.getItem(key);
    if (!userData) return;
    
    currentUser = JSON.parse(userData);
    levelCompleted = currentUser.completedLevels || {};
    
    // Vérification Adblock
    checkAdblock();
}

// ------------------------------------------------------------------------------
// 4. DÉTECTION ADBLOCK (VERSION CORRIGÉE POUR ÉVITER LES BLOCAGES)
// ------------------------------------------------------------------------------
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
        
        // Correction : On détecte mais on force l'entrée au jeu
        if (isBlocked) {
            console.warn("Navigateur restrictif détecté. Accès forcé.");
        }
        
        // On cache l'écran d'alerte et on lance le jeu dans tous les cas
        document.getElementById('adblockWarning').classList.add('hidden');
        showGameScreen();
        
    }, 150);
}

// ------------------------------------------------------------------------------
// 5. MOTEUR DE JEU (GAMEPLAY)
// ------------------------------------------------------------------------------

function showGameScreen() {
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    document.getElementById('adminPanel').classList.remove('active');
    document.getElementById('userKeyDisplay').textContent = currentUser.key;
    updatePointsDisplay();
    startLevel(1);
}

function startLevel(level) {
    currentLevel = level;
    document.getElementById('currentLevel').textContent = level;
    document.getElementById('currentStreak').textContent = currentStreak;
    document.getElementById('gameStatus').textContent = 'Trouvez la couleur différente !';
    
    generateColorGrid(level);
}

function generateColorGrid(level) {
    const grid = document.getElementById('gameGrid');
    grid.innerHTML = '';
    
    // Calcul de la difficulté (l'écart de couleur diminue)
    const difficulty = Math.max(1, 51 - (level * 4));
    
    const baseColor = {
        r: Math.floor(Math.random() * 200),
        g: Math.floor(Math.random() * 200),
        b: Math.floor(Math.random() * 200)
    };
    
    correctIndex = Math.floor(Math.random() * 9);
    
    for (let i = 0; i < 9; i++) {
        const box = document.createElement('div');
        box.className = 'color-box';
        
        if (i === correctIndex) {
            box.style.backgroundColor = `rgb(${baseColor.r + difficulty}, ${baseColor.g + difficulty}, ${baseColor.b + difficulty})`;
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
        
        // Gain de points : 5 pour un nouveau niveau, 2 si déjà fait
        let gain = levelCompleted[currentLevel] ? 2 : 5;
        
        if (!levelCompleted[currentLevel]) {
            levelCompleted[currentLevel] = true;
            currentUser.completedLevels = levelCompleted;
        }
        
        currentUser.points += gain;
        updatePointsDisplay();
        saveUser();
        
        // Modal de vérification tous les 5 niveaux (Simule une pub)
        if (currentStreak > 0 && currentStreak % 5 === 0) {
            setTimeout(() => showRewardCheck(), 400);
        } else {
            setTimeout(() => startLevel(currentLevel + 1), 600);
        }
    } else {
        alert('Erreur ! Retour au niveau 1.');
        currentLevel = 1;
        currentStreak = 0;
        startLevel(1);
    }
}

function showRewardCheck() {
    document.getElementById('rewardCheckModal').classList.remove('hidden');
}

function validateProgress() {
    document.getElementById('rewardCheckModal').classList.add('hidden');
    startLevel(currentLevel + 1);
}

function updatePointsDisplay() {
    document.getElementById('userPoints').textContent = currentUser.points;
}

function saveUser() {
    localStorage.setItem(currentUser.key, JSON.stringify(currentUser));
}

// ------------------------------------------------------------------------------
// 6. SYSTÈME DE BOUTIQUE (PAYPAL & ROBUX)
// ------------------------------------------------------------------------------

function showRewards() {
    const modal = document.getElementById('rewardsModal');
    const rewardsList = document.getElementById('rewardsList');
    
    const stock = JSON.parse(localStorage.getItem('rewardStock'));
    const deletedIds = JSON.parse(localStorage.getItem('deletedRewardIds')) || [];
    
    // LISTE DES OFFRES
    const shopItems = [
        { id: 'paypal_050', name: 'PayPal 0.50€', points: 5000, type: 'money' },
        { id: 'paypal_100', name: 'PayPal 1.00€', points: 10000, type: 'money' },
        { id: 'robux_15', name: '15 Robux', points: 15000, type: 'robux' },
        { id: 'robux_40', name: '40 Robux', points: 40000, type: 'robux' }
    ];
    
    const activeItems = shopItems.filter(item => !deletedIds.includes(item.id));
    
    rewardsList.innerHTML = '';
    
    activeItems.forEach(item => {
        const itemStock = stock[item.id] || { codes: [] };
        const available = itemStock.codes.length;
        
        const card = document.createElement('div');
        const canBuy = currentUser.points >= item.points && available > 0;
        
        card.className = `reward-card ${!canBuy ? 'unavailable' : ''}`;
        card.innerHTML = `
            <div class="reward-name">${item.name}</div>
            <div class="reward-points">${item.points} Coins</div>
            <div class="reward-stock">Stock: ${available}</div>
        `;
        
        if (canBuy) card.onclick = () => selectReward(item);
        rewardsList.appendChild(card);
    });
    
    document.getElementById('withdrawFormCard').style.display = 'none';
    modal.classList.remove('hidden');
}

let selectedReward = null;

function selectReward(reward) {
    selectedReward = reward;
    document.getElementById('selectedRewardName').value = reward.name;
    document.getElementById('withdrawPoints').value = reward.points + ' Coins';
    
    const input = document.getElementById('withdrawEmail');
    
    // Logique de saisie dynamique
    if (reward.id.includes('paypal')) {
        input.placeholder = "Entrez votre EMAIL PayPal";
        document.querySelector('label[for="withdrawEmail"]').textContent = "Votre Email PayPal :";
    } else {
        input.placeholder = "Lien de votre Game Pass Roblox";
        document.querySelector('label[for="withdrawEmail"]').textContent = "Lien du Game Pass :";
    }
    
    document.getElementById('withdrawFormCard').style.display = 'block';
}

function submitWithdraw() {
    if (!selectedReward) return;
    
    const userInput = document.getElementById('withdrawEmail').value.trim();
    
    // Validation des entrées
    if (selectedReward.id.includes('paypal') && !userInput.includes('@')) {
        return alert('Veuillez entrer une adresse email valide !');
    }
    
    if (selectedReward.id.includes('robux') && !userInput.includes('roblox.com')) {
        return alert('Veuillez coller un lien Game Pass valide (Roblox.com) !');
    }
    
    if (currentUser.points < selectedReward.points) return alert('Points insuffisants !');
    
    const stock = JSON.parse(localStorage.getItem('rewardStock'));
    const rStock = stock[selectedReward.id];
    
    if (!rStock || rStock.codes.length === 0) return alert('Désolé, plus de stock !');

    // Retrait du stock
    const deliveredCode = rStock.codes.shift();
    localStorage.setItem('rewardStock', JSON.stringify(stock));
    
    // Déduction des points
    currentUser.points -= selectedReward.points;
    saveUser();
    updatePointsDisplay();
    
    // Historique
    const history = JSON.parse(localStorage.getItem('withdrawalHistory'));
    history.push({
        user: currentUser.key,
        reward: selectedReward.name,
        info: userInput,
        code: deliveredCode,
        date: Date.now()
    });
    localStorage.setItem('withdrawalHistory', JSON.stringify(history));
    
    alert(`DEMANDE ENVOYÉE !\n\nRécompense : ${selectedReward.name}\nDestinataire : ${userInput}\n\nNote : Votre code/lien a été enregistré.`);
    
    document.getElementById('withdrawFormCard').style.display = 'none';
    showRewards();
}

// ------------------------------------------------------------------------------
// 7. DASHBOARD ADMIN
// ------------------------------------------------------------------------------

function showAdminPanel() {
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('adminPanel').classList.add('active');
    loadAdminData();
}

function loadAdminData() {
    let totalUsers = 0;
    let totalPoints = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('KEY-')) {
            totalUsers++;
            totalPoints += JSON.parse(localStorage.getItem(key)).points || 0;
        }
    }
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalPoints').textContent = totalPoints;
    loadUsersList();
    loadStockList();
}

function loadUsersList() {
    const list = document.getElementById('usersList');
    list.innerHTML = '';
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('KEY-')) {
            const u = JSON.parse(localStorage.getItem(key));
            const div = document.createElement('div');
            div.className = 'admin-item';
            div.innerHTML = `<strong>${u.key}</strong> - ${u.points} pts <button onclick="deleteUser('${u.key}')">🗑️</button>`;
            list.appendChild(div);
        }
    }
}

function loadStockList() {
    const list = document.getElementById('stockList');
    list.innerHTML = '';
    const stock = JSON.parse(localStorage.getItem('rewardStock'));
    
    const rewards = [
        { id: 'paypal_050', name: 'PayPal 0.50€' },
        { id: 'paypal_100', name: 'PayPal 1.00€' },
        { id: 'robux_15', name: '15 Robux' },
        { id: 'robux_40', name: '40 Robux' }
    ];
    
    rewards.forEach(r => {
        const count = stock[r.id] ? stock[r.id].codes.length : 0;
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.innerHTML = `
            <strong>${r.name}</strong> (Stock: ${count})<br>
            <textarea id="add_${r.id}" placeholder="Un code par ligne"></textarea>
            <button onclick="addStock('${r.id}')">Ajouter</button>
        `;
        list.appendChild(div);
    });
}

function addStock(id) {
    const val = document.getElementById(`add_${id}`).value.trim();
    if (!val) return;
    const newCodes = val.split('\n');
    const stock = JSON.parse(localStorage.getItem('rewardStock'));
    if (!stock[id]) stock[id] = { codes: [] };
    stock[id].codes.push(...newCodes);
    localStorage.setItem('rewardStock', JSON.stringify(stock));
    loadStockList();
}

function deleteUser(key) {
    if (confirm('Supprimer cet utilisateur ?')) {
        localStorage.removeItem(key);
        loadAdminData();
    }
}

function closeRewards() {
    document.getElementById('rewardsModal').classList.add('hidden');
}

function logout() {
    location.reload();
}

window.onload = () => {
    document.getElementById('authScreen').classList.add('active');
};
