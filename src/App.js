import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

const symbolData = {
  '💀': { weight: 10, payouts: [0, 5, 10, 100] },
  '🕯️': { weight: 15, payouts: [0, 2, 5, 25] },
  '👻': { weight: 20, payouts: [0, 1, 2.5, 10] },
  '📖': { weight: 25, payouts: [0, 0.5, 1, 4] },
  '🩸': { weight: 30, payouts: [0, 0.2, 0.5, 2] },
  '🧟': { weight: 30, payouts: [0, 0.2, 0.5, 2] },
  'FS': { weight: 5, payouts: [0, 0, 0, 0] } // Free Spin symbol
};

const paylines = [
  [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
  [0, 6, 12, 18, 24], [4, 8, 12, 16, 20],
  [0, 5, 10, 15, 20], [4, 9, 14, 19, 24], [2, 7, 12, 17, 22]
];

// Mapping for shattering/upgrade mechanic
const upgradeMapping = {
  '🕯️': '👻',
  '👻': '📖',
  '📖': '🩸',
  '🩸': '🧟',
  '🧟': '💀',
};

// Helper function to choose a symbol based on weight
const getWeightedRandomSymbol = () => {
  const entries = Object.entries(symbolData);
  const totalWeight = entries.reduce((sum, [_, data]) => sum + data.weight, 0);
  let rand = Math.random() * totalWeight;
  for (let [symbol, data] of entries) {
    rand -= data.weight;
    if (rand < 0) return symbol;
  }
};

// Generate a 5x5 grid of symbols
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

// Calculate total win for the paylines
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

// Upgrade mechanic: when 8 or more of any non-free-spin symbol appear, upgrade them.
const handleShatter = (grid) => {
  const flat = grid.flat();
  const symbolCounts = flat.reduce((counts, symbol) => {
    if (symbol !== 'FS') {
      counts[symbol] = (counts[symbol] || 0) + 1;
    }
    return counts;
  }, {});

  Object.keys(symbolCounts).forEach(symbol => {
    if (symbolCounts[symbol] >= 8 && upgradeMapping[symbol]) {
      grid = grid.map(row => row.map(cell => cell === symbol ? upgradeMapping[symbol] : cell));
    }
  });

  return grid;
};

function App() {
  // State hooks for game state and settings
  const [grid, setGrid] = useState(generateGrid);
  const [fsCount, setFsCount] = useState(0);
  const [message, setMessage] = useState('');
  const [balance, setBalance] = useState(1000);
  const [totalBet, setTotalBet] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [betSize, setBetSize] = useState(1);
  const [isShattering, setIsShattering] = useState(false);
  const [autoSpins, setAutoSpins] = useState(0);
  const [autoSpinning, setAutoSpinning] = useState(false);
  const [speed, setSpeed] = useState('normal');
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [freeSpinWins, setFreeSpinWins] = useState(0);
  const [isFreeSpinMode, setIsFreeSpinMode] = useState(false);
  const autoSpinIntervalRef = useRef(null);

  // Cleanup auto-spin interval when unmounting or auto spin stops
  useEffect(() => {
    return () => {
      if (autoSpinIntervalRef.current) clearInterval(autoSpinIntervalRef.current);
    };
  }, []);

  // Helper: count symbols in a flat grid
  const countSymbols = (flatGrid, symbol) => flatGrid.filter(s => s === symbol).length;

  // Primary spin handler
  const handleSpin = useCallback(() => {
    // Regular spin if not in free spin mode, else handle free spin logic
    if (isFreeSpinMode) {
      const newGrid = generateGrid();
      const flatGrid = newGrid.flat();
      const win = calculateLineWins(flatGrid);
      const fsSymbolCount = countSymbols(flatGrid, 'FS');

      setGrid(newGrid);
      setBalance(prev => prev + win);
      setFreeSpinWins(prev => prev + win);

      // Update free spins left; add extra spins for enough FS symbols
      setFreeSpinsLeft(prev => {
        let spins = prev - 1;
        if (fsSymbolCount >= 3) spins += 10;
        if (spins > 0) {
          setMessage(`${spins} Free Spins remaining - Win: ${win.toFixed(2)}`);
        } else {
          setMessage(`Free Spins over! Total free spin winnings: ${(freeSpinWins + win).toFixed(2)}`);
          setIsFreeSpinMode(false);
        }
        return spins;
      });
    } else {
      const newGrid = generateGrid();
      const flatGrid = newGrid.flat();
      const fsSymbolCount = countSymbols(flatGrid, 'FS');
      const win = calculateLineWins(flatGrid);

      // If shattering condition is met, perform upgrade
      const nonFSSymbols = flatGrid.filter(s => s !== 'FS');
      if (nonFSSymbols.length > 0) {
        const counts = nonFSSymbols.reduce((acc, sym) => {
          acc[sym] = (acc[sym] || 0) + 1;
          return acc;
        }, {});
        if (Object.values(counts).some(count => count >= 8)) {
          setIsShattering(true);
          const upgradedGrid = handleShatter(newGrid);
          setGrid(upgradedGrid);
        } else {
          setGrid(newGrid);
        }
      } else {
        setGrid(newGrid);
      }

      setFsCount(fsSymbolCount);
      const bet = betSize || 1;
      setTotalBet(prev => prev + bet);
      setTotalWin(prev => prev + win);
      setBalance(prev => prev - bet + win);

      if (fsSymbolCount >= 3) {
        // Enter free spin mode
        setIsFreeSpinMode(true);
        setFreeSpinsLeft(10);
        setFreeSpinWins(0);
        setMessage('Entering Free Spins! 10 spins available.');
      } else {
        setMessage(`${fsSymbolCount} FS symbol(s) - Win: ${win.toFixed(2)}`);
      }

      // Reset shattering animation after 1.5 seconds
      setTimeout(() => setIsShattering(false), 1500);
    }
  }, [betSize, freeSpinWins, isFreeSpinMode]);

  // Handle bet size change
  const handleBetChange = (event) => {
    const newBet = parseFloat(event.target.value);
    if (newBet > 0 && newBet <= balance) {
      setBetSize(newBet);
    } else {
      alert("Bet size must be between 1 and your current balance.");
    }
  };

  // Auto-spin control functions
  const startAutoSpins = () => {
    if (autoSpins <= 0) return;
    setAutoSpinning(true);
    let spinsRemaining = autoSpins;
    const speedMultiplier = speed === 'turbo' ? 0.33 : speed === 'superTurbo' ? 0.2 : 1;
    const intervalTime = 1000 * speedMultiplier;
    
    autoSpinIntervalRef.current = setInterval(() => {
      if (spinsRemaining > 0) {
        handleSpin();
        spinsRemaining--;
      } else {
        clearInterval(autoSpinIntervalRef.current);
        setAutoSpinning(false);
      }
    }, intervalTime);
  };

  const stopAutoSpins = () => {
    clearInterval(autoSpinIntervalRef.current);
    setAutoSpinning(false);
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
          onChange={(e) => setAutoSpins(parseInt(e.target.value, 10))}
          disabled={autoSpinning}
        >
          <option value={0}>Select Auto Spins</option>
          <option value={5}>5</option>
          <option value={50}>50</option>
          <option value={500}>500</option>
          <option value={5000}>5000</option>
        </select>
        <button onClick={startAutoSpins} disabled={autoSpinning || autoSpins === 0}>
          Start Auto Spins
        </button>
        <button onClick={stopAutoSpins} disabled={!autoSpinning}>
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
      
      {/* Display grid of symbols */}
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
      
      <button onClick={handleSpin} disabled={autoSpinning}>
        Spin
      </button>
    
      <p className="message">{message}</p>
      <p>Balance: {balance.toFixed(2)}</p>
      <p>Total Bet: {totalBet.toFixed(2)}</p>
      <p>Total Win: {totalWin.toFixed(2)}</p>
    </div>
  );
}

export default App;
