import React, { useState, useRef } from 'react';
import './App.css';

const symbolData = {
  '💀': { weight: 10, payouts: [0, 5, 10, 100] },
  '🕯️': { weight: 15, payouts: [0, 2, 5, 25] },
  '👻': { weight: 20, payouts: [0, 1, 2.5, 10] },
  '📖': { weight: 25, payouts: [0, 0.5, 1, 4] },
  '🩸': { weight: 30, payouts: [0, 0.2, 0.5, 2] },
  '🧟': { weight: 30, payouts: [0, 0.2, 0.5, 2] },
  'FS': { weight: 5, payouts: [0, 0, 0, 0] }
};

const paylines = [
  [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
  [0, 6, 12, 18, 24], [4, 8, 12, 16, 20],
  [0, 5, 10, 15, 20], [4, 9, 14, 19, 24], [2, 7, 12, 17, 22]
];

const upgradeMapping = {
  '🕯️': '👻',
  '👻': '📖',
  '📖': '🩸',
  '🩸': '🧟',
  '🧟': '💀',
};

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
  const symbolCounts = {};
  flat.forEach(symbol => {
    if (symbol !== 'FS') {
      symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
    }
  });
  Object.keys(symbolCounts).forEach(symbol => {
    if (symbolCounts[symbol] >= 8 && upgradeMapping[symbol]) {
      grid = grid.map(row =>
        row.map(cell => (cell === symbol ? upgradeMapping[symbol] : cell))
      );
    }
  });
  return grid;
};

function App() {
  const [grid, setGrid] = useState(generateGrid);
  const [fsCount, setFsCount] = useState(0);
  const [message, setMessage] = useState('');
  const [balance, setBalance] = useState(1000);
  const [totalBet, setTotalBet] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [betSize, setBetSize] = useState(1);
  const [isShattering, setIsShattering] = useState(false);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [freeSpinWins, setFreeSpinWins] = useState(0);
  const [isFreeSpinMode, setIsFreeSpinMode] = useState(false);
  const autoSpinIntervalRef = useRef(null);
  const [autoSpins, setAutoSpins] = useState(0);
  const [autoSpinning, setAutoSpinning] = useState(false);
  const [speed, setSpeed] = useState('normal');

  const handleSpin = () => {
    if (isFreeSpinMode) {
      const newGrid = generateGrid();
      const flat = newGrid.flat();
      const win = calculateLineWins(flat);
      const fsSymbolsThisSpin = flat.filter(symbol => symbol === 'FS').length;

      setGrid(newGrid);
      setBalance(prev => prev + win);
      setFreeSpinWins(prevWins => prevWins + win);

      setFreeSpinsLeft(prevSpins => {
        let newSpins = prevSpins - 1;
        if (fsSymbolsThisSpin >= 3) newSpins += 10;
        if (newSpins > 0) {
          setMessage(`${newSpins} Free Spins remaining - Win: ${win.toFixed(2)}`);
        } else {
          setMessage(`Free Spins over! Total: ${freeSpinWins + win}`);
          setIsFreeSpinMode(false);
        }
        return newSpins;
      });
    } else {
      const newGrid = generateGrid();
      const flat = newGrid.flat();
      const fsSymbolCount = flat.filter(s => s === 'FS').length;
      const win = calculateLineWins(flat);
      const bet = betSize || 1;

      setFsCount(fsSymbolCount);
      setTotalBet(prev => prev + bet);
      setTotalWin(prev => prev + win);
      setBalance(prev => prev - bet + win);
      setGrid(newGrid);

      const nonFSSymbols = flat.filter(s => s !== 'FS');
      const counts = nonFSSymbols.reduce((acc, sym) => {
        acc[sym] = (acc[sym] || 0) + 1;
        return acc;
      }, {});
      const shouldShatter = Object.entries(counts).some(([sym, count]) => count >= 8 && upgradeMapping[sym]);

      if (shouldShatter) {
        setIsShattering(true);
        setTimeout(() => {
          const upgradedGrid = handleShatter(newGrid);
          const upgradedFlat = upgradedGrid.flat();
          const shatterWin = calculateLineWins(upgradedFlat);

          setGrid(upgradedGrid);
          setIsShattering(false);
          setTotalWin(prev => prev + shatterWin);
          setBalance(prev => prev + shatterWin);
          setMessage(`Shatter! +${shatterWin.toFixed(2)} win`);
        }, 500);
      } else {
        setMessage(`${fsSymbolCount} FS symbol(s) - Win: ${win.toFixed(2)}`);
      }

      if (fsSymbolCount >= 3) {
        setIsFreeSpinMode(true);
        setFreeSpinsLeft(10);
        setFreeSpinWins(0);
        setMessage('Entering Free Spins! 10 spins available.');
      }
    }
  };

  const handleBetChange = (e) => {
    const newBet = parseFloat(e.target.value);
    if (newBet > 0 && newBet <= balance) setBetSize(newBet);
  };

  const startAutoSpins = (numSpins) => {
    setAutoSpinning(true);
    setAutoSpins(numSpins);
    let spinsRemaining = numSpins;
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
    setAutoSpins(0);
  };

  return (
    <div className="app">
      <h1>🎰 Horror Slot</h1>

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
        </select>
        <button onClick={() => startAutoSpins(autoSpins)} disabled={autoSpinning || autoSpins === 0}>
          Start Auto Spins
        </button>
        <button onClick={stopAutoSpins} disabled={!autoSpinning}>
          Stop Auto Spins
        </button>
      </div>

      <div className="speed-selector">
        <label htmlFor="speed">Spin Speed:</label>
        <select
          id="speed"
          value={speed}
          onChange={(e) => setSpeed(e.target.value)}
          disabled={autoSpinning}
        >
          <option value="normal">Normal</option>
          <option value="turbo">Turbo (x3)</option>
          <option value="superTurbo">Super Turbo (x5)</option>
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

      <p className="message">{message}</p>
      <p>Balance: ${balance.toFixed(2)}</p>
      <p>Total Bet: ${totalBet.toFixed(2)}</p>
      <p>Total Win: ${totalWin.toFixed(2)}</p>
    </div>
  );
}

export default App;
