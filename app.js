(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const tools = [
    ["Merge PDF","Organize","merge"],["Split PDF","Organize","split"],["Remove pages","Organize","remove-pages"],
    ["Extract pages","Organize","extract-pages"],["Reorder pages","Organize","reorder"],["Rotate PDF","Organize","rotate"],
    ["Reverse pages","Organize","reverse"],["Insert PDF","Organize","insert-pages"],
    ["PDF to JPG","Convert","pdf-image-jpg"],["PDF to PNG","Convert","pdf-image-png"],["PDF to WebP","Convert","pdf-image-webp"],
    ["Images to PDF","Convert","image-pdf"],["Text to PDF","Convert","text-pdf"],["CSV to PDF","Convert","csv-pdf"],
    ["PDF to text","Convert","text"],["PDF to Markdown","Convert","markdown"],["PDF to HTML","Convert","pdf-html"],
    ["PDF to CSV","Convert","pdf-csv"],["PDF to Word (text)","Convert","pdf-docx"],["Blank PDF","Convert","blank-pdf"],
    ["Watermark","Edit","watermark"],["Page numbers","Edit","page-numbers"],["Add text","Edit","add-text"],
    ["Add image","Edit","add-image"],["Metadata","Edit","info"],["Grayscale","Edit","grayscale"],
    ["Black and white","Edit","threshold"],["Compress PDF (image)","Optimize","compress-raster"],
    ["Compare text","Utilities","compare"],["Export page images","Utilities","extract-images"],
    ["Resize image","Images","image-resize"],["Compress image","Images","image-compress"],
    ["Convert image","Images","image-convert"],["Crop image","Images","image-crop"],["Rotate image","Images","image-rotate"],
    ["Flip image","Images","image-flip"],["Clean image","Images","image-clean"],["OCR","OCR","ocr"],
    ["Protect PDF","Security","unsupported"],["Unlock PDF","Security","unsupported"],["Redact PDF","Security","unsupported"],
    ["Repair PDF","Utilities","unsupported"],["Office to PDF","Convert","unsupported"],["PDF to Office","Convert","unsupported"]
  ];
  const groups = ["All", ...new Set(tools.map(t => t[1]))];
  let activeCategory = "All", selectedTool = null, selectedFiles = [], toastTimer;
  const icons = {
    Organize:'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 4v4M16 10v4M11 16v4"/></svg>',
    Convert:'<svg viewBox="0 0 24 24"><path d="M4 7h12M13 4l3 3-3 3M20 17H8M11 14l-3 3 3 3"/></svg>',
    Edit:'<svg viewBox="0 0 24 24"><path d="m4 16-.8 4.8L8 20l11-11-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/></svg>',
    Optimize:'<svg viewBox="0 0 24 24"><path d="M4 20V4h16v16Z"/><path d="M8 16l3-4 2 2 3-5"/></svg>',
    Images:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-5 3 3 3-4 5 6"/></svg>',
    OCR:'<svg viewBox="0 0 24 24"><path d="M5 4H3v5M19 4h2v5M5 20H3v-5M19 20h2v-5M7 9h10M7 12h10M7 15h7"/></svg>',
    Security:'<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="1"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    Utilities:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>'
  };
  function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function renderTabs() {
    $("categoryTabs").innerHTML = groups.map(g => `<button type="button" class="category-tab ${g===activeCategory?"active":""}" data-category="${escapeHTML(g)}">${escapeHTML(g)}</button>`).join("");
  }
  function renderTools() {
    const q = $("toolSearch").value.trim().toLowerCase();
    const filtered = tools.filter(t => (activeCategory==="All" || t[1]===activeCategory) && (!q || t[0].toLowerCase().includes(q) || t[1].toLowerCase().includes(q)));
    $("toolGrid").innerHTML = filtered.map(t => `<button type="button" class="tool-card" data-mode="${t[2]}" data-title="${escapeHTML(t[0])}" data-category="${escapeHTML(t[1])}"><span class="tool-icon">${icons[t[1]]||icons.Utilities}</span><h3>${escapeHTML(t[0])}</h3>${t[2]==="unsupported"?'<span class="tool-state">N/A</span>':""}</button>`).join("");
    $("emptyState").hidden = filtered.length > 0;
  }
  function toast(msg) {
    const el=$("toast"); el.textContent=msg; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2500);
  }
  function prettySize(n) { return n < 1024*1024 ? `${Math.max(1,Math.round(n/1024))} KB` : `${(n/1048576).toFixed(1)} MB`; }
  function accepts(mode) {
    if (mode.startsWith("image-") || mode==="image-pdf" || mode==="add-image") return mode==="add-image" ? ".pdf,application/pdf,image/*" : "image/*";
    if (["text-pdf","csv-pdf"].includes(mode)) return mode==="csv-pdf"?".csv,text/csv":".txt,.md,text/plain";
    if (mode==="compare") return ".pdf,application/pdf";
    return ".pdf,application/pdf";
  }
  function multiple(mode) { return ["merge","image-pdf","compare","extract-images"].includes(mode) || mode.startsWith("image-"); }
  function fields(mode) {
    const field=(label,id,placeholder,value="",hint="")=>`<div class="field"><label for="${id}">${label}</label><input id="${id}" placeholder="${placeholder}" value="${value}">${hint?`<span class="field-hint">${hint}</span>`:""}</div>`;
    if (["split","remove-pages","extract-pages","rotate"].includes(mode)) return field(mode==="rotate"?"Degrees":"Page ranges","pageRanges",mode==="rotate"?"90, 180 or 270":"e.g. 1-3, 5, 8-10",mode==="remove-pages"?"":mode==="rotate"?"90":"1","Page numbers start at 1.");
    if (mode==="reorder") return field("Page order","pageRanges","e.g. 3, 1, 2, 4","1, 2, 3","List every page. Repeated numbers duplicate pages.");
    if (["watermark","add-text"].includes(mode)) return field("Text","overlayText","Text to add","DRAFT");
    if (mode==="page-numbers") return field("Format","overlayText","e.g. Page {n}","{n}");
    if (["image-resize"].includes(mode)) return `<div class="field"><label for="imgWidth">Width (px)</label><input id="imgWidth" type="number" min="1" value="1200"></div><div class="field"><label for="imgHeight">Height (px)</label><input id="imgHeight" type="number" min="1" value="800"></div>`;
    if (mode==="image-convert") return `<div class="field"><label for="imageFormat">Format</label><select id="imageFormat"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></div>`;
    if (mode==="image-crop") return `<div class="field"><label for="cropX">Left (px)</label><input id="cropX" type="number" min="0" value="0"></div><div class="field"><label for="cropY">Top (px)</label><input id="cropY" type="number" min="0" value="0"></div><div class="field"><label for="cropW">Width (px)</label><input id="cropW" type="number" min="1" value="500"></div><div class="field"><label for="cropH">Height (px)</label><input id="cropH" type="number" min="1" value="500"></div>`;
    if (mode==="image-rotate") return `<div class="field"><label for="degrees">Degrees</label><select id="degrees"><option>90</option><option>180</option><option>270</option></select></div>`;
    if (mode==="blank-pdf") return `<div class="field"><label for="blankPages">Pages</label><input id="blankPages" type="number" min="1" max="100" value="1"></div>`;
    if (mode==="info") return `<div class="engine-note">Metadata editing is not included in this build.</div>`;
    if (mode==="unsupported") return `<div class="engine-note">Not implemented yet.</div>`;
    if (["grayscale","threshold","compress-raster"].includes(mode)) return `<div class="field"><label for="renderScale">Render scale</label><select id="renderScale"><option value="1">Standard</option><option value="1.5" selected>High</option></select></div>`;
    if (mode==="ocr") return `<div class="engine-note">OCR needs the Tesseract library and language data on first use.</div>`;
    return "";
  }
  function openTool(btn) {
    selectedTool={title:btn.dataset.title,category:btn.dataset.category,mode:btn.dataset.mode};
    selectedFiles=[];
    $("dialogTitle").textContent=selectedTool.title;
    $("dialogCategory").textContent=selectedTool.category;
    const needsFiles=!["blank-pdf","unsupported"].includes(selectedTool.mode);
    $("toolPanel").innerHTML=`${needsFiles?`<label class="dropzone" id="dropzone" for="filePicker"><svg viewBox="0 0 24 24"><path d="M12 16V4m-4 4 4-4 4 4"/><path d="M4 14v5h16v-5"/></svg><strong>Choose file${multiple(selectedTool.mode)?"s":""}</strong><span>or drop here</span></label><input class="file-input" id="filePicker" type="file" accept="${accepts(selectedTool.mode)}" ${multiple(selectedTool.mode)?"multiple":""}><div class="file-list" id="fileList"></div>`:""}${fields(selectedTool.mode)}<span id="selectedCount"></span><div class="dialog-actions"><button class="button button-green" id="runTool" type="button">${selectedTool.mode==="unsupported"?"Close":"Run"}</button><button class="button" id="clearFiles" type="button">Clear</button></div><div class="progress-wrap" hidden id="progressWrap"><div class="progress-bar" id="progressBar"></div></div><p id="resultMessage" class="result-message" aria-live="polite"></p>`;
    $("toolDialog").showModal();
    if (needsFiles) {
      $("filePicker").addEventListener("change",e=>addFiles([...e.target.files]));
      const dz=$("dropzone");
      dz.addEventListener("dragover",e=>{e.preventDefault();dz.classList.add("dragover")});
      dz.addEventListener("dragleave",()=>dz.classList.remove("dragover"));
      dz.addEventListener("drop",e=>{e.preventDefault();dz.classList.remove("dragover");addFiles([...e.dataTransfer.files])});
    }
    $("runTool").onclick=runSelected;
    $("clearFiles").onclick=()=>{selectedFiles=[];renderFiles();};
  }
  function addFiles(files) {
    if (!multiple(selectedTool.mode)) selectedFiles=[];
    selectedFiles.push(...files);
    renderFiles();
  }
  function renderFiles() {
    const list=$("fileList"); if(!list) return;
    list.innerHTML=selectedFiles.map((f,i)=>`<div class="file-row"><span class="file-mini">${escapeHTML((f.name.split(".").pop()||"FILE").slice(0,4).toUpperCase())}</span><span class="file-name" title="${escapeHTML(f.name)}">${escapeHTML(f.name)}</span><span class="file-size">${prettySize(f.size)}</span><button type="button" class="remove-file" data-remove="${i}" aria-label="Remove ${escapeHTML(f.name)}">×</button></div>`).join("");
    list.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{selectedFiles.splice(Number(b.dataset.remove),1);renderFiles();});
    const count=$("selectedCount"); if(count)count.textContent=selectedFiles.length?`${selectedFiles.length} file${selectedFiles.length===1?"":"s"} selected`:"";
  }
  async function libPdfLib() {
    if (window.PDFLib) return window.PDFLib;
    await loadScript("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js");
    return window.PDFLib;
  }
  async function loadScript(src) {
    await new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error("Could not load processing library. Check your connection."));document.head.appendChild(s);});
  }
  async function libPdfJs() {
    if (window.pdfjsLib) return window.pdfjsLib;
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    return window.pdfjsLib;
  }
  function setProgress(v) { const w=$("progressWrap"),b=$("progressBar"); if(w&&b){w.hidden=false;b.style.width=`${v}%`;} }
  function message(msg,type="") { const el=$("resultMessage");el.className=`result-message ${type}`;el.textContent=msg; }
  function safeName(n) { return n.replace(/\.[^.]+$/,"").replace(/[^\w.-]+/g,"_").slice(0,80)||"file"; }
  function download(data,name,type) {
    const blob=data instanceof Blob?data:new Blob([data],{type});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function parseRanges(raw,count) {
    const out=[];
    for(const p0 of raw.split(",")){const p=p0.trim();if(!p)continue;const m=p.match(/^(\d+)\s*(?:-\s*(\d+))?$/);if(!m)throw Error(`Invalid range: ${p}`);const a=+m[1],b=+(m[2]||m[1]);if(a<1||b<a||b>count)throw Error(`Range ${p} is outside this ${count}-page PDF.`);for(let n=a;n<=b;n++)if(!out.includes(n))out.push(n);}
    return out;
  }
  async function runSelected() {
    const mode=selectedTool.mode;
    if(mode==="unsupported"){ $("toolDialog").close();return; }
    if(mode==="info"){message("Metadata editing is not included.");return;}
    try {
      $("runTool").disabled=true; message("Working…");setProgress(5);
      if(mode.startsWith("image-")) return await runImage(mode);
      if(mode==="text-pdf"||mode==="csv-pdf") return await textToPdf(mode);
      if(mode==="blank-pdf") { const {PDFDocument}=await libPdfLib(),pdf=await PDFDocument.create(),n=Math.max(1,Math.min(100,+$("blankPages").value||1));for(let i=0;i<n;i++)pdf.addPage();download(await pdf.save(),"blank.pdf","application/pdf");message("Saved.","success");return; }
      if(mode==="image-pdf") return await imagesToPdf();
      if(mode==="text"||mode==="markdown"||mode==="pdf-html"||mode==="pdf-csv"||mode==="pdf-docx") return await exportText(mode);
      if(mode==="compare") return await comparePdfs();
      if(mode==="ocr") {message("OCR is not included in this build.");return;}
      if(mode==="extract-images") return await renderImages();
      return await runPdf(mode);
    } catch(e) { message(e?.message||"Could not process file.","error"); }
    finally { const b=$("runTool");if(b)b.disabled=false; }
  }
  async function runPdf(mode) {
    if(!selectedFiles.length)throw Error("Choose a PDF first.");
    const {PDFDocument,degrees,rgb,StandardFonts}=await libPdfLib();
    const file=selectedFiles[0],src=await PDFDocument.load(await file.arrayBuffer()),count=src.getPageCount();
    if(mode==="merge") {
      if(selectedFiles.length<2)throw Error("Choose at least two PDFs.");
      const out=await PDFDocument.create();
      for(const f of selectedFiles){const d=await PDFDocument.load(await f.arrayBuffer());for(const p of await out.copyPages(d,d.getPageIndices()))out.addPage(p);}
      download(await out.save(),"merged.pdf","application/pdf");message("Saved.","success");return;
    }
    if(mode==="split") {
      const groups=$("pageRanges").value.split(",").map(x=>x.trim()).filter(Boolean),outputs=[];
      for(let i=0;i<groups.length;i++){const indices=parseRanges(groups[i],count).map(n=>n-1);if(!indices.length)continue;const out=await PDFDocument.create();for(const p of await out.copyPages(src,indices))out.addPage(p);outputs.push({name:`split-${i+1}.pdf`,data:await out.save()});}
      if(!outputs.length)throw Error("Enter page ranges.");
      if(outputs.length===1)download(outputs[0].data,outputs[0].name,"application/pdf");
      else {const JSZip=await loadZip();const zip=new JSZip();outputs.forEach(o=>zip.file(o.name,o.data));download(await zip.generateAsync({type:"blob"}),"split-pdfs.zip","application/zip");}
      message("Saved.","success");return;
    }
    if(mode==="remove-pages"||mode==="extract-pages"||mode==="reorder"||mode==="reverse") {
      let ids;
      if(mode==="reverse")ids=Array.from({length:count},(_,i)=>count-i);
      else if(mode==="remove-pages"){const remove=parseRanges($("pageRanges").value,count);ids=Array.from({length:count},(_,i)=>i+1).filter(n=>!remove.includes(n));}
      else if(mode==="extract-pages")ids=parseRanges($("pageRanges").value,count);
      else ids=$("pageRanges").value.split(",").map(x=>Number(x.trim()));
      if(!ids.length||ids.some(n=>!Number.isInteger(n)||n<1||n>count))throw Error("Check the page numbers.");
      const out=await PDFDocument.create();for(const p of await out.copyPages(src,ids.map(n=>n-1)))out.addPage(p);download(await out.save(),`${safeName(file.name)}-${mode}.pdf`,"application/pdf");message("Saved.","success");return;
    }
    if(mode==="rotate") {
      const deg=Number($("pageRanges").value);if(![90,180,270,-90,-180,-270].includes(deg))throw Error("Use 90, 180 or 270 degrees.");
      src.getPages().forEach(p=>p.setRotation(degrees((p.getRotation().angle+deg)%360)));download(await src.save(),`${safeName(file.name)}-rotated.pdf`,"application/pdf");message("Saved.","success");return;
    }
    if(mode==="watermark"||mode==="add-text"||mode==="page-numbers") {
      const font=await src.embedFont(StandardFonts.Helvetica),txt=$("overlayText").value||"";
      src.getPages().forEach((p,i)=>{const {width}=p.getSize(),text=mode==="page-numbers"?txt.replaceAll("{n}",String(i+1)):txt;p.drawText(text,{x:40,y:mode==="watermark"?p.getSize().height/2:25,size:mode==="watermark"?34:12,font,color:rgb(.45,.45,.45),opacity:mode==="watermark"?.35:1,rotate:mode==="watermark"?degrees(-35):degrees(0),maxWidth:width-80});});
      download(await src.save(),`${safeName(file.name)}-${mode}.pdf`,"application/pdf");message("Saved.","success");return;
    }
    if(mode==="insert-pages") {
      if(selectedFiles.length<2)throw Error("Choose the source PDF as a second file.");
      const other=await PDFDocument.load(await selectedFiles[1].arrayBuffer()),copy=await src.copyPages(other,other.getPageIndices());copy.forEach(p=>src.addPage(p));download(await src.save(),`${safeName(file.name)}-inserted.pdf`,"application/pdf");message("Saved.","success");return;
    }
    if(["grayscale","threshold","compress-raster","pdf-image-jpg","pdf-image-png","pdf-image-webp"].includes(mode)) return rasterPdf(file,mode);
    throw Error("This tool is not implemented yet.");
  }
  async function loadZip() { if(window.JSZip)return window.JSZip;await loadScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js");return window.JSZip; }
  async function imagesToPdf() {
    const {PDFDocument}=await libPdfLib(),pdf=await PDFDocument.create();
    for(const f of selectedFiles){let bytes=new Uint8Array(await f.arrayBuffer()),img;
      if(f.type==="image/png")img=await pdf.embedPng(bytes);
      else if(f.type==="image/jpeg"||/\.jpe?g$/i.test(f.name))img=await pdf.embedJpg(bytes);
      else {const bmp=await imageBitmap(f),c=document.createElement("canvas");c.width=bmp.width;c.height=bmp.height;c.getContext("2d").drawImage(bmp,0,0);img=await pdf.embedPng(await canvasBytes(c,"image/png"));}
      const p=pdf.addPage([img.width,img.height]);p.drawImage(img,{x:0,y:0,width:img.width,height:img.height});
    }
    download(await pdf.save(),"images.pdf","application/pdf");message("Saved.","success");
  }
  async function textToPdf(mode) {
    const f=selectedFiles[0];if(!f)throw Error("Choose a file.");
    const {PDFDocument,StandardFonts,rgb}=await libPdfLib(),pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Courier);
    const lines=(await f.text()).replace(/\r/g,"").split("\n");let page=pdf.addPage(),y=page.getHeight()-40;
    for(const line of lines){if(y<40){page=pdf.addPage();y=page.getHeight()-40;}page.drawText(line.slice(0,110),{x:35,y,size:9,font,color:rgb(0,0,0)});y-=12;}
    download(await pdf.save(),`${safeName(f.name)}.pdf`,"application/pdf");message("Saved.","success");
  }
  async function exportText(mode) {
    const f=selectedFiles[0];if(!f)throw Error("Choose a PDF.");
    const pdfjs=await libPdfJs(),pdf=await pdfjs.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise,parts=[];
    for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i),c=await p.getTextContent();parts.push(c.items.map(x=>x.str).join(" "));setProgress(10+80*i/pdf.numPages);}
    if(mode==="text"||mode==="markdown"){const out=parts.map((p,i)=>mode==="markdown"?`## Page ${i+1}\n\n${p}`:p).join("\n\n");download(out,`${safeName(f.name)}.${mode==="text"?"txt":"md"}`,"text/plain");}
    else if(mode==="pdf-html"){download(`<!doctype html><meta charset="utf-8"><title>${escapeHTML(f.name)}</title>${parts.map((p,i)=>`<h2>Page ${i+1}</h2><p>${escapeHTML(p)}</p>`).join("")}`,`${safeName(f.name)}.html`,"text/html");}
    else if(mode==="pdf-csv"){download("page,text\r\n"+parts.map((p,i)=>`${i+1},"${p.replaceAll('"','""')}"`).join("\r\n"),`${safeName(f.name)}.csv`,"text/csv");}
    else if(mode==="pdf-docx") throw Error("Text-only DOCX export is not included in this build.");
    message("Saved.","success");
  }
  async function comparePdfs() {
    if(selectedFiles.length<2)throw Error("Choose two PDFs.");
    const pdfjs=await libPdfJs(),extract=async f=>{const p=await pdfjs.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;let a=[];for(let i=1;i<=p.numPages;i++){const c=await (await p.getPage(i)).getTextContent();a.push(c.items.map(x=>x.str).join(" "));}return a.join("\n");};
    const a=await extract(selectedFiles[0]),b=await extract(selectedFiles[1]);download(`FILE 1\n${selectedFiles[0].name}\n\n${a}\n\nFILE 2\n${selectedFiles[1].name}\n\n${b}`, "comparison.txt","text/plain");message("Saved extracted text for comparison.","success");
  }
  async function rasterPdf(file,mode) {
    const pdfjs=await libPdfJs(),pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise,outputs=[];
    const scale=Number($("renderScale")?.value||1.5),fmt=mode==="pdf-image-png"?"image/png":mode==="pdf-image-webp"?"image/webp":"image/jpeg";
    const {PDFDocument}=await libPdfLib(),out=["grayscale","threshold","compress-raster"].includes(mode)?await PDFDocument.create():null;
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i),vp=page.getViewport({scale}),c=document.createElement("canvas");c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);
      await page.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;
      if(mode==="grayscale"||mode==="threshold"){const ctx=c.getContext("2d"),d=ctx.getImageData(0,0,c.width,c.height);for(let j=0;j<d.data.length;j+=4){const g=.299*d.data[j]+.587*d.data[j+1]+.114*d.data[j+2],v=mode==="threshold"?(g>160?255:0):g;d.data[j]=d.data[j+1]=d.data[j+2]=v;}ctx.putImageData(d,0,0);}
      if(out){const blob=await canvasBlob(c,"image/jpeg",mode==="compress-raster"?.65:.88),img=await out.embedJpg(await blob.arrayBuffer()),p=out.addPage([img.width/scale,img.height/scale]);p.drawImage(img,{x:0,y:0,width:img.width/scale,height:img.height/scale});}
      else outputs.push({name:`${safeName(file.name)}-${i}.${fmt==="image/png"?"png":fmt==="image/webp"?"webp":"jpg"}`,blob:await canvasBlob(c,fmt,.9)});
      setProgress(10+80*i/pdf.numPages);
    }
    if(out)download(await out.save(),`${safeName(file.name)}-${mode}.pdf`,"application/pdf");
    else if(outputs.length===1)download(outputs[0].blob,outputs[0].name,outputs[0].blob.type);
    else {const JSZip=await loadZip(),zip=new JSZip();for(const o of outputs)zip.file(o.name,o.blob);download(await zip.generateAsync({type:"blob"}),"pages.zip","application/zip");}
    message("Saved.","success");
  }
  async function renderImages() { await rasterPdf(selectedFiles[0],"pdf-image-png"); }
  async function imageBitmap(file) { return await createImageBitmap(file); }
  async function canvasBytes(canvas,type) { return new Uint8Array(await (await canvasBlob(canvas,type,.9)).arrayBuffer()); }
  function canvasBlob(canvas,type,q) { return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error("Image conversion failed.")),type,q)); }
  async function runImage(mode) {
    const {PDFDocument}=await libPdfLib(); const outputs=[];
    for(let i=0;i<selectedFiles.length;i++){
      const f=selectedFiles[i],bmp=await imageBitmap(f),c=document.createElement("canvas"),ctx=c.getContext("2d");
      let w=bmp.width,h=bmp.height;
      if(mode==="image-resize"){w=Math.max(1,+$("imgWidth").value||w);h=Math.max(1,+$("imgHeight").value||h);}
      if(mode==="image-crop"){const x=Math.max(0,+$("cropX").value||0),y=Math.max(0,+$("cropY").value||0);w=Math.min(+$("cropW").value||500,bmp.width-x);h=Math.min(+$("cropH").value||500,bmp.height-y);if(w<1||h<1)throw Error("Crop is outside the image.");c.width=w;c.height=h;ctx.drawImage(bmp,x,y,w,h,0,0,w,h);}
      else {c.width=w;c.height=h;if(mode==="image-rotate"){const d=+$("degrees").value;if(d===90||d===270){c.width=h;c.height=w;}ctx.translate(c.width/2,c.height/2);ctx.rotate(d*Math.PI/180);ctx.drawImage(bmp,-w/2,-h/2,w,h);}else if(mode==="image-flip"){ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(bmp,0,0,w,h);}else ctx.drawImage(bmp,0,0,w,h);}
      const fmt=mode==="image-convert"?$("imageFormat").value:"image/jpeg",blob=await canvasBlob(c,fmt,.85),ext=fmt==="image/png"?"png":fmt==="image/webp"?"webp":"jpg";
      outputs.push({name:`${safeName(f.name)}.${ext}`,blob});
    }
    if(outputs.length===1)download(outputs[0].blob,outputs[0].name,outputs[0].blob.type);
    else {const JSZip=await loadZip(),zip=new JSZip();outputs.forEach(o=>zip.file(o.name,o.blob));download(await zip.generateAsync({type:"blob"}),"images.zip","application/zip");}
    message("Saved.","success");
  }
  $("categoryTabs").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(!b)return;activeCategory=b.dataset.category;renderTabs();renderTools();});
  $("toolGrid").addEventListener("click",e=>{const b=e.target.closest(".tool-card");if(b)openTool(b);});
  $("toolSearch").addEventListener("input",renderTools);
  $("closeDialog").addEventListener("click",()=>$("toolDialog").close());
  $("toolDialog").addEventListener("click",e=>{if(e.target===$("toolDialog"))$("toolDialog").close();});
  $("themeToggle").addEventListener("click",()=>{const dark=document.documentElement.dataset.theme!=="dark";document.documentElement.dataset.theme=dark?"dark":"light";document.documentElement.style.colorScheme=dark?"dark":"light";});
  renderTabs();renderTools();
  if("serviceWorker" in navigator && location.protocol!=="file:") window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
})();