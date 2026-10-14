const defaultColor = "#173c35";
const fonts = {
  system: 'Inter, "Segoe UI", system-ui, sans-serif',
  sans: "Arial, Helvetica, sans-serif",
  serif: 'Georgia, "Times New Roman", serif',
} as const;

export type PublicFont = keyof typeof fonts;

function rgb(hex: string) {
  return [1, 3, 5].map(
    (offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
}

function linear(channel: number) {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: string) {
  const channels = rgb(color).map(linear);
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

export function contrastRatio(foreground: string, background: string) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function darkenForWhiteContrast(color: string) {
  if (contrastRatio(color, "#ffffff") >= 4.5) return color;
  const channels = rgb(color).map((channel) => Math.round(channel * 255));
  let low = 0;
  let high = 1;
  for (let index = 0; index < 24; index++) {
    const factor = (low + high) / 2;
    const candidate = `#${channels
      .map((channel) =>
        Math.round(channel * factor)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;
    if (contrastRatio(candidate, "#ffffff") >= 4.5) low = factor;
    else high = factor;
  }
  return `#${channels
    .map((channel) =>
      Math.round(channel * low)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function publicBranding(tokens: unknown) {
  const record =
    tokens && typeof tokens === "object"
      ? (tokens as Record<string, unknown>)
      : {};
  const proposed =
    typeof record.primary === "string" && /^#[\da-f]{6}$/iu.test(record.primary)
      ? record.primary.toLowerCase()
      : defaultColor;
  const primaryColor = darkenForWhiteContrast(proposed);
  const fontFamily: PublicFont =
    typeof record.font === "string" && Object.hasOwn(fonts, record.font)
      ? (record.font as PublicFont)
      : "system";
  return {
    primaryColor,
    buttonTextColor:
      contrastRatio(primaryColor, "#ffffff") >= 4.5 ? "#ffffff" : "#111111",
    fontFamily,
    fontStack: fonts[fontFamily],
  };
}
