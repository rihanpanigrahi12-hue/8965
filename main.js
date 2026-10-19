const form = document.getElementById("orderForm");
const message = document.getElementById("formMessage");
const button = form.querySelector("button[type=submit]");
const label = button.querySelector(".submit-label");
const spinner = button.querySelector(".spinner");
document.getElementById("year").textContent = new Date().getFullYear();

document.querySelectorAll("[data-service]").forEach(link => {
  link.addEventListener("click", () => {
    const select = form.querySelector('[name="service"]');
    select.value = link.dataset.service;
  });
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  message.className = "form-message";
  button.disabled = true;
  label.textContent = "Sending your enquiry…";
  spinner.hidden = false;
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to send your enquiry.");
    message.className = "form-message success";
    message.textContent = `✓ ${result.message} Your enquiry number is #${result.orderId || "received"}.`;
    form.reset();
  } catch (error) {
    message.className = "form-message error";
    message.textContent = error.message || "Something went wrong. Please try again.";
  } finally {
    button.disabled = false;
    label.textContent = "Send project enquiry ↗";
    spinner.hidden = true;
  }
});