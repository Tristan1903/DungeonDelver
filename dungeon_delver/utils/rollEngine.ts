// utils/rollEngine.ts

// Helper to roll dice
export const rollDice = (dice: string) => {
  // Simple "1d20" parser
  const [count, sides] = dice.split('d').map(Number);
  const result = Math.floor(Math.random() * (sides * count)) + 1;
  return result;
};

export const performAction = (
  actionName: string,
  dice: string,
  modifier: number,
  mode: 'auto' | 'manual',
  manualValue?: number
) => {
  if (mode === 'manual') {
    if (manualValue === undefined) return "Waiting for roll...";
    return manualValue + modifier;
  }
  
  // Auto mode
  const roll = rollDice(dice);
  return {
    roll,
    total: roll + modifier,
    explanation: `${roll} + ${modifier}`
  };
};