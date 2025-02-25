// ProductManager.js - Handles product-related operations
class ProductManager {
    constructor(productData) {
        this.productData = productData;
    }

    getAllProducts() {
        return Object.values(this.productData)
            .flatMap(category => {
                const directProducts = category.products || [];
                const subcategoryProducts = Object.values(category.subcategories || {})
                    .flatMap(subcat => subcat.products || []);
                return [...directProducts, ...subcategoryProducts];
            })
            .filter(product => product.price && product.name);
    }

    getRandomProduct() {
        const allProducts = this.getAllProducts();
        if (allProducts.length === 0) {
            throw new Error('No valid products found in the data');
        }
        return allProducts[Math.floor(Math.random() * allProducts.length)];
    }
}

// UIManager.js - Handles UI-related operations
class UIManager {
    constructor() {
        this.elements = {
            productCard: document.getElementById('productCard'),
            guessForm: document.getElementById('guessForm'),
            guessInput: document.getElementById('guessInput'),
            guessList: document.getElementById('guessList'),
            gameStatus: document.getElementById('gameStatus'),
            howToPlayModal: document.getElementById('howToPlayModal'),
            howToPlayBtn: document.getElementById('howToPlayBtn')
        };
    }

    displayProduct(product) {
        this.elements.productCard.innerHTML = `
            <img src="${product.image}" alt="" class="product-image">
            <div class="product-name">${product.name}</div>
        `;
    }

    setupModalListeners() {
        this.elements.howToPlayBtn.onclick = () => {
            this.elements.howToPlayModal.style.display = "block";
        };

        window.onclick = (event) => {
            if (event.target == this.elements.howToPlayModal) {
                this.elements.howToPlayModal.style.display = "none";
            }
        };
    }

    displayGuess(guess, maxGuesses) {
        const guessElement = this.createGuessElement(guess);
        this.updateGuessList(guessElement);
    }

    createGuessElement(guess) {
        const element = document.createElement('div');
        element.className = 'guess-item';
        
        if (guess.isCorrect) {
            element.classList.add('correct-guess');
        } else if (guess.isClose) {
            element.classList.add('close');
        } else {
            element.classList.add('far');
        }

        const indicator = this.getGuessIndicator(guess);
        element.innerHTML = `
            <span class="guess-value">$${guess.value.toFixed(2)}</span>
            <span class="guess-indicator">${indicator}</span>
        `;

        return element;
    }

    getGuessIndicator(guess) {
        if (guess.isCorrect) return '✓';
        if (guess.isClose) return guess.isHigh ? '↓' : '↑';
        return guess.isHigh ? '↓↓' : '↑↑';
    }

    updateGuessList(guessElement) {
        const emptySlot = this.elements.guessList.querySelector('.empty-slot');
        if (emptySlot) {
            emptySlot.remove();
        }

        if (this.elements.guessList.firstChild) {
            this.elements.guessList.insertBefore(guessElement, this.elements.guessList.firstChild);
        } else {
            this.elements.guessList.appendChild(guessElement);
        }
    }

    displayGameStatus(status) {
        this.elements.gameStatus.innerHTML = status;
        this.updateInputState(false);
    }

    resetUI(maxGuesses) {
        this.elements.guesses = [];
        this.elements.guessList.innerHTML = '';
        this.elements.gameStatus.innerHTML = '';
        this.elements.guessInput.value = '';
        this.updateInputState(true);
        this.createEmptySlots(maxGuesses);
    }

    updateInputState(enabled) {
        this.elements.guessInput.disabled = !enabled;
        this.elements.guessInput.classList.toggle('disabled', !enabled);
        
        const submitButton = this.elements.guessForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = !enabled;
            submitButton.classList.toggle('disabled', !enabled);
        }
    }

    createEmptySlots(maxGuesses) {
        for (let i = 0; i < maxGuesses; i++) {
            const emptySlot = document.createElement('div');
            emptySlot.className = 'empty-slot';
            this.elements.guessList.appendChild(emptySlot);
        }
    }
}

// GameState.js - Handles game state and logic
class GameState {
    constructor(maxGuesses) {
        this.maxGuesses = maxGuesses;
        this.reset();
    }

    reset() {
        this.currentProduct = null;
        this.guesses = [];
        this.gameWon = false;
    }

    evaluateGuess(guessValue) {
        const correctPrice = parseFloat(this.currentProduct.price.replace(/[^0-9.]/g, ''));
        const percentDiff = ((guessValue - correctPrice) / correctPrice) * 100;
        
        return {
            value: guessValue,
            isCorrect: Math.abs(percentDiff) <= 5,
            isHigh: guessValue > correctPrice,
            isClose: Math.abs(percentDiff) <= 25
        };
    }

    isGameOver() {
        return this.gameWon || this.guesses.length >= this.maxGuesses;
    }

    getGameStatus() {
        if (this.gameWon) {
            return `
                <div class="game-status">
                    <div class="game-status-text">You win! Congratulations! 🎉</div>
                    <div class="game-status-text">The price was ${this.currentProduct.price}</div>
                    <div class="game-status-text">You got it in ${this.guesses.length}/${this.maxGuesses} tries!</div>
                    <button onclick="game.nextItem()" class="next-button">Next Item</button>
                </div>
            `;
        }
        return `
            <div class="game-status">
                <div class="game-status-text">Game Over!</div>
                <div class="game-status-text">The price was ${this.currentProduct.price}</div>
                <button onclick="game.nextItem()" class="next-button">Next Item</button>
            </div>
        `;
    }
}

// Game.js - Main game controller
class Game {
    constructor() {
        this.maxGuesses = 6;
        this.ui = new UIManager();
        this.gameState = new GameState(this.maxGuesses);
        this.productManager = null;

        this.loadGameData();
    }

    async loadGameData() {
        try {
            const response = await fetch('./data/costco_complete_database.json');
            const productData = await response.json();
            console.log('Data loaded successfully');
            
            this.productManager = new ProductManager(productData);
            this.initGame();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error loading data:', error);
            this.ui.elements.productCard.innerHTML = '<div>Error loading products. Please try again later.</div>';
            throw error;
        }
    }

    initGame() {
        this.ui.setupModalListeners();
        this.gameState.currentProduct = this.productManager.getRandomProduct();
        this.ui.displayProduct(this.gameState.currentProduct);
        this.ui.createEmptySlots(this.maxGuesses);
    }

    setupEventListeners() {
        this.ui.elements.guessForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!this.gameState.isGameOver()) {
                this.handleGuess();
            }
        });
    }

    handleGuess() {
        const guessValue = parseFloat(this.ui.elements.guessInput.value);
        const guess = this.gameState.evaluateGuess(guessValue);
        
        this.gameState.guesses.push(guess);
        this.ui.displayGuess(guess, this.maxGuesses);
        this.ui.elements.guessInput.value = '';

        if (guess.isCorrect) {
            this.gameState.gameWon = true;
            this.ui.displayGameStatus(this.gameState.getGameStatus());
        } else if (this.gameState.isGameOver()) {
            this.ui.displayGameStatus(this.gameState.getGameStatus());
        }
    }

    nextItem() {
        this.gameState.reset();
        this.ui.resetUI(this.maxGuesses);
        this.gameState.currentProduct = this.productManager.getRandomProduct();
        this.ui.displayProduct(this.gameState.currentProduct);
    }
}

// Initialize game
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
});