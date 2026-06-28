// A radar / spider chart (like an RPG stat sheet). Each axis is one stat,
// labelled by name; the filled polygon traces the values. The signature stat's
// point is marked so a class's focus reads at a glance.
//
// The radial scale auto-fits the data range (rather than 0..N) so small stat
// differences — e.g. a class's +1 — still show a clear, readable spike.

import React from "react";
import Svg, { Polygon, Line, Circle, Text as SvgText, G } from "react-native-svg";
import { colors } from "../theme.js";

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

// data: [{ key, label, value, emphasized, color }]
export default function RadarChart({ data, size = 280 }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 48; // leave room for axis labels
  const n = data.length;

  const values = data.map((d) => d.value);
  const min = Math.max(0, Math.min(...values) - 1);
  const max = Math.max(...values) + 1;
  const norm = (v) => (max === min ? 0.5 : (v - min) / (max - min));

  const angleFor = (i) => (i * 360) / n;
  const rings = [0.34, 0.67, 1]; // concentric grid

  // Build the polygon point string and per-vertex metadata.
  const verts = data.map((d, i) => {
    const angle = angleFor(i);
    const r = R * norm(d.value);
    const p = polar(cx, cy, r, angle);
    const axisEnd = polar(cx, cy, R, angle);
    const labelPt = polar(cx, cy, R + 16, angle);
    const anchor =
      Math.abs(labelPt.x - cx) < 6 ? "middle" : labelPt.x > cx ? "start" : "end";
    return { ...d, angle, p, axisEnd, labelPt, anchor };
  });

  const polyPoints = verts.map((v) => `${v.p.x},${v.p.y}`).join(" ");

  return (
    <Svg width={size} height={size}>
      {/* concentric grid rings */}
      {rings.map((ring, ri) => {
        const pts = data
          .map((_, i) => {
            const p = polar(cx, cy, R * ring, angleFor(i));
            return `${p.x},${p.y}`;
          })
          .join(" ");
        return <Polygon key={ri} points={pts} fill="none" stroke={colors.border} strokeWidth={1} />;
      })}

      {/* axis spokes */}
      {verts.map((v) => (
        <Line key={`ax-${v.key}`} x1={cx} y1={cy} x2={v.axisEnd.x} y2={v.axisEnd.y} stroke={colors.border} strokeWidth={1} />
      ))}

      {/* the class polygon */}
      <Polygon points={polyPoints} fill={colors.accent} fillOpacity={0.28} stroke={colors.accent} strokeWidth={2} />

      {/* vertices + labels */}
      {verts.map((v) => (
        <G key={`v-${v.key}`}>
          <Circle
            cx={v.p.x}
            cy={v.p.y}
            r={v.emphasized ? 5 : 3}
            fill={v.emphasized ? v.color || colors.gold : colors.accent}
            stroke={colors.bg}
            strokeWidth={1}
          />
          <SvgText
            x={v.labelPt.x}
            y={v.labelPt.y + 4}
            fill={v.emphasized ? v.color || colors.text : colors.textDim}
            fontSize={11}
            fontWeight={v.emphasized ? "700" : "500"}
            textAnchor={v.anchor}
          >
            {v.label}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}
