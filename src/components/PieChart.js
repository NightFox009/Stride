// A small SVG pie chart. Each slice is one stat; the class's signature stat is
// drawn "exploded" (pushed out + outlined) so a class's affinity reads at a
// glance from the shape and colour — no text label needed.

import React from "react";
import Svg, { Path, G, Circle } from "react-native-svg";
import { colors } from "../theme.js";

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

// Wedge path from startAngle to endAngle (degrees, clockwise from top).
function wedge(cx, cy, r, startAngle, endAngle) {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

// data: [{ key, value, color, emphasized }]
export default function PieChart({ data, size = 200 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 12; // leave room for the exploded slice
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  let angle = 0;
  const slices = data.map((d) => {
    const sweep = (d.value / total) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;

    // Offset emphasized slices outward along their mid-angle.
    const mid = (start + end) / 2;
    const offset = d.emphasized ? 8 : 0;
    const o = polar(0, 0, offset, mid);

    return { ...d, start, end, ox: o.x, oy: o.y };
  });

  return (
    <Svg width={size} height={size}>
      {slices.map((s) => (
        <G key={s.key} x={s.ox} y={s.oy}>
          <Path
            d={wedge(cx, cy, r, s.start, s.end)}
            fill={s.color}
            opacity={s.emphasized ? 1 : 0.62}
            stroke={s.emphasized ? colors.text : colors.bg}
            strokeWidth={s.emphasized ? 2 : 1}
          />
        </G>
      ))}
      {/* Subtle inner disc for a cleaner centre. */}
      <Circle cx={cx} cy={cy} r={r * 0.28} fill={colors.surface} />
    </Svg>
  );
}
