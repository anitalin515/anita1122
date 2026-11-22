import React from 'react';
import { ThemePalette } from '../types/pinball';

interface PastelBackdropPatternProps {
  theme: ThemePalette;
}

export const PastelBackdropPattern: React.FC<PastelBackdropPatternProps> = ({ theme }) => {
  const patternId = `pastel-pattern-${theme.id}`;
  const strokeColor = theme.tableWallStroke;

  const renderTileMotifs = () => {
    switch (theme.id) {
      // Sweet: Sakura blossoms, hearts & sugar sparkles
      case 'sakura':
        return (
          <>
            <path
              d="M28 24c-4-7-14-4-12 4 1.5 6 12 13 12 13s10.5-7 12-13c2-8-8-11-12-4z"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.6"
            />
            <circle cx="88" cy="34" r="4" fill="none" stroke={strokeColor} strokeWidth="1.4" />
            <path
              d="M88 22v5M88 41v5M76 34h5M95 34h5"
              stroke={strokeColor}
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle cx="58" cy="86" r="10" fill="none" stroke={strokeColor} strokeWidth="1.4" strokeDasharray="3 3" />
          </>
        );

      // Sweet: Candy swirl lollipops & soft hearts
      case 'peach':
        return (
          <>
            <circle cx="32" cy="32" r="13" fill="none" stroke={strokeColor} strokeWidth="1.5" />
            <path
              d="M32 32c0-4 5-4 5 0 0 6-9 7-10 0-1-8 9-12 14-6"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <line x1="32" y1="45" x2="32" y2="57" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
            <path
              d="M86 78c-3-5-10-3-9 3 1 4.5 9 9.5 9 9.5s8-5 9-9.5c1-6-6-8-9-3z"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
          </>
        );

      // Space: Ringed planet, crescent moon & stars
      case 'seasalt':
        return (
          <>
            <circle cx="34" cy="34" r="10" fill="none" stroke={strokeColor} strokeWidth="1.5" />
            <ellipse
              cx="34"
              cy="34"
              rx="20"
              ry="6"
              transform="rotate(-22 34 34)"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.4"
            />
            <path
              d="M90 74a11 11 0 1 0 11 15 9 9 0 1 1-11-15z"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <circle cx="88" cy="26" r="2" fill={strokeColor} />
            <circle cx="24" cy="92" r="1.8" fill={strokeColor} />
          </>
        );

      // Space: Rocket, constellation & comet
      case 'cloud':
        return (
          <>
            <path
              d="M34 18c6 8 7 18 0 28-7-10-6-20 0-28z"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <path d="M28 42l-4 6h20l-4-6" fill="none" stroke={strokeColor} strokeWidth="1.4" />
            <circle cx="34" cy="29" r="2.5" fill="none" stroke={strokeColor} strokeWidth="1.3" />
            <path
              d="M74 82l14-10 12 8 10-14"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.3"
              strokeDasharray="3 3"
            />
            <circle cx="74" cy="82" r="2.2" fill={strokeColor} />
            <circle cx="88" cy="72" r="2.2" fill={strokeColor} />
            <circle cx="100" cy="80" r="2.2" fill={strokeColor} />
          </>
        );

      // Science: Atom orbital & hexagon molecule
      case 'mint':
        return (
          <>
            <circle cx="34" cy="34" r="3" fill={strokeColor} />
            <ellipse cx="34" cy="34" rx="18" ry="7" transform="rotate(30 34 34)" fill="none" stroke={strokeColor} strokeWidth="1.4" />
            <ellipse cx="34" cy="34" rx="18" ry="7" transform="rotate(-30 34 34)" fill="none" stroke={strokeColor} strokeWidth="1.4" />
            <polygon
              points="88,68 98,74 98,86 88,92 78,86 78,74"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <line x1="98" y1="74" x2="106" y2="69" stroke={strokeColor} strokeWidth="1.4" />
          </>
        );

      // Science: Laboratory flask, sine wave & geometric compass
      case 'lemon':
        return (
          <>
            <path
              d="M30 20h10v10l9 16a3 3 0 0 1-2.6 4.5H23.6A3 3 0 0 1 21 46l9-16V20z"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <line x1="27" y1="20" x2="43" y2="20" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
            <path
              d="M66 86q8-12 16 0t16 0"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="88" cy="32" r="6" fill="none" stroke={strokeColor} strokeWidth="1.4" />
          </>
        );

      // Fantasy: Arcane magic circle, crescent & fairy sparkles
      case 'lavender':
        return (
          <>
            <circle cx="34" cy="34" r="16" fill="none" stroke={strokeColor} strokeWidth="1.4" />
            <circle cx="34" cy="34" r="11" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeDasharray="3 3" />
            <polygon points="34,19 46,41 22,41" fill="none" stroke={strokeColor} strokeWidth="1.2" />
            <path
              d="M88 70q2 10 12 12-10 2-12 12-2-10-12-12 10-2 12-12z"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.4"
            />
          </>
        );

      // Fantasy: Astrolabe rings & floating crystal diamond
      default:
        return (
          <>
            <polygon
              points="34,16 46,34 34,52 22,34"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <line x1="22" y1="34" x2="46" y2="34" stroke={strokeColor} strokeWidth="1.2" />
            <circle cx="88" cy="84" r="14" fill="none" stroke={strokeColor} strokeWidth="1.4" strokeDasharray="4 3" />
            <circle cx="88" cy="84" r="6" fill="none" stroke={strokeColor} strokeWidth="1.4" />
          </>
        );
    }
  };

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden opacity-45"
      aria-hidden="true"
    >
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={patternId} width="120" height="120" patternUnits="userSpaceOnUse">
            {renderTileMotifs()}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
};
