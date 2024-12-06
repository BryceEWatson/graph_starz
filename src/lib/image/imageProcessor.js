import { promises as fs } from 'fs';

export async function imageToBase64(buffer) {
  // Convert Buffer to base64 string
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Invalid input: Expected a Buffer');
  }
  return buffer.toString('base64');
}

export async function processImage(imagePath) {
  const file = await fs.readFile(imagePath);
  
  const formData = new FormData();
  formData.append('file', new Blob([file], { type: 'image/jpeg' }), imagePath.split('/').pop());

  const response = await fetch('http://localhost:3000/api/images/process', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to process image: ${response.statusText}`);
  }

  const result = await response.json();
  return result;
}
