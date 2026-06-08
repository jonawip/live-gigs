(function () {
  const dateInput = document.getElementById('dateInput');
  const form = document.getElementById('gigForm');
  const submitBtn = document.getElementById('submitBtn');

  if (!dateInput || !form || !submitBtn) return;

  const today = new Date();
  const yy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  dateInput.value = `${yy}-${mm}-${dd}`;

  form.addEventListener('submit', () => {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  });
})();
