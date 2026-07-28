# PPTist camera motion presets

The specialized PPTist build registers 96 camera presets in
`src/data/cameraMotionPresets.ts`:

- 48 cinematic camera moves;
- 48 social-video camera moves.

The permanent visual demo is `camera-motion-presets-demo.html`. Start the Vite
app and open that page from the printed local URL:

```powershell
npm run dev
```

## Editor workflow

1. Open the motion timeline.
2. Move the playhead to the desired narration cue.
3. Select an ordinary slide element when the preset uses `$selected`.
4. Choose a preset from the **运镜** picker. Its count is read directly from
   the preset registry.
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

Run the demo's **验证全部** action after changing the registry. The required
result is:

```text
验证通过：96 / 96，失败 0
```

## Added focus and reveal families

The extended catalog includes directional close-ups for the center, left,
right, top, and bottom of a slide; macro and rack-focus pushes; subject-lock
pushes; wide, contextual, subject-hold, and epilogue pull-outs; truck, jib, and
Steadicam-style moves; plus social-video punch focus, beat pushes, mask/lift
transitions, POV, selfie, low-angle, and reverse reveals.
