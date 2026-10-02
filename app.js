let pdfjsLib=null;
let pdfBytes=null, sourcePdf=null, pages=[], activePage=0, objects=[], selected=null, tool='select';
const $=id=>document.getElementById(id);
const status=m=>{$('status').textContent=m};
function waitForPDFJS(){return new Promise(resolve=>{if(window.__PDFJS__)return resolve(window.__PDFJS__);window.addEventListener('pdfjs-ready',()=>resolve(window.__PDFJS__),{once:true})})}
function setTool(t){tool=t;document.querySelectorAll('.tool[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));status({select:'Click existing PDF text or an added object.',text:'Click on the page to place new text.',cover:'Click on the page to place a white cover.',delete:'Click an object to delete it.'}[t]);}
function clearSelection(){selected=null;$('props').hidden=true;$('propsEmpty').hidden=false;document.querySelectorAll('.obj.selected').forEach(x=>x.classList.remove('selected'))}
function selectObject(o){selected=o;$('propsEmpty').hidden=true;$('props').hidden=false;$('propText').value=o.text||'';$('propSize').value=o.size||16;$('propOpacity').value=o.opacity??1;$('propFont').value=o.font||'Helvetica';$('propColor').value=o.color||'#111111';$('propX').value=Math.round(o.x);$('propY').value=Math.round(o.y);$('propW').value=Math.round(o.w||100);$('propH').value=Math.round(o.h||30);renderCurrent();}
function makeId(){return 'o_'+Date.now()+'_'+Math.random().toString(36).slice(2)}
async function loadPDF(){
  try{
    pdfjsLib=await waitForPDFJS();
    sourcePdf=await pdfjsLib.getDocument({data:pdfBytes}).promise;
    pages=[];objects=[];clearSelection();$('pages').innerHTML='';$('emptyState').style.display='none';
    for(let i=1;i<=sourcePdf.numPages;i++){const p=await sourcePdf.getPage(i);pages.push(p);const th=document.createElement('div');th.className='thumb';th.dataset.page=i-1;const c=document.createElement('canvas');const vp=p.getViewport({scale:.18});c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;th.append(c);const s=document.createElement('span');s.textContent='Page '+i;th.append(s);th.onclick=()=>showPage(i-1);$('pages').append(th)}
    $('exportBtn').disabled=false;await showPage(0);status(`${sourcePdf.numPages} page(s) loaded. Click visible text to edit.`)
  }catch(err){console.error(err);status('PDF could not be opened: '+(err.message||err));alert('PDF could not be opened. Please try another PDF or check your internet connection for the PDF engine.')}
}
async function showPage(i){activePage=i;document.querySelectorAll('.thumb').forEach(x=>x.classList.toggle('active',+x.dataset.page===i));const p=pages[i];const vp=p.getViewport({scale:1.5});const shell=document.createElement('div');shell.className='page-shell';shell.style.width=vp.width+'px';shell.style.height=vp.height+'px';const c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);shell.append(c);const ov=document.createElement('div');ov.className='overlay';shell.append(ov);$('canvasWrap').innerHTML='';$('canvasWrap').append(shell);await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;await buildTextHits(p,vp,i);renderObjects(i,ov);}
async function buildTextHits(p,vp,pageIndex){
  objects=objects.filter(o=>!(o.kind==='source'&&o.page===pageIndex));
  const tc=await p.getTextContent();
  for(const item of tc.items){if(!item.str||!item.str.trim())continue;const tx=pdfjsLib.Util.transform(vp.transform,item.transform);const size=Math.max(6,Math.hypot(tx[0],tx[1]));const x=tx[4],y=tx[5]-size*1.05,w=Math.max(4,item.width*1.5),h=Math.max(size*1.25,12);objects.push({id:makeId(),kind:'source',page:pageIndex,text:item.str,x,y,w,h,size,font:'Helvetica',original:true});}
}
function renderCurrent(){const shell=$('.page-shell');if(!shell)return;const ov=shell.querySelector('.overlay');renderObjects(activePage,ov)}
function renderObjects(pageIndex,ov){ov.innerHTML='';
  for(const o of objects.filter(x=>x.page===pageIndex&&x.kind==='source')){const el=document.createElement('div');el.className='source-hit';el.style.cssText=`left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px`;el.title='Edit: '+o.text;el.onclick=e=>{e.stopPropagation();startReplacement(o)};ov.append(el)}
  for(const o of objects.filter(x=>x.page===pageIndex&&x.kind!=='source')){const el=document.createElement(o.kind==='image'?'img':'div');el.className='obj '+(o.kind==='image'?'image-obj':o.kind==='cover'?'cover':'text')+(selected===o?' selected':'');el.dataset.id=o.id;el.style.left=o.x+'px';el.style.top=o.y+'px';el.style.width=o.w+'px';el.style.height=o.h+'px';el.style.opacity=o.opacity??1;
    if(o.kind==='image'){el.src=o.src}else if(o.kind==='cover'){el.title='Cover / erase area'}else{el.textContent=o.text;el.style.fontSize=o.size+'px';el.style.fontFamily=o.font;el.style.color=o.color;el.style.lineHeight='1.1'}
    el.addEventListener('pointerdown',e=>startDrag(e,o,el));el.addEventListener('click',e=>{e.stopPropagation();if(tool==='delete'){deleteObject(o);return}selectObject(o)});ov.append(el);
  }
}
function startReplacement(source){setTool('select');const existing=objects.find(o=>o.kind==='text'&&o.replaceSource===source.id);if(existing){selectObject(existing);return}const o={id:makeId(),kind:'text',page:activePage,text:source.text,x:source.x,y:source.y,w:Math.max(source.w,60),h:Math.max(source.h,24),size:source.size,font:'Helvetica',color:'#111111',opacity:1,replaceSource:source.id};objects.push(o);selectObject(o);status('Replacement text placed over the original. Edit it in Properties.');}
function startDrag(e,o,el){if(e.button!==0)return;e.preventDefault();selectObject(o);const shell=$('.page-shell');const r=shell.getBoundingClientRect();const sx=e.clientX-r.left,sy=e.clientY-r.top,ox=o.x,oy=o.y;el.setPointerCapture?.(e.pointerId);const move=ev=>{o.x=Math.max(0,ox+(ev.clientX-r.left-sx));o.y=Math.max(0,oy+(ev.clientY-r.top-sy));el.style.left=o.x+'px';el.style.top=o.y+'px';$('propX').value=Math.round(o.x);$('propY').value=Math.round(o.y)};const up=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up)};el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);}
function deleteObject(o){objects=objects.filter(x=>x!==o);if(selected===o)clearSelection();renderCurrent();status('Object deleted from the editing layer.');}
function addTextAt(x,y){const o={id:makeId(),kind:'text',page:activePage,text:'New text',x,y,w:220,h:40,size:18,font:'Helvetica',color:'#111111',opacity:1};objects.push(o);selectObject(o);renderCurrent();}
function addCoverAt(x,y){const o={id:makeId(),kind:'cover',page:activePage,x:x-50,y:y-15,w:140,h:40,opacity:1,color:'#ffffff'};objects.push(o);selectObject(o);renderCurrent();}
function imageData(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
function hexRgb(hex){const h=hex.replace('#','');return window.PDFLib.rgb(parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255)}
async function exportPDF(){if(!pdfBytes)return;try{status('Creating exported PDF…');const {PDFDocument,StandardFonts}=window.PDFLib;const out=await PDFDocument.load(pdfBytes);const fonts={Helvetica:await out.embedFont(StandardFonts.Helvetica),'Helvetica-Bold':await out.embedFont(StandardFonts.HelveticaBold),'Times-Roman':await out.embedFont(StandardFonts.TimesRoman),'Times-Bold':await out.embedFont(StandardFonts.TimesBold),Courier:await out.embedFont(StandardFonts.Courier),'Courier-Bold':await out.embedFont(StandardFonts.CourierBold)};const scale=1.5;
  for(let i=0;i<out.getPageCount();i++){const page=out.getPage(i),{height}=page.getSize();for(const o of objects.filter(x=>x.page===i&&x.kind!=='source')){
    const x=o.x/scale,y=height-(o.y+o.h)/scale,w=o.w/scale,h=o.h/scale;
    if(o.kind==='cover'){page.drawRectangle({x,y,width:w,height:h,color:hexRgb('#ffffff')});}
    if(o.kind==='text'){const lines=String(o.text||'').split(/\n/);let yy=height-(o.y+o.size)/scale;for(const line of lines){page.drawText(line,{x:o.x/scale,y:yy,size:o.size/scale,font:fonts[o.font]||fonts.Helvetica,color:hexRgb(o.color||'#111111'),opacity:o.opacity??1,maxWidth:w});yy-=o.size/scale*1.15;}}
    if(o.kind==='image'){const resp=await fetch(o.src);const bytes=await resp.arrayBuffer();let img;try{img=await out.embedPng(bytes)}catch{img=await out.embedJpg(bytes)}page.drawImage(img,{x,y,width:w,height:h,opacity:o.opacity??1});}
  }}
  const data=await out.save();const blob=new Blob([data],{type:'application/pdf'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='modified-pdf.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);status('Export complete.');
}catch(err){console.error(err);status('Export failed: '+(err.message||err));alert('Export failed: '+(err.message||err));}}

document.querySelectorAll('.tool[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
$('pdfInput').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;pdfBytes=new Uint8Array(await f.arrayBuffer());status('Reading PDF…');await loadPDF()});
$('canvasWrap').addEventListener('click',e=>{const shell=e.target.closest('.page-shell');if(!shell)return;const r=shell.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;if(tool==='text')addTextAt(x,y);else if(tool==='cover')addCoverAt(x,y);else if(tool==='delete'&&selected)deleteObject(selected);else if(tool==='select'&&!e.target.closest('.obj'))clearSelection();});
$('imageInput').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;const src=await imageData(f);const o={id:makeId(),kind:'image',page:activePage,src,x:60,y:60,w:180,h:120,opacity:1};objects.push(o);selectObject(o);renderCurrent();status('Image added. Drag it to position it, then export.');e.target.value=''});
$('applyProps').addEventListener('click',()=>{if(!selected)return;selected.text=$('propText').value;selected.size=Math.max(4,+$('propSize').value||16);selected.opacity=Math.max(0,Math.min(1,+$('propOpacity').value||1));selected.font=$('propFont').value;selected.color=$('propColor').value;selected.x=Math.max(0,+$('propX').value||0);selected.y=Math.max(0,+$('propY').value||0);selected.w=Math.max(10,+$('propW').value||100);selected.h=Math.max(10,+$('propH').value||30);renderCurrent();status('Changes applied to the editing layer.')});
$('deleteSelected').addEventListener('click',()=>{if(selected)deleteObject(selected)});$('exportBtn').addEventListener('click',exportPDF);
