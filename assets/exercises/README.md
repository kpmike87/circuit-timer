# Exercise illustrations

These 51 original SVG movement diagrams belong to the Circuit Timer project. They are generated from editable pose coordinates in `tools/generate-exercise-media.mjs`; they do not use external photographs, image APIs, or third-party artwork.

Run `node tools/generate-exercise-media.mjs` from the repository root to regenerate the SVGs and `exercise-media.js`. Every catalog ID has a distinct file. The two panels show setup and movement/hold positions; static holds intentionally repeat the same pose. Equipment and variation cues are specific to the catalog entry. Dashed elastic on the chest press indicates the hidden route behind the torso.

These are simplified static schematics, not animation or a professional assessment of exercise technique. Written instructions remain visible and authoritative. The modal lets users inspect the picture and instructions together. A running workout pauses when its picture is opened and stays paused until the user presses Resume.

The app resolves pictures by known exercise ID only. Older generated plans without IDs and unknown IDs retain their text display. If an image fails, the written exercise and timer remain usable. All pictures are local and included in the v65 service-worker cache for offline use; AI generation still requires an internet connection.
