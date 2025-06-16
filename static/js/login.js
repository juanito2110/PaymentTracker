document.addEventListener('DOMContentLoaded', function() {
            const loginForm = document.getElementById('loginForm');
            
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
            const usernameField = document.getElementById('username');
            const usernameError = document.getElementById('usernameError');
            const passwordField = document.getElementById('password');
            const passwordError = document.getElementById('passwordError');

            usernameField.addEventListener('blur', function() {
                validateField(this, usernameError, 
                    value => value.trim().length >= 3, 
                    'Username must be at least 3 characters'
                );
            });

            passwordField.addEventListener('blur', function() {
                validateField(this, passwordError, 
                    value => value.trim().length >= 6, 
                    'Password must be at least 6 characters'
                );
            });

            // Form submission
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Validate fields
                const isUsernameValid = validateField(usernameField, usernameError, 
                    value => value.trim().length >= 3, 
                    'Username must be at least 3 characters'
                );
                
                const isPasswordValid = validateField(passwordField, passwordError, 
                    value => value.trim().length >= 6, 
                    'Password must be at least 6 characters'
                );

                if (isUsernameValid && isPasswordValid) {
                    // Show loading state
                    const submitBtn = loginForm.querySelector('button[type="submit"]');
                    const originalText = submitBtn.innerHTML;
                    submitBtn.innerHTML = `
                        <span class="flex items-center justify-center">
                            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Signing in...
                        </span>
                    `;
                    submitBtn.disabled = true;

                    // Simulate API call (replace with actual fetch)
                    setTimeout(() => {
                        // Reset button
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;

                        // Show success message
                        const messageContainer = document.getElementById('messageContainer');
                        const messageText = document.getElementById('messageText');
                        
                        messageText.textContent = 'Login successful!';
                        messageContainer.classList.remove('hidden');
                        messageContainer.classList.remove('bg-red-100', 'border-red-400', 'text-red-700');
                        messageContainer.classList.add('bg-green-100', 'border-green-400', 'text-green-700');

                        // Hide message after 3 seconds
                        setTimeout(() => {
                            messageContainer.classList.add('hidden');
                        }, 3000);

                        // Redirect to dashboard (replace with your actual redirect)
                        // window.location.href = '/dashboard';
                    }, 1500);
                }
            });
        });

        // Show/hide password (optional)
        function togglePasswordVisibility() {
            const passwordField = document.getElementById('password');
            passwordField.type = passwordField.type === 'password' ? 'text' : 'password';
        }