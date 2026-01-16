const toggleBtn = document.getElementById("toggleBtn");
const statusText = document.getElementById("statusText");
const form = document.getElementById("toggleForm");
const actionField = document.getElementById("actionField");
const timestampField = document.getElementById("timestampField");
const emailInput = document.querySelector(".email-input");
const successMessage = document.getElementById("successMessage");

let isOn = false;
let isProcessing = false; // Prevent multiple clicks during delay

// Prevent normal form submission
form.addEventListener("submit", (e) => {
    e.preventDefault();
});

// Configuration
const FORMSPREE_URL = "https://formspree.io/f/xeeeejkg";
const PROCESSING_DELAY = 3000;

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

// Form Submission
const submitToFormspree = async (formData) => {
    try {
        await fetch(FORMSPREE_URL, {
            method: "POST",
            headers: {
                "Accept": "application/json"
            },
            body: formData
        });
        console.log("Feedback sent successfully");
        return true;
    } catch (error) {
        console.error("Network error:", error);
        return false;
    }
};

// Validation
const validateEmail = () => {
    if (!emailInput.value) {
        alert("Please enter your email before authenticating.");
        emailInput.focus();
        return false;
    }
    return true;
};

// Main Handler
toggleBtn.addEventListener("click", async () => {
    // Early returns for validation and processing state
    if (!validateEmail() || isProcessing) {
        return;
    }
    
    isProcessing = true;
    hideSuccessMessage();
    setButtonState(true);
    
    updateStatus("Processing your request...", "#f39c12");
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
    
    // Toggle state
    isOn = !isOn;
    toggleBtn.classList.toggle("on", isOn);
    
    // Prepare status message
    const statusMessage = isOn
        ? "✓ 2FA Authentication ENABLED - A confirmation email has been sent"
        : "✗ 2FA Authentication DISABLED";
    const statusColor = isOn ? "#27ae60" : "#e74c3c";
    
    updateStatus(statusMessage, statusColor);
    
    // Prepare form data
    const formData = new FormData(form);
    formData.set("action", isOn ? "2FA Enabled" : "2FA Disabled");
    formData.set("timestamp", new Date().toLocaleString());
    formData.set("email", emailInput.value);
    
    // Submit to Formspree
    const success = await submitToFormspree(formData);
    
    if (!success) {
        updateStatus("⚠️ Connection error. Please try again.", "#e74c3c");
    } else if (isOn) {
        showSuccessMessage();
    }
    
    // Re-enable button
    setButtonState(false);
    isProcessing = false;
});
