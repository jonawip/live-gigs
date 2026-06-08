(function () {
  const form = document.getElementById('gigForm');
  const dateInput = document.getElementById('dateInput');
  const feeInput = document.getElementById('feeInput');
  const submitBtn = document.getElementById('submitBtn');
  const submitText = submitBtn?.querySelector('.submit-text');

  if (!form || !dateInput || !submitBtn) return;

  const today = new Date();
  dateInput.value = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  function syncFilledState(el) {
    const field = el.closest('.field');
    if (!field) return;
    field.classList.toggle('is-filled', el.value.trim() !== '');
  }

  function syncFeeChips() {
    if (!feeInput) return;
    document.querySelectorAll('.fee-chip').forEach((chip) => {
      chip.classList.toggle('is-active', chip.dataset.fee === feeInput.value);
    });
  }

  form.querySelectorAll('input, textarea').forEach((el) => {
    syncFilledState(el);
    el.addEventListener('input', () => {
      syncFilledState(el);
      if (el === feeInput) syncFeeChips();
    });
    el.addEventListener('focus', () => {
      requestAnimationFrame(() => {
        el.closest('.field')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  });

  document.querySelectorAll('.fee-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      if (!feeInput) return;
      feeInput.value = chip.dataset.fee ?? '';
      feeInput.dispatchEvent(new Event('input', { bubbles: true }));
      feeInput.focus();
    });
  });

  syncFeeChips();

  form.addEventListener('submit', (e) => {
    form.classList.add('was-validated');

    if (!form.checkValidity()) {
      e.preventDefault();
      const firstInvalid = form.querySelector(':invalid');
      firstInvalid?.focus();
      firstInvalid?.closest('.field')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    submitBtn.disabled = true;
    if (submitText) submitText.textContent = 'Saving…';
  });
})();
