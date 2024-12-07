
(function (global) {

    class FormValidator {
        constructor(formElement) {
            this.form = formElement;
            this.fields = Array.from(this.form.querySelectorAll('[data-validate]'));
            this.errors = {};
            this.asyncValidators = {};
            this.init();
        }

        init() {
            // Bind events
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));

            this.fields.forEach(field => {
                field.addEventListener('input', () => this.validateField(field));
                field.addEventListener('blur', () => this.validateField(field));
            });
        }

        handleSubmit(event) {
            event.preventDefault();
            let isValid = true;

            // Disable submit button to prevent multiple submissions
            const submitBtn = this.form.querySelector('#submitBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
            }

            // Validate all fields
            for (let field of this.fields) {
                const valid = this.validateField(field);
                if (!valid) isValid = false;
            }

            if (isValid) {
                // Form is valid, proceed with submission or further processing
                console.info('Form submitted successfully!');
                this.form.reset();
                this.clearErrors();
                this.form.closest('dialog').close();
            }

            // Re-enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit';
            }
        }

        validateField(field) {
            const rules = this.parseRules(field.dataset.validate);
            const value = field.value.trim();
            let valid = true;
            let message = '';

            for (let rule of rules) {
                const [ruleName, ruleParam] = rule.split(':');
                const validator = this.validators[ruleName];

                if (validator) {
                    if (validator.isAsync) {
                        // Show spinner
                        this.showSpinner(field);

                        // Await asynchronous validation
                        const result = validator.validate.call(this, value, ruleParam, field);
                        // Hide spinner
                        this.hideSpinner(field);

                        if (!result.valid) {
                            valid = false;
                            message = result.message;
                            break; // Stop at first validation error
                        }
                    } else {
                        // Synchronous validation
                        const result = validator.validate(value, ruleParam, field);
                        if (!result.valid) {
                            valid = false;
                            message = result.message;
                            break; // Stop at first validation error
                        }
                    }
                }
            }

            if (!valid) {
                this.showError(field, message);
            } else {
                this.clearError(field);
            }

            return valid;
        }

        parseRules(rulesString) {
            return rulesString.split('|').map(rule => rule.trim());
        }

        showError(field, message) {
            const errorSpan = $dom.getElement('.error-message', field.parentElement);
            if (errorSpan) {
                errorSpan.textContent = message;
                errorSpan.classList.add('active');
                field.classList.add('invalid');
            }

        }

        clearError(field) {
            const errorSpan = $dom.getElement('.error-message', field.parentElement);
            if (errorSpan) {
                errorSpan.textContent = '';
                errorSpan.classList.remove('active');
                field.classList.remove('invalid');
            }

        }

        clearErrors() {
            this.fields.forEach(field => this.clearError(field));
        }

        showSpinner(field) {
            const spinner = document.getElementById(`${field.id} Spinner`);
            if (spinner) {
                spinner.classList.add('active');
            }
        }

        hideSpinner(field) {
            const spinner = document.getElementById(`${field.id} Spinner`);
            if (spinner) {
                spinner.classList.remove('active');
            }
        }

        // Define validation rules
        validators = {
            required: {
                isAsync: false,
                validate: (value) => {
                    const valid = value !== '';
                    return {
                        valid,
                        message: valid ? '' : 'This field is required.'
                    };
                }
            },
            email: {
                isAsync: false,
                validate: (value) => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    const valid = emailRegex.test(value);
                    return {
                        valid,
                        message: valid ? '' : 'Please enter a valid email address.'
                    };
                }
            },
            minLength: {
                isAsync: false,
                validate: (value, length) => {
                    const valid = value.length >= parseInt(length, 10);
                    return {
                        valid,
                        message: valid ? '' : `Please enter at least ${length} characters.`
                    };
                }
            },
            maxLength: {
                isAsync: false,
                validate: (value, length) => {
                    const valid = value.length <= parseInt(length, 10);
                    return {
                        valid,
                        message: valid ? '' : `Please enter no more than ${length} characters.`
                    };
                }
            },
            hasNumber: {
                isAsync: false,
                validate: (value) => {
                    const numberRegex = /\d/;
                    const valid = numberRegex.test(value);
                    return {
                        valid,
                        message: valid ? '' : 'Password must contain at least one number.'
                    };
                }
            },
            match: {
                isAsync: false,
                validate: (value, fieldToMatch) => {
                    const field = document.getElementById(fieldToMatch);
                    const valid = field && value === field.value.trim();
                    return {
                        valid,
                        message: valid ? '' : 'Passwords do not match.'
                    };
                }
            },
            uniqueUsername: {
                isAsync: true,
                validate: async (value) => {
                    // Simulate an API call with a delay
                    const isTaken = await this.checkUsernameAvailability(value);
                    return {
                        valid: !isTaken,
                        message: isTaken ? 'Username is already taken.' : ''
                    };
                }
            }
            // Additional validators can be added here
        };

        // Mock asynchronous API call to check username availability
        checkUsernameAvailability(username) {
            const takenUsernames = ['johnDoe', 'janeSmith', 'user123'];
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(takenUsernames.includes(username));
                }, 1000); // Simulate network delay
            });
        }
    }

    class MyDialog {
        constructor() {
            this.dialogElement = this.createDialog();
            this.dialogOverlayElement = this.createDialogOverlay();
            document.body.appendChild(this.dialogOverlayElement);
            document.body.appendChild(this.dialogElement);

            // Bind methods
            this.open = this.open.bind(this);
            this.close = this.close.bind(this);
            this.save = this.save.bind(this);
            this.cancel = this.cancel.bind(this);
            this.changePrice = this.changePrice.bind(this);
        }

        createDialogOverlay() {
            const overlay = document.createElement('div');
            overlay.id = 'dialog-overlay';
            overlay.className = 'dialog-overlay';
            return overlay;
        }

        createDialog() {
            const dialog = document.createElement('dialog');
            dialog.className = 'dialog';
            dialog.id = 'builderDialog';
            return dialog;
        }

        open(option) {
            const _this = this;

            option.title = option.title || 'Title';
            option.width = option.width || 25;
            option.height = option.height || 45;
            option.cancel_text = option.cancel_text || 'Cancel';
            option.submit_text = option.submit_text || 'Save';
            option.footer = typeof option.footer != 'undefined' ? option.footer : true;
            option.disable_submit = option.disable_submit || false;
            this.next = option.next

            const template = option.template || template;

            template.execute({
                template_id: 'dialogTemplate',
                models: { "form": option },
                target_id: 'builderDialog',
                insert_type: 'innerHTML',
                class_name: _this,
                callback: (e) => {
                    _this.dialogElement.style.display = 'flex';
                    _this.dialogOverlayElement.style.display = 'block';

                    const form = $dom.getId('dialogForm');
                    _this.validator = new FormValidator(form);

                    // Event listeners
                    const saveBtn = $dom.getElement('#saveButton', _this.dialogElement);
                    const cancelBtn = $dom.getElement('#cancelButton', _this.dialogElement);
                    $event.bindEvent($dom.getElement('.close', _this.dialogElement), 'click', _this.close);
                    if (saveBtn) {
                        $event.bindEvent(saveBtn, 'click', _this.save);
                    }
                    if (cancelBtn) {
                        $event.bindEvent(cancelBtn, 'click', _this.cancel);
                    }
                    $event.bindEvent(window, 'click', (event) => {
                        if (event.target === _this.dialogElement) {
                            _this.close();
                        }
                    });


                }
            })

        }

        close() {
            this.dialogElement.innerHTML = '';
            this.dialogOverlayElement.style.display = 'none';
            this.dialogElement.style.display = 'none';
        }

        getFormData() {
            const data = {};

            // Get text inputs
            const textInputs = this.validator.form.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], select, textarea');
            textInputs.forEach(input => {
                data[input.name] = input.value.trim();
            });

            // Get checkboxes
            const checkboxGroups = this.validator.form.querySelectorAll('.checkbox-group');
            checkboxGroups.forEach(group => {
                const checked = Array.from(group.querySelectorAll('input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
                data[group.querySelector('input[type="checkbox"]').name] = checked;
            });

            // Get radio buttons
            const radioGroups = this.validator.form.querySelectorAll('.radio-group');
            radioGroups.forEach(group => {
                const checked = group.querySelector('input[type="radio"]:checked');
                data[group.querySelector('input[type="radio"]').name] = checked ? checked.value : null;
            });

            return data;
        }

        save(event) {
            event.preventDefault();


            const submitBtn = event.target;
            submitBtn.disabled = true;

            let isValid = true;

            // Validate all fields
            for (let field of this.validator.fields) {
                const valid = this.validator.validateField(field);
                if (!valid) isValid = false;
            }


            if (isValid) {
                // Form is valid, proceed with submission or further processing
                if (this.next) {
                    this.next(this.getFormData());
                }
                this.validator.form.reset();
                this.validator.clearErrors();

                this.close();
            }
            // Re-enable submit button
            submitBtn.disabled = false;
        }

        cancel() {
            this.close();
        }

        changePrice(event) {
            let planDurationDays = event.target.getAttribute('data-days');            
        
            // Calculate the next due date
            const currentDate = new Date();
            const nextDueDate = new Date(currentDate);
            nextDueDate.setDate(currentDate.getDate() + parseInt(planDurationDays));

            // Format the next due date (e.g., 30 November 2024)
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            const formattedNextDueDate = nextDueDate.toLocaleDateString(undefined, options);

            // Update the display with the selected plan
            $dom.getElement('[data-due-date]').textContent = formattedNextDueDate;
            $dom.getElement('[data-due-price]').textContent = event.target.getAttribute('data-price');

        }
    }

    const dialog = new MyDialog();

    $event.bindEvent(document, 'dialog:open', (e) => {
        dialog.open(e.detail);
    });

})(window);