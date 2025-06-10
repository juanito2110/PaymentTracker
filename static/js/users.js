document.addEventListener("DOMContentLoaded", () => {
          fetch("/api/users")
              .then(response => response.json())
              .then(users => {
                  const tableBody = document.getElementById("usersTableBody");
                  tableBody.innerHTML = "";  // Clear existing rows
                  users.forEach(user => {
                  console.log("User object:", user);  // 👈 log this to debug structure

                  const userId = user.id || user.user_id || "";
                  const name = user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim();
                  const initials = name.split(" ").map(n => n[0] || "").join("").slice(0, 2).toUpperCase();
                  const birthdate = user.birthdate || user.birth_date || "";
                  const phone = user.phone || "";
                  const activity = user.activity || user.activity_id || "";
                  const plan = user.plan_type || user.payment_plan_type || "";
                  const amount = user.amount || user.expected_payment_amount || "";

                  const row = `
                    <tr class="hover:bg-gray-50 transition-colors" data-user-id="${user.id}">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="flex-shrink-0 h-10 w-10">
                            <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span class="text-blue-600 font-medium text-sm">${initials}</span>
                            </div>
                          </div>
                          <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${name}</div>
                            <div class="text-sm text-gray-500">${birthdate}</div>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${phone}</td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          ${activity}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${plan}</div>
                        <div class="text-sm text-gray-500">${amount}€</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="deleteUser(this)" class="text-red-600 hover:text-red-900 flex items-center gap-1 transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>                          
                        </button>
                      </td>
                    </tr>
                  `;
                  lucide.createIcons();

                  tableBody.insertAdjacentHTML('beforeend', row);
              });

                  // Update user count
                  document.getElementById("userCount").textContent = `${users.length} user${users.length !== 1 ? "s" : ""}`;
              });
      });

        // Initialize Lucide icons
        lucide.createIcons();

        // Form handling
        document.getElementById('userForm').addEventListener('submit', function(e) {
          e.preventDefault();
          
          const submitBtn = document.getElementById('submitBtn');
          const submitText = document.getElementById('submitText');
          const loadingIcon = document.getElementById('loadingIcon');
          
          // Show loading state
          submitBtn.disabled = true;
          submitText.textContent = 'Adding User...';
          loadingIcon.classList.remove('hidden');
          
          // Create FormData object
          const formData = new FormData(this);
          
          // Send data to server
          fetch(this.action, {
              method: this.method,
              body: formData
          })
          .then(response => {
              if (response.redirected) {
                  window.location.href = response.url;
              } else {
                  return response.json();
              }
          })
          .then(data => {
              if (data && data.error) {
                  showMessage(data.error, 'error');
              }
          })
          .catch(error => {
              showMessage('Error adding user', 'error');
          })
          .finally(() => {
              // Reset button state
              submitBtn.disabled = false;
              submitText.textContent = 'Add User';
              loadingIcon.classList.add('hidden');
          });
      });

        function showMessage(message, type) {
            const container = document.getElementById('messageContainer');
            const alertClass = type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800';
            const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
            
            container.innerHTML = `
                <div class="success-message ${alertClass} border rounded-lg p-4 flex items-center gap-3">
                    <i data-lucide="${iconName}" class="w-5 h-5"></i>
                    <span>${message}</span>
                    <button onclick="this.parentElement.remove()" class="ml-auto">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            
            lucide.createIcons();
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                const alert = container.querySelector('.success-message');
                if (alert) {
                    alert.remove();
                }
            }, 5000);
        }

        function resetForm() {
            document.getElementById('userForm').reset();
            
            // Reset floating labels
            document.querySelectorAll('.form-input').forEach(input => {
                input.value = '';
            });
        }

        async function deleteUser(button) {
          try {
              if (!confirm('Are you sure you want to delete this user?')) return;
              
              const row = button.closest('tr');
              const userId = row.dataset.userId;
              
              if (!userId) throw new Error("No user ID found");
              
              // Visual feedback
              row.style.opacity = '0.5';
              button.disabled = true;
              
              // Send delete request
              const response = await fetch(`/users/delete/${userId}`, {
                  method: 'POST',
                  headers: {
                      'X-Requested-With': 'XMLHttpRequest',
                      'Accept': 'application/json'
                  }
              });
              
              if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  throw new Error(errorData.error || 'Failed to delete user');
              }
              
              // Remove from UI
              row.remove();
              updateUserCount();
              showMessage('User deleted successfully!', 'success');
              
          } catch (error) {
              console.error('Delete error:', error);
              showMessage(error.message, 'error');
              
              // Reset UI if error occurred
              if (row) row.style.opacity = '1';
              if (button) button.disabled = false;
          }
        }

        function addUserToTable() {
            const form = document.getElementById('userForm');
            const formData = new FormData(form);
            
            const firstName = formData.get('first_name');
            const lastName = formData.get('last_name');
            const phone = formData.get('phone');
            const birthDate = formData.get('birth_date');
            const activityId = formData.get('activity_id');
            const paymentPlan = formData.get('payment_plan_type');
            const expectedPayment = formData.get('expected_payment_amount');
            
            // Get activity name
            const activitySelect = document.getElementById('activity');
            const activityName = activitySelect.options[activitySelect.selectedIndex].text;
            
            // Generate initials
            const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
            
            // Generate random color for avatar
            const colors = ['blue', 'green', 'purple', 'pink', 'indigo', 'yellow'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const newRow = `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-10 w-10">
                                <div class="h-10 w-10 rounded-full bg-${color}-100 flex items-center justify-center">
                                    <span class="text-${color}-600 font-medium text-sm">${initials}</span>
                                </div>
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">${firstName} ${lastName}</div>
                                ${birthDate ? `<div class="text-sm text-gray-500">${birthDate}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${phone}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800">
                            ${activityName}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${paymentPlan.charAt(0).toUpperCase() + paymentPlan.slice(1)}</div>
                        <div class="text-sm text-gray-500">${expectedPayment}€</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="deleteUser(this)" class="text-red-600 hover:text-red-900 flex items-center gap-1 transition-colors">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                            Delete
                        </button>
                    </td>
                </tr>
            `;
            
            document.getElementById('usersTableBody').insertAdjacentHTML('beforeend', newRow);
            lucide.createIcons();
            updateUserCount();
        }

        function updateUserCount() {
            const count = document.getElementById('usersTableBody').children.length;
            document.getElementById('userCount').textContent = `${count} user${count !== 1 ? 's' : ''}`;
        }

        function goBack() {
            // In a real application, this would navigate to the dashboard
            alert('Navigate back to dashboard');
        }

        // Phone number formatting
        document.getElementById('phone').addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0 && !value.startsWith('34')) {
                if (value.startsWith('6') || value.startsWith('7') || value.startsWith('9')) {
                    value = '34' + value;
                }
            }
            if (value.length > 11) {
                value = value.substring(0, 11);
            }
            if (value.length > 0) {
                e.target.value = '+' + value;
            }
        });

        // Form validation
        document.querySelectorAll('.form-input[required]').forEach(input => {
            input.addEventListener('blur', function() {
                if (!this.value.trim()) {
                    this.classList.add('border-red-300');
                    this.classList.remove('border-gray-300');
                } else {
                    this.classList.remove('border-red-300');
                    this.classList.add('border-gray-300');
                }
            });
        });