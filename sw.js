const CACHE='nerdopoles-v0.9-live-board';
const APP_SHELL=['/','/index.html','/manifest.webmanifest','/icons/icon.svg','/assets/nerdopoles-menu.jpg','/assets/nerdopoles-config.jpg','/assets/nerdopoles-board-01.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
      const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('/index.html',copy));return response;
    }).catch(()=>caches.match('/index.html')));
    return;
  }
  event.respondWith(fetch(event.request,{cache:'no-cache'}).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request)));
});