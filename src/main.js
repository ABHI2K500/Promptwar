import './style.css';
import * as THREE from 'three';

const $ = (s) => document.querySelector(s);
const themeToggle = $('#theme-toggle');
function setTheme(theme) {
  const light = theme === 'light';
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
  themeToggle.setAttribute('aria-pressed', String(light));
  themeToggle.querySelector('.theme-icon').textContent = light ? '☾' : '☼';
  themeToggle.querySelector('.theme-copy').textContent = light ? 'Dark' : 'Light';
  localStorage.setItem('veritas-theme', theme);
}
setTheme(localStorage.getItem('veritas-theme') || 'dark');
themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));
const stages = ['Inspecting media','Extracting visual signals','Analyzing temporal consistency','Inspecting audio characteristics','Checking metadata','Investigating provenance','Searching for source matches','Synthesizing evidence'];
const evidence = [
  ['HIGH','Temporal consistency','Facial geometry shifts across neighboring frames.','Simulated video detector','Compression and motion can affect this signal.'],
  ['MODERATE','Synthetic speech indicators','Audio patterns match characteristics sometimes associated with generated speech.','Simulated audio detector','A live audio provider was not run.'],
  ['LOW','Metadata unavailable','Embedded metadata could not be verified. This alone does not indicate manipulation.','Metadata inspection','Metadata is frequently removed during legitimate sharing.'],
  ['UNAVAILABLE','Source trace','No reliable earlier source has been identified in this demo environment.','Source provider','No live search provider is connected.']
];
let selected = null, demo = false, activeTab = 'file';

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('selected', x.dataset.tab === tab));
  ['file','url','demo'].forEach(x => $(`#${x}-panel`).classList.toggle('hidden', x !== tab));
}
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
$('#verify-cta').addEventListener('click', () => $('#verify').scrollIntoView({behavior:'smooth'}));
$('#demo-nav').addEventListener('click', () => { switchTab('demo'); $('#verify').scrollIntoView({behavior:'smooth'}); });

function error(text='') { $('#upload-error').textContent = text; $('#upload-error').classList.toggle('hidden', !text); }
function bytes(v) { return v < 1e6 ? `${(v/1e3).toFixed(0)} KB` : `${(v/1e6).toFixed(1)} MB`; }
function preview(name,type,size,url='', details={}) {
  selected = {name,type,size,url,...details}; error('');
  const media = type.startsWith('image/') && url ? `<img src="${url}" alt="Selected media preview" ${details.width ? `width="${details.width}" height="${details.height}"` : ''}>` : `<div class="preview-art ${type.split('/')[0]}"><span>${type.startsWith('video') ? '▶' : type.startsWith('audio') ? '⌁' : '◈'}</span></div>`;
  $('#media-preview').innerHTML = `${media}<div class="preview-info"><b>${name}</b><span>${type.split('/')[0].toUpperCase()} · ${bytes(size)}</span></div><button class="remove" aria-label="Remove selected media">×</button>`;
  $('#media-preview').classList.remove('hidden'); $('#analyze').disabled = false;
  $('.remove').addEventListener('click', clearSelection);
}
function clearSelection() { selected = null; demo = false; $('#media-preview').classList.add('hidden'); $('#analyze').disabled = true; }
function validateFile(file) {
  if (!file) return; if (!/^(image|video|audio)\//.test(file.type)) return error('This file type is not supported. Please choose an image, video, or audio file.');
  if (file.size > 100 * 1e6) return error('This file exceeds the 100 MB limit. Choose a smaller file.');
  demo = false;
  const url = URL.createObjectURL(file);
  if (!file.type.startsWith('image/')) return preview(file.name, file.type, file.size, url, {file});
  const image = new Image();
  image.onload = () => preview(file.name, file.type, file.size, url, {file, width:image.naturalWidth, height:image.naturalHeight});
  image.onerror = () => { URL.revokeObjectURL(url); error('This image could not be decoded. Please choose a valid image file.'); };
  image.src = url;
}
$('#file-input').addEventListener('change', e => validateFile(e.target.files[0]));
const drop = $('#dropzone'); drop.addEventListener('click', () => $('#file-input').click()); drop.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' ') $('#file-input').click(); });
['dragenter','dragover'].forEach(x=>drop.addEventListener(x,e=>{e.preventDefault();drop.classList.add('dragging')})); ['dragleave','drop'].forEach(x=>drop.addEventListener(x,e=>{e.preventDefault();drop.classList.remove('dragging')})); drop.addEventListener('drop', e=>validateFile(e.dataTransfer.files[0]));
$('#url-load').addEventListener('click', () => { const value=$('#media-url').value.trim(); try { const u=new URL(value); if(u.protocol!=='https:') throw 0; demo=false; preview(u.hostname + u.pathname.slice(-24), 'video/url', 0, ''); } catch { error('Enter a valid direct HTTPS media URL.'); } });
document.querySelectorAll('.demo-case').forEach(c=>c.addEventListener('click',()=>{ document.querySelectorAll('.demo-case').forEach(x=>x.classList.remove('selected-demo')); c.classList.add('selected-demo'); demo=true; preview(`${c.dataset.case}-case.mp4`, c.dataset.case==='voice'?'audio/demo':'video/demo', 7.8e6); }));

function evidenceCard([level,title,copy,source,limit], isDemo) { return `<article class="evidence-card glass"><div class="evidence-top"><span class="strength ${level.toLowerCase()}">${level}</span><button aria-label="Evidence limitations" title="${limit}">i</button></div><h4>${title}</h4><p>${copy}</p><footer><span>${source}</span><span>${isDemo ? 'Demo' : 'Local inspection'}</span></footer></article>`; }
async function runLiveAnalysis(file) {
  const started = await fetch('/api/analyze', { method:'POST', headers:{'content-type':file.type, 'x-veritas-filename':encodeURIComponent(file.name)}, body:file });
  const startedText = await started.text();
  const job = startedText ? JSON.parse(startedText) : {};
  if (!started.ok) throw new Error(job.error || 'The analysis service did not return a response. Restart the VERITAS server and try again.');
  if (!job.requestId) throw new Error('The analysis service returned no job ID. Restart the VERITAS server and try again.');
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const response = await fetch(`/api/analysis?requestId=${encodeURIComponent(job.requestId)}`);
    const reportText = await response.text();
    const report = reportText ? JSON.parse(reportText) : {};
    if (response.ok && report.resultsSummary && !['ANALYZING', 'QUEUED', 'PROCESSING'].includes(report.resultsSummary.status)) return report;
  }
  throw new Error('Analysis is still processing. Please try again in a moment.');
}
function populateReport(liveResult = null, liveError = '') {
  const usingDemo = demo;
  const usingLive = Boolean(liveResult?.resultsSummary);
  const liveStatus = liveResult?.resultsSummary?.status || '';
  const liveScore = liveResult?.resultsSummary?.metadata?.finalScore;
  const localEvidence = [
    ['OBSERVED','File inspection', `${selected.type || 'Unknown type'}${selected.width ? ` · ${selected.width} × ${selected.height} pixels` : ''} · ${bytes(selected.size)}.`, 'Browser file inspector', 'This is a file property, not an authenticity signal.'],
    ['UNKNOWN','AI-generation assessment unavailable', 'No live image-forensics provider is configured in this build, so VERITAS cannot assess whether this media is AI-generated.', 'Image detector', 'Connect a trusted detector provider before drawing a conclusion.'],
    ['UNKNOWN','Provenance unavailable', 'No live source-search or provenance provider is connected, so no source trail is inferred.', 'Source search', 'A missing source result is not evidence of manipulation.'],
    ['UNKNOWN','Metadata not inspected', 'This browser-only preview does not read embedded EXIF or container metadata.', 'Metadata analyzer', 'Metadata can be absent for ordinary reasons.']
  ];
  const liveEvidence = [['LIVE','Reality Defender ensemble', `Provider status: ${liveStatus || 'processing'}${Number.isFinite(liveScore) ? ` · ensemble score ${liveScore}%` : ''}.`, 'Reality Defender', 'A provider result is probabilistic and should be evaluated with other evidence.']];
  $('#evidence-grid').innerHTML = (usingDemo ? evidence : usingLive ? liveEvidence : localEvidence).map(x => evidenceCard(x, usingDemo)).join('');
  $('#evidence-heading').textContent = usingDemo ? 'Why we think this' : usingLive ? 'What the live detector observed' : 'What we observed locally';
  $('#report-badge').innerHTML = usingDemo ? '<i></i> DEMO ANALYSIS · SIMULATED PROVIDER OUTPUT' : usingLive ? '<i></i> LIVE ANALYSIS · REALITY DEFENDER' : '<i></i> LOCAL INSPECTION · LIVE DETECTOR ERROR';
  $('#report-verdict').innerHTML = usingDemo ? 'Likely <span>manipulated.</span>' : usingLive ? (liveStatus === 'FAKE' ? 'Likely <span>manipulated.</span>' : liveStatus === 'AUTHENTIC' ? 'No deepfake <span>detected.</span>' : `Result <span>${liveStatus.toLowerCase().replaceAll('_',' ')}.</span>`) : 'Result <span>inconclusive.</span>';
  $('#report-summary').textContent = usingDemo ? 'Multiple independent signals indicate that this video may have been altered. Review the evidence before relying on or sharing it.' : usingLive ? `Reality Defender returned ${liveStatus}. This is a provider signal, not absolute proof; review the available evidence and limitations before sharing.` : `Your file was inspected locally, but the live detector did not complete: ${liveError || 'Unknown error.'}`;
  $('#confidence-value').innerHTML = usingDemo ? '89<sup>%</sup>' : usingLive && Number.isFinite(liveScore) ? `${liveScore}<sup>%</sup>` : '—';
  $('#confidence-label').textContent = usingDemo || usingLive ? 'confidence' : 'unavailable';
  $('#report-gauge').classList.toggle('unavailable-gauge', !usingDemo && !usingLive);
  $('#media-authenticity').textContent = usingDemo ? 'LIKELY MANIPULATED' : usingLive ? liveStatus.replaceAll('_',' ') : 'INCONCLUSIVE';
  $('#media-authenticity').className = usingDemo || liveStatus === 'FAKE' || liveStatus === 'SUSPICIOUS' ? 'risk' : 'unknown';
  $('#media-authenticity-copy').textContent = usingDemo ? 'Based on simulated multi-signal analysis.' : usingLive ? 'Based on a live Reality Defender ensemble result.' : 'No live forensic result was returned.';
  $('#source-credibility').textContent = 'UNVERIFIED';
  $('#source-credibility-copy').textContent = usingDemo ? 'No live source provider connected.' : 'No source-search provider is connected.';
  $('#context-status').textContent = 'UNKNOWN';
  $('#context-status-copy').textContent = usingDemo ? 'Claim evidence was not supplied.' : 'No contextual claim was supplied.';
  $('#inspection-title').innerHTML = usingDemo ? 'Frame 147 <span class="mono">00:04.90</span>' : `Uploaded ${selected.type?.split('/')[0] || 'media'} <span class="mono">LOCAL PREVIEW</span>`;
  $('#inspection-copy').textContent = usingDemo ? 'Inspectable evidence is only shown where a detector provides it. This demonstration uses a simulated frame marker.' : 'This is your original local preview. No heatmap or altered region is drawn because a detector has not supplied one.';
  $('#inspection-media').innerHTML = selected.type?.startsWith('image/') && selected.url ? `<img class="inspection-image" src="${selected.url}" alt="Uploaded media: ${selected.name}">` : usingDemo ? '<div class="frame-noise"></div><div class="face-box"><span>FACE / MOUTH</span></div><div class="frame-timeline"><i></i><i class="hot"></i><i></i><i></i></div>' : `<div class="inspection-placeholder"><span>${selected.type?.startsWith('audio') ? '⌁' : '▶'}</span><b>${selected.name}</b><small>Preview available in your browser</small></div>`;
  $('#inspect').textContent = usingDemo ? 'View frame comparison →' : 'View original preview →';
  $('#modal-media').innerHTML = !usingDemo && selected.type?.startsWith('image/') && selected.url ? `<img class="inspection-image" src="${selected.url}" alt="Uploaded media: ${selected.name}">` : '<div class="face-box"><span>SIMULATED REGION</span></div>';
  $('#modal-title').textContent = usingDemo ? 'Frame comparison' : 'Original uploaded image';
  $('#modal-copy').textContent = usingDemo ? 'This visual marker is part of the selected demo case and is not a live detector heatmap.' : 'This is your original file preview. VERITAS has not added a heatmap because no live detector supplied one.';
}
function startAnalysis() { if(!selected) return; const liveRun = !demo && selected.file ? runLiveAnalysis(selected.file) : Promise.resolve(null); $('#analysis').classList.remove('hidden'); $('#report').classList.add('hidden'); $('#analysis').scrollIntoView({behavior:'smooth'}); $('#stages').innerHTML = stages.map((x,i)=>`<div class="stage" id="stage-${i}"><b>${String(i+1).padStart(2,'0')}</b><span>${x}</span><i></i></div>`).join(''); let i=0; startVerificationAnimation(); const advance=async()=>{ if(i) $(`#stage-${i-1}`).classList.remove('running'),$(`#stage-${i-1}`).classList.add('done'); if(i<stages.length){$(`#stage-${i}`).classList.add('running'); const p=Math.round((i+1)/stages.length*100);$('#percent').textContent=`${String(p).padStart(2,'0')}%`;$('#progress-bar').style.width=`${p}%`;i++;setTimeout(advance,430)}else{let liveResult=null,liveError='';try{liveResult=await liveRun}catch(error){liveError=error.message}populateReport(liveResult,liveError); stopVerificationAnimation(); setTimeout(()=>{$('#analysis').classList.add('hidden'); $('#report').classList.remove('hidden');$('#report').scrollIntoView({behavior:'smooth'});},250)}}; advance(); }
$('#analyze').addEventListener('click', startAnalysis);
$('#another').addEventListener('click',()=>$('#verify').scrollIntoView({behavior:'smooth'}));
document.querySelectorAll('[data-scroll]').forEach(b=>b.addEventListener('click',()=> $(`#${b.dataset.scroll}`).scrollIntoView({behavior:'smooth'})));
$('#inspect').addEventListener('click',()=>$('#modal').showModal()); $('.modal-close').addEventListener('click',()=>$('#modal').close());
$('#export').addEventListener('click',()=>{ const report = demo ? `VERITAS — Verification Report\n\nDEMO ANALYSIS · SIMULATED PROVIDER OUTPUT\nVerdict: Likely manipulated\nConfidence: 89%\n\nSummary: Multiple simulated signals indicate the video may have been altered.\n\nLimitations: This is a demo report. Detection is probabilistic and is not proof.` : `VERITAS — Verification Report\n\nLOCAL INSPECTION · LIVE DETECTORS UNAVAILABLE\nFile: ${selected?.name || 'Unknown'}\nVerdict: Inconclusive\nConfidence: Unavailable\n\nSummary: The file was inspected locally. No live forensic detector was configured, so VERITAS makes no authenticity claim.\n\nLimitations: AI detection is probabilistic; no detector, source-search, or metadata provider was run.`; const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([report],{type:'text/plain'}));a.download=demo?'veritas-demo-report.txt':'veritas-local-inspection.txt';a.click();URL.revokeObjectURL(a.href); });
document.querySelectorAll('.tilt').forEach(card=>{card.addEventListener('pointermove',e=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(1100px) rotateX(${-y*4}deg) rotateY(${x*5}deg) translateY(-3px)`});card.addEventListener('pointerleave',()=>card.style.transform='')});

// --- 3D Loader Animations ---
function initPageLoader() {
  const container = $('#initial-loader');
  if (!container) return;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.insertBefore(renderer.domElement, container.firstChild);

  const geometry = new THREE.IcosahedronGeometry(2.5, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xb9a7ff, wireframe: true, transparent: true, opacity: 0.3 });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  camera.position.z = 6;

  let animationId;
  const animate = () => {
    animationId = requestAnimationFrame(animate);
    mesh.rotation.x += 0.003;
    mesh.rotation.y += 0.005;
    renderer.render(scene, camera);
  };
  animate();

  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', handleResize);

  const finishLoading = () => {
    setTimeout(() => {
      container.classList.add('loaded');
      setTimeout(() => {
        cancelAnimationFrame(animationId);
        renderer.dispose();
        geometry.dispose();
        material.dispose();
        window.removeEventListener('resize', handleResize);
        container.remove();
      }, 800);
    }, 1500); 
  };
  
  if (document.readyState === 'complete') {
    finishLoading();
  } else {
    window.addEventListener('load', finishLoading);
  }
}
initPageLoader();

let verificationAnimationId = null;
let vRenderer = null, vScene = null, vCamera = null;
let handleVResize = null;

function startVerificationAnimation() {
  const container = $('#verification-3d-canvas');
  if (!container) return;
  container.innerHTML = ''; 

  vScene = new THREE.Scene();
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 300;
  vCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  vRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  vRenderer.setSize(width, height);
  vRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(vRenderer.domElement);

  const geometry = new THREE.BoxGeometry(2.5, 2.5, 2.5);
  const edges = new THREE.EdgesGeometry(geometry);
  const material = new THREE.LineBasicMaterial({ color: 0x76d49b, transparent: true, opacity: 0.7 });
  const cube = new THREE.LineSegments(edges, material);
  vScene.add(cube);
  
  const planeGeo = new THREE.PlaneGeometry(4, 4);
  const planeMat = new THREE.MeshBasicMaterial({ color: 0xb9a7ff, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
  const laser = new THREE.Mesh(planeGeo, planeMat);
  laser.rotation.x = Math.PI / 2;
  vScene.add(laser);

  vCamera.position.set(5, 4, 6);
  vCamera.lookAt(0, 0, 0);

  let time = 0;
  const animate = () => {
    verificationAnimationId = requestAnimationFrame(animate);
    cube.rotation.y += 0.01;
    cube.rotation.x += 0.005;
    
    time += 0.04;
    laser.position.y = Math.sin(time) * 1.8;
    
    vRenderer.render(vScene, vCamera);
  };
  animate();
  
  handleVResize = () => {
    if (!vCamera || !vRenderer || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w===0 || h===0) return;
    vCamera.aspect = w / h;
    vCamera.updateProjectionMatrix();
    vRenderer.setSize(w, h);
  };
  window.addEventListener('resize', handleVResize);
}

function stopVerificationAnimation() {
  if (verificationAnimationId) cancelAnimationFrame(verificationAnimationId);
  if (vRenderer) vRenderer.dispose();
  if (handleVResize) window.removeEventListener('resize', handleVResize);
  const container = $('#verification-3d-canvas');
  if (container) container.innerHTML = '';
}
