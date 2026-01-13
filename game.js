/**
 * ==============================================================================
 * PROJET : COLOR VISION TEST - REWARDS SYSTEM (ULTRA VERSION)
 * VERSION : 4.0.0
 * SECTIONS : AUTH, GAMEPLAY, BOUTIQUE, ADMIN, ANALYTICS
 * TOTAL ESTIMÉ : ~700 LIGNES DE CODE AVEC STRUCTURE ÉTENDUE
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// 1. ÉTAT GLOBAL ET VARIABLES DE SESSION
// ------------------------------------------------------------------------------
let currentUser = null;
let currentLevel = 1;
let currentStreak = 0;
let correctIndex = 0;
let levelCompleted = {};
let validationsPending = 0;
let isAdmin = false;
let sessionStartTime = Date.now();

// Sécurité Admin
const ADMIN_PASSWORD = '1772';

// ------------------------------------------------------------------------------
// 2. MOTEUR DE STOCKAGE ET BASE DE DONNÉES LOCALE
// ------------------------------------------------------------------------------
function initializeFullDatabase() {
    console.log("%c Initialisation de la Base de Données...", "color: #8a2be2; font-weight: bold;");

    // Initialisation du Stock (Strictement PayPal et Robux)
    if (!localStorage.getItem('rewardStock')) {
        const initialStock = {
            'paypal_050': { quantity: 0, codes: [], name: "PayPal 0.50€" },
            'paypal_100': { quantity: 0, codes: [], name: "PayPal 1.00€" },
            'paypal_500': { quantity: 0, codes: [], name: "PayPal 5.00€" },
            'robux_15': { quantity: 0, codes: [], name: "15 Robux" },
            'robux_40': { quantity: 0, codes: [], name: "40 Robux" },
            'robux_100': { quantity: 0, codes: [], name: "100 Robux" }
        };
        localStorage.setItem('rewardStock', JSON.stringify(initialStock));
    }

    // Récompenses personnalisées injectées par l'admin
    if (!localStorage.getItem('customRewards')) {
        localStorage.setItem('customRewards', JSON.stringify([]));
    }

    // IDs supprimés pour nettoyer la boutique (Anciennes offres)
    if (!localStorage.getItem('deletedRewardIds')) {
        const oldLegacy = ['microsoft', 'amazon', 'steam', 'googleplay'];
        localStorage.setItem('deletedRewardIds', JSON.stringify(oldLegacy));
    }

    // Historique global des transactions utilisateur
    if (!localStorage.getItem('withdrawalHistory')) {
        localStorage.setItem('withdrawalHistory', JSON.stringify([]));
    }
    
    console.log("%c Base de Données Prête !", "color: #00ff88; font-weight: bold;");
}

initializeFullDatabase();

// ------------------------------------------------------------------------------
// 3. SYSTÈME D'AUTHENTIFICATION AVANCÉ
// ------------------------------------------------------------------------------

function generateUniqueKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'KEY-';
    for (let i = 0; i < 10; i++) { // Clé légèrement plus longue pour la sécurité
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

function showCreateAccount() {
    const loginForm = document.getElementById('loginForm');
    const createForm = document.getElementById('createAccountForm');
    if(loginForm) loginForm.classList.add('hidden');
    if(createForm) createForm.classList.remove('hidden');
    document.getElementById('keyDisplay').classList.add('hidden');
}

function showLogin() {
    const loginForm = document.getElementById('loginForm');
    const createForm = document.getElementById('createAccountForm');
    if(createForm) createForm.classList.add('hidden');
    if(loginForm) loginForm.classList.remove('hidden');
    document.getElementById('keyDisplay').classList.add('hidden');
}

function createAccount() {
    const key = generateUniqueKey();
    const newUser = {
        key: key,
        points: 0,
        maxLevel: 1,
        completedLevels: {},
        createdAt: new Date().toISOString(),
        totalGamesPlayed: 0,
        isVerified: true
    };
    
    localStorage.setItem(key, JSON.stringify(newUser));
    
    document.getElementById('generatedKey').textContent = key;
    document.getElementById('createAccountForm').classList.add('hidden');
    document.getElementById('keyDisplay').classList.remove('hidden');
}

function continueToGame() {
    const key = document.getElementById('generatedKey').textContent;
    loadUser(key);
}

function login() {
    const rawInput = document.getElementById('keyInput').value;
    const input = rawInput ? rawInput.trim() : "";
    
    if (!input) {
        alert('Action requise : Veuillez entrer votre clé d\'accès.');
        return;
    }
    
    // Vérification de l'accès Administrateur
    if (input === ADMIN_PASSWORD) {
        isAdmin = true;
        console.warn("Accès Admin détecté.");
        showAdminPanel();
        return;
    }
    
    const key = input.toUpperCase();
    const userData = localStorage.getItem(key);
    
    if (!userData) {
        alert('Erreur : Cette clé n\'existe pas dans notre base de données.');
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
    
    console.log("Utilisateur chargé : " + currentUser.key);
    checkAdblockSecurity();
}

// ------------------------------------------------------------------------------
// 4. SÉCURITÉ ADBLOCK (BYPASS STABLE)
// ------------------------------------------------------------------------------
function checkAdblockSecurity() {
    const adTestContainer = document.createElement('div');
    adTestContainer.innerHTML = '&nbsp;';
    adTestContainer.className = 'adsbox ad-zone ad-space banner-ads';
    adTestContainer.style.position = 'absolute';
    adTestContainer.style.left = '-5000px';
    adTestContainer.style.top = '-5000px';
    document.body.appendChild(adTestContainer);
    
    // Petit délai pour laisser au navigateur le temps de bloquer l'élément
    setTimeout(() => {
        const isBlocked = adTestContainer.offsetHeight === 0 || adTestContainer.clientHeight === 0;
        document.body.removeChild(adTestContainer);
        
        if (isBlocked) {
            console.log("Système : Bloqueur détecté. Bypass en cours...");
        }
        
        // CORRECTION : On ignore le résultat du test pour ne jamais bloquer l'utilisateur
        const warning = document.getElementById('adblockWarning');
        if(warning) warning.classList.add('hidden');
        
        launchGameInterface();
    }, 200);
}

// ------------------------------------------------------------------------------
// 5. MOTEUR DE JEU (LOGIQUE DU COLOR TEST)
// ------------------------------------------------------------------------------

function launchGameInterface() {
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    document.getElementById('adminPanel').classList.remove('active');
    
    const keyDisp = document.getElementById('userKeyDisplay');
    if(keyDisp) keyDisp.textContent = currentUser.key;
    
    refreshUI();
    generateNewLevel(1);
}

function generateNewLevel(level) {
    currentLevel = level;
    document.getElementById('currentLevel').textContent = level;
    document.getElementById('currentStreak').textContent = currentStreak;
    
    const statusText = document.getElementById('gameStatus');
    if(statusText) statusText.textContent = "Niveau " + level + " : Trouvez la case unique !";
    
    renderGrid(level);
}

function renderGrid(level) {
    const grid = document.getElementById('gameGrid');
    if(!grid) return;
    grid.innerHTML = '';
    
    // Difficulté progressive : l'écart diminue à chaque niveau
    const gap = Math.max(1, 52 - (level * 4));
    
    const r = Math.floor(Math.random() * 200);
    const g = Math.floor(Math.random() * 200);
    const b = Math.floor(Math.random() * 200);
    
    correctIndex = Math.floor(Math.random() * 9);
    
    for (let i = 0; i < 9; i++) {
        const tile = document.createElement('div');
        tile.className = 'color-box tile-animation';
        
        if (i === correctIndex) {
            // La case à trouver est légèrement plus claire
            tile.style.backgroundColor = `rgb(${r + gap}, ${g + gap}, ${b + gap})`;
        } else {
            tile.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        }
        
        tile.onclick = () => processChoice(i);
        grid.appendChild(tile);
    }
}

function processChoice(index) {
    if (index === correctIndex) {
        currentStreak++;
        
        // Attribution des Coins (Points)
        let rewardAmount = levelCompleted[currentLevel] ? 2 : 5;
        
        if (!levelCompleted[currentLevel]) {
            levelCompleted[currentLevel] = true;
            currentUser.completedLevels = levelCompleted;
        }
        
        currentUser.points += rewardAmount;
        if (currentLevel > currentUser.maxLevel) currentUser.maxLevel = currentLevel;
        
        refreshUI();
        syncUserToStorage();
        
        // Vérification toutes les 5 victoires d'affilée
        if (currentStreak > 0 && currentStreak % 5 === 0) {
            setTimeout(() => triggerAntiBotModal(), 300);
        } else {
            setTimeout(() => generateNewLevel(currentLevel + 1), 500);
        }
    } else {
        triggerGameOver();
    }
}

function triggerGameOver() {
    alert('Dommage ! Votre vision vous a trompé.\nRetour au niveau 1.');
    currentLevel = 1;
    currentStreak = 0;
    generateNewLevel(1);
}

function triggerAntiBotModal() {
    const modal = document.getElementById('rewardCheckModal');
    if(modal) modal.classList.remove('hidden');
}

function validateProgress() {
    document.getElementById('rewardCheckModal').classList.add('hidden');
    generateNewLevel(currentLevel + 1);
}

function refreshUI() {
    const ptsDisp = document.getElementById('userPoints');
    if(ptsDisp) ptsDisp.textContent = currentUser.points;
}

function syncUserToStorage() {
    localStorage.setItem(currentUser.key, JSON.stringify(currentUser));
}

// ------------------------------------------------------------------------------
// 6. SYSTÈME DE BOUTIQUE : PAYPAL & ROBUX (LOGIQUE D'ENVOI)
// ------------------------------------------------------------------------------

function openBoutique() {
    const modal = document.getElementById('rewardsModal');
    const container = document.getElementById('rewardsList');
    
    const stockData = JSON.parse(localStorage.getItem('rewardStock'));
    const hiddenOffers = JSON.parse(localStorage.getItem('deletedRewardIds')) || [];
    
    // DÉFINITION DES OFFRES (Prix demandés par l'utilisateur)
    const activeOffers = [
        { id: 'paypal_050', name: 'PayPal 0.50€', cost: 5000, desc: 'Argent envoyé par Email' },
        { id: 'paypal_100', name: 'PayPal 1.00€', cost: 10000, desc: 'Argent envoyé par Email' },
        { id: 'paypal_500', name: 'PayPal 5.00€', cost: 50000, desc: 'Argent envoyé par Email' },
        { id: 'robux_15', name: '15 Robux', cost: 15000, desc: 'Achat de votre Game Pass' },
        { id: 'robux_40', name: '40 Robux', cost: 40000, desc: 'Achat de votre Game Pass' },
        { id: 'robux_100', name: '100 Robux', cost: 100000, desc: 'Achat de votre Game Pass' }
    ];
    
    // Filtrage des offres masquées par l'admin
    const listToDisplay = activeOffers.filter(off => !hiddenOffers.includes(off.id));
    
    container.innerHTML = '';
    
    listToDisplay.forEach(item => {
        const currentStock = stockData[item.id] ? stockData[item.id].codes.length : 0;
        const card = document.createElement('div');
        const canAfford = currentUser.points >= item.cost && currentStock > 0;
        
        card.className = `reward-card ${!canAfford ? 'unavailable' : 'available-glow'}`;
        card.innerHTML = `
            <div class="reward-content">
                <div class="reward-name">${item.name}</div>
                <div class="reward-desc">${item.desc}</div>
                <div class="reward-cost">${item.cost} Coins</div>
                <div class="reward-stock-label">En Stock: ${currentStock}</div>
            </div>
        `;
        
        if (canAfford) {
            card.onclick = () => prepareWithdrawal(item);
        }
        container.appendChild(card);
    });
    
    document.getElementById('withdrawFormCard').style.display = 'none';
    modal.classList.remove('hidden');
}

let pendingReward = null;

function prepareWithdrawal(reward) {
    pendingReward = reward;
    
    document.getElementById('selectedRewardName').value = reward.name;
    document.getElementById('withdrawPoints').value = reward.cost + " Coins";
    
    const inputArea = document.getElementById('withdrawEmail');
    const labelArea = document.querySelector('label[for="withdrawEmail"]');
    
    // CHANGEMENT DYNAMIQUE : MAIL PAYPAL OU GAMEPASS ROBLOX
    if (reward.id.includes('paypal')) {
        labelArea.textContent = "Adresse Email PayPal :";
        inputArea.placeholder = "exemple@mail.com";
    } else if (reward.id.includes('robux')) {
        labelArea.textContent = "Lien de votre Game Pass Roblox :";
        inputArea.placeholder = "https://www.roblox.com/game-pass/...";
    }
    
    const form = document.getElementById('withdrawFormCard');
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
}

function submitWithdraw() {
    if (!pendingReward) return;
    
    const coordonnees = document.getElementById('withdrawEmail').value.trim();
    
    // Validation stricte PayPal
    if (pendingReward.id.includes('paypal') && !coordonnees.includes('@')) {
        return alert('Erreur : Veuillez entrer un Email PayPal valide.');
    }
    
    // Validation stricte Robux
    if (pendingReward.id.includes('robux') && !coordonnees.includes('roblox.com')) {
        return alert('Erreur : Veuillez entrer un lien de Game Pass Roblox valide.');
    }
    
    if (currentUser.points < pendingReward.cost) {
        return alert('Coins insuffisants pour ce retrait.');
    }
    
    const globalStock = JSON.parse(localStorage.getItem('rewardStock'));
    const specificStock = globalStock[pendingReward.id];
    
    if (!specificStock || specificStock.codes.length === 0) {
        return alert('Rupture de stock momentanée !');
    }

    // TRAITEMENT DU RETRAIT
    const rewardCode = specificStock.codes.shift();
    localStorage.setItem('rewardStock', JSON.stringify(globalStock));
    
    // Mise à jour points utilisateur
    currentUser.points -= pendingReward.cost;
    syncUserToStorage();
    refreshUI();
    
    // Enregistrement dans l'historique admin
    const history = JSON.parse(localStorage.getItem('withdrawalHistory'));
    history.push({
        id: Date.now(),
        userKey: currentUser.key,
        reward: pendingReward.name,
        target: coordonnees,
        codeProvided: rewardCode,
        status: "Validé",
        date: new Date().toLocaleString()
    });
    localStorage.setItem('withdrawalHistory', JSON.stringify(history));
    
    alert(`FÉLICITATIONS !\n\nRécompense : ${pendingReward.name}\nEnvoyé à : ${coordonnees}\nVotre transaction est enregistrée.`);
    
    document.getElementById('withdrawFormCard').style.display = 'none';
    openBoutique(); // Refresh boutique
}

// ------------------------------------------------------------------------------
// 7. PANEL ADMINISTRATEUR (GESTION ET STATISTIQUES)
// ------------------------------------------------------------------------------

function showAdminPanel() {
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('adminPanel').classList.add('active');
    updateAdminStats();
}

function updateAdminStats() {
    let uCount = 0;
    let pTotal = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('KEY-')) {
            uCount++;
            const d = JSON.parse(localStorage.getItem(key));
            pTotal += d.points || 0;
        }
    }
    
    const totalUsersEl = document.getElementById('totalUsers');
    const totalPointsEl = document.getElementById('totalPoints');
    
    if(totalUsersEl) totalUsersEl.textContent = uCount;
    if(totalPointsEl) totalPointsEl.textContent = pTotal.toLocaleString();
    
    renderAdminUserList();
    renderAdminStockManager();
}

function renderAdminUserList() {
    const list = document.getElementById('usersList');
    if(!list) return;
    list.innerHTML = '';
    
    const allUsers = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('KEY-')) allUsers.push(JSON.parse(localStorage.getItem(key)));
    }
    
    // Tri par points décroissants
    allUsers.sort((a, b) => b.points - a.points);
    
    allUsers.forEach(u => {
        const row = document.createElement('div');
        row.className = 'admin-item';
        row.innerHTML = `
            <div class="admin-item-header">
                <strong>Clé: ${u.key}</strong>
                <span>${u.points} Coins</span>
                <button onclick="removeUserAccount('${u.key}')" class="btn-del">🗑️</button>
            </div>
        `;
        list.appendChild(row);
    });
}

function renderAdminStockManager() {
    const container = document.getElementById('stockList');
    if(!container) return;
    container.innerHTML = '';
    
    const stockMap = JSON.parse(localStorage.getItem('rewardStock'));
    const activeIDs = Object.keys(stockMap);
    
    activeIDs.forEach(id => {
        const info = stockMap[id];
        const itemDiv = document.createElement('div');
        itemDiv.className = 'admin-item stock-config';
        itemDiv.innerHTML = `
            <div class="admin-item-header">
                <strong>${info.name || id}</strong>
                <span>Stock: ${info.codes.length}</span>
            </div>
            <div class="admin-item-info">
                <textarea id="input_${id}" class="admin-textarea" placeholder="Ajouter des codes ou instructions (1 par ligne)"></textarea>
                <div class="admin-actions">
                    <button onclick="pushStock('${id}')" class="btn btn-success">Ajouter</button>
                    <button onclick="clearStock('${id}')" class="btn btn-secondary">Vider</button>
                    <button onclick="deleteOffer('${id}')" class="btn btn-logout">Masquer Offre</button>
                </div>
            </div>
        `;
        container.appendChild(itemDiv);
    });
}

function pushStock(id) {
    const area = document.getElementById(`input_${id}`);
    const lines = area.value.trim().split('\n').filter(l => l.length > 0);
    
    if (lines.length === 0) return alert('Veuillez entrer au moins un code.');
    
    const db = JSON.parse(localStorage.getItem('rewardStock'));
    if (!db[id]) db[id] = { codes: [] };
    db[id].codes.push(...lines);
    
    localStorage.setItem('rewardStock', JSON.stringify(db));
    area.value = '';
    renderAdminStockManager();
    alert('Stock mis à jour avec succès.');
}

function clearStock(id) {
    if(!confirm('Vider tout le stock pour ' + id + ' ?')) return;
    const db = JSON.parse(localStorage.getItem('rewardStock'));
    if(db[id]) db[id].codes = [];
    localStorage.setItem('rewardStock', JSON.stringify(db));
    renderAdminStockManager();
}

function deleteOffer(id) {
    if(!confirm('Voulez-vous vraiment masquer cette offre de la boutique ?')) return;
    const deleted = JSON.parse(localStorage.getItem('deletedRewardIds')) || [];
    if(!deleted.includes(id)) deleted.push(id);
    localStorage.setItem('deletedRewardIds', JSON.stringify(deleted));
    renderAdminStockManager();
}

function removeUserAccount(key) {
    if (confirm(`Action Irréversible : Supprimer le compte ${key} ?`)) {
        localStorage.removeItem(key);
        updateAdminStats();
    }
}

// ------------------------------------------------------------------------------
// 8. NAVIGATION ET UTILITAIRES MODAUX
// ------------------------------------------------------------------------------

function showAdminTab(name) {
    const tabs = document.querySelectorAll('.admin-tab-content');
    const buttons = document.querySelectorAll('.admin-tab');
    
    tabs.forEach(t => t.classList.remove('active'));
    buttons.forEach(b => b.classList.remove('active'));
    
    const activeTab = document.getElementById(name + 'Tab');
    if(activeTab) activeTab.classList.add('active');
    
    if (name === 'users') renderAdminUserList();
    if (name === 'stock') renderAdminStockManager();
    if (name === 'rewards') renderGlobalHistory();
}

function renderGlobalHistory() {
    const historyList = document.getElementById('rewardRequestsList');
    const data = JSON.parse(localStorage.getItem('withdrawalHistory')) || [];
    
    historyList.innerHTML = '';
    
    if(data.length === 0) {
        historyList.innerHTML = "<p style='text-align:center;color:gray;'>Aucune demande de retrait.</p>";
        return;
    }

    data.reverse().forEach(entry => {
        const item = document.createElement('div');
        item.className = 'admin-item';
        item.innerHTML = `
            <div style="font-size:0.9em; margin-bottom:5px; color:#aaa;">${entry.date}</div>
            <div>Utilisateur: <strong>${entry.userKey}</strong></div>
            <div>Offre: <span style="color:#00e5ff;">${entry.reward}</span></div>
            <div>Cible: <strong>${entry.target}</strong></div>
            <div style="color:#00ff88;">Code/Instruction: ${entry.codeProvided}</div>
        `;
        historyList.appendChild(item);
    });
}

function closeRewards() {
    document.getElementById('rewardsModal').classList.add('hidden');
}

function logout() {
    if (confirm('Se déconnecter de la session actuelle ?')) {
        location.reload();
    }
}

// ------------------------------------------------------------------------------
// 9. INITIALISATION FINALE AU CHARGEMENT DE LA PAGE
// ------------------------------------------------------------------------------
window.onload = function() {
    console.log("Système Chargé à 100%");
    
    // Force l'affichage de l'écran d'accueil
    const auth = document.getElementById('authScreen');
    const game = document.getElementById('gameScreen');
    const admin = document.getElementById('adminPanel');
    
    if(auth) auth.classList.add('active');
    if(game) game.classList.remove('active');
    if(admin) admin.classList.remove('active');
};

/**
 * FIN DU SCRIPT - COLOR VISION TEST
 * ------------------------------------------------------------------------------
 * Ce code est conçu pour être intégré dans un environnement HTML5/CSS3.
 * Il gère la persistance des données via LocalStorage.
 * ------------------------------------------------------------------------------
 */
