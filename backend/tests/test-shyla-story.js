const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3001/api/generate-audio';
const OUTPUT_FILE = path.join(__dirname, 'shyla-story.mp3');

const storyText = `Once upon a time, in a cozy little house painted in soft shades of purple, there lived a sweet girl named Shyla. One lovely evening, as the stars began to twinkle in the sky, Shyla snuggled into her warm purple blanket, feeling safe and cozy. The gentle hum of the night whispered lullabies, and soon, her little eyes began to flutter.

As Shyla drifted off to sleep, she felt a soft breeze wrap around her like a warm hug. Suddenly, she found herself floating high above the clouds, and oh, how soft and fluffy those clouds were! They shimmered in beautiful shades of purple, just like her favorite color.`;

async function testStoryTts() {
    console.log('Sending story to Azure TTS API...');
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: storyText,
                voice: 'shimmer'
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('API Error:', error);
            return;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        fs.writeFileSync(OUTPUT_FILE, buffer);
        console.log(`Success! Story audio saved to: ${OUTPUT_FILE}`);
        console.log(`File size: ${(buffer.length / 1024).toFixed(1)} KB`);
        
    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

testStoryTts();
