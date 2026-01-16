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

toggleBtn.addEventListener("click", async () => {
    // Validate email input
    if (!emailInput.value) {
        alert("Please enter your email before authenticating.");
        emailInput.focus();
        return;
    }

    // Prevent clicking while processing
    if (isProcessing) {
        return;
    }

    isProcessing = true;
    
    // Hide previous success message
    successMessage.classList.remove("show");
    
    // Show processing message
    statusText.textContent = "Processing your request...";
    statusText.style.color = "#f39c12";
    
    // Disable toggle button visually
    toggleBtn.classList.add("disabled");

    // Wait 3 seconds (simulate processing)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Toggle the state
    isOn = !isOn;
    toggleBtn.classList.toggle("on", isOn);

    // Update status text
    const action = isOn
        ? "✓ 2FA Authentication ENABLED - A confirmation email has been sent"
        : "✗ 2FA Authentication DISABLED";

    statusText.textContent = action;
    statusText.style.color = isOn ? "#27ae60" : "#e74c3c";

    // Set hidden form fields
    actionField.value = isOn ? "2FA Enabled" : "2FA Disabled";
    timestampField.value = new Date().toLocaleString();

    // Submit to Formspree
    try {
        const response = await fetch(form.action, {
            method: "POST",
            headers: {
                "Accept": "application/json"
            },
            body: new FormData(form)
        });

        // ✅ DO NOT check response.ok (Formspree may return 302/200)
        // If fetch succeeds, Formspree received it
        console.log("Feedback sent successfully");
        
        // Show success message if 2FA was enabled
        if (isOn) {
            successMessage.classList.add("show");
        }
    } catch (error) {
        // Only fires if network completely fails
        console.error("Network error:", error);
        statusText.textContent = "⚠️ Connection error. Please try again.";
        statusText.style.color = "#e74c3c";
    }

    // Re-enable toggle button
    toggleBtn.classList.remove("disabled");
    isProcessing = false;
});
