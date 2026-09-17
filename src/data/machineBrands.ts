/** Normalized manufacturer names. Kept deliberately small; people can suggest a missing one. */
export const machineBrands = [
  "Atlantis", "Cybex", "Eleiko", "Gym80", "Hammer Strength", "Hoist", "Life Fitness", "Matrix", "Nautilus", "Panatta", "Prime Fitness", "Star Trac", "Technogym", "Watson",
].sort((a, b) => a.localeCompare(b, "es"));

export const normalizeMachineBrand = (value: string) => value.trim().replace(/\s+/g, " ").slice(0, 60);
