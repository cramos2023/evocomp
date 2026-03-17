import React from 'react';
import { PayBand } from '../types';

interface Props {
  band: PayBand | null;
  alignmentStatus: 'NO_DATA' | 'NOT_MAPPED' | 'MAPPED' | 'BAND_RESOLVED';
}

const BandAlignmentChart: React.FC<Props> = ({ band, alignmentStatus }) => {
  if (!band || alignmentStatus !== 'BAND_RESOLVED') {
    return (
      <div className="h-4 w-full bg-[rgb(var(--bg-surface-2))] rounded-full border border-[rgb(var(--border))] flex items-center px-3">
        <span className="text-[8px] font-black text-[rgb(var(--text-muted))] uppercase tracking-tighter">
          {alignmentStatus === 'NO_DATA' ? 'No Active JD' : 
           alignmentStatus === 'NOT_MAPPED' ? 'Mapping Needed' : 'No Band Found'}
        </span>
      </div>
    );
  }

  // Calculate widths for the color segments
  const range = band.max_salary - band.min_salary;
  
  return (
    <div className="flex flex-col gap-2 w-full max-w-[200px]">
      <div className="flex justify-between text-[8px] font-black font-mono text-[rgb(var(--text-muted))] uppercase tracking-tighter">
        <span>{Number(band.min_salary).toLocaleString()}</span>
        <span className="text-[rgb(var(--primary))]">{Number(band.midpoint).toLocaleString()}</span>
        <span>{Number(band.max_salary).toLocaleString()}</span>
      </div>
      
      <div className="relative h-2 w-full bg-[rgb(var(--bg-surface-2))] rounded-full overflow-hidden border border-[rgb(var(--border))] shadow-inner">
        {/* The Band Range */}
        <div className="absolute inset-y-0 left-0 right-0 bg-[rgb(var(--primary))] opacity-20" />
        
        {/* The Midpoint Marker */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-[rgb(var(--primary))] shadow-[0_0_4px_rgba(46,79,210,0.4)]" />

        {/* The Midpoint Label */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-0.5 rounded-md border border-[rgb(var(--border))] shadow-sm whitespace-nowrap z-10">
           <span className="text-[10px] font-black text-[rgb(var(--text-primary))]">
             {band.currency || ''} {Math.round(band.midpoint).toLocaleString()}
           </span>
        </div>
      </div>
    </div>
  );
};

export default BandAlignmentChart;
