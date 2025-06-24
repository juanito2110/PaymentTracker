import supabase
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime
import json
import bcrypt

load_dotenv()

# Initialize Supabase client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

class DBOperations:
    @staticmethod
    def sync_payments():
        from email_reader import process_emails
        new_payments = process_emails()
        return new_payments

    @staticmethod
    def get_dashboard_data():
        # Get recent payments
        recent_payments_response = supabase.table("payments").select("*").order("payment_date", desc=True).limit(200).execute()
        recent_payments = recent_payments_response.data if not isinstance(recent_payments_response, list) else recent_payments_response
        
        for p in recent_payments:
            if isinstance(p.get("payment_date"), str):
                try:
                    dt = datetime.fromisoformat(p["payment_date"].replace("Z", "+00:00"))
                    p["payment_date"] = dt.strftime("%d-%m-%Y")
                except ValueError:
                    pass
            elif isinstance(p.get("payment_date"), datetime):
                p["payment_date"] = p["payment_date"].strftime("%d-%m-%Y")

        # Get payment summary
        summary = supabase.rpc("get_payment_summary").execute()

        # Get users with their payments and activities
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

            activity_name = user.get("activities", {}).get("name") if user.get("activities") else "N/A"

            users.append({
                "full_name": user["full_name"],
                "activity": activity_name,
                "paid_count": paid_count,
                "payment_frequency": payment_frequency,
                "paid_total": paid_total,
                "expected_total": expected_total
            })

        return {
            "payments": recent_payments,
            "summary": summary.data,
            "users": users
        }

    @staticmethod
    def manage_users_operation(form_data=None, delete_id=None):
        if delete_id:
            supabase.table('users').delete().eq('id', delete_id).execute()
            return {"success": True, "message": "User deleted successfully!"}
        
        if form_data:
            try:
                response = supabase.table('users').insert({
                    "first_name": form_data['first_name'],
                    "last_name": form_data['last_name'],
                    "phone": form_data['phone'],
                    "birth_date": form_data.get('birth_date'),
                    "activity_id": form_data['activity_id'],
                    "payment_plan_type": form_data['payment_plan_type'],
                    "expected_payment_amount": float(form_data['expected_payment_amount']),
                    "payment_frequency": int(form_data['payment_frequency'])
                }).execute()
                
                return {"success": True, "message": "User added successfully!", "data": response.data}
            except Exception as e:
                return {"success": False, "error": str(e)}

    @staticmethod
    def get_users():
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
        return simplified_users

    @staticmethod
    def manage_activities_operation(data=None, delete_id=None):
        if delete_id:
            response = supabase.table("activities").delete().eq("id", delete_id).execute()
            if not response.data or len(response.data) == 0:
                raise ValueError("Activity not found")
            return {"success": True, "message": "Activity deleted successfully"}
        
        if data:
            name = data.get('name')
            price = float(data.get('price'))
            frequency = data.get('frequency')
            if frequency == 'custom':
                frequency = int(data.get('customFrequencyValue'))
            else:
                frequency = int(frequency)

            response = supabase.table("activities").insert({
                "name": name,
                "price": price,
                "frequency": frequency
            }).execute()

            return {
                'success': True,
                'activity': response.data[0] if response.data else None
            }

    @staticmethod
    def get_activities():
        response = supabase.table("activities").select("*").order("name").execute()
        return response.data if hasattr(response, 'data') else []

    @staticmethod
    def login_user(email, password):
        response = supabase.table('admins').select('*').eq('email', email).execute()
            
        if not response.data or len(response.data) == 0:
            return {"success": False, "error": "Invalid credentials"}
        
        admin_user = response.data[0]
        
        if not bcrypt.checkpw(password.encode('utf-8'), admin_user['password'].encode('utf-8')):
            return {"success": False, "error": "Invalid credentials"}

        return {
            "success": True,
            "user": {
                'id': admin_user['id'],
                'name': admin_user['name'],
                'email': admin_user['email']
            }
        }

    @staticmethod
    def signup_user(name, email, password):
        existing_user = supabase.table('admins').select('*').eq('email', email).execute()
        if existing_user.data and len(existing_user.data) > 0:
            return {"success": False, "error": "Email already registered"}

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        new_admin = {
            'name': name,
            'email': email,
            'password': hashed_password
        }

        response = supabase.table('admins').insert(new_admin).execute()

        if not response.data or len(response.data) == 0:
            return {"success": False, "error": "Failed to create account"}

        return {
            "success": True,
            "user": {
                'id': response.data[0]['id'],
                'name': response.data[0]['name'],
                'email': response.data[0]['email']
            }
        }

    @staticmethod
    def get_account_info(admin_id):
        response = supabase.table('admins').select('*').eq('id', admin_id).execute()
        user = response.data[0] if response.data else None
        if not user:
            return {"success": False, "error": "User not found"}
        return {
            "success": True,
            "user": {
                'name': user['name'],
                'email': user['email']
            }
        }

    @staticmethod
    def change_password(admin_id, current_password, new_password):
        response = supabase.table('admins').select('*').eq('id', admin_id).execute()
        admin_user = response.data[0] if response.data else None
        
        if not admin_user:
            return {"success": False, "error": "User not found"}
            
        if not bcrypt.checkpw(current_password.encode('utf-8'), admin_user['password'].encode('utf-8')):
            return {"success": False, "error": "Current password is incorrect"}
            
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        update_response = supabase.table('admins').update({'password': hashed_password}).eq('id', admin_id).execute()
        
        if not update_response.data:
            return {"success": False, "error": "Failed to update password"}
            
        return {"success": True, "message": "Password updated successfully"}