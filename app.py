from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, Response, session
from dbCode import DBOperations
from functools import wraps
import os
from dotenv import load_dotenv
import supabase
from supabase import create_client, Client
from email_reader import process_emails  # Import the function above
from jinja2 import Environment
from datetime import datetime
import json
import bcrypt



load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
IMAP_SERVER = os.getenv("IMAP_SERVER")
EMAIL_PASSWORD = os.getenv("PASSWORD")
EMAIL_USER = os.getenv("EMAIL")
SECRET_KEY = os.getenv("SECRET_KEY")

# Supabase client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.endpoint == 'login':
            return f(*args, **kwargs)
            
        if not session.get('logged_in') or not session.get('admin_id'):
            flash('Please log in to access this page', 'danger')
            
            if request.method == 'GET':
                session['next_url'] = request.url
                
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/sync-payments')
@login_required 
def sync_payments():
    new_payments = DBOperations.sync_payments()
    if new_payments:
        flash(f"Successfully processed {len(new_payments)} new payments!", "success")
    else:
        flash("No new payments found to process", "info")
    return redirect(url_for('dashboard'))

@app.route('/dashboard')
@login_required 
def dashboard():
    data = DBOperations.get_dashboard_data()
    return render_template('dashboard.html', 
        payments=data["payments"],
        summary=data["summary"],
        users=data["users"])

@app.route('/users', methods=['GET', 'POST'])
@login_required
def manage_users():
    if request.method == 'POST':
        result = DBOperations.manage_users_operation(request.form)
        if result['success']:
            flash(result['message'], 'success')
        else:
            flash(f'Error adding user: {result["error"]}', 'danger')
        return redirect(url_for('manage_users'))
    
    users = supabase.table('users').select('*').execute()
    activities = supabase.table('activities').select('*').execute()
    return render_template('users.html', 
                         users=users.data,
                         activities=activities.data)

@app.route('/users/delete/<user_id>', methods=['POST'])
@login_required
def delete_user(user_id):
    result = DBOperations.manage_users_operation(delete_id=user_id)
    if result['success']:
        flash(result['message'], 'success')
    else:
        flash(f'Error deleting user: {result["error"]}', 'danger')
    return redirect(url_for('manage_users'))

@app.route("/api/users")
@login_required
def get_users():
    users = DBOperations.get_users()
    return Response(json.dumps(users, default=str), mimetype="application/json")

@app.route('/manage_activities', methods=['GET', 'POST'])
@login_required
def manage_activities():
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        result = DBOperations.manage_activities_operation(data)
        return jsonify(result)

    activities = DBOperations.get_activities()
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify(activities)
    return render_template('manage_activities.html', activities=activities)

@app.route('/delete_activity', methods=['POST'])
@login_required
def delete_activity():
    data = request.get_json()
    result = DBOperations.manage_activities_operation(delete_id=data.get('id'))
    return jsonify(result)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if session.get('logged_in') and request.method == 'GET':
        next_url = session.pop('next_url', None) or url_for('dashboard')
        return redirect(next_url)
    
    if request.method == 'POST':
        data = request.get_json()
        result = DBOperations.login_user(data.get('email'), data.get('password'))
        
        if result['success']:
            session['admin_id'] = result['user']['id']
            session['admin_email'] = result['user']['email']
            session['admin_name'] = result['user']['name']
            session['logged_in'] = True
            next_url = session.pop('next_url', None) or url_for('dashboard')
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'redirect': next_url,
                'user': result['user']
            })
        else:
            return jsonify({'success': False, 'error': result['error']}), 401
    
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        data = request.get_json()
        result = DBOperations.signup_user(data.get('name'), data.get('email'), data.get('password'))
        return jsonify(result)
    return render_template('signup.html')

@app.route('/account')
@login_required
def account():
    return render_template('account.html')

@app.route('/api/account')
@login_required
def get_account_info():
    result = DBOperations.get_account_info(session['admin_id'])
    return jsonify(result)

@app.route('/api/account/change-password', methods=['POST'])
@login_required
def change_password():
    data = request.get_json()
    result = DBOperations.change_password(
        session['admin_id'],
        data.get('current_password'),
        data.get('new_password')
    )
    return jsonify(result)

@app.route('/logout', methods=['POST', 'GET'])
@login_required
def logout():
    session.clear()
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({
            'success': True, 
            'message': 'Logged out successfully',
            'redirect': url_for('login')
        })
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True)