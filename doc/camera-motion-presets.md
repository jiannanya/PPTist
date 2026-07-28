# PPTist camera motion presets

The specialized PPTist build registers 64 camera presets in
`src/data/cameraMotionPresets.ts`:

- 32 cinematic camera moves;
- 32 social-video camera moves.

The permanent visual demo is `camera-motion-presets-demo.html`. Start the Vite
app and open that page from the printed local URL:

```powershell
npm run dev
```

## Editor workflow

1. Open the motion timeline.
2. Move the playhead to the desired narration cue.
3. Select an ordinary slide element when the preset uses `$selected`.
4. Choose a preset from the **运镜 64** picker.
5. Click **添加运镜**.

The editor expands the preset into one or more normal `slide.motion.steps`.
The complete insertion is committed as one named history transaction, so one
undo removes the entire preset.

## Trusted targets

- `$stage`: full storyboard camera layer;
- `$background`: background layer;
- `$selected`: selected ordinary PPTist element, with first-element fallback.

No executable code is written into a `.pptist` file. Presets are trusted local
templates that generate sanitized `set`, `from`, `to`, and `fromTo` frames.

## Runtime behavior

The presets use the same `createMotionTimeline()` factory as ordinary motion
frames and GSAPify registered effects. Most movement uses compositor-friendly
transforms. Blur, brightness, and contrast are reserved for focus, flash,
reveal, and glitch presets. Every loop is finite, and the slide-level
`reducedMotion` behavior remains active.

Run the demo's **验证 64 个** action after changing the registry. The required
result is:

```text
验证通过：64 / 64，失败 0
```
