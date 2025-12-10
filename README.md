# Leo Sakharoff — Portfolio

Minimal portfolio website with programmer aesthetic. Monospace typography, clean HTML/CSS, no frameworks.

## Structure

```
portfolio-simple/
├── index.html              # Home page with project list
├── css/
│   └── style.css          # All styles
├── js/
│   └── lightbox.js        # Gallery lightbox functionality
├── projects/              # Individual project pages
│   ├── sound-of-chess.html
│   ├── spring-radio.html
│   ├── semantic-portal.html
│   ├── vertigo-installations.html
│   └── no-latency.html
└── images/                # Project images (add your own)
```

## Adding Images

Replace placeholder images in the `/images` folder with your actual project images:

- `sound-of-chess-hero.jpg` (and -1.jpg, -2.jpg, etc.)
- `spring-radio-hero.jpg` (and gallery images)
- `semantic-portal-hero.jpg` (and gallery images)
- `vertigo-hero.jpg` (and gallery images)
- `no-latency-hero.jpg` (and gallery images)

## Adding Videos

To embed YouTube/Vimeo videos, uncomment the video embed section in any project page and replace `VIDEO_ID`:

```html
<div class="video-embed">
    <iframe src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allowfullscreen></iframe>
</div>
```

For self-hosted videos, use HTML5 video:

```html
<div class="project-hero">
    <video src="../images/your-video.mp4" controls autoplay muted loop></video>
</div>
```

## Adding New Projects

1. Copy any project page as a template
2. Update the content (title, description, images)
3. Add a new entry to `index.html` in the projects section
4. Update the project number

## Local Development

Simply open `index.html` in a browser, or use a local server:

```bash
python3 -m http.server 8000
# Visit http://localhost:8000
```

## Deployment

### Vercel
```bash
vercel
```

### Netlify
Drag and drop the entire folder to Netlify, or:
```bash
netlify deploy --prod
```

## Features

- Lightbox for image galleries (click any gallery image)
- Keyboard navigation (←/→ arrows, ESC to close)
- Fully responsive
- Minimal dependencies (plain HTML/CSS/JS)
- Fast and lightweight

## Customization

All styles are in `css/style.css`. Key variables:

```css
:root {
    --bg: #fafafa;
    --text: #000;
    --gray: #666;
    --light-gray: #ddd;
}
```

Change the monospace font by updating the `font-family` in `body`.
