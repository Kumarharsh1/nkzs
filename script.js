// Chatbot functionality
class MultiAIChatBot {
    constructor() {
        this.selectedAssistant = 'general';
        this.uploadedFiles = [];
        this.chatHistory = [];
        // Use localhost instead of 127.0.0.1 for better compatibility
        this.backendUrl = 'http://localhost:7999';
        
        this.initializeEventListeners();
        this.showWelcomeMessage();
        this.testBackendConnection();
    }

    initializeEventListeners() {
        // Assistant selection
        document.querySelectorAll('.assistant-card').forEach(card => {
            card.addEventListener('click', (e) => {
                this.selectAssistant(e.currentTarget.dataset.assistant);
            });
        });

        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Message sending
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        sendButton.addEventListener('click', () => this.sendMessage());

        // Quick actions
        document.getElementById('clearChat').addEventListener('click', () => this.clearChat());
        document.getElementById('exportChat').addEventListener('click', () => this.exportChat());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());

        // Modal
        document.querySelector('.close-modal').addEventListener('click', () => this.closeModal());
    }

    selectAssistant(assistantId) {
        this.selectedAssistant = assistantId;
        
        // Update UI
        document.querySelectorAll('.assistant-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector(`[data-assistant="${assistantId}"]`).classList.add('active');
        
        // Add system message
        const assistantNames = {
            'general': 'General AI',
            'news': 'News Assistant',
            'health': 'Health & Wellness',
            'ecommerce': 'E-commerce',
            'travel': 'Travel & Hospitality'
        };
        
        this.addSystemMessage(`Switched to ${assistantNames[assistantId]}. How can I help you?`);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.style.borderColor = '#ff6b8b';
        e.currentTarget.style.background = 'rgba(255, 107, 139, 0.1)';
    }

    handleFileDrop(e) {
        e.preventDefault();
        const files = e.dataTransfer.files;
        this.processFiles(files);
        
        // Reset styles
        e.currentTarget.style.borderColor = '#bdc3c7';
        e.currentTarget.style.background = 'rgba(248, 249, 250, 0.8)';
    }

    handleFileSelect(e) {
        const files = e.target.files;
        this.processFiles(files);
    }

    processFiles(files) {
        for (let file of files) {
            if (!this.isValidFile(file)) {
                this.showError(`Invalid file: ${file.name}. Please upload PDF, TXT, JPG, or PNG files under 10MB.`);
                continue;
            }

            this.uploadedFiles.push(file);
            this.addFileMessage(file);
        }
        
        if (this.uploadedFiles.length > 0) {
            this.showFilePreview();
        }
    }

    isValidFile(file) {
        const validTypes = ['application/pdf', 'text/plain', 'image/jpeg', 'image/jpg', 'image/png'];
        const maxSize = 10 * 1024 * 1024;
        return validTypes.includes(file.type) && file.size <= maxSize;
    }

    async extractFileContent(file) {
        return new Promise((resolve) => {
            if (file.type === 'text/plain') {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsText(file);
            } else if (file.type === 'application/pdf') {
                resolve(`PDF file: ${file.name} - Content would be extracted on backend`);
            } else if (file.type.startsWith('image/')) {
                resolve(`Image file: ${file.name} - Content would be processed on backend`);
            } else {
                resolve(`File: ${file.name}`);
            }
        });
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message && this.uploadedFiles.length === 0) return;

        // Add user message
        this.addUserMessage(message);
        messageInput.value = '';

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Prepare file content
            let fileContent = '';
            if (this.uploadedFiles.length > 0) {
                fileContent = await this.extractFileContent(this.uploadedFiles[0]);
            }

            // Send to backend
            const response = await fetch(`${this.backendUrl}/api/chat/${this.selectedAssistant}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    file_content: fileContent,
                    session_id: 'user-session-' + Date.now()
                })
            });

            this.hideTypingIndicator();

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.addBotMessage(data.response);
            
            // Clear uploaded files after successful send
            this.uploadedFiles = [];
            this.closeModal();
            
        } catch (error) {
            this.hideTypingIndicator();
            this.addErrorMessage(`Connection failed: ${error.message}. Make sure backend is running on port 7999.`);
            console.error('API Error:', error);
        }
    }

    // Message display methods
    addUserMessage(content) {
        this.addMessage('user', content);
    }

    addBotMessage(content) {
        this.addMessage('bot', content);
    }

    addSystemMessage(content) {
        this.addMessage('system', content);
    }

    addFileMessage(file) {
        this.addMessage('file', `📎 Uploaded: ${file.name} (${this.formatFileSize(file.size)})`);
    }

    addErrorMessage(content) {
        this.addMessage('error', content);
    }

    addMessage(type, content) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        
        const timestamp = new Date().toLocaleTimeString([], { 
            hour: '2-digit', minute: '2-digit', hour12: true 
        });

        const assistantNames = {
            'general': 'General AI',
            'news': 'News Assistant',
            'health': 'Health & Wellness',
            'ecommerce': 'E-commerce',
            'travel': 'Travel & Hospitality'
        };

        messageDiv.className = `message ${type}-message`;
        
        let messageHTML = '';
        
        switch (type) {
            case 'user':
                messageHTML = `
                    <div class="message-header">
                        <div class="message-avatar user-avatar">👤</div>
                        <div class="message-sender">You</div>
                        <div class="message-time">${timestamp}</div>
                    </div>
                    <div class="message-content">${content}</div>
                `;
                break;
                
            case 'bot':
                messageHTML = `
                    <div class="message-header">
                        <div class="message-avatar bot-avatar-small">🤖</div>
                        <div class="message-sender">${assistantNames[this.selectedAssistant]}</div>
                        <div class="message-time">${timestamp}</div>
                    </div>
                    <div class="message-content">${content}</div>
                `;
                break;
                
            case 'system':
                messageHTML = `
                    <div class="message-content system-message">${content}</div>
                `;
                break;
                
            case 'file':
                messageHTML = `
                    <div class="message-header">
                        <div class="message-avatar user-avatar">📎</div>
                        <div class="message-sender">File Upload</div>
                        <div class="message-time">${timestamp}</div>
                    </div>
                    <div class="message-content">${content}</div>
                `;
                break;
                
            case 'error':
                messageHTML = `
                    <div class="message-content error-message">❌ ${content}</div>
                `;
                break;
        }

        messageDiv.innerHTML = messageHTML;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Add to chat history
        this.chatHistory.push({
            type: type,
            content: content,
            timestamp: timestamp,
            assistant: this.selectedAssistant
        });
    }

    showTypingIndicator() {
        const chatMessages = document.getElementById('chatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message';
        typingDiv.id = 'typingIndicator';
        
        const assistantNames = {
            'general': 'General AI',
            'news': 'News Assistant',
            'health': 'Health & Wellness',
            'ecommerce': 'E-commerce',
            'travel': 'Travel & Hospitality'
        };
        
        typingDiv.innerHTML = `
            <div class="typing-indicator">
                <div class="typing-text">${assistantNames[this.selectedAssistant]} is typing</div>
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    showWelcomeMessage() {
        this.addSystemMessage('🚀 Welcome to Multi-AI ChatBot! Select an assistant and start chatting.');
    }

    async testBackendConnection() {
        try {
            console.log('Testing backend connection to:', this.backendUrl);
            const response = await fetch(`${this.backendUrl}/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Backend response:', data);
                this.updateConnectionStatus('connected', '✅ Backend connected on port 7999');
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Backend connection failed:', error);
            this.updateConnectionStatus('error', '❌ Backend not connected - make sure server is running on port 7999');
        }
    }

    updateConnectionStatus(status, message) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            const indicator = statusElement.querySelector('.status-indicator');
            indicator.className = `status-indicator ${status}`;
            statusElement.querySelector('span').textContent = message;
        }
    }

    showFilePreview() {
        const modal = document.getElementById('fileModal');
        const filePreview = document.getElementById('filePreview');
        
        filePreview.innerHTML = this.uploadedFiles.map(file => `
            <div class="file-preview-item">
                <div class="file-info">
                    <div class="file-icon">
                        ${file.type.startsWith('image/') ? '🖼️' : '📄'}
                    </div>
                    <div class="file-details">
                        <h5>${file.name}</h5>
                        <p>${this.formatFileSize(file.size)} • ${file.type}</p>
                    </div>
                </div>
                <button class="remove-file" onclick="chatbot.removeFile('${file.name}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        
        modal.style.display = 'block';
    }

    removeFile(fileName) {
        this.uploadedFiles = this.uploadedFiles.filter(file => file.name !== fileName);
        if (this.uploadedFiles.length === 0) {
            this.closeModal();
        } else {
            this.showFilePreview();
        }
    }

    closeModal() {
        document.getElementById('fileModal').style.display = 'none';
    }

    clearChat() {
        document.getElementById('chatMessages').innerHTML = '';
        this.chatHistory = [];
        this.uploadedFiles = [];
        this.closeModal();
        this.showWelcomeMessage();
    }

    exportChat() {
        const chatText = this.chatHistory.map(msg => 
            `[${msg.timestamp}] ${msg.type.toUpperCase()}: ${msg.content}`
        ).join('\n');
        
        const blob = new Blob([chatText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    showSettings() {
        this.addSystemMessage('⚙️ Settings feature coming soon!');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize chatbot
let chatbot;
document.addEventListener('DOMContentLoaded', () => {
    chatbot = new MultiAIChatBot();
});

window.addEventListener('click', (e) => {
    const modal = document.getElementById('fileModal');
    if (e.target === modal) {
        chatbot.closeModal();
    }
});