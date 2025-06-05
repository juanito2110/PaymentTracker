from supabase import create_client, Client
import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, redirect, url_for, flash
from email_reader import process_emails  # Import the function above
import supabase

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
    # Fetch recent payments
    payments = supabase.table("payments").select("*").order("payment_date", desc=True).limit(10).execute()
    
    # Fetch payment summary
    summary = supabase.rpc("get_payment_summary").execute()  # You'll need to create this function in Supabase
    
    # Fetch users with payment status
    users = supabase.table("users").select("*, payments(*)").execute()
    
    return render_template('dashboard.html', 
                         payments=payments.data,
                         summary=summary.data,
                         users=users.data)