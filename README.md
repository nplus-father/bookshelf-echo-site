# ai-radar-site

Static site (Astro) for the [ai-radar](https://github.com/nplus-father/ai-radar)
daily AI-and-technology digest. The pipeline's `publisher` writes the daily and
weekly markdown into `content/`; a git sidecar on the host commits & pushes it
here, and GitHub Actions builds this Astro site and deploys it to GitHub Pages.

```
content/daily/YYYY-MM-DD.md   <- one digest per day (written by the pipeline)
content/weekly/YYYY-Www.md    <- weekly rollup
content/data/metrics/         <- pipeline metrics snapshots (not rendered)
```

Nothing here is edited by hand — the content is machine-generated. Deploys on
every push to `main` via `nplus-father/workflows` reusable Astro workflow.
