// Procedural avatar art that EVOLVES with level. A stylised humanoid tinted by
// the class's signature stat that gains gear across five evolution stages:
//   0 Novice (<10)   – bare figure + emblem
//   1 Adept (10-19)  – a class weapon appears
//   2 Veteran (20-29)– pauldrons + brighter aura
//   3 Champion (30-49)– a crown/headpiece
//   4 Ascended (50+) – wings + halo, full aura
//
// All vector, so it scales cleanly and needs no art assets.

import React from "react";
import Svg, { Circle, Path, Polygon, Line, G } from "react-native-svg";
import { BASE_CLASSES } from "../../engine/classes.js";
import { colors, STAT_COLORS } from "../theme.js";

export const STAGE_TITLES = ["Novice", "Adept", "Veteran", "Champion", "Ascended"];

export function evolutionStage(level = 1) {
  if (level >= 50) return 4;
  if (level >= 30) return 3;
  if (level >= 20) return 2;
  if (level >= 10) return 1;
  return 0;
}

const BODY = "#c3ccd9";
const BODY_DARK = "#9aa7b4";

function Emblem({ stat, color }) {
  switch (stat) {
    case "STR": return <Polygon points="50,52 56,63 44,63" fill={color} />;
    case "VIT": return <Path d="M50 51 L57 54 L57 60 Q57 65 50 67 Q43 65 43 60 L43 54 Z" fill={color} />;
    case "END": return <Polygon points="50,51 56,55 56,61 50,65 44,61 44,55" fill={color} />;
    case "AGI": return <Polygon points="50,51 57,58 50,65 43,58" fill={color} />;
    case "INT": return <Circle cx="50" cy="58" r="6.5" fill={color} />;
    case "CHA": return <Polygon points="50,51 52,56 57,56 53,60 55,65 50,62 45,65 47,60 43,56 48,56" fill={color} />;
    case "LUK": return <Path d="M50 50 L53 57 L60 58 L53 59 L50 66 L47 59 L40 58 L47 57 Z" fill={color} />;
    default: return <Circle cx="50" cy="58" r="6" fill={color} />;
  }
}

// A class-specific weapon/implement, held on the figure's right side.
function Weapon({ classId, color }) {
  switch (classId) {
    case "knight": // sword
      return (
        <G>
          <Path d="M73 34 L76 40 L74 66 L72 66 L70 40 Z" fill={color} />
          <Path d="M66 62 H80 V65 H66 Z" fill={BODY_DARK} />
          <Path d="M72 65 H74 V73 H72 Z" fill={BODY_DARK} />
        </G>
      );
    case "sentinel": // shield
      return <Path d="M73 42 L82 47 L82 58 Q82 65 73 69 Q64 65 64 58 L64 47 Z" fill={color} stroke={BODY} strokeWidth="1.5" />;
    case "monk": // bo staff
      return <Line x1="58" y1="32" x2="86" y2="80" stroke={color} strokeWidth="3.5" strokeLinecap="round" />;
    case "ranger": // bow
      return (
        <G>
          <Path d="M74 36 Q88 56 74 76" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <Line x1="74" y1="36" x2="74" y2="76" stroke={BODY_DARK} strokeWidth="1" />
        </G>
      );
    case "scholar": // staff + orb
      return (
        <G>
          <Line x1="75" y1="34" x2="75" y2="78" stroke={BODY_DARK} strokeWidth="2.5" strokeLinecap="round" />
          <Circle cx="75" cy="32" r="5.5" fill={color} />
        </G>
      );
    case "herald": // banner
      return (
        <G>
          <Line x1="75" y1="30" x2="75" y2="80" stroke={BODY_DARK} strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M75 32 L88 37 L75 48 Z" fill={color} />
        </G>
      );
    case "wanderer": // floating coins
      return (
        <G>
          <Circle cx="78" cy="46" r="4" fill={color} />
          <Circle cx="83" cy="56" r="3.5" fill={color} opacity={0.8} />
          <Circle cx="76" cy="62" r="3" fill={color} opacity={0.6} />
        </G>
      );
    default:
      return null;
  }
}

export default function Avatar({ classId, level = 1, size = 96 }) {
  const cls = BASE_CLASSES[classId];
  const stat = cls?.boost ?? "STR";
  const accent = STAT_COLORS[stat] ?? colors.accent;
  const stage = evolutionStage(level);

  const auraOpacity = [0.1, 0.14, 0.18, 0.24, 0.32][stage];
  const ringWidth = [1.5, 2, 2.5, 3, 4][stage];

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* aura */}
      <Circle cx="50" cy="52" r="46" fill={accent} opacity={auraOpacity} />
      <Circle cx="50" cy="52" r="46" fill="none" stroke={accent} strokeWidth={ringWidth} opacity={0.85} />

      {/* Stage 4: wings + halo */}
      {stage >= 4 && (
        <G opacity={0.7}>
          <Path d="M34 50 Q14 44 12 64 Q26 58 34 66 Z" fill={accent} />
          <Path d="M66 50 Q86 44 88 64 Q74 58 66 66 Z" fill={accent} />
          <Circle cx="50" cy="20" r="11" fill="none" stroke={accent} strokeWidth="2.5" />
        </G>
      )}

      {/* cape */}
      <Path d="M34 46 L66 46 L72 86 L28 86 Z" fill={accent} opacity={0.55} />

      {/* legs */}
      <Path d="M44 74 L48 74 L47 90 L43 90 Z" fill={BODY_DARK} />
      <Path d="M52 74 L56 74 L57 90 L53 90 Z" fill={BODY_DARK} />

      {/* torso */}
      <Path d="M40 46 Q50 42 60 46 L57 76 L43 76 Z" fill={BODY} />

      {/* arms */}
      <Path d="M39 47 L34 70 L38 71 L43 49 Z" fill={BODY_DARK} />
      <Path d="M61 47 L66 70 L62 71 L57 49 Z" fill={BODY_DARK} />

      {/* Stage 1+: class weapon */}
      {stage >= 1 && <Weapon classId={classId} color={accent} />}

      {/* Stage 2+: pauldrons */}
      {stage >= 2 && (
        <G>
          <Path d="M36 46 Q41 42 44 47 L43 52 Q39 50 36 51 Z" fill={accent} />
          <Path d="M64 46 Q59 42 56 47 L57 52 Q61 50 64 51 Z" fill={accent} />
        </G>
      )}

      {/* head */}
      <Circle cx="50" cy="30" r="12" fill={BODY} />
      <Circle cx="50" cy="30" r="12" fill="none" stroke={accent} strokeWidth="2" />

      {/* Stage 3+: crown / headpiece */}
      {stage >= 3 && (
        <Polygon points="40,22 43,15 47,20 50,13 53,20 57,15 60,22" fill={accent} stroke={colors.bg} strokeWidth="0.5" />
      )}

      {/* class emblem */}
      <Emblem stat={stat} color={accent} />
    </Svg>
  );
}
