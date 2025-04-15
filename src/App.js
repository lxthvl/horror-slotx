import React, { useState, useRef } from 'react';
import './App.css';

const symbolData = {
  '💀': { weight: 10, payouts: [0, 5, 10, 100] },  // Example payout for 1-4 symbols
  '🕯️': { weight: 15, payouts: [0, 2, 5, 25] },
  '👻': { weight: 20, payouts: [0, 1, 2.5, 10] },
  '📖': { weight: 25, payouts: [0, 0.5, 1, 4] },
  '🩸': { weight: 30, payouts: [0, 0.2, 0.5, 2] },
  '🧟': { weight: 30, payouts: [0, 0.2, 0.5, 2] },
  'FS': { weight: 5, payouts: [0, 0, 0, 0] }, // Free Spin symbol
};

const paylines = [
  [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
  [0, 6, 12, 18, 24], [4, 8, 12, 16, 20], [0, 5, 10, 15, 20], [4, 9, 14, 19, 24], [2, 7, 12, 17, 22],
];

const getWeightedRandomSymbol = () => {
  const entries = Object.entries(symbolData);
  const totalWeight = entries.reduce((sum, [_, data]) => sum + data.weight, 0);
  let rand = Math.random() * totalWeight;

  for (let [symbol, data] of entries) {
    rand -= data.weight;
    if (rand < 0) return symbol;
  }
};

const generateGrid = () => {
  const grid = [];
  for (let i = 0; i < 5; i++) {
    const row = [];
    for (let j = 0; j < 5; j++) {
      row.push(getWeightedRandomSymbol());
    }
    grid.push(row);
  }
  return grid;
};

const calculateLineWins = (flatGrid) => {
  let totalWin = 0;

  for (let line of paylines) {
    const lineSymbols = line.map(i => flatGrid[i]);
    const first = lineSymbols[0];
    if (first === 'FS') continue;

    let count = 1;
    for (let i = 1; i < lineSymbols.length; i++) {
      if (lineSymbols[i] === first) count++;
      else break;
    }

    if (count >= 3) {
      const payout = symbolData[first].payouts[count - 1];
      totalWin += payout;
    }
  }

  return totalWin;
};

const handleShatter = (grid) => {
  const flat = grid.flat();
  const matchedIndexes = {};

  // Find positions where 8 or more symbols match
  for (let i = 0; i < flat.length; i++) {
    const symbol = flat[i];
    if (symbol === 'FS') continue;

    if (!matchedIndexes[symbol]) {
      matchedIndexes[symbol] = [];
    }
    matchedIndexes[symbol].push(i);
  }

  // Shatter any matching symbols that appear 8 or more times
  for (let symbol in matchedIndexes) {
    if (matchedIndexes[symbol].length >= 8) {
      matchedIndexes[symbol].forEach((index) => {
        grid[Math.floor(index / 5)][index % 5] = '💀'; // Replace with a new symbol, e.g., '💀'
      });
    }
  }

  return grid;
};

function App() {
  const [grid, setGrid] = useState(generateGrid);
  const [fsCount, setFsCount] = useState(0);
  const [message, setMessage] = useState('');
  const [balance, setBalance] = useState(1000);
  const [totalBet, setTotalBet] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [betSize, setBetSize] = useState(1); // Default bet size is 1
  const [isShattering, setIsShattering] = useState(false); // To handle shatter state
  const [autoSpins, setAutoSpins] = useState(0); // Track the number of auto spins
  const [autoSpinning, setAutoSpinning] = useState(false); // Track if auto spin is active
  const [speed, setSpeed] = useState('normal'); // Default speed is 'normal'
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0); // Track free spins remaining
  const [freeSpinWins, setFreeSpinWins] = useState(0); // Track total wins from free spins
  const [isFreeSpinMode, setIsFreeSpinMode] = useState(false); // Track if the game is in free spin mode
  const autoSpinIntervalRef = useRef(null); // Ref to store interval ID

  const handleSpin = () => {
    if (isFreeSpinMode) {
      // Free spin logic
      const newGrid = generateGrid();
      const flat = newGrid.flat();
      const win = calculateLineWins(flat);

      setGrid(newGrid);
      setFreeSpinsLeft((prev) => prev - 1); // Decrease free spins count
      setFreeSpinWins((prev) => prev + win); // Track total wins in free spins

      if (freeSpinsLeft === 0) {
        setMessage(`Free Spins are over. Total winnings: ${freeSpinWins.toFixed(2)}`);
        setIsFreeSpinMode(false); // End free spin mode
      } else {
        setMessage(`${freeSpinsLeft} free spins left`);
      }
    } else {
      // Base game logic
      const newGrid = generateGrid();
      const flat = newGrid.flat();
      const fsCount = flat.filter(s => s === 'FS').length;
      const win = calculateLineWins(flat);

      setGrid(newGrid);
      setFsCount(fsCount);

      // Apply shattering effect if there are 8 or more symbols
      if (flat.filter(s => s === '💀').length >= 8) {
        setIsShattering(true);
        const shatteredGrid = handleShatter(newGrid);
        setGrid(shatteredGrid);
      }

      // Ensure values are valid numbers
      const bet = betSize || 1; // Fallback to 1 if betSize is undefined or invalid
      const validWin = win || 0; // Fallback to 0 if win is undefined or invalid

      // Update balance, total bet, and total win based on bet size
      setTotalBet(prev => prev + bet);
      setTotalWin(prev => prev + validWin);
      setBalance(prev => prev - bet + validWin);

      if (fsCount >= 3) {
        setIsFreeSpinMode(true);
        setFreeSpinsLeft(10); // 10 free spins
        setFreeSpinWins(0); // Reset free spin winnings
        setMessage('Entering Free Spins! 10 spins available.');
      } else {
        setMessage(`${fsCount} FS symbols - Win: ${validWin.toFixed(2)}`);
      }

      // After shatter, remove shattering state for next round
      setTimeout(() => {
        setIsShattering(false);
      }, 1500); // Shattering animation lasts for 1.5 seconds
    }
  };

  const handleBetChange = (event) => {
    const newBet = parseFloat(event.target.value);
    if (newBet > 0 && newBet <= balance) {
      setBetSize(newBet);
    } else {
      alert("Bet size must be between 1 and your current balance.");
    }
  };

  const handleContinueAfterFreeSpins = () => {
    setFreeSpinWins(0);
    setFreeSpinsLeft(0);
    setIsFreeSpinMode(false);
    setMessage('');
  };

  const startAutoSpins = (numSpins) => {
    setAutoSpinning(true);
    setAutoSpins(numSpins);
    
    let spinsRemaining = numSpins;
    const speedMultiplier = speed === 'turbo' ? 0.33 : speed === 'superTurbo' ? 0.2 : 1;
    const intervalTime = 1000 * speedMultiplier; // Adjust the speed of the spins

    autoSpinIntervalRef.current = setInterval(() => {
      if (spinsRemaining > 0) {
        handleSpin(); // Perform a spin
        spinsRemaining--;
      } else {
        clearInterval(autoSpinIntervalRef.current); // Stop auto spins when done
        setAutoSpinning(false); // Reset auto spinning flag
      }
    }, intervalTime); // Interval for each auto spin adjusted by speed
  };

  const stopAutoSpins = () => {
    clearInterval(autoSpinIntervalRef.current); // Clear the interval explicitly
    setAutoSpinning(false);
    setAutoSpins(0);
  };

  return (
    <div className="app">
      <h1>🎰 Horror Slot</h1>

      {/* Bet Size Selector */}
      <div className="bet-selector">
        <label htmlFor="bet-size">Bet Size $:</label>
        <input
          type="number"
          id="bet-size"
          min="1"
          max={balance}
          value={betSize}
          onChange={handleBetChange}
        />
      </div>

      {/* Auto Spin Selector */}
      <div className="auto-spin-selector">
        <label htmlFor="auto-spins">Auto Spins:</label>
        <select
          id="auto-spins"
          value={autoSpins}
          onChange={(e) => setAutoSpins(parseInt(e.target.value))}
          disabled={autoSpinning}
        >
          <option value={0}>Select Auto Spins</option>
          <option value={5}>5</option>
          <option value={50}>50</option>
          <option value={500}>500</option>
          <option value={5000}>5000</option>
        </select>
        <button
          onClick={() => startAutoSpins(autoSpins)}
          disabled={autoSpinning || autoSpins === 0}
        >
          Start Auto Spins
        </button>
        <button
          onClick={stopAutoSpins}
          disabled={!autoSpinning}
        >
          Stop Auto Spins
        </button>
      </div>

      {/* Speed Selector */}
      <div className="speed-selector">
        <label htmlFor="speed">Spin Speed:</label>
        <select
          id="speed"
          value={speed}
          onChange={(e) => setSpeed(e.target.value)}
          disabled={autoSpinning}
        >
          <option value="normal">Normal</option>
          <option value="turbo">Turbo (x3 Faster)</option>
          <option value="superTurbo">Super Turbo (x5 Faster)</option>
        </select>
      </div>

      <div className="grid">
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="row">
            {row.map((symbol, colIndex) => (
              <div
                key={colIndex}
                className={`cell ${symbol === 'FS' ? 'fs' : ''} ${isShattering ? 'shatter' : ''}`}
              >
                {symbol}
              </div>
            ))}
          </div>
        ))}
      </div>

      <button onClick={handleSpin}>Spin</button>

      {isFreeSpinMode && (
        <button onClick={handleContinueAfterFreeSpins}>Continue After Free Spins</button>
      )}

      <p className="message">{message}</p>
      <p>Balance: {balance.toFixed(2)}</p>
      <p>Total Bet: {totalBet.toFixed(2)}</p>
      <p>Total Win: {totalWin.toFixed(2)}</p>
    </div>
  );
}

export default App;