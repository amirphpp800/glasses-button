
const BOT_TOKEN = '7828118577:AAE-YgRT_WXPvo9lk3rWd4_-5ndkVV3B5zI';
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

async function sendGlassButton() {
    const channelId = document.getElementById('channelId').value.trim();
    const messageText = document.getElementById('messageText').value.trim();

    // Get all buttons
    const buttons = [];
    const buttonGroups = document.querySelectorAll('.button-group');
    
    for (let group of buttonGroups) {
        const text = group.querySelector('.button-text').value.trim();
        const url = group.querySelector('.button-url').value.trim();
        
        if (!text || !url) {
            showStatus('لطفاً تمام فیلدهای دکمه‌ها را پر کنید', 'error');
            return;
        }
        
        if (!isValidUrl(url)) {
            showStatus('لطفاً لینک‌های معتبر وارد کنید', 'error');
            return;
        }
        
        buttons.push({ text, url });
    }

    // Basic validation
    if (!channelId || !messageText || buttons.length === 0) {
        showStatus('لطفاً تمام فیلدها را پر کنید', 'error');
        return;
    }

    // Mandatory admin verification with 5-second loading
    showStatus('در حال بررسی مالکیت و دسترسی شما به کانال... ⏳', 'loading');
    
    // Add 5-second delay to show verification process
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
        // Mandatory admin verification - cannot be disabled
        const adminCheck = await verifyChannelAdmin(channelId);
        if (!adminCheck.success) {
            showStatus('❌ ' + adminCheck.message + ' - فقط ادمین‌های کانال مجاز به ارسال دکمه هستند', 'error');
            return;
        }

        showStatus('✅ مالکیت تأیید شد - در حال ارسال دکمه‌ها...', 'loading');

        // Create keyboard layout
        const keyboard = createKeyboardLayout(buttons);

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
            showStatus(`${buttons.length} دکمه شیشه‌ای با موفقیت ارسال شد! ✅`, 'success');
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

async function verifyChannelAdmin(channelId) {
    try {
        // Step 1: Verify channel exists and bot has access
        const chatResponse = await fetch(`${API_URL}/getChat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: channelId
            })
        });

        const chatResult = await chatResponse.json();
        
        if (!chatResult.ok) {
            if (chatResult.error_code === 400) {
                return { success: false, message: 'چنل پیدا نشد یا ربات عضو آن نیست' };
            } else if (chatResult.error_code === 403) {
                return { success: false, message: 'ربات به این چنل دسترسی ندارد' };
            }
            return { success: false, message: 'خطا در دسترسی به چنل' };
        }

        // Step 2: Verify this is actually a channel (not a group or private chat)
        if (chatResult.result.type !== 'channel') {
            return { success: false, message: 'این آیدی متعلق به یک کانال نیست' };
        }

        // Step 3: Check if bot has admin rights and can post messages
        const adminResponse = await fetch(`${API_URL}/getChatAdministrators`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: channelId
            })
        });

        const adminResult = await adminResponse.json();
        
        if (!adminResult.ok) {
            if (adminResult.error_code === 403) {
                return { success: false, message: 'ربات دسترسی مدیریت این کانال را ندارد' };
            }
            return { success: false, message: 'خطا در بررسی مدیران کانال' };
        }

        // Step 4: Verify bot is admin with proper permissions
        const botInfo = await fetch(`${API_URL}/getMe`);
        const botResult = await botInfo.json();
        
        if (!botResult.ok) {
            return { success: false, message: 'خطا در دریافت اطلاعات ربات' };
        }

        const botId = botResult.result.id;
        const botAdmin = adminResult.result.find(admin => admin.user.id === botId);
        
        if (!botAdmin) {
            return { success: false, message: 'ربات ادمین این کانال نیست' };
        }

        if (!botAdmin.can_post_messages && !botAdmin.can_edit_messages) {
            return { success: false, message: 'ربات مجوز ارسال پیام در این کانال را ندارد' };
        }

        // Step 5: Final test - try to send a test action
        const testResponse = await fetch(`${API_URL}/sendChatAction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: channelId,
                action: 'typing'
            })
        });

        const testResult = await testResponse.json();
        
        if (!testResult.ok) {
            if (testResult.description && testResult.description.includes('not enough rights')) {
                return { success: false, message: 'ربات مجوزهای لازم برای عملکرد در کانال را ندارد' };
            }
            return { success: false, message: 'تست نهایی دسترسی ناموفق بود' };
        }

        return { success: true, message: 'تمام بررسی‌ها موفقیت‌آمیز بود - شما مجاز به ارسال دکمه هستید' };
    } catch (error) {
        return { success: false, message: 'خطا در فرآیند تأیید دسترسی' };
    }
}

function createKeyboardLayout(buttons) {
    // Create optimal layout for buttons
    const keyboard = { inline_keyboard: [] };
    
    if (buttons.length <= 2) {
        // Single row for 1-2 buttons
        keyboard.inline_keyboard.push(buttons.map(btn => ({ text: btn.text, url: btn.url })));
    } else if (buttons.length <= 4) {
        // Two rows for 3-4 buttons
        const mid = Math.ceil(buttons.length / 2);
        keyboard.inline_keyboard.push(buttons.slice(0, mid).map(btn => ({ text: btn.text, url: btn.url })));
        keyboard.inline_keyboard.push(buttons.slice(mid).map(btn => ({ text: btn.text, url: btn.url })));
    } else {
        // Multiple rows for 5+ buttons (max 2 per row)
        for (let i = 0; i < buttons.length; i += 2) {
            const row = buttons.slice(i, i + 2).map(btn => ({ text: btn.text, url: btn.url }));
            keyboard.inline_keyboard.push(row);
        }
    }
    
    return keyboard;
}

function updateButtonFields() {
    const count = parseInt(document.getElementById('buttonCount').value);
    const container = document.getElementById('buttonsContainer');
    
    container.innerHTML = '';
    
    for (let i = 1; i <= count; i++) {
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        buttonGroup.setAttribute('data-index', i);
        
        buttonGroup.innerHTML = `
            <h4>دکمه ${convertToFarsiNumber(i)}:</h4>
            <div class="form-group">
                <label>متن دکمه:</label>
                <input type="text" class="button-text" placeholder="کلیک کنید" required>
            </div>
            <div class="form-group">
                <label>لینک دکمه:</label>
                <input type="url" class="button-url" placeholder="https://example.com" required>
            </div>
        `;
        
        container.appendChild(buttonGroup);
    }
}

function convertToFarsiNumber(num) {
    const farsiNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().split('').map(digit => farsiNumbers[parseInt(digit)]).join('');
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
    
    // Initialize button fields
    updateButtonFields();
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
    document.getElementById('messageText').value = '';
    document.getElementById('buttonCount').selectedIndex = 0;
    
    // Clear all button fields
    const buttonTexts = document.querySelectorAll('.button-text');
    const buttonUrls = document.querySelectorAll('.button-url');
    
    buttonTexts.forEach(input => input.value = '');
    buttonUrls.forEach(input => input.value = '');
    
    // Reset to single button
    updateButtonFields();
    
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
