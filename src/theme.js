// One small dark palette shared across screens. Keeps the shell coherent and
// easy to restyle later.
export const colors = {
  bg: "#0e1117",
  surface: "#161b22",
  surfaceAlt: "#1f2630",
  border: "#2a313c",
  text: "#e6edf3",
  textDim: "#9aa7b4",
  accent: "#5ad1a0", // accent green (rewards / highlights)
  exp: "#6ea8fe", // EXP blue
  hp: "#f47174",
  gold: "#e3b341",
  danger: "#f85149",
};

export const spacing = (n) => n * 8;

// One colour per stat — used by the class-affinity pie chart so each class has a
// recognisable "shape" without ever spelling out which stat it favours.
export const STAT_COLORS = {
  STR: "#f47174", // red
  END: "#e3a857", // amber
  AGI: "#5ad1a0", // green
  VIT: "#f0a3c8", // pink
  INT: "#6ea8fe", // blue
  CHA: "#c792ea", // violet
  LUK: "#e3b341", // gold
};
