/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Converts a binary string to hexadecimal
 * @param {string} binary - Binary string (e.g. '0010001110000011')
 * @returns {string} - Hexadecimal string
 */
function binaryToHex(binary) {
  if (typeof binary !== 'string') {
    throw new Error('Binary hash must be a string');
  }

  // Pad binary string to multiple of 4
  const padded = binary.padStart(Math.ceil(binary.length / 4) * 4, '0');
  
  // Convert each 4 bits to hex
  let hex = '';
  for (let i = 0; i < padded.length; i += 4) {
    const chunk = padded.substr(i, 4);
    hex += parseInt(chunk, 2).toString(16);
  }
  return hex;
}

/**
 * Converts a hexadecimal string to binary
 * @param {string} hex - Hexadecimal string
 * @returns {string} - Binary string
 */
function hexToBinary(hex) {
  if (typeof hex !== 'string' || !/^[0-9a-f]+$/i.test(hex)) {
    throw new Error('Invalid hex string');
  }

  return hex.split('').map(char => 
    parseInt(char, 16).toString(2).padStart(4, '0')
  ).join('');
}

/**
 * Calculates Hamming distance between two hex strings
 * @param {string} hash1 - First hash as hex string
 * @param {string} hash2 - Second hash as hex string
 * @returns {number} - Hamming distance (number of differing bits)
 */
export function hammingDistance(hash1, hash2) {
  // Validate hex format
  if (!/^[0-9a-f]{16}$/i.test(hash1) || !/^[0-9a-f]{16}$/i.test(hash2)) {
    throw new Error('Both hashes must be 16-character hex strings');
  }

  // Convert hex to binary
  const bin1 = hexToBinary(hash1);
  const bin2 = hexToBinary(hash2);

  // Count differing bits
  let distance = 0;
  for (let i = 0; i < bin1.length; i++) {
    if (bin1[i] !== bin2[i]) {
      distance++;
    }
  }

  return distance;
}

/**
 * Checks if two image hashes are similar
 * @param {string} hash1 - First hash as hex string
 * @param {string} hash2 - Second hash as hex string
 * @param {number} threshold - Maximum allowed Hamming distance
 * @returns {boolean} - True if images are considered similar
 */
export function areSimilarImages(hash1, hash2, threshold = 10) {
  try {
    return hammingDistance(hash1, hash2) <= threshold;
  } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    // If hashes are invalid, they're not similar
    return false;
  }
}

/**
 * Converts a binary perceptual hash to hexadecimal format
 * @param {string} binaryHash - Binary hash from sharp-phash
 * @returns {string} - 16-character hexadecimal hash
 */
export function formatHash(binaryHash) {
  if (!binaryHash || typeof binaryHash !== 'string') {
    throw new Error('Invalid binary hash');
  }

  const hex = binaryToHex(binaryHash);
  
  // Validate final format
  if (!/^[0-9a-f]{16}$/i.test(hex)) {
    throw new Error('Failed to generate valid 16-character hex hash');
  }
  
  return hex;
}
