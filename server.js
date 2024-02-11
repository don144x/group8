const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const app = express();
const port = 3000;
 
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));
 
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ex_db2'
});
 
connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});
 
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
 
const checkErrorMiddleware = (req, res, next) => {
  const { error } = req.query;
  res.locals.error = error;
  next();
};

//.css
app.use('/styles-login', express.static(__dirname + '/views'));
app.use('/styles-register', express.static(__dirname + '/views'));
app.use('/styles-dashboardr', express.static(__dirname + '/views'));
app.use('/styles-add', express.static(__dirname + '/views'));
app.use('/styles-edit', express.static(__dirname + '/views'));
 
//login
app.get('/login', checkErrorMiddleware, (req, res) => {
  res.render('login');
});
 
//เช็คlogin
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
 
  connection.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err) throw err;
 
    if (results.length === 0) {
     return res.send('<script>alert("Username or Password is Incorrect"); window.location.href = "/login";</script>');
    }
 
    const user = results[0];
 
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      // รหัสผ่านไม่ถูกต้อง
      return res.send('<script>alert("Username or Password is Incorrect"); window.location.href = "/login";</script>');
    }
    req.session.user = { id: user.id, username: user.username };
    res.redirect('/dashboard');
  });
});
 
//register
 
app.get('/register', (req, res) => {
  // เช็คมีข้อผิดพลาดที่ถูกส่งมาจากการลงทะเบียนหรือไม่
  const { error } = req.query;
 
  res.render('register', { error });
});
 
//เช็คemailว่าซ้ำมั้ย
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
 
  // เช็คว่าอีเมลมีอยู่ในฐานข้อมูลหรือไม่
  connection.query('SELECT * FROM users WHERE email = ?', [email], async (selectErr, selectResults) => {
    if (selectErr) {
      throw selectErr;
    }
    if (selectResults.length > 0) {
      return res.send('<script>alert("This email Already Used"); window.location.href = "/register";</script>');
    }
    return true;
  });

    const hashedPassword = await bcrypt.hash(password, saltRounds);
 
    connection.query(
      'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email],
      (insertErr) => {
        if (insertErr) {
          if (insertErr.code === 'ER_DUP_ENTRY') {
            return res.render('register', { error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว กรุณาเลือกใหม่' });
          }
          console.error(insertErr);
          return res.status(500).send('Internal Server Error');
        }
        // ลงทะเบียนสำเร็จ ส่งไปหน้า login
        res.render('login', { success: 'ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ' });
      }
    );
  });
 
  app.get('/dashboard', (req, res) => {
    const user = req.session.user;
  
    if (!user) {
      return res.redirect('/login');
    }
    connection.query('SELECT * FROM transactions WHERE user_id = ?', [user.id], (err, results) => {
      if (err) throw err;
      res.render('dashboard', { user, transactions: results });
    });
  });
 
  app.get('/add', (req, res) => {
    const user = req.session.user;
  
    if (!user) {
      return res.redirect('/login');
    }
  
    res.render('add');
  });
 
  app.post('/add', (req, res) => {
    const user = req.session.user;
  
    if (!user) {
      return res.redirect('/login');
    }
  
    const { date, type, description, amount } = req.body;
  
    connection.query('INSERT INTO transactions (user_id, date, type, description, amount) VALUES (?, ?, ?, ?, ?)',
      [user.id, date, type, description, amount],
      (err) => {
        if (err) throw err;
        res.redirect('/dashboard');
      }
    );
  });
 
  app.get('/delete/:id', (req, res) => {
    const user = req.session.user;
  
    if (!user) {
      return res.redirect('/login');
    }
    const transactionId = req.params.id;
    connection.query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [transactionId, user.id], (err) => {
      if (err) throw err;
      res.redirect('/dashboard');
    });
  });
 
  app.get('/edit/:id', (req, res) => {
    const user = req.session.user;
  
    if (!user) {
      return res.redirect('/login');
    }
    const transactionId = req.params.id;
    connection.query('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [transactionId, user.id], (err, results) => {
      if (err) throw err;
      if (results.length === 0) {
        return res.redirect('/dashboard');
      }
      const transaction = results[0];
      res.render('edit', { transaction });
    });
  });
 
  app.post('/edit/:id', (req, res) => {
    const user = req.session.user;
 
  if (!user) {
    return res.redirect('/login');
  }
 
  const transactionId = req.params.id;
  const { date, type, description, amount } = req.body;
 
  connection.query('UPDATE transactions SET date = ?, type = ?, description = ?, amount = ? WHERE id = ? AND user_id = ?',
    [date, type, description, amount, transactionId, user.id],
    (err) => {
      if (err) throw err;
      res.redirect('/dashboard');
    }
  );

  app.get('/dashboard', (req, res) => {
    const user = req.session.user;

    if (!user) {
      return res.redirect('/login');
    }

    connection.query('SELECT * FROM transactions WHERE user_id = ?', [user.id], (err, results) => {
      if (err) throw err;

      let totalIncome = 0;
      let totalExpense = 0;

      results.forEach(transaction => {
        if (transaction.type === 'income') {
          totalIncome += transaction.amount;
        } else {
          totalExpense += transaction.amount;
        }
      });

      res.render('dashboard', { user, transactions: results, totalIncome, totalExpense });
    });
  });

});