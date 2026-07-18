// ============================================================
// JSONP HELPER - Untuk menghindari CORS
// ============================================================

const JSONP = {
    // ID counter untuk callback
    _callbackId: 0,
    // Penyimpanan pending requests
    _pending: {},
    
    /**
     * Melakukan request JSONP
     * @param {string} url - URL endpoint
     * @param {object} params - Parameter query string
     * @param {number} timeout - Timeout dalam ms (default: 30000)
     * @returns {Promise} Promise yang resolve dengan response
     */
    request(url, params = {}, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + (++this._callbackId);
            const script = document.createElement('script');
            
            // Setup timer timeout
            const timer = setTimeout(() => {
                this._cleanup(callbackName);
                reject(new Error('Request timeout after ' + timeout + 'ms'));
            }, timeout);
            
            // Simpan resolve/reject
            this._pending[callbackName] = {
                resolve: (data) => {
                    clearTimeout(timer);
                    this._cleanup(callbackName);
                    resolve(data);
                },
                reject: (error) => {
                    clearTimeout(timer);
                    this._cleanup(callbackName);
                    reject(error);
                }
            };
            
            // Buat URL dengan callback
            const urlParams = new URLSearchParams(params);
            urlParams.append('callback', callbackName);
            
            // Tambahkan parameter timestamp untuk menghindari cache
            urlParams.append('_t', Date.now());
            
            const fullUrl = url + '?' + urlParams.toString();
            
            // Setup callback global
            window[callbackName] = function(data) {
                if (this._pending[callbackName]) {
                    this._pending[callbackName].resolve(data);
                }
            }.bind(this);
            
            // Setup error handling
            script.onerror = function() {
                if (this._pending[callbackName]) {
                    this._pending[callbackName].reject(new Error('Network error or script load failed'));
                }
            }.bind(this);
            
            script.src = fullUrl;
            document.head.appendChild(script);
        });
    },
    
    /**
     * Membersihkan callback dan script
     */
    _cleanup(callbackName) {
        delete window[callbackName];
        delete this._pending[callbackName];
        // Hapus script tag yang mungkin masih ada
        document.querySelectorAll('script[src*="' + callbackName + '"]').forEach(el => el.remove());
    }
};

// ============================================================
// WRAPPER API - Menggunakan JSONP
// ============================================================

function createApiWrapper(baseUrl) {
    return {
        /**
         * Panggil API dengan JSONP
         */
        call(action, params = {}) {
            const allParams = { action, ...params };
            // Jika ada data yang perlu di-stringify
            if (allParams.data && typeof allParams.data === 'object') {
                allParams.data = JSON.stringify(allParams.data);
            }
            return JSONP.request(baseUrl, allParams);
        },
        
        // ============ READ OPERATIONS ============
        getMasters() {
            return this.call('get_masters');
        },
        getRuang() {
            return this.call('get_ruang');
        },
        getInventaris() {
            return this.call('get_inventaris');
        },
        getPeminjamanRuang() {
            return this.call('get_peminjaman_ruang');
        },
        getPeminjamanInventaris() {
            return this.call('get_peminjaman_inventaris');
        },
        getUsers() {
            return this.call('get_users');
        },
        login(username, password) {
            return this.call('login', { username, password });
        },
        
        // ============ WRITE OPERATIONS ============
        add(sheet, data) {
            return this.call('add', { sheet, data });
        },
        update(sheet, data) {
            return this.call('update', { sheet, data });
        },
        remove(sheet, id) {
            return this.call('delete', { sheet, id });
        },
        
        // ============ SPECIAL OPERATIONS ============
        approveRuang(data) {
            return this.call('approve_ruang', { data });
        },
        approveInventaris(data) {
            return this.call('approve_inventaris', { data });
        },
        returnInventaris(data) {
            return this.call('return_inventaris', { data });
        }
    };
}
