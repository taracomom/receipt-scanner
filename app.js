class ReceiptScanner {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.captureBtn = document.getElementById('capture-btn');
        this.status = document.getElementById('status');
        
        this.processingModal = document.getElementById('processing-modal');
        this.processingText = document.getElementById('processing-text');
        
        this.editModal = document.getElementById('edit-modal');
        this.receiptForm = document.getElementById('receipt-form');
        this.cancelBtn = document.getElementById('cancel-btn');
        this.saveBtn = document.getElementById('save-btn');
        
        this.successModal = document.getElementById('success-modal');
        this.successText = document.getElementById('success-text');
        this.continueBtn = document.getElementById('continue-btn');
        
        this.currentImageBlob = null;
        this.currentReceiptData = null;
        
        this.initializeApp();
    }
    
    async initializeApp() {
        await this.initializeCamera();
        this.setupEventListeners();
        this.setupServiceWorker();
        this.checkGoogleAuth();
    }
    
    async initializeCamera() {
        try {
            console.log('カメラ初期化開始...');
            this.status.textContent = 'カメラを初期化中...';
            
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = stream;
            
            this.video.addEventListener('loadedmetadata', () => {
                console.log('カメラメタデータ読み込み完了');
                this.setupCanvas();
                this.captureBtn.disabled = false;
                this.status.textContent = 'レシートを撮影してください';
            });
            
            this.video.addEventListener('error', (e) => {
                console.error('Video error:', e);
                this.status.textContent = 'カメラエラーが発生しました';
            });
            
        } catch (error) {
            console.error('Camera access failed:', error);
            this.status.textContent = `カメラエラー: ${error.message}`;
            this.captureBtn.disabled = true;
            
            // フォールバック: ファイル入力を表示
            this.showFileInput();
        }
    }
    
    showFileInput() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.capture = 'environment';
        fileInput.className = 'w-full p-4 bg-blue-500 text-white rounded-lg mt-4';
        fileInput.style.display = 'block';
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.currentImageBlob = this.dataURLToBlob(e.target.result);
                    this.showProcessingModal();
                    this.processWithOpenAI();
                };
                reader.readAsDataURL(file);
            }
        });
        
        this.video.parentElement.appendChild(fileInput);
    }
    
    dataURLToBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }
    
    setupCanvas() {
        const rect = this.video.getBoundingClientRect();
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
    }
    
    setupEventListeners() {
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.cancelBtn.addEventListener('click', () => this.hideEditModal());
        this.receiptForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        this.continueBtn.addEventListener('click', () => this.hideSuccessModal());
        
        // Handle PWA install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.installPrompt = e;
        });
    }
    
    async setupServiceWorker() {
        // Service Worker disabled for debugging
        console.log('Service Worker disabled for debugging');
    }
    
    checkGoogleAuth() {
        const token = localStorage.getItem('google_access_token');
        if (!token) {
            this.initializeGoogleAuth();
        }
    }
    
    async initializeGoogleAuth() {
        // Load Google Identity Services
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => this.setupGoogleAuth();
        document.head.appendChild(script);
    }
    
    setupGoogleAuth() {
        window.google.accounts.id.initialize({
            client_id: window.CONFIG.GOOGLE_CLIENT_ID,
            callback: this.handleGoogleAuth.bind(this)
        });
    }
    
    handleGoogleAuth(response) {
        // Handle Google OAuth response
        console.log('Google auth response:', response);
        localStorage.setItem('google_id_token', response.credential);
        // Exchange for access token if needed
    }
    
    async capturePhoto() {
        try {
            this.captureBtn.disabled = true;
            this.status.textContent = '撮影中...';
            
            // Capture frame from video
            const context = this.canvas.getContext('2d');
            context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Convert to blob
            this.currentImageBlob = await new Promise(resolve => {
                this.canvas.toBlob(resolve, 'image/jpeg', 0.8);
            });
            
            // Show processing modal
            this.showProcessingModal();
            
            // Process with OpenAI Vision
            await this.processWithOpenAI();
            
        } catch (error) {
            console.error('Capture failed:', error);
            this.status.textContent = '撮影に失敗しました';
            this.captureBtn.disabled = false;
        }
    }
    
    async processWithOpenAI() {
        try {
            this.processingText.textContent = 'AIでレシートを解析中...';
            
            // Convert blob to base64
            const base64Image = await this.blobToBase64(this.currentImageBlob);
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.CONFIG.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    max_tokens: 300,
                    messages: [{
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: { url: base64Image }
                            },
                            {
                                type: 'text',
                                text: '以下画像はレシートです。日付(YYYY-MM-DD)、会社名、品名、価格(JPY整数)をJSONで返してください。例: {"date":"2025-06-20","company":"FamilyMart","item":"Coffee","price":"150"}'
                            }
                        ]
                    }]
                })
            });
            
            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }
            
            const data = await response.json();
            const content = data.choices[0].message.content;
            
            // Parse JSON response
            let receiptData;
            try {
                receiptData = JSON.parse(content);
            } catch (parseError) {
                // Try to extract JSON with regex
                const jsonMatch = content.match(/\{[^}]+\}/);
                if (jsonMatch) {
                    receiptData = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('Invalid JSON response from OpenAI');
                }
            }
            
            this.currentReceiptData = receiptData;
            this.hideProcessingModal();
            this.showEditModal(receiptData);
            
        } catch (error) {
            console.error('OpenAI processing failed:', error);
            this.hideProcessingModal();
            this.showEditModal({
                date: new Date().toISOString().split('T')[0],
                company: '',
                item: '',
                price: ''
            });
        }
    }
    
    async blobToBase64(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }
    
    showProcessingModal() {
        this.processingModal.classList.remove('hidden');
    }
    
    hideProcessingModal() {
        this.processingModal.classList.add('hidden');
    }
    
    showEditModal(receiptData) {
        document.getElementById('date-input').value = receiptData.date || '';
        document.getElementById('company-input').value = receiptData.company || '';
        document.getElementById('item-input').value = receiptData.item || '';
        document.getElementById('price-input').value = receiptData.price || '';
        
        this.editModal.classList.remove('hidden');
    }
    
    hideEditModal() {
        this.editModal.classList.add('hidden');
        this.captureBtn.disabled = false;
        this.status.textContent = 'レシートを撮影してください';
    }
    
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = {
            date: document.getElementById('date-input').value,
            company: document.getElementById('company-input').value,
            item: document.getElementById('item-input').value,
            price: document.getElementById('price-input').value
        };
        
        this.hideEditModal();
        this.showProcessingModal();
        this.processingText.textContent = 'Google Driveに保存中...';
        
        try {
            await this.uploadToGoogleDrive(formData);
        } catch (error) {
            console.error('Upload failed:', error);
            this.hideProcessingModal();
            alert('アップロードに失敗しました');
            this.captureBtn.disabled = false;
            this.status.textContent = 'レシートを撮影してください';
        }
    }
    
    async uploadToGoogleDrive(receiptData) {
        try {
            // Generate filename
            const filename = `${receiptData.date}_${receiptData.company}_${receiptData.item}_${receiptData.price}.jpg`;
            
            // Get access token
            let accessToken = localStorage.getItem('google_access_token');
            
            if (!accessToken) {
                // Show error message instead of trying to authenticate
                this.hideProcessingModal();
                alert('Google Drive連携が設定されていません。\n\nセットアップ手順:\n1. Google Cloud Consoleでプロジェクト作成\n2. Drive API有効化\n3. OAuth設定\n4. config.jsにクライアントID設定');
                this.captureBtn.disabled = false;
                this.status.textContent = 'レシートを撮影してください';
                return;
            }
            
            // Create multipart upload request
            const boundary = '-------314159265358979323846';
            const delimiter = `\\r\\n--${boundary}\\r\\n`;
            const close_delim = `\\r\\n--${boundary}--`;
            
            const metadata = {
                name: filename,
                parents: [this.getSelectedFolderId()]
            };
            
            const multipartRequestBody = 
                delimiter +
                'Content-Type: application/json\\r\\n\\r\\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: image/jpeg\\r\\n\\r\\n' +
                await this.blobToArrayBuffer(this.currentImageBlob) +
                close_delim;
            
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary="${boundary}"`
                },
                body: multipartRequestBody
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired, refresh and retry
                    await this.refreshGoogleToken();
                    return this.uploadToGoogleDrive(receiptData);
                }
                throw new Error(`Google Drive API error: ${response.status}`);
            }
            
            const result = await response.json();
            
            this.hideProcessingModal();
            this.showSuccessModal(filename);
            
        } catch (error) {
            throw error;
        }
    }
    
    async authenticateWithGoogle() {
        // Implement OAuth 2.0 PKCE flow
        const clientId = window.CONFIG.GOOGLE_CLIENT_ID;
        const scope = 'https://www.googleapis.com/auth/drive.file';
        
        // Generate PKCE parameters
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        
        localStorage.setItem('code_verifier', codeVerifier);
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${clientId}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent(scope)}&` +
            `redirect_uri=${encodeURIComponent(window.location.origin)}&` +
            `code_challenge=${codeChallenge}&` +
            `code_challenge_method=S256`;
        
        window.location.href = authUrl;
    }
    
    generateCodeVerifier() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode.apply(null, array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
    
    async generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
            .replace(/\\+/g, '-')
            .replace(/\\//g, '_')
            .replace(/=/g, '');
    }
    
    async refreshGoogleToken() {
        // Implement token refresh logic
        console.log('Refreshing Google token...');
    }
    
    getSelectedFolderId() {
        return localStorage.getItem('selected_folder_id') || 'root';
    }
    
    async blobToArrayBuffer(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsArrayBuffer(blob);
        });
    }
    
    showSuccessModal(filename) {
        this.successText.textContent = `${filename} を保存しました`;
        this.successModal.classList.remove('hidden');
    }
    
    hideSuccessModal() {
        this.successModal.classList.add('hidden');
        this.captureBtn.disabled = false;
        this.status.textContent = 'レシートを撮影してください';
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ReceiptScanner();
});

// Handle returning from OAuth redirect
if (window.location.search.includes('code=')) {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    // Exchange code for token
    const exchangeCodeForToken = async () => {
        const codeVerifier = localStorage.getItem('code_verifier');
        const clientId = window.CONFIG.GOOGLE_CLIENT_ID;
        
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: clientId,
                code: code,
                code_verifier: codeVerifier,
                grant_type: 'authorization_code',
                redirect_uri: window.location.origin
            })
        });
        
        const tokenData = await response.json();
        localStorage.setItem('google_access_token', tokenData.access_token);
        localStorage.setItem('google_refresh_token', tokenData.refresh_token);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    };
    
    exchangeCodeForToken();
}