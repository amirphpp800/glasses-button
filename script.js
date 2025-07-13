
const BOT_TOKEN = '7828118577:AAE-YgRT_WXPvo9lk3rWd4_-5ndkVV3B5zI';
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

async function sendGlassButton() {
    const channelId = document.getElementById('channelId').value.trim();
    const buttonText = document.getElementById('buttonText').value.trim();
    const buttonUrl = document.getElementById('buttonUrl').value.trim();
    const messageText = document.getElementById('messageText').value.trim();

    // Validation
    if (!channelId || !buttonText || !buttonUrl || !messageText) {
        showStatus('لطفاً تمام فیلدها را پر کنید', 'error');
        return;
    }

    if (!isValidUrl(buttonUrl)) {
        showStatus('لطفاً یک لینک معتبر وارد کنید', 'error');
        return;
    }

    showStatus('در حال ارسال...', 'loading');

    try {
        const keyboard = {
            inline_keyboard: [[{
                text: buttonText,
                url: buttonUrl
            }]]
        };

        const response = await fetch(`${API_URL}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: channelId,
                text: messageText,
                reply_markup: keyboard,
                parse_mode: 'HTML'
            })
        });

        const result = await response.json();

        if (result.ok) {
            showStatus('دکمه شیشه‌ای با موفقیت ارسال شد! ✅', 'success');
            // Clear form immediately for security
            clearForm();
        } else {
            let errorMessage = 'خطا در ارسال پیام';
            
            if (result.error_code === 400) {
                if (result.description.includes('chat not found')) {
                    errorMessage = 'چنل پیدا نشد. آیدی چنل را بررسی کنید';
                } else if (result.description.includes('not enough rights')) {
                    errorMessage = 'ربات ادمین چنل نیست یا دسترسی کافی ندارد';
                }
            } else if (result.error_code === 403) {
                errorMessage = 'ربات به چنل دسترسی ندارد یا ادمین نیست';
            }
            
            showStatus(`${errorMessage}: ${result.description}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus('خطا در اتصال به سرور تلگرام', 'error');
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Add enter key support for form submission
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        sendGlassButton();
    }
});

// Add some interactive effects
document.addEventListener('DOMContentLoaded', function() {
    // Add floating animation to glass panels
    const panels = document.querySelectorAll('.glass-panel, .info-panel');
    panels.forEach((panel, index) => {
        panel.style.animation = `fadeInUp 0.8s ease ${index * 0.2}s both`;
    });
});

// Copy to clipboard function
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showStatus('لینک کپی شد! 📋', 'success');
            setTimeout(() => {
                document.getElementById('status').textContent = '';
                document.getElementById('status').className = 'status';
            }, 2000);
        }).catch(() => {
            fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
}

// Fallback copy function for older browsers
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showStatus('لینک کپی شد! 📋', 'success');
        setTimeout(() => {
            document.getElementById('status').textContent = '';
            document.getElementById('status').className = 'status';
        }, 2000);
    } catch (err) {
        showStatus('خطا در کپی کردن', 'error');
    }
    
    document.body.removeChild(textArea);
}

// Clear form function for security
function clearForm() {
    document.getElementById('channelId').value = '';
    document.getElementById('buttonText').value = '';
    document.getElementById('buttonUrl').value = '';
    document.getElementById('messageText').value = '';
    
    // Clear any cached data in browser
    if (typeof Storage !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
    }
}

// Clear form on page load for security
window.addEventListener('load', clearForm);

// Clear form on page unload for security
window.addEventListener('beforeunload', clearForm);

// Prevent form data from being cached
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        clearForm();
    }
});

// CSS animation keyframes (added via JavaScript)
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);
