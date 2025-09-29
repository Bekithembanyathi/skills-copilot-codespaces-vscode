// Reservation Management System - Frontend JavaScript

class ReservationAPI {
    constructor() {
        this.baseURL = '/api';
        this.token = localStorage.getItem('authToken');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth methods
    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (data.success) {
            this.token = data.data.token;
            localStorage.setItem('authToken', this.token);
        }
        
        return data;
    }

    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    logout() {
        this.token = null;
        localStorage.removeItem('authToken');
        location.reload();
    }

    // Reservation methods
    async getReservations(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/reservations?${params}`);
    }

    async getReservation(id) {
        return this.request(`/reservations/${id}`);
    }

    async createReservation(data) {
        return this.request('/reservations', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateReservation(id, data) {
        return this.request(`/reservations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async cancelReservation(id) {
        return this.request(`/reservations/${id}`, {
            method: 'DELETE'
        });
    }

    async checkAvailability(data) {
        return this.request('/reservations/check-availability', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async processPayment(reservationId, paymentData) {
        return this.request(`/reservations/${reservationId}/payment`, {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }

    // Analytics methods
    async getDashboardSummary() {
        return this.request('/analytics/dashboard');
    }

    async getSalesReport(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/analytics/sales?${params}`);
    }
}

// Global API instance
const api = new ReservationAPI();

// Application state
let currentPage = 1;
let currentFilters = {};

// Utility functions
function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('main');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Navigation functions
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(sectionId).style.display = 'block';
    
    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        reservations: 'Reservations',
        customers: 'Customers',
        analytics: 'Analytics',
        payments: 'Payments'
    };
    document.getElementById('page-title').textContent = titles[sectionId] || sectionId;
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[href="#${sectionId}"]`).classList.add('active');
    
    // Load section data
    loadSectionData(sectionId);
}

function loadSectionData(sectionId) {
    switch (sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'reservations':
            loadReservations();
            break;
    }
}

// Dashboard functions
async function loadDashboardData() {
    try {
        const data = await api.getDashboardSummary();
        
        if (data.success) {
            const summary = data.data;
            
            document.getElementById('today-bookings').textContent = summary.today.totalBookings;
            document.getElementById('today-revenue').textContent = formatCurrency(summary.today.totalRevenue);
            document.getElementById('month-bookings').textContent = summary.thisMonth.totalBookings;
            document.getElementById('month-revenue').textContent = formatCurrency(summary.thisMonth.totalRevenue);
            
            updateRecentBookingsTable(summary.recentBookings);
        }
    } catch (error) {
        showAlert('Failed to load dashboard data: ' + error.message, 'danger');
    }
}

function updateRecentBookingsTable(bookings) {
    const tbody = document.querySelector('#recent-bookings-table tbody');
    tbody.innerHTML = '';
    
    bookings.forEach(booking => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.id.substring(0, 8)}...</td>
            <td>${booking.customerName}</td>
            <td>${booking.serviceType}</td>
            <td>${formatDate(booking.createdAt)}</td>
            <td>${formatCurrency(booking.totalAmount)}</td>
            <td>
                <span class="badge bg-${getStatusColor(booking.status)}">
                    ${booking.status}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getStatusColor(status) {
    const colors = {
        pending: 'warning',
        confirmed: 'success',
        cancelled: 'danger',
        completed: 'primary'
    };
    return colors[status] || 'secondary';
}

// Reservations functions
async function loadReservations() {
    try {
        const filters = {
            page: currentPage,
            limit: 10,
            ...currentFilters
        };
        
        const data = await api.getReservations(filters);
        
        if (data.success) {
            updateReservationsTable(data.data.bookings);
            updatePagination(data.data.pagination);
        }
    } catch (error) {
        showAlert('Failed to load reservations: ' + error.message, 'danger');
    }
}

function updateReservationsTable(reservations) {
    const tbody = document.querySelector('#reservations-table tbody');
    tbody.innerHTML = '';
    
    reservations.forEach(reservation => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${reservation.id.substring(0, 8)}...</td>
            <td>${reservation.customerName}</td>
            <td>${reservation.serviceType}</td>
            <td>${reservation.checkIn ? formatDate(reservation.checkIn) : '-'}</td>
            <td>${reservation.checkOut ? formatDate(reservation.checkOut) : '-'}</td>
            <td>${reservation.guests}</td>
            <td>${formatCurrency(reservation.totalAmount)}</td>
            <td>
                <span class="badge bg-${getStatusColor(reservation.status)}">
                    ${reservation.status}
                </span>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewReservation('${reservation.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-outline-warning" onclick="editReservation('${reservation.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="cancelReservation('${reservation.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updatePagination(pagination) {
    const paginationElement = document.getElementById('pagination');
    paginationElement.innerHTML = '';
    
    for (let i = 1; i <= pagination.totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === pagination.page ? 'active' : ''}`;
        li.innerHTML = `
            <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
        `;
        paginationElement.appendChild(li);
    }
}

function changePage(page) {
    currentPage = page;
    loadReservations();
}

function filterReservations() {
    currentFilters = {
        status: document.getElementById('status-filter').value,
        serviceType: document.getElementById('service-filter').value
    };
    currentPage = 1;
    loadReservations();
}

// Modal functions
function showNewBookingModal() {
    const modal = new bootstrap.Modal(document.getElementById('newBookingModal'));
    modal.show();
}

async function createBooking() {
    try {
        const formData = {
            customerId: Date.now().toString(), // Temporary customer ID
            customerName: document.getElementById('customerName').value,
            customerEmail: document.getElementById('customerEmail').value,
            customerPhone: document.getElementById('customerPhone').value,
            serviceType: document.getElementById('serviceType').value,
            serviceDetails: {
                name: document.getElementById('serviceType').value,
                description: document.getElementById('serviceDescription').value
            },
            checkIn: document.getElementById('checkIn').value ? new Date(document.getElementById('checkIn').value) : undefined,
            checkOut: document.getElementById('checkOut').value ? new Date(document.getElementById('checkOut').value) : undefined,
            guests: parseInt(document.getElementById('guests').value),
            totalAmount: parseFloat(document.getElementById('totalAmount').value)
        };

        const data = await api.createReservation(formData);
        
        if (data.success) {
            showAlert('Booking created successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('newBookingModal')).hide();
            document.getElementById('newBookingForm').reset();
            
            // Refresh current view
            if (document.getElementById('dashboard').style.display !== 'none') {
                loadDashboardData();
            } else if (document.getElementById('reservations').style.display !== 'none') {
                loadReservations();
            }
        }
    } catch (error) {
        showAlert('Failed to create booking: ' + error.message, 'danger');
    }
}

// Action functions
async function viewReservation(id) {
    try {
        const data = await api.getReservation(id);
        if (data.success) {
            // Implementation for viewing reservation details
            console.log('Viewing reservation:', data.data);
            showAlert('Viewing reservation details', 'info');
        }
    } catch (error) {
        showAlert('Failed to load reservation details: ' + error.message, 'danger');
    }
}

async function editReservation(id) {
    // Implementation for editing reservation
    showAlert('Edit reservation feature coming soon', 'info');
}

async function cancelReservation(id) {
    if (confirm('Are you sure you want to cancel this reservation?')) {
        try {
            const data = await api.cancelReservation(id);
            if (data.success) {
                showAlert('Reservation cancelled successfully', 'success');
                loadReservations();
            }
        } catch (error) {
            showAlert('Failed to cancel reservation: ' + error.message, 'danger');
        }
    }
}

function checkAvailability() {
    showAlert('Check availability feature coming soon', 'info');
}

function processPayment() {
    showAlert('Process payment feature coming soon', 'info');
}

function sendNotification() {
    showAlert('Send notification feature coming soon', 'info');
}

function refreshData() {
    const currentSection = document.querySelector('.section:not([style*="display: none"])').id;
    loadSectionData(currentSection);
    showAlert('Data refreshed', 'success');
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    if (!api.token) {
        // For demo purposes, we'll create a mock token
        // In a real app, you'd redirect to login page
        console.log('No auth token found - in a real app, redirect to login');
    }
    
    // Load initial dashboard data
    loadDashboardData();
});