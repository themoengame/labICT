// ============================================================
// JSONP HELPER - Untuk menghindari CORS
// ============================================================

const JSONP = {
    _callbackId: 0,
    _pending: {},
    _debug: true, // Set ke false untuk production
    
    log(msg, data) {
        if (this._debug) {
            console.log('[JSONP]', msg, data || '');
        }
    },
    
    request(url, params = {}, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + (++this._callbackId);
            const script = document.createElement('script');
            let isResolved = false;
            
            this.log('Request:', url, params);
            
            const timer = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    this._cleanup(callbackName);
                    reject(new Error('Request timeout after ' + timeout + 'ms'));
                }
            }, timeout);
            
            this._pending[callbackName] = {
                resolve: (data) => {
                    if (!isResolved) {
                        isResolved = true;
                        clearTimeout(timer);
                        this._cleanup(callbackName);
                        this.log('Response success:', data);
                        resolve(data);
                    }
                },
                reject: (error) => {
                    if (!isResolved) {
                        isResolved = true;
                        clearTimeout(timer);
                        this._cleanup(callbackName);
                        this.log('Response error:', error);
                        reject(error);
                    }
                }
            };
            
            const urlParams = new URLSearchParams(params);
            urlParams.append('callback', callbackName);
            urlParams.append('_t', Date.now());
            
            const fullUrl = url + '?' + urlParams.toString();
            this.log('Full URL:', fullUrl);
            
            window[callbackName] = function(data) {
                if (this._pending[callbackName]) {
                    this._pending[callbackName].resolve(data);
                }
            }.bind(this);
            
            script.onerror = function() {
                this.log('Script load error');
                if (this._pending[callbackName]) {
                    this._pending[callbackName].reject(new Error('Network error or script load failed - CORS atau URL tidak valid'));
                }
            }.bind(this);
            
            script.onload = function() {
                this.log('Script loaded successfully');
            }.bind(this);
            
            script.src = fullUrl;
            document.head.appendChild(script);
        });
    },
    
    _cleanup(callbackName) {
        delete window[callbackName];
        delete this._pending[callbackName];
        document.querySelectorAll('script[src*="' + callbackName + '"]').forEach(el => {
            try { el.remove(); } catch(e) {}
        });
    }
};

function createApiWrapper(baseUrl) {
    // Cek apakah URL valid
    if (!baseUrl || !baseUrl.includes('script.google.com')) {
        console.error('⚠️ URL Apps Script tidak valid!');
    }
    
    return {
        call(action, params = {}) {
            const allParams = { action, ...params };
            if (allParams.data && typeof allParams.data === 'object') {
                allParams.data = JSON.stringify(allParams.data);
            }
            return JSONP.request(baseUrl, allParams);
        },
        
        getMasters() { return this.call('get_masters'); },
        getRuang() { return this.call('get_ruang'); },
        getInventaris() { return this.call('get_inventaris'); },
        getPeminjamanRuang() { return this.call('get_peminjaman_ruang'); },
        getPeminjamanInventaris() { return this.call('get_peminjaman_inventaris'); },
        getUsers() { return this.call('get_users'); },
        login(username, password) { return this.call('login', { username, password }); },
        add(sheet, data) { return this.call('add', { sheet, data }); },
        update(sheet, data) { return this.call('update', { sheet, data }); },
        remove(sheet, id) { return this.call('delete', { sheet, id }); },
        approveRuang(data) { return this.call('approve_ruang', { data }); },
        approveInventaris(data) { return this.call('approve_inventaris', { data }); },
        returnInventaris(data) { return this.call('return_inventaris', { data }); }
    };
}
