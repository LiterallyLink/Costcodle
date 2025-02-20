class Game {
    constructor() {
        this.currentProduct = null;
        this.guesses = [];
        this.gameWon = false;
        this.productData = null;
        this.maxGuesses = 6;

        this.productCard = document.getElementById('productCard');
        this.guessForm = document.getElementById('guessForm');
        this.guessInput = document.getElementById('guessInput');
        this.guessList = document.getElementById('guessList');
        this.gameStatus = document.getElementById('gameStatus');

        this.loadGameData();
    }

    async loadGameData() {
        try {
            const response = await fetch('./data/costco_complete_database.json');
            this.productData = await response.json();
            console.log('Data loaded successfully');
            this.initGame();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error loading data:', error);
            this.productCard.innerHTML = '<div>Error loading products. Please try again later.</div>';
            throw error;
        }
    }

    initGame() {
        const modal = document.getElementById('howToPlayModal');
        const btn = document.getElementById('howToPlayBtn');
    
        btn.onclick = function() {
            modal.style.display = "block";
        }
    
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }
        
        const allProducts = this.getAllProducts();

        if (allProducts.length === 0) {
            console.log('No Valid Products Found In The Data');
            return;
        }

        this.currentProduct = allProducts[Math.floor(Math.random() * allProducts.length)];
        this.displayProduct();
        
        // Add empty slots for remaining guesses
        this.guessList.innerHTML = '';
        for (let i = 0; i < this.maxGuesses; i++) {
            const emptySlot = document.createElement('div');
            emptySlot.className = 'empty-slot';
            this.guessList.appendChild(emptySlot);
        }
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

    displayProduct() {
        this.productCard.innerHTML = `
            <img src="${this.currentProduct.image}" alt="" class="product-image">
            <div class="product-name">${this.currentProduct.name}</div>
        `;
    }

    setupEventListeners() {
        this.guessForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.guesses.length < this.maxGuesses && !this.gameWon) {
                this.handleGuess();
            }
        });
    }

    handleGuess() {
        const guessValue = parseFloat(this.guessInput.value);
        const correctPrice = parseFloat(this.currentProduct.price.replace(/[^0-9.]/g, ''));
        
        const percentDiff = ((guessValue - correctPrice) / correctPrice) * 100;
        
        const guess = {
            value: guessValue,
            isCorrect: Math.abs(percentDiff) <= 5,
            isHigh: guessValue > correctPrice,
            isClose: Math.abs(percentDiff) <= 25
        };

        this.guesses.push(guess);
        this.displayGuess(guess);
        this.guessInput.value = '';

        if (guess.isCorrect) {
            this.handleWin();
        } else if (this.guesses.length >= this.maxGuesses) {
            this.handleLoss();
        }
    }

    displayGuess(guess) {
        const guessElement = document.createElement('div');
        guessElement.className = 'guess-item';
        
        if (guess.isCorrect) {
            guessElement.classList.add('correct-guess');
        } else if (guess.isClose) {
            guessElement.classList.add('close');
        } else {
            guessElement.classList.add('far');
        }

        let indicator;
        if (guess.isCorrect) {
            indicator = '✓';
        } else {
            if (guess.isClose) {
                indicator = guess.isHigh ? '↓' : '↑';
            } else {
                indicator = guess.isHigh ? '↓↓' : '↑↑';
            }
        }

        guessElement.innerHTML = `
            <span>$${guess.value.toFixed(2)}</span>
            <span>${indicator}</span>
        `;

        // Remove one empty slot if it exists
        const emptySlot = this.guessList.querySelector('.empty-slot');
        if (emptySlot) {
            emptySlot.remove();
        }

        // Insert new guess at the beginning of the list
        if (this.guessList.firstChild) {
            this.guessList.insertBefore(guessElement, this.guessList.firstChild);
        } else {
            this.guessList.appendChild(guessElement);
        }
    }

    handleWin() {
        this.gameWon = true;
        this.gameStatus.innerHTML = `
            <div class="game-status">
                <div class="game-status-text">You win! Congratulations! 🎉</div>
                <div class="game-status-text">The price was ${this.currentProduct.price}</div>
                <div class="game-status-text">You got it in ${this.guesses.length}/${this.maxGuesses} tries!</div>
                <button onclick="game.nextItem()" class="next-button">Next Item</button>
            </div>
        `;
        
        this.guessInput.disabled = true;
        this.guessInput.classList.add('disabled');
        const submitButton = this.guessForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.classList.add('disabled');
        }
    }
    
    handleLoss() {
        this.gameStatus.innerHTML = `
            <div class="game-status">
                <div class="game-status-text">Game Over!</div>
                <div class="game-status-text">The price was ${this.currentProduct.price}</div>
                <button onclick="game.nextItem()" class="next-button">Next Item</button>
            </div>
        `;
        
        this.guessInput.disabled = true;
        this.guessInput.classList.add('disabled');
        const submitButton = this.guessForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.classList.add('disabled');
        }
    }

    nextItem() {
        this.guesses = [];
        this.gameWon = false;
        this.guessList.innerHTML = '';
        this.gameStatus.innerHTML = '';
        
        this.guessInput.disabled = false;
        this.guessInput.classList.remove('disabled');
        this.guessInput.value = '';
        const submitButton = this.guessForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.classList.remove('disabled');
        }

        const allProducts = this.getAllProducts();
        this.currentProduct = allProducts[Math.floor(Math.random() * allProducts.length)];
        this.displayProduct();
        
        // Reset empty slots
        for (let i = 0; i < this.maxGuesses; i++) {
            const emptySlot = document.createElement('div');
            emptySlot.className = 'empty-slot';
            this.guessList.appendChild(emptySlot);
        }
    }
}

let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
});