"use client";

type ConfettiBurstProps = {
  active: boolean;
  className?: string;
};

type Piece = {
  left: string;
  color: string;
  delay: string;
  duration: string;
  rotate: number;
  size: number;
};

const PIECES: Piece[] = [
  { left: "6%", color: "#f472b6", delay: "0ms", duration: "860ms", rotate: -12, size: 9 },
  { left: "12%", color: "#f59e0b", delay: "30ms", duration: "900ms", rotate: 18, size: 8 },
  { left: "19%", color: "#a78bfa", delay: "70ms", duration: "840ms", rotate: -20, size: 9 },
  { left: "26%", color: "#22d3ee", delay: "20ms", duration: "920ms", rotate: 14, size: 8 },
  { left: "33%", color: "#34d399", delay: "60ms", duration: "880ms", rotate: -10, size: 9 },
  { left: "41%", color: "#fde047", delay: "95ms", duration: "900ms", rotate: 22, size: 8 },
  { left: "49%", color: "#fb7185", delay: "130ms", duration: "860ms", rotate: -16, size: 9 },
  { left: "57%", color: "#38bdf8", delay: "45ms", duration: "910ms", rotate: 12, size: 8 },
  { left: "65%", color: "#f472b6", delay: "110ms", duration: "870ms", rotate: -19, size: 8 },
  { left: "73%", color: "#f59e0b", delay: "75ms", duration: "900ms", rotate: 20, size: 9 },
  { left: "81%", color: "#34d399", delay: "120ms", duration: "920ms", rotate: -15, size: 8 },
  { left: "89%", color: "#a78bfa", delay: "150ms", duration: "880ms", rotate: 17, size: 9 },
];

export default function ConfettiBurst({ active, className = "" }: ConfettiBurstProps) {
  if (!active) {
    return null;
  }

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {PIECES.map((piece, index) => (
        <span
          key={`${piece.left}-${index}`}
          className="pp-confetti absolute top-0 rounded-sm"
          style={{
            left: piece.left,
            width: `${piece.size}px`,
            height: `${Math.max(5, piece.size - 2)}px`,
            backgroundColor: piece.color,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            transform: `rotate(${piece.rotate}deg)`,
          }}
        />
      ))}

      <style jsx>{`
        .pp-confetti {
          animation-name: pp-confetti-fall;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
          opacity: 0;
        }

        @keyframes pp-confetti-fall {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 0;
          }
          14% {
            opacity: 1;
          }
          100% {
            transform: translateY(220px) rotate(190deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
