// Procedural avatar art. A stylised humanoid whose accent colour and chest
// emblem come from the class's signature stat, with an aura that intensifies as
// you level — a lightweight stand-in until hand-drawn evolution art exists.

import React from "react";
import Svg, { Circle, Path, Polygon, G } from "react-native-svg";
import { BASE_CLASSES } from "../../engine/classes.js";
import { colors, STAT_COLORS } from "../theme.js";

const BODY = "#c3ccd9";
const BODY_DARK = "#9aa7b4";

// A small class emblem drawn on the chest — one distinct shape per signature stat.
function Emblem({ stat, color }) {
  switch (stat) {
    case "STR": // upward triangle — power
      return <Polygon points="50,52 56,63 44,63" fill={color} />;
    case "VIT": // shield
      return <Path d="M50 51 L57 54 L57 60 Q57 65 50 67 Q43 65 43 60 L43 54 Z" fill={color} />;
    case "END": // hexagon
      return <Polygon points="50,51 56,55 56,61 50,65 44,61 44,55" fill={color} />;
    case "AGI": // diamond
      return <Polygon points="50,51 57,58 50,65 43,58" fill={color} />;
    case "INT": // orb
      return <Circle cx="50" cy="58" r="6.5" fill={color} />;
    case "CHA": // star
      return (
        <Polygon
          points="50,51 52,56 57,56 53,60 55,65 50,62 45,65 47,60 43,56 48,56"
          fill={color}
        />
      );
    case "LUK": // four-point sparkle
      return <Path d="M50 50 L53 57 L60 58 L53 59 L50 66 L47 59 L40 58 L47 57 Z" fill={color} />;
    default:
      return <Circle cx="50" cy="58" r="6" fill={color} />;
  }
}

export default function Avatar({ classId, level = 1, size = 96 }) {
  const cls = BASE_CLASSES[classId];
  const stat = cls?.boost ?? "STR";
  const accent = STAT_COLORS[stat] ?? colors.accent;

  // Aura intensity + milestone pips grow with level.
  const intensity = Math.min(level / 40, 1);
  const auraOpacity = 0.1 + intensity * 0.22;
  const ringWidth = 1.5 + intensity * 2.5;
  const pips = Math.min(Math.floor(level / 10), 5);

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* aura */}
      <Circle cx="50" cy="52" r="46" fill={accent} opacity={auraOpacity} />
      <Circle cx="50" cy="52" r="46" fill="none" stroke={accent} strokeWidth={ringWidth} opacity={0.8} />

      {/* cape behind the torso */}
      <Path d="M34 46 L66 46 L72 86 L28 86 Z" fill={accent} opacity={0.55} />

      {/* legs */}
      <Path d="M44 74 L48 74 L47 90 L43 90 Z" fill={BODY_DARK} />
      <Path d="M52 74 L56 74 L57 90 L53 90 Z" fill={BODY_DARK} />

      {/* torso */}
      <Path d="M40 46 Q50 42 60 46 L57 76 L43 76 Z" fill={BODY} />

      {/* arms */}
      <Path d="M39 47 L34 70 L38 71 L43 49 Z" fill={BODY_DARK} />
      <Path d="M61 47 L66 70 L62 71 L57 49 Z" fill={BODY_DARK} />

      {/* head */}
      <Circle cx="50" cy="30" r="12" fill={BODY} />
      <Circle cx="50" cy="30" r="12" fill="none" stroke={accent} strokeWidth="2" />

      {/* class emblem */}
      <Emblem stat={stat} color={accent} />

      {/* milestone pips above the head */}
      <G>
        {Array.from({ length: pips }).map((_, i) => {
          const x = 50 + (i - (pips - 1) / 2) * 7;
          return <Circle key={i} cx={x} cy={12} r={2} fill={accent} />;
        })}
      </G>
    </Svg>
  );
}
