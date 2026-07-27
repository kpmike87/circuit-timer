# Circuit Timer

A mobile-first work/rest interval timer built with plain HTML, CSS, and JavaScript.

## Version 1

- Custom workout and rest durations
- Selectable total workout duration
- Total elapsed workout time across work and rest intervals
- Total workout time remaining
- Automatic completion when the selected total time is reached
- Automatic continuous interval switching
- Landscape-first workout layout with centered timer and compact settings
- Black pause screen and clear in-progress status
- Large WORK and REST displays with distinct colors
- Start/end and pause/resume controls
- Screen wake lock when supported
- Device-local saved settings
- Installable and available offline as a Progressive Web App

## Try it locally

Serve this folder from any local web server and open `index.html` through the server URL. A local server is required to test the service worker and installation behavior.

For a quick timer-only preview, `index.html` can also be opened directly in a browser, but offline installation and screen wake lock may not be available.

## Phone installation

After publishing the folder over HTTPS:

- iPhone: open the URL in Safari, tap Share, choose **Add to Home Screen**, and enable **Open as Web App**.
- Android: open the URL in Chrome and choose **Install app** or **Add to Home screen**.
