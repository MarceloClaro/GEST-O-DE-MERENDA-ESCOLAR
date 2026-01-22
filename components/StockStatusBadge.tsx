import React from 'react';

interface Props {
  current: number;
  min: number;
}

const StockStatusBadge: React.FC<Props> = ({ current, min }) => {
  if (current <= 0) {
    return <span className="px-2 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">SEM ESTOQUE</span>;
  }
  if (current <= min) {
    return <span className="px-2 py-1 text-xs font-bold text-amber-700 bg-amber-100 rounded-full">CRÍTICO</span>;
  }
  return <span className="px-2 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">OK</span>;
};

export default StockStatusBadge;
