import { readFileSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";

// Keep the custom sage finders and original gold heart exactly as drawn.
const path = new URL("../public/qr.svg", import.meta.url);
const previous = readFileSync(path, "utf8");
const artwork = previous.slice(previous.indexOf('<rect x="45.0"'), previous.lastIndexOf("</svg>"));
if (!artwork.includes('id="hh-heart"') || !artwork.includes('stroke="#6b7a4a"')) throw new Error("Original QR artwork is missing");
const qr = QRCode.create("https://heavensharvestpantry.com/menu?src=qr", { version: 6, errorCorrectionLevel: "H" });
let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 490 490" width="490" height="490"><rect width="490" height="490" fill="#ffffff"/>';
for (let row = 0; row < 41; row++) for (let column = 0; column < 41; column++) {
  const finder = (row < 7 && column < 7) || (row < 7 && column >= 34) || (row >= 34 && column < 7);
  const heart = Math.abs(row - 20) <= 2 && Math.abs(column - 20) <= 2;
  if (!finder && !heart && qr.modules.get(row, column)) svg += `<rect x="${(column + 4) * 10}" y="${(row + 4) * 10}" width="10" height="10" rx="3" fill="#5b3d1e"/>`;
}
svg += artwork + "</svg>\n";
writeFileSync(path, svg);
writeFileSync(new URL("../public/qr-print.svg", import.meta.url), svg.replaceAll("#5b3d1e", "#1a1208").replaceAll("#6b7a4a", "#1a1208").replaceAll("#c9a06a", "#1a1208"));
console.log("Updated both shop QR destinations; original corner and heart artwork retained.");
