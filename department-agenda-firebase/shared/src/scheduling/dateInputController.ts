/**
 * Controlled Strict DD/MM/YYYY Date Input Helper
 * S03-PUB-04, S03-CAL-01, S03-ADM-13
 * 
 * Provides accessible, unified dd/mm/yyyy manual text inputs paired with
 * a native calendar picker modal trigger, strict Indonesian validation,
 * and canonical YYYY-MM-DD two-way synchronization.
 */

import { formatDdmmyyyy, parseDdmmyyyy } from './timeUtils';

export interface DateInputFieldOptions {
  id: string;
  name?: string;
  value?: string; // canonical YYYY-MM-DD
  label?: string;
  placeholder?: string; // defaults to 'dd/mm/yyyy'
  required?: boolean;
  minDate?: string; // canonical YYYY-MM-DD
  maxDate?: string; // canonical YYYY-MM-DD
  className?: string;
  disabled?: boolean;
}

export interface BindDateInputOptions {
  required?: boolean;
  onChange?: (canonicalIsoDate: string) => void;
  onInvalid?: (rawInput: string, errorMessage: string) => void;
  onClear?: () => void;
}

/**
 * Generates semantic HTML for a controlled dd/mm/yyyy date input with picker trigger.
 */
export function renderDateInputField(options: DateInputFieldOptions): string {
  const {
    id,
    name = id,
    value = '',
    label,
    placeholder = 'dd/mm/yyyy',
    required = false,
    minDate,
    maxDate,
    className = '',
    disabled = false
  } = options;

  const displayVal = formatDdmmyyyy(value);

  return `
    <div class="custom-date-field-wrap ${className}">
      ${label ? `<label for="${id}" class="date-field-label">${label} ${required ? '<span class="required text-danger">*</span>' : ''}</label>` : ''}
      <div class="date-input-control-group">
        <input type="text"
               id="${id}"
               name="${name}"
               class="form-control date-input-text"
               placeholder="${placeholder}"
               maxlength="10"
               value="${displayVal}"
               autocomplete="off"
               inputmode="numeric"
               ${disabled ? 'disabled' : ''}
               ${required ? 'required' : ''}
               aria-describedby="${id}_error">
        <button type="button"
                class="btn-date-picker-toggle"
                data-picker-target="${id}"
                tabindex="0"
                aria-label="Buka kalender pemilihan tanggal"
                title="Pilih tanggal dari kalender"
                ${disabled ? 'disabled' : ''}>
          📅
        </button>
        <input type="date"
               id="${id}_native"
               class="date-picker-native-hidden"
               value="${value}"
               ${minDate ? `min="${minDate}"` : ''}
               ${maxDate ? `max="${maxDate}"` : ''}
               tabindex="-1"
               aria-hidden="true"
               ${disabled ? 'disabled' : ''}>
      </div>
      <div class="date-input-feedback-msg" id="${id}_error" style="display: none;" role="alert"></div>
    </div>
  `;
}

export interface DateInputInstance {
  getValue(): string; // canonical YYYY-MM-DD
  getDisplayValue(): string; // dd/mm/yyyy
  setValue(isoDate: string): void;
  isValid(): boolean;
  validate(): boolean;
  destroy(): void;
}

/**
 * Binds interactivity and validation to a rendered date input field.
 */
export function bindDateInputField(id: string, options: BindDateInputOptions = {}): DateInputInstance {
  const textInput = document.getElementById(id) as HTMLInputElement | null;
  const nativeInput = document.getElementById(`${id}_native`) as HTMLInputElement | null;
  const errorMsg = document.getElementById(`${id}_error`) as HTMLElement | null;
  const toggleBtn = document.querySelector(`[data-picker-target="${id}"]`) as HTMLButtonElement | null;

  if (!textInput) {
    return {
      getValue: () => '',
      getDisplayValue: () => '',
      setValue: () => {},
      isValid: () => false,
      validate: () => false,
      destroy: () => {}
    };
  }

  let currentCanonicalIso = nativeInput?.value || parseDdmmyyyy(textInput.value) || '';

  const showError = (msg: string) => {
    if (errorMsg) {
      errorMsg.textContent = msg;
      errorMsg.style.display = 'block';
    }
    textInput.classList.add('is-invalid');
  };

  const clearError = () => {
    if (errorMsg) {
      errorMsg.textContent = '';
      errorMsg.style.display = 'none';
    }
    textInput.classList.remove('is-invalid');
  };

  const validate = (): boolean => {
    const raw = textInput.value.trim();
    if (!raw) {
      if (options.required) {
        showError('Tanggal wajib diisi.');
        if (options.onInvalid) options.onInvalid(raw, 'Tanggal wajib diisi.');
        return false;
      }
      clearError();
      currentCanonicalIso = '';
      if (nativeInput) nativeInput.value = '';
      if (options.onClear) options.onClear();
      return true;
    }

    const iso = parseDdmmyyyy(raw);
    if (!iso) {
      const errorText = `Format tanggal tidak valid. Gunakan format dd/mm/yyyy (contoh: 30/10/2026).`;
      showError(errorText);
      if (options.onInvalid) options.onInvalid(raw, errorText);
      return false;
    }

    clearError();
    currentCanonicalIso = iso;
    if (nativeInput) nativeInput.value = iso;
    return true;
  };

  // 1. Text input live typing & auto-slash formatting
  const handleTextInput = () => {
    let val = textInput.value;
    // Strip non-digits and non-slashes/dashes
    val = val.replace(/[^0-9\/\-]/g, '');

    // Allow natural typing with auto slash injection
    if (val.length === 2 && !val.includes('/') && !val.includes('-')) {
      val = val + '/';
    } else if (val.length === 5 && (val.match(/\//g) || []).length === 1) {
      val = val + '/';
    }
    textInput.value = val;

    if (val.length === 10) {
      const isValid = validate();
      if (isValid && options.onChange) {
        options.onChange(currentCanonicalIso);
      }
    } else if (val.length === 0) {
      if (options.required) {
        showError('Tanggal wajib diisi.');
      } else {
        clearError();
        currentCanonicalIso = '';
        if (nativeInput) nativeInput.value = '';
        if (options.onChange) options.onChange('');
      }
    }
  };

  const handleBlur = () => {
    const isValid = validate();
    if (isValid && options.onChange) {
      options.onChange(currentCanonicalIso);
    }
  };

  textInput.addEventListener('input', handleTextInput);
  textInput.addEventListener('blur', handleBlur);

  // 2. Calendar button triggers native picker
  const handleToggleClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (nativeInput) {
      if (typeof (nativeInput as any).showPicker === 'function') {
        try {
          (nativeInput as any).showPicker();
        } catch {
          nativeInput.focus();
          nativeInput.click();
        }
      } else {
        nativeInput.focus();
        nativeInput.click();
      }
    }
  };

  if (toggleBtn) {
    toggleBtn.addEventListener('click', handleToggleClick);
  }

  // 3. Native date picker change listener
  const handleNativeChange = () => {
    if (nativeInput && nativeInput.value) {
      currentCanonicalIso = nativeInput.value;
      textInput.value = formatDdmmyyyy(currentCanonicalIso);
      clearError();
      if (options.onChange) {
        options.onChange(currentCanonicalIso);
      }
    }
  };

  if (nativeInput) {
    nativeInput.addEventListener('change', handleNativeChange);
  }

  return {
    getValue: () => currentCanonicalIso,
    getDisplayValue: () => textInput.value,
    setValue: (isoDate: string) => {
      currentCanonicalIso = isoDate || '';
      textInput.value = formatDdmmyyyy(currentCanonicalIso);
      if (nativeInput) nativeInput.value = currentCanonicalIso;
      clearError();
    },
    isValid: () => {
      const raw = textInput.value.trim();
      if (!raw) return !options.required;
      return parseDdmmyyyy(raw) !== null;
    },
    validate,
    destroy: () => {
      textInput.removeEventListener('input', handleTextInput);
      textInput.removeEventListener('blur', handleBlur);
      if (toggleBtn) toggleBtn.removeEventListener('click', handleToggleClick);
      if (nativeInput) nativeInput.removeEventListener('change', handleNativeChange);
    }
  };
}
