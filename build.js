// Gera o site estático do catálogo em dist/ a partir de data/*.json e media/.
// Uso: node build.js   (no Netlify roda automaticamente a cada push)
const fs = require('fs'), path = require('path');
const ROOT = __dirname, OUT = path.join(ROOT, 'dist');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const cfg = read('data/config.json');
const SITE = (process.env.URL || '').replace(/\/$/, '');
const todos = read('data/imoveis.json');
const all = todos.filter(r => r.status !== 'oculto');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = n => 'R$ ' + Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const priceHtml = (r, c = 'price') => r.preco ? `<span class="${c}">${brl(r.preco)}</span>` : `<span class="${c} soft">Preço sob consulta</span>`;
const where = r => [r.local, r.cidade].filter(Boolean).join(', ');
const ribbon = r => r.status === 'vendido' ? '<span class="rib vendido">Vendido</span>' : r.status === 'reservado' ? '<span class="rib">Reservado</span>' : r.destaque ? '<span class="rib">Destaque</span>' : '';
const url = p => '/' + String(p).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
const abs = p => SITE + p;
const page = r => `/imovel/${r.id}/`;
const digits = s => String(s || '').replace(/\D/g, '');
const waNum = () => { const d = digits(cfg.whatsapp); return d && !d.startsWith('55') ? '55' + d : d; };

const waLink = msg => `https://api.whatsapp.com/send?phone=${waNum()}&text=${encodeURIComponent(msg)}`;
const fab = msg => waNum() ? `<a class="fab" href="${esc(waLink(msg))}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">${WA}</a>` : '';
const MSG_GERAL = 'Olá! Vi o catálogo de sítios e terrenos e gostaria de mais informações.';
const LAND = `<svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="240" fill="#1d4a33"/><circle cx="236" cy="70" r="24" fill="#c9a13b"/><path d="M0 160c50-34 92-40 150-16s112 20 170-18v114H0z" fill="#2c6646"/><path d="M0 194c60-22 120-24 170-7s100 9 150-11v64H0z" fill="#123524"/><path d="M44 196v-26m-9 9 9-9 9 9M268 186v-22m-8 7 8-7 8 7" stroke="#c9a13b" stroke-width="3" fill="none"/></svg>`;
const SEAL = `<svg class="seal" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="25" fill="none" stroke="#c9a13b" stroke-width="2"/><path d="M6 34c7-8 13-10 20-6s12 3 20-4v14a20 20 0 0 1-40 0z" fill="#c9a13b"/><path d="M6 38c8-5 15-6 22-3s11 2 18-2" stroke="#123524" stroke-width="2" fill="none"/><circle cx="34" cy="17" r="5" fill="#c9a13b"/></svg>`;
const WA = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>`;

function head(title, desc, img, canon) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">${canon ? `<meta property="og:url" content="${esc(canon)}"><link rel="canonical" href="${esc(canon)}">` : ''}
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#123524">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css"></head><body>`;
}
const foot = `<footer class="foot"><div class="wrap">${esc(cfg.nome)} · <a href="https://instagram.com/${esc(cfg.instagram)}" target="_blank" rel="noopener">@${esc(cfg.instagram)}</a>${cfg.whatsapp ? ` · WhatsApp ${esc(cfg.whatsapp)}` : ''}</div></footer><div class="toast" id="toast" role="status"></div>`;

function card(r) {
  const img = r.fotos?.length ? `<img src="${url(r.fotos[0])}" alt="" loading="lazy">` : LAND;
  const n = [r.videos?.length ? (r.videos.length > 1 ? r.videos.length + ' vídeos' : '▶ vídeo') : '', r.fotos?.length > 1 ? r.fotos.length + ' fotos' : ''].filter(Boolean).join(' · ');
  const f = r.caracteristicas || [];
  return `<a class="card" href="${page(r)}"><div class="ph">${img}${ribbon(r)}${n ? `<span class="nph">${n}</span>` : ''}</div>
<div class="cb"><div class="kind">${esc(r.tipo || 'Imóvel')}</div><h3>${esc(r.titulo)}</h3><div class="where">${esc(where(r))}</div>
<div class="facts">${priceHtml(r)}${r.area ? `<span class="area">${esc(r.area)}</span>` : ''}</div>
${f.length ? `<div class="tags">${f.slice(0, 3).map(t => `<span class="tag">${esc(t)}</span>`).join('')}${f.length > 3 ? `<span class="tag">+${f.length - 3}</span>` : ''}</div>` : ''}</div></a>`;
}

function adText(r) {
  return [`${r.tipo || 'Imóvel'} à venda: ${r.titulo}`, where(r), r.area ? `Área: ${r.area}` : '', r.preco ? `Valor: ${brl(r.preco)}` : '',
    (r.caracteristicas || []).length ? '\n' + r.caracteristicas.map(t => '✅ ' + t).join('\n') : ''].filter(Boolean).join('\n');
}

function home() {
  const list = [...all].sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0) || String(b.criadoEm).localeCompare(String(a.criadoEm)));
  const tipos = [...new Set(list.map(r => r.tipo).filter(Boolean))], cidades = [...new Set(list.map(r => r.cidade).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const disp = list.filter(r => r.status !== 'vendido').length;
  const desc = `${disp} sítios e terrenos à venda em Pernambuco. Fotos, vídeos e informações de cada imóvel.`;
  const data = list.map(r => ({ id: r.id, s: [r.titulo, r.tipo, r.cidade, r.local, r.descricao, ...(r.caracteristicas || [])].join(' ').toLowerCase(), t: r.tipo, c: r.cidade, st: r.status, p: r.preco || null }));
  return head(`${cfg.nome} · imóveis à venda`, desc, abs('/og.png'), SITE ? SITE + '/' : '') + `
<header class="top"><div class="wrap"><a class="brand" href="/">${SEAL}<div><h1>${esc(cfg.nome)}</h1><p>Sítios, chácaras e terrenos à venda · @${esc(cfg.instagram)}</p></div></a>
<div class="bar"><input id="q" type="search" placeholder="Buscar por cidade, nome ou característica" aria-label="Buscar">
<select id="tipo" aria-label="Tipo"><option value="">Todos os tipos</option>${tipos.map(t => `<option>${esc(t)}</option>`).join('')}</select>
<select id="city" aria-label="Cidade"><option value="">Todas as cidades</option>${cidades.map(t => `<option>${esc(t)}</option>`).join('')}</select>
<select id="ord" aria-label="Ordenar"><option value="rec">Mais recentes</option><option value="pa">Menor preço</option><option value="pd">Maior preço</option></select>
<label class="tg"><input type="checkbox" id="sold"> Mostrar vendidos</label></div></div></header>
<main><div class="wrap"><p class="count" id="count">${disp} imóveis disponíveis</p><div class="grid" id="grid">${list.map(r => `<div data-id="${r.id}"${r.status === 'vendido' ? ' hidden' : ''}>${card(r)}</div>`).join('')}</div>
<div class="empty" id="none" hidden><h2>Nada encontrado</h2><p>Tente outra busca ou limpe os filtros.</p></div></div></main>${foot}
<script>{const D=${JSON.stringify(data).replace(/</g, '\\u003c')};const g=document.getElementById('grid'),$=i=>document.getElementById(i);
const order=D.map(d=>d.id);
function run(){const q=$('q').value.trim().toLowerCase(),t=$('tipo').value,c=$('city').value,o=$('ord').value,s=$('sold').checked;
let L=D.filter(d=>(s||d.st!=='vendido')&&(!t||d.t===t)&&(!c||d.c===c)&&(!q||d.s.includes(q)));
if(o==='pa')L.sort((a,b)=>(a.p??1e15)-(b.p??1e15));else if(o==='pd')L.sort((a,b)=>(b.p??-1)-(a.p??-1));else L.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
const ids=new Set(L.map(d=>d.id));for(const el of g.children)el.hidden=!ids.has(el.dataset.id);
L.forEach(d=>g.appendChild(g.querySelector('[data-id="'+d.id+'"]')));
$('count').textContent=L.length+(L.length===1?' imóvel':' imóveis');$('none').hidden=L.length>0}
for(const i of ['q','tipo','city','ord','sold'])$(i).addEventListener(i==='q'?'input':'change',run);}</script>${fab(MSG_GERAL)}</body></html>`;
}

function detail(r) {
  const media = [...(r.videos || []).map(p => ({ p, v: true })), ...(r.fotos || []).map(p => ({ p, v: false }))];
  const link = abs(page(r));
  const shareMsg = `${adText(r)}\n\nVeja fotos e vídeos: ${link}`;
  const visit = waNum() ? `https://api.whatsapp.com/send?phone=${waNum()}&text=${encodeURIComponent(`Olá! Tenho interesse no imóvel "${r.titulo}". Gostaria de agendar uma visita.\n${link}`)}` : `https://instagram.com/${cfg.instagram}`;
  const desc = [r.area, where(r), (r.caracteristicas || []).slice(0, 3).join(' · ')].filter(Boolean).join(' · ');
  const og = r.fotos?.length ? abs(url(r.fotos[0])) : abs('/og.png');
  const M = media.map((m, i) => ({ src: url(m.p), v: m.v, name: `${r.id}-${i + 1}${path.extname(m.p)}` }));
  return head(`${r.titulo} · ${cfg.nome}`, desc, og, link) + `
<header class="top"><div class="wrap"><a class="brand" href="/">${SEAL}<div><h1>${esc(cfg.nome)}</h1><p>Sítios, chácaras e terrenos à venda · @${esc(cfg.instagram)}</p></div></a></div></header>
<main><div class="wrap"><a class="back" href="/">← Ver todos os imóveis</a>
<div class="det"><div class="gal"><div class="stage" id="stage">${M.length ? '' : LAND}</div>
${M.length ? `<div class="mbar"><button class="btn wa sm" id="sendm" type="button">${WA} Enviar esta mídia no WhatsApp</button><a class="btn ghost sm" id="dlm" download>Baixar</a></div>` : ''}
${M.length > 1 ? `<div class="thumbs" id="thumbs">${M.map((m, i) => `<button type="button" data-i="${i}" aria-current="${i === 0}" aria-label="${m.v ? 'Vídeo' : 'Foto'} ${i + 1}">${m.v ? `<video src="${m.src}#t=1" muted playsinline preload="metadata"></video><span class="play">▶</span>` : `<img src="${m.src}" alt="" loading="lazy">`}</button>`).join('')}</div>` : ''}</div>
<aside class="sheet"><div class="kind">${esc(r.tipo || 'Imóvel')}</div><h2>${esc(r.titulo)}</h2><div class="where">${esc(where(r))}</div>${priceHtml(r)}
<dl>${r.area ? `<dt>Área</dt><dd>${esc(r.area)}</dd>` : ''}${r.cidade ? `<dt>Cidade</dt><dd>${esc(r.cidade)}</dd>` : ''}<dt>Situação</dt><dd>${r.status === 'vendido' ? 'Vendido' : r.status === 'reservado' ? 'Reservado' : 'Disponível'}</dd></dl>
<div class="acts">


${r.status === 'vendido' ? '' : `<a class="btn wa" href="${esc(visit)}" target="_blank" rel="noopener">${waNum() ? `${WA} Falar no WhatsApp` : 'Falar no Instagram'}</a>`}
<a class="btn ghost" href="https://api.whatsapp.com/send?text=${encodeURIComponent(shareMsg)}" target="_blank" rel="noopener">${WA} Enviar imóvel para um cliente</a>
<button class="btn ghost" type="button" id="copy">Copiar link do imóvel</button>
${r.instagram ? `<a class="btn ghost" href="${esc(r.instagram)}" target="_blank" rel="noopener">Ver vídeo no Instagram</a>` : ''}
${r.maps ? `<a class="btn ghost" href="${esc(r.maps)}" target="_blank" rel="noopener">Ver localização no mapa</a>` : ''}
</div></aside>
<div class="desc">${r.descricao ? `<h3>Sobre o imóvel</h3><p>${esc(r.descricao)}</p>` : ''}
${(r.caracteristicas || []).length ? `<h3>Características</h3><ul class="feat">${r.caracteristicas.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</div></div></div></main>${foot}
<script>{const M=${JSON.stringify(M).replace(/</g, '\\u003c')},LINK=${JSON.stringify(link)},TITLE=${JSON.stringify(r.titulo)};
const $=i=>document.getElementById(i);let cur=0,ready=null;
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('show'),3000)}
function show(i){cur=i;ready=null;const m=M[i];if(!m)return;
$('stage').innerHTML=m.v?'<video src="'+m.src+'" controls playsinline preload="metadata"></video>':'<img src="'+m.src+'" alt="Foto '+(i+1)+'">';
const d=$('dlm');d.href=m.src;d.setAttribute('download',m.name);
const b=$('sendm');b.disabled=false;b.lastChild.textContent=' Enviar '+(m.v?'este vídeo':'esta foto')+' no WhatsApp';
document.querySelectorAll('#thumbs button').forEach(x=>x.setAttribute('aria-current',x.dataset.i==i))}
if(M.length)show(0);
$('thumbs')?.addEventListener('click',e=>{const b=e.target.closest('button');if(b)show(+b.dataset.i)});
$('sendm')?.addEventListener('click',async()=>{const m=M[cur],b=$('sendm');
  const fallback=()=>{window.open('https://api.whatsapp.com/send?text='+encodeURIComponent(TITLE+'\\n'+location.origin+m.src+'\\n\\nVeja todas as fotos e vídeos: '+LINK),'_blank')};
  if(!navigator.canShare){fallback();return}
  if(ready&&ready.i===cur){try{await navigator.share({files:[ready.f]})}catch(e){if(e.name!=='AbortError')fallback()}return}
  b.disabled=true;b.lastChild.textContent=' Preparando arquivo…';
  try{const bl=await (await fetch(m.src)).blob();const f=new File([bl],m.name,{type:bl.type});
    if(!navigator.canShare({files:[f]})){b.disabled=false;show(cur);fallback();return}
    ready={i:cur,f};try{await navigator.share({files:[f]});b.disabled=false;show(cur)}
    catch(e){b.disabled=false;b.lastChild.textContent=' Toque de novo para enviar';ready={i:cur,f};}
  }catch(e){b.disabled=false;show(cur);fallback()}});
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(LINK);toast('Link copiado')}catch(e){toast(LINK)}});}</script>${fab(r.status === 'vendido' ? MSG_GERAL : `Olá! Tenho interesse no imóvel "${r.titulo}". Gostaria de agendar uma visita.\n${link}`)}</body></html>`;
}


// Área de gestão (/admin/): excluir fotos e vídeos um por um. Protegida por senha (função admin-midia).
function admin() {
  const L = todos.map(r => ({ id: r.id, t: r.titulo, c: r.cidade, m: [...(r.videos || []).map(p => ({ p, v: 1 })), ...(r.fotos || []).map(p => ({ p, v: 0 }))] }));
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Gestão de mídias · ${esc(cfg.nome)}</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet"><link rel="stylesheet" href="/style.css">
<style>
.login{max-width:380px;margin:48px auto;display:grid;gap:12px}.login input{height:48px;border-radius:10px;border:1px solid var(--line);padding:0 14px;font-size:16px}
.imv{margin:0 0 34px}.imv h2{font-size:28px}.imv .where{margin-bottom:12px}
.mg{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.mi{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--card);display:flex;flex-direction:column}
.mi .th{position:relative;aspect-ratio:1;background:#0b1a12}.mi img,.mi video{width:100%;height:100%;object-fit:cover;display:block}
.mi .lb{position:absolute;left:6px;top:6px;font-size:12px;background:var(--gold);color:var(--green);padding:0 6px;border-radius:6px}
.mi .nm{font-size:13px;color:var(--mut);padding:6px 8px 0;overflow-wrap:anywhere}
.mi .bt{display:flex;flex-wrap:wrap;gap:6px;padding:8px}.mi button{flex:1;min-height:44px;border-radius:8px;border:1px solid #b3261e;background:transparent;color:#b3261e;font-weight:600}
.mi button.sure{background:#b3261e;color:#fff}.mi button.no{border-color:var(--line);color:var(--ink);flex:0 0 auto;padding:0 12px}
.mi.gone{opacity:.45}.mi.gone .bt{color:var(--mut);font-size:14px;justify-content:center;align-items:center;min-height:60px}
.note{color:var(--mut);font-size:15px;margin:0 0 20px}.sticky{position:sticky;top:0;z-index:5;background:var(--bg);padding:10px 0;display:flex;gap:10px;flex-wrap:wrap;align-items:center;border-bottom:1px solid var(--line);margin-bottom:20px}
.sticky select{height:44px;border-radius:10px;border:1px solid var(--line);padding:0 10px;font-size:16px;background:var(--card)}
</style></head><body>
<header class="top"><div class="wrap"><a class="brand" href="/">${SEAL}<div><h1>Gestão de mídias</h1><p>Excluir fotos e vídeos, um por um · ${esc(cfg.nome)}</p></div></a></div></header>
<main><div class="wrap" id="app">
<form class="login" id="login"><label for="senha"><b>Senha da gestão</b></label><input id="senha" type="password" autocomplete="current-password" required><button class="btn" type="submit">Entrar</button><p class="note" id="lerr" role="alert"></p></form>
</div></main><div class="toast" id="toast" role="status"></div>
<script>{const L=${JSON.stringify(L).replace(/</g, '\\u003c')};
const $=i=>document.getElementById(i),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let senha='',gone=new Set(),busy=false;
try{senha=sessionStorage.getItem('adm-s')||'';gone=new Set(JSON.parse(sessionStorage.getItem('adm-gone')||'[]'))}catch(e){}
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('show'),3500)}
async function api(b){const r=await fetch('/api/admin-midia',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({senha,...b})});let j={};try{j=await r.json()}catch(e){}return{ok:r.ok,status:r.status,...j}}
function item(r,m,i){const k=r.id+'|'+m.p,g=gone.has(k);
 return '<div class="mi'+(g?' gone':'')+'" data-k="'+esc(k)+'"><div class="th">'+(m.v?'<video src="/'+esc(m.p)+'#t=1" muted playsinline preload="metadata"></video><span class="play">▶</span>':'<img src="/'+esc(m.p)+'" alt="" loading="lazy">')+(i===L.find(x=>x.id===r.id).m.findIndex(x=>!x.v)&&!m.v?'<span class="lb">Capa</span>':'')+'</div>'
 +'<div class="nm">'+(m.v?'Vídeo · ':'Foto · ')+esc(m.p.split('/').pop())+'</div><div class="bt">'+(g?'Excluída · sai do site em ~1 min':'<button type="button" data-del>Excluir</button>')+'</div></div>'}
function render(){const f=$('fil')?.value||'';
 $('app').innerHTML='<div class="sticky"><select id="fil" aria-label="Imóvel"><option value="">Todos os imóveis</option>'+L.map(r=>'<option value="'+r.id+'"'+(r.id===f?' selected':'')+'>'+esc(r.t)+'</option>').join('')+'</select><span class="note" style="margin:0">Cada exclusão atualiza o site em cerca de 1 minuto. Não dá para desfazer pelo painel.</span></div>'
 +L.filter(r=>!f||r.id===f).map(r=>'<section class="imv"><h2>'+esc(r.t)+'</h2><div class="where">'+esc(r.c||'')+' · <a href="/imovel/'+r.id+'/" target="_blank" rel="noopener">ver no site</a></div>'
 +(r.m.length?'<div class="mg">'+r.m.map((m,i)=>item(r,m,i)).join('')+'</div>':'<p class="note">Sem fotos ou vídeos.</p>')+'</section>').join('');
 $('fil').addEventListener('change',render)}
$('app').addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||!b.closest('.mi'))return;const box=b.closest('.mi'),bt=box.querySelector('.bt');
 if(b.hasAttribute('data-del')){bt.innerHTML='<button type="button" class="sure" data-ok>Confirmar</button><button type="button" class="no" data-no>Voltar</button>';return}
 if(b.hasAttribute('data-no')){bt.innerHTML='<button type="button" data-del>Excluir</button>';return}
 if(b.hasAttribute('data-ok')){if(busy){toast('Aguarde a exclusão anterior terminar');return}busy=true;b.disabled=true;b.textContent='Excluindo…';
  const [id,arquivo]=box.dataset.k.split('|');
  try{const r=await api({acao:'excluir',id,arquivo});
   if(r.ok||r.status===404){gone.add(box.dataset.k);try{sessionStorage.setItem('adm-gone',JSON.stringify([...gone]))}catch(x){}box.classList.add('gone');bt.textContent='Excluída · sai do site em ~1 min';toast(r.ok?'Arquivo excluído':r.erro)}
   else{if(r.status===401){senha='';try{sessionStorage.removeItem('adm-s')}catch(x){}location.reload();return}bt.innerHTML='<button type="button" data-del>Excluir</button>';toast(r.erro||'Não foi possível excluir')}
  }catch(x){bt.innerHTML='<button type="button" data-del>Excluir</button>';toast('Sem conexão. Tente de novo.')}
  busy=false}});
async function entrar(s){senha=s;const r=await api({acao:'entrar'});if(r.ok){try{sessionStorage.setItem('adm-s',s)}catch(x){}render()}else{senha='';$('lerr').textContent=r.erro||'Não foi possível entrar'}}
$('login').addEventListener('submit',e=>{e.preventDefault();$('lerr').textContent='';entrar($('senha').value)});
if(senha)entrar(senha);}</script></body></html>`;
}

// saída
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync(path.join(ROOT, 'src/style.css'), path.join(OUT, 'style.css'));
for (const f of ['favicon.svg', 'og.png']) if (fs.existsSync(path.join(ROOT, 'src', f))) fs.copyFileSync(path.join(ROOT, 'src', f), path.join(OUT, f));
if (fs.existsSync(path.join(ROOT, 'media'))) fs.cpSync(path.join(ROOT, 'media'), path.join(OUT, 'media'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), home());
for (const r of all) { const d = path.join(OUT, 'imovel', r.id); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'index.html'), detail(r)); }
fs.mkdirSync(path.join(OUT, 'admin'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'admin', 'index.html'), admin());
fs.writeFileSync(path.join(OUT, '404.html'), head('Página não encontrada', '', abs('/og.png')) + `<main><div class="empty"><h2>Imóvel não encontrado</h2><p>Ele pode ter sido vendido ou removido.</p><p><a class="btn" href="/">Ver imóveis disponíveis</a></p></div></main>${foot}${fab(MSG_GERAL)}</body></html>`);
console.log(`Site gerado: ${all.length} imóveis em dist/`);
