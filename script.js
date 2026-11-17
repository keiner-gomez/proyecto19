// Variables de estado
        const PROXY = 'https://api.allorigins.win/raw?url=';
        let lanes = []; // { name, posts, loading, error }

        // Elementos del DOM
        const lanesWrapper = document.getElementById('lanes-wrapper');
        const modalOverlay = document.getElementById('modal-overlay');
        const openModalBtn = document.getElementById('open-modal-btn');
        const addSubredditBtn = document.getElementById('add-subreddit-btn');
        const subredditInput = document.getElementById('subreddit-input');

        // 1. FUNCIÓN PARA BUSCAR DATOS
        async function fetchRedditData(subreddit) {
            const url = `https://www.reddit.com/r/${subreddit}.json`;
            const response = await fetch(PROXY + encodeURIComponent(url));
            if (!response.ok) throw new Error('Not found or API error');
            const data = await response.json();
            return data.data.children.map(child => child.data);
        }

        // 2. FUNCIÓN PARA RENDERIZAR LA INTERFAZ
        function render() {
            lanesWrapper.innerHTML = '';

            lanes.forEach((lane, index) => {
                const laneEl = document.createElement('div');
                laneEl.className = 'lane';

                // Cabecera del carril
                laneEl.innerHTML = `
                    <div class="lane-header">
                        <span>/r/${lane.name}</span>
                        <button class="menu-btn" data-index="${index}">⋮</button>
                        <div class="dropdown-menu" id="menu-${index}">
                            <button class="refresh-btn" data-index="${index}">Refresh</button>
                            <button class="delete-btn" data-index="${index}">Delete</button>
                        </div>
                    </div>
                `;

                // Cuerpo del carril (posts)
                const postsContainer = document.createElement('div');
                postsContainer.className = 'posts-list';

                if (lane.loading) {
                    postsContainer.innerHTML = '<div class="loading-text">Loading...</div>';
                } else if (lane.error) {
                    postsContainer.innerHTML = `<div class="error-text">${lane.error}</div>`;
                } else if (lane.posts.length === 0) {
                    postsContainer.innerHTML = '<div class="loading-text">No posts found.</div>';
                } else {
                    lane.posts.forEach(post => {
                        const postEl = document.createElement('div');
                        postEl.className = 'post-item';
                        postEl.innerHTML = `
                            <div class="post-votes">
                                <span>^</span>
                                <span>${post.score || 0}</span>
                            </div>
                            <div class="post-title">
                                <a href="https://reddit.com${post.permalink}" target="_blank">${post.title}</a>
                            </div>
                        `;
                        postsContainer.appendChild(postEl);
                    });
                }

                laneEl.appendChild(postsContainer);
                lanesWrapper.appendChild(laneEl);
            });

            attachEventListeners();
        }

        // 3. FUNCIONES DE LÓGICA
        async function addLane(name) {
            const cleanName = name.trim().replace(/^\/?r\//i, '').toLowerCase();
            if (!cleanName) return;
            if (lanes.some(l => l.name === cleanName)) return alert('Lane already exists');

            // Añadir carril en estado de carga
            lanes.push({ name: cleanName, posts: [], Cargando: true, error: null });
            saveToLocalStorage();
            render();

            // Fetch de datos
            try {
                const posts = await fetchRedditData(cleanName);
                const lane = lanes.find(l => l.name === cleanName);
                lane.posts = posts;
                lane.loading = false;
            } catch (err) {
                const lane = lanes.find(l => l.name === cleanName);
                lane.loading = false;
                lane.error = 'Error al obtener los datos. Subreddit no válido.?';
            }
            render();
        }

        function deleteLane(index) {
            lanes.splice(index, 1);
            saveToLocalStorage();
            render();
        }

        async function refreshLane(index) {
            const lane = lanes[index];
            lane.loading = true;
            lane.error = null;
            render();

            try {
                const posts = await fetchRedditData(lane.name);
                lane.posts = posts;
                lane.loading = false;
            } catch (err) {
                lane.loading = false;
                lane.error = 'Error al actualizar los datos.';
            }
            render();
        }

        // 4. PERSISTENCIA
        function saveToLocalStorage() {
            const names = lanes.map(l => l.name);
            localStorage.setItem('reddit_lanes', JSON.stringify(names));
        }

        function loadFromLocalStorage() {
            const saved = localStorage.getItem('reddit_lanes');
            if (saved) {
                const names = JSON.parse(saved);
                names.forEach(name => {
                    lanes.push({ name, posts: [], loading: true, error: null });
                });
            } else {
                // Datos por defecto si está vacío
                lanes.push({ name: 'learnprogramming', posts: [], loading: true, error: null });
                lanes.push({ name: 'javascript', posts: [], loading: true, error: null });
            }
        }

        // 5. EVENTOS
        function attachEventListeners() {
            // Toggle menú de 3 puntos
            document.querySelectorAll('.menu-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const index = btn.getAttribute('data-index');
                    const menu = document.getElementById(`menu-${index}`);
                    // Cerrar otros menús
                    document.querySelectorAll('.dropdown-menu').forEach(m => {
                        if (m !== menu) m.classList.remove('active');
                    });
                    menu.classList.toggle('active');
                });
            });

            // Botón Refresh
            document.querySelectorAll('.refresh-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = btn.getAttribute('data-index');
                    btn.parentElement.classList.remove('active');
                    refreshLane(parseInt(index));
                });
            });

            // Botón Delete
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = btn.getAttribute('data-index');
                    btn.parentElement.classList.remove('active');
                    deleteLane(parseInt(index));
                });
            });
        }

        // Cerrar menús al hacer clic fuera
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('active'));
        });

        // Modal
        openModalBtn.addEventListener('click', () => {
            modalOverlay.classList.add('active');
            subredditInput.focus();
        });

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.classList.remove('active');
        });

        addSubredditBtn.addEventListener('click', () => {
            const val = subredditInput.value;
            if (val) {
                addLane(val);
                subredditInput.value = '';
                modalOverlay.classList.remove('active');
            }
        });

        subredditInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addSubredditBtn.click();
        });

        // 6. INICIALIZACIÓN
        async function init() {
            loadFromLocalStorage();
            render();

            // Cargar los posts iniciales
            const promises = lanes.map(async (lane) => {
                try {
                    const posts = await fetchRedditData(lane.name);
                    lane.posts = posts;
                    lane.loading = false;
                } catch (err) {
                    lane.loading = false;
                    lane.error = 'Error al obtener los datos. ¿Subreddit no válido?';
                }
            });

            await Promise.allSettled(promises);
            saveToLocalStorage();
            render();
        }

        init();