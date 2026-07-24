# Catch the Invisible AI Cheater

Browser-only prototype for the InCruiter hackathon challenge, built to flag suspicious interview behavior that may indicate use of hidden AI overlay tools.

## What this project does

This app is a zero-install interview integrity demo. It does not try to directly "see" stealth overlays. Instead, it watches for browser-visible behavior signals that often accompany cheating:

- Tab or window switching during answers
- Paste-heavy responses
- Copy activity
- Suspiciously fast answering

The app turns those signals into a human-review risk score:

- `Clean`
- `Suspicious`
- `High-risk`

It also shows a reviewer-friendly evidence timeline so the signal is explainable instead of being a black box.

## Files

- `index.html` - main interview and reviewer UI
- `styles.css` - page styling
- `app.js` - scoring logic and browser event tracking

## Quick start

1. Put `index.html`, `styles.css`, and `app.js` in the same folder.
2. Open PowerShell in that folder.
3. Run:

```powershell
python -m http.server 8000
```

4. Open:

```text
http://localhost:8000
```

## How to use the demo

1. Check the consent box.
2. Click `Start session`.
3. Answer the first question normally to establish a clean baseline.
4. Try one of the suspicious behaviors below to raise the score:
   - Switch to another tab while answering
   - Paste a prepared answer into the text box
   - Copy text and then paste it
   - Submit a very polished answer very quickly
5. Watch the risk score and timeline update.
6. Click `Export JSON` to save the session report.

## What the signals mean

The prototype combines multiple weak signals instead of relying on one magical detector. That helps reduce false alarms for honest candidates.

Examples:

- `blur` and `visibilitychange` events suggest the user left the interview tab
- `paste` events suggest copied or externally generated text
- quick submission after a question appears can indicate outside assistance
- repeated suspicious behavior across several questions increases the risk score

## Demo scenario

For a live presentation, a good flow is:

1. Start a clean session and answer one question normally.
2. Switch tabs briefly on the next question.
3. Paste a prepared response.
4. Show the score increase.
5. Open the reviewer dashboard and explain the evidence timeline.

## Risk scoring

The app uses a simple score from `0` to `100`.

- `0-24` = `Clean`
- `25-59` = `Suspicious`
- `60-100` = `High-risk`

The output is only a signal for human review. It never auto-rejects a candidate.

## Honest limits

This prototype is intentionally honest about what it can and cannot catch:

- It cannot directly detect every hidden overlay tool
- It cannot reliably know what is on a second monitor
- It may miss very careful cheating behavior
- It may occasionally flag honest candidates who switch tabs or paste legitimately

The goal is not perfect detection. The goal is a practical, defensible, zero-install review signal with evidence.

## Deployment

Because this is a static site, the easiest deployment options are:

- GitHub Pages
- Netlify

Make sure the files stay at the repository root:

```text
index.html
styles.css
app.js
```

## Suggested presentation points

- Problem: hidden AI copilot tools are designed to evade normal proctoring
- Approach: browser-only behavior monitoring with risk scoring
- Demo: show tab switching and paste detection
- Reviewer value: timeline and JSON export make the signal explainable
- Limits: honest about what the system cannot catch

## License

For hackathon use. Add a license if you plan to publish it publicly.

