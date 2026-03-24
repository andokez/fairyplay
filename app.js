const $ = (id) => document.getElementById(id)
const on = (el, evt, fn) => { if (el) el.addEventListener(evt, fn) }

const video=$("video")
const playerWrap=$("playerWrap")
const playerEmpty=$("playerEmpty")
const playerNotice=$("playerNotice")
const playerSection=$("playerSection")
const clickLayer=$("clickLayer")
const leftHit=$("leftHit")
const rightHit=$("rightHit")
const importUrlInput=$("importUrlInput")
const importFile=$("importFile")
const importUrlBtn=$("importUrlBtn")
const exportCurrentBtn=$("exportCurrentBtn")
const libraryAddMenu=$("libraryAddMenu")
const importFileOptionBtn=$("importFileOptionBtn")
const importUrlOptionBtn=$("importUrlOptionBtn")
const importFileTrigger=$("importFileTrigger")
const importUrlBox=$("importUrlBox")
const cancelEditBtn=$("cancelEditBtn")
const editorActionsMenu=$("editorActionsMenu")
const editorCutBtn=$("editorCutBtn")
const editorCopyBtn=$("editorCopyBtn")
const editorPasteBtn=$("editorPasteBtn")
const editorDeleteBtn=$("editorDeleteBtn")
const backFolderBtn=$("backFolderBtn")
const typeGroupBtn=$("typeGroupBtn")
const typeStationBtn=$("typeStationBtn")
const typeVideoBtn=$("typeVideoBtn")
const videoFields=$("videoFields")
const entryNameInput=$("entryNameInput")
const entryImageInput=$("entryImageInput")
const entryInfoInput=$("entryInfoInput")
const entryUrlFields=$("entryUrlFields")
const entryUrlInput=$("entryUrlInput")
const addUrlFieldBtn=$("addUrlFieldBtn")
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
const menuAutoplayToggle=$("menuAutoplayToggle")
const editModeToggle=$("editModeToggle")
const showResolverToggle=$("showResolverToggle")
const useBackendToggleMenu=$("useBackendToggleMenu")
const editorPanel=$("editorPanel")
const optionsPanel=$("optionsPanel")
const resolverPanel=$("resolverPanel")
const sidebarOptionsMenu=$("sidebarOptionsMenu")
const playPauseBtn=$("playPauseBtn")
const backBtn=$("backBtn")
const forwardBtn=$("forwardBtn")
const progressRange=$("progressRange")
const timeLabel=$("timeLabel")
const nextItemBtn=$("nextItemBtn")
const subsBtn=$("subsBtn")
const muteBtn=$("muteBtn")
const fullscreenBtn=$("fullscreenBtn")
const volumeWrap=$("volumeWrap")
const volumeRange=$("volumeRange")
const volumeLabel=$("volumeLabel")
const appRoot=document.querySelector(".app")
const sidebarToggleBtn=$("sidebarToggleBtn")
const sidebarBackendStatusBtn=$("sidebarBackendStatusBtn")
const sidebarBackendStatusDot=$("sidebarBackendStatusDot")
const collapsedBackendBtn=$("collapsedBackendBtn")
const collapsedBackendDot=$("collapsedBackendDot")
const sidebarCollapsedDock=$("sidebarCollapsedDock")
const collapsedLibraryIcons=$("collapsedLibraryIcons")
const collapsedScrollUpBtn=$("collapsedScrollUpBtn")
const collapsedScrollDownBtn=$("collapsedScrollDownBtn")
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
let pendingManualResolveItem=null
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
let editorClipboardItem=null
let editorClipboardKind=""
let editorClipboardMode="copy"
let browserSearchTerm=""
let currentInfoText=""
let currentInfoExpanded=false
let debugExpanded=false
let openRequestSeq=0
let activeOpenRequestId=0
let activeStatusOriginalUrl=""
let activeStatusPlaybackUrl=""

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

function convertAceStreamUrl(url){
  const raw=String(url||"").trim()
  if(!raw) return ""

  if(/^acestream:\/\//i.test(raw)){
    const id=raw.replace(/^acestream:\/\//i,"").trim()
    return id ? `http://127.0.0.1:6878/ace/manifest.m3u8?content_id=${encodeURIComponent(id)}` : raw
  }

  if(/^magnet:\?xt=urn:btih:/i.test(raw)){
    const match=raw.match(/btih:([^&]+)/i)
    const hash=match?.[1]?.trim()
    return hash ? `http://127.0.0.1:6878/ace/manifest.m3u8?infohash=${encodeURIComponent(hash)}` : raw
  }

  if(/^[a-fA-F0-9]{40}$/.test(raw)){
    return `http://127.0.0.1:6878/ace/manifest.m3u8?infohash=${encodeURIComponent(raw)}`
  }

  return raw
}

function isAceStreamInput(url){
  const raw=String(url||"").trim()
  return /^acestream:\/\//i.test(raw) || /^magnet:\?xt=urn:btih:/i.test(raw) || /^[a-fA-F0-9]{40}$/.test(raw)
}

function isAceStreamEngineUrl(url){
  const raw=String(url||"").trim().toLowerCase()
  return raw.startsWith("http://127.0.0.1:6878/ace/") || raw.startsWith("http://localhost:6878/ace/")
}

function showPlayerNotice(html){
  if(!playerNotice) return
  playerNotice.innerHTML=html||""
  playerNotice.classList.toggle("hidden", !String(html||"").trim())
}

function hidePlayerNotice(){
  if(!playerNotice) return
  playerNotice.innerHTML=""
  playerNotice.classList.add("hidden")
}

function getAceStreamDownloadUrl(){
  return "https://docs.acestream.net/products/"
}

function buildAceStreamNoticeHtml(){
  return `
    <div class="player-notice-title">Ace Stream Engine no está abierto</div>
    <div class="player-notice-text">
      FairyPlay puede reproducir enlaces AceStream dentro del reproductor, pero necesita que <b>Ace Stream Engine</b> esté instalado y ejecutándose en este dispositivo.
    </div>
    <div class="player-notice-actions">
      <a class="btn primary" href="${getAceStreamDownloadUrl()}" target="_blank" rel="noopener noreferrer">Descargar Ace Stream Engine</a>
    </div>
  `
}
function buildAceStreamDeadNoticeHtml(){
  return `
    <div style="display:flex;align-items:center;gap:12px;">
      <img src="logo.png" alt="FairyPlay" style="width:42px;height:42px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(80,160,255,.55));">
      <div>
        <div class="player-notice-title">Enlace AceStream no activo</div>
        <div class="player-notice-text">
          Ace Stream Engine está abierto, pero este contenido no responde o ya no está activo.
        </div>
      </div>
    </div>
  `
}

function buildInactiveNoticeHtml(){
  return `
    <div style="display:flex;align-items:center;gap:12px;">
      <img src="logo.png" alt="FairyPlay" style="width:42px;height:42px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(80,160,255,.55));">
      <div>
        <div class="player-notice-title">Enlace no activo</div>
        <div class="player-notice-text">
          Este contenido no responde, no carga correctamente o ya no está disponible.
        </div>
      </div>
    </div>
  `
}

function buildDrmOriginNoticeHtml(){
  return `
    <div style="display:flex;align-items:center;gap:12px;">
      <img src="logo.png" alt="FairyPlay" style="width:42px;height:42px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(80,160,255,.55));">
      <div>
        <div class="player-notice-title">DRM no permitido en este origen</div>
        <div class="player-notice-text">
          Este stream necesita DRM y el navegador lo está bloqueando porque FairyPlay está abierto desde <b>file://</b> o desde un origen no válido. Abre FairyPlay desde <b>http://localhost:3000</b>.
        </div>
      </div>
    </div>
  `
}
async function isAceStreamEngineRunning(){
  try{
    const res = await fetch("http://127.0.0.1:6878/webui/api/service?method=get_version", {
      method: "GET"
    })
    if(!res.ok) return false
    const data = await res.json().catch(()=>null)
    return !!data?.result?.version
  }catch{
    return false
  }
}
function applyBackendStatusVisual(state, title){
  const isOn=state==="on"
  const targets=[
    { btn: sidebarBackendStatusBtn, dot: sidebarBackendStatusDot },
    { btn: collapsedBackendBtn, dot: collapsedBackendDot }
  ]

  for(const target of targets){
    if(target.btn){
      target.btn.classList.remove("hidden")
      target.btn.classList.toggle("is-on", isOn)
      target.btn.classList.toggle("is-off", !isOn)
      target.btn.title=title
      target.btn.setAttribute("aria-label", title)
    }
    if(target.dot){
      target.dot.classList.toggle("is-on", isOn)
      target.dot.classList.toggle("is-off", !isOn)
    }
  }
}

function getDefaultResolverBackendUrl(){
  return DEFAULT_BACKEND_URL
}

function isUsingDefaultResolverBackend(){
  return normalizeBackendUrl(RESOLVER_CONFIG.backendUrl)===getDefaultResolverBackendUrl()
}

function syncResolverBackendUi(){
  if(useBackendToggle){
    useBackendToggle.checked=isUsingDefaultResolverBackend()
  }

  if(useBackendToggleMenu){
    useBackendToggleMenu.checked=isUsingDefaultResolverBackend()
  }

  if(backendUrlInput){
    backendUrlInput.value=normalizeBackendUrl(RESOLVER_CONFIG.backendUrl)
  }

  if(backendUrlField){
    backendUrlField.style.display="block"
  }
}

async function updateResolverStatus() {
  const el=document.getElementById("resolverStatus")
  if(!el) return

  const backendUrl=normalizeBackendUrl(RESOLVER_CONFIG.backendUrl)
  const isDefault=isUsingDefaultResolverBackend()
  const sourceLabel=isDefault ? "localhost" : "personalizado"

  if(!backendUrl){
    el.textContent="⚪ Backend sin configurar"
    applyBackendStatusVisual("off", "Backend sin configurar")
    return
  }

  try {
    const r = await fetch(`${backendUrl}?ping=1`, {
      method: "GET",
      mode: "cors"
    })

    if(r.ok){
      el.textContent=`🟢 Backend ${sourceLabel} activo: ${backendUrl}`
      applyBackendStatusVisual("on", `Backend ${sourceLabel} activo: ${backendUrl}`)
    }else{
      el.textContent=`🔴 Backend ${sourceLabel} sin respuesta: ${backendUrl}`
      applyBackendStatusVisual("off", `Backend ${sourceLabel} sin respuesta: ${backendUrl}`)
    }
  } catch (e) {
    el.textContent = `🔴 Backend ${sourceLabel} no detectado: ${backendUrl}`
    applyBackendStatusVisual("off", `Backend ${sourceLabel} no detectado: ${backendUrl}`)
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
updateEditorActionButtons()
}

function toggleDebugPanel(){
  if(!debugEl?.textContent.trim()) return
  debugExpanded=!debugExpanded
  renderDebugVisibility()
updateEditorActionButtons()
}

function syncMenuToggles(){
  if(menuAutoplayToggle) menuAutoplayToggle.checked=!!autoplayToggle?.checked
}

function applyVisibilitySettings(){
  const editOn=editModeToggle?editModeToggle.checked!==false:true
  const resolverOn=!!showResolverToggle?.checked
  if(editorPanel) editorPanel.classList.toggle("hidden", !editOn)
  if(resolverPanel) resolverPanel.classList.toggle("hidden", !resolverOn)
  if(optionsPanel) optionsPanel.classList.add("hidden")
  renderBrowser()
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
  hidePlayerNotice()
  showPlayer()
  if(playerWrap) playerWrap.classList.remove("is-empty")
  if(playerEmpty) playerEmpty.classList.add("hidden")
}
function hideManualResolve(){
  pendingManualResolveUrl=""
  pendingManualResolveTitle=""
  pendingManualResolveReferer=""
  pendingManualResolveItem=null
  if(manualResolveBox) manualResolveBox.classList.add("hidden")
}

function showManualResolve(url,title,referer="",item=null){
  pendingManualResolveUrl=url||""
  pendingManualResolveTitle=title||""
  pendingManualResolveReferer=referer||""
  pendingManualResolveItem=item||null
  if(manualResolveBox) manualResolveBox.classList.remove("hidden")
}
function hideYoutubeFrame(){
  if(youtubeFrame){
    youtubeFrame.classList.add("hidden")
    youtubeFrame.removeAttribute("src")
  }
  if(playerWrap) playerWrap.classList.remove("show-embed-controls")
  video.classList.remove("hidden")
  clickLayer.classList.remove("hidden")
  leftHit.classList.remove("hidden")
  rightHit.classList.remove("hidden")
}

function showEmbedFrame(embedUrl){
  destroyPlayers()
  showPlayerLoaded()
  hideManualResolve()
  video.classList.add("hidden")
  clickLayer.classList.add("hidden")
  leftHit.classList.add("hidden")
  rightHit.classList.add("hidden")
  if(playerWrap) playerWrap.classList.add("show-embed-controls")
  if(youtubeFrame){
    youtubeFrame.classList.remove("hidden")
    youtubeFrame.src=embedUrl
  }
}

function showYoutubeFrame(embedUrl){
  showEmbedFrame(embedUrl)
}
function loadSettings(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}")}catch{return{}}}
function saveSettings(){ const s=loadSettings(); s.autoplay=autoplayToggle.checked; s.remember=rememberToggle.checked; s.editMode=editModeToggle?editModeToggle.checked!==false:true; s.showResolver=!!showResolverToggle?.checked; s.jumpSeconds=getJumpSeconds(); s.volumePercent=Number(volumeRange.value)||100; s.sidebarCollapsed=!!appRoot?.classList.contains("sidebar-collapsed"); localStorage.setItem(SETTINGS_KEY,JSON.stringify(s)); applyVolume() }
function isEditModeOn(){ return editModeToggle ? editModeToggle.checked!==false : true }
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
function setResolveCache(url, resolvedUrl, ttlMs=10*60*1000){
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
  if(status==="checking") return '<span class="status-dot checking" title="Comprobando..."></span>'
  return ""
}
function setActiveStatusUrls(originalUrl="", playbackUrl=""){
  activeStatusOriginalUrl=String(originalUrl||"").trim()
  activeStatusPlaybackUrl=String(playbackUrl||"").trim()
}
function clearActiveStatusUrls(){
  activeStatusOriginalUrl=""
  activeStatusPlaybackUrl=""
}
function applyStatusToUrlPair(status, originalUrl="", playbackUrl=""){
  const originalKey=String(originalUrl||"").trim()
  const playbackKey=String(playbackUrl||"").trim()

  if(originalKey) setLinkStatus(originalKey, status)
  if(playbackKey && playbackKey!==originalKey) setLinkStatus(playbackKey, status)

  renderBrowser()
}
function setCheckingStatus(originalUrl="", playbackUrl=""){
  setActiveStatusUrls(originalUrl, playbackUrl)
  applyStatusToUrlPair("checking", originalUrl, playbackUrl)
}
function markActiveStatus(status){
  applyStatusToUrlPair(status, activeStatusOriginalUrl, activeStatusPlaybackUrl)
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
function closeLibraryAddMenu(){ if(libraryAddMenu) libraryAddMenu.removeAttribute("open") }
function showImportUrlBox(show){ if(!importUrlBox) return; importUrlBox.classList.toggle("hidden", !show); if(show) importUrlInput?.focus() }
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

function stripJsonNoise(text){
  let out=String(text||"").replace(/^\uFEFF/, "")
  out=out.replace(/^\s*```(?:json)?\s*/i, "")
  out=out.replace(/\s*```\s*$/i, "")
  out=out.replace(/,\s*(?=[}\]])/g, "")
  return out.trim()
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
  const raw=String(text||"")
  const trimmed=raw.trim()

  if(/^#EXTM3U/i.test(trimmed) || /^#EXTINF:/mi.test(trimmed)){
    return {
      ok:true,
      data:raw,
      error:"Lista M3U detectada e interpretada automáticamente."
    }
  }

  const payload=extractLikelyJsonPayload(raw)
  const cleanPayload=stripJsonNoise(payload)
  const cleanRaw=stripJsonNoise(raw)

  const repairBrokenArrayObjects=(input)=>{
    let out=String(input||"")

    // 1) Arregla cosas tipo: "stations":[{ { "name": ...
    out=out.replace(/(\[\s*\{)\s*\{(?=\s*")/g, "$1")

    // 2) Arregla cosas tipo:
    //    },
    //    "name":"1x01"
    //    => },{
    //    "name":"1x01"
    //
    // Esto se aplica solo cuando justo después de una coma viene algo
    // que parece el inicio de un nuevo objeto de episodio/video.
    out=out.replace(
      /(\}\s*,\s*)(?="(?:name|title|image|url|embed|import|referer|userAgent|headers|drm|kid|key|info|playInNatPlayer|playerType|stations|groups)"\s*:)/g,
      "$1{"
    )

    return out
  }

  const attempts=[]
  const push=(label, value)=>{
    if(typeof value==="string" && value && !attempts.some(x=>x.value===value)){
      attempts.push({label, value})
    }
  }

  const repairedPayload=repairBrokenArrayObjects(payload)
  const normalizedPayload=normalizeBrokenJsonLikeText(payload)
  const repairedAndNormalized=normalizeBrokenJsonLikeText(repairBrokenArrayObjects(payload))

  push("original", raw)
  push("raw-limpio", cleanRaw)
  push("payload", payload)
  push("payload-limpio", cleanPayload)
  push("array-objects", repairedPayload)
  push("array-objects-limpio", stripJsonNoise(repairedPayload))
  push("normalizado", normalizedPayload)
  push("normalizado-limpio", stripJsonNoise(normalizedPayload))
  push("array-objects-normalizado", repairedAndNormalized)
  push("array-objects-normalizado-limpio", stripJsonNoise(repairedAndNormalized))
  push("normalizado-2", normalizeBrokenJsonLikeText(repairedAndNormalized))

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

  return { ok:false, data:null, error:lastError || "Formato no soportado" }
}
function makeItemKey(item){
  if(!item) return ""
  return [item.import ? "import" : "station", item.name || item.title || "", item.url || "", isEmbedStation(item) ? "embed" : "", isYoutubeUrl(item?.url || "") ? "youtube" : ""].join("|")
}
function isCurrentItem(item){ return !!currentItemKey && makeItemKey(item)===currentItemKey }

function normalizeUrlFieldsFromCombinedInput(preferLastEmpty=false){
  if(!entryUrlFields) return

  const inputs=getEditorUrlInputs()
  const allUrls=inputs.flatMap(input => splitEditorUrlText(input.value))

  const hadTrailingEmpty=inputs.some(input => !String(input.value||"").trim())

  entryUrlFields.innerHTML=""

  if(!allUrls.length){
    entryUrlFields.appendChild(createUrlFieldRow(""))
    syncUrlFieldButtons()
    return
  }

  allUrls.forEach(url=>{
    entryUrlFields.appendChild(createUrlFieldRow(url))
  })

  if(preferLastEmpty || hadTrailingEmpty){
    entryUrlFields.appendChild(createUrlFieldRow(""))
  }

  syncUrlFieldButtons()
}

function createUrlFieldRow(value=""){
  const row=document.createElement("div")
  row.className="row url-entry-row"
  row.innerHTML=`<input class="input grow entry-url-input" type="text" placeholder=".mp4 / .m3u8 / .mpd / URL de lista" value="${escapeHtml(value)}" />
<button class="btn small move-url-up" type="button" title="Subir URL">↑</button>
<button class="btn small move-url-down" type="button" title="Bajar URL">↓</button>
<button class="btn small remove-url-field" type="button">✕</button>`

  const input=row.querySelector(".entry-url-input")

  input?.addEventListener("blur", ()=>{
    const parts=splitEditorUrlText(input.value)
    if(parts.length>1){
      normalizeUrlFieldsFromCombinedInput(true)
    }
  })

  row.querySelector(".move-url-up")?.addEventListener("click", ()=>{
    const prev=row.previousElementSibling
    if(prev){
      row.parentNode.insertBefore(row, prev)
      syncUrlFieldButtons()
    }
  })

  row.querySelector(".move-url-down")?.addEventListener("click", ()=>{
    const next=row.nextElementSibling
    if(next){
      row.parentNode.insertBefore(next, row)
      syncUrlFieldButtons()
    }
  })

  row.querySelector(".remove-url-field")?.addEventListener("click", ()=>{
    row.remove()
    ensureAtLeastOneUrlField()
    syncUrlFieldButtons()
  })

  return row
}

function getEditorUrlInputs(){
  return Array.from(entryUrlFields?.querySelectorAll(".entry-url-input") || [])
}

function splitEditorUrlText(value=""){
  return String(value||"")
    .split(/[\n,]+/)
    .map(v => String(v||"").trim())
    .filter(Boolean)
}

function getVideoUrlsFromEditor(){
  return getEditorUrlInputs()
    .flatMap(input => splitEditorUrlText(input.value))
    .filter(Boolean)
}

function ensureAtLeastOneUrlField(){
  if(!entryUrlFields) return
  if(entryUrlFields.querySelector(".entry-url-input")) return

  entryUrlFields.appendChild(createUrlFieldRow(""))
  syncUrlFieldButtons()
}

function syncUrlFieldButtons(){
  const rows=Array.from(entryUrlFields?.querySelectorAll(".url-entry-row") || [])
  const canRemove=rows.length>1

  rows.forEach((row, index)=>{
    row.querySelector(".remove-url-field")?.classList.toggle("hidden", !canRemove)
    row.querySelector(".move-url-up")?.classList.toggle("hidden", index===0)
    row.querySelector(".move-url-down")?.classList.toggle("hidden", index===rows.length-1)
  })
}

function setVideoUrlsInEditor(urls=[]){
  if(!entryUrlFields) return

  const values=(Array.isArray(urls) ? urls : [])
    .map(v => String(v||"").trim())
    .filter(Boolean)

  entryUrlFields.innerHTML=""

  const finalValues=values.length ? values : [""]

  finalValues.forEach(value=>{
    entryUrlFields.appendChild(createUrlFieldRow(value))
  })

  syncUrlFieldButtons()
}

function appendVideoUrlField(value=""){
  if(!entryUrlFields) return
  normalizeUrlFieldsFromCombinedInput(false)
  entryUrlFields.appendChild(createUrlFieldRow(value))
  syncUrlFieldButtons()
}

function getItemSourceEntries(item){
  const entries=[]
  const baseUrl=String(item?.url||"").trim()

  if(baseUrl){
    entries.push({
      key:"url",
      index:0,
      order:1,
      label:"Servidor 1",
      url:baseUrl
    })
  }

  Object.keys(item||{})
    .map(key=>{
      const m=String(key).match(/^url(\d+)$/i)
      if(!m) return null

      const num=Number(m[1]||0)
      const value=String(item?.[key]||"").trim()
      if(!num || !value) return null

      return {
        key,
        index:num-1,
        order:num,
        label:`Servidor ${num}`,
        url:value
      }
    })
    .filter(Boolean)
    .sort((a,b)=>a.order-b.order)
    .forEach(entry=>entries.push(entry))

  return entries
}

function orderItemSourceEntries(entries, preferredIndex=null, onlyPreferred=false){
  const list=Array.isArray(entries) ? [...entries] : []
  if(!list.length) return []

  if(Number.isInteger(preferredIndex)){
    const preferred=list.find(x=>x.index===preferredIndex)
    if(preferred){
      if(onlyPreferred) return [preferred]
      return [preferred, ...list.filter(x=>x.index!==preferredIndex)]
    }
  }

  return list
}

function getServerMenuButtonsHtml(item){
  const entries=getItemSourceEntries(item)
  if(entries.length<=1) return ""
  return entries.map(entry =>
    `<button class="btn small choose-server" data-server-index="${entry.index}" type="button">${escapeHtml(entry.label)}</button>`
  ).join("")
}

function startOpenRequest(){
  const requestId=++openRequestSeq
  activeOpenRequestId=requestId
  clearActiveStatusUrls()

  try{ video.pause() }catch{}
  try{ video.removeAttribute("src") }catch{}
  try{ video.load() }catch{}

  hideManualResolve()
  hideYoutubeFrame()
  destroyPlayers()

  return requestId
}

function isOpenRequestCurrent(requestId){
  return requestId===activeOpenRequestId
}

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

  const raw = String(url || "").trim().toLowerCase()
  const clean = raw.split('#')[0].split('?')[0]

  return clean.endsWith('.mp4')
    || clean.endsWith('.m4v')
    || clean.endsWith('.m4a')
    || clean.endsWith('.m4s')
    || clean.endsWith('.cmfv')
    || clean.endsWith('.cmfa')
    || clean.endsWith('.webm')
    || clean.endsWith('.mp3')
    || clean.endsWith('.aac')
    || clean.endsWith('.flac')
    || clean.endsWith('.wav')
    || clean.endsWith('.ogg')
    || clean.endsWith('.ogv')
    || clean.endsWith('.oga')
    || clean.endsWith('.mov')
    || clean.endsWith('.mkv')
    || clean.endsWith('.avi')
    || clean.endsWith('.wmv')
    || clean.endsWith('.mpd')
    || clean.endsWith('.m3u8')
    || clean.endsWith('.m3u')
    || clean.endsWith('.ts')
    || clean.endsWith('.mpg')
    || clean.endsWith('.mpeg')
    || clean.endsWith('.ism')
    || clean.endsWith('.isml')
    || clean.endsWith('.ism/manifest')
    || /\/get_video\?/i.test(raw)
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
    /<video[^>]+id=["']mainvideo["'][^>]+src=["']([^"']+)["']/ig,
    /<video[^>]+src=["']([^"']+)["']/ig,
    /sources\s*:\s*\[\s*\{[\s\S]*?file\s*:\s*['"]([^'"]+)['"]/ig,
    /(?:file|src|url)\s*[:=]\s*['"]([^'"]+(?:\.m3u8|\.m3u|\.mpd|\.mp4|\.m4v|\.m4a|\.m4s|\.cmfv|\.cmfa|\.webm|\.mp3|\.aac|\.flac|\.wav|\.ogg|\.ogv|\.oga|\.mov|\.mkv|\.avi|\.wmv|\.ts|\.mpg|\.mpeg|\.isml|\.ism|\/get_video\?[^'"]*)[^'"]*)['"]/ig,
    /['"](https?:\/\/[^'"]+(?:\.m3u8|\.m3u|\.mpd|\.mp4|\.m4v|\.m4a|\.m4s|\.cmfv|\.cmfa|\.webm|\.mp3|\.aac|\.flac|\.wav|\.ogg|\.ogv|\.oga|\.mov|\.mkv|\.avi|\.wmv|\.ts|\.mpg|\.mpeg|\.isml|\.ism|\/get_video\?[^'"]*)[^'"]*)['"]/ig,
    /['"]((?:\/\/|\/|\.\/|\.\.\/)[^'"]*(?:\/get_video\?[^'"]*|(?:\.m3u8|\.m3u|\.mpd|\.mp4|\.m4v|\.m4a|\.m4s|\.cmfv|\.cmfa|\.webm|\.mp3|\.aac|\.flac|\.wav|\.ogg|\.ogv|\.oga|\.mov|\.mkv|\.avi|\.wmv|\.ts|\.mpg|\.mpeg|\.isml|\.ism)[^'"]*))['"]/ig
  ]
  const found=[]
  for(const pattern of patterns){
    pattern.lastIndex=0
    let match
    while((match=pattern.exec(text))){
      const raw=match[1]||match[0]
      let candidate=normalizePossibleMediaUrl(raw, baseUrl)

      if(!candidate && String(raw).startsWith("//")){
        candidate="https:"+String(raw).trim()
      }

      if(candidate && isDirectMediaUrl(candidate) && !found.includes(candidate)) found.push(candidate)
      if(found.length>=12) return found
    }
  }
  return found
}
async function frontendHtmlResolver(url){
  try{
    setDebug(`Backend no resolvió. Intentando fallback en frontend...`)
    const response=await fetch(url, { method:'GET', mode:'cors', credentials:'include' })
    if(!response.ok) throw new Error(`HTTP ${response.status}`)
    const contentType=String(response.headers.get('content-type')||'').toLowerCase()
    const body=await response.text()
    if(isDirectMediaUrl(response.url)) return response.url
    if(contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/dash+xml') || contentType.startsWith('video/')) return response.url || url
    const candidates=extractMediaCandidatesFromHtml(body, response.url || url)
    if(candidates.length){
      setDebug(`Frontend encontró stream directo como fallback:
${candidates[0]}`)
      return candidates[0]
    }
    return null
  }catch(e){
    setDebug(`Frontend fallback falló (${e.message}).`)
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
function isYoutubeUrl(url){
  return /(?:youtube\.com|youtu\.be)/i.test(String(url||""))
}

function isKrakenEmbedUrl(url){
  const raw=String(url||"").trim()
  if(!raw) return false

  try{
    const u=new URL(raw)
    return /(^|\.)krakenfiles\.com$/i.test(u.hostname) && /^\/embed-video\//i.test(u.pathname)
  }catch{
    return false
  }
}

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
  }catch{
    return null
  }
}

function extractGoogleDriveFileId(url){
  const raw=String(url||"").trim()
  if(!raw) return ""

  try{
    const u=new URL(raw)

    if(!/(^|\.)drive\.google\.com$/i.test(u.hostname)) return ""

    const byQuery=u.searchParams.get("id")
    if(byQuery) return byQuery.trim()

    const byFilePath=u.pathname.match(/\/file\/d\/([^/]+)/i)
    if(byFilePath?.[1]) return byFilePath[1].trim()

    const byPreviewPath=u.pathname.match(/\/file\/d\/([^/]+)\/preview/i)
    if(byPreviewPath?.[1]) return byPreviewPath[1].trim()

    return ""
  }catch{
    return ""
  }
}

function isGoogleDriveUrl(url){
  return !!extractGoogleDriveFileId(url)
}

function getGoogleDrivePreviewUrl(url){
  const id=extractGoogleDriveFileId(url)
  if(!id) return null
  return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`
}

function isGoogleHostedMediaUrl(url){
  const raw=String(url||"").trim()
  if(!raw) return false

  try{
    const u=new URL(raw)
    const host=u.hostname.toLowerCase()

    return host==="drive.usercontent.google.com"
      || host.endsWith(".drive.usercontent.google.com")
      || host==="lh3.googleusercontent.com"
      || host.endsWith(".googleusercontent.com")
      || host.endsWith(".googlevideo.com")
      || host==="c.drive.google.com"
      || host.endsWith(".c.drive.google.com")
      || host==="drive.google.com"
      || host.endsWith(".drive.google.com")
  }catch{
    return false
  }
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

    if(needsResolution(cached.url)){
      clearResolveCache(cacheKey)
    }else{
      return cached.url
    }
  }

  let resolvedUrl=null

  if(RESOLVER_CONFIG.backendUrl){
    resolvedUrl = await backendResolver(originalUrl, false, referer)
    if (resolvedUrl) {
      setResolveCache(cacheKey, resolvedUrl)
      return resolvedUrl
    }
  }

  resolvedUrl = await frontendHtmlResolver(originalUrl)
  if (resolvedUrl) {
    setResolveCache(cacheKey, resolvedUrl)
    return resolvedUrl
  }

  if (!resolvedUrl && RESOLVER_CONFIG.embedResolvers) {
    resolvedUrl = await embedResolver(originalUrl)
    if (resolvedUrl) {
      setResolveCache(cacheKey, resolvedUrl)
      return resolvedUrl
    }
  }

  clearResolveCache(cacheKey)
  setDebug('⚠ No se pudo resolver a una URL directa de vídeo')
  return null
}
async function resolveStreamUrlManual(originalUrl, referer="") {
  if (!needsResolution(originalUrl)) return originalUrl
  if (!RESOLVER_CONFIG.backendUrl) { setDebug("La resolución manual necesita backend configurado."); return null }
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

function destroyPlayers(){
  try{ if(dashPlayer){ dashPlayer.reset(); dashPlayer=null } }catch{}
  try{ if(hlsPlayer){ hlsPlayer.destroy(); hlsPlayer=null } }catch{}

  try{
    Array.from(video.textTracks || []).forEach(track=>{ track.mode="disabled" })
  }catch{}

  video.pause()
  video.removeAttribute("src")
  video.load()
  updateSubtitleButton()
}

function inferType(url){
  if(isGoogleDriveUrl(url)) return "file"

  const raw=String(url||"").toLowerCase()
  const clean=raw.split("#")[0].split("?")[0]

  if(
    clean.endsWith(".mpd") ||
    clean.endsWith(".isml") ||
    clean.endsWith(".ism") ||
    raw.includes(".ism/manifest")
  ) return "dash"

  if(
    clean.endsWith(".m3u8") ||
    clean.endsWith(".m3u")
  ) return "hls"

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
  hidePlayerNotice()
  hideYoutubeFrame()
  destroyPlayers()
  showPlayerLoaded()
  keepControlsVisible()
  playerSection.scrollIntoView({behavior:"smooth", block:"start"})
  nowPlayingEl.textContent=title||"Reproduciendo"
  currentPlayableTitle=title||"Reproduciendo"

  try{
    const originalUrl=String(url||"").trim()
    const aceUrl=convertAceStreamUrl(originalUrl)
    const aceInputDetected=isAceStreamInput(originalUrl) || isAceStreamEngineUrl(aceUrl)
    let aceEngineRunning=false

    setActiveStatusUrls(item?.url || originalUrl, aceUrl)

    if(aceInputDetected){
      aceEngineRunning = await isAceStreamEngineRunning()

      if(!aceEngineRunning){
        markActiveStatus("dead")
        showPlayerEmpty("Ace Stream Engine no está abierto")
        showPlayerNotice(buildAceStreamNoticeHtml())
        setDebug(
`AceStream detectado:
${originalUrl}

Convertido a HLS local:
${aceUrl}

Ace Stream Engine no responde en 127.0.0.1:6878.
Instálalo o ábrelo y vuelve a probar.`)
        return
      }
    }

    const type=inferType(aceUrl)
    const drm=getDrmConfigFromItem(item)
    let playbackUrl=aceUrl

    if(aceInputDetected){
      setDebug(
`AceStream detectado:
${originalUrl}

Convertido a HLS local:
${playbackUrl}`)
    }

    const explicitProxyHeaders=getProxyHeadersFromItem(item, { includeImplicit:false })

    const shouldProxyDash =
      type==="dash" &&
      (
        !!drm ||
        Object.keys(explicitProxyHeaders).length>0
      )

    const shouldProxyGoogleHostedMedia =
      isGoogleHostedMediaUrl(playbackUrl)

const shouldForceProxyForResolvedHostFile =
  type==="file" &&
  !!item?._resolvedFromHost

const shouldTryProxyFallbackForFile =
  type==="file" &&
  (
    shouldForceProxyForResolvedHostFile ||
    shouldProxyGoogleHostedMedia ||
    Object.keys(explicitProxyHeaders).length>0 ||
    !!String(item?.referer||"").trim() ||
    !!String(item?.userAgent||"").trim()
  )

const proxiedFileUrl =
  shouldTryProxyFallbackForFile
    ? buildBackendMediaProxyUrl(playbackUrl, item)
    : ""

if(shouldForceProxyForResolvedHostFile && proxiedFileUrl){
  playbackUrl=proxiedFileUrl
  setDebug(`Reproduciendo fichero resuelto vía proxy:\n${playbackUrl}`)
}

    if(shouldProxyDash){
      playbackUrl=buildBackendMediaProxyUrl(playbackUrl, item)
      setDebug(`Reproduciendo MPD vía proxy:\n${playbackUrl}`)
    }else if(shouldProxyGoogleHostedMedia){
      playbackUrl=buildBackendMediaProxyUrl(playbackUrl, item)
      setDebug(`Reproduciendo Google media vía proxy:\n${playbackUrl}`)
    }else if(!shouldForceProxyForResolvedHostFile){
      setDebug(`Reproduciendo directo:\n${originalUrl}`)
    }

        if(type==="dash"){
      dashPlayer=dashjs.MediaPlayer().create()

      const dashProxyHeaders=getProxyHeadersFromItem(item, { includeImplicit:true })
      const originalDashBase=new URL(playbackUrl)
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
		  setTimeout(()=>kickDashPlayback("stream_initialized+2000ms"), 2000)
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
          buffer: {
            fastSwitchEnabled: false,
            bufferPruningInterval: 10,
            bufferToKeep: 30,
            bufferTimeAtTopQuality: 30,
            bufferTimeAtTopQualityLongForm: 45,
            initialBufferLevel: 8,
            stableBufferTime: 20
          },
          delay: {
            liveDelayFragmentCount: 4
          },
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

      const resolvedFromHost =
        !!item?._resolvedFromHost ||
        !!item?.isHost ||
        !!item?.embed

      let forceHlsProxy=false
      try{
        const u=new URL(originalUrl)
        forceHlsProxy=!!(u.username || u.password)
      }catch{}

      const backendBase = normalizeBackendUrl(RESOLVER_CONFIG.backendUrl)
        .replace(/\/resolve\/?$/, '')
        .replace(/\/api\/?$/, '')

      const headersStr=Object.entries(hlsHeaders)
        .filter(([k,v])=>k&&v)
        .map(([k,v])=>`${k}:${v}`)
        .join("\n")

      const params=new URLSearchParams()
      params.set('url', originalUrl)
      if(headersStr) params.set('headers', headersStr)

      const proxiedHlsUrl=`${backendBase}/api/m3u8?${params.toString()}`

      const shouldAllowProxyFallback =
        resolvedFromHost ||
        hasHlsHeaders ||
        forceHlsProxy

      let usingProxy=false
      let fallbackTried=false

      const attachNativeFallback = ()=>{
        if(usingProxy || !shouldAllowProxyFallback || fallbackTried) return
        fallbackTried=true
        usingProxy=true
        setDebug(`HLS directo falló, reintentando vía proxy:\n${proxiedHlsUrl}`)
        video.src=proxiedHlsUrl
        video.load()
        video.play().catch(()=>{})
      }

      if(window.Hls && Hls.isSupported()){
        const startHls = (sourceUrl)=>{
          hlsPlayer=new Hls({
            maxBufferLength: 30,
            backBufferLength: 30,
            maxMaxBufferLength: 60,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
            highBufferWatchdogPeriod: 2,
            nudgeOffset: 0.1,
            nudgeMaxRetry: 8,
            fragLoadingTimeOut: 20000,
            manifestLoadingTimeOut: 20000,
            levelLoadingTimeOut: 20000
          })

          hlsPlayer.on(Hls.Events.MANIFEST_PARSED, ()=>{
            updateSubtitleButton()
            video.play().catch(()=>{})
          })

          hlsPlayer.on(Hls.Events.LEVEL_LOADED, ()=>{
            updateSubtitleButton()
            video.play().catch(()=>{})
          })

          hlsPlayer.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, ()=>{
            updateSubtitleButton()
          })

          hlsPlayer.on(Hls.Events.SUBTITLE_TRACK_SWITCH, ()=>{
            updateSubtitleButton()
          })

          hlsPlayer.on(Hls.Events.ERROR, (_event, data)=>{
  if(data?.fatal){
    try{
      setDebug((debugEl?.textContent ? debugEl.textContent + "\n" : "") + `HLS ERROR:\n${JSON.stringify(data, null, 2)}`)
    }catch{}

    if(!usingProxy && shouldAllowProxyFallback){
      const fallbackByErrorType =
        data?.type===Hls.ErrorTypes.NETWORK_ERROR ||
        data?.type===Hls.ErrorTypes.MEDIA_ERROR ||
        data?.details===Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
        data?.details===Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
        data?.details===Hls.ErrorDetails.LEVEL_LOAD_ERROR ||
        data?.details===Hls.ErrorDetails.LEVEL_LOAD_TIMEOUT ||
        data?.details===Hls.ErrorDetails.FRAG_LOAD_ERROR ||
        data?.details===Hls.ErrorDetails.FRAG_LOAD_TIMEOUT

      if(fallbackByErrorType){
        fallbackTried=true
        usingProxy=true
        try{ hlsPlayer.destroy() }catch{}
        hlsPlayer=null

        setDebug((debugEl?.textContent ? debugEl?.textContent + "\n" : "") + `Reintentando HLS vía proxy:\n${proxiedHlsUrl}`)

        startHls(proxiedHlsUrl)
        return
      }
    }

    markActiveStatus("dead")

    if(aceInputDetected || isAceStreamEngineUrl(playbackUrl)){
      if(aceEngineRunning){
        showPlayerEmpty("Enlace AceStream no activo")
        showPlayerNotice(buildAceStreamDeadNoticeHtml())
      }else{
        showPlayerEmpty("Ace Stream Engine no está abierto")
        showPlayerNotice(buildAceStreamNoticeHtml())
      }
    }else{
      showPlayerEmpty("Enlace no activo")
      showPlayerNotice(buildInactiveNoticeHtml())
    }
  }
})

          hlsPlayer.loadSource(sourceUrl)
          hlsPlayer.attachMedia(video)
        }

        setDebug(`Reproduciendo HLS directo:\n${playbackUrl}`)
        startHls(playbackUrl)
		setTimeout(updateSubtitleButton, 500)
        setTimeout(updateSubtitleButton, 1500)
      } else {
        setDebug(`Reproduciendo HLS directo:\n${playbackUrl}`)
        video.src=playbackUrl
        video.addEventListener("error", attachNativeFallback, { once:true })
      }
    }
   else {
  let retriedViaProxy=false

  const showFinalDeadNotice = ()=>{
    markActiveStatus("dead")

    if(aceInputDetected || isAceStreamEngineUrl(playbackUrl)){
      if(aceEngineRunning){
        showPlayerEmpty("Enlace AceStream no activo")
        showPlayerNotice(buildAceStreamDeadNoticeHtml())
        setDebug((debugEl?.textContent ? debugEl.textContent + "\n\n" : "") + "AceStream abierto, pero el contenido no está activo.")
      }else{
        showPlayerEmpty("Ace Stream Engine no está abierto")
        showPlayerNotice(buildAceStreamNoticeHtml())
        setDebug((debugEl?.textContent ? debugEl.textContent + "\n\n" : "") + "AceStream no disponible. Abre Ace Stream Engine y vuelve a probar.")
      }
    }else{
      showPlayerEmpty("Enlace no activo")
      showPlayerNotice(buildInactiveNoticeHtml())
      setDebug((debugEl?.textContent ? debugEl.textContent + "\n\n" : "") + "El enlace no responde o ya no está disponible.")
    }
  }

  if(shouldTryProxyFallbackForFile && proxiedFileUrl && proxiedFileUrl!==playbackUrl){
    const retryViaProxy = ()=>{
      video.removeEventListener("error", retryViaProxy)
      retriedViaProxy=true

      setDebug(`Directo falló, reintentando vía proxy:\n${proxiedFileUrl}`)

      video.addEventListener("error", showFinalDeadNotice, { once:true })

      video.src=proxiedFileUrl
      video.load()
      video.play().catch((err)=>{
        try{
          setDebug((debugEl?.textContent ? debugEl.textContent + "\n" : "") + `PLAY ERROR:\n${err?.message || err}`)
        }catch{}
      })
    }

    video.addEventListener("error", retryViaProxy, { once:true })
  }else{
    video.addEventListener("error", showFinalDeadNotice, { once:true })
  }

  if((aceInputDetected || isAceStreamEngineUrl(playbackUrl)) && !shouldTryProxyFallbackForFile){
    video.addEventListener("error", showFinalDeadNotice, { once:true })
  }

  video.src=playbackUrl
}

   const shouldUseAudioBoost = false

if(shouldUseAudioBoost){
  await ensureAudioBoost()

  try{
    if(audioCtx && audioCtx.state === "suspended"){
      await audioCtx.resume()
    }
  }catch{}
}else{
  try{
    if(gainNode) gainNode.gain.value = 1
  }catch{}
}

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
    const errorText=String(e?.message || e || "")
    const isDrmOriginError=/EME use is not allowed on unique origins/i.test(errorText)

    markActiveStatus("dead")

    if(isDrmOriginError){
      showPlayerEmpty("DRM no permitido en file://")
      showPlayerNotice(buildDrmOriginNoticeHtml())
      setDebug(`DRM bloqueado por origen no válido.\nAbre FairyPlay desde http://localhost:3000\n\n${errorText}`)
    }else{
      setDebug(errorText)
    }
  }
}
function playYoutubeUrl(url,title){
  hidePlayerNotice()
  const embedUrl=getYoutubeEmbedUrl(url)
  if(!embedUrl){
    setDebug("No se pudo convertir el enlace de YouTube.")
    return
  }

  currentPlayableTitle=title||"YouTube"
  nowPlayingEl.textContent=title||"YouTube"

  if(location.protocol==="file:"){
    hideYoutubeFrame()
    showPlayer()
    setDebug("YouTube dentro de FairyPlay requiere abrir la app desde http://localhost:3000/ y no con file://")
    return
  }

  showPlayerLoaded()
  showYoutubeFrame(embedUrl)
  playerSection.scrollIntoView({behavior:"smooth", block:"start"})
  setDebug("Reproduciendo YouTube dentro del panel.")
}
function jumpBy(s){ if(video.classList.contains("hidden")) return; video.currentTime=Math.max(0,Math.min(video.duration||Infinity,video.currentTime+s)) }

async function togglePlay(){
  if(video.classList.contains("hidden")) return

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
function applyVolume(){
  const percent=Number(volumeRange.value)||100
  volumeLabel.textContent=percent+"%"

video.volume = percent / 100

if (gainNode) {
  gainNode.gain.value = 1
}

  updateMuteLabel()
}
function showVolumePanel(){ volumeWrap.classList.add("show") }
function hideVolumePanelSoon(){ setTimeout(()=>{ if(!volumeWrap.matches(":hover") && document.activeElement!==volumeRange){ volumeWrap.classList.remove("show") } },180) }
function updateMuteLabel(){ const effectiveMuted = video.muted || Number(volumeRange.value)===0; muteBtn.textContent = effectiveMuted ? "🔇" : "🔊" }
function updatePlayLabel(){ playPauseBtn.textContent=video.paused?"▶":"❚❚" }
function updateFullscreenLabel(){ fullscreenBtn.textContent=document.fullscreenElement?"🡼":"⛶" }

function getNativeSubtitleTracks(){
  try{
    return Array.from(video.textTracks || []).filter(track=>{
      const kind=String(track.kind||"").toLowerCase()
      return kind==="subtitles" || kind==="captions"
    })
  }catch{
    return []
  }
}

function hasSubtitleTracks(){
  const nativeTracks=getNativeSubtitleTracks()
  const hlsTracks=Array.isArray(hlsPlayer?.subtitleTracks) ? hlsPlayer.subtitleTracks.filter(Boolean) : []
  return nativeTracks.length>0 || hlsTracks.length>0
}

function subtitlesAreEnabled(){
  const nativeTracks=getNativeSubtitleTracks()
  const nativeEnabled=nativeTracks.some(track=>track.mode==="showing")

  if(nativeEnabled) return true
  if(hlsPlayer && typeof hlsPlayer.subtitleTrack==="number") return hlsPlayer.subtitleTrack >= 0

  return false
}

function setNativeSubtitleMode(enabled){
  const nativeTracks=getNativeSubtitleTracks()
  nativeTracks.forEach((track, index)=>{
    track.mode = enabled && index===0 ? "showing" : "disabled"
  })
}

function setSubtitlesEnabled(enabled){
  if(hlsPlayer && Array.isArray(hlsPlayer.subtitleTracks) && hlsPlayer.subtitleTracks.length){
    hlsPlayer.subtitleTrack = enabled ? 0 : -1
    if(typeof hlsPlayer.subtitleDisplay==="boolean") hlsPlayer.subtitleDisplay = !!enabled
  }

  setNativeSubtitleMode(enabled)
  updateSubtitleButton()
}

function toggleSubtitles(){
  if(!hasSubtitleTracks()){
    setDebug((debugEl?.textContent ? debugEl.textContent + "\n" : "") + "Este stream no trae pistas de subtítulos detectables.")
    updateSubtitleButton()
    return
  }

  setSubtitlesEnabled(!subtitlesAreEnabled())
}

function updateSubtitleButton(){
  if(!subsBtn) return

  const available=hasSubtitleTracks()
  const enabled=subtitlesAreEnabled()

  subsBtn.disabled=!available
  subsBtn.textContent = !available ? "Subs --" : (enabled ? "Subs ON" : "Subs OFF")
  subsBtn.title = !available ? "Sin subtítulos detectados" : "Activar o desactivar subtítulos"
}

function format(s){ if(!isFinite(s))return"00:00"; s=Math.floor(s||0); const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60; if(h>0)return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0"); return String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0") }

function parseM3uAttributes(text){
  const out={}
  const src=String(text||"")
  const re=/([A-Za-z0-9_-]+)="([^"]*)"/g
  let m
  while((m=re.exec(src))){
    out[m[1].toLowerCase()]=m[2]
  }
  return out
}

function parsePossibleClearKey(value){
  const raw=String(value||"").trim()
  if(!raw) return null

  const tryJson=safeJsonParse(raw)
  if(tryJson.ok && tryJson.data && typeof tryJson.data==="object" && !Array.isArray(tryJson.data)){
    const keys={}
    for(const [kid,key] of Object.entries(tryJson.data)){
      const cleanKid=normalizeDrmHex(kid)
      const cleanKey=normalizeDrmHex(key)
      if(cleanKid && cleanKey) keys[cleanKid]=cleanKey
    }
    return Object.keys(keys).length ? keys : null
  }

  if(raw.includes(":")){
    const idx=raw.indexOf(":")
    const kid=normalizeDrmHex(raw.slice(0, idx))
    const key=normalizeDrmHex(raw.slice(idx+1))
    if(kid && key) return { [kid]: key }
  }

  return null
}

function parseKodiStreamHeaders(value){
  const raw=String(value||"").trim()
  if(!raw) return { userAgent:"", referer:"", headers:{} }

  const outHeaders={}
  let userAgent=""
  let referer=""

  for(const part of raw.split("&")){
    const chunk=String(part||"").trim()
    if(!chunk) continue

    const idx=chunk.indexOf("=")
    if(idx<0) continue

    const rawKey=chunk.slice(0, idx).trim()
    const rawValue=chunk.slice(idx + 1).trim()

    if(!rawKey || !rawValue) continue

    const keyLower=rawKey.toLowerCase()

    if(keyLower==="user-agent"){
      userAgent=rawValue
      continue
    }

    if(keyLower==="referer" || keyLower==="referrer"){
      referer=rawValue
      continue
    }

    outHeaders[rawKey]=rawValue
  }

  return {
    userAgent,
    referer,
    headers: outHeaders
  }
}

function parseUrlWithInlineHeaders(value){
  const raw=String(value||"").trim()
  if(!raw) return { url:"", userAgent:"", referer:"", headers:{} }

  const parts=raw.split("|").map(v=>String(v||"").trim()).filter(Boolean)
  const baseUrl=parts.shift() || ""

  const headers={}
  let userAgent=""
  let referer=""

  for(const part of parts){
    const idx=part.indexOf("=")
    if(idx<0) continue

    const key=part.slice(0, idx).trim()
    const val=part.slice(idx+1).trim()

    if(!key || !val) continue

    const lower=key.toLowerCase()

    if(lower==="user-agent"){
      userAgent=val
      continue
    }

    if(lower==="referer" || lower==="referrer"){
      referer=val
      continue
    }

    headers[key]=val
  }

  return {
    url: baseUrl,
    userAgent,
    referer,
    headers
  }
}

function parseM3uText(text, sourceUrl=""){
  const lines=String(text||"").replace(/^\uFEFF/, "").split(/\r?\n/)
  const groupsMap=new Map()

  const getGroup=(name)=>{
    const groupName=String(name||"Sin grupo").trim() || "Sin grupo"
    if(!groupsMap.has(groupName)){
      groupsMap.set(groupName, {
        name: groupName,
        image: "",
        groups: [],
        stations: []
      })
    }
    return groupsMap.get(groupName)
  }

  let pending=null

  const flushPendingWithUrl=(urlLine)=>{
    const parsedUrl=parseUrlWithInlineHeaders(urlLine)
    const finalUrl=String(parsedUrl.url||"").trim()
    if(!pending || !finalUrl) return

    const group=getGroup(pending.groupTitle || "Sin grupo")

    const mergedHeaders={
      ...(pending.headers||{}),
      ...(parsedUrl.headers||{})
    }

    const finalReferer=pending.referer || parsedUrl.referer || ""
    const finalUserAgent=pending.userAgent || parsedUrl.userAgent || ""

    const item={
      name: pending.name || "Sin título",
      image: pending.image || "",
      url: finalUrl
    }

    if(pending.info) item.info=pending.info
    if(pending.import) item.import=true
    if(pending.embed) item.embed=true
    if(finalReferer) item.referer=finalReferer
    if(finalUserAgent) item.userAgent=finalUserAgent
    if(Object.keys(mergedHeaders).length) item.headers=mergedHeaders

    if(pending.drmKeys && Object.keys(pending.drmKeys).length){
      item.drm={ clearkey: pending.drmKeys }
      const drmEntries=Object.entries(pending.drmKeys)
      if(drmEntries.length===1){
        item.kid=drmEntries[0][0]
        item.key=drmEntries[0][1]
      }
    }

    if(needsResolution(finalUrl)) item.isHost=true

    group.stations.push(item)
    pending=null
  }

  for(let i=0;i<lines.length;i++){
    const rawLine=String(lines[i]||"")
    const line=rawLine.trim()
    if(!line) continue

    if(line.startsWith("#EXTM3U")) continue

    if(line.startsWith("#EXTINF:")){
      const afterPrefix=line.slice(8)
      const commaIdx=afterPrefix.lastIndexOf(",")
      const attrsPart=commaIdx>=0 ? afterPrefix.slice(0, commaIdx) : afterPrefix
      const namePart=commaIdx>=0 ? afterPrefix.slice(commaIdx+1).trim() : ""

      const attrs=parseM3uAttributes(attrsPart)

      pending={
        name: namePart || attrs["tvg-name"] || "Sin título",
        image: attrs["tvg-logo"] || "",
        groupTitle: attrs["group-title"] || "Sin grupo",
        info: "",
        headers: {},
        referer: "",
        userAgent: "",
        drmKeys: null,
        import: false,
        embed: false
      }
      continue
    }

    if(!pending) continue

    if(line.startsWith("#EXTGRP:")){
      pending.groupTitle=String(line.slice(8)||"").trim() || pending.groupTitle || "Sin grupo"
      continue
    }

    if(line.startsWith("#EXTVLCOPT:")){
      const opt=String(line.slice(11)||"").trim()
      const idx=opt.indexOf("=")
      if(idx>0){
        const key=opt.slice(0, idx).trim().toLowerCase()
        const value=opt.slice(idx+1).trim()
        if(key==="http-user-agent"){
          pending.userAgent=value
        }else if(key==="http-referrer" || key==="http-referer"){
          pending.referer=value
        }else if(key){
          pending.headers[key]=value
        }
      }
      continue
    }

    if(line.startsWith("#KODIPROP:")){
      const prop=String(line.slice(10)||"").trim()
      const idx=prop.indexOf("=")
      if(idx>0){
        const key=prop.slice(0, idx).trim().toLowerCase()
        const value=prop.slice(idx+1).trim()

        if(key==="inputstream.adaptive.license_key"){
          const drm=parsePossibleClearKey(value)
          if(drm) pending.drmKeys=drm

        }else if(key==="inputstream.adaptive.license_type"){
          // Si es ClearKey ya lo gestionamos con drmKeys.
          // Si fuera otro DRM, mejor guardarlo aparte pero no como header real.
          if(!/clearkey/i.test(value)){
            pending.info = (pending.info ? pending.info + "\n" : "") + `DRM detectado: ${value}`
          }

        }else if(key==="inputstream.adaptive.stream_headers"){
          const parsed=parseKodiStreamHeaders(value)

          if(parsed.userAgent && !pending.userAgent){
            pending.userAgent=parsed.userAgent
          }

          if(parsed.referer && !pending.referer){
            pending.referer=parsed.referer
          }

          if(parsed.headers && Object.keys(parsed.headers).length){
            pending.headers={
              ...(pending.headers||{}),
              ...parsed.headers
            }
          }

        }else{
          // El resto de KODIPROP mejor guardarlo como info técnica,
          // no como header HTTP inventado.
          pending.info = (pending.info ? pending.info + "\n" : "") + `${key}: ${value}`
        }
      }
      continue
    }

    if(line.startsWith("#")) continue

    flushPendingWithUrl(line)
  }

  const groups=[...groupsMap.values()]
  if(!groups.length) return null

  return {
    name: "Biblioteca importada",
    image: "",
    author: "",
    url: sourceUrl || "",
    groups
  }
}

function normalizeImportedStationItem(it){
  const item=it && typeof it==="object" ? it : {}
  const out={
    name:item.title||item.name||"Sin título",
    image:item.image||item.img||item.logo||item.poster||"",
    url:item.url||item.link||item.file||item.src||""
  }

  if(item.info || item.description) out.info=item.info||item.description
  if(item.import!=null) out.import=!!item.import
  if(item.embed!=null) out.embed=isEmbedStation(item)
  if(item.referer || item.referrer) out.referer=item.referer||item.referrer
  if(item.userAgent || item["user-agent"]) out.userAgent=item.userAgent||item["user-agent"]
  if(item.headers && typeof item.headers==="object") out.headers={...item.headers}
  if(item.drm && typeof item.drm==="object") out.drm=structuredClone(item.drm)
  if(item.kid) out.kid=item.kid
  if(item.key) out.key=item.key
  return out
}

function normalizeImportedGroupNode(group){
  const node=group && typeof group==="object" ? group : {}
  const rawGroups =
    Array.isArray(node.groups) ? node.groups :
    Array.isArray(node.channels) ? node.channels :
    Array.isArray(node.items) ? node.items :
    Array.isArray(node.children) ? node.children : []

  const rawStations =
    Array.isArray(node.stations) ? node.stations :
    Array.isArray(node.channels) && !Array.isArray(node.groups) ? node.channels.filter(x => x && (x.url || x.link || x.file || x.src)) :
    Array.isArray(node.items) && !Array.isArray(node.groups) ? node.items.filter(x => x && (x.url || x.link || x.file || x.src)) :
    []

  const groups=[]
  const stations=[]

  for(const entry of rawGroups){
    if(!entry || typeof entry!=="object") continue
    const hasChildren = Array.isArray(entry.groups) || Array.isArray(entry.stations) || Array.isArray(entry.channels) || Array.isArray(entry.items) || Array.isArray(entry.children)
    const hasUrl = !!(entry.url || entry.link || entry.file || entry.src)

    if(hasChildren && !hasUrl){
      groups.push(normalizeImportedGroupNode(entry))
    }else if(hasUrl){
      stations.push(normalizeImportedStationItem(entry))
    }
  }

  for(const entry of rawStations){
    if(!entry || typeof entry!=="object") continue
    stations.push(normalizeImportedStationItem(entry))
  }

  return {
    name:node.name||node.title||"Lista",
    image:node.image||node.img||node.logo||"",
    info:node.info||node.description||"",
    groups,
    stations
  }
}

function normalizeImportedData(raw, sourceUrl=""){
  if(raw && typeof raw==="object" && Array.isArray(raw.groups)){
    return {
      ...raw,
      url:raw.url||sourceUrl||"",
      groups:raw.groups.map(group=>normalizeImportedGroupNode(group))
    }
  }

  if(Array.isArray(raw)){
    return {
      name:"Biblioteca importada",
      image:"",
      author:"",
      url:sourceUrl||"",
      groups:[{
        name:"Lista",
        image:"",
        groups:[],
        stations:raw.map(it=>normalizeImportedStationItem(it))
      }]
    }
  }

  if(raw && typeof raw==="object"){
    const rootGroups =
      Array.isArray(raw.groups) ? raw.groups :
      Array.isArray(raw.channels) ? raw.channels :
      Array.isArray(raw.items) ? raw.items :
      Array.isArray(raw.children) ? raw.children : null

    const rootStations =
      Array.isArray(raw.stations) ? raw.stations :
      Array.isArray(raw.list) ? raw.list : null

    if(rootGroups){
      return {
        name:raw.name||raw.title||"Biblioteca importada",
        image:raw.image||raw.img||raw.logo||"",
        author:raw.author||"",
        info:raw.info||raw.description||"",
        url:raw.url||sourceUrl||"",
        groups:rootGroups.map(group=>normalizeImportedGroupNode(group))
      }
    }

    if(rootStations){
      return {
        name:raw.name||raw.title||"Biblioteca importada",
        image:raw.image||raw.img||raw.logo||"",
        author:raw.author||"",
        info:raw.info||raw.description||"",
        url:raw.url||sourceUrl||"",
        groups:[{
          name:"Lista",
          image:"",
          groups:[],
          stations:rootStations.map(it=>normalizeImportedStationItem(it))
        }]
      }
    }
  }

  if(typeof raw==="string"){
    return parseM3uText(raw, sourceUrl)
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
function buildTextFetchAttempts(url){
  const fixed=normalizeDropboxUrl(url)
  const attempts=[
    { url: fixed, label: "directa", mode: "cors" }
  ]

  try{
    const u=new URL(fixed)

    if(/(^|\.)raw\.githubusercontent\.com$/i.test(u.hostname)){
      const parts=u.pathname.replace(/^\//,"").split("/")
      if(parts.length>=4){
        const owner=parts[0]
        const repo=parts[1]
        const branch=parts[2]
        const rest=parts.slice(3).join("/")

        attempts.push({
          url:`https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${rest}`,
          label:"jsdelivr",
          mode:"cors"
        })
        attempts.push({
          url:`https://raw.githack.com/${owner}/${repo}/${branch}/${rest}`,
          label:"raw.githack",
          mode:"cors"
        })
      }
    }
  }catch{}

  attempts.push({
    url: "https://api.allorigins.win/raw?url="+encodeURIComponent(fixed),
    label: "allorigins",
    mode: "cors"
  })

  if(RESOLVER_CONFIG.useBackend){
    const backendBase=normalizeBackendUrl(RESOLVER_CONFIG.backendUrl).replace(/\/api\/resolve$/i, "/api/fetch-text")
    attempts.push({
      url: `${backendBase}?url=${encodeURIComponent(fixed)}`,
      label: "backend",
      mode: "cors",
      isBackend: true
    })
  }

  return attempts
}

async function tryFetchText(url){
  const attempts=buildTextFetchAttempts(url)
  let lastErr="No se pudo cargar"

  for(const attempt of attempts){
    try{
      const res=await fetch(attempt.url, { method:"GET", mode:attempt.mode || "cors" })
      if(!res.ok) throw new Error("HTTP "+res.status)

      let rawText=""
      if(attempt.isBackend){
        const data=await res.json()
        if(!data?.success || typeof data?.text!=="string") throw new Error(data?.error || "Respuesta vacía")
        rawText=data.text
      }else{
        rawText=await res.text()
      }

      const text=String(rawText||"").replace(/^\uFEFF/, "")
      if(!text.trim()) throw new Error("Respuesta vacía")
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
}
function sourceUrlFromData(data, importUrl=""){
  if(importUrl) return normalizeDropboxUrl(importUrl)
  const u=String(data?.url||"").trim()
  return /^https?:\/\//i.test(u) ? normalizeDropboxUrl(u) : ""
}
async function persistLibrariesNow(){ return await queueSaveLibraries() }

async function importFromText(text, sourceUrl=""){
  const parsed=parseLibraryText(text)
  if(!parsed.ok){ setDebug(`Formato inválido o lista no reconocida.\n${parsed.error||"Error desconocido"}`); return false }
  if(parsed.error) setDebug(parsed.error)

  const data=normalizeImportedData(parsed.data, sourceUrl)
  if(!data){ setDebug("No se pudo interpretar la lista importada."); return false }

  const lib={
    id:uuid(),
    title:tryMakeLibraryTitle(data),
    author:data.author||"",
    image:data.image||data.img||"",
    sourceUrl:sourceUrlFromData(data, sourceUrl),
    data
  }

  libraries=[...libraries, lib]
  currentLibraryId=lib.id
  browserStack=[lib.data]
  renderLibraryList()
  renderBrowser()
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
function updateCollapsedLibraryScrollButtons(){
  if(!collapsedLibraryIcons || !collapsedScrollUpBtn || !collapsedScrollDownBtn) return

  const maxScroll=Math.max(0, collapsedLibraryIcons.scrollHeight-collapsedLibraryIcons.clientHeight)
  const canScroll=maxScroll>6
  const showUp=canScroll && collapsedLibraryIcons.scrollTop>6
  const showDown=canScroll && collapsedLibraryIcons.scrollTop<(maxScroll-6)

  collapsedScrollUpBtn.classList.toggle("hidden", !showUp)
  collapsedScrollDownBtn.classList.toggle("hidden", !showDown)
}

function renderCollapsedLibraryIcons(){
  if(!collapsedLibraryIcons) return

  collapsedLibraryIcons.innerHTML=""

  if(!libraries.length){
    updateCollapsedLibraryScrollButtons()
    return
  }

  for(const lib of libraries){
    const btn=document.createElement("button")
    btn.type="button"
    btn.className="collapsed-library-btn"+(lib.id===currentLibraryId?" active":"")
    btn.title=lib.title||"Biblioteca"

    const img=(lib.image && /^https?:\/\//i.test(lib.image))
      ? `<img src="${escapeHtml(lib.image)}" loading="lazy" alt="${escapeHtml(lib.title||"Biblioteca")}">`
      : `<span class="collapsed-library-fallback">${escapeHtml((lib.title||"•").trim().charAt(0).toUpperCase()||"•")}</span>`

    btn.innerHTML=img
    btn.addEventListener("click", ()=>openLibrary(lib.id))
    collapsedLibraryIcons.appendChild(btn)
  }

  requestAnimationFrame(updateCollapsedLibraryScrollButtons)
}
function renderLibraryList(){
  libraryList.innerHTML=""
  if(!libraries.length){
    libraryList.innerHTML='<div class="panel">No hay bibliotecas cargadas.</div>'
    renderCollapsedLibraryIcons()
    return
  }
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

  renderCollapsedLibraryIcons()
}
function getCurrentNode(){ return browserStack[browserStack.length-1] || null }
function getNodeChildren(node){
  if(isStationContainer(node)){
    const stationChildren=Array.isArray(node?.stations)
      ? node.stations.map(child => ({
          kind: isPlayableLeaf(child) ? "video" : "station",
          data: child
        }))
      : []

    return stationChildren
  }

  const groups=Array.isArray(node?.groups)
    ? node.groups.map(child => ({
        kind: Array.isArray(child?.groups) ? "group" : "station",
        data: child
      }))
    : []

  const stations=Array.isArray(node?.stations)
    ? node.stations.map(s => ({
        kind:"video",
        data:s
      }))
    : []

  return [...groups, ...stations]
}
function countGroupChildItems(node){
  const groupEntries=Array.isArray(node?.groups) ? node.groups : []
  const videoEntries=Array.isArray(node?.stations) ? node.stations : []

  let folders=0
  for(const child of groupEntries){
    if(Array.isArray(child?.groups) || isStationContainer(child)) folders++
  }

  const videos=videoEntries.filter(isPlayableLeaf).length

  return { folders, videos }
}

function countStationChildItems(node){
  const entries=Array.isArray(node?.stations) ? node.stations : []

  let folders=0
  let videos=0

  for(const child of entries){
    if(isPlayableLeaf(child)) videos++
    else if(isStationContainer(child)) folders++
  }

  return { folders, videos }
}
function fillEditorFromItem(item, kind, parentNode){
  if(cancelEditBtn) cancelEditBtn.classList.remove("hidden")
  const realKind=detectEditorKindFromItem(item, kind)

  editingItemRef=item
  editingParentNode=parentNode
  editingKind=realKind

  if(realKind==="group"){
    setEntryType("group")
    entryNameInput.value=item?.name||""
    entryImageInput.value=item?.image||item?.img||""
    entryInfoInput.value=item?.info||""
    setVideoUrlsInEditor([])
    entryRefererInput.value=""
    entryImportToggle.checked=false
    entryEmbedToggle.checked=false
  }else if(realKind==="station"){
    setEntryType("station")
    entryNameInput.value=item?.name||item?.title||""
    entryImageInput.value=item?.image||item?.img||""
    entryInfoInput.value=item?.info||""
    setVideoUrlsInEditor([])
    entryRefererInput.value=""
    entryImportToggle.checked=false
    entryEmbedToggle.checked=false
  }else{
    setEntryType("video")
    entryNameInput.value=item?.name||item?.title||""
    entryImageInput.value=item?.image||item?.img||""
    entryInfoInput.value=item?.info||""
    setVideoUrlsInEditor(getItemSourceEntries(item).map(x=>x.url))
    entryRefererInput.value=item?.referer||""
    entryUserAgentInput.value=item?.userAgent||item?.headers?.["user-agent"]||item?.headers?.["User-Agent"]||""
    entryHeadersInput.value=headersToText(item)
    entryDrmKeysInput.value=drmKeysToText(item)
    entryImportToggle.checked=!!item?.import
    entryEmbedToggle.checked=isEmbedStation(item)
  }

  addEntryBtn.textContent="Guardar cambios"
  updateEditorActionButtons()
  scrollBrowserToTop()
}

function clearEditorForm(){
  editingItemRef=null
  if(cancelEditBtn) cancelEditBtn.classList.add("hidden")
  editingParentNode=null
  editingKind=""
  entryNameInput.value=""
  entryImageInput.value=""
  entryInfoInput.value=""
  setVideoUrlsInEditor([])
  entryRefererInput.value=""
  entryUserAgentInput.value=""
  entryHeadersInput.value=""
  entryDrmKeysInput.value=""
  entryImportToggle.checked=false
  entryEmbedToggle.checked=false
  addEntryBtn.textContent="Añadir aquí"
  updateEditorActionButtons()
}

function cloneEditorItem(item){
  if(!item) return null
  return structuredClone(item)
}

function getEditorTargetArray(kind, node){
  if(!node) return null

  if(kind==="group"){
    if(isStationContainer(node)) return null
    if(!Array.isArray(node.groups)) node.groups=[]
    return node.groups
  }

  if(kind==="station"){
    if(isStationContainer(node)){
      if(!Array.isArray(node.stations)) node.stations=[]
      return node.stations
    }

    if(!Array.isArray(node.groups)) node.groups=[]
    return node.groups
  }

  if(!Array.isArray(node.stations)) node.stations=[]
  return node.stations
}

function canPasteEditorClipboard(node=getCurrentNode()){
  if(!editorClipboardItem || !editorClipboardKind) return false
  return Array.isArray(getEditorTargetArray(editorClipboardKind, node))
}

function updateEditorActionButtons(){
  const hasEditingItem=!!editingItemRef && !!editingParentNode && !!editingKind
  const canPaste=canPasteEditorClipboard(getCurrentNode())

  if(editorCutBtn) editorCutBtn.disabled=!hasEditingItem
  if(editorCopyBtn) editorCopyBtn.disabled=!hasEditingItem
  if(editorPasteBtn) editorPasteBtn.disabled=!canPaste
  if(editorDeleteBtn){
    editorDeleteBtn.disabled=!hasEditingItem
    editorDeleteBtn.classList.toggle("hidden", !hasEditingItem)
  }
}

function storeEditorClipboardFromCurrent(mode="copy"){
  if(!editingItemRef || !editingParentNode || !editingKind){
    setDebug("Primero abre un elemento en editar.")
    return false
  }

  editorClipboardItem=cloneEditorItem(editingItemRef)
  editorClipboardKind=editingKind
  editorClipboardMode=mode==="cut" ? "cut" : "copy"
  updateEditorActionButtons()
  return true
}

function cutEditingItem(){
  if(!storeEditorClipboardFromCurrent("cut")) return

  let arr=null
  if(editingKind==="group") arr=editingParentNode.groups
  else if(editingKind==="station" || editingKind==="video") arr=editingParentNode.stations

  if(!Array.isArray(arr)){
    setDebug("No se pudo cortar el elemento.")
    return
  }

  const idx=arr.indexOf(editingItemRef)
  if(idx<0){
    setDebug("No se pudo cortar el elemento.")
    return
  }

  arr.splice(idx,1)
  clearEditorForm()
  renderLibraryList()
  renderBrowser()
  saveLibrariesSoon()
  setDebug("Elemento cortado. Ve a la carpeta destino y pulsa Pegar.")
}

function copyEditingItem(){
  if(!storeEditorClipboardFromCurrent("copy")) return
  setDebug("Elemento copiado. Ve a la carpeta destino y pulsa Pegar.")
}

function pasteClipboardItem(){
  const lib=currentLibrary()
  const node=getCurrentNode()

  if(!lib || !node){
    setDebug("Abre una carpeta de destino antes de pegar.")
    return
  }

  if(!editorClipboardItem || !editorClipboardKind){
    setDebug("No hay nada copiado o cortado.")
    return
  }

  const targetArr=getEditorTargetArray(editorClipboardKind, node)
  if(!Array.isArray(targetArr)){
    setDebug("Ese tipo de elemento no se puede pegar aquí.")
    return
  }

  const pasted=cloneEditorItem(editorClipboardItem)
  targetArr.push(pasted)

  if(editorClipboardMode==="cut"){
    editorClipboardItem=null
    editorClipboardKind=""
    editorClipboardMode="copy"
  }

  renderLibraryList()
  renderBrowser()
  saveLibrariesSoon()
  updateEditorActionButtons()
  setDebug("Elemento pegado.")
}

function deleteEditingItemFromEditor(){
  if(!editingItemRef || !editingParentNode || !editingKind){
    setDebug("Primero abre un elemento en editar.")
    return
  }

  const itemName=editingItemRef.name || editingItemRef.title || "este elemento"
  if(!window.confirm(`¿Seguro que quieres borrar "${itemName}"?`)) return

  deleteBrowserItem(editingItemRef, editingKind, editingParentNode)
  clearEditorForm()
  setDebug("Elemento borrado.")
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
  if(item===editingItemRef) clearEditorForm()
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

  function visitGroupNode(node, stack, pathParts){
    if(!node) return

    const groups=Array.isArray(node.groups) ? node.groups : []
    const stations=Array.isArray(node.stations) ? node.stations : []

    for(const child of groups){
      const childName=child?.name || "Carpeta"
      const childPath=[...pathParts, childName]

      if(Array.isArray(child?.groups)){
        const nextStack=[...stack, child]

        if(itemSearchName(child).includes(normalizedTerm)){
          results.push({
            kind:"group",
            data:child,
            stack:nextStack,
            pathLabel:makePathLabel(childPath),
            matchLabel:childName
          })
        }

        visitGroupNode(child, nextStack, childPath)
      }else if(isStationContainer(child)){
        const nextStack=[...stack, child]

        if(itemSearchName(child).includes(normalizedTerm)){
          results.push({
            kind:"station",
            data:child,
            stack:nextStack,
            pathLabel:makePathLabel(childPath),
            matchLabel:childName
          })
        }

        visitStationNode(child, nextStack, childPath)
      }
    }

    for(const videoItem of stations){
      const videoName=videoItem?.name || videoItem?.title || "Vídeo"

      if(itemSearchName(videoItem).includes(normalizedTerm)){
        results.push({
          kind:"video",
          data:videoItem,
          stack:[...stack],
          pathLabel:makePathLabel([...pathParts, videoName]),
          matchLabel:videoName
        })
      }
    }
  }

  function visitStationNode(node, stack, pathParts){
    if(!node) return

    const entries=Array.isArray(node.stations) ? node.stations : []

    for(const child of entries){
      const childName=child?.name || child?.title || "Elemento"

      if(isStationContainer(child)){
        const nextStack=[...stack, child]
        const nextPath=[...pathParts, childName]

        if(itemSearchName(child).includes(normalizedTerm)){
          results.push({
            kind:"station",
            data:child,
            stack:nextStack,
            pathLabel:makePathLabel(nextPath),
            matchLabel:childName
          })
        }

        visitStationNode(child, nextStack, nextPath)
      }else if(isPlayableLeaf(child)){
        if(itemSearchName(child).includes(normalizedTerm)){
          results.push({
            kind:"video",
            data:child,
            stack:[...stack],
            pathLabel:makePathLabel([...pathParts, childName]),
            matchLabel:childName
          })
        }
      }
    }
  }

  if(isStationContainer(startNode)) visitStationNode(startNode, baseStack, [])
  else visitGroupNode(startNode, baseStack, [])

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

  const sourceEntries = orderItemSourceEntries(
    getItemSourceEntries(item),
    Number.isInteger(options?.preferredServerIndex) ? options.preferredServerIndex : null,
    !!options?.onlyPreferredServer
  )

  const firstSourceUrl = String(sourceEntries[0]?.url || "").trim()

  if (!firstSourceUrl) {
    showPlayerEmpty("Vídeo no válido")
    setDebug("No hay URL para reproducir.")
    return
  }

  const sameItem = isCurrentItem(item)
  if (sameItem && !options.force) {
    setDebug("Relanzando el mismo vídeo...")
  }

  const requestId = startOpenRequest()

  currentItemKey = makeItemKey(item)

  showPlayerEmpty("Cargando o resolviendo vídeo...")
  nowPlayingEl.textContent = item?.name || item?.title || "Reproduciendo"
  setCurrentInfo(findNearestInfoForItem(item))
  renderBrowser()

  const triedLabels=[]
  let lastManualResolveUrl=""
  let lastManualResolveReferer=""

  for(const source of sourceEntries){
    if(!isOpenRequestCurrent(requestId)) return

    const originalUrl=String(source?.url || "").trim()
    if(!originalUrl) continue

    triedLabels.push(source.label)
    lastManualResolveUrl=originalUrl
    lastManualResolveReferer=item?.referer || ""

    setDebug(`URL recibida al pinchar:\n${originalUrl}\n\nProbando ${source.label}...`)

    if (/^ace:\/\//i.test(originalUrl)) {
      setDebug(`URL recibida al pinchar:\n${originalUrl}\n\n${source.label} usa AceStream y no está soportado aquí.`)
      continue
    }

    if(isYoutubeUrl(originalUrl)){
      if(!isOpenRequestCurrent(requestId)) return
      setCheckingStatus(item?.url || originalUrl, originalUrl)
      markActiveStatus("ok")
      playYoutubeUrl(originalUrl, item?.name || item?.title || "YouTube")
      return
    }

    if(isGoogleDriveUrl(originalUrl)){
      const previewUrl=getGoogleDrivePreviewUrl(originalUrl)

      if(!isOpenRequestCurrent(requestId)) return

      if(previewUrl){
        setCheckingStatus(item?.url || originalUrl, originalUrl)
        markActiveStatus("ok")
        currentPlayableTitle=item?.name || item?.title || "Google Drive"
        nowPlayingEl.textContent=item?.name || item?.title || "Google Drive"
        showPlayerLoaded()
        showEmbedFrame(previewUrl)
        setDebug(`Reproduciendo ${source.label} en Google Drive preview:\n${previewUrl}`)
        return
      }

      continue
    }

    if(isKrakenEmbedUrl(originalUrl)){
      if(!isOpenRequestCurrent(requestId)) return

      setCheckingStatus(item?.url || originalUrl, originalUrl)
      markActiveStatus("ok")
      currentPlayableTitle=item?.name || item?.title || "Krakenfiles"
      nowPlayingEl.textContent=item?.name || item?.title || "Krakenfiles"
      showPlayerLoaded()
      showEmbedFrame(originalUrl)
      setDebug(`Reproduciendo ${source.label} dentro del panel con el reproductor embebido de Krakenfiles:\n${originalUrl}`)
      return
    }

if (isEmbedStation(item)) {
  if(!isOpenRequestCurrent(requestId)) return

  showManualResolve(
    originalUrl,
    item?.name || item?.title || "",
    item?.referer || "",
    item
  )

  setDebug(`URL recibida al pinchar:
${originalUrl}

${source.label} requiere captcha / continue manual.
Pulsa el botón para abrir la ventana.`)

  return
}

    let urlToPlay = originalUrl

    if (needsResolution(originalUrl)) {
      setDebug(`🔍 Resolviendo ${source.label}...`)
      urlToPlay = await resolveStreamUrl(originalUrl, item?.referer || "")
      if(!isOpenRequestCurrent(requestId)) return
    }

    if (!urlToPlay) {
      clearResolveCache(makeResolveCacheKey(originalUrl, item?.referer || ""))
      continue
    }

    if (urlToPlay === originalUrl && needsResolution(originalUrl)) {
      clearResolveCache(makeResolveCacheKey(originalUrl, item?.referer || ""))
      continue
    }

    if(!isOpenRequestCurrent(requestId)) return

    setCheckingStatus(item?.url || originalUrl, urlToPlay)

    const resolvedFromHost = needsResolution(originalUrl)
    const resolvedIsDirectMedia = isDirectMediaUrl(urlToPlay)

    setDebug(`✅ ${source.label} resuelta a:
${urlToPlay}`)

    playUrl(
      urlToPlay,
      item?.name || item?.title || "",
      resolvedFromHost
        ? {
            ...item,
            _resolvedFromHost: !resolvedIsDirectMedia,
            referer: item?.referer || originalUrl
          }
        : item
    )
    return
  }

  if(!isOpenRequestCurrent(requestId)) return

  clearResolveCache(makeResolveCacheKey(item?.url || firstSourceUrl, item?.referer || ""))
  applyStatusToUrlPair("dead", item?.url || firstSourceUrl, firstSourceUrl)
  showPlayerEmpty("Vídeo no válido o enlace muerto")

  if(!isGoogleDriveUrl(lastManualResolveUrl || firstSourceUrl)){
    showManualResolve(lastManualResolveUrl || firstSourceUrl, item?.name || item?.title || "", lastManualResolveReferer || "", item)
  }

  setDebug(`No se pudo reproducir ninguna opción.\nProbados: ${triedLabels.join(", ") || "ninguno"}`)
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
    (isEditModeOn()
      ? '<details class="card-menu browser-item-menu">'+
          '<summary class="menu-btn" type="button">⋮</summary>'+
          '<div class="menu-pop">'+
            '<button class="btn small edit-item" type="button">Editar</button>'+
          '</div>'+
        '</details>'
      : '')+
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

card.querySelector(".edit-item")?.addEventListener("click",(e)=>{
  e.stopPropagation()
  fillEditorFromItem(item, result.kind, getCurrentNode())
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

    let meta=""
    if(isGroup){
      const counts=countGroupChildItems(item)
      meta=[
        counts.folders ? counts.folders+" carpetas" : "",
        counts.videos ? counts.videos+" vídeos" : ""
      ].filter(Boolean).join(" · ")
    }else if(stationContainer){
      const counts=countStationChildItems(item)
      meta=[
        counts.folders ? counts.folders+" carpetas" : "",
        counts.videos ? counts.videos+" vídeos" : ""
      ].filter(Boolean).join(" · ")
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
        (isEditModeOn() ? '<details class="card-menu browser-item-menu"><summary class="menu-btn" type="button">⋮</summary><div class="menu-pop"><button class="btn small move-left" type="button">Mover izda</button><button class="btn small move-right" type="button">Mover dcha</button>'+getServerMenuButtonsHtml(item)+'<button class="btn small edit-item" type="button">Editar</button></div></details>' : '')+
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
    card.querySelectorAll(".choose-server").forEach(btn=>{
      btn.addEventListener("click", async (e)=>{
        e.stopPropagation()
        closeAllLibraryMenus()
        await openStation(item, {
          force: true,
          preferredServerIndex: Number(btn.dataset.serverIndex),
          onlyPreferredServer: true
        })
      })
    })

    card.querySelector(".edit-item")?.addEventListener("click",(e)=>{
      e.stopPropagation()
      fillEditorFromItem(item, editorKind, node)
    })

    browserGrid.appendChild(card)
  }
}
async function addEntryAtCurrentNode(){
  const lib=currentLibrary(), node=getCurrentNode()
  if(!lib || !node){ setDebug("No hay biblioteca actual."); return }

  normalizeUrlFieldsFromCombinedInput(false)

  const name=entryNameInput.value.trim()
  const image=entryImageInput.value.trim()
  const info=entryInfoInput.value.trim()
  const urls=getVideoUrlsFromEditor()
  const url=urls[0]||""
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
      if(!Array.isArray(editingItemRef.stations)) editingItemRef.stations=[]

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
      if(!url){ setDebug("Pon al menos una URL."); return }

      const previousUrls=getItemSourceEntries(editingItemRef).map(x=>String(x.url||"").trim()).filter(Boolean)

      editingItemRef.name=name
      editingItemRef.image=image
      editingItemRef.url=url

      Object.keys(editingItemRef).forEach(key=>{
        if(/^url\d+$/i.test(key)) delete editingItemRef[key]
      })

      urls.slice(1).forEach((extraUrl, idx)=>{
        editingItemRef[`url${idx+2}`]=extraUrl
      })

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

      if(urls.some(u => needsResolution(u))) editingItemRef.isHost=true
      else delete editingItemRef.isHost

      delete editingItemRef.groups
      delete editingItemRef.stations

      const currentUrls=urls.map(v=>String(v||"").trim()).filter(Boolean)
      const changed =
        previousUrls.length!==currentUrls.length ||
        previousUrls.some((v, i)=>v!==currentUrls[i])

      if(changed){
        previousUrls.forEach(prevUrl=>{
          clearLinkStatus(prevUrl)
          clearResolveCache(prevUrl)
          clearResolveCache(makeResolveCacheKey(prevUrl, referer))
        })

        currentUrls.forEach(nextUrl=>{
          clearLinkStatus(nextUrl)
          clearResolveCache(nextUrl)
          clearResolveCache(makeResolveCacheKey(nextUrl, referer))
        })
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
    if(isStationContainer(node)){ setDebug("Dentro de una station no puedes crear groups."); return }
    if(!Array.isArray(node.groups)) node.groups=[]

    const newGroup={name, image, groups:[]}
    if(info) newGroup.info=info

    node.groups.push(newGroup)

  }else if(newEntryType==="station"){
    const newStation={name, image, stations:[]}
    if(info) newStation.info=info

    if(isStationContainer(node)){
      if(!Array.isArray(node.stations)) node.stations=[]
      node.stations.push(newStation)
    }else{
      if(!Array.isArray(node.groups)) node.groups=[]
      node.groups.push(newStation)
    }

  }else{
    if(!url){ setDebug("Pon al menos una URL."); return }

    const newVideo={ name, image, url }

    urls.slice(1).forEach((extraUrl, idx)=>{
      newVideo[`url${idx+2}`]=extraUrl
    })

    if(info) newVideo.info=info
    if(referer) newVideo.referer=referer
    if(userAgent) newVideo.userAgent=userAgent
    if(entryImportToggle.checked) newVideo.import=true
    if(entryEmbedToggle.checked) newVideo.embed=true

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

    if(urls.some(u => needsResolution(u))) newVideo.isHost=true

    if(!Array.isArray(node.stations)) node.stations=[]
    node.stations.push(newVideo)
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
  if(type==="video"){
    ensureAtLeastOneUrlField()
    syncUrlFieldButtons()
  }
  updateEditorActionButtons()
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
on(importUrlBtn,"click",async ()=>{ const url=importUrlInput.value.trim(); if(!url) return; await importFromUrl(url); importUrlInput.value=""; showImportUrlBox(false); closeLibraryAddMenu() })
on(exportCurrentBtn,"click",()=>{ const lib=currentLibrary(); if(!lib){setDebug("No hay biblioteca actual."); return}; const blob=new Blob([JSON.stringify(lib.data,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=(lib.title||"biblioteca")+".json"; a.click(); URL.revokeObjectURL(a.href) })
on(importFileOptionBtn,"click",()=>{ closeLibraryAddMenu(); importFile?.click() })
on(importUrlOptionBtn,"click",()=>{ closeLibraryAddMenu(); showImportUrlBox(true) })
on(cancelEditBtn,"click",()=>{ clearEditorForm(); setEntryType("group") })
on(editorCutBtn,"click",()=>{ closeAllLibraryMenus(); cutEditingItem() })
on(editorCopyBtn,"click",()=>{ closeAllLibraryMenus(); copyEditingItem() })
on(editorPasteBtn,"click",()=>{ closeAllLibraryMenus(); pasteClipboardItem() })
on(editorDeleteBtn,"click",()=>{ closeAllLibraryMenus(); deleteEditingItemFromEditor() })
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
on(sidebarToggleBtn,"click",()=>{
  setSidebarCollapsed(!appRoot?.classList.contains("sidebar-collapsed"))
  requestAnimationFrame(updateCollapsedLibraryScrollButtons)
})

on(collapsedScrollUpBtn,"click",()=>{
  if(!collapsedLibraryIcons) return
  collapsedLibraryIcons.scrollBy({ top:-220, behavior:"smooth" })
})

on(collapsedScrollDownBtn,"click",()=>{
  if(!collapsedLibraryIcons) return
  collapsedLibraryIcons.scrollBy({ top:220, behavior:"smooth" })
})

on(collapsedLibraryIcons,"scroll",updateCollapsedLibraryScrollButtons)
window.addEventListener("resize", updateCollapsedLibraryScrollButtons)
document.addEventListener("click", (e)=>{
  if(libraryAddMenu && !libraryAddMenu.contains(e.target)) closeLibraryAddMenu()
  if(sidebarOptionsMenu && !sidebarOptionsMenu.contains(e.target)) sidebarOptionsMenu.removeAttribute("open")
})
on(typeGroupBtn,"click",()=>setEntryType("group"))
on(typeStationBtn,"click",()=>setEntryType("station"))
on(typeVideoBtn,"click",()=>setEntryType("video"))
on(addUrlFieldBtn,"click",()=>appendVideoUrlField(""))
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

  playUrl(resolved, pendingManualResolveTitle || "Reproduciendo", pendingManualResolveItem)
})
on(infoToggleBtn,"click",()=>toggleCurrentInfo())
on(debugToggleBtn,"click",()=>toggleDebugPanel())
on(menuAutoplayToggle,"change",()=>{ if(autoplayToggle) autoplayToggle.checked=menuAutoplayToggle.checked; saveSettings() })
on(editModeToggle,"change",()=>{ applyVisibilitySettings(); saveSettings() })
on(showResolverToggle,"change",()=>{ applyVisibilitySettings(); saveSettings() })
renderDebugVisibility()
updateEditorActionButtons()

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
on(subsBtn,"click",toggleSubtitles)
on(muteBtn,"click",()=>{ showVolumePanel(); video.muted=!video.muted; updateMuteLabel() })
on(fullscreenBtn,"click",toggleFullscreen)
on(volumeRange,"input",()=>{ showVolumePanel(); applyVolume(); saveSettings() })
on(volumeWrap,"mouseenter",showVolumePanel)
on(volumeWrap,"mouseleave",hideVolumePanelSoon)
on(muteBtn,"focus",showVolumePanel)
on(volumeRange,"focus",showVolumePanel)
on(volumeRange,"blur",hideVolumePanelSoon)
on(autoplayToggle,"change",()=>{ syncMenuToggles(); saveSettings() })
on(rememberToggle,"change",saveSettings)
on(progressRange,"input",()=>{ const d=video.duration||0; video.currentTime=d*(progressRange.value/100) })
on(playerWrap,"mousemove",showControlsTemporarily)
on(playerWrap,"mouseleave",()=>{ if(!video.paused) playerWrap.classList.add('controls-hidden') })
on(playerWrap,"click",showControlsTemporarily)

video.ontimeupdate=()=>{ const c=video.currentTime||0, d=video.duration||0; progressRange.value=d?(c/d)*100:0; timeLabel.textContent=format(c)+" / "+format(d); if(rememberToggle.checked){ const src=video.currentSrc || video.src; if(src) saveProgress(src,video.currentTime) } }
video.onplay=()=>{ updatePlayLabel(); showControlsTemporarily(); markActiveStatus("ok") }
video.onpause=()=>{ updatePlayLabel(); keepControlsVisible() }
video.onended=async ()=>{ updatePlayLabel(); keepControlsVisible(); if(autoplayToggle.checked){ const ok=await playNextInCurrentNode(); if(!ok) setDebug("Fin de la lista.") } }
video.onvolumechange=updateMuteLabel
video.onerror=()=>{ markActiveStatus("dead") }
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
document.addEventListener("keydown",(e)=>{ const tag=(document.activeElement&&document.activeElement.tagName||"").toLowerCase(); if(tag==="input"||tag==="textarea")return; if(e.key==="ArrowLeft"){ e.preventDefault(); jumpBy(-getJumpSeconds()) } if(e.key==="ArrowRight"){ e.preventDefault(); jumpBy(getJumpSeconds()) } if(e.key===" "){ e.preventDefault(); togglePlay() } if(e.key.toLowerCase()==="f"){ e.preventDefault(); toggleFullscreen() } if(e.key==="ArrowUp"){ e.preventDefault(); showVolumePanel(); volumeRange.value=Math.min(100,Number(volumeRange.value)+5); applyVolume(); saveSettings() } if(e.key==="ArrowDown"){ e.preventDefault(); showVolumePanel(); volumeRange.value=Math.max(0,Number(volumeRange.value)-5); applyVolume(); saveSettings() } })

;(async function init(){
  const s=loadSettings()
  autoplayToggle.checked=s.autoplay!==false
  rememberToggle.checked=s.remember!==false
  if(menuAutoplayToggle) menuAutoplayToggle.checked=autoplayToggle.checked
  if(editModeToggle) editModeToggle.checked=s.editMode!==false
  if(showResolverToggle) showResolverToggle.checked=!!s.showResolver
  volumeRange.value=s.volumePercent||100
    syncJumpUi(); applyVolume(); updatePlayLabel(); updateMuteLabel(); updateFullscreenLabel(); updateSubtitleButton(); applyVisibilitySettings(); syncMenuToggles()
  const savedResolver=loadResolverConfig()
  if(savedResolver){
    RESOLVER_CONFIG.useBackend=!!savedResolver.useBackend
    RESOLVER_CONFIG.backendUrl=normalizeBackendUrl(savedResolver.backendUrl || RESOLVER_CONFIG.backendUrl)
  }else{
    RESOLVER_CONFIG.backendUrl=normalizeBackendUrl(RESOLVER_CONFIG.backendUrl)
  }

  if(useBackendToggle){
    syncResolverBackendUi()

    useBackendToggle.addEventListener("change", () => {
      if(useBackendToggle.checked){
        RESOLVER_CONFIG.backendUrl = getDefaultResolverBackendUrl()
      }else{
        const typedValue=normalizeBackendUrl(backendUrlInput?.value || "")
        RESOLVER_CONFIG.backendUrl = typedValue || getDefaultResolverBackendUrl()
      }

      RESOLVER_CONFIG.useBackend = true
      syncResolverBackendUi()
      saveResolverConfig()
      updateResolverStatus()
    })

    if(useBackendToggleMenu){
      useBackendToggleMenu.addEventListener("change", () => {
        if(useBackendToggleMenu.checked){
          RESOLVER_CONFIG.backendUrl = getDefaultResolverBackendUrl()
        }else{
          const typedValue=normalizeBackendUrl(backendUrlInput?.value || "")
          RESOLVER_CONFIG.backendUrl = typedValue || getDefaultResolverBackendUrl()
        }

        RESOLVER_CONFIG.useBackend = true
        syncResolverBackendUi()
        saveResolverConfig()
        updateResolverStatus()
      })
    }

    backendUrlInput.addEventListener("input", () => {
      const typedValue=normalizeBackendUrl(backendUrlInput.value)

      if(!typedValue){
        return
      }

      RESOLVER_CONFIG.backendUrl = typedValue
      RESOLVER_CONFIG.useBackend = true

      const isDefault=typedValue===getDefaultResolverBackendUrl()
      if(useBackendToggle) useBackendToggle.checked=isDefault
      if(useBackendToggleMenu) useBackendToggleMenu.checked=isDefault
    })

    backendUrlInput.addEventListener("change", () => {
      const typedValue=normalizeBackendUrl(backendUrlInput.value)

      RESOLVER_CONFIG.backendUrl = typedValue || getDefaultResolverBackendUrl()
      RESOLVER_CONFIG.useBackend = true

      syncResolverBackendUi()
      saveResolverConfig()
      updateResolverStatus()
    })
  }

  updateResolverStatus()
  applyVisibilitySettings()
  syncMenuToggles()
  setSidebarCollapsed(!!s.sidebarCollapsed)
  renderCollapsedLibraryIcons()
  requestAnimationFrame(updateCollapsedLibraryScrollButtons)
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
