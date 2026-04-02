const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const {
  AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_API_VERSION,
  AZURE_OPENAI_TTS_DEPLOYMENT
} = process.env;

const API_VERSIONS = [
  '2024-05-01-preview',
  '2024-10-01-preview',
  '2024-02-15-preview',
  '2025-01-01-preview', // new preview if exists
  AZURE_OPENAI_API_VERSION // user's provided version
];

async function probe() {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY || !AZURE_OPENAI_TTS_DEPLOYMENT) {
    console.error('Missing Azure configuration in .env!');
    process.exit(1);
  }

  const baseEndpoint = AZURE_OPENAI_ENDPOINT.replace(/\/+$/, '');
  const deployment = AZURE_OPENAI_TTS_DEPLOYMENT;

  const variations = [
    // Variation 1: Standard deployments path
    (apiVersion) => ({
      name: 'Deployments Path',
      url: `${baseEndpoint}/openai/deployments/${deployment}/audio/speech?api-version=${apiVersion}`,
      body: { input: 'Hello!', voice: 'shimmer', response_format: 'mp3' }
    }),
    // Variation 2: Deployments Path with explicit model name in body
    (apiVersion) => ({
      name: 'Deployments Path (with model in body)',
      url: `${baseEndpoint}/openai/deployments/${deployment}/audio/speech?api-version=${apiVersion}`,
      body: { model: deployment, input: 'Hello!', voice: 'shimmer', response_format: 'mp3' }
    }),
    // Variation 3: Unified v1 path
    (apiVersion) => ({
      name: 'Unified V1 Path',
      url: `${baseEndpoint}/openai/v1/audio/speech?api-version=${apiVersion}`,
      body: { model: deployment, input: 'Hello!', voice: 'shimmer', response_format: 'mp3' }
    }),
    // Variation 4: Unified V1 Path with the openai.azure.com subdomain format
    (apiVersion) => {
      const altEndpoint = baseEndpoint.replace('cognitiveservices.azure.com', 'openai.azure.com');
      return {
        name: 'V1 Path (.openai.azure.com)',
        url: `${altEndpoint}/openai/v1/audio/speech?api-version=${apiVersion}`,
        body: { model: deployment, input: 'Hello!', voice: 'shimmer', response_format: 'mp3' }
      };
    }
  ];

  console.log('--- Azure OpenAI TTS Probing ---');
  console.log('Endpoint:', baseEndpoint);
  console.log('Deployment:', deployment);

  for (const apiVersion of API_VERSIONS) {
    console.log(`\nTesting API Version: ${apiVersion}`);
    for (const variationFn of variations) {
      const { name, url, body } = variationFn(apiVersion);
      console.log(`[Testing: ${name}] ${url}`);
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'api-key': AZURE_OPENAI_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          console.log(`✅ SUCCESS! ${name} works with version ${apiVersion}`);
          const buffer = Buffer.from(await response.arrayBuffer());
          fs.writeFileSync(path.join(__dirname, 'probe-success.mp3'), buffer);
          process.exit(0);
        } else {
          const bodyText = await response.text();
          console.log(`❌ FAILED (${response.status}): ${bodyText.substring(0, 100)}`);
        }
      } catch (err) {
        console.log(`⚠️ ERROR: ${err.message}`);
      }
    }
  }

  console.log('\n--- Probe Complete: No working configuration found ---');
}

probe();
