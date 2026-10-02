# PDF Content Editor — GitHub Pages

A browser-only PDF visual editor. It uses PDF.js for rendering/text detection and pdf-lib for exporting.

## Deploy on GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `style.css`, `app.js`, and this `README.md`.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`, then Save.
6. Open the generated GitHub Pages URL.

## Editing model

The browser cannot reliably rewrite arbitrary embedded PDF text while preserving every original font, encoding, and graphic object. This app therefore uses a safe visual-editing model:

- PDF pages are rendered with PDF.js.
- Detected text is selectable as replacement targets.
- Replacement text is drawn over the original location.
- Cover/Erase adds a white rectangle over unwanted content.
- New text and images can be placed on the page.
- The original PDF bytes stay local to the browser.

For certificates/forms where exact geometry matters, the next version can add draggable/resizable handles, exact page coordinates, font matching, background colour sampling, image deletion, and a locked master template.
