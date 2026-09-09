# jules-playground

Sometimes (like right now) I’m phone only and I’d like my benevolent neighborhood agent to do some tasks for me.

## Playground Directory

This repository hosts interactive web applications and mobile Safari investigation utilities:

- **Root Directory (`/index.html`)**: Landing page linking to all available playground tools.
- **iPhone Save to Files vs Export Unmodified Originals (`/iPhone save to files vs export unmodified originals/index.html`)**: Interactive browser tool to upload and compare two photos exported from iOS (Save to Files vs Export Unmodified Originals) to analyze binary diffs, HEIF container boxes, EXIF metadata tags, and rendered pixel heatmaps.
- **Select 1000 Files on iPhone (`/Select 1000 files on iPhone without crashing Safari/Form.html`)**: Utility demonstrating batch file selection on mobile Safari.

---

## GitHub Pages Deployment & Allowlist Configuration

This repository uses a GitHub Actions workflow (`.github/workflows/deploy.yml`) to deploy selected static files to GitHub Pages.

### How to Modify the GitHub Pages Allowlist

To add or remove files deployed to GitHub Pages:

1. Open `.github/workflows/deploy.yml`.
2. Locate the `ALLOWLIST` bash array in the `Build site using Allowlist` step:

```bash
ALLOWLIST=(
  "index.html"
  "iPhone save to files vs export unmodified originals/index.html"
  "iPhone save to files vs export unmodified originals/save to files/IMG_8099.HEIC"
  "iPhone save to files vs export unmodified originals/export unmodified originals/IMG_8099.HEIC"
  "iPhone save to files vs export unmodified originals/IMG_3592.jpg"
  "iPhone save to files vs export unmodified originals/IMG_3592.JPG"
  "Select 1000 files on iPhone without crashing Safari/Form.html"
)
```

3. Add your new file or folder path to the `ALLOWLIST` array (e.g., `"my-new-tool/index.html"`).
4. If you added a new HTML page, also update the `PROJECTS` array in `index.html` so it appears on the main directory page.
5. Commit and push your changes to `main` or `master`. GitHub Actions will automatically stage and deploy only the allowlisted items to GitHub Pages.
