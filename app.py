from flask import Flask, render_template, request, redirect, session, url_for, jsonify
import sqlite3, hashlib, datetime

app = Flask(__name__)
app.secret_key = "ev_secret_key_123"

# ---------- DB ----------
def db():
    return sqlite3.connect('database.db')

def init_db():
    con = db()
    cur = con.cursor()
    cur.execute('''CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )''')
    cur.execute('''CREATE TABLE IF NOT EXISTS history(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        action TEXT,
        value TEXT,
        created_at TEXT
    )''')
    con.commit()
    con.close()

init_db()

def hash_pw(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

# ---------- AUTH ----------
@app.route('/register', methods=['GET','POST'])
def register():
    if request.method == 'POST':
        u = request.form['username'].strip()
        p = request.form['password']
        if len(u) < 3 or len(p) < 5:
            return "Weak credentials"

        con = db(); cur = con.cursor()
        try:
            cur.execute("INSERT INTO users(username,password) VALUES(?,?)",(u, hash_pw(p)))
            con.commit()
        except:
            con.close()
            return "User exists"
        con.close()
        return redirect('/login')
    return render_template('register.html')

@app.route('/login', methods=['GET','POST'])
def login():
    if request.method == 'POST':
        u = request.form['username']
        p = hash_pw(request.form['password'])

        con = db(); cur = con.cursor()
        cur.execute("SELECT * FROM users WHERE username=? AND password=?", (u,p))
        r = cur.fetchone()
        con.close()

        if r:
            session['user'] = u
            return redirect('/')
        return "Invalid login"
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')

# ---------- MAIN ----------
@app.route('/')
def home():
    if 'user' not in session:
        return redirect('/login')
    return render_template('dashboard.html', user=session['user'])

# ---------- APIs ----------
@app.route('/api/cost', methods=['POST'])
def cost():
    data = request.json
    cap, curr, tar, rate = map(float, [data['cap'], data['curr'], data['tar'], data['rate']])
    energy = cap * (tar - curr) / 100
    cost = energy * rate
    save_history("cost", f"{cost:.2f}")
    return jsonify({"energy": round(energy,2), "cost": round(cost,2)})

@app.route('/api/range', methods=['POST'])
def rng():
    data = request.json
    battery, eff, dist = map(float, [data['battery'], data['eff'], data['dist']])
    range_km = battery * eff
    status = "safe" if range_km >= dist else "risk"
    save_history("range", status)
    return jsonify({"range": round(range_km,2), "status": status})

@app.route('/api/impact', methods=['POST'])
def impact():
    km = float(request.json['km'])
    petrol = km * 9
    ev = km * 2.5
    co2 = km * 0.12
    save_history("impact", str(km))
    return jsonify({"savings": petrol-ev, "co2": round(co2,2)})

@app.route('/api/decision', methods=['POST'])
def decision():
    b = float(request.json['battery'])
    d = float(request.json['dist'])
    r = b * 2
    if r >= d:
        res = "Reachable | Charge at home | Save money"
    elif r+50 >= d:
        res = "Partial charge needed | Use nearest station"
    else:
        res = "Not reachable | Charge before trip"
    save_history("decision", res)
    return jsonify({"result": res})

@app.route('/api/compare', methods=['POST'])
def compare():
    data = request.json
    d = float(data['dist'])
    petrol = float(data['petrol'])
    diesel = float(data['diesel'])

    petrol_cost = (d/15) * petrol
    diesel_cost = (d/20) * diesel
    ev_cost = (d/6) * 8

    return jsonify({
        "petrol": petrol_cost,
        "diesel": diesel_cost,
        "ev": ev_cost
    })
@app.route('/api/history')
def history():
    con = db(); cur = con.cursor()
    cur.execute("SELECT action,value,created_at FROM history WHERE username=? ORDER BY id DESC LIMIT 10",(session['user'],))
    rows = cur.fetchall(); con.close()
    return jsonify(rows)

# ---------- UTIL ----------
def save_history(action, value):
    con = db(); cur = con.cursor()
    cur.execute("INSERT INTO history(username,action,value,created_at) VALUES(?,?,?,?)",
                (session['user'], action, value, str(datetime.datetime.now())))
    con.commit(); con.close()

if __name__ == "__main__":
    app.run(debug=True)