import test from 'node:test';
import assert from 'node:assert/strict';
import { readBubbles } from '../src/omrBubbleReader.mjs';

const width = 720;
const height = 150;
const pixel = (data, x, y, value) => {
  const index = (y * width + x) * 4;
  data[index] = data[index + 1] = data[index + 2] = value;
  data[index + 3] = 255;
};
const centerX = offset => {
  const gridWidth = (width - 24) * 0.78;
  const gridX = 12 + (width - 24 - gridWidth) / 2;
  return Math.round(gridX + (gridWidth - 4 * 38) + 19 + offset);
};
const mark = (data, xCenter, yCenter, radius = 8) => {
  for (let y = yCenter - radius; y <= yCenter + radius; y++) {
    for (let x = xCenter - radius; x <= xCenter + radius; x++) {
      if ((x - xCenter) ** 2 + (y - yCenter) ** 2 <= radius ** 2) pixel(data, x, y, 0);
    }
  }
};
const image = () => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 255;
  return { data, width, height };
};

test('reads a single dark answer using Secundaria calibration', () => {
  const sheet = image();
  mark(sheet.data, centerX(-8), 88);
  const [answer] = readBubbles(sheet, 1, { xOffset: -8, yStart: 88 });
  assert.equal(answer.respuesta, 'A');
  assert.equal(answer.estado, 'read');
});

test('leaves a blank row unanswered', () => {
  const [answer] = readBubbles(image(), 1, { xOffset: -8, yStart: 88 });
  assert.equal(answer.respuesta, '');
  assert.equal(answer.estado, 'blank');
});

test('flags two equally strong marks for manual review', () => {
  const sheet = image();
  mark(sheet.data, centerX(-8), 88);
  mark(sheet.data, centerX(-8) + 38, 88);
  const [answer] = readBubbles(sheet, 1, { xOffset: -8, yStart: 88 });
  assert.equal(answer.respuesta, '');
  assert.equal(answer.estado, 'multiple');
});
