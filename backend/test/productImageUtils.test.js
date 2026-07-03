const test = require('node:test');
const assert = require('node:assert/strict');
const { resolvePrimaryImageUrl } = require('../src/utils/productImageUtils');

test('resolvePrimaryImageUrl falls back to the first available image when no primary flag exists', () => {
  const images = [
    { image_id: '1', image_url: '/uploads/first.jpg', is_primary: false },
    { image_id: '2', image_url: '/uploads/second.jpg', is_primary: false },
  ];

  assert.equal(resolvePrimaryImageUrl(images), '/uploads/first.jpg');
});

test('resolvePrimaryImageUrl prefers a flagged primary image', () => {
  const images = [
    { image_id: '1', image_url: '/uploads/first.jpg', is_primary: false },
    { image_id: '2', image_url: '/uploads/second.jpg', is_primary: true },
  ];

  assert.equal(resolvePrimaryImageUrl(images), '/uploads/second.jpg');
});
