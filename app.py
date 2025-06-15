from supabase import create_client, Client
import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, Response
from email_reader import process_emails  # Import the function above
import supabase
from jinja2 import Environment
from datetime import datetime
import json


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
IMAP_SERVER = os.getenv("IMAP_SERVER")
EMAIL_PASSWORD = os.getenv("PASSWORD")
EMAIL_USER = os.getenv("EMAIL")
SECRET_KEY = os.getenv("SECRET_KEY")

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

# Supabase client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

from jinja2 import Environment

@app.template_filter('datetimeformat')
def datetimeformat(value, format='%Y-%m-%d'):
    if value is None:
        return ""
    return datetime.strptime(value, '%Y-%m-%d').strftime(format)

@app.route('/sync-payments')
def sync_payments():
    new_payments = process_emails()
    if new_payments:
        flash(f"Successfully processed {len(new_payments)} new payments!", "success")
    else:
        flash("No new payments found to process", "info")
    return redirect(url_for('dashboard'))

@app.route('/dashboard')
def dashboard():
    # ✅ Keep recent payments separate from user-level payments
    recent_payments_response = supabase.table("payments").select("*").order("payment_date", desc=True).limit(200).execute()
    recent_payments = recent_payments_response.data if not isinstance(recent_payments_response, list) else recent_payments_response
    for p in recent_payments:
        if isinstance(p.get("payment_date"), str):
            # Convert string to datetime and back to string in date-only format
            try:
                dt = datetime.fromisoformat(p["payment_date"].replace("Z", "+00:00"))  # handle Zulu time
                p["payment_date"] = dt.strftime("%d-%m-%Y")
            except ValueError:
                pass
        elif isinstance(p.get("payment_date"), datetime):
            p["payment_date"] = p["payment_date"].strftime("%d-%m-%Y")

    # Fetch payment summary
    summary = supabase.rpc("get_payment_summary").execute()

    # Fetch users with joined activities and payments
    users_raw = supabase.table("users").select("*, payments(*), activities(name)").execute()
    users_raw = users_raw.data if not isinstance(users_raw, list) else users_raw

    users = []
    for user in users_raw:
        user_payments = user.get("payments", [])
        payment_frequency = user.get("payment_frequency", 0)
        expected_amount = user.get("expected_payment_amount", 0.0)

        paid_count = len(user_payments)
        paid_total = sum(p["amount"] for p in user_payments if p.get("amount") is not None)
        expected_total = payment_frequency * expected_amount

        # Fix: handle None for activities
        activity_name = user.get("activities", {}).get("name") if user.get("activities") else "N/A"

        users.append({
            "full_name": user["full_name"],
            "activity": activity_name,
            "paid_count": paid_count,
            "payment_frequency": payment_frequency,
            "paid_total": paid_total,
            "expected_total": expected_total
        })

    return render_template('dashboard.html', 
        payments=recent_payments,  # ✅ this stays the full independent list
        summary=summary.data,
        users=users)

@app.route('/users', methods=['GET', 'POST'])
def manage_users():
    if request.method == 'POST':
        # Get form data
        try:
            first_name = request.form['first_name']
            print(f"Received first_name: {first_name}")  # Debugging line
            last_name = request.form['last_name']
            phone = request.form['phone']
            print(f"Received phone: {phone}")  # Debugging line
            birth_date = request.form.get('birth_date')  # Using get() as it's optional
            activity_id = request.form['activity_id']
            print(f"Received activity_id: {activity_id}")  # Debugging line
            payment_plan_type = request.form['payment_plan_type']
            expected_payment_amount = float(request.form['expected_payment_amount'])
            payment_frequency = int(request.form['payment_frequency'])
            
            # Insert into Supabase
            response = supabase.table('users').insert({
                "first_name": first_name,
                "last_name": last_name,
                "phone": phone,
                "birth_date": birth_date,
                "activity_id": activity_id,
                "payment_plan_type": payment_plan_type,
                "expected_payment_amount": expected_payment_amount,
                "payment_frequency": payment_frequency
            }).execute()
            print("Response from Supabase:", response)
            
            flash('User added successfully!', 'success')
            return redirect(url_for('manage_users'))
        
        except Exception as e:
            # For AJAX requests, return JSON
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'error': str(e)}), 400
            flash(f'Error adding user: {str(e)}', 'danger')
            return redirect(url_for('manage_users'))
    
    # GET request handling remains the same
    users = supabase.table('users').select('*').execute()
    activities = supabase.table('activities').select('*').execute()
    
    return render_template('users.html', 
                         users=users.data,
                         activities=activities.data)

@app.route('/users/delete/<user_id>', methods=['POST'])
def delete_user(user_id):
    try:
        supabase.table('users').delete().eq('id', user_id).execute()
        flash('User deleted successfully!', 'success')
    except Exception as e:
        flash(f'Error deleting user: {str(e)}', 'danger')
    return redirect(url_for('manage_users'))

@app.route("/api/users")
def get_users():
    # Join users with activities table to get the activity name
    users = supabase.table("users").select("*, activities(name)").execute()

    simplified_users = []
    for user in users.data:
        simplified_users.append({
            "id": user.get("id"),
            "first_name": user.get("first_name"),
            "last_name": user.get("last_name"),
            "birthdate": user.get("birth_date"),
            "phone": user.get("phone"),
            "activity_id": user.get("activity_id"),
            "activity_name": user.get("activities", {}).get("name") if user.get("activities") else None,
            "plan_type": user.get("payment_plan_type"),
            "amount": user.get("expected_payment_amount"),
        })

    return Response(json.dumps(simplified_users, default=str), mimetype="application/json")

@app.route('/manage_activities', methods=['GET', 'POST'])
def manage_activities():
    if request.method == 'POST':
        try:
            # Accept JSON data from fetch
            if request.is_json:
                data = request.get_json()
            else:
                data = request.form

            name = data.get('name')
            price = float(data.get('price'))
            # Handle custom frequency
            frequency = data.get('frequency')
            if frequency == 'custom':
                frequency = int(data.get('customFrequencyValue'))
            else:
                frequency = int(frequency)

            # Insert into Supabase
            response = supabase.table("activities").insert({
                "name": name,
                "price": price,
                "frequency": frequency
            }).execute()

            # Return the newly created activity
            return jsonify({
                'success': True,
                'activity': response.data[0] if response.data else None
            })

        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400

    # GET request - fetch activities
    try:
        response = supabase.table("activities").select("*").order("name").execute()
        activities = response.data if hasattr(response, 'data') else []

        # Check if it's an AJAX request
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify(activities)

        return render_template('manage_activities.html', activities=activities)

    except Exception as e:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({'error': str(e)}), 400

        flash(f'Error loading activities: {str(e)}', 'danger')
        return render_template('manage_activities.html', activities=[])

@app.route('/delete_activity', methods=['POST'])
def delete_activity():
    try:
        data = request.get_json()
        activity_id = data.get('id')

        if not activity_id:
            raise ValueError("Activity ID is required")

        # Delete from Supabase
        response = supabase.table("activities").delete().eq("id", activity_id).execute()

        # response.data may be None if nothing was deleted
        if not response.data or len(response.data) == 0:
            raise ValueError("Activity not found")

        return jsonify({
            'success': True,
            'message': 'Activity deleted successfully'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        # Authenticate user here
        # Redirect on success or show error
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        # Authenticate user here
        # Redirect on success or show error
    return render_template('signup.html')