// Show error message
            function showMessage(message, type) {
                const container = document.getElementById('messageContainer') || document.body;
                const alertClass = type === 'success' ? 'bg-green-100 border-green-200 text-green-800' : 'bg-red-100 border-red-200 text-red-800';
                
                const messageDiv = document.createElement('div');
                messageDiv.className = `fixed top-4 right-4 ${alertClass} border rounded-lg p-4 flex items-center shadow-lg z-50`;
                messageDiv.innerHTML = `
                    <span>${message}</span>
                    <button onclick="this.parentElement.remove()" class="ml-4">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                `;
                
                container.appendChild(messageDiv);
                setTimeout(() => messageDiv.remove(), 5000);
            }
        // Form validation and interactivity
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize the page
            loadActivities();
            lucide.createIcons();


            

            const form = document.getElementById('activityForm');
            const frequencySelect = document.getElementById('frequency');
            const customFrequencyDiv = document.getElementById('customFrequency');
            const customFrequencyInput = document.getElementById('customFrequencyValue');

            // Handle custom frequency selection
            frequencySelect.addEventListener('change', function() {
                if (this.value === 'custom') {
                    customFrequencyDiv.classList.remove('hidden');
                    customFrequencyInput.required = true;
                } else {
                    customFrequencyDiv.classList.add('hidden');
                    customFrequencyInput.required = false;
                    customFrequencyInput.value = '';
                }
            });

            // Form validation
            function validateField(field, errorElement, validationFn, errorMessage) {
                const isValid = validationFn(field.value);
                if (!isValid) {
                    field.classList.add('border-red-500', 'focus:ring-red-500', 'focus:border-red-500');
                    field.classList.remove('border-gray-300', 'focus:ring-primary-500', 'focus:border-primary-500');
                    errorElement.textContent = errorMessage;
                    errorElement.classList.remove('hidden');
                } else {
                    field.classList.remove('border-red-500', 'focus:ring-red-500', 'focus:border-red-500');
                    field.classList.add('border-gray-300', 'focus:ring-primary-500', 'focus:border-primary-500');
                    errorElement.classList.add('hidden');
                }
                return isValid;
            }

            // Real-time validation
            const nameField = document.getElementById('name');
            const nameError = document.getElementById('nameError');
            const priceField = document.getElementById('price');
            const priceError = document.getElementById('priceError');
            const frequencyError = document.getElementById('frequencyError');

            nameField.addEventListener('blur', function() {
                validateField(this, nameError, 
                    value => value.trim().length >= 2, 
                    'Activity name must be at least 2 characters long'
                );
            });

            priceField.addEventListener('blur', function() {
                validateField(this, priceError, 
                    value => parseFloat(value) > 0, 
                    'Price must be greater than 0'
                );
            });

            // Form submission
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                // Validate all fields
                const isNameValid = validateField(nameField, nameError, 
                    value => value.trim().length >= 2, 
                    'Activity name must be at least 2 characters long'
                );
                
                const isPriceValid = validateField(priceField, priceError, 
                    value => parseFloat(value) > 0, 
                    'Price must be greater than 0'
                );

                let isFrequencyValid = true;
                if (frequencySelect.value === '') {
                    frequencyError.textContent = 'Please select a frequency';
                    frequencyError.classList.remove('hidden');
                    isFrequencyValid = false;
                } else if (frequencySelect.value === 'custom' && (!customFrequencyInput.value || parseInt(customFrequencyInput.value) < 1)) {
                    frequencyError.textContent = 'Custom frequency must be at least 1 month';
                    frequencyError.classList.remove('hidden');
                    isFrequencyValid = false;
                } else {
                    frequencyError.classList.add('hidden');
                }

                if (!isNameValid || !isPriceValid || !isFrequencyValid) return;

                // Prepare form data
                const formData = new FormData(form);
                const data = {
                    name: formData.get('name'),
                    price: formData.get('price'),
                    frequency: formData.get('frequency'),
                };
                
                // Add custom frequency if selected
                if (data.frequency === 'custom') {
                    data.customFrequencyValue = formData.get('customFrequencyValue');
                }

                try {
                    // Submit to server
                    const response = await fetch('/manage_activities', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.error || 'Failed to add activity');
                    }

                    // Show success message
                    showSuccessMessage();
                    
                    // Reset form
                    form.reset();
                    customFrequencyDiv.classList.add('hidden');
                    customFrequencyInput.required = false;

                    // Add to activities table
                    if (result.activity) {
                        addActivityToTable(result.activity);
                        updateActivityCount();
                    }

                } catch (error) {
                    showMessage(error.message, 'error');
                    console.error('Error:', error);
                }
            });

            // Show success message with animation
            function showSuccessMessage() {
                const successMessage = document.getElementById('successMessage');
                successMessage.classList.remove('hidden');
                setTimeout(() => {
                    successMessage.classList.add('hidden');
                }, 3000);
            }

            
        });

        // Add activity to table
        function addActivityToTable(activity) {
            const tableBody = document.getElementById('activitiesTableBody');
            const emptyState = document.getElementById('emptyState');
            emptyState.classList.add('hidden');

            // Ensure price is a float
            const price = typeof activity.price === 'number' ? activity.price : parseFloat(activity.price);

            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition-colors duration-150';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-8 w-8 ${getInitialsColor(activity.name)} rounded-full flex items-center justify-center">
                            <span class="text-${getInitialsColor(activity.name).split('-')[1]}-600 font-medium text-sm">${getInitials(activity.name)}</span>
                        </div>
                        <div class="ml-3">
                            <div class="text-sm font-medium text-gray-900">${activity.name}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">€${price.toFixed(2)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFrequencyBadgeClass(activity.frequency)}">
                        ${getFrequencyText(activity.frequency)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="deleteActivity(this)" data-activity-id="${activity.id}" class="text-red-600 hover:text-red-900 transition-colors duration-150">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg> 
                    </button>
                </td>
            `;
            lucide.createIcons();
            tableBody.appendChild(row);
        }

        async function deleteActivity(button) {
            if (!confirm('Are you sure you want to delete this activity?')) return;

            const row = button.closest('tr');
            const activityId = button.getAttribute('data-activity-id');

            try {
                row.style.opacity = '0.5';
                button.disabled = true;

                const response = await fetch(`/delete_activity`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({ id: activityId })
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || 'Failed to delete activity');
                }

                row.remove();
                updateActivityCount();
                showMessage('Activity deleted successfully!', 'success');

            } catch (error) {
                row.style.opacity = '1';
                button.disabled = false;
                showMessage(error.message, 'error');
            }
        }

        // Update activity count display
        function updateActivityCount() {
            const count = document.getElementById('activitiesTableBody').children.length;
            document.getElementById('activityCount').textContent = count;
        }

        // Get initials for activity avatar
        function getInitials(name) {
            if (!name) return '';
            return name.trim().charAt(0).toUpperCase();
        }

        // Get color class for activity initials
        function getInitialsColor(name) {
            const colors = ['bg-blue-100', 'bg-green-100', 'bg-red-100', 'bg-yellow-100', 'bg-purple-100'];
            const index = name.charCodeAt(0) % colors.length;
            return colors[index];
        }

        // Get frequency badge class
        function getFrequencyBadgeClass(frequency) {
            switch (frequency) {
                case '1':
                    return 'bg-green-100 text-green-800';
                case '3':
                    return 'bg-blue-100 text-blue-800';
                case 'custom':
                    return 'bg-yellow-100 text-yellow-800';
                default:
                    return 'bg-gray-100 text-gray-800';
            }
        }

        // Get frequency text
        function getFrequencyText(frequency) {
            switch (frequency) {
                case '1':
                    return 'Monthly';
                case '3':
                    return 'Quarterly';
                case 'custom':
                    return 'Custom';
                default:
                    return '';
            }
        }

        // Load activities from server
        async function loadActivities() {
            try {
                const response = await fetch('/manage_activities', {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                const activities = await response.json();

                const tableBody = document.getElementById('activitiesTableBody');
                tableBody.innerHTML = '';

                if (!activities || activities.length === 0) {
                    document.getElementById('emptyState').classList.remove('hidden');
                } else {
                    activities.forEach(activity => {
                        addActivityToTable(activity);
                    });
                    document.getElementById('emptyState').classList.add('hidden');
                }

                updateActivityCount();
            } catch (error) {
                console.error('Error loading activities:', error);
                showMessage('Error loading activities', 'error');
            }
        }