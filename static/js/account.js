// Load account info when page loads
        document.addEventListener('DOMContentLoaded', function() {
            fetchAccountInfo();
            lucide.createIcons();
        });

        // Fetch account information
        function fetchAccountInfo() {
            fetch('/api/account')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('username-display').textContent = data.user.name;
                        document.getElementById('email-display').textContent = data.user.email;
                    } else {
                        showMessage(data.error || 'Failed to load account info', 'error');
                    }
                })
                .catch(error => {
                    showMessage('Network error. Please try again.', 'error');
                });
        }

        // Handle password change form
        document.getElementById('change-password-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                current_password: document.getElementById('current-password').value,
                new_password: document.getElementById('new-password').value,
                confirm_password: document.getElementById('confirm-password').value
            };

            if (formData.new_password !== formData.confirm_password) {
                showMessage('New passwords do not match', 'error');
                return;
            }

            fetch('/api/account/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage('Password updated successfully!', 'success');
                    document.getElementById('change-password-form').reset();
                } else {
                    showMessage(data.error || 'Failed to update password', 'error');
                }
            })
            .catch(error => {
                showMessage('Network error. Please try again.', 'error');
            });
        });

        // Logout function
        function logout() {
            fetch('/logout', {
                method: 'POST'
            })
            .then(() => {
                window.location.href = '/login';
            });
        }

        // Utility functions for messages
        function showMessage(message, type = 'success') {
            const container = document.getElementById('message-container');
            const text = document.getElementById('message-text');
            
            container.className = `fixed top-4 right-4 z-50 flex items-center px-4 py-3 rounded-lg shadow-lg ${
                type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'
            }`;
            
            text.textContent = message;
            container.classList.remove('hidden');
            
            setTimeout(hideMessage, 5000);
        }

        function hideMessage() {
            document.getElementById('message-container').classList.add('hidden');
        }