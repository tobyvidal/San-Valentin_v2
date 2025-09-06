// Service Worker para PWA - Nuestra Historia
const CACHE_NAME = 'nuestra-historia-v1.0';
const urlsToCache = [
    './',
    './app.html',
    './Files css/app.css',
    './Files JS/app.js',
    './Files JS/firebase-config.js',
    './Files JS/imgbbAPIconfig.js',
    './favicon.ico',
    './favicon-16x16.png',
    './favicon-32x32.png',
    './apple-touch-icon.png',
    './android-chrome-192x192.png',
    './android-chrome-512x512.png',
    './site.webmanifest'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
    console.log('📦 Service Worker: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📂 Cache abierto');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('❌ Error cargando cache:', error);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker: Activado');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Eliminando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Intercepción de peticiones
self.addEventListener('fetch', (event) => {
    // Solo manejar peticiones GET
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Estrategia: Cache First para archivos estáticos
    if (event.request.url.includes('.css') || 
        event.request.url.includes('.js') || 
        event.request.url.includes('.png') || 
        event.request.url.includes('.jpg') || 
        event.request.url.includes('.ico') ||
        event.request.url.includes('app.html')) {
        
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    if (response) {
                        console.log('📋 Servido desde cache:', event.request.url);
                        return response;
                    }
                    console.log('🌐 Descargando:', event.request.url);
                    return fetch(event.request)
                        .then((response) => {
                            // Verificar si la respuesta es válida
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }
                            
                            // Clonar la respuesta
                            const responseToCache = response.clone();
                            
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                            
                            return response;
                        });
                })
                .catch((error) => {
                    console.error('❌ Error en fetch:', error);
                    // Fallback para páginas
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('./app.html');
                    }
                })
        );
    } else {
        // Estrategia: Network First para APIs y contenido dinámico (Firebase)
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    console.log('🌐 API/Dynamic:', event.request.url);
                    return response;
                })
                .catch((error) => {
                    console.log('🔄 Fallback para:', event.request.url);
                    return caches.match(event.request);
                })
        );
    }
});

// Mensaje del Service Worker
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('🚀 Service Worker de Nuestra Historia cargado');
