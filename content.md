Verification Plan
Once the prompt update and sanitizer are deployed, validate this way:

Generate 10 stories across all 5 vibes and a mix of ages. Log every tag the LLM produces. Eyeball the placement.
Check tag distribution — count tags per section. Expected pattern:

Opening: 0-1 tags
Invitation: 0-1 tags
Journey: 1-3 tags
Heart: 1-2 tags
Sleep Ending: 3-5 tags

If the sleep ending isn't dominant, the LLM is misunderstanding the brief.
Run them through Fish Audio with the same parent voice clone. Listen specifically for:

Does the sleep ending actually sound quieter and slower than the rest?
Does the heart moment have a perceptible warmth shift?
Are there any abrupt tonal jumps where a tag landed wrong?


Sanitizer warning rate — should be under 15% of stories triggering at least one warning after one week of iteration. Below 5% means the prompt is working well.
A/B test against an untagged baseline — generate the same story with and without tags (delete the EMOTION TAGS section to test). Listen blind. The tagged version should clearly feel more bedtime-suitable. If it doesn't, the placement isn't earning its complexity.





POST /api/generate-story ← single endpoint, two stages

Stage 1 — Story generation (LLM)


Request arrives
  → validate schema (vibeId, childName, world, etc.)
  → pick client: Azure OpenAI or OpenAI directly
  → call GPT with system prompt (includes emotion tag instructions)
  → extract storyText from completion
  → strip title line → { title, storyBody }
  → return JSON { success, title, storyText } to client
No audio here. Client stores the text.

POST /api/generate-audio ← separate endpoint, called after


Request arrives with { text, vibeId, voiceId, provider... }
  → route by TTS provider:

  ┌─ ElevenLabs ──────────────────────────────────────
  │  prepareTextForTTS(text, vibeId)      ← SSML pipeline
  │  resolveElevenLabsVoice(...)
  │  check cache → HIT: serve immediately
  │  MISS: call ElevenLabs API
  │  normalizeLoudness() via audioNormalizer.js
  │  store in cache → stream to client
  │
  ├─ Fish Audio ──────────────────────────────────────
  │  prepareTextForFishAudio(text)        ← sanitize tags
  │  check cache → HIT: serve immediately
  │  MISS: call Fish Audio API
  │  postProcessAudio() via story.js      ← dynaudnorm + lowpass + fades
  │  store in cache → stream to client
  │
  └─ Azure / OpenAI TTS ─────────────────────────────
     prepareTextForTTS(text, vibeId)
     call Azure/OpenAI TTS API
     stream to client



With ElevenLabs, parents pick a voice from a list. With Fish Audio + parent cloning, parents create the voice. This is a much more emotionally meaningful first-run experience — and a much higher conversion event. You're not just signing them up for a service; you're capturing something personal and irreplaceable.
Frame the recording flow accordingly. Don't make it feel like "audio setup." Make it feel like a small, sweet moment — "Record your voice once, and Storybell will read every story to your little one in your voice, even when you can't be there."


Some of your most emotionally compelling marketing is grandparent voices, especially distant or aging ones. A grandparent records their voice, the family preserves it, the child grows up with bedtime stories in grandma's voice. Fish Audio explicitly markets the use case of preserving a loved one's voice for personalized messages and stories that last generations. This is meaningful product territory, especially for an Indian user base where multi-generational family closeness is culturally central.

A bedtime story read by an AI voice is technology. A bedtime story read by an AI clone of a parent's voice is something deeper — it's presence stretched across time and distance. A child whose dad travels for work, whose mom is at the hospital with a sibling, whose grandparents live abroad — these children will hear the voices that love them, every night, in the moment that matters most.
