// Import game mode classes and graphics handler
import { SpeedDuel, KnowledgeLadder, TeamBattle } from './gameModes.js';
import { BattleGraphics } from './battleGraphics.js';

class BattleGame {
    constructor(gameId) {
        // Store the game's unique identifier
        this.gameId = gameId;
        // Create reference to this game's document in Firebase
        this.gameRef = db.collection('activeGames').doc(gameId);
        // Will store the current player's ID (from Firebase Auth)
        this.playerId = null;
        // Will store the current state of the game (waiting, playing, etc.)
        this.gameState = null;
        // Object to store all players' data
        this.players = {};
        // Will store instance of BattleGraphics for canvas rendering
        this.graphics = null;
        // Will store instance of specific game mode (SpeedDuel, etc.)
        this.gameMode = null;
        
        // Start game initialization
        this.initializeGame();
    }

    async initializeGame() {
        // Set up real-time listeners for game updates
        await this.initializeGameListeners();
        
        // Set up canvas and graphics handling
        const canvas = document.getElementById('battleCanvas');
        this.graphics = new BattleGraphics(canvas);
        
        // Add current player to the game
        await this.joinGame();
        
        // Start the continuous graphics rendering loop
        this.graphics.renderGameScene();
    }

    async initializeGameListeners() {
        // Listen for changes to the main game document
        this.gameRef.onSnapshot((doc) => {
            // Update local game state with Firebase data
            this.gameState = doc.data();
            
            // If game mode hasn't been initialized and we have game data
            if (!this.gameMode && this.gameState) {
                // Create appropriate game mode instance
                this.initializeGameMode(this.gameState.gameMode);
            }
            
            // Update the UI to reflect new game state
            this.updateUI();
        });

        // Listen for changes to the players collection
        this.gameRef.collection('players').onSnapshot((snapshot) => {
            // Process each change in the players collection
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' || change.type === 'modified') {
                    // Add or update player in local players object
                    this.players[change.doc.id] = change.doc.data();
                } else if (change.type === 'removed') {
                    // Remove player from local players object
                    delete this.players[change.doc.id];
                }
            });
            // Update the players list in the UI
            this.updatePlayersList();
        });
    }

    initializeGameMode(mode) {
        // Create instance of appropriate game mode class
        switch(mode) {
            case 'Speed Duel':
                this.gameMode = new SpeedDuel(this.gameRef);
                break;
            case 'Knowledge Ladder':
                this.gameMode = new KnowledgeLadder(this.gameRef);
                break;
            case 'Team Battle':
                this.gameMode = new TeamBattle(this.gameRef);
                break;
        }
    }

    async joinGame() {
        // Check if user is authenticated
        if (!auth.currentUser) {
            throw new Error('User must be authenticated to join game');
        }

        // Store current player's ID
        this.playerId = auth.currentUser.uid;
        
        // Add player to the game in Firebase
        await this.gameRef.collection('players').doc(this.playerId).set({
            name: auth.currentUser.displayName,
            score: 0,
            ready: false,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Set up UI event handlers
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add click handlers for ready and leave buttons
        document.getElementById('readyButton').addEventListener('click', () => this.toggleReady());
        document.getElementById('leaveGame').addEventListener('click', () => this.leaveGame());
    }

    async toggleReady() {
        // Get reference to current player's document
        const playerRef = this.gameRef.collection('players').doc(this.playerId);
        const player = this.players[this.playerId];
        // Toggle ready status in Firebase
        await playerRef.update({ ready: !player.ready });
    }

    async leaveGame() {
        // Remove player from the game
        await this.gameRef.collection('players').doc(this.playerId).delete();
        // Redirect to battles page
        window.location.href = '/battles';
    }

    updateUI() {
        // Update UI based on current game phase
        switch(this.gameState.phase) {
            case 'waiting':
                // Show waiting room while players get ready
                this.showWaitingRoom();
                break;
            case 'question':
                // Show current question when game is active
                this.showQuestion();
                break;
            case 'results':
                // Show results after each question
                this.showResults();
                break;
            case 'gameOver':
                // Show final results when game ends
                this.showFinalResults();
                break;
        }
    }

    showWaitingRoom() {
        // Hide question area while in waiting room
        const questionArea = document.getElementById('questionArea');
        questionArea.style.display = 'none';
        
        // Update players list display
        this.updatePlayersList();
    }

    updatePlayersList() {
        // Get reference to players list container
        const playersList = document.getElementById('playersList');
        // Clear existing list
        playersList.innerHTML = '';
        
        // Create element for each player
        Object.entries(this.players).forEach(([id, player]) => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player-item';
            playerElement.innerHTML = `
                <span class="player-name">${player.name}</span>
                <span class="player-status">${player.ready ? '✓ Ready' : 'Waiting...'}</span>
            `;
            playersList.appendChild(playerElement);
        });
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Get game ID from URL parameters
    const gameId = new URLSearchParams(window.location.search).get('id');
    if (gameId) {
        // Create new game instance
        window.game = new BattleGame(gameId);
    }
});

export { BattleGame };