const buttonEncrypt = document.querySelector('#encrypt');
const buttonDecrypt = document.querySelector('#decrypt');
const buttonClear = document.querySelector('#clear');
const keyInput = document.querySelector('#key');
const textarea = document.querySelector('#text');
const buttonGenerateKey = document.querySelector('#generate-key');

const WordSize = 32;
const Rounds = 12;

function generateKey(length = 16) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < length; i++) {
    key += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return key;
}

function keySchedule(key) {
  const L = [];
  for (let i = 0; i < key.length / 4; i++) {
    L[i] = (key.charCodeAt(i * 4) << 24) |
      (key.charCodeAt(i * 4 + 1) << 16) |
      (key.charCodeAt(i * 4 + 2) << 8) |
      (key.charCodeAt(i * 4 + 3));
  }

  const P = 0xb7e15163;
  const Q = 0x9e3779b9;
  const S = new Array(2 * Rounds + 2);
  S[0] = P;
  for (let i = 1; i < S.length; i++) {
    S[i] = (S[i - 1] + Q) >>> 0;
  }
  let j = 0;
  let A = 0, B = 0;
  for (let i = 0; i < S.length; i++) {
    A = S[i] = (S[i] + A + B) >>> 0;
    B = L[j] = (L[j] + A) >>> 0;
    j = (j + 1) % L.length;
  }
  return S;
}

function encryptBlock(plainText, key) {
  const S = keySchedule(key);
  let A = plainText[0], B = plainText[1];
  A = (A + S[0]) >>> 0;
  B = (B + S[1]) >>> 0;
  for (let i = 1; i <= Rounds; i++) {
    A = (rotateLeft(A ^ B, B) + S[2 * i]) >>> 0;
    B = (rotateLeft(B ^ A, A) + S[2 * i + 1]) >>> 0;
  }
  return [A, B];
}

function decryptBlock(cipherText, key) {
  const S = keySchedule(key);
  let A = cipherText[0], B = cipherText[1];

  for (let i = Rounds; i >= 1; i--) {
    B = rotateRight(B - S[2 * i + 1], A) ^ A;
    A = rotateRight(A - S[2 * i], B) ^ B;
  }
  A = (A - S[0]) >>> 0;
  B = (B - S[1]) >>> 0;
  return [A, B];
}

function stringToBlocks(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const blocks = [];
  for (let i = 0; i < data.length; i += 8) {
    const block = [];
    block[0] = (data[i] |
      (data[i + 1] << 8) |
      (data[i + 2] << 16) |
      (data[i + 3] << 24)) >>> 0;
    block[1] = (data[i + 4] |
      (data[i + 5] << 8) |
      (data[i + 6] << 16) |
      (data[i + 7] << 24)) >>> 0;
    blocks.push(block);
  }
  return blocks;
}

function blocksToString(blocks) {
  const bytes = [];
  for (const block of blocks) {
    bytes.push(block[0] & 0xff, (block[0] >> 8) & 0xff, (block[0] >> 16) & 0xff, (block[0] >> 24) & 0xff);
    bytes.push(block[1] & 0xff, (block[1] >> 8) & 0xff, (block[1] >> 16) & 0xff, (block[1] >> 24) & 0xff);
  }
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(new Uint8Array(bytes));
}


function blocksToBase64(blocks) {
  const bytes = [];
  for (const block of blocks) {
    bytes.push(block[0] & 0xff, (block[0] >> 8) & 0xff, (block[0] >> 16) & 0xff, (block[0] >> 24) & 0xff);
    bytes.push(block[1] & 0xff, (block[1] >> 8) & 0xff, (block[1] >> 16) & 0xff, (block[1] >> 24) & 0xff);
  }
  return btoa(String.fromCharCode(...bytes)); 
}


function base64ToBlocks(base64) {
  const bytes = new Uint8Array(atob(base64).split('').map(char => char.charCodeAt(0)));
  const blocks = [];
  for (let i = 0; i < bytes.length; i += 8) {
    const block = [];
    block[0] = (bytes[i] |
      (bytes[i + 1] << 8) |
      (bytes[i + 2] << 16) |
      (bytes[i + 3] << 24)) >>> 0;
    block[1] = (bytes[i + 4] |
      (bytes[i + 5] << 8) |
      (bytes[i + 6] << 16) |
      (bytes[i + 7] << 24)) >>> 0;
    blocks.push(block);
  }
  return blocks;
}

function rotateLeft(value, shift) {
  return ((value << (shift % 32)) | (value >>> (32 - (shift % 32)))) >>> 0;
}

function rotateRight(value, shift) {
  return ((value >>> (shift % 32)) | (value << (32 - (shift % 32)))) >>> 0;
}

buttonEncrypt.addEventListener('click', () => {
  let key = keyInput.value; 
  const text = textarea.value;
  if (!key) {
    key = generateKey();
    keyInput.value = key; 
  }
  if (key.length < 8 || key.length > 32) {
    alert("Длина ключа должна составлять от 8 до 32 символов.");
    return;
  }

  const blocks = stringToBlocks(text); 
  const encryptedBlocks = blocks.map(block => encryptBlock(block, key)); 
  textarea.value = blocksToBase64(encryptedBlocks); 
});

buttonDecrypt.addEventListener('click', () => {
  let key = keyInput.value;
  const ciphertext = textarea.value;
  if (!key) {
    key = generateKey();
    keyInput.value = key;
  }
  if (key.length < 8 || key.length > 32) {
    alert("Длина ключа должна составлять от 8 до 32 символов.");
    return;
  }

  const blocks = base64ToBlocks(ciphertext);
  const decryptedBlocks = blocks.map(block => decryptBlock(block, key));
  textarea.value = blocksToString(decryptedBlocks);
});

buttonClear.addEventListener('click', () => {
  textarea.value = '';
  keyInput.value = '';
});

buttonGenerateKey.addEventListener('click', () => {
  const key = generateKey();
  keyInput.value = key;
});
