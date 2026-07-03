const resolvePrimaryImageUrl = (images = []) => {
  if (!Array.isArray(images) || !images.length) return null;

  const primary = images.find((image) => image?.is_primary);
  if (primary?.image_url) return primary.image_url;

  const first = images.find((image) => image?.image_url);
  return first?.image_url || null;
};

module.exports = { resolvePrimaryImageUrl };
