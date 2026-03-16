import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const sketchesDir = path.join(process.cwd(), "sketches");
const outDir = path.join(process.cwd(), "images");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const sketches = fs.readdirSync(sketchesDir).filter(f => f.endsWith(".excalidraw"));

const browser = await puppeteer.launch();
const page = await browser.newPage();

await page.setContent(`
  <html>
    <head>
      <script type="importmap">
        {"imports": {"react": "https://esm.sh/react@19.0.0", "react/jsx-runtime": "https://esm.sh/react@19.0.0/jsx-runtime", "react-dom": "https://esm.sh/react-dom@19.0.0"}}
      </script>
    </head>
    <body>
      <canvas id="out"></canvas>
      <script type="module">
        import * as ExcalidrawLib from "https://esm.sh/@excalidraw/excalidraw@0.18.0/dist/prod/index.js?external=react,react-dom";
        window.__excalidraw = ExcalidrawLib;
      </script>
    </body>
  </html>
`, { waitUntil: "networkidle0" });


for (const sketchName of sketches) {
  const fileContent = fs.readFileSync(path.join(sketchesDir, sketchName), "utf-8");
  const data = JSON.parse(fileContent);

  const pngBase64 = await page.evaluate(async (elements, appState, files) => {
    const { exportToBlob } = (window as any).__excalidraw;
    const blob = await exportToBlob({
      elements,
      appState: { ...appState, exportBackground: true },
      files: files ?? null,
      mimeType: "image/png",
    });
    return new Promise(resolve => {
      const reader: any = new FileReader();
      reader.onload = () => resolve(reader.result?.split(",")[1]);
      reader.readAsDataURL(blob);
    });
  }, data.elements, data.appState, data.files ?? null);

  const outName = sketchName.replace(".excalidraw", "") + ".png";
  fs.writeFileSync(path.join(outDir, outName), Buffer.from(pngBase64 as any, "base64"));
  console.log(`✓ ${outName}`);
}

await browser.close();