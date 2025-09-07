// Imports de Firebase
import { getFirestore, collection, query, orderBy, limit, getDocs, addDoc, where, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";
import { initializeFirebase } from "./firebase-config.js";
import { subirImagen } from './imgbbAPIconfig.js';

// Sistema de navegación SPA
class SPANavigator {
    constructor() {
        this.currentSection = 'home';
        this.isLoading = false;
        this.sections = ['home', 'viajes', 'momentos', 'sobre-ti'];
        this.contentCache = new Map();
        this.currentUser = this.getUserFromURL();
        this.db = null;
        this.countdownInterval = null;
        
        this.initFirebase();
    }



    // Actualizar estado del botón de notificaciones
    updateNotificationButton() {
        const button = document.getElementById('enable-notifications');
        const status = document.getElementById('notification-status');
        
        if (!button || !status) return;
        
        if (!("Notification" in window)) {
            button.textContent = '❌ No soportado';
            button.disabled = true;
            status.textContent = 'Tu navegador no soporta notificaciones';
            status.style.color = '#ff6b6b';
            return;
        }
        
        switch(Notification.permission) {
            case 'granted':
                button.textContent = '✅ Notificaciones Activas';
                button.disabled = true;
                status.textContent = 'Las notificaciones están activadas';
                status.style.color = '#2ed573';
                break;
            case 'denied':
                button.textContent = '� Desbloquear';
                button.disabled = false;
                button.onclick = () => this.showUnblockInstructions();
                status.textContent = 'Notificaciones bloqueadas - toca para ver instrucciones';
                status.style.color = '#ff6b6b';
                break;
            case 'default':
                button.textContent = '🔔 Activar Notificaciones';
                button.disabled = false;
                button.onclick = () => this.requestNotificationPermission();
                status.textContent = 'Toca para activar notificaciones de la app';
                status.style.color = '#ffa502';
                break;
        }
    }

    // Mostrar instrucciones para desbloquear notificaciones
    showUnblockInstructions() {
        const modalHTML = `
            <div id="unblock-modal" class="modern-modal show" onclick="this.remove()">
                <div class="modern-modal-content" onclick="event.stopPropagation()" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2>🔓 Desbloquear Notificaciones</h2>
                        <button class="close-modal" onclick="document.getElementById('unblock-modal').remove()">×</button>
                    </div>
                    
                    <div style="padding: 20px; line-height: 1.6;">
                        <div style="background: rgba(255, 107, 107, 0.1); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                            <p><strong>📱 EN MÓVIL (Chrome/Safari):</strong></p>
                            <ol style="margin: 10px 0 0 20px;">
                                <li>Toca el ícono de <strong>"candado" 🔒</strong> o <strong>"información" ℹ️</strong> en la barra de direcciones</li>
                                <li>Busca <strong>"Notificaciones"</strong> y cámbialo a <strong>"Permitir"</strong></li>
                                <li>Recarga la página</li>
                            </ol>
                        </div>
                        
                        <div style="background: rgba(102, 126, 234, 0.1); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                            <p><strong>💻 EN ESCRITORIO (Chrome):</strong></p>
                            <ol style="margin: 10px 0 0 20px;">
                                <li>Clic en el ícono de <strong>candado 🔒</strong> en la barra de direcciones</li>
                                <li>Cambia <strong>"Notificaciones"</strong> de <strong>"Bloquear"</strong> a <strong>"Permitir"</strong></li>
                                <li>Recarga la página</li>
                            </ol>
                        </div>
                        
                        <div style="background: rgba(255, 165, 2, 0.1); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                            <p><strong>🦊 EN FIREFOX:</strong></p>
                            <ol style="margin: 10px 0 0 20px;">
                                <li>Clic en el <strong>escudo 🛡️</strong> o ícono de información</li>
                                <li>Desbloquea las notificaciones</li>
                                <li>Recarga la página</li>
                            </ol>
                        </div>
                        
                        <div style="background: rgba(46, 213, 115, 0.1); border-radius: 10px; padding: 15px;">
                            <p><strong>⚡ DESPUÉS DE DESBLOQUEAR:</strong></p>
                            <p>Recarga esta página y el botón cambiará a <strong>"🔔 Activar Notificaciones"</strong></p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 20px;">
                            <button class="modern-btn primary" onclick="window.location.reload()" style="margin-right: 10px;">
                                🔄 Recargar Página
                            </button>
                            <button class="modern-btn secondary" onclick="document.getElementById('unblock-modal').remove()">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Función pública para solicitar permisos
    async requestNotificationPermission() {
        if (!("Notification" in window)) {
            alert("Tu navegador no soporta notificaciones push");
            return;
        }
        
        try {
            const permission = await Notification.requestPermission();
            console.log('Nuevo estado de permisos:', permission);
            
            // Actualizar botón
            this.updateNotificationButton();
            
            if (permission === 'granted') {
                // Enviar notificación de prueba
                this.sendNotification(
                    '🎉 ¡Notificaciones Activadas!',
                    'Ahora recibirás notificaciones cuando tu pareja agregue contenido nuevo',
                    '🔔',
                    'test-notification'
                );
                this.showNotification('🔔 Notificaciones activadas correctamente', 'success');
            } else if (permission === 'denied') {
                this.showNotification('🔕 Notificaciones denegadas. Puedes activarlas desde la configuración del navegador.', 'error');
            }
        } catch (error) {
            console.error('Error solicitando permisos:', error);
            this.showNotification('❌ Error solicitando permisos de notificación', 'error');
        }
    }

    // Enviar notificación push
    sendNotification(title, body, icon = '💕', tag = 'san-valentin') {
        console.log('🔔 Intentando enviar notificación:', { title, body, permission: Notification.permission });
        
        // Solo enviar si tenemos permisos
        if (Notification.permission === "granted") {
            try {
                const notification = new Notification(title, {
                    body: body,
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">' + icon + '</text></svg>',
                    tag: tag,
                    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💕</text></svg>',
                    requireInteraction: true,
                    silent: false
                });
                
                // Auto-cerrar después de 8 segundos (más tiempo para verla)
                setTimeout(() => {
                    notification.close();
                }, 8000);
                
                console.log('✅ Notificación enviada exitosamente:', title);
                
                // Mostrar también notificación interna como respaldo
                this.showNotification(`🔔 ${title}: ${body}`, 'info');
                
            } catch (error) {
                console.error('❌ Error enviando notificación:', error);
                // Mostrar notificación interna como fallback
                this.showNotification(`🔔 ${title}: ${body}`, 'info');
            }
        } else {
            console.log('❌ Sin permisos de notificación:', Notification.permission);
            // Mostrar notificación interna como fallback
            this.showNotification(`🔔 ${title}: ${body}`, 'info');
            
            // Si están denegados, recordar al usuario cómo activarlas
            if (Notification.permission === 'denied') {
                setTimeout(() => {
                    this.showNotification('🔓 Las notificaciones están bloqueadas. Toca el botón en el footer para ver cómo activarlas.', 'warning');
                }, 2000);
            }
        }
    }

    // Obtener nombre del usuario para notificaciones
    getNotificationUserName(userId) {
        return userId === 1 ? "Raquel" : userId === 2 ? "Tobi" : `Usuario ${userId}`;
    }

    initFirebase() {
        try {
            const app = initializeFirebase();
            this.db = getFirestore(app);
            console.log('Firebase inicializado correctamente');
            this.init(); // Llamar init después de inicializar Firebase
        } catch (error) {
            console.error('Error inicializando Firebase:', error);
            this.init(); // Inicializar de todos modos
        }
    }

    getUserFromURL() {
        const params = new URLSearchParams(window.location.search);
        const userId = params.get("User_Id");
        return userId ? Number(userId) : 1; // Default user ID
    }

    async init() {
        console.log('Iniciando SPA...');
        await this.showLoadingScreen();
        console.log('Loading screen mostrado');
        await this.setupNavigation();
        console.log('Navegación configurada');
        await this.loadAllContent();
        console.log('Contenido cargado');
        await this.hideLoadingScreen();
        console.log('Loading screen ocultado');
        
        // Detectar sección desde la URL (hash)
        const initialSection = this.getSectionFromURL();
        console.log('Navegando a sección inicial:', initialSection);
        await this.navigateTo(initialSection);
        
        // Si no hay hash en la URL y estamos en home, actualizar la URL
        if (!window.location.hash && initialSection === 'home') {
            window.history.replaceState(null, '', '#home');
        }
        
        // Verificar si hay parámetros de detalle en la URL
        this.checkForDetailParams();
    }

    getSectionFromURL() {
        const hash = window.location.hash.replace('#', '');
        const section = hash.split('&')[0]; // Tomar solo la primera parte antes del &
        if (this.sections.includes(section)) {
            return section;
        }
        return 'home'; // Default
    }

    checkForDetailParams() {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', '').replace(/^[^&]*&/, ''));
        
        const detail = params.get('detail');
        const img = params.get('img');
        const desc = params.get('desc');
        
        if (detail && img && desc) {
            setTimeout(() => {
                const currentSection = this.getSectionFromURL();
                if (currentSection === 'viajes') {
                    this.openViajeDetail(detail, decodeURIComponent(img), decodeURIComponent(desc));
                } else if (currentSection === 'momentos') {
                    this.openMomentoDetail(detail, decodeURIComponent(img), decodeURIComponent(desc));
                }
            }, 500);
        }
    }

    showLoadingScreen() {
        return new Promise(resolve => {
            const loadingScreen = document.querySelector('.loading-screen');
            loadingScreen.classList.remove('hidden');
            setTimeout(resolve, 500);
        });
    }

    async hideLoadingScreen() {
        return new Promise(resolve => {
            const loadingScreen = document.querySelector('.loading-screen');
            const nav = document.getElementById('main-nav');
            const mainContent = document.getElementById('main-content');
            
            loadingScreen.classList.add('hidden');
            
            // Mostrar navegación y contenido principal
            nav.style.display = 'flex';
            mainContent.style.display = 'block';
            
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                resolve();
            }, 500);
        });
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('#main-nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.navigateTo(section);
                // Actualizar URL sin recargar
                window.history.pushState(null, '', `#${section}`);
            });
        });

        // Escuchar cambios en el hash de la URL
        window.addEventListener('hashchange', () => {
            const section = this.getSectionFromURL();
            this.navigateTo(section);
        });

        // Configurar los Floating Action Buttons
        this.setupFloatingActionButtons();
    }

    setupFloatingActionButtons() {
        const fabViajeBtn = document.getElementById('add-viaje-btn');
        const fabMomentoBtn = document.getElementById('add-momento-btn');
        
        if (fabViajeBtn) {
            fabViajeBtn.addEventListener('click', () => {
                this.showAddViajeModal();
            });
        }
        
        if (fabMomentoBtn) {
            fabMomentoBtn.addEventListener('click', () => {
                this.showAddMomentoModal();
            });
        }
    }

    // Función para mostrar/ocultar FABs según la sección
    updateFloatingActionButtons(section) {
        const floatingActions = document.getElementById('floating-actions');
        const fabViajeBtn = document.getElementById('add-viaje-btn');
        const fabMomentoBtn = document.getElementById('add-momento-btn');
        const christmasFooter = document.getElementById('christmas-footer');
        
        if (!floatingActions) return;
        
        // Mostrar FABs solo en las secciones correspondientes
        if (section === 'viajes') {
            floatingActions.style.display = 'flex';
            floatingActions.classList.add('visible');
            floatingActions.classList.remove('hidden');
            
            fabViajeBtn.style.display = 'flex';
            fabMomentoBtn.style.display = 'none';
            
            // Ocultar footer de Navidad
            if (christmasFooter) {
                christmasFooter.style.display = 'none';
            }
        } else if (section === 'momentos') {
            floatingActions.style.display = 'flex';
            floatingActions.classList.add('visible');
            floatingActions.classList.remove('hidden');
            
            fabViajeBtn.style.display = 'none';
            fabMomentoBtn.style.display = 'flex';
            
            // Ocultar footer de Navidad
            if (christmasFooter) {
                christmasFooter.style.display = 'none';
            }
        } else if (section === 'sobre-ti') {
            // Ocultar FABs y mostrar footer de Navidad
            floatingActions.classList.add('hidden');
            floatingActions.classList.remove('visible');
            
            if (christmasFooter) {
                christmasFooter.style.display = 'block';
            }
        } else {
            floatingActions.classList.add('hidden');
            floatingActions.classList.remove('visible');
            
            // Ocultar footer de Navidad
            if (christmasFooter) {
                christmasFooter.style.display = 'none';
            }
        }
    }

    async loadAllContent() {
        console.log('Cargando contenido...');
        try {
            // Precargar todo el contenido para navegación instantánea
            await this.loadHomeContent();
            console.log('Home content cargado');
            await this.loadViajesContent();
            console.log('Viajes content cargado');
            await this.loadMomentosContent();
            console.log('Momentos content cargado');
            await this.loadSobreTiContent();
            console.log('Sobre ti content cargado');
        } catch (error) {
            console.error('Error cargando contenido:', error);
        }
    }

    async loadHomeContent() {
        const content = `
            <h1 class="section-title">💖 Bienvenida mi amor 💖</h1>
            <div class="message-card">
                <p>🌟 <strong>Mi cielo hermoso</strong> 🌟</p>
                <p>Esta aplicación es mi pequeño regalo de amor para ti. Cada sección está llena de nuestros recuerdos más preciosos:</p>
                <ul style="margin-top: 15px; padding-left: 20px;">
                    <li>💕 <strong>Momentos</strong>: Nuestras fotos más especiales juntos</li>
                    <li>✈️ <strong>Viajes</strong>: Todas nuestras aventuras y escapadas</li>
                    <li>🎁 <strong>Sobre Ti</strong>: Una galería dedicada solo a tu belleza</li>
                </ul>
                <p style="margin-top: 20px;">Cada imagen tiene su historia, cada recuerdo su lugar especial en mi corazón. Te amo infinitamente, mi amor hermoso. 💖</p>
            </div>
        `;
        this.contentCache.set('home', content);
    }

    async loadViajesContent() {
        const content = `
            <h1 class="section-title">✈️ Nuestros Viajes</h1>
            <div class="message-card">
                <p>🌍 Aquí están todos nuestros viajes y aventuras juntos. Cada destino tiene una historia especial que recordaremos para siempre.</p>
            </div>
            <div id="viajes-gallery" class="gallery-grid">
                <!-- El contenido se cargará dinámicamente -->
            </div>
        `;
        this.contentCache.set('viajes', content);
    }

    async loadMomentosContent() {
        const content = `
            <h1 class="section-title">💕 Nuestros Momentos</h1>
            <div class="message-card">
                <p>💖 Cada momento contigo es especial. Aquí guardamos nuestros recuerdos más preciosos.</p>
            </div>
            <div id="momentos-gallery" class="gallery-grid">
                <!-- El contenido se cargará dinámicamente -->
            </div>
        `;
        this.contentCache.set('momentos', content);
    }

    async loadSobreTiContent() {
        const content = `
            <h1 class="section-title">¿Por qué vos?</h1>
            
            <div class="sobre-ti-section">
                <img src="imagenes_sobreti/f1.jpeg" alt="Foto 1" loading="lazy">
                <div class="sobre-ti-texto">
                    <p>Vos, porque te hablé por instagram sin esperar nada y simplemente con mensajes te adueñaste de mi corazón.</p>
                </div>
            </div>
            
            <div class="sobre-ti-section">
                <img src="imagenes_sobreti/f2.jpeg" alt="Foto 2" loading="lazy">
                <div class="sobre-ti-texto">
                    <p>Vos, porque sos aquella persona que me transmite paz y tranquilidad.</p>
                </div>
            </div>
            
            <div class="sobre-ti-section">
                <img src="imagenes_sobreti/f3.jpeg" alt="Foto 3" loading="lazy">
                <div class="sobre-ti-texto">
                    <p>Vos, porque me encanta lo familiera que sos, lo buena persona, todo.</p>
                </div>
            </div>
            
            <div class="sobre-ti-section">
                <img src="imagenes_sobreti/f4.jpeg" alt="Foto 4" loading="lazy">
                <div class="sobre-ti-texto">
                    <p>Vos, porque compartis mi mismo humor y me haces reir muchisimo.</p>
                </div>
            </div>
            
            <div class="sobre-ti-section">
                <img src="imagenes_sobreti/f5.jpeg" alt="Foto 5" loading="lazy">
                <div class="sobre-ti-texto">
                    <p>Vos, porque me enamoras cada día más.</p>
                </div>
            </div>
            
            <div class="sobre-ti-section">
                <img src="imagenes_sobreti/cdcddbb6-a55c-4251-b99e-caad812c49a4.jpg" alt="Foto 6" loading="lazy">
                <div class="sobre-ti-texto">
                    <p>Vos, porque desde que me di vuelta y vi tu carita se me quedo tatuada en la memoria.</p>
                </div>
            </div>
            
            <div class="sobre-ti-section">
                <img src="imagenes_sobreti/f7.jpeg" alt="Foto 7" loading="lazy">
                <div class="sobre-ti-texto">
                    <p>Desde el primer momento que te conocí, supe que serías especial en mi vida. Tu sonrisa ilumina mis días.</p>
                </div>
            </div>
            
            <div class="sobre-ti-section">
                <img src="imagenes_sobreti/f8.jpeg" alt="Foto 8" loading="lazy">
                <div class="sobre-ti-texto">
                    <p>Vos, porque haces que horas sean segundos.</p>
                </div>
            </div>
            
            <div class="sobre-ti-section">
                <img src="imagenes_sobreti/f10.jpeg" alt="Foto 10" loading="lazy">
                <div class="sobre-ti-texto">
                    <p>Vos, porque desde que te conocí, tengo alguien a quien contarle mis problemas, alguien a quien contarle mis alegrias, alguien de quien quiero saber siempre, alguien que cada vez que sonrie me endulza el alma...</p>
                    <p>Vos vos y vos, siempre que quieras lo vas a ser princesa.</p>
                </div>
            </div>
        `;
        this.contentCache.set('sobre-ti', content);
    }
    
    // Función para inicializar el contador regresivo de Navidad
    startChristmasCountdown() {
        const updateCountdown = () => {
            const now = new Date().getTime();
            const currentYear = new Date().getFullYear();
            
            // Navidad de este año (25 de diciembre)
            let christmas = new Date(currentYear, 11, 25, 0, 0, 0).getTime();
            
            // Si ya pasó Navidad de este año, usar Navidad del próximo año
            if (now > christmas) {
                christmas = new Date(currentYear + 1, 11, 25, 0, 0, 0).getTime();
            }
            
            const distance = christmas - now;
            
            if (distance > 0) {
                // Calcular tiempo restante
                const months = Math.floor(distance / (1000 * 60 * 60 * 24 * 30.44)); // Promedio de días por mes
                const days = Math.floor((distance % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                
                // Actualizar el DOM
                const monthsEl = document.getElementById('months');
                const daysEl = document.getElementById('days');
                const hoursEl = document.getElementById('hours');
                const minutesEl = document.getElementById('minutes');
                const secondsEl = document.getElementById('seconds');
                
                if (monthsEl) monthsEl.textContent = months.toString().padStart(2, '0');
                if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
                if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
                if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
                if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
            } else {
                // Es Navidad!
                const elements = ['months', 'days', 'hours', 'minutes', 'seconds'];
                elements.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = '00';
                });
                
                const titleEl = document.querySelector('.countdown-title');
                if (titleEl) {
                    titleEl.textContent = '🎄🎁 ¡Es hora de abrir tu regalo de Navidad! 🎁🎄';
                }
            }
        };
        
        // Actualizar inmediatamente y luego cada segundo
        updateCountdown();
        return setInterval(updateCountdown, 1000);
    }

    async navigateTo(sectionName) {
        console.log(`Navegando a: ${sectionName}, currentSection: ${this.currentSection}, isLoading: ${this.isLoading}`);
        
        // Permitir navegación inicial aunque sea la misma sección
        const isInitialNavigation = !document.querySelector('#main-content .section.active');
        
        if (this.isLoading || (sectionName === this.currentSection && !isInitialNavigation)) return;
        
        this.isLoading = true;
        
        // Actualizar navegación visual
        this.updateNavigation(sectionName);
        
        // Actualizar botones flotantes
        this.updateFloatingActionButtons(sectionName);
        
        // Transición suave entre secciones
        await this.performSectionTransition(sectionName);
        
        // Cargar contenido específico
        await this.loadSectionData(sectionName);
        
        this.currentSection = sectionName;
        this.isLoading = false;
    }

    updateNavigation(sectionName) {
        const navLinks = document.querySelectorAll('#main-nav a');
        navLinks.forEach(link => {
            if (link.getAttribute('data-section') === sectionName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    async performSectionTransition(newSection) {
        const mainContent = document.getElementById('main-content');
        const currentSectionEl = mainContent.querySelector('.section.active');
        
        // Crear nueva sección
        const newSectionEl = document.createElement('div');
        newSectionEl.className = 'section';
        newSectionEl.setAttribute('data-section', newSection);
        newSectionEl.innerHTML = this.contentCache.get(newSection);
        
        mainContent.appendChild(newSectionEl);
        
        // Animación de transición
        if (currentSectionEl) {
            // Slide out current section
            currentSectionEl.classList.add('slide-out-left');
            
            setTimeout(() => {
                currentSectionEl.remove();
            }, 500);
            
            // Slide in new section después de un delay
            setTimeout(() => {
                newSectionEl.classList.add('active');
            }, 50);
        } else {
            // Primera carga - mostrar inmediatamente la sección
            newSectionEl.classList.add('active');
        }
        
        return new Promise(resolve => setTimeout(resolve, 300));
    }

    async loadSectionData(sectionName) {
        switch(sectionName) {
            case 'viajes':
                await this.loadViajesData();
                break;
            case 'momentos':
                await this.loadMomentosData();
                break;
            case 'sobre-ti':
                // Inicializar contador regresivo de Navidad
                setTimeout(() => {
                    if (this.countdownInterval) {
                        clearInterval(this.countdownInterval);
                    }
                    this.countdownInterval = this.startChristmasCountdown();
                }, 100);
                break;
        }
    }

    async loadViajesData() {
        try {
            const viajesContainer = document.getElementById('viajes-gallery');
            if (!viajesContainer) return;

            // Mostrar loading
            viajesContainer.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Cargando viajes...</div>
                </div>
            `;

            // Verificar si Firebase está disponible
            if (!this.db) {
                viajesContainer.innerHTML = `
                    <div class="empty-state">
                        <h3>✈️ Firebase no disponible</h3>
                        <p>Los viajes se cargarán cuando se conecte la base de datos</p>
                    </div>
                `;
                return;
            }

            // Obtener viajes desde Firebase (sin filtro de usuario - contenido compartido)
            const viajesCollection = collection(this.db, "Viajes");
            const q = query(viajesCollection, orderBy("Imagen_Id", "desc"));
            const querySnapshot = await getDocs(q);

            let viajesHTML = '';
            
            if (querySnapshot.empty) {
                viajesHTML = `
                    <div class="empty-state">
                        <h3>✈️ Aún no tienes viajes</h3>
                        <p>¡Crea tu primer viaje juntos!</p>
                    </div>
                `;
            } else {
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    viajesHTML += `
                        <div class="gallery-item" onclick="spa.openViajeDetail('` + data.Imagen_Id + `', '` + data.Img + `', '` + (data.Descrip || '') + `')">
                            <div class="item-actions">
                                <button class="delete-item-btn" onclick="event.stopPropagation(); spa.deleteItemConfirm('` + doc.id + `', 'viaje', '` + (data.Destino || 'Viaje') + `');" title="Eliminar viaje">🗑️</button>
                            </div>
                            <div class="carousel-container">
                                <div class="carousel">
                                    <div class="carousel-slide">
                                        <img src="${data.Img}" alt="${data.Descrip}" loading="lazy">
                                    </div>
                                </div>
                            </div>
                            <h3>${data.Destino || 'Viaje Especial'}</h3>
                            <p>${data.Descrip || 'Un momento increíble'}</p>
                            <small>📅 ${data.Fecha || 'Fecha especial'}</small>
                        </div>
                    `;
                });
            }

            viajesContainer.innerHTML = viajesHTML;
            
            // Aplicar detección de orientación automática a los carouseles de viajes
            setTimeout(() => {
                try {
                    const carousels = viajesContainer.querySelectorAll('.carousel-container');
                    carousels.forEach((carousel) => {
                        if (this.applyImageOrientationDetection && typeof this.applyImageOrientationDetection === 'function') {
                            this.applyImageOrientationDetection(carousel);
                        } else {
                            console.warn('Función applyImageOrientationDetection no disponible');
                        }
                    });
                } catch (error) {
                    console.warn('Error aplicando detección de orientación:', error);
                }
            }, 300);
        } catch (error) {
            console.error('Error cargando viajes:', error);
            const viajesContainer = document.getElementById('viajes-gallery');
            if (viajesContainer) {
                viajesContainer.innerHTML = `
                    <div class="error-state">
                        <h3>❌ Error al cargar viajes</h3>
                        <p>Intenta recargar la página</p>
                    </div>
                `;
            }
        }
    }

    async loadMomentosData() {
        try {
            const momentosContainer = document.getElementById('momentos-gallery');
            if (!momentosContainer) return;

            // Mostrar loading
            momentosContainer.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Cargando momentos...</div>
                </div>
            `;

            // Obtener momentos desde Firebase (sin filtro de usuario - contenido compartido)
            const momentosCollection = collection(this.db, "Instantes");
            const q = query(momentosCollection, orderBy("IdInstante", "desc"));
            const querySnapshot = await getDocs(q);

            let momentosHTML = '';
            
            if (querySnapshot.empty) {
                momentosHTML = `
                    <div class="empty-state">
                        <h3>💕 Aún no tienes momentos</h3>
                        <p>¡Crea tu primer momento especial!</p>
                    </div>
                `;
            } else {
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    momentosHTML += `
                        <div class="gallery-item" onclick="spa.openMomentoDetail('` + data.IdInstante + `', '` + data.Img + `', '` + (data.Descrip || '') + `')">
                            <div class="item-actions">
                                <button class="delete-item-btn" onclick="event.stopPropagation(); spa.deleteItemConfirm('` + doc.id + `', 'momento', 'Momento');" title="Eliminar momento">🗑️</button>
                            </div>
                            <div class="carousel-container">
                                <div class="carousel">
                                    <div class="carousel-slide">
                                        <img src="${data.Img}" alt="${data.Descrip}" loading="lazy">
                                    </div>
                                </div>
                            </div>
                            <h3>Momento Especial</h3>
                            <p>${data.Descrip || 'Un momento increíble'}</p>
                            <small>📅 ${data.Fecha || 'Fecha especial'}</small>
                        </div>
                    `;
                });
            }

            momentosContainer.innerHTML = momentosHTML;
            
            // Aplicar detección de orientación automática a los carouseles de momentos
            setTimeout(() => {
                try {
                    const carousels = momentosContainer.querySelectorAll('.carousel-container');
                    carousels.forEach((carousel) => {
                        if (this.applyImageOrientationDetection && typeof this.applyImageOrientationDetection === 'function') {
                            this.applyImageOrientationDetection(carousel);
                        } else {
                            console.warn('Función applyImageOrientationDetection no disponible');
                        }
                    });
                } catch (error) {
                    console.warn('Error aplicando detección de orientación:', error);
                }
            }, 300);
        } catch (error) {
            console.error('Error cargando momentos:', error);
            const momentosContainer = document.getElementById('momentos-gallery');
            if (momentosContainer) {
                momentosContainer.innerHTML = `
                    <div class="error-state">
                        <h3>❌ Error al cargar momentos</h3>
                        <p>Intenta recargar la página</p>
                    </div>
                `;
            }
        }
    }

    async loadSobreTiData() {
        try {
            const sobretiContainer = document.getElementById('sobreti-gallery');
            if (!sobretiContainer) return;
            
            sobretiContainer.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Cargando fotos hermosas...</div>
                </div>
            `;

            // Cargar imágenes desde la carpeta local
            const imageFiles = [
                'f1.jpeg', 'f2.jpeg', 'f3.jpeg', 'f4.jpeg', 'f5.jpeg',
                'f6.jpeg', 'f7.jpeg', 'f8.jpeg', 'f9.jpeg', 'f10.jpeg'
            ];

            const descriptions = [
                { title: "Hermosa como siempre", desc: "Tu sonrisa ilumina mi mundo" },
                { title: "Radiante", desc: "Cada día más bella" },
                { title: "Perfecta", desc: "No existe palabra que te defina" },
                { title: "Angelical", desc: "Un ángel en la tierra" },
                { title: "Deslumbrante", desc: "Tu belleza me quita el aliento" },
                { title: "Única", desc: "No hay nadie como tú" },
                { title: "Preciosa", desc: "Mi obra de arte favorita" },
                { title: "Maravillosa", desc: "Eres todo lo que amo" },
                { title: "Espectacular", desc: "Mi razón de ser feliz" },
                { title: "Divina", desc: "Perfecta en todos los sentidos" }
            ];

            let sobretiHTML = '';
            
            imageFiles.forEach((fileName, index) => {
                const desc = descriptions[index] || { title: "Hermosa", desc: "Siempre perfecta" };
                sobretiHTML += `
                    <div class="sobreti-item">
                        <img src="imagenes_sobreti/${fileName}" alt="Foto ${index + 1}" 
                             onclick="spa.openPhotoModal(\`imagenes_sobreti/\${fileName}\`)" 
                             loading="lazy"
                             onerror="this.style.display='none'">
                        <div class="photo-description">
                            <h4>${desc.title}</h4>
                            <p>${desc.desc}</p>
                        </div>
                    </div>
                `;
            });

            sobretiContainer.innerHTML = sobretiHTML;
        } catch (error) {
            console.error('Error cargando fotos sobre ti:', error);
            const sobretiContainer = document.getElementById('sobreti-gallery');
            if (sobretiContainer) {
                sobretiContainer.innerHTML = `
                    <div class="error-state">
                        <h3>❌ Error al cargar fotos</h3>
                        <p>Algunas imágenes no están disponibles</p>
                    </div>
                `;
            }
        }
    }

    // Métodos para modales y funcionalidades adicionales
    openViajeDetail(viajeId, img, descrip) {
        console.log('Abriendo detalle de viaje:', viajeId);
        // En lugar de redireccionar, mostramos un modal detallado
        this.showDetailModal('viaje', {
            id: viajeId,
            img: img,
            descrip: descrip,
            type: 'viajes'
        });
    }

    openMomentoDetail(momentoId, img, descrip) {
        console.log('Abriendo detalle de momento:', momentoId);
        // En lugar de redireccionar, mostramos un modal detallado
        this.showDetailModal('momento', {
            id: momentoId,
            img: img,
            descrip: descrip,
            type: 'momentos'
        });
    }

    openPhotoModal(src) {
        const modal = document.createElement('div');
        modal.className = 'photo-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <img src="${src}" alt="Foto ampliada">
            </div>
        `;
        document.body.appendChild(modal);
        
        // Animación de entrada
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
    }

    async showDetailModal(type, data) {
        const modalHTML = `
            <div class="modern-modal detail-modal" id="detail-modal">
                <div class="modern-modal-content detail-content">
                    <div class="modal-header">
                        <h2>${type === 'viaje' ? '✈️ Detalle del Viaje' : '💕 Detalle del Momento'}</h2>
                        <span class="close-modal" onclick="spa.closeDetailModal()">&times;</span>
                    </div>
                    <div class="detail-body">
                        <div class="detail-carousel-container">
                            <div class="detail-carousel" id="detail-carousel">
                                <!-- Las imágenes se cargarán aquí -->
                            </div>
                            <button class="carousel-nav prev" onclick="spa.moveDetailSlide(-1)">‹</button>
                            <button class="carousel-nav next" onclick="spa.moveDetailSlide(1)">›</button>
                        </div>
                        <div class="detail-info">
                            <h3 id="detail-description">${data.descrip}</h3>
                            <div class="detail-actions">
                                <button class="modern-btn" onclick="spa.showAddImageToDetail('` + data.id + `', '` + type + `')">➕ Agregar Imagen</button>
                                <button class="modern-btn primary" onclick="spa.showBulkUploadModal('` + data.id + `', '` + type + `')">📷 Subir Múltiples</button>
                                <button class="modern-btn danger" onclick="spa.deleteCurrentDetailImage('` + type + `')">🗑️ Eliminar Imagen</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Cargar imágenes del detalle
        await this.loadDetailImages(data.id, data.type);
        
        // Mostrar modal
        const modal = document.getElementById('detail-modal');
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    async loadDetailImages(itemId, collectionName) {
        try {
            const carousel = document.getElementById('detail-carousel');
            carousel.innerHTML = '<div class="loading-spinner"></div>';

            let queryField, imageCollection, itemType;
            
            if (collectionName === 'viajes') {
                // Para viajes, buscar en Imagenes_Viaje por Viaje_Id
                imageCollection = collection(this.db, "Imagenes_Viaje");
                queryField = "Viaje_Id";
                itemType = "viaje";
            } else {
                // Para momentos, buscar en Imagenes_Instantes por Imagen_Id
                imageCollection = collection(this.db, "Imagenes_Instantes");
                queryField = "Imagen_Id";
                itemType = "momento";
            }

            const q = query(imageCollection, where(queryField, "==", Number(itemId)));
            const querySnapshot = await getDocs(q);

            let imagesHTML = '';
            let imageCount = 0;

            if (querySnapshot.empty) {
                imagesHTML = '<div class="empty-state"><p>No hay imágenes adicionales disponibles</p></div>';
                // Si no hay imágenes adicionales, mantener la descripción original
                const descriptionElement = document.getElementById('detail-description');
                if (descriptionElement) {
                    // La descripción original ya está establecida en el HTML del modal
                    console.log('No hay imágenes adicionales, manteniendo descripción original');
                }
            } else {
                // Ordenar por Orden si existe
                const sortedDocs = querySnapshot.docs
                    .map(doc => doc.data())
                    .sort((a, b) => (b.Orden || 0) - (a.Orden || 0));

                sortedDocs.forEach((data) => {
                    if (data.Img) {
                        imagesHTML += `
                            <div class="carousel-slide" data-img-url="${data.Img}" data-description="${data.Descrip || 'Sin descripción'}">
                                <img src="${data.Img}" alt="${data.Descrip || 'Imagen'}" loading="lazy">
                                <div class="image-overlay">
                                    <button class="comment-btn" onclick="spa.showCommentsModal('` + (data.id || data.Imagen_Id) + `', 'imagen', '` + itemType + `')" title="Ver comentarios">
                                        💬
                                    </button>
                                </div>
                            </div>
                        `;
                        imageCount++;
                    }
                });
            }

            carousel.innerHTML = imagesHTML;
            
            // Aplicar detección de orientación automática
            setTimeout(() => {
                try {
                    const carouselContainer = document.querySelector('.detail-carousel-container');
                    if (carouselContainer && this.applyImageOrientationDetection && typeof this.applyImageOrientationDetection === 'function') {
                        this.applyImageOrientationDetection(carouselContainer);
                    } else {
                        console.warn('Función applyImageOrientationDetection no disponible en modal');
                    }
                } catch (error) {
                    console.warn('Error aplicando detección de orientación en modal:', error);
                }
            }, 300);
            
            // Inicializar carousel
            this.detailSlideIndex = 0;
            this.detailSlides = carousel.querySelectorAll('.carousel-slide');
            this.updateDetailCarousel();

            // Mostrar/ocultar controles de navegación
            const prevBtn = document.querySelector('#detail-modal .carousel-nav.prev');
            const nextBtn = document.querySelector('#detail-modal .carousel-nav.next');
            
            if (imageCount <= 1) {
                if (prevBtn) prevBtn.style.display = 'none';
                if (nextBtn) nextBtn.style.display = 'none';
            } else {
                if (prevBtn) prevBtn.style.display = 'flex';
                if (nextBtn) nextBtn.style.display = 'flex';
            }

        } catch (error) {
            console.error('Error cargando imágenes del detalle:', error);
            const carousel = document.getElementById('detail-carousel');
            if (carousel) {
                carousel.innerHTML = '<div class="error-state"><p>Error cargando imágenes</p></div>';
            }
        }
    }

    closeDetailModal() {
        const modal = document.getElementById('detail-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    moveDetailSlide(direction) {
        if (!this.detailSlides || this.detailSlides.length === 0) return;
        
        // CORRECCIÓN: Cambiar la dirección para que sea intuitiva
        // Si direction es 1 (flecha derecha >), vamos a la siguiente imagen (índice mayor)
        // Si direction es -1 (flecha izquierda <), vamos a la imagen anterior (índice menor)
        this.detailSlideIndex = (this.detailSlideIndex + direction + this.detailSlides.length) % this.detailSlides.length;
        this.updateDetailCarousel();
    }

    updateDetailCarousel() {
        if (!this.detailSlides || this.detailSlides.length === 0) {
            console.log('No hay slides para actualizar');
            return;
        }
        
        const carousel = document.getElementById('detail-carousel');
        // CORRECCIÓN: El desplazamiento debe ser negativo para mover hacia la derecha
        const offset = -this.detailSlideIndex * 100;
        carousel.style.transform = `translateX(${offset}%)`;
        
        // Actualizar dinámicamente el contenedor del modal basado en la orientación de la imagen actual
        const currentSlide = this.detailSlides[this.detailSlideIndex];
        const modalContent = document.querySelector('.detail-modal .modern-modal-content');
        const carouselContainer = document.querySelector('.detail-carousel-container');
        
        if (currentSlide && modalContent && carouselContainer) {
            // Actualizar la descripción de la imagen actual
            const currentDescription = currentSlide.getAttribute('data-description');
            const descriptionElement = document.getElementById('detail-description');
            if (descriptionElement && currentDescription) {
                descriptionElement.textContent = currentDescription;
                console.log('Descripción actualizada:', currentDescription);
            }
            
            // Remover clases anteriores del modal
            modalContent.classList.remove('landscape-modal', 'portrait-modal', 'square-modal');
            carouselContainer.classList.remove('landscape-container', 'portrait-container', 'square-container');
            
            // Detectar orientación de la imagen actual y ajustar modal
            if (currentSlide.classList.contains('landscape-image')) {
                modalContent.classList.add('landscape-modal');
                carouselContainer.classList.add('landscape-container');
            } else if (currentSlide.classList.contains('square-image')) {
                modalContent.classList.add('square-modal');
                carouselContainer.classList.add('square-container');
            } else {
                modalContent.classList.add('portrait-modal');
                carouselContainer.classList.add('portrait-container');
            }
        }
    }

    // Función para detectar orientación de imagen y ajustar contenedor
    detectImageOrientation(img, container) {
        console.log('detectImageOrientation llamada para img:', img?.src);
        const checkOrientation = () => {
            if (img.naturalWidth && img.naturalHeight) {
                const isPortrait = img.naturalHeight > img.naturalWidth;
                const isSquare = Math.abs(img.naturalWidth - img.naturalHeight) / Math.min(img.naturalWidth, img.naturalHeight) < 0.1;
                
                // Remover clases anteriores
                container.classList.remove('portrait-image', 'landscape-image', 'square-image');
                
                if (isSquare) {
                    container.classList.add('square-image');
                } else if (isPortrait) {
                    container.classList.add('portrait-image');
                } else {
                    container.classList.add('landscape-image');
                }
                
                console.log(`Imagen detectada: ${isSquare ? 'Cuadrada' : isPortrait ? 'Vertical' : 'Horizontal'} (${img.naturalWidth}x${img.naturalHeight})`);
            }
        };

        if (img.complete && img.naturalWidth !== 0) {
            checkOrientation();
        } else {
            img.onload = checkOrientation;
            img.onerror = () => {
                console.warn('Error al cargar imagen, usando orientación por defecto');
                container.classList.add('portrait-image'); // Por defecto vertical para móviles
            };
        }
    }

    // Función para aplicar detección de orientación a todas las imágenes del carousel
    applyImageOrientationDetection(carouselContainer) {
        console.log('applyImageOrientationDetection llamada para contenedor:', carouselContainer);
        const slides = carouselContainer.querySelectorAll('.carousel-slide');
        console.log('Slides encontrados:', slides.length);
        slides.forEach((slide) => {
            const img = slide.querySelector('img');
            if (img) {
                this.detectImageOrientation(img, slide);
            }
        });
    }

    showAddViajeModal() {
        this.showModal('viaje');
    }

    showAddMomentoModal() {
        this.showModal('momento');
    }

    showAddImageToDetail(itemId, itemType) {
        console.log('Agregando imagen al detalle:', itemId, itemType);
        // Por ahora, usar el modal existente pero adaptado para agregar imagen a detalle
        const modalHTML = `
            <div class="modern-modal" id="add-image-modal">
                <div class="modern-modal-content">
                    <div class="modal-header">
                        <h2>📷 Agregar Imagen al ${itemType === 'viaje' ? 'Viaje' : 'Momento'}</h2>
                        <span class="close-modal" onclick="spa.closeModal()">&times;</span>
                    </div>
                    <form id="add-image-form" class="modal-form">
                        <div class="form-group">
                            <label for="image-description">📝 Descripción de la imagen:</label>
                            <textarea id="image-description" name="description" rows="3" 
                                     placeholder="Describe esta imagen especial..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="image-file">🖼️ Seleccionar Imagen:</label>
                            <input type="file" id="image-file" name="image" accept="image/*" required>
                            <div class="file-preview" id="image-preview"></div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="modern-btn" onclick="spa.closeModal()">❌ Cancelar</button>
                            <button type="submit" class="modern-btn">💾 Agregar Imagen</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById('add-image-modal').classList.add('show');

        // Configurar preview de imagen
        const fileInput = document.getElementById('image-file');
        const preview = document.getElementById('image-preview');
        
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; border-radius: 10px;">`;
                };
                reader.readAsDataURL(file);
            }
        });

        // Manejar submit del formulario
        document.getElementById('add-image-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddImageToDetail(itemId, itemType);
        });
    }

    async handleAddImageToDetail(itemId, itemType) {
        console.log('Procesando nueva imagen para:', itemId, itemType);
        
        const submitBtn = document.querySelector('#add-image-form button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : '💾 Agregar Imagen';
        
        try {
            // Obtener los datos del formulario
            const description = document.getElementById('image-description').value.trim();
            const fileInput = document.getElementById('image-file');
            const file = fileInput.files[0];
            
            if (!file) {
                alert('Por favor selecciona una imagen');
                return;
            }
            
            // Mostrar loading
            if (submitBtn) {
                submitBtn.textContent = '⏳ Subiendo...';
                submitBtn.disabled = true;
            }
            
            // Subir imagen a ImgBB
            console.log('Subiendo imagen a ImgBB...');
            const imageUrl = await subirImagen(file);
            console.log('Imagen subida exitosamente:', imageUrl);
            
            // Determinar la colección y campos según el tipo
            let collectionName, idField;
            if (itemType === 'viaje') {
                collectionName = "Imagenes_Viaje";
                idField = "Viaje_Id";
            } else {
                collectionName = "Imagenes_Instantes";
                idField = "Imagen_Id";
            }
            
            // Obtener el último orden de manera más simple (sin índice compuesto)
            console.log('Obteniendo último orden...');
            const allDocsQuery = query(
                collection(this.db, collectionName), 
                where(idField, "==", Number(itemId))
            );
            
            const querySnapshot = await getDocs(allDocsQuery);
            let nuevoOrden = 1;
            
            // Calcular manualmente el máximo orden
            if (!querySnapshot.empty) {
                let maxOrden = 0;
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.Orden && data.Orden > maxOrden) {
                        maxOrden = data.Orden;
                    }
                });
                nuevoOrden = maxOrden + 1;
            }
            
            console.log('Nuevo orden calculado:', nuevoOrden);
            
            // Crear el documento para insertar
            const nuevoDoc = {
                [idField]: Number(itemId),
                Img: imageUrl,
                Orden: nuevoOrden,
                Descrip: description || 'Sin descripción'
            };
            
            // Insertar en Firebase
            console.log('Insertando en Firebase:', nuevoDoc);
            await addDoc(collection(this.db, collectionName), nuevoDoc);
            console.log('Imagen agregada exitosamente a Firebase');
            
            // Restaurar botón antes de cerrar
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                console.log('Botón restaurado');
            }
            
            // Cerrar modal de agregar imagen (no el detail modal)
            console.log('Cerrando modal de agregar imagen...');
            const addImageModal = document.getElementById('add-image-modal');
            if (addImageModal) {
                addImageModal.remove();
            }
            
            // Mostrar notificación de éxito
            console.log('Mostrando notificación...');
            this.showNotification(`✅ Imagen agregada exitosamente al ${itemType}!`, 'success');
            
            // Recargar las imágenes del detail modal inmediatamente
            setTimeout(async () => {
                console.log('Recargando imágenes del modal...');
                const detailModal = document.getElementById('detail-modal');
                if (detailModal) {
                    await this.loadDetailImages(itemId, itemType + 's'); // 'viajes' o 'momentos'
                    console.log('Imágenes recargadas');
                }
            }, 500);
            
        } catch (error) {
            console.error('Error al agregar imagen:', error);
            this.showNotification('❌ Error al agregar la imagen: ' + error.message, 'error');
            
            // Restaurar botón
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    // Función para mostrar modal de carga múltiple
    showBulkUploadModal(itemId, itemType) {
        console.log('Abriendo modal de carga múltiple:', itemId, itemType);
        
        const modalHTML = `
            <div class="modern-modal" id="bulk-upload-modal">
                <div class="modern-modal-content bulk-modal">
                    <div class="modal-header">
                        <h2>📷 Subir Múltiples Imágenes al ${itemType === 'viaje' ? 'Viaje' : 'Momento'}</h2>
                        <span class="close-modal" onclick="spa.closeModal()">&times;</span>
                    </div>
                    <form id="bulk-upload-form" class="modal-form">
                        <div class="form-group">
                            <label for="bulk-images">🖼️ Seleccionar Múltiples Imágenes:</label>
                            <input type="file" id="bulk-images" name="images" accept="image/*" multiple required>
                            <p class="help-text">💡 Puedes seleccionar varias imágenes a la vez. La descripción será opcional para todas.</p>
                        </div>
                        <div class="form-group">
                            <label for="bulk-description">📝 Descripción general (opcional):</label>
                            <textarea id="bulk-description" name="description" rows="2" 
                                     placeholder="Descripción que se aplicará a todas las imágenes (opcional)..."></textarea>
                        </div>
                        <div class="bulk-preview" id="bulk-preview">
                            <!-- Las previews aparecerán aquí -->
                        </div>
                        <div class="upload-progress" id="upload-progress" style="display: none;">
                            <div class="progress-bar">
                                <div class="progress-fill" id="progress-fill"></div>
                            </div>
                            <div class="progress-text" id="progress-text">Preparando...</div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="modern-btn" onclick="spa.closeModal()">❌ Cancelar</button>
                            <button type="submit" class="modern-btn primary" id="bulk-submit-btn">🚀 Subir Todas</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById('bulk-upload-modal').classList.add('show');

        // Configurar preview múltiple
        const fileInput = document.getElementById('bulk-images');
        const preview = document.getElementById('bulk-preview');
        
        fileInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                preview.innerHTML = '';
                files.forEach((file, index) => {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const imgDiv = document.createElement('div');
                        imgDiv.className = 'bulk-image-preview';
                        imgDiv.innerHTML = `
                            <img src="${e.target.result}" alt="Preview ${index + 1}">
                            <span class="image-number">${index + 1}</span>
                        `;
                        preview.appendChild(imgDiv);
                    };
                    reader.readAsDataURL(file);
                });
            }
        });

        // Manejar submit del formulario
        document.getElementById('bulk-upload-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleBulkUpload(itemId, itemType);
        });
    }

    // Función para manejar la subida múltiple
    async handleBulkUpload(itemId, itemType) {
        console.log('Procesando subida múltiple para:', itemId, itemType);
        
        const submitBtn = document.getElementById('bulk-submit-btn');
        const progressContainer = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        try {
            // Obtener los datos del formulario
            const description = document.getElementById('bulk-description').value.trim();
            const fileInput = document.getElementById('bulk-images');
            const files = Array.from(fileInput.files);
            
            if (files.length === 0) {
                alert('Por favor selecciona al menos una imagen');
                return;
            }
            
            // Mostrar loading y progress
            submitBtn.textContent = '⏳ Subiendo...';
            submitBtn.disabled = true;
            progressContainer.style.display = 'block';
            
            // Determinar la colección y campos según el tipo
            let collectionName, idField;
            if (itemType === 'viaje') {
                collectionName = "Imagenes_Viaje";
                idField = "Viaje_Id";
            } else {
                collectionName = "Imagenes_Instantes";
                idField = "Imagen_Id";
            }
            
            // Obtener el último orden existente
            console.log('Obteniendo último orden...');
            const allDocsQuery = query(
                collection(this.db, collectionName), 
                where(idField, "==", Number(itemId))
            );
            
            const querySnapshot = await getDocs(allDocsQuery);
            let nuevoOrden = 1;
            
            if (!querySnapshot.empty) {
                let maxOrden = 0;
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.Orden && data.Orden > maxOrden) {
                        maxOrden = data.Orden;
                    }
                });
                nuevoOrden = maxOrden + 1;
            }
            
            const totalFiles = files.length;
            let uploadedFiles = 0;
            
            // Subir cada imagen
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // Actualizar progreso
                progressText.textContent = `Subiendo imagen ${i + 1} de ${totalFiles}...`;
                progressFill.style.width = `${(i / totalFiles) * 100}%`;
                
                try {
                    // Subir imagen a ImgBB
                    console.log(`Subiendo imagen ${i + 1}/${totalFiles} a ImgBB...`);
                    const imageUrl = await subirImagen(file);
                    console.log('Imagen subida exitosamente:', imageUrl);
                    
                    // Crear el documento para insertar
                    const nuevoDoc = {
                        [idField]: Number(itemId),
                        Img: imageUrl,
                        Orden: nuevoOrden + i,
                        Descrip: description || 'Sin descripción'
                    };
                    
                    // Insertar en Firebase
                    console.log('Insertando en Firebase:', nuevoDoc);
                    await addDoc(collection(this.db, collectionName), nuevoDoc);
                    console.log(`Imagen ${i + 1} agregada exitosamente a Firebase`);
                    
                    uploadedFiles++;
                    
                } catch (error) {
                    console.error(`Error subiendo imagen ${i + 1}:`, error);
                    // Continuar con las demás imágenes
                }
                
                // Actualizar progreso
                progressFill.style.width = `${((i + 1) / totalFiles) * 100}%`;
            }
            
            // Completar progreso
            progressText.textContent = `¡Completado! ${uploadedFiles}/${totalFiles} imágenes subidas exitosamente`;
            progressFill.style.width = '100%';
            
            // Restaurar botón
            submitBtn.textContent = '✅ ¡Completado!';
            
            // Cerrar modal de subida múltiple después de un momento
            setTimeout(() => {
                const bulkModal = document.getElementById('bulk-upload-modal');
                if (bulkModal) {
                    bulkModal.remove();
                }
            }, 2000);
            
            // Mostrar notificación de éxito
            this.showNotification(`✅ ${uploadedFiles} imágenes agregadas exitosamente al ${itemType}!`, 'success');
            
            // Recargar las imágenes del detail modal inmediatamente
            setTimeout(async () => {
                console.log('Recargando imágenes del modal...');
                const detailModal = document.getElementById('detail-modal');
                if (detailModal) {
                    await this.loadDetailImages(itemId, itemType + 's'); // 'viajes' o 'momentos'
                    console.log('Imágenes recargadas');
                }
            }, 1000);
            
        } catch (error) {
            console.error('Error en subida múltiple:', error);
            this.showNotification('❌ Error en la subida múltiple: ' + error.message, 'error');
            
            // Restaurar botón
            submitBtn.textContent = '🚀 Subir Todas';
            submitBtn.disabled = false;
            progressContainer.style.display = 'none';
        }
    }

    // Función para mostrar modal de comentarios
    async showCommentsModal(itemId, commentType, parentType) {
        console.log('Abriendo modal de comentarios:', itemId, commentType, parentType);
        
        // Cerrar modal existente si hay uno
        const existingModal = document.getElementById('comments-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modalHTML = `
            <div id="comments-modal" class="modern-modal show" onclick="this.remove()">
                <div class="modern-modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2>💬 Comentarios de la Imagen</h2>
                        <button class="close-modal" onclick="document.getElementById('comments-modal').remove()">×</button>
                    </div>
                    
                    <div class="comments-container">
                        <div id="comments-list" class="comments-list">
                            <div class="loading-comments">Cargando comentarios... ⏳</div>
                        </div>
                        
                        <div class="comment-form">
                            <textarea 
                                id="new-comment-text" 
                                placeholder="¿Qué opinas de esta imagen? Escribe tu comentario aquí..." 
                                rows="3"
                                maxlength="500"
                            ></textarea>
                            <div class="comment-form-actions">
                                <span class="char-counter">0/500</span>
                                <button 
                                    id="submit-comment-btn" 
                                    class="modern-btn primary" 
                                    onclick="spa.submitComment('` + itemId + `', '` + commentType + `', '` + parentType + `')"
                                >
                                    💬 Agregar Comentario
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Agregar modal al DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Verificar que se insertó correctamente y forzar visibilidad
        setTimeout(() => {
            const modal = document.getElementById('comments-modal');
            console.log('Modal de comentarios insertado:', modal);
            
            if (modal) {
                modal.style.display = 'flex';
                modal.style.opacity = '1';
                modal.style.visibility = 'visible';
                console.log('Modal forzado a visible');
            }
        }, 10);
        
        // Configurar contador de caracteres
        const textarea = document.getElementById('new-comment-text');
        const charCounter = document.querySelector('.char-counter');
        
        if (textarea && charCounter) {
            textarea.addEventListener('input', (e) => {
                const length = e.target.value.length;
                charCounter.textContent = `${length}/500`;
                charCounter.style.color = length > 450 ? '#ff4757' : '#2f3542';
            });
        }
        
        // Cargar comentarios existentes
        await this.loadComments(itemId, commentType, parentType);
    }

    // Función para obtener el nombre del usuario
    getUserName(userId) {
        const userNames = {
            1: "Raquel",
            2: "Tobi"
        };
        return userNames[userId] || `Usuario ${userId}`;
    }

    // Función para cargar comentarios (solo para imágenes específicas)
    async loadComments(itemId, commentType, parentType) {
        console.log('Cargando comentarios para imagen:', itemId, commentType, parentType);
        
        try {
            // Consulta simplificada para comentarios de imágenes específicas
            const commentsQuery = query(
                collection(this.db, "Comentarios"),
                where("Item_Id", "==", itemId),
                where("Tipo_Comentario", "==", "imagen")
            );
            
            const querySnapshot = await getDocs(commentsQuery);
            const commentsList = document.getElementById('comments-list');
            
            // Ordenar por fecha (más recientes primero)
            const sortedComments = [];
            querySnapshot.forEach((doc) => {
                sortedComments.push({
                    id: doc.id,
                    data: doc.data()
                });
            });
            
            sortedComments.sort((a, b) => {
                const dateA = a.data.Fecha_Creacion ? a.data.Fecha_Creacion.toDate() : new Date(0);
                const dateB = b.data.Fecha_Creacion ? b.data.Fecha_Creacion.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
            
            if (sortedComments.length === 0) {
                commentsList.innerHTML = `
                    <div class="no-comments">
                        <p>💭 No hay comentarios en esta imagen aún. ¡Sé la primera en comentar!</p>
                    </div>
                `;
                return;
            }
            
            let commentsHTML = '';
            sortedComments.forEach((commentDoc) => {
                const comment = commentDoc.data;
                const fecha = comment.Fecha_Creacion ? 
                    comment.Fecha_Creacion.toDate().toLocaleString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }) : 'Fecha no disponible';
                
                const userName = this.getUserName(comment.User_Id || 1);
                
                commentsHTML += `
                    <div class="comment-item" data-comment-id="${commentDoc.id}">
                        <div class="comment-header">
                            <span class="comment-user">� ${userName}</span>
                            <span class="comment-date">${fecha}</span>
                            <button class="delete-comment-btn" onclick="spa.deleteComment('` + commentDoc.id + `', '` + itemId + `', '` + commentType + `', '` + parentType + `')" title="Eliminar comentario">
                                🗑️
                            </button>
                        </div>
                        <div class="comment-text">${comment.Texto}</div>
                    </div>
                `;
            });
            
            commentsList.innerHTML = commentsHTML;
            
        } catch (error) {
            console.error('Error cargando comentarios:', error);
            document.getElementById('comments-list').innerHTML = `
                <div class="error-message">
                    ❌ Error cargando comentarios: ${error.message}
                </div>
            `;
        }
    }

    // Función para enviar comentario
    async submitComment(itemId, commentType, parentType) {
        console.log('Enviando comentario:', itemId, commentType, parentType);
        
        const textarea = document.getElementById('new-comment-text');
        const submitBtn = document.getElementById('submit-comment-btn');
        const commentText = textarea.value.trim();
        
        if (!commentText) {
            alert('Por favor escribe un comentario');
            return;
        }
        
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando... ⏳';
            
            // Crear documento del comentario
            const commentData = {
                Item_Id: itemId,
                Tipo_Comentario: commentType, // 'imagen'
                Tipo_Padre: parentType, // 'viaje' o 'momento'
                Texto: commentText,
                User_Id: this.currentUser, // User_Id del usuario actual
                Fecha_Creacion: serverTimestamp()
            };
            
            // Guardar en Firebase
            await addDoc(collection(this.db, "Comentarios"), commentData);
            
            // Limpiar formulario
            textarea.value = '';
            document.querySelector('.char-counter').textContent = '0/500';
            
            // Recargar comentarios
            await this.loadComments(itemId, commentType, parentType);
            
            // Mostrar notificación de éxito
            this.showNotification('💬 ¡Comentario agregado exitosamente!', 'success');
            
        } catch (error) {
            console.error('Error enviando comentario:', error);
            this.showNotification('❌ Error enviando comentario: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '💬 Agregar Comentario';
        }
    }

    // Función para eliminar comentario
    async deleteComment(commentId, itemId, commentType, parentType) {
        console.log('Eliminando comentario:', commentId);
        
        const confirmacion = confirm('¿Estás segura de que quieres eliminar este comentario?');
        if (!confirmacion) return;
        
        try {
            await deleteDoc(doc(this.db, "Comentarios", commentId));
            await this.loadComments(itemId, commentType, parentType);
            this.showNotification('🗑️ Comentario eliminado', 'success');
        } catch (error) {
            console.error('Error eliminando comentario:', error);
            this.showNotification('❌ Error eliminando comentario: ' + error.message, 'error');
        }
    }

    async deleteCurrentDetailImage(itemType) {
        console.log('Eliminando imagen actual del tipo:', itemType);
        
        try {
            // Confirmar con el usuario
            const confirmacion = confirm(`¿Estás segura de que quieres eliminar esta imagen del ${itemType}?`);
            if (!confirmacion) {
                console.log('Eliminación cancelada por el usuario.');
                return;
            }
            
            // Obtener la imagen actual del carousel
            const currentSlide = this.detailSlides[this.detailSlideIndex];
            if (!currentSlide) {
                alert('No hay imagen seleccionada para eliminar');
                return;
            }
            
            const imageUrl = currentSlide.getAttribute('data-img-url');
            if (!imageUrl) {
                alert('No se pudo obtener la URL de la imagen');
                return;
            }
            
            console.log('Eliminando imagen:', imageUrl);
            
            // Determinar la colección según el tipo
            let collectionName;
            if (itemType === 'viaje') {
                collectionName = "Imagenes_Viaje";
            } else {
                collectionName = "Imagenes_Instantes";
            }
            
            // Buscar y eliminar la imagen de Firebase
            const imgCollection = collection(this.db, collectionName);
            const q = query(imgCollection, where("Img", "==", imageUrl));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                console.warn("No se encontró la imagen en la base de datos.");
                alert('No se encontró la imagen en la base de datos');
                return;
            }
            
            // Eliminar cada documento que coincida (por si hay duplicados)
            const deletePromises = [];
            querySnapshot.forEach((documento) => {
                deletePromises.push(deleteDoc(doc(this.db, collectionName, documento.id)));
            });
            
            await Promise.all(deletePromises);
            console.log('Imagen eliminada exitosamente de Firebase');
            
            // Mostrar notificación
            this.showNotification(`✅ Imagen eliminada del ${itemType}`, 'success');
            
            // Recargar las imágenes del modal
            setTimeout(async () => {
                const detailModal = document.getElementById('detail-modal');
                if (detailModal) {
                    // Obtener el ID del item desde el modal actual
                    const modalTitle = document.querySelector('#detail-modal .modal-header h2');
                    if (modalTitle && modalTitle.textContent.includes('Viaje')) {
                        const currentData = this.getCurrentDetailData();
                        if (currentData) {
                            await this.loadDetailImages(currentData.id, 'viajes');
                        }
                    } else {
                        const currentData = this.getCurrentDetailData();
                        if (currentData) {
                            await this.loadDetailImages(currentData.id, 'momentos');
                        }
                    }
                }
            }, 1000);
            
        } catch (error) {
            console.error('Error al eliminar imagen:', error);
            this.showNotification('❌ Error al eliminar la imagen', 'error');
        }
    }
    
    // Función auxiliar para obtener datos del modal actual
    getCurrentDetailData() {
        // Intentar obtener datos desde los botones del modal
        const addButton = document.querySelector('#detail-modal .detail-actions button[onclick*="showAddImageToDetail"]');
        if (addButton) {
            const onclick = addButton.getAttribute('onclick');
            const matches = onclick.match(/showAddImageToDetail\('([^']+)',\s*'([^']+)'\)/);
            if (matches) {
                return {
                    id: matches[1],
                    type: matches[2]
                };
            }
        }
        return null;
    }
    
    // Función para confirmar eliminación de viaje/momento completo
    deleteItemConfirm(itemId, itemType, itemName) {
        const message = `¿Estás segura de que quieres eliminar este ${itemType}?\n\n"${itemName}"\n\n⚠️ Se eliminarán todas las imágenes asociadas. Esta acción no se puede deshacer.`;
        
        if (confirm(message)) {
            this.deleteItem(itemId, itemType);
        }
    }
    
    // Función para eliminar un viaje o momento completo
    async deleteItem(itemId, itemType) {
        try {
            this.showNotification('🗑️ Eliminando...', 'info');
            
            // Determinar las colecciones correctas
            const mainCollection = itemType === 'viaje' ? 'Viajes' : 'Instantes';
            const imageCollection = itemType === 'viaje' ? 'Imagenes_Viaje' : 'Imagenes_Instantes';
            
            // 1. Eliminar todas las imágenes asociadas primero
            const imageQuery = query(
                collection(this.db, imageCollection),
                where("IdViaje", "==", itemId)
            );
            const imageSnapshot = await getDocs(imageQuery);
            
            const deleteImagePromises = [];
            imageSnapshot.forEach((doc) => {
                deleteImagePromises.push(deleteDoc(doc.ref));
            });
            
            if (deleteImagePromises.length > 0) {
                await Promise.all(deleteImagePromises);
                console.log(`Eliminadas ${deleteImagePromises.length} imágenes asociadas`);
            }
            
            // 2. Eliminar el viaje/momento principal
            await deleteDoc(doc(this.db, mainCollection, itemId));
            
            this.showNotification(`✅ ${itemType === 'viaje' ? 'Viaje' : 'Momento'} eliminado correctamente`, 'success');
            
            // 3. Cerrar modal si está abierto
            this.closeModal();
            
            // 4. Recargar la sección actual
            setTimeout(() => {
                if (itemType === 'viaje') {
                    this.loadViajes();
                } else {
                    this.loadMomentos();
                }
            }, 1000);
            
        } catch (error) {
            console.error('Error al eliminar:', error);
            this.showNotification('❌ Error al eliminar', 'error');
        }
    }
    
    // Función para mostrar notificaciones modernas
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Estilos inline para la notificación
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'linear-gradient(135deg, #4CAF50, #45a049)' : 
                          type === 'error' ? 'linear-gradient(135deg, #f44336, #da190b)' : 
                          'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'};
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto eliminar después de 4 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 4000);
        
        // Botón de cerrar
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }

    showModal(type) {
        const modalHTML = `
            <div class="modern-modal" id="create-modal">
                <div class="modern-modal-content">
                    <div class="modal-header">
                        <h2>${type === 'viaje' ? '✈️ Crear Nuevo Viaje' : '💕 Crear Nuevo Momento'}</h2>
                        <span class="close-modal" onclick="spa.closeModal()">&times;</span>
                    </div>
                    <form id="create-form" class="modal-form">
                        <div class="form-group">
                            <label for="titulo">🏷️ Título:</label>
                            <input type="text" id="titulo" name="titulo" required 
                                   placeholder="${type === 'viaje' ? 'Ej: Viaje a la playa' : 'Ej: Primer beso'}">
                        </div>
                        <div class="form-group">
                            <label for="descrip">📝 Descripción:</label>
                            <textarea id="descrip" name="descrip" required 
                                      placeholder="Describe este momento especial..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="fecha">📅 Fecha:</label>
                            <input type="date" id="fecha" name="fecha" required>
                        </div>
                        <div class="form-group">
                            <label for="fileInput">📸 Imagen:</label>
                            <input type="file" id="fileInput" name="imagen" accept="image/*" required>
                            <div class="file-preview" id="file-preview"></div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="modern-btn danger" onclick="spa.closeModal()">Cancelar</button>
                            <button type="submit" class="modern-btn">${type === 'viaje' ? 'Crear Viaje' : 'Crear Momento'}</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Setup form events
        this.setupModalEvents(type);
        
        // Show modal with animation
        const modal = document.getElementById('create-modal');
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    setupModalEvents(type) {
        const form = document.getElementById('create-form');
        const fileInput = document.getElementById('fileInput');
        const preview = document.getElementById('file-preview');

        // Preview de imagen
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; border-radius: 10px;">`;
                };
                reader.readAsDataURL(file);
            }
        });

        // Submit form
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const titulo = formData.get('titulo');
            const descrip = formData.get('descrip');
            const fecha = formData.get('fecha');
            const imagen = formData.get('imagen');

            try {
                this.showNotification('Subiendo imagen...', 'info');
                
                if (type === 'viaje') {
                    await this.insertarViaje(imagen, titulo, descrip, fecha);
                } else {
                    await this.insertarMomento(imagen, descrip, fecha);
                }
                
                this.showNotification(`¡${type === 'viaje' ? 'Viaje' : 'Momento'} creado con éxito! 🎉`, 'success');
                this.closeModal();
                
                // Recargar la sección actual
                await this.loadSectionData(this.currentSection);
                
            } catch (error) {
                console.error('Error creando:', error);
                this.showNotification('Error al crear. Intenta de nuevo.', 'error');
            }
        });
    }

    closeModal() {
        // Buscar y cerrar cualquier modal activo
        const modals = [
            document.getElementById('create-modal'),
            document.getElementById('add-image-modal'),
            document.querySelector('.modern-modal.show')
        ];
        
        modals.forEach(modal => {
            if (modal) {
                console.log('Cerrando modal:', modal.id || 'modal sin ID');
                modal.classList.remove('show');
                setTimeout(() => {
                    if (modal.parentNode) {
                        modal.remove();
                    }
                }, 300);
            }
        });
    }

    async insertarViaje(imagenFile, titulo, descrip, fecha) {
        try {
            const imageUrl = await subirImagen(imagenFile);
            
            // Obtener el próximo ID
            const viajesCollection = collection(this.db, "Viajes");
            const maxIdQuery = query(viajesCollection, orderBy("Imagen_Id", "desc"), limit(1));
            const querySnapshot = await getDocs(maxIdQuery);

            let nuevoId = 1;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                nuevoId = data.Imagen_Id + 1;
            });

            const nuevoViaje = {
                Imagen_Id: nuevoId,
                Destino: titulo,
                Img: imageUrl,
                Descrip: descrip,
                Fecha: fecha,
                IdUser: this.currentUser,
            };

            await addDoc(viajesCollection, nuevoViaje);
            console.log("Viaje insertado con éxito:", nuevoViaje);
            
            // Enviar notificación push
            const userName = this.getNotificationUserName(this.currentUser);
            this.sendNotification(
                `✈️ Nuevo viaje agregado por ${userName}`,
                `${titulo} - ${descrip}`,
                '✈️',
                'new-viaje'
            );
            
        } catch (error) {
            console.error("Error al insertar viaje:", error);
            throw error;
        }
    }

    async insertarMomento(imagenFile, descrip, fecha) {
        try {
            const imageUrl = await subirImagen(imagenFile);
            
            // Obtener el próximo ID
            const momentosCollection = collection(this.db, "Instantes");
            const maxIdQuery = query(momentosCollection, orderBy("IdInstante", "desc"), limit(1));
            const querySnapshot = await getDocs(maxIdQuery);

            let nuevoId = 1;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                nuevoId = data.IdInstante + 1;
            });

            const nuevoMomento = {
                IdInstante: nuevoId,
                Img: imageUrl,
                Descrip: descrip,
                Fecha: fecha,
                IdUser: this.currentUser,
            };

            await addDoc(momentosCollection, nuevoMomento);
            console.log("Momento insertado con éxito:", nuevoMomento);
            
            // Enviar notificación push
            const userName = this.getNotificationUserName(this.currentUser);
            this.sendNotification(
                `💕 Nuevo momento agregado por ${userName}`,
                `${descrip}`,
                '💕',
                'new-momento'
            );
            
        } catch (error) {
            console.error("Error al insertar momento:", error);
            throw error;
        }
    }

    // Función para mostrar notificaciones modernas
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const bgColor = type === 'success' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                       type === 'error' ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)' :
                       'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)';
        
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
        
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }
}

// Sistema de carousel mejorado
class ModernCarousel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.carousel = this.container?.querySelector('.carousel');
        this.slides = this.carousel?.querySelectorAll('.carousel-slide');
        this.currentSlide = 0;
        this.slideCount = this.slides?.length || 0;
        
        if (this.slideCount > 1) {
            this.setupControls();
            this.setupAutoplay();
        }
    }

    setupControls() {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-nav prev';
        prevBtn.innerHTML = '‹';
        prevBtn.onclick = () => this.previousSlide();

        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-nav next';
        nextBtn.innerHTML = '›';
        nextBtn.onclick = () => this.nextSlide();

        this.container.appendChild(prevBtn);
        this.container.appendChild(nextBtn);
    }

    setupAutoplay() {
        setInterval(() => {
            this.nextSlide();
        }, 4000);
    }

    nextSlide() {
        this.currentSlide = (this.currentSlide + 1) % this.slideCount;
        this.updateCarousel();
    }

    previousSlide() {
        this.currentSlide = (this.currentSlide - 1 + this.slideCount) % this.slideCount;
        this.updateCarousel();
    }

    updateCarousel() {
        const translateX = -this.currentSlide * 100;
        this.carousel.style.transform = `translateX(${translateX}%)`;
    }
}

// Agregar estilos CSS adicionales dinámicamente
function addAdditionalStyles() {
    const additionalCSS = `
        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
            width: 100%;
            max-width: 1200px;
        }

        .gallery-item {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            border-radius: 15px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
        }

        .gallery-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .gallery-item h3 {
            color: #2c3e50;
            margin: 15px 0 5px 0;
            font-size: 18px;
        }

        .gallery-item p {
            color: #7f8c8d;
            font-size: 14px;
        }

        .sobreti-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
            width: 100%;
            max-width: 1000px;
        }

        .sobreti-item {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            border-radius: 15px;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .sobreti-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .sobreti-item img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            cursor: pointer;
            transition: transform 0.3s ease;
        }

        .sobreti-item img:hover {
            transform: scale(1.05);
        }

        .photo-description {
            padding: 15px;
            text-align: center;
        }

        .photo-description h4 {
            color: #2c3e50;
            margin-bottom: 5px;
            font-size: 16px;
        }

        .photo-description p {
            color: #7f8c8d;
            font-size: 14px;
        }

        .photo-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        }

        .modal-content {
            position: relative;
            max-width: 90%;
            max-height: 90%;
        }

        .modal-content img {
            width: 100%;
            height: auto;
            border-radius: 10px;
        }

        .close-modal {
            position: absolute;
            top: -40px;
            right: 10px;
            color: white;
            font-size: 30px;
            cursor: pointer;
            font-weight: bold;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;

    const style = document.createElement('style');
    style.textContent = additionalCSS;
    document.head.appendChild(style);
}

// Inicializar la aplicación
let spa;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, iniciando SPA...');
    addAdditionalStyles();
    spa = new SPANavigator();
    // Hacer spa disponible globalmente inmediatamente
    window.spa = spa;
});

// Exportar para uso global (redundante pero asegura compatibilidad)
window.spa = spa;
