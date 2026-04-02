const fs = require('fs');
const path = require('path');

/**
 * Simple script to test the /api/generate-audio endpoint with Azure TTS.
 * Usage: TTS_PROVIDER=azure AZURE_OPENAI_API_KEY=xxx ... node tests/test-azure-tts.js
 */
async function testAzureTTS() {
  const url = 'http://localhost:3001/api/generate-audio';
  const payload = {
    text: 'Hello! This is a test of the Azure OpenAI Text to Speech integration in Snoozy.',
    voice: 'shimmer'
  };

  console.log('Sending request to:', url);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('Error status:', response.status);
      const errorText = await response.text();
      console.error('Error data:', errorText);
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const outputPath = path.join(__dirname, 'test-output.mp3');
    fs.writeFileSync(outputPath, buffer);
    
    console.log('Success! Audio saved to:', outputPath);
    console.log('Response size:', buffer.byteLength, 'bytes');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAzureTTS();
