# Paperplane

Static PDF and image tools. No app server.

## Run locally

```sh
python -m http.server 8000
```

Open `http://localhost:8000`.

## GitHub Pages

Upload these files to the repository root, then enable Pages in Settings.

## Notes

Most PDF operations use pdf-lib and PDF.js from CDNs. Image archive downloads use JSZip. The first use of a tool needs an internet connection. Some listed tools are not implemented yet. OCR, Office conversion, encryption, redaction and repair are not included.

Files are processed in the browser. This project does not upload selected files to its own server.

Application code is MIT licensed. Third-party libraries retain their own licenses.
