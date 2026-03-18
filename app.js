const $ = (id) => document.getElementById(id)
const on = (el, evt, fn) => { if (el) el.addEventListener(evt, fn) }

const video=$("video")
const playerWrap=$("playerWrap")
const playerEmpty=$("playerEmpty")
const playerSection=$("playerSection")
const clickLayer=$("clickLayer")
const leftHit=$("leftHit")
const rightHit=$("rightHit")
const importUrlInput=$("importUrlInput")
const importFile=$("importFile")
const importUrlBtn=$("importUrlBtn")
const exportCurrentBtn=$("exportCurrentBtn")
const clearLibrariesBtn=$("clearLibrariesBtn")
const backFolderBtn=$("backFolderBtn")
const typeGroupBtn=$("typeGroupBtn")
const typeStationBtn=$("typeStationBtn")
const typeVideoBtn=$("typeVideoBtn")
const videoFields=$("videoFields")
const entryNameInput=$("entryNameInput")
const entryImageInput=$("entryImageInput")
const entryInfoInput=$("entryInfoInput")
const entryUrlInput=$("entryUrlInput")
const entryRefererInput=$("entryRefererInput")
const entryUserAgentInput=$("entryUserAgentInput")
const entryHeadersInput=$("entryHeadersInput")
const entryDrmKeysInput=$("entryDrmKeysInput")
const entryImportToggle=$("entryImportToggle")
const entryEmbedToggle=$("entryEmbedToggle")
const addEntryBtn=$("addEntryBtn")
const libraryList=$("libraryList")
const autoplayToggle=$("autoplayToggle")
const rememberToggle=$("rememberToggle")
const boostToggle=$("boostToggle")
const playPauseBtn=$("playPauseBtn")
const backBtn=$("backBtn")
const forwardBtn=$("forwardBtn")
const progressRange=$("progressRange")
const timeLabel=$("timeLabel")
const nextItemBtn=$("nextItemBtn")
const muteBtn=$("muteBtn")
const fullscreenBtn=$("fullscreenBtn")
const volumeWrap=$("volumeWrap")
const volumeRange=$("volumeRange")
const volumeLabel=$("volumeLabel")
const appRoot=document.querySelector(".app")
const sidebarToggleBtn=$("sidebarToggleBtn")
const jumpBackLabel=$("jumpBackLabel")
const jumpForwardLabel=$("jumpForwardLabel")
const contextPanel=$("contextPanel")
const nowPlayingEl=$("nowPlaying")
const infoToggleBtn=$("infoToggleBtn")
const infoPanel=$("infoPanel")
const debugToggleBtn=$("debugToggleBtn")
const debugEl=$("debug")
const manualResolveBox=$("manualResolveBox")
const manualResolveBtn=$("manualResolveBtn")
const youtubeFrame=$("youtubeFrame")
const browserGrid=$("browserGrid")
const breadcrumbs=$("breadcrumbs")
const libraryName=$("libraryName")
const refreshLibraryBtn=$("refreshLibraryBtn")
const searchInput=$("searchInput")
const clearSearchBtn=$("clearSearchBtn")
const useBackendToggle=$("useBackendToggle")
const backendUrlInput=$("backendUrlInput")
const backendUrlField=$("backendUrlField")

let dashPlayer=null, hlsPlayer=null, lastClickTime=0
let audioCtx=null, sourceNode=null, gainNode=null, audioBoostReady=false
let suppressAuxLeft=false, suppressAuxRight=false
let libraries=[], currentLibraryId=null, browserStack=[], newEntryType="group"
let pendingManualResolveUrl=""
let pendingManualResolveTitle=""
let pendingManualResolveReferer=""
let currentItemKey=""
let currentPlayableTitle=""
let controlsHideTimer=null
let importInFlight=false
let storageReady=false
let saveLibrariesTimer=null
let saveLibrariesPromise=Promise.resolve()
let editingItemRef=null
let editingParentNode=null
let editingKind=""
let browserSearchTerm=""
let currentInfoText=""
let currentInfoExpanded=false
let debugExpanded=false

const SETTINGS_KEY="player_v14_settings"
const PROGRESS_KEY="player_v14_progress"
const LINK_STATUS_KEY="player_v14_link_status"
const RESOLVE_CACHE_KEY="player_v14_resolve_cache"
const RESOLVER_KEY="resolver_config"
const LEGACY_LIBS_KEY="player_v14_libraries"
const DB_NAME="player_v14_db"
const DB_VERSION=1
const DB_STORE="kv"
const DB_LIBRARIES_KEY="libraries"

const DEFAULT_BACKEND_URL="http://localhost:3000/api/resolve"
const RESOLVER_CONFIG={
  useBackend:true,
  backendUrl:DEFAULT_BACKEND_URL,
  embedResolvers:false
}

function normalizeBackendUrl(value){
  const clean=String(value||"").trim()
  if(!clean) return DEFAULT_BACKEND_URL
  return clean.replace(/\/+$/,"")
}

async function updateResolverStatus() {
  const el=document.getElementById("resolverStatus")
  if(!el) return

  const backendUrl=normalizeBackendUrl(RESOLVER_CONFIG.backendUrl)

  if(!RESOLVER_CONFIG.useBackend){
    el.textContent="⚪ Backend desactivado"
    return
  }

  try {
    const r = await fetch(`${backendUrl}?ping=1`, {
      method: "GET",
      mode: "cors"
    })

    el.textContent = r.ok
      ? `🟢 Backend activo: ${backendUrl}`
      : `🔴 Backend sin respuesta: ${backendUrl}`
  } catch (e) {
    el.textContent = `🔴 Backend no detectado: ${backendUrl}`
  }
}

function renderDebugVisibility(){
  if(!debugEl) return
  const hasText=!!debugEl.textContent.trim()
  debugEl.classList.toggle("hidden", !hasText || !debugExpanded)
}

function setDebug(t){
  const text=t||""
  debugEl.textContent=text
  renderDebugVisibility()
}

function toggleDebugPanel(){
  if(!debugEl?.textContent.trim()) return
  debugExpanded=!debugExpanded
  renderDebugVisibility()
}

function formatInfoText(value){
  return String(value||"").trim()
}
function updateNowPlayingFromContext(){
  const node=getCurrentNode()
  const lib=currentLibrary()

  let title=""

  if(node?.name) title=node.name
  else if(lib?.data?.name) title=lib.data.name
  else if(lib?.title) title=lib.title

  nowPlayingEl.textContent=title || "Explorador"
  syncInfoFromCurrentContext(node)
}

function setCurrentInfo(infoText=""){
  currentInfoText=formatInfoText(infoText)

  if(infoToggleBtn) infoToggleBtn.classList.toggle("hidden", !currentInfoText)

  if(!currentInfoText){
    currentInfoExpanded=false
    if(infoPanel){
      infoPanel.classList.add("hidden")
      infoPanel.innerHTML=""
    }
    return
  }

  if(currentInfoExpanded && infoPanel){
    infoPanel.classList.remove("hidden")
    infoPanel.innerHTML='<div class="info-panel-text">'+escapeHtml(currentInfoText).replace(/\n/g,"<br>")+'</div>'
  }else if(infoPanel){
    infoPanel.classList.add("hidden")
    infoPanel.innerHTML=""
  }
}

function toggleCurrentInfo(){
  if(!currentInfoText) return
  currentInfoExpanded=!currentInfoExpanded
  setCurrentInfo(currentInfoText)
}

function findNearestInfoForItem(item){
  if(item?.info) return item.info

  for(let i=browserStack.length-1;i>=0;i--){
    const node=browserStack[i]
    if(node?.info) return node.info
  }

  const lib=currentLibrary()
  return lib?.data?.info || ""
}

function syncInfoFromCurrentContext(preferredItem=null){
  const info=findNearestInfoForItem(preferredItem || getCurrentNode())
  setCurrentInfo(info)
}
function showPlayer(){playerSection.classList.remove("hidden")}
function hidePlayer(){playerSection.classList.add("hidden")}
function showPlayerEmpty(message="Vídeo no válido"){
  showPlayer()
  if(playerWrap) playerWrap.classList.add("is-empty")
  if(playerEmpty) playerEmpty.classList.remove("hidden")
  if(playerEmpty) playerEmpty.innerHTML='<div class="player-placeholder-text">'+escapeHtml(message)+'</div>'
}
function showPlayerLoaded(){
  showPlayer()
  if(playerWrap) playerWrap.classList.remove("is-empty")
  if(playerEmpty) playerEmpty.classList.add("hidden")
}
function hideManualResolve(){
  pendingManualResolveUrl=""
  pendingManualResolveTitle=""
  pendingManualResolveReferer=""
  if(manualResolveBox) manualResolveBox.classList.add("hidden")
}

function showManualResolve(url,title,referer=""){
  pendingManualResolveUrl=url||""
  pendingManualResolveTitle=title||""
  pendingManualResolveReferer=referer||""
  if(manualResolveBox) manualResolveBox.classList.remove("hidden")
}
function hideYoutubeFrame(){ if(youtubeFrame){ youtubeFrame.classList.add("hidden"); youtubeFrame.removeAttribute("src") } video.classList.remove("hidden"); clickLayer.classList.remove("hidden"); leftHit.classList.remove("hidden"); rightHit.classList.remove("hidden") }
function showYoutubeFrame(embedUrl){ destroyPlayers(); showPlayer(); hideManualResolve(); video.classList.add("hidden"); clickLayer.classList.add("hidden"); leftHit.classList.add("hidden"); rightHit.classList.add("hidden"); if(youtubeFrame){ youtubeFrame.classList.remove("hidden"); youtubeFrame.src=embedUrl } }
function loadSettings(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}")}catch{return{}}}
function saveSettings(){ const s=loadSettings(); s.autoplay=autoplayToggle.checked; s.remember=rememberToggle.checked; s.boost=boostToggle.checked; s.jumpSeconds=getJumpSeconds(); s.volumePercent=Number(volumeRange.value)||100; s.sidebarCollapsed=!!appRoot?.classList.contains("sidebar-collapsed"); localStorage.setItem(SETTINGS_KEY,JSON.stringify(s)); applyVolume() }
function loadProgressMap(){try{return JSON.parse(localStorage.getItem(PROGRESS_KEY)||"{}")}catch{return{}}}
function saveProgress(url,time){const map=loadProgressMap(); map[url]=time; localStorage.setItem(PROGRESS_KEY,JSON.stringify(map))}
function getProgress(url){const map=loadProgressMap(); return map[url]||0}
function loadResolveCacheMap(){ try{return JSON.parse(localStorage.getItem(RESOLVE_CACHE_KEY)||"{}") }catch{return{}} }
function saveResolveCacheMap(map){ localStorage.setItem(RESOLVE_CACHE_KEY, JSON.stringify(map||{})) }
function getResolveCache(url){
  const key=String(url||"").trim()
  if(!key) return null
  const map=loadResolveCacheMap()
  const item=map[key]
  if(!item || !item.url || !item.expiresAt) return null
  if(Date.now()>Number(item.expiresAt||0)){
    delete map[key]
    saveResolveCacheMap(map)
    return null
  }
  return item
}
function setResolveCache(url, resolvedUrl, ttlMs=6*60*60*1000){
  const key=String(url||"").trim()
  const clean=String(resolvedUrl||"").trim()
  if(!key || !clean) return
  const map=loadResolveCacheMap()
  map[key]={ url:clean, expiresAt:Date.now()+Math.max(60_000, Number(ttlMs)||0) }
  saveResolveCacheMap(map)
}
function clearResolveCache(url){
  const key=String(url||"").trim()
  if(!key) return
  const map=loadResolveCacheMap()
  delete map[key]
  saveResolveCacheMap(map)
}
function makeResolveCacheKey(url, referer=""){
  return String(url||"").trim() + (referer ? `@@${String(referer).trim()}` : "")
}

function loadLinkStatusMap(){ try{ return JSON.parse(localStorage.getItem(LINK_STATUS_KEY)||"{}") }catch{ return {} } }
function saveLinkStatusMap(map){ localStorage.setItem(LINK_STATUS_KEY, JSON.stringify(map||{})) }
function getLinkStatus(url){
  const key=String(url||"").trim()
  if(!key) return ""
  const map=loadLinkStatusMap()
  return map[key] || ""
}
function setLinkStatus(url, status){
  const key=String(url||"").trim()
  if(!key) return
  const map=loadLinkStatusMap()
  if(status) map[key]=status
  else delete map[key]
  saveLinkStatusMap(map)
}
function clearLinkStatus(url){
  const key=String(url||"").trim()
  if(!key) return
  const map=loadLinkStatusMap()
  delete map[key]
  saveLinkStatusMap(map)
}
function getLinkStatusDot(url){
  const status=getLinkStatus(url)
  if(status==="dead") return '<span class="status-dot dead" title="Enlace muerto"></span>'
  if(status==="ok") return '<span class="status-dot ok" title="Visto / funciona"></span>'
  return ""
}
function scrollBrowserToTop(){
  const target=contextPanel || document.querySelector(".browser")
  if(!target) return
  const top=window.scrollY + target.getBoundingClientRect().top - 12
  window.scrollTo({ top: Math.max(0, top), behavior:"smooth" })
}

function getJumpSeconds(){const s=loadSettings(); return Math.max(1,Number(s.jumpSeconds)||10)}
function setJumpSeconds(v){const s=loadSettings(); s.jumpSeconds=Math.max(1,v); localStorage.setItem(SETTINGS_KEY,JSON.stringify(s)); syncJumpUi()}
function syncJumpUi(){const n=getJumpSeconds(); jumpBackLabel.textContent=n; jumpForwardLabel.textContent=n}
function uuid(){return "lib_"+Date.now()+"_"+Math.random().toString(36).slice(2,8)}
function setSidebarCollapsed(collapsed){ if(!appRoot) return; appRoot.classList.toggle("sidebar-collapsed", !!collapsed); if(sidebarToggleBtn){ sidebarToggleBtn.textContent=collapsed ? "▶" : "◀"; sidebarToggleBtn.title=collapsed ? "Expandir sidebar" : "Encoger sidebar" } const s=loadSettings(); s.sidebarCollapsed=!!collapsed; localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) }
function currentLibrary(){return libraries.find(x=>x.id===currentLibraryId)||null}
function findLibraryById(id){ return libraries.find(x=>x.id===id)||null }
function isBrowserAtLibrariesRoot(){ return browserStack.length===0 }
function openLibrary(libId){
  const lib=findLibraryById(libId)
  if(!lib) return

  currentLibraryId=lib.id
  browserStack=[lib.data]

  clearBrowserSearch()

  updateNowPlayingFromContext()

  renderLibraryList()
  renderBrowser()
}
function escapeHtml(str){return String(str||"").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))}

function openDb(){
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB) return reject(new Error("IndexedDB no disponible"))
    const request=indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded=()=>{
      const db=request.result
      if(!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE)
    }
    request.onsuccess=()=>resolve(request.result)
    request.onerror=()=>reject(request.error||new Error("No se pudo abrir IndexedDB"))
  })
}
async function dbGet(key){
  const db=await openDb()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(DB_STORE, "readonly")
    const store=tx.objectStore(DB_STORE)
    const req=store.get(key)
    req.onsuccess=()=>resolve(req.result)
    req.onerror=()=>reject(req.error||new Error("No se pudo leer IndexedDB"))
  })
}
async function dbSet(key, value){
  const db=await openDb()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(DB_STORE, "readwrite")
    tx.oncomplete=()=>resolve(true)
    tx.onerror=()=>reject(tx.error||new Error("No se pudo guardar en IndexedDB"))
    tx.objectStore(DB_STORE).put(value, key)
  })
}
async function dbRemove(key){
  const db=await openDb()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(DB_STORE, "readwrite")
    tx.oncomplete=()=>resolve(true)
    tx.onerror=()=>reject(tx.error||new Error("No se pudo borrar en IndexedDB"))
    tx.objectStore(DB_STORE).delete(key)
  })
}
async function loadLibrariesFromStorage(){
  try{
    const fromDb=await dbGet(DB_LIBRARIES_KEY)
    if(Array.isArray(fromDb)) return fromDb
  }catch{}
  try{
    const legacy=JSON.parse(localStorage.getItem(LEGACY_LIBS_KEY)||"[]")
    if(Array.isArray(legacy) && legacy.length){
      try{ await dbSet(DB_LIBRARIES_KEY, legacy) }catch{}
      return legacy
    }
  }catch{}
  return []
}
function queueSaveLibraries(){
  if(!storageReady) return Promise.resolve(false)
  const snapshot=structuredClone(libraries)
  saveLibrariesPromise=saveLibrariesPromise.then(async ()=>{
    try{
      await dbSet(DB_LIBRARIES_KEY, snapshot)
      try{ localStorage.removeItem(LEGACY_LIBS_KEY) }catch{}
      return true
    }catch(error){
      setDebug(`Error guardando bibliotecas.\n${error?.message||error}`)
      return false
    }
  })
  return saveLibrariesPromise
}
function saveLibrariesSoon(){
  if(saveLibrariesTimer) clearTimeout(saveLibrariesTimer)
  saveLibrariesTimer=setTimeout(()=>{ saveLibrariesTimer=null; queueSaveLibraries() }, 60)
}

function safeJsonParse(text){
  try{
    return { ok:true, data:JSON.parse(text), error:"" }
  }catch(error){
    return { ok:false, data:null, error:error?.message||String(error) }
  }
}

function isNumericLike(value){
  return /^-?\d+(?:\.\d+)?$/.test(value)
}

function isLiteralLike(value){
  return /^(true|false|null)$/i.test(value)
}

function extractJsonErrorPosition(errorMessage){
  const m=String(errorMessage||"").match(/position\s+(\d+)/i)
  return m ? Number(m[1]) : -1
}

function extractAround(text, pos, radius=50){
  const start=Math.max(0, pos-radius)
  const end=Math.min(text.length, pos+radius)
  return text.slice(start, end)
}

function normalizeBrokenJsonLikeText(input){
  const src=String(input||"").replace(/^[\uFEFF\u200B]+/, "")
  let out=""
  let i=0
  let inString=false
  let quoteChar='"'
  let escape=false

  const nextNonSpace=(from)=>{
    for(let j=from;j<src.length;j++){
      if(!/\s/.test(src[j])) return src[j]
    }
    return ""
  }

  while(i<src.length){
    const ch=src[i]

    if(inString){
      if(escape){
        out+=ch
        escape=false
        i++
        continue
      }

      if(ch==="\\"){
        out+=ch
        escape=true
        i++
        continue
      }

      if(ch===quoteChar){
        const next=nextNonSpace(i+1)
        const realClose = next==="" || next==="," || next==="}" || next==="]" || next===":"
        if(realClose){
          out+='"'
          inString=false
          i++
          continue
        }
        out+='\\\"'
        i++
        continue
      }

      if(ch==="\n" || ch==="\r"){
        out+='"'
        inString=false
        continue
      }

      out+=ch
      i++
      continue
    }

    if(ch==="'" || ch==='"'){
      inString=true
      quoteChar=ch
      out+='"'
      i++
      continue
    }

    out+=ch
    i++
  }

  if(inString) out+='"'

  out=out.replace(/,\s*([}\]])/g, "$1")
  out=out.replace(/([\{,]\s*)([A-Za-z_][\w.-]*)(\s*:)/g, '$1"$2"$3')

  out=out.replace(/(:\s*)([^"\[{][^,}\]\n\r]*)(\s*[,}\]])/g, (m, start, raw, end)=>{
    const value=String(raw||"").trim()
    if(!value) return m
    if(isLiteralLike(value) || isNumericLike(value)) return `${start}${value}${end}`
    const clean=value.replace(/^"+|"+$/g, "").replace(/"/g, '\\"')
    return `${start}"${clean}"${end}`
  })

  return out
}

function tryRepairJsonAtError(text, errorMessage){
  const raw=String(text||"")
  const pos=extractJsonErrorPosition(errorMessage)
  if(pos<0) return ""

  const fixes=[]

  fixes.push(normalizeBrokenJsonLikeText(raw))

  if(pos<raw.length){
    fixes.push(raw.slice(0,pos) + '"' + raw.slice(pos))
    fixes.push(raw.slice(0,pos) + '\\"' + raw.slice(pos))
  }

  const around=extractAround(raw, pos, 80)
  const colonLocal=around.lastIndexOf(":")
  if(colonLocal>=0){
    const absoluteColon=(pos-80<0?0:pos-80)+colonLocal
    const prefix=raw.slice(0, absoluteColon+1)
    const tail=raw.slice(absoluteColon+1)
    fixes.push(prefix + ' "' + tail.trimStart())
    fixes.push(prefix + normalizeBrokenJsonLikeText(tail))
  }

  for(const candidate of fixes){
    if(!candidate || candidate===raw) continue
    const parsed=safeJsonParse(candidate)
    if(parsed.ok) return candidate
  }

  return ""
}

function parseLibraryText(text){
  const payload=extractLikelyJsonPayload(text)
  const attempts=[]
  const push=(label, value)=>{
    if(typeof value==="string" && value && !attempts.some(x=>x.value===value)){
      attempts.push({label, value})
    }
  }

  push("original", text)
  push("payload", payload)
  push("normalizado", normalizeBrokenJsonLikeText(payload))
  push("normalizado-2", normalizeBrokenJsonLikeText(normalizeBrokenJsonLikeText(payload)))

  let lastError=""

  for(let i=0;i<attempts.length;i++){
    const attempt=attempts[i]
    const parsed=safeJsonParse(attempt.value)

    if(parsed.ok){
      return {
        ok:true,
        data:parsed.data,
        error:attempt.label==="original" ? "" : `JSON reparado automáticamente (${attempt.label}).`
      }
    }

    lastError=parsed.error || lastError

    const positional=tryRepairJsonAtError(attempt.value, parsed.error)
    if(positional && !attempts.some(x=>x.value===positional)){
      attempts.push({ label: attempt.label + "-posfix", value: positional })
    }
  }

  return { ok:false, data:null, error:lastError || "JSON inválido" }
}
function makeItemKey(item){
  if(!item) return ""
  return [item.import ? "import" : "station", item.name || item.title || "", item.url || "", isEmbedStation(item) ? "embed" : "", isYoutubeUrl(item?.url || "") ? "youtube" : ""].join("|")
}
function isCurrentItem(item){ return !!currentItemKey && makeItemKey(item)===currentItemKey }

function clearCurrentSelection(render=true){
  if(!currentItemKey) return
  currentItemKey=""
  if(render) renderBrowser()
}

function getCurrentNodeStations(){
  const node=getCurrentNode()
  if(!node) return []

  if(isStationContainer(node)){
    return (Array.isArray(node.stations) ? node.stations : []).filter(v => v && v.url && !v.import)
  }

  return (Array.isArray(node.stations) ? node.stations : []).filter(st => st && st.url && !st.import)
}
function getCurrentItemIndexInNode(){ const stations=getCurrentNodeStations(); return stations.findIndex(st => makeItemKey(st)===currentItemKey) }
async function playNextInCurrentNode(){ const stations=getCurrentNodeStations(); if(!stations.length) return false; const currentIdx=getCurrentItemIndexInNode(); const nextIdx=currentIdx>=0 ? currentIdx+1 : 0; if(nextIdx<0 || nextIdx>=stations.length) return false; await openStation(stations[nextIdx], { force: true, fromAutoNext: true }); return true }

function isDirectMediaUrl(url) {
  if (!url) return false
  const clean = url.split('#')[0].split('?')[0].toLowerCase()
  return clean.endsWith('.mp4')
    || clean.endsWith('.m4v')
    || clean.endsWith('.webm')
    || clean.endsWith('.mov')
    || clean.endsWith('.mkv')
    || clean.endsWith('.mpd')
    || clean.endsWith('.m3u8')
    || clean.endsWith('.m3u')
    || clean.endsWith('.ts')
    || clean.endsWith('.ogv')
}
function needsResolution(url) {
  if (!url) return false
  return /^https?:\/\//i.test(url) && !isDirectMediaUrl(url)
}
function normalizePossibleMediaUrl(value, baseUrl=""){
  const raw=String(value||"").replace(/\\//g,'/').replace(/&amp;/g,'&').trim()
  if(!raw) return null
  try{ return new URL(raw, baseUrl || location.href).toString() }catch{ return null }
}
function extractMediaCandidatesFromHtml(html, baseUrl=""){
  const text=String(html||"")
  const patterns=[
    /sources\s*:\s*\[\s*\{[\s\S]*?file\s*:\s*['"]([^'"]+)['"]/ig,
    /(?:file|src|url)\s*[:=]\s*['"]([^'"]+\.(?:m3u8|m3u|mpd|mp4|m4v|webm|mov|mkv|ts|ogv)[^'"]*)['"]/ig,
    /['"](https?:\/\/[^'"]+\.(?:m3u8|m3u|mpd|mp4|m4v|webm|mov|mkv|ts|ogv)[^'"]*)['"]/ig,
    /['"]((?:\/|\.\/|\.\.\/)[^'"]+\.(?:m3u8|m3u|mpd|mp4|m4v|webm|mov|mkv|ts|ogv)[^'"]*)['"]/ig
  ]
  const found=[]
  for(const pattern of patterns){
    pattern.lastIndex=0
    let match
    while((match=pattern.exec(text))){
      const candidate=normalizePossibleMediaUrl(match[1]||match[0], baseUrl)
      if(candidate && isDirectMediaUrl(candidate) && !found.includes(candidate)) found.push(candidate)
      if(found.length>=12) return found
    }
  }
  return found
}
async function frontendHtmlResolver(url){
  try{
    setDebug(`Intentando resolver en frontend antes del backend...`)
    const response=await fetch(url, { method:'GET', mode:'cors', credentials:'include' })
    if(!response.ok) throw new Error(`HTTP ${response.status}`)
    const contentType=String(response.headers.get('content-type')||'').toLowerCase()
    const body=await response.text()
    if(isDirectMediaUrl(response.url)) return response.url
    if(contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/dash+xml') || contentType.startsWith('video/')) return response.url || url
    const candidates=extractMediaCandidatesFromHtml(body, response.url || url)
    if(candidates.length){
      setDebug(`Frontend encontró stream directo sin backend:
${candidates[0]}`)
      return candidates[0]
    }
    return null
  }catch(e){
    setDebug(`Frontend no pudo resolver sin backend (${e.message}).`)
    return null
  }
}
function isEmbedStation(item){ const v=item?.embed; return v===true || String(v||"").toLowerCase()==="true" || String(v||"")==="1" }
function isStationContainer(item){
  return !!item &&
    !item?.url &&
    Array.isArray(item.stations) &&
    !Array.isArray(item.groups)
}
function detectEditorKindFromItem(item, fallbackKind="group"){
  if(!!item && (typeof item.url==="string" && item.url.trim()!=="")) return "video"
  if(isStationContainer(item)) return "station"
  if(Array.isArray(item?.groups)) return "group"
  return fallbackKind==="video" || fallbackKind==="station" || fallbackKind==="group"
    ? fallbackKind
    : "group"
}
function isPlayableLeaf(item){
  return !!item && (typeof item.url==="string" && item.url.trim()!=="")
}
function isVideoLeaf(item){
  return isPlayableLeaf(item)
}
function isYoutubeUrl(url){ return /(?:youtube\.com|youtu\.be)/i.test(String(url||"")) }
function getYoutubeEmbedUrl(url){
  const raw=String(url||"").trim()
  try{
    const u=new URL(raw)
    let id=""
    if(/youtu\.be$/i.test(u.hostname)) id=u.pathname.replace(/^\//,"").split("/")[0]
    else if(/(^|\.)youtube\.com$/i.test(u.hostname)){
      if(u.pathname==="/watch") id=u.searchParams.get("v")||""
      else if(u.pathname.startsWith("/embed/")) id=u.pathname.split("/embed/")[1].split("/")[0]
      else if(u.pathname.startsWith("/shorts/")) id=u.pathname.split("/shorts/")[1].split("/")[0]
    }
    if(!id) return null
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
  }catch{return null}
}

async function embedResolver(url) {
  setDebug(`Resolvedor embebido desactivado.\nEsta app necesita backend para páginas host.`)
  return null
}
async function backendResolver(url, manual=false, referer="") {
  try {
    const backendUrl=normalizeBackendUrl(RESOLVER_CONFIG.backendUrl)
    const refererPart = referer ? `&referer=${encodeURIComponent(referer)}` : ``
    const fullUrl = `${backendUrl}?url=${encodeURIComponent(url)}` + (manual ? `&manual=1` : ``) + refererPart
    setDebug(`Llamando backend:\n${fullUrl}`)
    const response = await fetch(fullUrl)
    const data = await response.json()
    if (data.success && data.streamUrl) {
      hideManualResolve()
      setDebug(`Backend OK (${data.method || 'backend'}):\n${data.streamUrl}`)
      return data.streamUrl
    } else {
      setDebug(`Backend respondió sin stream.\nMétodo: ${data.method || 'desconocido'}\nError: ${data.error || 'error desconocido'}\nURL analizada: ${url}`)
      return null
    }
  } catch (e) {
    setDebug(`Error conectando con backend:\n${e.message}`)
    return null
  }
}
async function resolveStreamUrl(originalUrl, referer="") {
  if (!needsResolution(originalUrl)) return originalUrl

  const cacheKey=makeResolveCacheKey(originalUrl, referer)
  const cached=getResolveCache(cacheKey)
  if(cached?.url){
    setDebug(`Usando stream cacheado:
${cached.url}`)
    return cached.url
  }

  let resolvedUrl = await frontendHtmlResolver(originalUrl)
  if (resolvedUrl) {
    setResolveCache(cacheKey, resolvedUrl)
    return resolvedUrl
  }

  if (!resolvedUrl && RESOLVER_CONFIG.useBackend) {
    resolvedUrl = await backendResolver(originalUrl, false, referer)
    if (resolvedUrl) {
      setResolveCache(cacheKey, resolvedUrl)
      return resolvedUrl
    }
  }

  if (!resolvedUrl && RESOLVER_CONFIG.embedResolvers) resolvedUrl = await embedResolver(originalUrl)
  if (resolvedUrl) {
    setResolveCache(cacheKey, resolvedUrl)
    return resolvedUrl
  }

  clearResolveCache(cacheKey)
  setDebug('⚠ No se pudo resolver a una URL directa de vídeo')
  return null
}
async function resolveStreamUrlManual(originalUrl, referer="") {
  if (!needsResolution(originalUrl)) return originalUrl
  if (!RESOLVER_CONFIG.useBackend) { setDebug("La resolución manual necesita backend activo."); return null }
  setDebug("Abriendo ventana manual para captcha / continue...\nHaz el captcha, pulsa Proceed to video y espera a que se cierre sola.")
  return await backendResolver(originalUrl, true, referer)
}

function getProxyHeadersFromItem(item, options={}){
  const headers={}
  const includeImplicit = !!options.includeImplicit

  if(item?.headers && typeof item.headers==="object"){
    for(const [k,v] of Object.entries(item.headers)){
      const key=String(k||"").trim()
      const value=String(v||"").trim()
      if(key && value) headers[key]=value
    }
  }

  if(includeImplicit){
    const referer=String(item?.referer||"").trim()
    if(referer && !headers.referer && !headers.Referer){
      headers.referer=referer
    }

    const userAgent=String(item?.userAgent||"").trim()
    if(userAgent && !headers["user-agent"] && !headers["User-Agent"]){
      headers["user-agent"]=userAgent
    }
  }

  return headers
}

function buildBackendMediaProxyUrl(url, item=null, extraHeaders={}){
  const baseHeaders=getProxyHeadersFromItem(item, { includeImplicit:true })
  const mergedHeaders={ ...baseHeaders, ...(extraHeaders||{}) }

  const headersStr=Object.entries(mergedHeaders)
    .filter(([k,v])=>k&&v)
    .map(([k,v])=>`${k}:${v}`)
    .join("\n")

  const backendBase = normalizeBackendUrl(RESOLVER_CONFIG.backendUrl)
    .replace(/\/resolve\/?$/, '')
    .replace(/\/api\/?$/, '')

  const params=new URLSearchParams()
  params.set('url', url)
  if(headersStr) params.set('headers', headersStr)

  const drm=item?.drm?.clearkey
  if(drm && typeof drm==="object" && Object.keys(drm).length){
    params.set('drmKeys', JSON.stringify(drm))
  }

  return `${backendBase}/api/segment?${params.toString()}`
}

function normalizeDropboxUrl(url){
  if(!url) return url
  if(url.includes("dropbox.com")){
    url = url.replace("www.dropbox.com", "dl.dropboxusercontent.com")
    url = url.replace("dl=0", "raw=1").replace("dl=1", "raw=1")
    if(!/[?&](raw|dl)=/.test(url)) url += (url.includes("?") ? "&" : "?") + "raw=1"
  }
  return url
}

function destroyPlayers(){ try{if(dashPlayer){dashPlayer.reset();dashPlayer=null}}catch{}; try{if(hlsPlayer){hlsPlayer.destroy();hlsPlayer=null}}catch{}; video.pause(); video.removeAttribute("src"); video.load() }

function inferType(url){
  const clean=(url||"").split("#")[0].split("?")[0].toLowerCase()
  if(clean.endsWith(".mpd")) return "dash"
  if(clean.endsWith(".m3u8") || clean.endsWith(".m3u")) return "hls"
  if(clean.endsWith(".ts")) return "file"
  return "file"
}

function normalizeDrmHex(value){
  return String(value||"").trim().replace(/-/g,"").toLowerCase()
}

function parseHeadersText(text){
  const lines=String(text||"").split(/\r?\n/)
  const headers={}

  for(const rawLine of lines){
    const line=String(rawLine||"").trim()
    if(!line) continue

    const sep=line.indexOf(":")
    if(sep<0) continue

    const key=line.slice(0, sep).trim()
    const value=line.slice(sep + 1).trim()

    if(!key || !value) continue
    headers[key]=value
  }

  return Object.keys(headers).length ? headers : null
}

function headersToText(item){
  const headers=(item?.headers && typeof item.headers==="object") ? item.headers : null
  if(!headers) return ""

  return Object.entries(headers)
    .filter(([key,value])=>key && value)
    .map(([key,value])=>`${key}:${value}`)
    .join("\n")
}

function parseDrmKeysText(text){
  const lines=String(text||"").split(/\r?\n/)
  const keys={}

  for(const rawLine of lines){
    const line=rawLine.trim()
    if(!line) continue

    const sep=line.indexOf(":")
    if(sep<0) continue

    const kid=normalizeDrmHex(line.slice(0, sep))
    const key=normalizeDrmHex(line.slice(sep + 1))

    if(!kid || !key) continue
    keys[kid]=key
  }

  return Object.keys(keys).length ? keys : null
}

function drmKeysToText(item){
  const drm=item?.drm?.clearkey
  if(drm && typeof drm==="object"){
    return Object.entries(drm)
      .filter(([kid,key])=>kid && key)
      .map(([kid,key])=>`${kid}:${key}`)
      .join("\n")
  }

  const kid=normalizeDrmHex(item?.kid||"")
  const key=normalizeDrmHex(item?.key||"")
  return (kid && key) ? `${kid}:${key}` : ""
}

function hexToBase64Url(hex){
  const clean=String(hex||"").trim().replace(/-/g,"").toLowerCase()
  if(!clean || clean.length % 2 !== 0) return ""
  const bytes=[]
  for(let i=0;i<clean.length;i+=2){
    bytes.push(parseInt(clean.slice(i,i+2),16))
  }
  let binary=""
  for(const b of bytes) binary+=String.fromCharCode(b)
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")
}

function getDrmConfigFromItem(item){
  const drm=item?.drm?.clearkey

  if(drm && typeof drm==="object"){
    const keys={}
    for(const k in drm){
      if(!k || !drm[k]) continue
      const kidHex=normalizeDrmHex(k)
      const keyHex=normalizeDrmHex(drm[k])
      if(!kidHex || !keyHex) continue
      keys[kidHex]=keyHex
    }
    if(Object.keys(keys).length) return keys
  }

  const kidHex=normalizeDrmHex(item?.kid||"")
  const keyHex=normalizeDrmHex(item?.key||"")

  if(kidHex && keyHex){
    return { [kidHex]: keyHex }
  }

  return null
}

function hexToBytes(hex){
  const clean=String(hex||"").trim().replace(/-/g,"").toLowerCase()
  if(!clean || clean.length % 2 !== 0) return new Uint8Array()
  const out=new Uint8Array(clean.length/2)
  for(let i=0;i<clean.length;i+=2){
    out[i/2]=parseInt(clean.slice(i,i+2),16)
  }
  return out
}

function bytesToBase64Url(bytes){
  let binary=""
  for(const b of bytes) binary+=String.fromCharCode(b)
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")
}

function utf8ToUint8(str){
  return new TextEncoder().encode(String(str||""))
}

function buildClearKeyLicenseUint8(drmHexMap){
  const keys=Object.entries(drmHexMap||{})
    .filter(([kid,key])=>kid && key)
    .map(([kid,key])=>({
      kty:"oct",
      kid:hexToBase64Url(kid),
      k:hexToBase64Url(key)
    }))

  return utf8ToUint8(JSON.stringify({
    keys,
    type:"temporary"
  }))
}

let nativeClearKeyHandlerBound=false
let nativeClearKeyInstalled=false

async function installNativeClearKey(videoEl, drmHexMap, pushDashDebug){
  if(!videoEl || !drmHexMap || !Object.keys(drmHexMap).length) return

  const access=await navigator.requestMediaKeySystemAccess("org.w3.clearkey", [{
    initDataTypes:["cenc","keyids"],
    audioCapabilities:[
      { contentType:'audio/mp4; codecs="mp4a.40.2"' }
    ],
    videoCapabilities:[
      { contentType:'video/mp4; codecs="avc1.42E01E"' },
      { contentType:'video/mp4; codecs="avc1.4D401E"' },
      { contentType:'video/mp4; codecs="avc1.64001F"' }
    ]
  }])

  const mediaKeys=await access.createMediaKeys()
  await videoEl.setMediaKeys(mediaKeys)

  nativeClearKeyInstalled=true

  if(nativeClearKeyHandlerBound) return
  nativeClearKeyHandlerBound=true

  videoEl.addEventListener("encrypted", async (event)=>{
    try{
      if(!nativeClearKeyInstalled) return

      const mediaKeysNow=videoEl.mediaKeys
      if(!mediaKeysNow) return

      const session=mediaKeysNow.createSession("temporary")
      const license=buildClearKeyLicenseUint8(drmHexMap)

      session.addEventListener("message", async ()=>{
        await session.update(license)
        if(pushDashDebug) pushDashDebug("NATIVE CLEARKEY: session.update() OK")
      }, { once:true })

      await session.generateRequest(event.initDataType, event.initData)
      if(pushDashDebug) pushDashDebug(`NATIVE CLEARKEY: generateRequest(${event.initDataType}) OK`)
    }catch(err){
      if(pushDashDebug) pushDashDebug(`NATIVE CLEARKEY ERROR:\n${err?.message || err}`)
      try{ console.error(err) }catch{}
    }
  })
}

function showControlsTemporarily(){ if(!playerWrap) return; playerWrap.classList.remove('controls-hidden'); if(controlsHideTimer) clearTimeout(controlsHideTimer); if(video.classList.contains('hidden') || video.paused) return; controlsHideTimer=setTimeout(()=>playerWrap.classList.add('controls-hidden'), 2200) }
function keepControlsVisible(){ if(!playerWrap) return; if(controlsHideTimer) clearTimeout(controlsHideTimer); playerWrap.classList.remove('controls-hidden') }

async function playUrl(url,title,item=null){
  hideYoutubeFrame()
  destroyPlayers()
  showPlayerLoaded()
  keepControlsVisible()
  playerSection.scrollIntoView({behavior:"smooth", block:"start"})
  nowPlayingEl.textContent=title||"Reproduciendo"
  currentPlayableTitle=title||"Reproduciendo"

  try{
    const type=inferType(url)
    const drm=getDrmConfigFromItem(item)
    let playbackUrl=url

    const explicitProxyHeaders=getProxyHeadersFromItem(item, { includeImplicit:false })

    const shouldProxyDash =
      type==="dash" &&
      (
        !!drm ||
        Object.keys(explicitProxyHeaders).length>0
      )

    if(shouldProxyDash){
      playbackUrl=buildBackendMediaProxyUrl(url, item)
      setDebug(`Reproduciendo MPD vía proxy:\n${playbackUrl}`)
    }else{
      setDebug(`Reproduciendo directo:\n${url}`)
    }

        if(type==="dash"){
      dashPlayer=dashjs.MediaPlayer().create()

      const dashProxyHeaders=getProxyHeadersFromItem(item, { includeImplicit:true })
      const originalDashBase=new URL(url)
      const dashDebugLines=[]
      const pushDashDebug=(msg)=>{
        const line=String(msg||"").trim()
        if(!line) return
        dashDebugLines.push(line)
        setDebug(dashDebugLines.join("\n"))
        try{ console.log(line) }catch{}
      }

      dashPlayer.extend("RequestModifier", function(){
        return {
          modifyRequestURL: function(requestUrl){
            const raw=String(requestUrl||"").trim()
            if(!raw) return raw

            try{ console.log("[modifyRequestURL][in]", raw) }catch{}

            if(/^blob:/i.test(raw)) return raw
            if(/^data:/i.test(raw)) return raw

            if(/^https?:\/\/localhost(?::\d+)?\/api\/(?:segment|m3u8)\b/i.test(raw)) {
              try{ console.log("[modifyRequestURL][skip-proxy]", raw) }catch{}
              return raw
            }
            if(/^https?:\/\/127\.0\.0\.1(?::\d+)?\/api\/(?:segment|m3u8)\b/i.test(raw)) {
              try{ console.log("[modifyRequestURL][skip-proxy]", raw) }catch{}
              return raw
            }
            if(/\/api\/(?:segment|m3u8)\b/i.test(raw)) {
              try{ console.log("[modifyRequestURL][skip-proxy]", raw) }catch{}
              return raw
            }

            let fixedUrl=raw

            if(/^https?:\/\/localhost(?::\d+)?\/api\/(?!segment\b|m3u8\b|resolve\b|fetch-text\b)/i.test(raw) ||
               /^https?:\/\/127\.0\.0\.1(?::\d+)?\/api\/(?!segment\b|m3u8\b|resolve\b|fetch-text\b)/i.test(raw)){
              const localPath=raw.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/api\//i, "")
              fixedUrl=new URL(localPath, originalDashBase).toString()
            }
            else if(/^\/api\/(?!segment\b|m3u8\b|resolve\b|fetch-text\b)/i.test(raw)){
              const localPath=raw.replace(/^\/api\//i, "")
              fixedUrl=new URL(localPath, originalDashBase).toString()
            }

            const proxied=buildBackendMediaProxyUrl(fixedUrl, item, dashProxyHeaders)

            try{
              console.log("[modifyRequestURL][out]", {
                raw,
                fixedUrl,
                proxied
              })
            }catch{}

            pushDashDebug(`REQ URL:\n${raw}\n=>\n${proxied}`)
            return proxied
          },
          modifyRequestHeader: function(xhr){
            return xhr
          }
        }
      }, true)

      const dashEvents=dashjs.MediaPlayer.events

      dashPlayer.on(dashEvents.ERROR, (e)=>{
        pushDashDebug(`DASH ERROR:\n${JSON.stringify(e, null, 2)}`)
      })

      if(dashEvents.PLAYBACK_ERROR){
        dashPlayer.on(dashEvents.PLAYBACK_ERROR, (e)=>{
          pushDashDebug(`PLAYBACK ERROR:\n${JSON.stringify(e, null, 2)}`)
        })
      }

      if(dashEvents.KEY_ERROR){
        dashPlayer.on(dashEvents.KEY_ERROR, (e)=>{
          pushDashDebug(`KEY ERROR:\n${JSON.stringify(e, null, 2)}`)
        })
      }

      if(dashEvents.MANIFEST_LOADED){
        dashPlayer.on(dashEvents.MANIFEST_LOADED, (e)=>{
          pushDashDebug(`MANIFEST LOADED:\n${JSON.stringify({
            type:e?.type||"",
            url:e?.data?.url||playbackUrl
          }, null, 2)}`)
        })
      }

      const kickDashPlayback = (reason="")=>{
        try{
          if(audioCtx && audioCtx.state === "suspended"){
            audioCtx.resume().catch(()=>{})
          }
          video.play().catch(()=>{})
          if(reason) pushDashDebug(`DASH autoplay kick: ${reason}`)
        }catch{}
      }

      if(dashEvents.STREAM_INITIALIZED){
        dashPlayer.on(dashEvents.STREAM_INITIALIZED, ()=>{
          pushDashDebug(`STREAM INITIALIZED`)
          setTimeout(()=>kickDashPlayback("stream_initialized"), 0)
          setTimeout(()=>kickDashPlayback("stream_initialized+300ms"), 300)
          setTimeout(()=>kickDashPlayback("stream_initialized+900ms"), 900)
        })
      }

      if(dashEvents.PLAYBACK_STARTED){
        dashPlayer.on(dashEvents.PLAYBACK_STARTED, ()=>{
          pushDashDebug(`PLAYBACK STARTED`)
          setTimeout(()=>kickDashPlayback("playback_started"), 0)
        })
      }

      video.oncanplay = ()=>{
        if(dashPlayer) kickDashPlayback("canplay")
      }

      video.onwaiting = ()=>{
        if(dashPlayer) kickDashPlayback("waiting")
      }

      video.onstalled = ()=>{
        if(dashPlayer) kickDashPlayback("stalled")
      }

      if(dashEvents.FRAGMENT_LOADING_STARTED){
        dashPlayer.on(dashEvents.FRAGMENT_LOADING_STARTED, (e)=>{
          const reqUrl=e?.request?.url || e?.url || ""
          if(reqUrl){
            pushDashDebug(`FRAGMENT START:\n${reqUrl}`)
            try{
              console.log("[frag-start-full]", {
                reqUrl,
                request: e?.request || null,
                event: e || null
              })
            }catch{}
          }
        })
      }

      if(dashEvents.FRAGMENT_LOADING_COMPLETED){
        dashPlayer.on(dashEvents.FRAGMENT_LOADING_COMPLETED, (e)=>{
          const reqUrl=e?.request?.url || e?.url || ""
          if(reqUrl){
            pushDashDebug(`FRAGMENT OK:\n${reqUrl}`)
            try{
              console.log("[frag-ok-full]", {
                reqUrl,
                request: e?.request || null,
                event: e || null
              })
            }catch{}
          }
        })
      }

      dashPlayer.updateSettings({
        streaming: {
          protection: {
            ignoreEmeEncryptedEvent: true
          }
        }
      })

      if(drm){
        await installNativeClearKey(video, drm, pushDashDebug)
        pushDashDebug(`NATIVE ClearKey activado (${Object.keys(drm).length} keys)`)
        pushDashDebug(`DASH protección: ignoreEmeEncryptedEvent=ON`)
      }

      video.addEventListener("error", ()=>{
        const mediaError=video.error
        if(!mediaError) return
        pushDashDebug(`VIDEO ERROR:\ncode=${mediaError.code}\nmessage=${mediaError.message||"sin mensaje"}`)
      }, { once:false })

      dashPlayer.initialize(video, playbackUrl, false)
    }
    else if(type==="hls"){
      const hlsHeaders=getProxyHeadersFromItem(item, { includeImplicit:true })
      const hasHlsHeaders=Object.keys(hlsHeaders).length>0

      let forceHlsProxy=false
      try{
        const u=new URL(playbackUrl)
        forceHlsProxy=!!(u.username || u.password)
      }catch{}

      const shouldProxyHls=hasHlsHeaders || forceHlsProxy

      let hlsUrl=playbackUrl
      if(shouldProxyHls){
        const headersStr=Object.entries(hlsHeaders)
          .filter(([k,v])=>k&&v)
          .map(([k,v])=>`${k}:${v}`)
          .join("\n")
        const backendBase = normalizeBackendUrl(RESOLVER_CONFIG.backendUrl)
          .replace(/\/resolve\/?$/, '')
          .replace(/\/api\/?$/, '')
        const params=new URLSearchParams()
        params.set('url', playbackUrl)
        if(headersStr) params.set('headers', headersStr)
        hlsUrl=`${backendBase}/api/m3u8?${params.toString()}`
        setDebug(`Reproduciendo HLS vía proxy:\n${hlsUrl}`)
      } else {
        setDebug(`Reproduciendo HLS directo:\n${hlsUrl}`)
      }

      if(window.Hls && Hls.isSupported()){
        hlsPlayer=new Hls()

        hlsPlayer.on(Hls.Events.MANIFEST_PARSED, ()=>{
          video.play().catch(()=>{})
        })

        hlsPlayer.on(Hls.Events.LEVEL_LOADED, ()=>{
          video.play().catch(()=>{})
        })

        hlsPlayer.loadSource(hlsUrl)
        hlsPlayer.attachMedia(video)
      } else {
        video.src=hlsUrl
      }
    }
    else {
      video.src=playbackUrl
    }

    await ensureAudioBoost()

    try{
      if(audioCtx && audioCtx.state === "suspended"){
        await audioCtx.resume()
      }
    }catch{}

    video.muted = false
    applyVolume()

    if(type!=="dash" && type!=="hls"){
      video.play().catch((err)=>{
        try{
          setDebug((debugEl?.textContent ? debugEl.textContent + "\n" : "") + `PLAY ERROR:\n${err?.message || err}`)
        }catch{}
      })
    }

    const remembered=rememberToggle.checked?getProgress(url):0
    if(remembered>3){
      video.addEventListener("loadedmetadata",function seekOnce(){
        try{video.currentTime=remembered}catch{}
        video.removeEventListener("loadedmetadata",seekOnce)
      })
    }
  }catch(e){
    setDebug(String(e))
  }
}
function playYoutubeUrl(url,title){
  const embedUrl=getYoutubeEmbedUrl(url)
  if(!embedUrl){ setDebug("No se pudo convertir el enlace de YouTube."); return }
  currentPlayableTitle=title||"YouTube"; nowPlayingEl.textContent=title||"YouTube"
  if(location.protocol==="file:"){
    hideYoutubeFrame(); showPlayer(); setDebug("YouTube embebido falla en local con file://. Se abre en pestaña nueva. Si quieres verlo dentro del panel, abre la app desde http://localhost."); window.open(url, "_blank", "noopener"); return
  }
   showPlayerLoaded(); showYoutubeFrame(embedUrl); playerSection.scrollIntoView({behavior:"smooth", block:"start"}); setDebug("Reproduciendo YouTube en el panel.")
}
function jumpBy(s){ if(video.classList.contains("hidden")) return; video.currentTime=Math.max(0,Math.min(video.duration||Infinity,video.currentTime+s)) }
async function togglePlay(){
  if(video.classList.contains("hidden")) return

  // Si ya está reproduciendo pero en mute por autoplay,
  // el primer toque debe desbloquear audio, no pausar.
  if(!video.paused && video.muted){
    try{
      if(audioCtx && audioCtx.state === "suspended"){
        await audioCtx.resume()
      }
      video.muted = false
      applyVolume()
      await video.play().catch(()=>{})
    }catch{}
    return
  }

  if(video.paused){
    try{
      video.muted = false
      if(audioCtx && audioCtx.state === "suspended"){
        await audioCtx.resume()
      }
      applyVolume()
      await video.play()
    }catch{}
  } else {
    video.pause()
  }
}
function toggleFullscreen(){ if(!document.fullscreenElement)playerWrap.requestFullscreen().catch(()=>{}); else document.exitFullscreen().catch(()=>{}) }
async function ensureAudioBoost(){
  try{
    if(!audioBoostReady){
      audioCtx=new (window.AudioContext||window.webkitAudioContext)()
      sourceNode=audioCtx.createMediaElementSource(video)
      gainNode=audioCtx.createGain()
      sourceNode.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      audioBoostReady=true
    }

    if(audioCtx && audioCtx.state === "suspended"){
      await audioCtx.resume()
    }
  }catch(e){
    setDebug("Boost no disponible en este navegador.")
  }
}
function applyVolume(){ const percent=Number(volumeRange.value)||100; volumeLabel.textContent=percent+"%"; const boostAllowed=boostToggle.checked; if(percent<=100){ video.volume=percent/100; if(gainNode)gainNode.gain.value=1 } else { video.volume=1; if(gainNode)gainNode.gain.value=boostAllowed ? percent/100 : 1 } updateMuteLabel() }
function showVolumePanel(){ volumeWrap.classList.add("show") }
function hideVolumePanelSoon(){ setTimeout(()=>{ if(!volumeWrap.matches(":hover") && document.activeElement!==volumeRange){ volumeWrap.classList.remove("show") } },180) }
function updateMuteLabel(){ const effectiveMuted = video.muted || Number(volumeRange.value)===0; muteBtn.textContent = effectiveMuted ? "🔇" : "🔊" }
function updatePlayLabel(){ playPauseBtn.textContent=video.paused?"▶":"❚❚" }
function updateFullscreenLabel(){ fullscreenBtn.textContent=document.fullscreenElement?"🡼":"⛶" }
function format(s){ if(!isFinite(s))return"00:00"; s=Math.floor(s||0); const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60; if(h>0)return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0"); return String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0") }

function normalizeImportedData(raw){
  if(raw && Array.isArray(raw.groups)) return raw
  if(Array.isArray(raw)){
    return {name:"Biblioteca importada", image:"", author:"", url:"", groups:[{name:"Lista", image:"", groups:[], stations:raw.map(it=>({name:it.title||it.name||"Sin título", image:it.image||it.img||"", url:it.url||"", import:!!it.import, embed:isEmbedStation(it)}))}]}
  }
  return null
}
function extractLikelyJsonPayload(text){
  const raw=String(text||"").trim()
  if(!raw) return ""
  if(raw.startsWith("{") || raw.startsWith("[")) return raw
  const firstObject=raw.indexOf("{")
  const firstArray=raw.indexOf("[")
  let start=-1
  if(firstObject>=0 && firstArray>=0) start=Math.min(firstObject, firstArray)
  else start=Math.max(firstObject, firstArray)
  if(start<0) return raw
  const lastObject=raw.lastIndexOf("}")
  const lastArray=raw.lastIndexOf("]")
  const end=Math.max(lastObject, lastArray)
  if(end<=start) return raw
  return raw.slice(start, end+1).trim()
}
function looksLikeJsonPayload(text){
  const trimmed=extractLikelyJsonPayload(text)
  if(!trimmed) return false
  if(!(trimmed.startsWith("{") || trimmed.startsWith("["))) return false
  const parsed=safeJsonParse(trimmed)
  return parsed.ok
}
async function tryFetchText(url){
  const fixed=normalizeDropboxUrl(url)
  const attempts=[
    { url: fixed, label: "directa", mode: "cors" },
    { url: "https://api.allorigins.win/raw?url="+encodeURIComponent(fixed), label: "allorigins", mode: "cors" }
  ]

  if(RESOLVER_CONFIG.useBackend){
    const backendBase=normalizeBackendUrl(RESOLVER_CONFIG.backendUrl).replace(/\/api\/resolve$/i, "/api/fetch-text")
    attempts.push({
      url: `${backendBase}?url=${encodeURIComponent(fixed)}`,
      label: "backend",
      mode: "cors",
      isBackend: true
    })
  }

  let lastErr="No se pudo cargar"

  for(const attempt of attempts){
    try{
      const res=await fetch(attempt.url, { method:"GET", mode:attempt.mode || "cors" })
      if(!res.ok) throw new Error("HTTP "+res.status)

      let rawText=""
      if(attempt.isBackend){
        const data=await res.json()
        if(!data?.success || !data?.text) throw new Error(data?.error || "Respuesta vacía")
        rawText=data.text
      }else{
        rawText=await res.text()
      }

      const text=extractLikelyJsonPayload(rawText)
      if(!text || !text.trim()) throw new Error("Respuesta vacía")
      return text
    }catch(e){
      lastErr=`${attempt.label}: ${e?.message||e}`
    }
  }

  throw new Error(lastErr)
}
function flattenGroup(group, path){
  let items=[]
  const groups=Array.isArray(group?.groups) ? group.groups : []
  const stations=Array.isArray(group?.stations) ? group.stations : []

  for(const st of stations){
    if(isStationContainer(st)){
      const videos=Array.isArray(st.stations) ? st.stations : []
      for(const vd of videos){
        if(isPlayableLeaf(vd)){
          items.push({
            series:path[0]||"",
            season:[...path.slice(1), st?.name||"Station"].join(" / "),
            title:vd.name||vd.title||"Sin título",
            url:vd.url,
            image:vd.image||vd.img||"",
            import:!!vd.import,
            embed:isEmbedStation(vd)
          })
        }
      }
      continue
    }

    if(st && st.url){
      items.push({
        series:path[0]||"",
        season:path.slice(1).join(" / "),
        title:st.name||st.title||"Sin título",
        url:st.url,
        image:st.image||st.img||"",
        import:!!st.import,
        embed:isEmbedStation(st)
      })
    }
  }

  for(const g of groups){
    items.push(...flattenGroup(g,[...path,g?.name||"Carpeta"]))
  }

  return items
}
function collectAllStations(lib){ let items=[]; for(const g of (lib.groups||[])){ items.push(...flattenGroup(g,[g?.name||""])) } return items }
function tryMakeLibraryTitle(data, fallback="Biblioteca"){ return data?.name || data?.title || fallback }
function updateImportButtons(){
  const disabled=importInFlight || !storageReady
  if(importUrlBtn){ importUrlBtn.disabled=disabled; importUrlBtn.textContent=importInFlight ? "Cargando..." : "Cargar" }
  if(importFile){ importFile.disabled=disabled }
  if(addEntryBtn){ addEntryBtn.disabled=!storageReady }
  if(clearLibrariesBtn){ clearLibrariesBtn.disabled=!storageReady }
}
function sourceUrlFromData(data, importUrl=""){
  if(importUrl) return normalizeDropboxUrl(importUrl)
  const u=String(data?.url||"").trim()
  return /^https?:\/\//i.test(u) ? normalizeDropboxUrl(u) : ""
}
async function persistLibrariesNow(){ return await queueSaveLibraries() }

async function importFromText(text, sourceUrl=""){
  const parsed=parseLibraryText(text)
  if(!parsed.ok){ setDebug(`JSON inválido.\n${parsed.error||"Error desconocido"}`); return false }
  if(parsed.error) setDebug(parsed.error)
  const data=normalizeImportedData(parsed.data)
  if(!data){ setDebug("JSON inválido o sin groups."); return false }
  const lib={id:uuid(), title:tryMakeLibraryTitle(data), author:data.author||"", image:data.image||data.img||"", sourceUrl:sourceUrlFromData(data, sourceUrl), data}
  libraries=[...libraries, lib]
  currentLibraryId=lib.id
  browserStack=[lib.data]
  renderLibraryList(); renderBrowser()
  await persistLibrariesNow()
  setDebug(parsed.error||"Biblioteca importada.")
  return true
}
async function importFromUrl(url){
  if(importInFlight){ setDebug("Ya hay una importación en curso. Espera a que termine."); return false }
  importInFlight=true; updateImportButtons()
  try{
    const text=await tryFetchText(url)
    return await importFromText(text, url)
  }catch(e){
    setDebug("No se pudo importar desde la URL.\n"+(e.message||e))
    return false
  }finally{
    importInFlight=false
    updateImportButtons()
  }
}
async function refreshLibraryFromSource(lib){
  if(!lib?.sourceUrl){ setDebug("Esta biblioteca no tiene URL de origen."); return false }
  if(importInFlight){ setDebug("Hay otra importación en curso."); return false }
  importInFlight=true; updateImportButtons()
  try{
    const text=await tryFetchText(lib.sourceUrl)
    const parsed=parseLibraryText(text)
    if(!parsed.ok){ setDebug(`No se pudo actualizar la biblioteca.\n${parsed.error||"JSON inválido"}`); return false }
    const data=normalizeImportedData(parsed.data)
    if(!data){ setDebug("La actualización no contenía una biblioteca válida."); return false }
    const idx=libraries.findIndex(x=>x.id===lib.id)
    if(idx<0) return false
    libraries[idx]={ ...libraries[idx], title:tryMakeLibraryTitle(data, libraries[idx].title||"Biblioteca"), author:data.author||libraries[idx].author||"", image:data.image||data.img||libraries[idx].image||"", data }
    if(currentLibraryId===lib.id) browserStack=[libraries[idx].data]
    renderLibraryList(); renderBrowser()
    await persistLibrariesNow()
    setDebug(parsed.error||"Biblioteca actualizada.")
    return true
  }catch(e){
    setDebug("No se pudo actualizar la biblioteca.\n"+(e.message||e))
    return false
  }finally{
    importInFlight=false
    updateImportButtons()
  }
}

function cardImage(image, fallback){ const img = image && /^https?:\/\//i.test(image) ? image : ""; if(img){ return '<div class="card-image"><img src="'+escapeHtml(img)+'" loading="lazy" onerror="this.parentNode.innerHTML=\'<div class=&quot;card-fallback&quot;>'+fallback+'</div>\'"></div>' } return '<div class="card-image"><div class="card-fallback">'+fallback+'</div></div>' }
function closeAllLibraryMenus(except=null){
  document.querySelectorAll('.card-menu').forEach(menu=>{ if(menu!==except) menu.removeAttribute('open') })
}
function renderLibraryList(){
  libraryList.innerHTML=""
  if(!libraries.length){ libraryList.innerHTML='<div class="panel">No hay bibliotecas cargadas.</div>'; return }
  for(const lib of libraries){
    const count=collectAllStations(lib.data).length
    const el=document.createElement("div")
    el.className="library-card"+(lib.id===currentLibraryId?" active":"")
    const thumb = lib.image && /^https?:\/\//i.test(lib.image) ? '<img src="'+escapeHtml(lib.image)+'" loading="lazy">' : '📚'
    const authorLine=lib.author ? '<div class="library-author">by: '+escapeHtml(lib.author)+'</div>' : ''
    el.innerHTML='<div class="library-thumb">'+thumb+'</div><div class="library-meta"><div class="library-title">'+escapeHtml(lib.title)+'</div>'+authorLine+'<div class="library-sub">'+count+' vídeos'+(lib.sourceUrl?' · auto':'')+'</div></div><div class="library-actions"><details class="card-menu"><summary class="menu-btn" type="button">⋮</summary><div class="menu-pop"><button class="btn small refresh" type="button">Actualizar</button><button class="btn small export" type="button">Exportar</button><button class="btn small del" type="button">Borrar</button></div></details></div>'
    el.addEventListener('click', ()=>openLibrary(lib.id))
    const menu=el.querySelector('.card-menu')
    const summary=el.querySelector('.menu-btn')
    const pop=el.querySelector('.menu-pop')
    ;[menu, summary, pop].forEach(node=>{
      if(!node) return
      node.addEventListener('click', e=>e.stopPropagation())
      node.addEventListener('mousedown', e=>e.stopPropagation())
      node.addEventListener('pointerdown', e=>e.stopPropagation())
    })
    if(summary){
      summary.addEventListener('click', ()=>setTimeout(()=>closeAllLibraryMenus(menu), 0))
    }
    el.querySelector(".export").addEventListener('click',(e)=>{ e.stopPropagation(); const blob=new Blob([JSON.stringify(lib.data,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=(lib.title||"biblioteca")+".json"; a.click(); URL.revokeObjectURL(a.href) })
    el.querySelector(".refresh").addEventListener('click',async (e)=>{ e.stopPropagation(); await refreshLibraryFromSource(lib) })
    el.querySelector(".del").addEventListener('click',async (e)=>{ e.stopPropagation(); libraries=libraries.filter(x=>x.id!==lib.id); if(currentLibraryId===lib.id){ currentLibraryId=libraries[0]?.id||null; browserStack=[] } renderLibraryList(); renderBrowser(); await persistLibrariesNow(); setDebug("Biblioteca borrada.") })
    libraryList.appendChild(el)
  }
}
function getCurrentNode(){ return browserStack[browserStack.length-1] || null }
function getNodeChildren(node){
  if(isStationContainer(node)){
    const videos=Array.isArray(node?.stations)
      ? node.stations.map(v => ({ kind:"video", data:v }))
      : []
    return videos
  }

  const groups=Array.isArray(node?.groups)
    ? node.groups.map(g => ({ kind:"group", data:g }))
    : []

  const stations=Array.isArray(node?.stations)
    ? node.stations.map(s => ({
        kind: (s && typeof s.url==="string" && s.url.trim()!=="") ? "video" : "station",
        data: s
      }))
    : []

  return [...groups, ...stations]
}
function fillEditorFromItem(item, kind, parentNode){
  const realKind=detectEditorKindFromItem(item, kind)

  editingItemRef=item
  editingParentNode=parentNode
  editingKind=realKind

  if(realKind==="group"){
    setEntryType("group")
    entryNameInput.value=item?.name||""
    entryImageInput.value=item?.image||item?.img||""
    entryInfoInput.value=item?.info||""
    entryUrlInput.value=""
    entryRefererInput.value=""
    entryImportToggle.checked=false
    entryEmbedToggle.checked=false
  }else if(realKind==="station"){
    setEntryType("station")
    entryNameInput.value=item?.name||item?.title||""
    entryImageInput.value=item?.image||item?.img||""
    entryInfoInput.value=item?.info||""
    entryUrlInput.value=""
    entryRefererInput.value=""
    entryImportToggle.checked=false
    entryEmbedToggle.checked=false
  }else{
    setEntryType("video")
    entryNameInput.value=item?.name||item?.title||""
    entryImageInput.value=item?.image||item?.img||""
    entryInfoInput.value=item?.info||""
    entryUrlInput.value=item?.url||""
    entryRefererInput.value=item?.referer||""
    entryUserAgentInput.value=item?.userAgent||item?.headers?.["user-agent"]||item?.headers?.["User-Agent"]||""
    entryHeadersInput.value=headersToText(item)
    entryDrmKeysInput.value=drmKeysToText(item)
    entryImportToggle.checked=!!item?.import
    entryEmbedToggle.checked=isEmbedStation(item)
  }

  addEntryBtn.textContent="Guardar cambios"
  scrollBrowserToTop()
}

function clearEditorForm(){
  editingItemRef=null
  editingParentNode=null
  editingKind=""
  entryNameInput.value=""
  entryImageInput.value=""
  entryInfoInput.value=""
  entryUrlInput.value=""
  entryRefererInput.value=""
  entryUserAgentInput.value=""
  entryHeadersInput.value=""
  entryDrmKeysInput.value=""
  entryImportToggle.checked=false
  entryEmbedToggle.checked=false
  addEntryBtn.textContent="Añadir aquí"
}

function moveArrayItem(arr, fromIndex, toIndex){
  if(!Array.isArray(arr)) return false
  if(fromIndex<0 || toIndex<0 || fromIndex>=arr.length || toIndex>=arr.length) return false
  const [moved]=arr.splice(fromIndex,1)
  arr.splice(toIndex,0,moved)
  return true
}

function moveBrowserItem(item, kind, direction, parentNode){
  if(!parentNode) return

  let arr=null
  if(kind==="group") arr=parentNode.groups
  else if(kind==="station" || kind==="video") arr=parentNode.stations

  if(!Array.isArray(arr)) return
  const idx=arr.indexOf(item)
  if(idx<0) return
  const next=direction==="left" ? idx-1 : idx+1
  if(!moveArrayItem(arr, idx, next)) return
  renderLibraryList()
  renderBrowser()
  saveLibrariesSoon()
}

function deleteBrowserItem(item, kind, parentNode){
  if(!parentNode) return

  let arr=null
  if(kind==="group") arr=parentNode.groups
  else if(kind==="station" || kind==="video") arr=parentNode.stations

  if(!Array.isArray(arr)) return
  const idx=arr.indexOf(item)
  if(idx<0) return
  arr.splice(idx,1)
  renderLibraryList()
  renderBrowser()
  saveLibrariesSoon()
}
function getBrowserRootNodes(){ return libraries.map(lib => ({ kind:"library", data:lib })) }
function clearBrowserSearch(){
  browserSearchTerm=""
  if(searchInput) searchInput.value=""
  if(clearSearchBtn) clearSearchBtn.classList.add("hidden")
}

function syncSearchUi(){
  if(!clearSearchBtn) return
  clearSearchBtn.classList.toggle("hidden", !String(browserSearchTerm||"").trim())
}
function normalizeSearchText(value){
  return String(value||"")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function itemSearchName(item){
  return normalizeSearchText(item?.name || item?.title || "")
}

function makePathLabel(parts){
  return parts.filter(Boolean).join(" / ")
}

function collectNodeSearchResults(startNode, term, baseStack=[]){
  const results=[]
  const normalizedTerm=normalizeSearchText(term)
  if(!startNode || !normalizedTerm) return results

  function visitNode(node, stack, pathParts){
    if(!node) return

    const groups=Array.isArray(node.groups) ? node.groups : []
    const stations=Array.isArray(node.stations) ? node.stations : []

    for(const group of groups){
      const groupName=group?.name || "Group"
      const nextStack=[...stack, group]
      const nextPath=[...pathParts, groupName]

      if(itemSearchName(group).includes(normalizedTerm)){
        results.push({
          kind:"group",
          data:group,
          stack:nextStack,
          pathLabel:makePathLabel(nextPath),
          matchLabel:groupName
        })
      }

      visitNode(group, nextStack, nextPath)
    }

    for(const station of stations){
      const stationName=station?.name || "Station"
      const stationStack=[...stack, station]
      const stationPath=[...pathParts, stationName]
      const stationIsContainer=isStationContainer(station)

      if(itemSearchName(station).includes(normalizedTerm)){
        results.push({
          kind: stationIsContainer ? "station" : "video",
          data:station,
          stack: stationIsContainer ? stationStack : [...stack],
          pathLabel:makePathLabel(stationPath),
          matchLabel:stationName
        })
      }

      if(stationIsContainer){
        const videos=Array.isArray(station.stations) ? station.stations : []
        for(const videoItem of videos){
          const videoName=videoItem?.name || videoItem?.title || "Vídeo"
          if(itemSearchName(videoItem).includes(normalizedTerm)){
            results.push({
              kind:"video",
              data:videoItem,
              stack:[...stationStack],
              pathLabel:makePathLabel([...stationPath, videoName]),
              matchLabel:videoName
            })
          }
        }
      }
    }
  }

  visitNode(startNode, baseStack, [])
  return results
}

function openSearchResult(result){
  if(!result) return

  browserStack=Array.isArray(result.stack) ? [...result.stack] : browserStack
  clearBrowserSearch()
  updateNowPlayingFromContext()
  renderBrowser()
  scrollBrowserToTop()

  if(result.kind==="video"){
    openStation(result.data)
  }
}
function renderBreadcrumbs(){
  breadcrumbs.innerHTML=""
  const root=document.createElement("span")
  root.className="crumb"
  root.textContent="Bibliotecas"
  root.onclick=()=>{
    browserStack=[]
    clearBrowserSearch()
    nowPlayingEl.textContent="Explorador"
    setCurrentInfo("")
    renderBrowser()
  }
  breadcrumbs.appendChild(root)
  if(isBrowserAtLibrariesRoot()) return
  const lib=currentLibrary()
  browserStack.forEach((node, idx) => {
    const span=document.createElement("span")
    span.className="crumb"
    span.textContent = idx===0 ? (lib?.title || "Raíz") : (node?.name || "Carpeta")
    span.onclick=()=>{
      browserStack=browserStack.slice(0, idx+1)
      clearBrowserSearch()
      updateNowPlayingFromContext()
      renderBrowser()
    }
    breadcrumbs.appendChild(span)
  })
}
async function openStation(item, options={}) {
  if (item.import) { await importFromUrl(item.url); return }

  const originalUrl = (item?.url || "").trim()
  if (!originalUrl) { showPlayerEmpty("Vídeo no válido"); setDebug("No hay URL para reproducir."); return }
  if (/^ace:\/\//i.test(originalUrl)) {
    showPlayerEmpty("Formato AceStream no soportado aquí")
    setDebug("AceStream no está soportado de forma nativa aquí. Solo funcionará si conviertes ese canal a una URL http(s) reproducible, por ejemplo mediante un engine/proxy externo que exponga un stream web.")
    return
  }

  const sameItem = isCurrentItem(item)
  if (sameItem && !options.force) {
    setDebug("Relanzando el mismo vídeo...")
  }

  currentItemKey = makeItemKey(item)

  hideManualResolve()
  hideYoutubeFrame()
  destroyPlayers()
  showPlayerEmpty("Cargando o resolviendo vídeo...")

  nowPlayingEl.textContent = item?.name || item?.title || "Reproduciendo"
  setCurrentInfo(findNearestInfoForItem(item))
  renderBrowser()
  setDebug(`URL recibida al pinchar:\n${originalUrl}`)

  if (isYoutubeUrl(originalUrl)) {
    setLinkStatus(originalUrl, "ok")
    renderBrowser()
    playYoutubeUrl(originalUrl, item?.name || item?.title || "YouTube")
    return
  }

  if (isEmbedStation(item)) {
    const resolved = await resolveStreamUrlManual(originalUrl, item?.referer || "")
    if (!resolved) {
      showManualResolve(originalUrl, item?.name || item?.title || "", item?.referer || "")
      setDebug(`URL recibida al pinchar:\n${originalUrl}\n\nEste enlace está marcado como embed.\nSe abrió la resolución manual para captcha / continue.`)
      return
    }
    setLinkStatus(originalUrl, "ok")
    renderBrowser()
     playUrl(resolved, item?.name || item?.title || "", item)
    return
  }

  let urlToPlay = originalUrl

  if (needsResolution(originalUrl)) {
    setDebug(`🔍 Resolviendo enlace de streaming...`)
    urlToPlay = await resolveStreamUrl(originalUrl, item?.referer || "")
  }

  if (!urlToPlay) {
    setLinkStatus(originalUrl, "dead")
    renderBrowser()
    showPlayerEmpty("Vídeo no válido o enlace muerto")
    showManualResolve(originalUrl, item?.name || item?.title || "", item?.referer || "")
    setDebug("No se pudo obtener una URL reproducible.")
    return
  }

  if (urlToPlay === originalUrl && needsResolution(originalUrl)) {
    setLinkStatus(originalUrl, "dead")
    renderBrowser()
    showPlayerEmpty("No se encontró vídeo reproducible")
    showManualResolve(originalUrl, item?.name || item?.title || "", item?.referer || "")
    setDebug("No se pudo resolver la página a un vídeo o m3u8 reproducible.")
    return
  }

  setLinkStatus(originalUrl, "ok")
  renderBrowser()
  playUrl(urlToPlay, item?.name || item?.title || "", item)
}
function renderBrowser(){
  renderBreadcrumbs()
  const lib=currentLibrary()
  const node=getCurrentNode()
  const rawChildren=getNodeChildren(node)
  const term=normalizeSearchText(browserSearchTerm)
  browserGrid.innerHTML=""

  if(refreshLibraryBtn){
    refreshLibraryBtn.classList.toggle("hidden", !(lib && lib.sourceUrl && !isBrowserAtLibrariesRoot()))
  }

  if(isBrowserAtLibrariesRoot()){
    libraryName.textContent = "Bibliotecas"
    backFolderBtn.disabled = true

    const rootNodes = term
      ? getBrowserRootNodes().filter(entry => normalizeSearchText(entry.data?.title).includes(term))
      : getBrowserRootNodes()

    if(!rootNodes.length){
      browserGrid.innerHTML='<div class="panel search-empty">No hay coincidencias.</div>'
      return
    }

    for(const entry of rootNodes){
      const item=entry.data
      const count=collectAllStations(item.data).length
      const card=document.createElement('div')
      card.className='card'+(item.id===currentLibraryId?' active-item':'')
      card.innerHTML =
        cardImage(item.image || '', '📚') +
        '<div class="card-body">'+
          (item.id===currentLibraryId?'<div class="card-current-dot"></div>':'')+
          '<div class="card-type">Biblioteca</div>'+
          '<div class="card-title">'+escapeHtml(item.title || 'Sin título')+'</div>'+
          '<div class="card-meta">'+escapeHtml(count+' vídeos'+(item.sourceUrl?' · auto':''))+'</div>'+
          '<details class="card-menu browser-item-menu"><summary class="menu-btn" type="button">⋮</summary><div class="menu-pop"><button class="btn small lib-left" type="button">Mover izda</button><button class="btn small lib-right" type="button">Mover dcha</button></div></details>'+
        '</div>'

      card.addEventListener('click', ()=>{
        openLibrary(item.id)
        scrollBrowserToTop()
      })

      const menu=card.querySelector('.card-menu')
      const summary=card.querySelector('.menu-btn')
      const pop=card.querySelector('.menu-pop')
      ;[menu, summary, pop].forEach(node=>{
        if(!node) return
        node.addEventListener('click', e=>e.stopPropagation())
        node.addEventListener('mousedown', e=>e.stopPropagation())
        node.addEventListener('pointerdown', e=>e.stopPropagation())
      })
      if(summary) summary.addEventListener('click', ()=>setTimeout(()=>closeAllLibraryMenus(menu), 0))

      card.querySelector(".lib-left")?.addEventListener("click",(e)=>{
        e.stopPropagation()
        const idx=libraries.findIndex(x=>x.id===item.id)
        if(moveArrayItem(libraries, idx, idx-1)){
          renderLibraryList()
          renderBrowser()
          saveLibrariesSoon()
        }
      })

      card.querySelector(".lib-right")?.addEventListener("click",(e)=>{
        e.stopPropagation()
        const idx=libraries.findIndex(x=>x.id===item.id)
        if(moveArrayItem(libraries, idx, idx+1)){
          renderLibraryList()
          renderBrowser()
          saveLibrariesSoon()
        }
      })

      browserGrid.appendChild(card)
    }
    return
  }

  libraryName.textContent = lib ? (lib.title || "Biblioteca cargada") : "Sin biblioteca cargada"
  backFolderBtn.disabled = false

  if(!lib){
    browserGrid.innerHTML='<div class="panel">Carga una biblioteca JSON para navegar.</div>'
    return
  }

  if(term){
    const baseStack = Array.isArray(browserStack) && browserStack.length ? [...browserStack] : [lib.data]
    const startNode = getCurrentNode() || lib.data
    const results=collectNodeSearchResults(startNode, term, baseStack)

    if(!results.length){
      browserGrid.innerHTML='<div class="panel search-empty">No hay coincidencias para esa búsqueda.</div>'
      return
    }

    for(const result of results){
      const item=result.data
      const isGroup=result.kind==="group"
      const isStation=result.kind==="station"
      const isVideo=result.kind==="video"
      const stationContainer=isStation && isStationContainer(item)

      const fallback=isGroup ? "📁" : (stationContainer ? "🗂" : (item.import ? "🧩" : "🎬"))
      const statusDot=isVideo && !item.import ? getLinkStatusDot(item.url) : ""

      let meta=result.pathLabel || ""
      if(isVideo && item.import) meta = (meta ? meta + " · " : "") + "Importa otra lista"
      else if(isVideo && isEmbedStation(item)) meta = (meta ? meta + " · " : "") + "Embed / captcha"
      else if(isVideo && isYoutubeUrl(item.url)) meta = (meta ? meta + " · " : "") + "YouTube"

      const card=document.createElement("div")
      card.className="card"+(isCurrentItem(item)?" active-item":"")
      card.innerHTML =
        cardImage(item.image || item.img || "", fallback) +
        '<div class="card-body">'+
          (isCurrentItem(item)?'<div class="card-current-dot"></div>':'')+
          statusDot+
          '<div class="card-type">'+(isGroup ? 'Carpeta' : (stationContainer ? 'Carpeta' : 'Vídeo'))+'</div>'+
          '<div class="card-title">'+escapeHtml(item.name || item.title || "Sin título")+'</div>'+
          '<div class="card-meta">'+escapeHtml(meta)+'</div>'+
        '</div>'

      card.addEventListener("click", async ()=>{
        if(result.kind==="video"){
          browserStack=[...result.stack]
          clearBrowserSearch()
          syncInfoFromCurrentContext(item)
          renderBrowser()
          scrollBrowserToTop()
          await openStation(item)
        }else{
          openSearchResult(result)
        }
      })

      browserGrid.appendChild(card)
    }
    return
  }

  if(!rawChildren.length){
    browserGrid.innerHTML='<div class="panel">Esta carpeta está vacía.</div>'
    return
  }

  for(const child of rawChildren){
    const item=child.data
    const isGroup=child.kind==="group"
    const isStation=child.kind==="station"

    const stationContainer=isStationContainer(item)
    const isVideo=child.kind==="video" || (child.kind==="station" && !stationContainer)
    const editorKind=isGroup ? "group" : (stationContainer ? "station" : "video")

    const fallback=isGroup ? "📁" : (stationContainer ? "🗂" : (item.import ? "🧩" : "🎬"))
    const groupCount=Array.isArray(item.groups)?item.groups.length:0
    const stationCount=Array.isArray(item.stations)?item.stations.length:0
    const videoCount=stationContainer && Array.isArray(item.stations)?item.stations.length:0

    let meta=""
    if(isGroup){
      meta=[groupCount?groupCount+" carpetas":"", stationCount?stationCount+" vídeos":""].filter(Boolean).join(" · ")
    }else if(stationContainer){
      meta=videoCount+" vídeos"
    }else{
      meta=item.import ? "Importa otra lista" : (isEmbedStation(item) ? "Embed / captcha" : (isYoutubeUrl(item.url) ? "YouTube" : ""))
    }

    const statusDot=isVideo && !item.import ? getLinkStatusDot(item.url) : ""

    const card=document.createElement("div")
    card.className="card"+(isCurrentItem(item)?" active-item":"")
    card.innerHTML =
      cardImage(item.image || item.img || "", fallback) +
      '<div class="card-body">'+
        (isCurrentItem(item)?'<div class="card-current-dot"></div>':'')+
        statusDot+
        '<div class="card-type">'+
          (isGroup ? 'Carpeta' : (stationContainer ? 'Carpeta' : (item.import ? 'Lista' : 'Vídeo')))+
        '</div>'+
        '<div class="card-title">'+escapeHtml(item.name || item.title || "Sin título")+'</div>'+
        '<div class="card-meta">'+escapeHtml(meta)+'</div>'+
        (item.import?'<div class="card-badge">IMPORT</div>':'')+
        (isEmbedStation(item)?'<div class="card-badge">EMBED</div>':'')+
        '<details class="card-menu browser-item-menu"><summary class="menu-btn" type="button">⋮</summary><div class="menu-pop"><button class="btn small move-left" type="button">Mover izda</button><button class="btn small move-right" type="button">Mover dcha</button><button class="btn small edit-item" type="button">Editar</button><button class="btn small del-item" type="button">Borrar</button></div></details>'+
      '</div>'

    card.onclick=async ()=>{
      if(isGroup || stationContainer){
  browserStack.push(item)

  updateNowPlayingFromContext()

  renderBrowser()
  scrollBrowserToTop()
}else{
        await openStation(item)
      }
    }

    const menu=card.querySelector('.card-menu')
    const summary=card.querySelector('.menu-btn')
    const pop=card.querySelector('.menu-pop')
    ;[menu, summary, pop].forEach(node=>{
      if(!node) return
      node.addEventListener('click', e=>e.stopPropagation())
      node.addEventListener('mousedown', e=>e.stopPropagation())
      node.addEventListener('pointerdown', e=>e.stopPropagation())
    })
    if(summary) summary.addEventListener('click', ()=>setTimeout(()=>closeAllLibraryMenus(menu), 0))

    card.querySelector(".move-left")?.addEventListener("click",(e)=>{
      e.stopPropagation()
      moveBrowserItem(item, child.kind, "left", node)
    })
    card.querySelector(".move-right")?.addEventListener("click",(e)=>{
      e.stopPropagation()
      moveBrowserItem(item, child.kind, "right", node)
    })
    card.querySelector(".edit-item")?.addEventListener("click",(e)=>{
      e.stopPropagation()
      fillEditorFromItem(item, editorKind, node)
    })
    card.querySelector(".del-item")?.addEventListener("click",(e)=>{
      e.stopPropagation()
      deleteBrowserItem(item, child.kind, node)
    })

    browserGrid.appendChild(card)
  }
}
async function addEntryAtCurrentNode(){
  const lib=currentLibrary(), node=getCurrentNode()
  if(!lib || !node){ setDebug("No hay biblioteca actual."); return }

  const name=entryNameInput.value.trim()
  const image=entryImageInput.value.trim()
  const info=entryInfoInput.value.trim()
  const url=entryUrlInput.value.trim()
  const referer=entryRefererInput.value.trim()
  const userAgent=entryUserAgentInput.value.trim()
  const extraHeaders=parseHeadersText(entryHeadersInput.value)
  const drmKeys=parseDrmKeysText(entryDrmKeysInput.value)

  if(!name){ setDebug("Pon un nombre."); return }

  if(editingItemRef && editingParentNode){
    if(editingKind==="group"){
      editingItemRef.name=name
      editingItemRef.image=image

      if(!Array.isArray(editingItemRef.groups)) editingItemRef.groups=[]
      delete editingItemRef.stations

      if(info) editingItemRef.info=info
      else delete editingItemRef.info

    }else if(editingKind==="station"){
      editingItemRef.name=name
      editingItemRef.image=image

      if(!Array.isArray(editingItemRef.stations)) editingItemRef.stations=[]
      delete editingItemRef.groups

      if(info) editingItemRef.info=info
      else delete editingItemRef.info

    }else{
      const previousUrl=String(editingItemRef.url||"").trim()

      editingItemRef.name=name
      editingItemRef.image=image
      editingItemRef.url=url

      if(entryImportToggle.checked) editingItemRef.import=true
      else delete editingItemRef.import

      if(entryEmbedToggle.checked) editingItemRef.embed=true
      else delete editingItemRef.embed

      if(info) editingItemRef.info=info
      else delete editingItemRef.info

      if(referer) editingItemRef.referer=referer
      else delete editingItemRef.referer

      if(userAgent) editingItemRef.userAgent=userAgent
      else delete editingItemRef.userAgent

      const cleanHeaders={ ...(extraHeaders||{}) }

      if(Object.keys(cleanHeaders).length) editingItemRef.headers=cleanHeaders
      else delete editingItemRef.headers

      if(drmKeys){
        editingItemRef.drm={ clearkey: drmKeys }

        const drmEntries=Object.entries(drmKeys)
        if(drmEntries.length===1){
          editingItemRef.kid=drmEntries[0][0]
          editingItemRef.key=drmEntries[0][1]
        }else{
          delete editingItemRef.kid
          delete editingItemRef.key
        }
      }else{
        delete editingItemRef.drm
        delete editingItemRef.kid
        delete editingItemRef.key
      }

      if(needsResolution(url)) editingItemRef.isHost=true
      else delete editingItemRef.isHost

      delete editingItemRef.groups
      delete editingItemRef.stations

      if(previousUrl!==url){
        clearLinkStatus(previousUrl)
        clearResolveCache(previousUrl)
        clearLinkStatus(url)
        clearResolveCache(url)
      }
    }

    renderLibraryList()
    renderBrowser()
    clearEditorForm()
    setDebug("Elemento actualizado.")
    saveLibrariesSoon()
    return
  }

  if(newEntryType==="group"){
    if(isStationContainer(node)){ setDebug("Dentro de una station solo puedes crear vídeos."); return }
    if(!Array.isArray(node.groups)) node.groups=[]

    const newGroup={name, image, groups:[]}
    if(info) newGroup.info=info

    node.groups.push(newGroup)

  }else if(newEntryType==="station"){
    if(isStationContainer(node)){ setDebug("Dentro de una station solo puedes crear vídeos."); return }
    if(!Array.isArray(node.stations)) node.stations=[]

    const newStation={name, image, stations:[]}
    if(info) newStation.info=info

    node.stations.push(newStation)

  }else{
    if(!url){ setDebug("Pon la URL."); return }

    const newVideo={ name, image, url }

        if(entryImportToggle.checked) newVideo.import=true
    if(entryEmbedToggle.checked) newVideo.embed=true
    if(info) newVideo.info=info
    if(referer) newVideo.referer=referer
    if(userAgent) newVideo.userAgent=userAgent

    const cleanHeaders={ ...(extraHeaders||{}) }
    if(Object.keys(cleanHeaders).length) newVideo.headers=cleanHeaders

    if(drmKeys){
      newVideo.drm={ clearkey: drmKeys }

      const drmEntries=Object.entries(drmKeys)
      if(drmEntries.length===1){
        newVideo.kid=drmEntries[0][0]
        newVideo.key=drmEntries[0][1]
      }
    }

    if(needsResolution(url)) newVideo.isHost=true

    if(isStationContainer(node)){
      if(!Array.isArray(node.stations)) node.stations=[]
      clearLinkStatus(url)
      clearResolveCache(url)
      node.stations.push(newVideo)
    }else{
      setDebug("Los vídeos se crean dentro de una station.")
      return
    }
  }

  renderLibraryList()
  renderBrowser()
  clearEditorForm()
  setDebug("Añadido.")
  saveLibrariesSoon()
}
function setEntryType(type){
  newEntryType=type
  typeGroupBtn.classList.toggle("active-toggle", type==="group")
  typeStationBtn.classList.toggle("active-toggle", type==="station")
  typeVideoBtn.classList.toggle("active-toggle", type==="video")
  videoFields.style.display = type==="video" ? "" : "none"
}
function saveResolverConfig(){
  RESOLVER_CONFIG.backendUrl=normalizeBackendUrl(RESOLVER_CONFIG.backendUrl)
  localStorage.setItem(RESOLVER_KEY, JSON.stringify({
    useBackend: RESOLVER_CONFIG.useBackend,
    backendUrl: RESOLVER_CONFIG.backendUrl
  }))
}
function loadResolverConfig(){ try{ return JSON.parse(localStorage.getItem(RESOLVER_KEY)||"null") }catch{return null} }

on(importFile,"change",async (e)=>{ const file=e.target.files?.[0]; if(!file)return; if(importInFlight){ setDebug("Ya hay una importación en curso.\nEspera a que termine antes de cargar otra lista."); e.target.value=""; return } importInFlight=true; updateImportButtons(); try{ const text=await file.text(); await importFromText(text, "") } finally { importInFlight=false; updateImportButtons(); e.target.value="" } })
on(importUrlBtn,"click",async ()=>{ const url=importUrlInput.value.trim(); if(!url) return; await importFromUrl(url) })
on(exportCurrentBtn,"click",()=>{ const lib=currentLibrary(); if(!lib){setDebug("No hay biblioteca actual."); return}; const blob=new Blob([JSON.stringify(lib.data,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=(lib.title||"biblioteca")+".json"; a.click(); URL.revokeObjectURL(a.href) })
on(clearLibrariesBtn,"click",async ()=>{ libraries=[]; currentLibraryId=null; browserStack=[]; renderLibraryList(); renderBrowser(); await dbRemove(DB_LIBRARIES_KEY); setDebug("Bibliotecas borradas.") })
on(backFolderBtn,"click",()=>{
  if(browserStack.length>1){
    browserStack.pop()
    clearBrowserSearch()
    updateNowPlayingFromContext()
    renderBrowser()
  }else if(browserStack.length===1){
    browserStack=[]
    clearBrowserSearch()
    nowPlayingEl.textContent="Explorador"
    setCurrentInfo("")
    renderBrowser()
  }
})
on(refreshLibraryBtn,"click",async ()=>{
  const lib=currentLibrary()
  if(!lib?.sourceUrl){ setDebug("Esta biblioteca no tiene URL de origen."); return }
  await refreshLibraryFromSource(lib)
})
on(searchInput,"input",()=>{
  browserSearchTerm=searchInput.value||""
  syncSearchUi()
  renderBrowser()
})

on(clearSearchBtn,"click",()=>{
  clearBrowserSearch()
  renderBrowser()
  searchInput?.focus()
})
on(sidebarToggleBtn,"click",()=>setSidebarCollapsed(!appRoot?.classList.contains("sidebar-collapsed")))
on(typeGroupBtn,"click",()=>setEntryType("group"))
on(typeStationBtn,"click",()=>setEntryType("station"))
on(typeVideoBtn,"click",()=>setEntryType("video"))
on(addEntryBtn,"click",()=>{ addEntryAtCurrentNode() })
on(manualResolveBtn,"click",async ()=>{
  if(!pendingManualResolveUrl){
    setDebug("No hay URL pendiente para resolución manual.")
    return
  }

  const resolved = await resolveStreamUrlManual(
    pendingManualResolveUrl,
    pendingManualResolveReferer || ""
  )

  if(!resolved){
    setDebug("No se pudo resolver manualmente.\nHaz el captcha y pulsa Proceed to video en la ventana abierta.")
    return
  }

  playUrl(resolved, pendingManualResolveTitle || "Reproduciendo")
})
on(infoToggleBtn,"click",()=>toggleCurrentInfo())
on(debugToggleBtn,"click",()=>toggleDebugPanel())
renderDebugVisibility()

document.addEventListener('click', (e)=>{
  if(!e.target.closest('.card-menu')) closeAllLibraryMenus()

  const clickedCard=!!e.target.closest('.card')
  const clickedPlayer=!!e.target.closest('.player-wrap')
  const clickedControls=!!e.target.closest('.controls')
  const clickedSidebar=!!e.target.closest('.sidebar')
  const clickedBreadcrumb=!!e.target.closest('.crumb')
  const clickedSearch=!!e.target.closest('.search-box')
  const clickedBrowserButton=!!e.target.closest('#backFolderBtn') || !!e.target.closest('#refreshLibraryBtn')

  if(!clickedCard && !clickedPlayer && !clickedControls && !clickedSidebar && !clickedBreadcrumb && !clickedSearch && !clickedBrowserButton){
    clearCurrentSelection(true)
  }
})

on(playPauseBtn,"click",togglePlay)
on(backBtn,"click",()=>jumpBy(-getJumpSeconds()))
on(forwardBtn,"click",()=>jumpBy(getJumpSeconds()))
on(forwardBtn,"wheel",(e)=>{ e.preventDefault(); const delta=e.deltaY>0?-1:1; setJumpSeconds(getJumpSeconds()+delta) })
on(nextItemBtn,"click",async ()=>{ const ok=await playNextInCurrentNode(); if(!ok) setDebug("No hay siguiente vídeo en esta lista.") })
on(muteBtn,"click",()=>{ showVolumePanel(); video.muted=!video.muted; updateMuteLabel() })
on(fullscreenBtn,"click",toggleFullscreen)
on(volumeRange,"input",()=>{ showVolumePanel(); applyVolume(); saveSettings() })
on(volumeWrap,"mouseenter",showVolumePanel)
on(volumeWrap,"mouseleave",hideVolumePanelSoon)
on(muteBtn,"focus",showVolumePanel)
on(volumeRange,"focus",showVolumePanel)
on(volumeRange,"blur",hideVolumePanelSoon)
on(autoplayToggle,"change",saveSettings)
on(rememberToggle,"change",saveSettings)
on(boostToggle,"change",saveSettings)
on(progressRange,"input",()=>{ const d=video.duration||0; video.currentTime=d*(progressRange.value/100) })
on(playerWrap,"mousemove",showControlsTemporarily)
on(playerWrap,"mouseleave",()=>{ if(!video.paused) playerWrap.classList.add('controls-hidden') })
on(playerWrap,"click",showControlsTemporarily)

video.ontimeupdate=()=>{ const c=video.currentTime||0, d=video.duration||0; progressRange.value=d?(c/d)*100:0; timeLabel.textContent=format(c)+" / "+format(d); if(rememberToggle.checked){ const src=video.currentSrc || video.src; if(src) saveProgress(src,video.currentTime) } }
video.onplay=()=>{ updatePlayLabel(); showControlsTemporarily() }
video.onpause=()=>{ updatePlayLabel(); keepControlsVisible() }
video.onended=async ()=>{ updatePlayLabel(); keepControlsVisible(); if(autoplayToggle.checked){ const ok=await playNextInCurrentNode(); if(!ok) setDebug("Fin de la lista.") } }
video.onvolumechange=updateMuteLabel
document.addEventListener("fullscreenchange",updateFullscreenLabel)

on(clickLayer,"click",()=>{ const now=Date.now(); if(now-lastClickTime<250){ toggleFullscreen(); lastClickTime=0; return } lastClickTime=now; setTimeout(()=>{ if(lastClickTime&&Date.now()-lastClickTime>=240){ togglePlay(); lastClickTime=0 } },260) })
function middleJumpDown(e, dir, side){ if(e.button!==1)return; e.preventDefault(); if(side==="left") suppressAuxLeft=true; if(side==="right") suppressAuxRight=true; jumpBy(dir*getJumpSeconds()) }
function middleJumpAux(e, dir, side){ if(e.button!==1)return; e.preventDefault(); if(side==="left"&&suppressAuxLeft){ suppressAuxLeft=false; return } if(side==="right"&&suppressAuxRight){ suppressAuxRight=false; return } jumpBy(dir*getJumpSeconds()) }
on(leftHit,"mousedown",(e)=>middleJumpDown(e,-1,"left"))
on(rightHit,"mousedown",(e)=>middleJumpDown(e,1,"right"))
on(leftHit,"auxclick",(e)=>middleJumpAux(e,-1,"left"))
on(rightHit,"auxclick",(e)=>middleJumpAux(e,1,"right"))
on(leftHit,"contextmenu",(e)=>e.preventDefault())
on(rightHit,"contextmenu",(e)=>e.preventDefault())
document.addEventListener("keydown",(e)=>{ const tag=(document.activeElement&&document.activeElement.tagName||"").toLowerCase(); if(tag==="input"||tag==="textarea")return; if(e.key==="ArrowLeft"){ e.preventDefault(); jumpBy(-getJumpSeconds()) } if(e.key==="ArrowRight"){ e.preventDefault(); jumpBy(getJumpSeconds()) } if(e.key===" "){ e.preventDefault(); togglePlay() } if(e.key.toLowerCase()==="f"){ e.preventDefault(); toggleFullscreen() } if(e.key==="ArrowUp"){ e.preventDefault(); showVolumePanel(); volumeRange.value=Math.min(200,Number(volumeRange.value)+5); applyVolume(); saveSettings() } if(e.key==="ArrowDown"){ e.preventDefault(); showVolumePanel(); volumeRange.value=Math.max(0,Number(volumeRange.value)-5); applyVolume(); saveSettings() } })

;(async function init(){
  const s=loadSettings()
  autoplayToggle.checked=s.autoplay!==false
  rememberToggle.checked=s.remember!==false
  boostToggle.checked=s.boost!==false
  volumeRange.value=s.volumePercent||100
  syncJumpUi(); applyVolume(); updatePlayLabel(); updateMuteLabel(); updateFullscreenLabel()
  const savedResolver=loadResolverConfig()
  if(savedResolver){
    RESOLVER_CONFIG.useBackend=!!savedResolver.useBackend
    RESOLVER_CONFIG.backendUrl=normalizeBackendUrl(savedResolver.backendUrl || RESOLVER_CONFIG.backendUrl)
  }else{
    RESOLVER_CONFIG.backendUrl=normalizeBackendUrl(RESOLVER_CONFIG.backendUrl)
  }

  if(useBackendToggle){
    useBackendToggle.checked = RESOLVER_CONFIG.useBackend
    backendUrlInput.value = RESOLVER_CONFIG.backendUrl
    backendUrlField.style.display = RESOLVER_CONFIG.useBackend ? "block" : "none"

    useBackendToggle.addEventListener("change", () => {
      RESOLVER_CONFIG.useBackend = useBackendToggle.checked
      backendUrlField.style.display = useBackendToggle.checked ? "block" : "none"
      saveResolverConfig()
      updateResolverStatus()
    })

    backendUrlInput.addEventListener("change", () => {
      RESOLVER_CONFIG.backendUrl = normalizeBackendUrl(backendUrlInput.value)
      backendUrlInput.value = RESOLVER_CONFIG.backendUrl
      saveResolverConfig()
      updateResolverStatus()
    })
  }

  updateResolverStatus()
  setSidebarCollapsed(!!s.sidebarCollapsed)
  hidePlayer(); hideManualResolve(); setEntryType("group"); syncSearchUi(); nowPlayingEl.textContent="Explorador"; setCurrentInfo(""); debugEl.classList.add("hidden")
  updateImportButtons()
  try{
    libraries=await loadLibrariesFromStorage()
    storageReady=true
    currentLibraryId=libraries[0]?.id||null
    browserStack=[]
    renderLibraryList(); renderBrowser()
    setDebug("")
  }catch(error){
    storageReady=true
    libraries=[]
    renderLibraryList(); renderBrowser()
    setDebug(`Error cargando bibliotecas.\n${error?.message||error}`)
  }
  updateImportButtons()
})()
