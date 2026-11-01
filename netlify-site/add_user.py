#!/usr/bin/env python3
"""Add/replace a portal user. Prints the updated PORTAL_USERS JSON to paste into Netlify
(Site settings > Environment variables, or: netlify env:set PORTAL_USERS "$(cat file)").
Usage: python3 add_user.py email@domain [existing_users.json]   (prompts for password, never echoed)
Remove a user: delete their key from the JSON and update the env var; their session stops working."""
import sys, json, os, getpass, hashlib, base64
email = sys.argv[1].strip().lower()
users = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else {}
pw = os.environ.get('PORTAL_PW') or getpass.getpass('Password: ')
salt = os.urandom(16); it = 210000
h = hashlib.pbkdf2_hmac('sha256', pw.encode(), salt, it, 32)
users[email] = f"pbkdf2${it}${base64.b64encode(salt).decode()}${base64.b64encode(h).decode()}"
print(json.dumps(users))
