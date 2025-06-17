document.addEventListener('DOMContentLoaded', function() {
            const signupForm = document.getElementById('signupForm');
            
            // Form validation
            function validateField(field, errorElement, validationFn, errorMessage) {
                const isValid = validationFn(field.value);
                if (!isValid) {
                    field.classList.add('border-red-500', 'focus:ring-red-500', 'focus:border-red-500');
                    field.classList.remove('border-gray-300', 'focus:ring-blue-500', 'focus:border-blue-500');
                    errorElement.textContent = errorMessage;
                    errorElement.classList.remove('hidden');
                } else {
                    field.classList.remove('border-red-500', 'focus:ring-red-500', 'focus:border-red-500');
                    field.classList.add('border-gray-300', 'focus:ring-blue-500', 'focus:border-blue-500');
                    errorElement.classList.add('hidden');
                }
                return isValid;
            }

            // Real-time validation
            const nameField = document.getElementById('name');
            const nameError = document.getElementById('nameError');
            const emailField = document.getElementById('email');
            const emailError = document.getElementById('emailError');
            const passwordField = document.getElementById('password');
            const passwordError = document.getElementById('passwordError');
            const confirmPasswordField = document.getElementById('confirmPassword');
            const confirmPasswordError = document.getElementById('confirmPasswordError');
            const termsCheckbox = document.getElementById('terms');
            const termsError = document.getElementById('termsError');

            nameField.addEventListener('blur', function() {
                validateField(this, nameError, 
                    value => value.trim().length >= 2, 
                    'Name must be at least 2 characters'
                );
            });

            emailField.addEventListener('blur', function() {
                validateField(this, emailError, 
                    value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 
                    'Please enter a valid email address'
                );
            });

            passwordField.addEventListener('blur', function() {
                validateField(this, passwordError, 
                    value => value.length >= 8, 
                    'Password must be at least 8 characters'
                );
                
                // Validate confirm password if it has value
                if (confirmPasswordField.value) {
                    validateField(confirmPasswordField, confirmPasswordError, 
                        value => value === passwordField.value, 
                        'Passwords do not match'
                    );
                }
            });

            confirmPasswordField.addEventListener('blur', function() {
                validateField(this, confirmPasswordError, 
                    value => value === passwordField.value, 
                    'Passwords do not match'
                );
            });

            termsCheckbox.addEventListener('change', function() {
                if (this.checked) {
                    termsError.classList.add('hidden');
                }
            });

            // Form submission
            signupForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Validate all fields
                const isNameValid = validateField(nameField, nameError, 
                    value => value.trim().length >= 2, 
                    'Name must be at least 2 characters'
                );
                
                const isEmailValid = validateField(emailField, emailError, 
                    value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 
                    'Please enter a valid email address'
                );
                
                const isPasswordValid = validateField(passwordField, passwordError, 
                    value => value.length >= 8, 
                    'Password must be at least 8 characters'
                );
                
                const isConfirmPasswordValid = validateField(confirmPasswordField, confirmPasswordError, 
                    value => value === passwordField.value, 
                    'Passwords do not match'
                );
                
                const isTermsChecked = termsCheckbox.checked;
                if (!isTermsChecked) {
                    termsError.textContent = 'You must agree to the terms';
                    termsError.classList.remove('hidden');
                } else {
                    termsError.classList.add('hidden');
                }

                if (isNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid && isTermsChecked) {
                    // Show loading state
                    const submitBtn = signupForm.querySelector('button[type="submit"]');
                    const originalText = submitBtn.innerHTML;
                    submitBtn.innerHTML = `
                        <span class="flex items-center justify-center">
                            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating account...
                        </span>
                    `;
                    submitBtn.disabled = true;

                    // Prepare signup data
                    const signupData = {
                        name: nameField.value,
                        email: emailField.value,
                        password: passwordField.value
                    };

                    // Make actual API call to your Flask backend
                    fetch('/signup', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(signupData)
                    })
                    .then(response => response.json())
                    .then(data => {
                        // Reset button
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;

                        if (data.success) {
                            // Show success message
                            const messageContainer = document.getElementById('messageContainer');
                            const messageText = document.getElementById('messageText');
                            
                            messageText.textContent = data.message || 'Account created successfully!';
                            messageContainer.classList.remove('hidden');
                            messageContainer.classList.remove('bg-red-100', 'border-red-400', 'text-red-700');
                            messageContainer.classList.add('bg-green-100', 'border-green-400', 'text-green-700');

                            // Reset form
                            signupForm.reset();

                            // Redirect to login after 2 seconds
                            setTimeout(() => {
                                window.location.href = '/login';
                            }, 2000);
                        } else {
                            // Show error message
                            const messageContainer = document.getElementById('messageContainer');
                            const messageText = document.getElementById('messageText');
                            
                            messageText.textContent = data.error || 'Signup failed';
                            messageContainer.classList.remove('hidden');
                            messageContainer.classList.remove('bg-green-100', 'border-green-400', 'text-green-700');
                            messageContainer.classList.add('bg-red-100', 'border-red-400', 'text-red-700');
                        }
                    })
                    .catch(error => {
                        // Reset button
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;

                        // Show error message
                        const messageContainer = document.getElementById('messageContainer');
                        const messageText = document.getElementById('messageText');
                        
                        messageText.textContent = 'Network error. Please try again.';
                        messageContainer.classList.remove('hidden');
                        messageContainer.classList.remove('bg-green-100', 'border-green-400', 'text-green-700');
                        messageContainer.classList.add('bg-red-100', 'border-red-400', 'text-red-700');
                    });
                }
            });
        });

        // Show/hide password (optional)
        function togglePasswordVisibility(fieldId) {
            const field = document.getElementById(fieldId);
            field.type = field.type === 'password' ? 'text' : 'password';
        }