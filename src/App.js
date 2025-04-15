// SlotMachineScene.js - Phaser 3 version of your React App.js slot machine

import Phaser from 'phaser';

export default class SlotMachineScene extends Phaser.Scene {
  constructor() {
    super('SlotMachineScene');
  }

  init() {
    this.symbolData = {
      '💀': { weight: 10, payouts: [0, 5, 10, 100] },
      '🕯️': { weight: 15, payouts: [0, 2, 5, 25] },
      '👻': { weight: 20, payouts: [0, 1, 2.5, 10] },
      '📖': { weight: 25, payouts: [0, 0.5, 1, 4] },
      '🩸': { weight: 30, payouts: [0, 0.2, 0.5, 2] },
      '🧟': { weight: 30, payouts: [0, 0.2, 0.5, 2] },
      'FS': { weight: 5, payouts: [0, 0, 0, 0] },
    };

    this.paylines = [
      [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
      [0, 6, 12, 18, 24], [4, 8, 12, 16, 20],
      [0, 5, 10, 15, 20], [4, 9, 14, 19, 24], [2, 7, 12, 17, 22]
    ];

    this.grid = [];
    this.balance = 1000;
    this.betSize = 1;
    this.totalBet = 0;
    this.totalWin = 0;
    this.freeSpinsLeft = 0;
    this.freeSpinWins = 0;
    this.isFreeSpinMode = false;
  }

  preload() {
    // Load any assets or fonts if needed
  }

  create() {
    this.generateGrid();
    this.displayGrid();

    this.messageText = this.add.text(10, 310, '', { fontSize: '16px', fill: '#fff' });
    this.balanceText = this.add.text(10, 330, '', { fontSize: '16px', fill: '#fff' });
    this.updateBalanceDisplay();

    this.spinButton = this.add.text(10, 360, 'SPIN', { fontSize: '24px', fill: '#0f0' })
      .setInteractive()
      .on('pointerdown', () => this.handleSpin());
  }

  generateGrid() {
    this.grid = [];
    for (let i = 0; i < 5; i++) {
      const row = [];
      for (let j = 0; j < 5; j++) {
        row.push(this.getWeightedRandomSymbol());
      }
      this.grid.push(row);
    }
  }

  displayGrid() {
    if (this.symbolTexts) {
      this.symbolTexts.forEach(t => t.destroy());
    }

    this.symbolTexts = [];
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const symbol = this.grid[i][j];
        const text = this.add.text(60 * j + 10, 60 * i + 10, symbol, {
          fontSize: '40px', fill: symbol === 'FS' ? '#ff0' : '#fff'
        });
        this.symbolTexts.push(text);
      }
    }
  }

  getWeightedRandomSymbol() {
    const entries = Object.entries(this.symbolData);
    const totalWeight = entries.reduce((sum, [_, data]) => sum + data.weight, 0);
    let rand = Math.random() * totalWeight;

    for (let [symbol, data] of entries) {
      rand -= data.weight;
      if (rand < 0) return symbol;
    }
  }

  calculateLineWins(flatGrid) {
    let totalWin = 0;

    for (let line of this.paylines) {
      const lineSymbols = line.map(i => flatGrid[i]);
      const first = lineSymbols[0];
      if (first === 'FS') continue;

      let count = 1;
      for (let i = 1; i < lineSymbols.length; i++) {
        if (lineSymbols[i] === first) count++;
        else break;
      }

      if (count >= 3) {
        const payout = this.symbolData[first].payouts[count - 1];
        totalWin += payout;
      }
    }

    return totalWin;
  }

  handleSpin() {
    if (this.isFreeSpinMode) {
      this.generateGrid();
      const flat = this.grid.flat();
      const win = this.calculateLineWins(flat);

      this.displayGrid();
      this.freeSpinsLeft--;
      this.freeSpinWins += win;

      if (this.freeSpinsLeft <= 0) {
        this.messageText.setText(`Free Spins Over. Total winnings: ${this.freeSpinWins.toFixed(2)}`);
        this.isFreeSpinMode = false;
      } else {
        this.messageText.setText(`${this.freeSpinsLeft} Free Spins Left`);
      }
    } else {
      this.generateGrid();
      const flat = this.grid.flat();
      const win = this.calculateLineWins(flat);
      const fsCount = flat.filter(s => s === 'FS').length;

      const bet = this.betSize;
      this.totalBet += bet;
      this.totalWin += win;
      this.balance = this.balance - bet + win;

      this.updateBalanceDisplay();
      this.displayGrid();

      if (fsCount >= 3) {
        this.isFreeSpinMode = true;
        this.freeSpinsLeft = 10;
        this.freeSpinWins = 0;
        this.messageText.setText('Entering Free Spins (10)');
      } else {
        this.messageText.setText(`${fsCount} FS Symbols - Win: ${win.toFixed(2)}`);
      }
    }
  }

  updateBalanceDisplay() {
    this.balanceText.setText(`Balance: $${this.balance.toFixed(2)} | Total Bet: $${this.totalBet.toFixed(2)} | Total Win: $${this.totalWin.toFixed(2)}`);
  }
}
